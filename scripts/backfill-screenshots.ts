import "dotenv/config";
import { fetchAppMeta } from "../src/lib/scrapers";
import type { Store } from "../src/lib/scrapers";
import { prisma } from "../src/lib/prisma";

// Metadata-only backfill: fetch store screenshots (both stores) and the rating
// histogram (Google only) for listings that are missing them. App detail (no
// reviews) is light on the store, but we still target only the apps backing the
// visible deck (products with an authored summary) and throttle hard so this is
// safe to run on the small prod box. Resumable: a row is skipped once it has
// both screenshots and (for Google) a histogram, so it can be killed/restarted.

const SLEEP_MS = Number(process.env.BACKFILL_SLEEP ?? 800);
const ONLY_SUMMARIZED = process.env.BACKFILL_ALL !== "1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const apps = await prisma.app.findMany({
    where: {
      // A Google app still needs work if it's missing screenshots OR histogram;
      // an Apple app only ever gets screenshots (the store exposes no histogram).
      OR: [
        { screenshots: null },
        { store: "google", histogram: null },
      ],
      ...(ONLY_SUMMARIZED ? { product: { summary: { not: null } } } : {}),
    },
    select: {
      id: true,
      store: true,
      storeAppId: true,
      country: true,
      title: true,
      screenshots: true,
      histogram: true,
    },
  });

  console.log(
    `${apps.length} listings missing screenshots/histogram${ONLY_SUMMARIZED ? " (summarized only)" : ""}`
  );

  const started = Date.now();
  let done = 0, empty = 0, failed = 0;
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i];
    const tag = `[${i + 1}/${apps.length}] ${a.store} ${a.title.slice(0, 30)}`;
    try {
      const meta = await fetchAppMeta(a.store as Store, a.storeAppId, a.country);
      const data: { screenshots?: string; histogram?: string } = {};
      const shots = meta.metrics.screenshots;
      if (a.screenshots == null && shots && shots.length > 0) {
        data.screenshots = JSON.stringify(shots);
      }
      const hist = meta.metrics.histogram;
      if (a.store === "google" && a.histogram == null && hist) {
        data.histogram = JSON.stringify(hist);
      }
      if (Object.keys(data).length === 0) {
        empty++;
        console.log(`${tag} — nothing new`);
      } else {
        await prisma.app.update({ where: { id: a.id }, data });
        done++;
        console.log(
          `${tag} — ${[data.screenshots && `${shots!.length} shots`, data.histogram && "histogram"].filter(Boolean).join(" + ")}`
        );
      }
    } catch (err) {
      failed++;
      console.error(`${tag} FAILED: ${(err as Error).message}`);
    }
    await sleep(SLEEP_MS);
  }

  const mins = Math.round((Date.now() - started) / 60000);
  console.log(`\nDONE in ${mins}m — ${done} filled, ${empty} empty, ${failed} failed.`);
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
