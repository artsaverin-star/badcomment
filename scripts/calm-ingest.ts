import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import gplay from "google-play-scraper";
import appStore from "app-store-scraper";
import { prisma } from "../src/lib/prisma";
import { tagThemes } from "../src/lib/themes";

// Maximum-fidelity ingest for ONE product across both stores, all countries,
// all sort modes, ratings 1-5, paginated as deep as the stores allow. Built
// for the qualitative-insight prototype where we want every distinct review
// the platform exposes, not just the most-recent slice.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/calm-ingest.ts <productId>
// Output: writes to DB (upsert) + dumps to local data/<productId>-reviews.json

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-ingest.ts <productId>");
  process.exit(1);
}

const GOOGLE_SORTS = [gplay.sort.NEWEST, gplay.sort.RATING, gplay.sort.HELPFULNESS];
const APPLE_SORTS = [appStore.sort.RECENT, appStore.sort.HELPFUL];
const GOOGLE_MAX_PER_SORT = 2000;
const APPLE_MAX_PAGES = 10; // RSS cap

type Row = {
  appId: string;
  store: string;
  country: string;
  externalId: string;
  author: string | null;
  rating: number;
  title: string | null;
  text: string;
  version: string | null;
  postedAt: Date | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchGoogleAll(appId: string, country: string): Promise<Omit<Row, "appId" | "store" | "country">[]> {
  const seen = new Set<string>();
  const out: Omit<Row, "appId" | "store" | "country">[] = [];
  for (const sort of GOOGLE_SORTS) {
    let token: string | undefined;
    let pulled = 0;
    while (pulled < GOOGLE_MAX_PER_SORT) {
      let res;
      try {
        res = await gplay.reviews({
          appId,
          country,
          sort,
          num: Math.min(150, GOOGLE_MAX_PER_SORT - pulled),
          paginate: true,
          nextPaginationToken: token,
        });
      } catch (err) {
        console.error(`  google ${country} sort=${sort} page failed:`, (err as Error).message);
        break;
      }
      const batch = res.data ?? res;
      if (!batch || batch.length === 0) break;
      for (const r of batch) {
        const id = String(r.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          externalId: id,
          author: r.userName ?? null,
          rating: Number(r.score) || 0,
          title: r.title ?? null,
          text: r.text ?? "",
          version: r.version ?? null,
          postedAt: r.date ? new Date(r.date) : null,
        });
      }
      pulled += batch.length;
      token = res.nextPaginationToken;
      if (!token) break;
      await sleep(400);
    }
    console.log(`  google ${country} sort=${sort}: +${pulled} fetched, ${seen.size} unique so far`);
    await sleep(800);
  }
  return out;
}

async function fetchAppleAll(appId: string, country: string): Promise<Omit<Row, "appId" | "store" | "country">[]> {
  const seen = new Set<string>();
  const out: Omit<Row, "appId" | "store" | "country">[] = [];
  for (const sort of APPLE_SORTS) {
    for (let page = 1; page <= APPLE_MAX_PAGES; page++) {
      let batch: Record<string, unknown>[] = [];
      try {
        batch = await appStore.reviews({ id: appId, country, page, sort });
      } catch (err) {
        console.error(`  apple ${country} sort=${sort} page ${page} failed:`, (err as Error).message);
        break;
      }
      if (!batch || batch.length === 0) break;
      for (const r of batch) {
        const id = String(r.id);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          externalId: id,
          author: (r.userName as string) ?? null,
          rating: Number(r.score) || 0,
          title: (r.title as string) ?? null,
          text: (r.text as string) ?? "",
          version: (r.version as string) ?? null,
          postedAt: r.updated ? new Date(r.updated as string) : null,
        });
      }
      await sleep(400);
    }
    console.log(`  apple ${country} sort=${sort}: ${seen.size} unique so far`);
    await sleep(800);
  }
  return out;
}

async function run() {
  const apps = await prisma.app.findMany({
    where: { productId: PRODUCT_ID },
    select: { id: true, store: true, storeAppId: true, country: true },
  });
  if (apps.length === 0) {
    console.error(`no apps for productId ${PRODUCT_ID}`);
    process.exit(1);
  }
  console.log(`product ${PRODUCT_ID}: ${apps.length} app listings\n`);

  const all: Row[] = [];
  for (const app of apps) {
    console.log(`${app.store} ${app.storeAppId} (${app.country})`);
    const reviews =
      app.store === "google"
        ? await fetchGoogleAll(app.storeAppId, app.country)
        : await fetchAppleAll(app.storeAppId, app.country);
    for (const r of reviews) {
      all.push({ ...r, appId: app.id, store: app.store, country: app.country });
    }
    console.log(`  → total ${reviews.length} unique reviews\n`);
  }

  // Persist to DB. We use upsert keyed by (appId, externalId) so re-runs are
  // idempotent and never duplicate. Existing rows (1-2★ already in DB) are
  // untouched on the create-side; the update is empty.
  let written = 0;
  for (const r of all) {
    const themes = tagThemes(`${r.title ?? ""} ${r.text}`);
    await prisma.review.upsert({
      where: { appId_externalId: { appId: r.appId, externalId: r.externalId } },
      create: {
        appId: r.appId,
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
    written++;
  }
  console.log(`upserted ${written} reviews to DB`);

  // Also dump a snapshot for the prototype pipeline (independent of DB schema).
  mkdirSync("data", { recursive: true });
  const out = all.map((r) => ({
    appId: r.appId,
    store: r.store,
    country: r.country,
    externalId: r.externalId,
    rating: r.rating,
    title: r.title,
    text: r.text,
    version: r.version,
    postedAt: r.postedAt?.toISOString() ?? null,
    author: r.author,
  }));
  const outPath = `data/${PRODUCT_ID}-reviews.json`;
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`dumped ${out.length} reviews to ${outPath}`);

  // Rating distribution summary
  const by = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: all.filter((r) => r.rating === n).length }));
  console.log("\nrating distribution:");
  for (const b of by) console.log(`  ${b.rating}★: ${b.count}`);
}

run()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
