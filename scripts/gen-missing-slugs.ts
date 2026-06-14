import { readFileSync, writeFileSync } from "node:fs";
import { listDomains } from "@/lib/researchCategories";
import { hasInsight } from "@/lib/readyApps";

// Every shipped разбор needs a slug in app-slugs.json, otherwise the catalog
// shows the app but its /<slug> page is unreachable (no link, no chevron). New
// waves (especially scraped ext-* apps) often arrive without one. This finds
// every ready-but-slugless app and assigns a unique kebab slug from its name.

const FILE = "src/data/app-slugs.json";
const slugs = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, string>;
const idToSlug = new Map(Object.entries(slugs).map(([s, id]) => [id, s]));
const used = new Set(Object.keys(slugs));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .split("-")
    .slice(0, 6)
    .join("-");
}

function uniqueSlug(base: string, pid: string): string {
  const s = base || pid.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  if (!used.has(s)) return s;
  for (let i = 2; ; i++) {
    const cand = `${s}-${i}`;
    if (!used.has(cand)) return cand;
  }
}

const added: Array<[string, string, string]> = []; // [slug, pid, name]
const seenPid = new Set<string>();
for (const d of listDomains("ru")) {
  for (const c of d.categories) {
    for (const a of c.apps) {
      if (!a.productId || !hasInsight(a.productId)) continue;
      if (idToSlug.has(a.productId) || seenPid.has(a.productId)) continue;
      seenPid.add(a.productId);
      const slug = uniqueSlug(slugify(a.name), a.productId);
      slugs[slug] = a.productId;
      used.add(slug);
      idToSlug.set(a.productId, slug);
      added.push([slug, a.productId, a.name]);
    }
  }
}

// Keep keys sorted for a stable, reviewable diff.
const sorted = Object.fromEntries(Object.keys(slugs).sort().map((k) => [k, slugs[k]]));
writeFileSync(FILE, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Добавлено ${added.length} слагов:`);
for (const [s, , n] of added) console.log(`  ${s}  ← ${n}`);
