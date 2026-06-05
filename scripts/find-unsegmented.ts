import { PrismaClient } from "@prisma/client";
import segments from "../src/data/segments.json";

const prisma = new PrismaClient();
type Seg = { slug: string; appIds: string[] };

async function main() {
  const cats = process.argv.slice(2);
  const allSegmentedIds = new Set((segments as Seg[]).flatMap(s => s.appIds));
  
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, rank: true },
    where: cats.length ? { category: { in: cats } } : undefined,
    orderBy: { rank: 'asc' },
  });
  
  const unSegmented = products.filter(p => !allSegmentedIds.has(p.id));
  
  for (const prod of unSegmented) {
    const apps = await prisma.app.findMany({ where: { productId: prod.id }, select: { id: true } });
    const neg = await prisma.review.count({ where: { appId: { in: apps.map(a => a.id) }, rating: { lte: 2 } } });
    if (neg >= 30) {
      console.log(`${String(neg).padStart(5)} [${(prod.category || 'none').padEnd(15)}] ${prod.id} ${prod.name}`);
    }
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
