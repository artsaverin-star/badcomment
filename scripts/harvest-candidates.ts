import "dotenv/config";
import { writeFileSync } from "node:fs";
import gplay from "google-play-scraper";
import appStore from "app-store-scraper";
import { CATEGORIES, categoryComplexity } from "../src/lib/categories";
import { productName, productSlug } from "../src/lib/match";

// Cheaply harvest a big candidate pool from both stores WITHOUT scraping any
// reviews. Demand is read straight off the chart rank (top of TOP_FREE /
// TOP_GROSSING = proven demand), buildability from the category, and obvious
// giants get tagged (not dropped) so the full list stays legible: every app
// carries a reason it's in or out.

const COUNTRY = process.env.HARVEST_COUNTRY ?? "us";
const FREE_DEPTH = Number(process.env.HARVEST_FREE ?? 150);
const GROSS_DEPTH = Number(process.env.HARVEST_GROSS ?? 100);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Megacorp developers whose apps are never indie-clonable (network/infra/brand
// lock-in). Matched loosely against the listing's developer string.
const GIANT_DEV =
  /\b(google|alphabet|meta|facebook|instagram|whatsapp|apple|amazon|microsoft|bytedance|tiktok|tencent|netflix|spotify|x corp|twitter|snap inc|pinterest|uber|lyft|airbnb|paypal|block,? inc|coinbase|walmart|target|samsung|adobe|openai|anthropic)\b/i;

type Cand = {
  slug: string;
  name: string;
  category: string;
  google?: string; // google appId
  apple?: string; // apple numeric id
  developer: string | null;
  bestRank: number;
  collections: string[]; // free / grossing
  inGrossing: boolean;
  score: number | null; // store avg rating if inline
  complexity: number;
  giantDev: boolean;
};

async function pull(
  store: "google" | "apple",
  collection: unknown,
  category: string | number,
  num: number,
): Promise<Record<string, unknown>[]> {
  try {
    if (store === "google") {
      return (await gplay.list({ category, collection: collection as string, num, country: COUNTRY })) as Record<string, unknown>[];
    }
    return (await appStore.list({ category, collection: collection as number, num, country: COUNTRY })) as Record<string, unknown>[];
  } catch (err) {
    console.error(`  [${store}] list failed:`, (err as Error).message);
    return [];
  }
}

function upsert(map: Map<string, Cand>, raw: Record<string, unknown>, store: "google" | "apple", catKey: string, rank: number, collection: string) {
  const title = String(raw.title ?? "");
  if (!title) return;
  const slug = productSlug(title);
  if (!slug) return;
  const existing = map.get(slug);
  const dev = (raw.developer as string) ?? null;
  const score = typeof raw.score === "number" ? raw.score : null;
  if (existing) {
    existing.bestRank = Math.min(existing.bestRank, rank);
    if (!existing.collections.includes(collection)) existing.collections.push(collection);
    if (collection === "grossing") existing.inGrossing = true;
    if (score != null && existing.score == null) existing.score = score;
    if (dev && !existing.developer) existing.developer = dev;
  }
  const c: Cand = existing ?? {
    slug,
    name: productName(title),
    category: catKey,
    developer: dev,
    bestRank: rank,
    collections: [collection],
    inGrossing: collection === "grossing",
    score,
    complexity: categoryComplexity(catKey),
    giantDev: GIANT_DEV.test(dev ?? "") || GIANT_DEV.test(title),
  };
  if (store === "google") c.google = String(raw.appId);
  else c.apple = String(raw.id);
  map.set(slug, c);
}

// Transparent candidate score: demand (chart rank) is the dominant lever,
// buildability (inverse category complexity) second, a small bonus for proven
// paying demand (grossing), and giants are kept but pushed to the bottom.
function rank(c: Cand): number {
  const demand = Math.max(0, 1 - (c.bestRank - 1) / 150); // rank1≈1 .. rank150≈0
  const build = Math.max(0.05, (3.1 - c.complexity) / 2.1); // utilities≈1 .. social≈0.24
  const grossing = c.inGrossing ? 0.15 : 0;
  const base = 0.6 * demand + 0.4 * build + grossing;
  return c.giantDev ? base * 0.2 : base;
}

async function main() {
  const map = new Map<string, Cand>();
  for (const cat of CATEGORIES) {
    console.log(`# ${cat.key}`);
    const free = await pull("google", gplay.collection.TOP_FREE, cat.google, FREE_DEPTH);
    free.forEach((r, i) => upsert(map, r, "google", cat.key, i + 1, "free"));
    await sleep(500);
    const gross = await pull("google", gplay.collection.GROSSING, cat.google, GROSS_DEPTH);
    gross.forEach((r, i) => upsert(map, r, "google", cat.key, i + 1, "grossing"));
    await sleep(500);
    const afree = await pull("apple", appStore.collection.TOP_FREE_IOS, cat.apple, FREE_DEPTH);
    afree.forEach((r, i) => upsert(map, r, "apple", cat.key, i + 1, "free"));
    await sleep(500);
    const agross = await pull("apple", appStore.collection.TOP_GROSSING_IOS, cat.apple, GROSS_DEPTH);
    agross.forEach((r, i) => upsert(map, r, "apple", cat.key, i + 1, "grossing"));
    await sleep(500);
    console.log(`  pool so far: ${map.size}`);
  }

  const all = [...map.values()].map((c) => ({ ...c, rank: rank(c) })).sort((a, b) => b.rank - a.rank);
  writeFileSync("harvest.json", JSON.stringify(all, null, 2));

  const giants = all.filter((c) => c.giantDev).length;
  const both = all.filter((c) => c.google && c.apple).length;
  const grossing = all.filter((c) => c.inGrossing).length;
  const byCat: Record<string, number> = {};
  for (const c of all.slice(0, 1000)) byCat[c.category] = (byCat[c.category] ?? 0) + 1;

  console.log(`\n=== POOL: ${all.length} unique apps ===`);
  console.log(`giants (down-ranked): ${giants} · cross-store: ${both} · in grossing: ${grossing}`);
  console.log(`top-1000 by category:`, JSON.stringify(byCat));
  console.log(`\nTOP 30:`);
  all.slice(0, 30).forEach((c, i) =>
    console.log(`${String(i + 1).padStart(3)}. ${c.name.slice(0, 32).padEnd(32)} ${c.category.padEnd(13)} rank${String(c.bestRank).padStart(3)} ${c.collections.join("+")}${c.giantDev ? " [giant]" : ""}`),
  );
  console.log(`\nwrote harvest.json (${all.length} apps)`);
}

main().then(() => process.exit(0));
