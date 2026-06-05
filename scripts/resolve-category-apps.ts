import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";

// Resolve every app name in src/data/categories.json to canonical metadata
// (Apple ID, canonical name, artwork URL) via the public iTunes Search API.
// Output is src/data/categories-meta.json: a map keyed by "<categorySlug>:<appName>"
// → { name, icon, appleId, bundleId }.
//
// The resolver is RESUMABLE — already-resolved entries are skipped on re-run.
// Use case: author categories.json with hand-typed app names; run this once;
// commit the meta file; pages render from the meta without doing live fetches.
//
// Usage: npx tsx scripts/resolve-category-apps.ts

type Category = {
  slug: string;
  ru: { name: string; kicker: string };
  en: { name: string; kicker: string };
  tier: string;
  apps: string[];
};

type AppMeta = {
  query: string; // original hand-typed query
  name: string; // canonical store name
  icon: string; // 512x512 artwork URL
  appleId: number; // iTunes trackId
  bundleId: string | null;
  developer: string | null;
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
  // Try first significant word match
  const qFirst = q.split(" ")[0];
  if (qFirst.length >= 3 && n.split(" ")[0] === qFirst) return true;
  // Brand name embedded in either
  if (n.includes(q) || q.includes(n)) return true;
  return false;
}

async function search(term: string): Promise<AppMeta | null> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=us&limit=5`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { results: Array<{ trackId: number; trackName: string; artworkUrl512?: string; artworkUrl100?: string; bundleId?: string; artistName?: string }> };
    const results = data.results ?? [];
    // Pick the first result whose name reasonably matches the query
    const best = results.find((r) => looksReasonable(term, r.trackName)) ?? results[0];
    if (!best) return null;
    return {
      query: term,
      name: best.trackName,
      icon: best.artworkUrl512 ?? best.artworkUrl100 ?? "",
      appleId: best.trackId,
      bundleId: best.bundleId ?? null,
      developer: best.artistName ?? null,
    };
  } catch {
    return null;
  }
}

async function main() {
  const categories = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Category[];
  if (!existsSync("src/data")) mkdirSync("src/data", { recursive: true });

  const existing: Record<string, AppMeta> = existsSync(META_PATH)
    ? JSON.parse(readFileSync(META_PATH, "utf8"))
    : {};

  let total = 0, resolved = 0, skipped = 0, failed = 0;
  for (const cat of categories) {
    for (const app of cat.apps) {
      total++;
      const key = `${cat.slug}:${app}`;
      if (existing[key]) {
        skipped++;
        continue;
      }
      const meta = await search(app);
      if (meta) {
        existing[key] = meta;
        resolved++;
        console.log(`  ✓ ${cat.slug}/${app} → ${meta.name} (${meta.appleId})`);
      } else {
        failed++;
        console.log(`  ✗ ${cat.slug}/${app}`);
      }
      // Persist after every fetch so killing the script doesn't lose progress
      writeFileSync(META_PATH, JSON.stringify(existing, null, 2));
      await sleep(SLEEP_MS);
    }
  }
  console.log(`\n${resolved} resolved · ${skipped} cached · ${failed} failed · ${total} total`);
}

main().catch((e) => { console.error(e); process.exit(1); });
