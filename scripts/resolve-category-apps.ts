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

// Generic words that, on their own, don't identify an app. A shared generic
// first word ("Plant Jammer" vs "Plant Buddi", "Adobe Lightroom" vs "Adobe
// Photoshop") must NOT count as a match — that was how wrong-but-popular apps
// slipped through.
const GENERIC = new Set([
  "the", "app", "pro", "free", "plus", "lite", "ai", "photo", "video", "editor", "maker",
  "plant", "identifier", "sleep", "fitness", "gym", "tracker", "planner", "scanner", "pdf",
  "vpn", "mail", "email", "calendar", "tasks", "music", "piano", "chess", "food", "recipe",
  "recipes", "screen", "focus", "habit", "journal", "period", "cycle", "baby", "pregnancy",
  "language", "learning", "budget", "money", "kids", "game", "games", "online", "courses",
  "note", "notes", "voice", "ride", "electric", "cycling", "bike", "yoga", "alarm", "clock",
  "search", "engine", "chat", "assistant", "daily", "smart", "my",
]);

function looksReasonable(query: string, name: string): boolean {
  const q = normalize(query);
  const n = normalize(name);
  if (n === q) return true;
  // Full-brand prefix: "Calm" → "Calm Meditation Sleep", or vice versa.
  if (n.startsWith(q + " ") || q.startsWith(n + " ")) return true;
  // Every distinctive (non-generic) word of the query appears in the name.
  const nTokens = new Set(n.split(" ").filter(Boolean));
  const distinct = q.split(" ").filter((t) => t.length >= 3 && !GENERIC.has(t));
  if (distinct.length > 0 && distinct.every((t) => nTokens.has(t))) return true;
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
    // Only accept a result that actually resembles the query. Falling back to
    // the top hit silently grabbed the most-popular app for that keyword and
    // produced cross-category garbage (e.g. "Aura" → Aura Frames in meditation,
    // "Codeium" → Podium). An unresolved entry is honest; a wrong one is not.
    const best = results.find((r) => looksReasonable(term, r.title));
    if (!best) return null;
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
