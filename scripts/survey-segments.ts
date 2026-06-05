import { PrismaClient } from "@prisma/client";
import segments from "../src/data/segments.json";

const prisma = new PrismaClient();

type Seg = { slug: string; appIds: string[] };

async function main() {
  const rows: Array<Record<string, number | string>> = [];
  for (const s of segments as Seg[]) {
    const apps = await prisma.app.findMany({
      where: { productId: { in: s.appIds } },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);
    const neg = await prisma.review.count({
      where: { appId: { in: appIds }, rating: { lte: 2 } },
    });
    const classified = await prisma.review.count({
      where: { appId: { in: appIds }, rating: { lte: 2 }, needsVersion: { not: null } },
    });
    rows.push({ slug: s.slug, products: s.appIds.length, apps: apps.length, neg, classified });
  }
  rows.sort((a, b) => (b.neg as number) - (a.neg as number));
  for (const r of rows) {
    console.log(
      `${String(r.slug).padEnd(24)} prod=${String(r.products).padStart(3)} apps=${String(r.apps).padStart(3)} neg=${String(r.neg).padStart(5)} classified=${String(r.classified).padStart(5)}`,
    );
  }
}

main().then(() => prisma.$disconnect()).then(() => process.exit(0));
