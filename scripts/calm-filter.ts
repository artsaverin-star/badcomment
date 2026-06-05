import { readFileSync, writeFileSync } from "node:fs";

// Pre-filter the raw Calm review dump before qualitative extraction. The goal
// is to drop reviews that physically cannot carry an insight (too short, exact
// duplicates, pure rage with no content) WITHOUT discarding anything ambiguous.
// The extract LLM gets the survivors and decides per-review whether to emit.
//
// Conservative on purpose: false negatives here are real lost signal, false
// positives just cost a few extract calls. Lean toward keeping.
//
// Usage: npx tsx scripts/calm-filter.ts <productId>

const PRODUCT_ID = process.argv[2];
const DAYS = process.argv[3] ? Number(process.argv[3]) : null;
if (!PRODUCT_ID) {
  console.error("usage: calm-filter.ts <productId> [days]");
  process.exit(1);
}

type Row = {
  appId: string;
  store: string;
  country: string;
  externalId: string;
  rating: number;
  title: string | null;
  text: string;
  version: string | null;
  postedAt: string | null;
  author: string | null;
};

const MIN_LEN = 30; // chars of body — short enough to keep specific gripes
const PURE_NOISE = /^(great|good|love (it|this)|amazing|the best|excellent|nice|cool|fine|ok|okay|wow|bad|awful|terrible|horrible|sucks|hate (it|this)|trash|garbage|useless|works|works fine|works great|perfect|10\/10|5 stars?|five stars?|☆+|★+|👍+|👎+|\.+|!+|\?+|\s*)$/i;

function normText(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function looksPureNoise(text: string): boolean {
  const t = text.trim();
  if (PURE_NOISE.test(t)) return true;
  // Aggressive: also catch ratings-only / emoji-only / repeated-words
  const words = t.split(/\s+/);
  if (words.length <= 2 && t.length < 25) return true;
  return false;
}

function main() {
  const raw: Row[] = JSON.parse(readFileSync(`data/${PRODUCT_ID}-reviews.json`, "utf8"));
  console.log(`raw: ${raw.length}`);

  const cutoff = DAYS ? Date.now() - DAYS * 86_400_000 : null;
  if (cutoff) {
    console.log(`time window: postedAt >= ${new Date(cutoff).toISOString().slice(0, 10)} (last ${DAYS} days)`);
  }

  // Dedup by normalized text content. Reviews syndicated across countries
  // (same English text in us/gb/ca/au) collapse to one row. Keep the row with
  // the most metadata (rating, dated, longest title preferred).
  const byText = new Map<string, Row>();
  for (const r of raw) {
    if (!r.text || r.text.trim().length < MIN_LEN) continue;
    if (looksPureNoise(r.text)) continue;
    if (cutoff && (!r.postedAt || new Date(r.postedAt).getTime() < cutoff)) continue;
    const key = normText(r.text);
    const existing = byText.get(key);
    if (!existing) {
      byText.set(key, r);
      continue;
    }
    // Prefer the most-informative duplicate.
    const score = (x: Row) => (x.title ? 1 : 0) + (x.postedAt ? 1 : 0) + (x.version ? 1 : 0);
    if (score(r) > score(existing)) byText.set(key, r);
  }

  const filtered = [...byText.values()];
  console.log(`after dedup + min-length + noise filter${cutoff ? " + time window" : ""}: ${filtered.length}`);

  // Rating distribution after filter
  const by = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: filtered.filter((r) => r.rating === n).length }));
  console.log("\nrating distribution:");
  for (const b of by) console.log(`  ${b.rating}★: ${b.count}`);

  // Length distribution (chars in body)
  const lens = filtered.map((r) => r.text.length).sort((a, b) => a - b);
  const pct = (p: number) => lens[Math.floor((lens.length - 1) * p)];
  console.log("\ntext length percentiles (chars):");
  console.log(`  p10=${pct(0.1)}  p50=${pct(0.5)}  p90=${pct(0.9)}  p99=${pct(0.99)}  max=${pct(1)}`);

  writeFileSync(`data/${PRODUCT_ID}-filtered.json`, JSON.stringify(filtered, null, 2));
  console.log(`\nwrote data/${PRODUCT_ID}-filtered.json`);
}

main();
