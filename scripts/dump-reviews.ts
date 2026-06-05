import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Dump all reviews for a product from the DB into data/<productId>-reviews.json
// so that calm-filter.ts + the insights pipeline can run without a fresh ingest.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/dump-reviews.ts <productId>

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: dump-reviews.ts <productId>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.app.findMany({
    where: { productId: PRODUCT_ID },
    select: { id: true, store: true, country: true },
  });
  if (!apps.length) {
    console.error(`no apps found for productId ${PRODUCT_ID}`);
    process.exit(1);
  }

  const appIds = apps.map((a) => a.id);
  const appMeta = new Map(apps.map((a) => [a.id, { store: a.store, country: a.country }]));

  const reviews = await prisma.review.findMany({
    where: { appId: { in: appIds } },
    select: {
      appId: true,
      externalId: true,
      author: true,
      rating: true,
      title: true,
      text: true,
      version: true,
      postedAt: true,
    },
  });

  const rows = reviews.map((r) => ({
    appId: r.appId,
    store: appMeta.get(r.appId)?.store ?? "",
    country: appMeta.get(r.appId)?.country ?? "",
    externalId: r.externalId,
    author: r.author,
    rating: r.rating,
    title: r.title,
    text: r.text,
    version: r.version,
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
  }));

  mkdirSync("data", { recursive: true });
  writeFileSync(`data/${PRODUCT_ID}-reviews.json`, JSON.stringify(rows, null, 2));
  console.log(`wrote data/${PRODUCT_ID}-reviews.json (${rows.length} reviews)`);

  const by: Record<number, number> = {};
  for (const r of rows) by[r.rating] = (by[r.rating] ?? 0) + 1;
  console.log("rating breakdown:", by);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
