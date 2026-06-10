import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Assembles insights.json from natural (theme-free) cluster output.
// Reads from cluster-natural/out/<PID>.json — groups have a free-form "name"
// instead of a fixed "theme". Writes insights with group: { id, name, sentiment }.
//
// Usage: npx tsx scripts/app-natural-assemble.ts <slug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-natural-assemble.ts <slug>");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath}`);
  process.exit(1);
}
const ctx = JSON.parse(readFileSync(contextPath, "utf8")) as { productId: string; name: string };
const PRODUCT_ID = ctx.productId;

type GroupIn = {
  id: string;
  name: string;
  sentiment: "praise" | "criticism" | "suggestion";
  novelty: "high" | "medium" | "low";
  observation_ids: number[];
};
type ClusterOutput = { groups: GroupIn[] };

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

const rawCluster = readFileSync(`cluster-natural/out/${PRODUCT_ID}.json`, "utf8");
const stripped = rawCluster.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const cluster = JSON.parse(stripped) as ClusterOutput;
if (!cluster.groups || !Array.isArray(cluster.groups)) {
  throw new Error("cluster output missing 'groups' array");
}

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as { flat: Observation[] };
const flatNonCommodity = obsData.flat.filter((o) => !o.is_commodity);
const reviews = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as Review[];
const reviewById = new Map(reviews.map((r) => [r.externalId, r]));

const reviewsScanned = reviews.length;
const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
for (const r of reviews) ratingBreakdown[String(r.rating)]++;

function quoteForObservation(o: Observation): { rating: number; date: string; reviewId: string; quote: string } {
  const review = reviewById.get(o.review_id);
  const date = review?.postedAt ? review.postedAt.slice(0, 10) : "";
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
}

function buildEvidence(obsIds: number[]) {
  const observations = obsIds.map((i) => flatNonCommodity[i]).filter((o): o is Observation => o != null);
  const bestPerReview = new Map<string, Observation>();
  const specScore = (o: Observation) => (o.specificity === "high" ? 3 : o.specificity === "medium" ? 2 : 1);
  for (const o of observations) {
    const prev = bestPerReview.get(o.review_id);
    if (!prev || specScore(o) > specScore(prev) || o.trigger.length > prev.trigger.length) {
      bestPerReview.set(o.review_id, o);
    }
  }
  const sorted = [...bestPerReview.values()].sort((a, b) => {
    const s = specScore(b) - specScore(a);
    if (s !== 0) return s;
    return Math.abs(b.rating - 3) - Math.abs(a.rating - 3);
  });
  return sorted.map(quoteForObservation);
}

const sortedGroups = [...cluster.groups].sort((a, b) => b.observation_ids.length - a.observation_ids.length);

const insights = sortedGroups.map((g) => ({
  id: g.id,
  category: "strategic" as const,
  title: g.name,
  story: "",
  who: [],
  featureArea: "",
  novelty: g.novelty,
  evidence: buildEvidence(g.observation_ids),
  observationCount: g.observation_ids.length,
  group: { id: g.id, name: g.name, sentiment: g.sentiment },
  implies: "",
}));

const allInsights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Record<string, unknown>[];
const idx = allInsights.findIndex((p) => p.productId === PRODUCT_ID);
const next = {
  productId: PRODUCT_ID,
  reviewsScanned,
  ratingBreakdown,
  pipeline: `qualitative extraction · natural clustering · 1-5★ · ${ctx.name}`,
  asOf: new Date().toISOString().slice(0, 10),
  sampleSize: reviewsScanned,
  insights,
  personaPatterns: [],
  commodityBaseline: [],
};

if (idx >= 0) allInsights[idx] = next;
else allInsights.push(next);

writeFileSync("src/data/insights.json", JSON.stringify(allInsights, null, 2));

const bySentiment: Record<string, number> = {};
for (const g of cluster.groups) bySentiment[g.sentiment] = (bySentiment[g.sentiment] ?? 0) + 1;

console.log(`assembled ${insights.length} insights from ${sortedGroups.length} natural groups`);
console.log(`reviewsScanned: ${reviewsScanned}`);
console.log(`by sentiment:`, bySentiment);
console.log(`evidence per insight: avg ${(insights.reduce((s, i) => s + i.evidence.length, 0) / insights.length).toFixed(1)}, max ${Math.max(...insights.map((i) => i.evidence.length))}`);
