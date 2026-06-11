import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Mechanical assembly of insights.json from the clustering agent's output.
// Trusts the agent's titles + theme assignments (the improved cluster prompt
// produces clean Russian titles + theme labels directly — no manual rewrite
// step). If a particular title or theme needs override, hand-edit
// src/data/insights.json after running.
//
// Usage: npx tsx scripts/app-assemble.ts <slug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-assemble.ts <slug>");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath}`);
  process.exit(1);
}
const ctx = JSON.parse(readFileSync(contextPath, "utf8")) as { productId: string; name: string };
const PRODUCT_ID = ctx.productId;

type ClusterIn = {
  id: string;
  title: string;
  theme: "payment" | "content" | "playback" | "ui" | "reliability" | "support" | "strategy";
  novelty: "high" | "medium" | "low";
  observation_ids: number[];
};
type GroupIn = { id: string; name: string; cluster_ids: string[] };
type ClusterOutput = { clusters: ClusterIn[]; groups?: GroupIn[] };

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

// ── IO ───────────────────────────────────────────────────────────────────
const rawCluster = readFileSync(`cluster/out/${PRODUCT_ID}.json`, "utf8");
const stripped = rawCluster.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const cluster = JSON.parse(stripped) as ClusterOutput;
if (!cluster.clusters || !Array.isArray(cluster.clusters)) {
  throw new Error("cluster output missing 'clusters' array");
}
// Tolerate the Sonnet agent occasionally emitting `obs_ids` instead of the
// expected `observation_ids` key — normalize so the sort below can't crash.
for (const c of cluster.clusters as Array<ClusterIn & { obs_ids?: number[] }>) {
  if (!c.observation_ids && Array.isArray(c.obs_ids)) c.observation_ids = c.obs_ids;
}
// Same tolerance for groups: some passes emit `title` instead of `name`.
for (const g of (cluster.groups ?? []) as Array<GroupIn & { title?: string }>) {
  if (!g.name && g.title) g.name = g.title;
}

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as { flat: Observation[] };
const flatNonCommodity = obsData.flat.filter((o) => !o.is_commodity);
const reviews = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as Review[];
const reviewById = new Map(reviews.map((r) => [r.externalId, r]));

// We only EXTRACT observations from the first N reviews (the sample the extract
// step actually scanned — recorded in the manifest). reviewsScanned and the
// rating histogram must reflect that scanned sample, not the full filtered pool,
// or the page claims to have analysed reviews it never saw.
const manifestPath = `extract/in/${PRODUCT_ID}/manifest.json`;
const scannedCount = existsSync(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, "utf8")) as { totalReviews?: number }).totalReviews ?? reviews.length
  : reviews.length;
const scanned = reviews.slice(0, scannedCount);

const reviewsScanned = scanned.length;
const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
for (const r of scanned) ratingBreakdown[String(r.rating)]++;

// ── Quote extraction ──────────────────────────────────────────────────────
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
      if (quote.length > 320) {
        let cut = quote.slice(0, 317);
        // slice() can split an emoji surrogate pair — a lone high surrogate makes the JSON unbuildable
        if (/[\ud800-\udbff]$/.test(cut)) cut = cut.slice(0, -1);
        quote = cut.trimEnd() + "…";
      }
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

// ── Build & write ─────────────────────────────────────────────────────────
const sortedClusters = [...cluster.clusters].sort(
  (a, b) => b.observation_ids.length - a.observation_ids.length,
);

type AssembledInsight = {
  id: string;
  category: "strategic";
  title: string;
  story: string;
  who: unknown[];
  featureArea: string;
  novelty: ClusterIn["novelty"];
  evidence: ReturnType<typeof buildEvidence>;
  observationCount: number;
  theme: ClusterIn["theme"];
  implies: string;
  group?: { id: string; name: string };
};

let insights: AssembledInsight[] = sortedClusters.map((c) => ({
  id: c.id,
  category: "strategic" as const,
  title: c.title,
  story: "",
  who: [],
  featureArea: "",
  novelty: c.novelty,
  evidence: buildEvidence(c.observation_ids),
  observationCount: c.observation_ids.length,
  theme: c.theme,
  implies: "",
}));

// Fold the bespoke parent themes from the same Sonnet pass directly into the
// insights (id + name), in group order — eliminating a separate regroup wave.
if (cluster.groups && cluster.groups.length) {
  const byId = new Map(insights.map((i) => [i.id, i]));
  const assigned = new Set<string>();
  const reordered: AssembledInsight[] = [];
  for (const g of cluster.groups) {
    for (const cid of g.cluster_ids) {
      const ins = byId.get(cid);
      if (!ins) {
        console.warn(`  unknown cluster id in group ${g.id}: ${cid}`);
        continue;
      }
      if (assigned.has(cid)) continue;
      ins.group = { id: g.id, name: g.name };
      assigned.add(cid);
      reordered.push(ins);
    }
  }
  for (const ins of insights) {
    if (!assigned.has(ins.id)) {
      delete ins.group;
      reordered.push(ins);
    }
  }
  const ungrouped = insights.length - assigned.size;
  if (ungrouped > 0) console.warn(`WARN: ${ungrouped} clusters not assigned to any group`);
  insights = reordered;
  console.log(`stamped ${cluster.groups.length} bespoke groups:`);
  for (const g of cluster.groups) console.log(`  ${g.cluster_ids.length.toString().padStart(2)} · ${g.name}`);
}

const allInsights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Record<string, unknown>[];
const idx = allInsights.findIndex((p) => p.productId === PRODUCT_ID);
const next = {
  productId: PRODUCT_ID,
  reviewsScanned,
  ratingBreakdown,
  pipeline: `qualitative extraction · ${reviewsScanned} отзывов · 1-5★ · ${ctx.name}`,
  asOf: new Date().toISOString().slice(0, 10),
  sampleSize: reviewsScanned,
  // Marks a разбор built by the polarity-balanced pipeline (positives + negatives,
  // bespoke groups). Only `balanced` разборы render in colour on the catalog;
  // older negative-only ones stay greyscale until rebuilt.
  balanced: true,
  insights,
  personaPatterns: [],
  commodityBaseline: [],
};

if (idx >= 0) allInsights[idx] = next;
else allInsights.push(next);

writeFileSync("src/data/insights.json", JSON.stringify(allInsights, null, 2));

const noTheme = insights.filter((i) => !i.theme);
const byTheme: Record<string, number> = {};
for (const i of insights) byTheme[i.theme ?? "<no theme>"] = (byTheme[i.theme ?? "<no theme>"] ?? 0) + 1;

console.log(`assembled ${insights.length} insights from ${sortedClusters.length} clusters`);
console.log(`reviewsScanned: ${reviewsScanned}`);
console.log(`themes:`, byTheme);
console.log(`evidence quotes per insight: avg ${(insights.reduce((s, i) => s + i.evidence.length, 0) / insights.length).toFixed(1)}, max ${Math.max(...insights.map((i) => i.evidence.length))}`);
if (noTheme.length > 0) {
  console.log(`\nWARN: ${noTheme.length} clusters missing theme:`);
  for (const i of noTheme) console.log(`  · ${i.id} : ${i.title}`);
}
