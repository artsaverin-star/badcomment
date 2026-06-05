import { readFileSync, writeFileSync } from "node:fs";

// Convert the clustering agent's output into the shape /product/[id]/insights
// already renders. Cluster output now contains only obs_id lists per cluster
// (no quotes) — we pick quotes here, mechanically: per cluster, take the top
// 3 observations by specificity/non-commodity, use their `trigger` as the
// quote text, and look up ★+date from the source review.
//
// Usage: npx tsx scripts/calm-assemble.ts <productId>

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-assemble.ts <productId>");
  process.exit(1);
}

type ClusterIn = {
  id: string;
  title: string;
  novelty: "high" | "medium" | "low";
  observation_ids: number[];
};

type ClusterOutput = { clusters: ClusterIn[] };

type Observation = {
  review_id: string;
  rating: number;
  observation: string;
  trigger: string;
  jtbd?: string;
  specificity?: string;
  is_commodity?: boolean;
};

type Review = { externalId: string; rating: number; title: string | null; text: string; postedAt: string | null };

// Read inputs.
const rawCluster = readFileSync(`cluster/out/${PRODUCT_ID}.json`, "utf8");
const stripped = rawCluster.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const cluster = JSON.parse(stripped) as ClusterOutput;
if (!cluster.clusters || !Array.isArray(cluster.clusters)) {
  throw new Error("cluster output missing 'clusters' array");
}

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as { flat: Observation[] };
// IMPORTANT: cluster-prep filters out commodity observations, so cluster's
// obs_id indexes into the NON-COMMODITY filtered list, not the full flat list.
const flatNonCommodity = obsData.flat.filter((o) => !o.is_commodity);

const reviews = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as Review[];
const reviewById = new Map(reviews.map((r) => [r.externalId, r]));

const filteredWindow = reviews;
const reviewsScanned = filteredWindow.length;
const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
for (const r of filteredWindow) ratingBreakdown[String(r.rating)]++;

// Score each observation for quote-picking: prefer high specificity, longer
// trigger, and non-default review (has date). The intent is to surface the
// most evidence-rich verbatim quote per cluster.
function scoreObservation(o: Observation): number {
  const specScore = o.specificity === "high" ? 3 : o.specificity === "medium" ? 2 : 1;
  const lenScore = Math.min(o.trigger.length / 40, 3);
  return specScore + lenScore;
}

// Pick top 3 observation_ids per cluster, then build evidence cards from each.
function buildEvidence(obsIds: number[]) {
  const observations = obsIds
    .map((i) => flatNonCommodity[i])
    .filter((o): o is Observation => o != null);
  observations.sort((a, b) => scoreObservation(b) - scoreObservation(a));

  // Dedup by review_id so we don't show the same review twice in one cluster.
  const seen = new Set<string>();
  const picks: Observation[] = [];
  for (const o of observations) {
    if (seen.has(o.review_id)) continue;
    seen.add(o.review_id);
    picks.push(o);
    if (picks.length >= 3) break;
  }

  return picks.map((o) => {
    const review = reviewById.get(o.review_id);
    const date = review?.postedAt ? review.postedAt.slice(0, 10) : "";
    // Prefer a slightly-extended quote: find the trigger's sentence in the
    // source text and grab up to ~280 chars around it. Falls back to the bare
    // trigger if we can't locate it (shouldn't happen — trigger was verified
    // at extract time).
    let quote = o.trigger;
    if (review) {
      const cleanText = review.text.replace(/\s+/g, " ").trim();
      const idx = cleanText.toLowerCase().indexOf(o.trigger.toLowerCase());
      if (idx >= 0) {
        const start = Math.max(0, cleanText.lastIndexOf(". ", idx) + 1);
        const endHint = cleanText.indexOf(". ", idx + o.trigger.length);
        const end = endHint > 0 ? endHint + 1 : Math.min(cleanText.length, idx + o.trigger.length + 200);
        quote = cleanText.slice(start, end).trim();
        if (quote.length > 320) quote = quote.slice(0, 317).trimEnd() + "…";
      }
    }
    return { rating: o.rating, date, reviewId: o.review_id, quote };
  });
}

const insights = cluster.clusters.map((c) => ({
  id: c.id,
  category: "strategic" as const,
  title: c.title,
  story: "",
  who: [],
  featureArea: "",
  novelty: c.novelty,
  evidence: buildEvidence(c.observation_ids),
  observationCount: c.observation_ids.length,
  implies: "",
}));

const allInsights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Record<string, unknown>[];
const idx = allInsights.findIndex((p) => p.productId === PRODUCT_ID);
const next = {
  productId: PRODUCT_ID,
  reviewsScanned,
  ratingBreakdown,
  pipeline: "qualitative extraction · последние 90 дней · 1-5★",
  asOf: new Date().toISOString().slice(0, 10),
  sampleSize: reviewsScanned,
  insights,
  personaPatterns: [],
  commodityBaseline: [],
};

if (idx >= 0) allInsights[idx] = next;
else allInsights.push(next);

writeFileSync("src/data/insights.json", JSON.stringify(allInsights, null, 2));

console.log(`assembled ${insights.length} insights from ${cluster.clusters.length} clusters`);
console.log(`reviewsScanned: ${reviewsScanned}`);
console.log(`distribution: ${Object.entries(ratingBreakdown).map(([k, v]) => `${k}★=${v}`).join(" ")}`);
console.log(`wrote src/data/insights.json`);
