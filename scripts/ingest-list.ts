import "dotenv/config";
import { readFileSync } from "node:fs";
import { ingestListing } from "../src/lib/ingest";
import type { Store } from "../src/lib/scrapers";
import { prisma } from "../src/lib/prisma";

// Resumable ingest of a hand-selected app list (selected.json from
// select-candidates.ts). Ingests both store listings for cross-store apps so
// they merge into one product. Skips apps already scraped recently, so the run
// can be killed and restarted freely.

const COUNTRY = process.env.INGEST_COUNTRY ?? "us";
const MAX_REVIEWS = Number(process.env.INGEST_MAX_REVIEWS ?? 80);
const SLEEP_MS = Number(process.env.INGEST_SLEEP ?? 900);
const RESCRAPE_DAYS = Number(process.env.INGEST_RESCRAPE_DAYS ?? 30);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = {
  google: string | null;
  apple: string | null;
  name: string;
  developer: string | null;
  category: string;
  bestRank: number;
};

async function recentlyScraped(store: Store, storeAppId: string): Promise<boolean> {
  const app = await prisma.app.findUnique({
    where: { store_storeAppId_country: { store, storeAppId, country: COUNTRY } },
    select: { lastScrapedAt: true },
  });
  if (!app?.lastScrapedAt) return false;
  const ageDays = (Date.now() - app.lastScrapedAt.getTime()) / 86_400_000;
  return ageDays < RESCRAPE_DAYS;
}

async function run() {
  const rows: Row[] = JSON.parse(readFileSync("selected.json", "utf8"));
  const tasks: { store: Store; id: string; row: Row }[] = [];
  for (const r of rows) {
    if (r.google) tasks.push({ store: "google", id: r.google, row: r });
    if (r.apple) tasks.push({ store: "apple", id: r.apple, row: r });
  }

  const started = Date.now();
  let done = 0, skipped = 0, failed = 0, negatives = 0;
  for (let i = 0; i < tasks.length; i++) {
    const { store, id, row } = tasks[i];
    const tag = `[${i + 1}/${tasks.length}] ${store} ${row.name.slice(0, 28)}`;
    try {
      if (await recentlyScraped(store, id)) {
        skipped++;
        continue;
      }
      const res = await ingestListing(
        { store, storeAppId: id, title: row.name, icon: null, developer: row.developer },
        row.category,
        row.bestRank,
        COUNTRY,
        MAX_REVIEWS,
      );
      done++;
      negatives += res.negative;
      console.log(`${tag} — ${res.negative} neg`);
    } catch (err) {
      failed++;
      console.error(`${tag} FAILED: ${(err as Error).message}`);
    }
    if (done % 50 === 0 && done > 0) {
      const mins = Math.round((Date.now() - started) / 60000);
      console.log(`--- progress: ${done} done, ${skipped} skipped, ${failed} failed, ${negatives} negatives, ${mins}m ---`);
    }
    await sleep(SLEEP_MS);
  }

  const mins = Math.round((Date.now() - started) / 60000);
  console.log(`\nDONE in ${mins}m — ${done} ingested, ${skipped} skipped, ${failed} failed, ${negatives} negatives.`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
