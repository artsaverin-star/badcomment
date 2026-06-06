import { readFileSync, writeFileSync } from "node:fs";

// Dedupe categories.json + categories-meta.json by appleId.
//
// The resolver mismatched some queries (Adobe Lightroom → Photoshop, NYT →
// WSJ, GOWOD → pliability, etc.) — multiple distinct queries resolved to the
// same Apple track id. For each duplicate group we keep the query whose
// normalized name best overlaps the resolved app name, and drop the rest from
// both files.
//
// Usage: npx tsx scripts/dedup-categories.ts

type Domain = { slug: string; categories: Category[] };
type Category = { slug: string; ru: { name: string; kicker: string }; en: { name: string; kicker: string }; apps: string[] };
type AppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[®™©]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function overlap(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1000;
  if (nb.startsWith(na) || na.startsWith(nb)) return 800;
  // shared prefix length scaled
  let i = 0;
  while (i < na.length && i < nb.length && na[i] === nb[i]) i++;
  if (i >= 3) return 400 + i * 10;
  // token overlap
  const ta = new Set(na.split(" ").filter((t) => t.length >= 3));
  const tb = new Set(nb.split(" ").filter((t) => t.length >= 3));
  let o = 0;
  for (const t of ta) if (tb.has(t)) o++;
  return o * 50;
}

const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Domain[];
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8")) as Record<string, AppMeta>;

// Build appleId → [{key, query, catSlug, score}]
type Entry = { key: string; catSlug: string; query: string; score: number; storeName: string };
const byAppleId = new Map<number, Entry[]>();
for (const d of domains) {
  for (const c of d.categories) {
    for (const q of c.apps) {
      const key = `${c.slug}:${q}`;
      const m = meta[key];
      if (!m || !m.appleId) continue;
      const score = overlap(q, m.name);
      const e: Entry = { key, catSlug: c.slug, query: q, score, storeName: m.name };
      const list = byAppleId.get(m.appleId) ?? [];
      list.push(e);
      byAppleId.set(m.appleId, list);
    }
  }
}

// For each dup group, keep the best (highest overlap); drop others
const dropKeys = new Set<string>();
let dropCount = 0;
for (const [appleId, entries] of byAppleId) {
  if (entries.length <= 1) continue;
  entries.sort((a, b) => b.score - a.score);
  const keep = entries[0];
  for (let i = 1; i < entries.length; i++) {
    dropKeys.add(entries[i].key);
    dropCount++;
    console.log(`drop [appleId=${appleId}] ${entries[i].catSlug}/${entries[i].query} → ${entries[i].storeName} (keep: ${keep.query})`);
  }
}
console.log(`\nTotal dups to drop: ${dropCount}`);

// Apply: remove queries from categories.json AND meta keys
for (const d of domains) {
  for (const c of d.categories) {
    c.apps = c.apps.filter((q) => !dropKeys.has(`${c.slug}:${q}`));
  }
}
for (const k of dropKeys) delete meta[k];

writeFileSync("src/data/categories.json", JSON.stringify(domains, null, 2));
writeFileSync("src/data/categories-meta.json", JSON.stringify(meta, null, 2));

// Report under-10 categories
console.log("\n=== Categories now under 10 apps ===");
let under10 = 0;
for (const d of domains) {
  for (const c of d.categories) {
    if (c.apps.length < 10) {
      console.log(`  ${c.slug}: ${c.apps.length}`);
      under10++;
    }
  }
}
console.log(`Total under-10: ${under10}`);
