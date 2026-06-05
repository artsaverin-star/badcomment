import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fetchReviews } from "../src/lib/scrapers";
import { tagThemes } from "../src/lib/themes";

// Re-fetches reviews for every app in the DB and stores any 3-star reviews that
// weren't previously collected (NEGATIVE_MAX_RATING was 2; now it's 3). Uses
// upsert keyed on appId+externalId so 1-2 star rows are never touched.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/backfill-3star.ts
// Resume-safe: can be killed and restarted; already-stored rows are no-ops.

const COUNTRY = process.env.INGEST_COUNTRY ?? "us";
const MAX_FETCH = Number(process.env.BACKFILL_MAX ?? 300);
const SLEEP_MS = Number(process.env.BACKFILL_SLEEP ?? 800);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const apps = await prisma.app.findMany({
    select: { id: true, store: true, storeAppId: true, country: true },
    orderBy: { id: "asc" },
  });

  console.log(`Backfilling 3-star reviews for ${apps.length} apps…`);

  let done = 0, added = 0, failed = 0;
  for (const app of apps) {
    const country = app.country ?? COUNTRY;
    try {
      const reviews = await fetchReviews(app.store as "google" | "apple", app.storeAppId, country, MAX_FETCH);
      const threeStars = reviews.filter((r) => r.rating === 3);
      for (const r of threeStars) {
        const themes = tagThemes(`${r.title ?? ""} ${r.text}`);
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
        added++;
      }
      done++;
      if (threeStars.length > 0) {
        console.log(`[${done}/${apps.length}] ${app.store} ${app.storeAppId} +${threeStars.length} 3★`);
      }
    } catch (err) {
      failed++;
      console.error(`[${done + 1}/${apps.length}] ${app.store} ${app.storeAppId} FAILED: ${(err as Error).message}`);
    }
    await sleep(SLEEP_MS);
    if (done % 100 === 0 && done > 0) {
      console.log(`--- ${done}/${apps.length} done, ${added} added, ${failed} failed ---`);
    }
  }

  console.log(`\nDone — ${done} apps processed, ${added} 3-star reviews added, ${failed} failed.`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
