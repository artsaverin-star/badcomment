import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Reads [{id, buildability, profit}] and patches the two authored curation
// scores into each Product.summary JSON, leaving summaryHash untouched (the
// review signal is unchanged — only our hand-judged scores are added).
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: tsx scripts/patch-scores.ts <file.json>");
  const rows: { id: string; buildability: number; profit: number }[] = JSON.parse(
    readFileSync(file, "utf8"),
  );
  let ok = 0;
  for (const r of rows) {
    const p = await prisma.product.findUnique({ where: { id: r.id } });
    if (!p?.summary) {
      console.log(`SKIP ${r.id} (no summary)`);
      continue;
    }
    const s = JSON.parse(p.summary);
    s.buildability = r.buildability;
    s.profit = r.profit;
    await prisma.product.update({
      where: { id: r.id },
      data: { summary: JSON.stringify(s) },
    });
    ok++;
  }
  console.log(`patched ${ok}/${rows.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0));
