import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

// Merge per-batch extraction outputs into a single observations.json. Validates
// schema and flattens reviews+observations into a flat array for clustering.
// Tolerant of partial runs: skips batches that haven't completed yet.
//
// Usage: npx tsx scripts/calm-extract-merge.ts <productId>

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-extract-merge.ts <productId>");
  process.exit(1);
}

const OUT_DIR = "extract/out";

type Persona = {
  tenure?: string | null;
  primary_use?: string | null;
  engagement?: string | null;
  trial_path?: string | null;
};

type Observation = {
  text: string;
  trigger: string;
  jtbd?: string;
  specificity?: "high" | "medium" | "low";
  is_commodity?: boolean;
  free_tags?: string[];
};

type Result = {
  review_id: string;
  rating: number;
  persona?: Persona;
  emotional_tone?: string | null;
  competitor_mentions?: { name: string; context_quote: string }[];
  observations?: Observation[];
};

type FlatObservation = {
  review_id: string;
  rating: number;
  batch: string;
  observation: string;
  trigger: string;
  jtbd?: string;
  specificity?: string;
  is_commodity?: boolean;
  free_tags?: string[];
  persona?: Persona;
  emotional_tone?: string | null;
};

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`no ${OUT_DIR}/ directory`);
    process.exit(1);
  }

  const files = readdirSync(OUT_DIR)
    .filter((f) => f.startsWith(`${PRODUCT_ID}-`) && f.endsWith(".json"))
    .sort();

  console.log(`found ${files.length} extract output files`);

  const allResults: { batch: string; result: Result }[] = [];
  let badFiles = 0;
  let totalReviews = 0;
  let totalObs = 0;
  const personaCount = { tenure: 0, primary_use: 0, engagement: 0, trial_path: 0 };

  for (const f of files) {
    let parsed: { results?: Result[] };
    try {
      parsed = JSON.parse(stripFences(readFileSync(`${OUT_DIR}/${f}`, "utf8")));
    } catch {
      console.error(`! ${f}: not valid JSON, skipped`);
      badFiles++;
      continue;
    }
    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.error(`! ${f}: missing 'results' array`);
      badFiles++;
      continue;
    }
    for (const r of parsed.results) {
      allResults.push({ batch: f, result: r });
      totalReviews++;
      totalObs += r.observations?.length ?? 0;
      if (r.persona?.tenure) personaCount.tenure++;
      if (r.persona?.primary_use) personaCount.primary_use++;
      if (r.persona?.engagement) personaCount.engagement++;
      if (r.persona?.trial_path) personaCount.trial_path++;
    }
  }

  // Flatten into one row per (review × observation) for clustering input.
  const flat: FlatObservation[] = [];
  for (const { batch, result } of allResults) {
    for (const obs of result.observations ?? []) {
      flat.push({
        review_id: result.review_id,
        rating: result.rating,
        batch,
        observation: obs.text,
        trigger: obs.trigger,
        jtbd: obs.jtbd,
        specificity: obs.specificity,
        is_commodity: obs.is_commodity,
        free_tags: obs.free_tags,
        persona: result.persona,
        emotional_tone: result.emotional_tone ?? null,
      });
    }
  }

  // Persona summaries (rough percentages)
  const pct = (n: number) => totalReviews ? `${Math.round((n / totalReviews) * 100)}%` : "0%";

  writeFileSync(
    `data/${PRODUCT_ID}-observations.json`,
    JSON.stringify({ totalReviews, totalObservations: totalObs, flat, allResults: allResults.map((x) => x.result) }, null, 2),
  );

  console.log(`\nfiles: ${files.length} (${badFiles} bad)`);
  console.log(`reviews processed: ${totalReviews}`);
  console.log(`observations emitted: ${totalObs} (${(totalObs / totalReviews).toFixed(2)} per review)`);
  console.log(`persona signals: tenure ${pct(personaCount.tenure)} · primary_use ${pct(personaCount.primary_use)} · engagement ${pct(personaCount.engagement)} · trial_path ${pct(personaCount.trial_path)}`);
  console.log(`\nwrote data/${PRODUCT_ID}-observations.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
