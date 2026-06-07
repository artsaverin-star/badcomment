import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Category yield triage. Ranks all categories by how much real review signal
// they can yield for the deep insights pipeline, using Apple's own
// userRatingCount as a (fabrication-free) proxy for how many written reviews
// are scrapable. The deep pipeline costs ~half a day per app, so we run it on
// the highest-yield categories first and skip thin/junk ones.
//
// No LLM, no DB. Pulls public iTunes lookup metadata (cached on disk).
//
// Usage: npx tsx scripts/triage-categories.ts [minRatings=2000]

type RawCategory = { slug: string; ru: { name: string }; apps: string[] };
type RawDomain = { slug: string; ru: { name: string }; categories: RawCategory[] };
type RawMeta = { name: string; appleId: number; productId?: string };
type Insight = { productId?: string };

type LookupRow = {
  trackId: number;
  userRatingCount?: number;
  averageUserRating?: number;
  formattedPrice?: string;
};

const MIN_RATINGS = Number(process.argv[2] ?? 2000);
const CACHE_PATH = "triage/itunes-cache.json";
const CHUNK = 150;

const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as RawDomain[];
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8")) as Record<string, RawMeta>;
const insights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Insight[];
const donePids = new Set(insights.map((i) => i.productId).filter(Boolean) as string[]);
const parked = new Set(
  JSON.parse(readFileSync("src/data/deprioritized-categories.json", "utf8")) as string[],
);

mkdirSync("triage", { recursive: true });
const cache: Record<string, LookupRow | null> = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
  : {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchLookups(ids: number[]): Promise<void> {
  const missing = ids.filter((id) => !(String(id) in cache));
  for (let i = 0; i < missing.length; i += CHUNK) {
    const batch = missing.slice(i, i + CHUNK);
    const url = `https://itunes.apple.com/lookup?country=us&id=${batch.join(",")}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`lookup HTTP ${res.status} for chunk ${i / CHUNK}; retrying once`);
      await sleep(2000);
      const retry = await fetch(url);
      if (!retry.ok) throw new Error(`lookup failed: ${retry.status}`);
      applyResults(batch, await retry.json());
    } else {
      applyResults(batch, await res.json());
    }
    writeFileSync(CACHE_PATH, JSON.stringify(cache));
    process.stderr.write(`\rfetched ${Math.min(i + CHUNK, missing.length)}/${missing.length} new ids`);
    await sleep(500);
  }
  if (missing.length) process.stderr.write("\n");
}

function applyResults(batch: number[], json: unknown): void {
  const results = (json as { results: LookupRow[] }).results ?? [];
  const byId = new Map(results.map((r) => [r.trackId, r]));
  for (const id of batch) cache[String(id)] = byId.get(id) ?? null;
}

type CatStat = {
  domain: string;
  slug: string;
  name: string;
  apps: number;
  resolved: number;
  done: number;
  viable: number; // resolved apps with >= MIN_RATINGS ratings, not yet done
  medianRatings: number;
  totalRatings: number;
  avgStars: number | null;
};

async function run() {
  // Collect all appleIds up front so we batch the network calls.
  const allIds = new Set<number>();
  for (const d of domains)
    for (const c of d.categories)
      for (const q of c.apps) {
        const m = meta[`${c.slug}:${q}`];
        if (m?.appleId) allIds.add(m.appleId);
      }
  await fetchLookups([...allIds]);

  const stats: CatStat[] = [];
  for (const d of domains)
    for (const c of d.categories) {
      if (parked.has(c.slug)) continue;
      const ratings: number[] = [];
      const stars: number[] = [];
      let resolved = 0;
      let done = 0;
      let viable = 0;
      for (const q of c.apps) {
        const m = meta[`${c.slug}:${q}`];
        if (!m?.appleId) continue;
        const row = cache[String(m.appleId)];
        const isDone = m.productId ? donePids.has(m.productId) : false;
        if (isDone) done++;
        if (!row) continue;
        resolved++;
        const rc = row.userRatingCount ?? 0;
        ratings.push(rc);
        if (typeof row.averageUserRating === "number") stars.push(row.averageUserRating);
        if (rc >= MIN_RATINGS && !isDone) viable++;
      }
      const sorted = [...ratings].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
      stats.push({
        domain: d.ru.name,
        slug: c.slug,
        name: c.ru.name,
        apps: c.apps.length,
        resolved,
        done,
        viable,
        medianRatings: median,
        totalRatings: ratings.reduce((s, r) => s + r, 0),
        avgStars: stars.length ? +(stars.reduce((s, r) => s + r, 0) / stars.length).toFixed(2) : null,
      });
    }

  // Rank: untouched categories with the most viable apps first; tie-break by
  // total review pool. Fully-done categories sink to the bottom.
  const ranked = stats.sort((a, b) => {
    const aDone = a.done >= a.apps;
    const bDone = b.done >= b.apps;
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (b.viable !== a.viable) return b.viable - a.viable;
    return b.totalRatings - a.totalRatings;
  });

  writeFileSync("triage/categories-ranked.json", JSON.stringify(ranked, null, 2) + "\n");

  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const padL = (s: string | number, n: number) => String(s).padStart(n);
  console.log(
    `\n# Category yield triage (viable = resolved app with >= ${MIN_RATINGS.toLocaleString()} ratings, not yet done)\n`,
  );
  console.log(
    pad("#", 4) + pad("category", 30) + padL("apps", 5) + padL("done", 5) + padL("viable", 7) + padL("medRC", 9) + padL("avg★", 6),
  );
  ranked.forEach((s, i) => {
    if (s.done >= s.apps) return;
    console.log(
      pad(i + 1, 4) +
        pad(s.name.slice(0, 28), 30) +
        padL(s.apps, 5) +
        padL(s.done, 5) +
        padL(s.viable, 7) +
        padL(s.medianRatings.toLocaleString(), 9) +
        padL(s.avgStars ?? "—", 6),
    );
  });
  const doneCats = ranked.filter((s) => s.done >= s.apps);
  console.error(`\n${ranked.length} categories; ${doneCats.length} fully done; wrote triage/categories-ranked.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
