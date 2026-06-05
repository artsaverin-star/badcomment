import { writeFileSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Audit every segment: dump apps within with their names + DB ids + review
// counts so the curation pass can spot duplicates (multi-listing same brand)
// and cross-category contamination.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/audit-segments.ts

const prisma = new PrismaClient();

type Segment = { slug: string; appIds: string[]; ru: { name: string }; en: { name: string } };

async function main() {
  const segments = JSON.parse(readFileSync("src/data/segments.json", "utf8")) as Segment[];
  const allIds = [...new Set(segments.flatMap((s) => s.appIds))];

  const products = await prisma.product.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      name: true,
      icon: true,
      developer: true,
      listings: {
        select: { _count: { select: { reviews: true } } },
      },
    },
  });
  const info = new Map(
    products.map((p) => [p.id, {
      name: p.name,
      developer: p.developer,
      reviews: p.listings.reduce((s, l) => s + l._count.reviews, 0),
    }]),
  );

  const out = segments.map((s) => {
    const apps = s.appIds
      .map((id) => {
        const p = info.get(id);
        if (!p) return null;
        return { id, name: p.name, developer: p.developer, reviews: p.reviews };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => b.reviews - a.reviews);
    return {
      slug: s.slug,
      ru: s.ru.name,
      en: s.en.name,
      apps,
      totalReviews: apps.reduce((sum, a) => sum + a.reviews, 0),
    };
  });

  writeFileSync("segments-audit.json", JSON.stringify(out, null, 2));
  console.log(`wrote segments-audit.json: ${out.length} segments, ${products.length} unique products`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
