import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import appStore from "app-store-scraper";

// Resolve every app name in src/data/categories.json to Apple App Store
// canonical metadata (track id, name, artwork URL). Uses the app-store-scraper
// package which goes through Apple's frontend endpoints — more permissive than
// the public itunes.apple.com/search API that blanket-blocks scrapers.
//
// Resumable — already-resolved entries are skipped. Writes to
// src/data/categories-meta.json after every fetch.
//
// Usage: npx tsx scripts/resolve-category-apps.ts

type Category = { slug: string; apps: string[] };
type Domain = { slug: string; categories: Category[] };

type AppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string; // populated by resolve-from-db.ts
};

const META_PATH = "src/data/categories-meta.json";
const SLEEP_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function looksReasonable(query: string, name: string): boolean {
  const q = normalize(query);
  const n = normalize(name);
  if (n === q || n.startsWith(q) || q.startsWith(n)) return true;
  const qFirst = q.split(" ")[0];
  if (qFirst.length >= 3 && n.split(" ")[0] === qFirst) return true;
  if (n.includes(q) || q.includes(n)) return true;
  return false;
}

type StoreResult = {
  id: number;
  title: string;
  icon: string;
  developer: string;
  bundleId?: string;
  appId?: string;
};

async function search(term: string): Promise<AppMeta | null> {
  try {
    const results = (await appStore.search({ term, country: "us", num: 5, lang: "en-us" })) as StoreResult[];
    if (!results.length) return null;
    const best = results.find((r) => looksReasonable(term, r.title)) ?? results[0];
    return {
      query: term,
      name: best.title,
      icon: best.icon,
      appleId: best.id,
      bundleId: best.appId ?? best.bundleId ?? null,
      developer: best.developer ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Domain[];
  const categories = domains.flatMap((d) => d.categories);
  if (!existsSync("src/data")) mkdirSync("src/data", { recursive: true });

  const existing: Record<string, AppMeta> = existsSync(META_PATH)
    ? JSON.parse(readFileSync(META_PATH, "utf8"))
    : {};

  let total = 0, resolved = 0, skipped = 0, failed = 0;
  for (const cat of categories) {
    for (const app of cat.apps) {
      total++;
      const key = `${cat.slug}:${app}`;
      // Skip if we already have a real appleId (productId-only matches still
      // want iTunes meta to get a stable canonical name + icon)
      if (existing[key]?.appleId && existing[key].appleId > 0) {
        skipped++;
        continue;
      }
      const meta = await search(app);
      if (meta) {
        // Preserve productId if previously matched
        if (existing[key]?.productId) meta.productId = existing[key].productId;
        existing[key] = meta;
        resolved++;
        console.log(`  ✓ ${cat.slug}/${app} → ${meta.name} (${meta.appleId})`);
      } else {
        failed++;
        console.log(`  ✗ ${cat.slug}/${app}`);
      }
      writeFileSync(META_PATH, JSON.stringify(existing, null, 2));
      await sleep(SLEEP_MS);
    }
  }
  console.log(`\n${resolved} resolved · ${skipped} cached · ${failed} failed · ${total} total`);
}

main().catch((e) => { console.error(e); process.exit(1); });
