import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";

// Prepare per-agent prompt files for qualitative extraction. Each prompt file
// is self-contained: the FAT extraction template + a JSON batch of reviews.
// A sub-agent reads ONE file, classifies ALL reviews in it (one LLM session),
// and writes a single JSON output. We split a session's work into ~30-review
// batches so each agent stays under its tool-use cap.
//
// Usage: npx tsx scripts/calm-extract-prep.ts <productId> [batchSize] [sample]

const PRODUCT_ID = process.argv[2];
const BATCH_SIZE = Number(process.argv[3] ?? 30);
const SAMPLE = process.argv[4] ? Number(process.argv[4]) : null;

if (!PRODUCT_ID) {
  console.error("usage: calm-extract-prep.ts <productId> [batchSize=30] [sample=ALL]");
  process.exit(1);
}

const IN_DIR = "extract/in";

type Row = {
  externalId: string;
  rating: number;
  title: string | null;
  text: string;
  version: string | null;
  postedAt: string | null;
};

const TEMPLATE = `You are reading real app-store reviews of Calm — a meditation/mindfulness/sleep app on iOS and Android. Calm offers: guided meditations, Sleep Stories (narrated bedtime stories), soundscapes/music, breathing exercises, "Daily Calm" sessions, masterclasses, Calm Kids, Calm Body. Premium subscription ~$70/year, 7-day free trial, also a Lifetime tier and occasional promotional tiers.

YOUR JOB
For each review below, extract ZERO or MORE specific, non-obvious observations about how this user actually uses the product or where it falls short. Most reviews will yield zero observations — they're rage, praise, or generic friction. That's correct and expected. Returning empty observations is the right answer for the majority. Do not invent insight.

WHAT COUNTS AS AN OBSERVATION
An observation is a SPECIFIC mechanism or moment. Not a complaint category, not a sentiment, not a star rating restated in prose. It tells someone who builds products something they probably couldn't have guessed.

GOOD examples (each one specific, mechanism-level):

1. text: "User opened Calm during a panic attack but the home feed promotes Sleep Stories rather than a quick breathing exercise — they had to scroll-then-tap-then-load to reach Breathe by which point the panic peaked."
   trigger: "by the time I found the breathing thing the worst was over"
   jtbd: "reach an in-the-moment intervention fast under stress"
   specificity: high

2. text: "Sleep Stories autoplay through the alarm. The story keeps playing, the alarm rings on top, the user wakes to overlapping audio."
   trigger: "the story kept playing right through my alarm"
   jtbd: "use Sleep Stories to fall asleep without disrupting the morning"
   specificity: high

3. text: "After 4 years using Calm, user's favorited meditation moved behind a new 'Calm Pro' tier — they were already paying Premium. Their objection isn't price, it's the perceived bait-and-switch on content they'd built a routine around."
   trigger: "the meditation I used every morning is now Pro only"
   jtbd: "maintain a stable daily-use routine over years"
   specificity: high

4. text: "Apple Health integration exports Sleep minutes but NOT Mindful minutes despite Apple Health supporting that category. User logs their meditation manually in a journaling app."
   trigger: "mindful minutes don't sync with Apple Health"
   jtbd: "cross-track wellness across multiple apps"
   specificity: high

5. text: "Cancellation flow buries the 'cancel' button under three retention offers ('free month?', 'pause for 3 months?', 'switch to Lifetime?'). User wanted out for privacy reasons, not price — none of the offers addressed that."
   trigger: "took me four screens to find the cancel button"
   jtbd: "cleanly leave the service without negotiation"
   specificity: medium-high

6. text: "Calm Kids bedtime stories include narrators the child found scary ('low growly voice'). No way to filter by narrator style or character voice — family stopped using Kids section after one bad night."
   trigger: "my daughter got scared by the deep voice"
   jtbd: "curate kid-safe content by characteristic, not just content rating"
   specificity: medium

BAD examples — DO NOT emit (return empty observations):

- "User says Calm is too expensive." → commodity. Every meditation app review says this.
- "User says the app crashed." → no mechanism, no when, no what.
- "User loves Calm." → non-information.
- "User hates ads." → commodity.
- "User wants more content." → generic ask.
- "Subscription auto-renewed." → commodity billing complaint unless they describe a specific deceptive mechanism (then THAT mechanism is the observation, not "auto-renew").
- "Hard to cancel." → commodity unless they describe the specific friction flow.
- "App is good for sleep." → non-information.
- "Calm helped my anxiety." → non-information (good for them, but no product insight).

EDGE CASES
- A review may yield 2-3 distinct observations if it touches multiple things. Emit each separately. Don't combine.
- If a review is in a non-English language and an observation is clear, emit it; write the observation in English but keep the trigger in the original.
- If a review mentions a competitor (Headspace, Insight Timer, Aura, Balance, Waking Up, Ten Percent Happier, etc.), record the mention regardless of whether you extract an observation.
- The trigger must be a VERBATIM span from the review text. If you can't quote, don't emit.
- Lean toward EMPTY. Half the corpus should return zero observations.

META SIGNALS (extract if discernible from the text)

- persona.tenure: "years" | "year+" | "months" | "weeks" | "trial" | "first-day" | null
- persona.primary_use: "sleep" | "anxiety" | "meditation" | "kids" | "ambient" | "stress" | "other" | null
- persona.engagement: "power" | "regular" | "casual" | "lapsed" | "evaluating" | null
- competitor_mentions: array of {name, context_quote}
- emotional_tone: "rage" | "disappointment" | "regret" | "wistful" | "matter-of-fact" | "enthusiastic" | "calm" | null

If you can't tell a signal from the text, use null. Do not guess.

OUTPUT SCHEMA (one JSON object, no prose, no markdown fences)

{
  "results": [
    {
      "review_id": "<id from input>",
      "rating": <number>,
      "persona": { "tenure": "...", "primary_use": "...", "engagement": "..." },
      "emotional_tone": "...",
      "competitor_mentions": [{ "name": "...", "context_quote": "..." }],
      "observations": [
        {
          "text": "<1-2 sentence specific observation>",
          "trigger": "<verbatim span from review>",
          "jtbd": "<what user was trying to do>",
          "specificity": "high" | "medium" | "low",
          "is_commodity": false,
          "free_tags": ["tag1", "tag2"]
        }
      ]
    }
  ]
}

Every review_id from the batch MUST appear in results exactly once. observations may be empty array (and frequently should be).

REVIEWS TO PROCESS:
`;

function main() {
  const filtered: Row[] = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8"));
  const pool = SAMPLE ? filtered.slice(0, SAMPLE) : filtered;
  console.log(`pool: ${pool.length} reviews → batches of ${BATCH_SIZE}`);

  rmSync(IN_DIR, { recursive: true, force: true });
  mkdirSync(IN_DIR, { recursive: true });

  let batchNum = 0;
  for (let i = 0; i < pool.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = pool.slice(i, i + BATCH_SIZE).map((r) => ({
      review_id: r.externalId,
      rating: r.rating,
      title: r.title,
      text: r.text,
      version: r.version,
      postedAt: r.postedAt,
    }));
    const file = `${IN_DIR}/${PRODUCT_ID}-${String(batchNum).padStart(4, "0")}.txt`;
    writeFileSync(file, TEMPLATE + JSON.stringify(batch, null, 2) + "\n");
  }

  writeFileSync(
    `extract/manifest.json`,
    JSON.stringify({ productId: PRODUCT_ID, totalReviews: pool.length, batches: batchNum, batchSize: BATCH_SIZE }, null, 2),
  );

  console.log(`wrote ${batchNum} prompt files to ${IN_DIR}/`);
  console.log(`next: a sub-agent reads each file, classifies, writes JSON to extract/out/<same-name>.json`);
}

main();
