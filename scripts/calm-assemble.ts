import { readFileSync, writeFileSync } from "node:fs";

// Convert the clustering agent's output into the shape the /product/[id]/insights
// page already renders. Replaces the entry for this productId in src/data/insights.json
// while leaving entries for other products untouched.
//
// Usage: npx tsx scripts/calm-assemble.ts <productId>

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-assemble.ts <productId>");
  process.exit(1);
}

type ClusterQuote = { review_id: string; rating: number; date: string; text: string };
type Cluster = {
  id: string;
  title: string;
  observation_ids: number[];
  novelty: "high" | "medium" | "low";
  quotes: ClusterQuote[];
};

type ClusterOutput = { clusters: Cluster[] };

const clusterPath = `cluster/out/${PRODUCT_ID}.json`;
const rawCluster = readFileSync(clusterPath, "utf8");
// Strip markdown fences if the agent wrapped output in them despite instructions.
const stripped = rawCluster.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const cluster = JSON.parse(stripped) as ClusterOutput;

if (!cluster.clusters || !Array.isArray(cluster.clusters)) {
  throw new Error("cluster output missing 'clusters' array");
}

// Pull corpus stats from the filtered window.
const filtered = JSON.parse(readFileSync(`data/${PRODUCT_ID}-reviews.json`, "utf8")) as { rating: number }[];
const filteredWindow = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as { rating: number }[];

const reviewsScanned = filteredWindow.length;
const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
for (const r of filteredWindow) ratingBreakdown[String(r.rating)]++;

// Build insight objects keyed to what the InsightRow component actually reads.
// Other fields are filled with sensible empties so the existing type stays satisfied.
const insights = cluster.clusters.map((c) => ({
  id: c.id,
  category: "strategic" as const, // not surfaced on the row UI anymore
  title: c.title,
  story: "",
  who: [],
  featureArea: "",
  novelty: c.novelty,
  evidence: c.quotes.map((q) => ({
    rating: q.rating,
    date: q.date,
    reviewId: q.review_id,
    quote: q.text,
  })),
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
  sampleSize: reviewsScanned, // now the full corpus, not a sample
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
console.log(`wrote src/data/insights.json (raw corpus: ${filtered.length})`);
