import "dotenv/config";
import { CATEGORIES } from "../src/lib/categories";
import { topByCategory, type Store } from "../src/lib/scrapers";
import { ingestListing } from "../src/lib/ingest";
import { prisma } from "../src/lib/prisma";

const COUNTRY = process.env.INGEST_COUNTRY ?? "us";
const PER_CATEGORY = Number(process.env.INGEST_TOP ?? 10);
const MAX_REVIEWS = Number(process.env.INGEST_MAX_REVIEWS ?? 100);
const STORES: Store[] = ["google", "apple"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const started = Date.now();
  let apps = 0;
  let stored = 0;

  for (const cat of CATEGORIES) {
    for (const store of STORES) {
      const storeCat = store === "google" ? cat.google : cat.apple;
      let listings;
      try {
        listings = await topByCategory(store, storeCat, COUNTRY, PER_CATEGORY);
      } catch (err) {
        console.error(`[${cat.key}/${store}] top-list failed:`, (err as Error).message);
        continue;
      }

      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        const rank = i + 1;
        try {
          const res = await ingestListing(listing, cat.key, rank, COUNTRY, MAX_REVIEWS);
          apps++;
          stored += res.stored;
          console.log(
            `[${cat.key}/${store}] #${rank} ${res.title} — ${res.stored}/${res.negative} negatives`
          );
        } catch (err) {
          console.error(
            `[${cat.key}/${store}] #${rank} ${listing.title} failed:`,
            (err as Error).message
          );
        }
        await sleep(800); // be gentle with the stores
      }
    }
  }

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`\nDone in ${secs}s — ${apps} listings ingested, ${stored} negative reviews stored.`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
