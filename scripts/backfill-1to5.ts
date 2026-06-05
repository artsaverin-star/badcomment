import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fetchReviews } from "../src/lib/scrapers";
import { tagThemes } from "../src/lib/themes";

// Re-fetch the freshest N reviews per app+country and upsert ALL ratings
// (1-5★) — earlier scripts only kept 1-2★ negatives, then 3★ via the
// 3star backfill. The qualitative-extraction pipeline wants the full
// rating spectrum so 4-5★ ("please add X" feature-gap signal) is
// captured too.
//
// Targeted at specific productIds (comma-separated) to avoid hammering the
// store APIs across the whole 12k-app DB.
//
// Usage:
//   DATABASE_URL=file:/opt/badcomment/data/prod.db \
//   BACKFILL_PRODUCT_IDS=<id1,id2,...> \
//   BACKFILL_MAX=1000 \
//   npx tsx scripts/backfill-1to5.ts

const COUNTRY = process.env.INGEST_COUNTRY ?? "us";
const MAX_FETCH = Number(process.env.BACKFILL_MAX ?? 1000);
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP ?? 800);
const PRODUCT_IDS = (process.env.BACKFILL_PRODUCT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  if (PRODUCT_IDS.length === 0) {
    console.error("Pass BACKFILL_PRODUCT_IDS=<id1,id2,...>");
    process.exit(1);
  }
  const apps = await prisma.app.findMany({
    where: { productId: { in: PRODUCT_IDS } },
    select: { id: true, store: true, storeAppId: true, country: true, productId: true },
    orderBy: { id: "asc" },
  });

  console.log(`Backfilling 1-5★ for ${apps.length} listings across ${PRODUCT_IDS.length} products (max ${MAX_FETCH}/listing)…`);

  let done = 0, added = 0, failed = 0;
  for (const app of apps) {
    const country = app.country ?? COUNTRY;
    try {
      const reviews = await fetchReviews(app.store as "google" | "apple", app.storeAppId, country, MAX_FETCH);
      for (const r of reviews) {
        const themes = tagThemes(`${r.title ?? ""} ${r.text}`);
        const before = await prisma.review.findUnique({
          where: { appId_externalId: { appId: app.id, externalId: r.externalId } },
        });
        await prisma.review.upsert({
          where: { appId_externalId: { appId: app.id, externalId: r.externalId } },
          create: {
            appId: app.id,
            externalId: r.externalId,
            author: r.author,
            rating: r.rating,
            title: r.title,
            text: r.text,
            version: r.version,
            postedAt: r.postedAt,
            themes: JSON.stringify(themes),
          },
          update: {},
        });
        if (!before) added++;
      }
      done++;
      console.log(`[${done}/${apps.length}] ${app.store}/${app.storeAppId} (${country}) — fetched ${reviews.length}`);
    } catch (err) {
      failed++;
      console.error(`[${done + 1}/${apps.length}] ${app.store}/${app.storeAppId} FAILED: ${(err as Error).message}`);
    }
    await sleep(SLEEP_MS);
  }

  console.log(`\nDone — ${done} listings, ${added} new reviews, ${failed} failed.`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
