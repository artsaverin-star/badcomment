import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const names = process.argv.slice(2);
  for (const name of names) {
    const products = await prisma.product.findMany({
      where: { name: { contains: name } },
      select: { id: true, name: true, category: true },
    });
    for (const p of products) {
      console.log(`${p.id}\t${p.category}\t${p.name}`);
    }
  }
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
