import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Build a single self-contained prompt that asks an agent to (1) cluster the
// 493 observations into mechanism-level themes, and (2) for each cluster,
// produce a final ready-to-render insight (title, observation_ids, source
// review_ids ordered by relevance, list of verbatim quotes already chosen).
// The agent reads the FULL observations + raw review texts so it can pick
// the best 2-4 quotes per cluster from the real source text, not just our
// extracted triggers.
//
// Usage: npx tsx scripts/calm-cluster-prep.ts <productId>

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-cluster-prep.ts <productId>");
  process.exit(1);
}

type Observation = {
  review_id: string;
  rating: number;
  observation: string;
  trigger: string;
  jtbd?: string;
  specificity?: string;
  is_commodity?: boolean;
  free_tags?: string[];
};

type Review = { externalId: string; rating: number; title: string | null; text: string; postedAt: string | null; version: string | null };

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as {
  flat: Observation[];
};
const reviews = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as Review[];
const reviewById = new Map(reviews.map((r) => [r.externalId, r]));

const obsForAgent = obsData.flat.map((o, i) => ({
  obs_id: i,
  review_id: o.review_id,
  rating: o.rating,
  observation: o.observation,
  trigger: o.trigger,
  jtbd: o.jtbd ?? null,
  is_commodity: o.is_commodity ?? false,
}));

// Compact review lookup — keyed by review_id to short text, so the agent can
// pull verbatim quotes for the final cards.
const reviewLookup: Record<string, { rating: number; date: string | null; text: string }> = {};
const usedReviewIds = new Set(obsForAgent.map((o) => o.review_id));
for (const r of reviews) {
  if (!usedReviewIds.has(r.externalId)) continue;
  reviewLookup[r.externalId] = {
    rating: r.rating,
    date: r.postedAt ? r.postedAt.slice(0, 10) : null,
    text: r.text,
  };
}

const PROMPT = `You are clustering qualitative observations extracted from Calm app reviews into mechanism-level insights for a product analysis page. The page surfaces what's actually happening with the product — not commodity complaints, but specific mechanisms users describe.

INPUT
You have ${obsForAgent.length} observations from ${Object.keys(reviewLookup).length} unique reviews. Each observation already passed an extraction step that filtered out generic "too expensive" / "love it" noise.

YOUR JOB
1) Group observations by the SAME underlying MECHANISM (not surface vocabulary). Two observations describing the same product mechanism in different words → same cluster.
2) Lean toward MORE clusters (~25-40) rather than fewer. Don't collapse orthogonal mechanisms even if they share a feature area. Specificity is the whole point.
3) For each cluster, produce a final insight card.

CLUSTERING RULES
- Same mechanism → same cluster (e.g. "trial ends and charges annual" + "selected weekly but got charged yearly" → same cluster about IAP plan-confusion)
- Different mechanism even if same feature → different clusters (e.g. "sleep stories autoplay through alarm" ≠ "sleep stories loop and restart intro" — different bugs in same feature area)
- Single-mention observations (n=1) are fine. Some clusters will have 1 obs_id, others 20+. Don't force a minimum.
- If observations are clearly commodity-noise (is_commodity=true) that slipped past the filter, drop them — do not create a "commodity" cluster.
- If two observations look identical, still keep both — counts matter.

OUTPUT SCHEMA (one JSON object, no prose, no markdown fences)

{
  "clusters": [
    {
      "id": "<short-kebab-case-slug-of-the-mechanism>",
      "title": "<one-line plain-Russian title at mechanism level — like a headline a PM would screenshot>",
      "observation_ids": [<obs_id from input>, ...],
      "novelty": "high" | "medium" | "low",   // high = non-obvious / commodity-free; low = generic
      "quotes": [
        {
          "review_id": "<id from the lookup>",
          "rating": <number>,
          "date": "<YYYY-MM-DD>",
          "text": "<verbatim quote from the review — pick the 1-3 sentence span that best ILLUSTRATES the mechanism>"
        }
      ]
    }
  ]
}

QUOTE SELECTION RULES
- Per cluster, pick 2-4 of the strongest, MOST SPECIFIC verbatim quotes from the source reviews. Use the reviewLookup to pull the original review text and select the best span.
- Quotes MUST be exact substrings of the original review text (don't paraphrase, don't fix spelling, don't translate).
- Prefer quotes that explain the MECHANISM (what user did, what app did, why it broke).
- Prefer quotes from different reviews when possible (variety > redundancy).
- Each quote ≤ 400 characters.

TITLES IN RUSSIAN
- Plain Russian, mechanism-level, present tense.
- BAD: "Проблемы с биллингом", "Юзеры жалуются на cancel"
- GOOD: "Триал заканчивается, списывается годовая подписка вместо недельной", "Бесшумный pause→play требует force-quit"

SORT clusters by novelty (high first), then by observation count (descending).

OBSERVATIONS:
${JSON.stringify(obsForAgent)}

REVIEW LOOKUP (review_id → original text for quote selection):
${JSON.stringify(reviewLookup)}
`;

mkdirSync("cluster/in", { recursive: true });
writeFileSync(`cluster/in/${PRODUCT_ID}.txt`, PROMPT);
console.log(`wrote cluster/in/${PRODUCT_ID}.txt`);
console.log(`  ${obsForAgent.length} observations`);
console.log(`  ${Object.keys(reviewLookup).length} unique source reviews`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
