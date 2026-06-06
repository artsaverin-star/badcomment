import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Remove the harvest-noise / dead apps listed in removal-map.json from
// categories.json (matched by normalized name so punctuation/spacing diffs
// don't cause silent misses) and drop the matching categories-meta.json keys.
//
// Dry-run (default): reports matched + UNMATCHED per category, writes nothing.
// Apply: DRY=0 npx tsx scripts/apply-removals.ts

const CAT_PATH = "src/data/categories.json";
const META_PATH = "src/data/categories-meta.json";
const MAP_PATH = "scripts/removal-map.json";
const APPLY = process.env.DRY === "0";

type Category = { slug: string; apps: string[] };
type Domain = { slug: string; categories: Category[] };

const norm = (s: string) =>
  s.toLowerCase().replace(/[®™©]/g, "").replace(/[^a-z0-9а-яё가-힣一-龥]+/giu, " ").replace(/\s+/g, " ").trim();

const domains = JSON.parse(readFileSync(CAT_PATH, "utf8")) as Domain[];
const map = JSON.parse(readFileSync(MAP_PATH, "utf8")) as Record<string, string[]>;
const meta: Record<string, unknown> = existsSync(META_PATH) ? JSON.parse(readFileSync(META_PATH, "utf8")) : {};

let totalRemoved = 0, totalUnmatched = 0, metaDropped = 0;
const removedKeys: string[] = [];

for (const [slug, targets] of Object.entries(map)) {
  const cats = domains.flatMap((d) => d.categories).filter((c) => c.slug === slug);
  if (!cats.length) { console.log(`!! no such category slug: ${slug}`); totalUnmatched += targets.length; continue; }
  const targetNorms = new Map(targets.map((t) => [norm(t), t]));
  const matched: string[] = [];
  for (const cat of cats) {
    const keep: string[] = [];
    for (const app of cat.apps) {
      const hit = targetNorms.get(norm(app));
      if (hit) {
        matched.push(app);
        targetNorms.delete(norm(app));
        removedKeys.push(`${slug}:${app}`);
      } else keep.push(app);
    }
    if (APPLY) cat.apps = keep;
  }
  const unmatched = [...targetNorms.values()];
  totalRemoved += matched.length;
  totalUnmatched += unmatched.length;
  console.log(`[${slug}] removed ${matched.length}/${targets.length}` + (unmatched.length ? `  UNMATCHED: ${unmatched.join(" | ")}` : ""));
}

for (const k of removedKeys) if (k in meta) { delete meta[k]; metaDropped++; }

if (APPLY) {
  writeFileSync(CAT_PATH, JSON.stringify(domains, null, 2) + "\n");
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2) + "\n");
}

const appsLeft = domains.flatMap((d) => d.categories).reduce((s, c) => s + c.apps.length, 0);
console.log(`\n${APPLY ? "APPLIED" : "DRY-RUN"} · removed ${totalRemoved} apps · ${totalUnmatched} unmatched · ${metaDropped} meta keys dropped · catalog now ${appsLeft} apps`);
