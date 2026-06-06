import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import store from "app-store-scraper";

// Scrape recent App Store reviews for an app straight from Apple's RSS feed
// (no prod DB needed) and write them in the pipeline's filtered-row shape:
//   data/<productId>-filtered.json : { externalId, rating, title, text, version, postedAt }[]
// Apple caps each country's review feed at ~500 (10 pages × 50); we pull a few
// countries and dedupe by review id to get a fuller, recent sample.
//
// Usage: npx tsx scripts/scrape-reviews.ts <appleId> <productId> [maxPagesPerCountry=10]

const APPLE_ID = Number(process.argv[2]);
const PRODUCT_ID = process.argv[3];
const MAX_PAGES = Number(process.argv[4] ?? 10);
if (!APPLE_ID || !PRODUCT_ID) {
  console.error("usage: scrape-reviews.ts <appleId> <productId> [maxPagesPerCountry=10]");
  process.exit(1);
}

const COUNTRIES = ["us", "gb", "ca", "au"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { externalId: string; rating: number; title: string | null; text: string; version: string | null; postedAt: string | null };

async function main() {
  if (!existsSync("data")) mkdirSync("data", { recursive: true });
  const byId = new Map<string, Row>();

  for (const country of COUNTRIES) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      let batch: Array<{ id: string; score: number; title?: string; text: string; version?: string; updated?: string }>;
      try {
        batch = await store.reviews({ id: APPLE_ID, country, sort: store.sort.RECENT, page });
      } catch (e) {
        console.log(`  ${country} p${page}: ERR ${(e as Error).message} — stop country`);
        break;
      }
      if (!batch.length) break;
      for (const r of batch) {
        if (byId.has(r.id)) continue;
        const text = (r.text ?? "").trim();
        if (!text) continue;
        byId.set(r.id, {
          externalId: r.id,
          rating: r.score,
          title: r.title?.trim() || null,
          text,
          version: r.version ?? null,
          postedAt: r.updated ?? null,
        });
      }
      process.stdout.write(`\r  scraped ${byId.size} unique reviews (${country} p${page})   `);
      await sleep(350);
    }
  }

  const rows = [...byId.values()];
  writeFileSync(`data/${PRODUCT_ID}-filtered.json`, JSON.stringify(rows, null, 2) + "\n");
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) dist[r.rating] = (dist[r.rating] ?? 0) + 1;
  console.log(`\nwrote data/${PRODUCT_ID}-filtered.json — ${rows.length} reviews · ★dist ${JSON.stringify(dist)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
