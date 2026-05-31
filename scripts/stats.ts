import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, category: true, summary: true },
  });
  const apps = await prisma.app.count();
  const reviews = await prisma.review.count();

  let withSummary = 0;
  let claude = 0; // has opportunityType OR new {en,ru} shape
  let yandex = 0; // summary but legacy/no opportunityType
  let scored = 0; // has buildability+profit
  let bilingual = 0; // has en+ru prose blocks
  const byCat: Record<string, number> = {};

  for (const p of products) {
    byCat[p.category ?? "?"] = (byCat[p.category ?? "?"] ?? 0) + 1;
    if (!p.summary) continue;
    withSummary++;
    type Sum = {
      opportunityType?: unknown;
      buildability?: unknown;
      profit?: unknown;
      en?: { opportunityType?: unknown };
      ru?: unknown;
    };
    let o: Sum | null = null;
    try {
      o = JSON.parse(p.summary) as Sum;
    } catch {
      continue;
    }
    if (o && typeof o === "object" && o.en && o.ru) bilingual++;
    const hasType = o?.opportunityType || (o?.en && o.en.opportunityType);
    if (hasType) claude++;
    else yandex++;
    if (typeof o?.buildability === "number" && typeof o?.profit === "number") scored++;
  }

  console.log(JSON.stringify({
    products: products.length,
    apps,
    reviews,
    withSummary,
    noSummary: products.length - withSummary,
    claude,
    yandex,
    scored,
    bilingual,
    byCat,
  }, null, 2));
}

main().then(() => prisma.$disconnect()).then(() => process.exit(0));
