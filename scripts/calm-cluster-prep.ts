import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Lean clustering prompt: just the observation texts, no source-review lookup.
// The agent's only job is to group obs_ids into mechanism-level themes and
// name each theme. Quote selection is mechanical in assemble.ts — we use the
// observation's verbatim `trigger` as the displayed quote, with date and ★
// from the source review.
//
// Two prior failure modes we're avoiding here:
// 1) Oversized prompt (400KB → 100K+ tokens) made the agent stall.
// 2) Asking the agent to verify exact-substring quotes pushed it into a
//    Python-script verification loop that timed out.
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
};

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as {
  flat: Observation[];
};

// Drop commodity-tagged observations — they don't need clustering, we'll show
// them in a separate baseline section if at all.
const nonCommodity = obsData.flat.filter((o) => !o.is_commodity);

const obsForAgent = nonCommodity.map((o, i) => ({
  obs_id: i,
  rating: o.rating,
  observation: o.observation,
  jtbd: o.jtbd ?? null,
}));

const PROMPT = `You are clustering qualitative observations extracted from Calm app reviews into mechanism-level themes.

INPUT
${obsForAgent.length} observations. Each is a 1-2 sentence specific note about a product mechanism. Commodity rage (billing/paywall/ads complaints without specifics) is already filtered out — what remains should be substantive.

YOUR JOB — only this
1) Group obs_ids by SAME UNDERLYING MECHANISM (not surface vocabulary). Two observations describing the same product mechanism in different words → same cluster.
2) Aim for 25-40 clusters. Lean toward MORE clusters, not fewer. Don't collapse orthogonal mechanisms even if they share a feature area.
3) Single-obs clusters are fine. So are 30-obs clusters.
4) For each cluster, write a one-line Russian title at MECHANISM LEVEL.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool. Nothing else.
- Do NOT write helper scripts. Do NOT use Python or Bash for "verification". The Read tool to read the input is fine; the Write tool to write the output is fine. That's all you need.
- Read the input once. Think. Write the output once. Stop.

OUTPUT SCHEMA — exactly this shape, no extra keys, no markdown fences

{
  "clusters": [
    {
      "id": "<short-kebab-case-slug>",
      "title": "<Russian one-line mechanism-level title>",
      "novelty": "high" | "medium" | "low",
      "observation_ids": [<obs_id>, <obs_id>, ...]
    }
  ]
}

TITLE STYLE
- Russian, present tense, mechanism-level.
- BAD: "Проблемы с биллингом" / "Жалобы на отмену"
- GOOD: "Триал заканчивается списанием годовой подписки вместо недельной"
- GOOD: "Sleep Stories зацикливаются после апдейта v6.93 и перезапускают peppy интро"
- GOOD: "Apple подтверждает оплату — в Calm Premium всё ещё не активен"

SORT clusters by novelty (high first), then by observation_ids count (descending).

OBSERVATIONS:
${JSON.stringify(obsForAgent)}
`;

mkdirSync("cluster/in", { recursive: true });
writeFileSync(`cluster/in/${PRODUCT_ID}.txt`, PROMPT);
console.log(`wrote cluster/in/${PRODUCT_ID}.txt`);
console.log(`  ${obsForAgent.length} non-commodity observations (dropped ${obsData.flat.length - obsForAgent.length} commodity)`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
