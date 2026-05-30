import "dotenv/config";
import { readFileSync } from "node:fs";
import { getIdeaCards } from "../src/lib/queries";
import { summaryHash, type IdeaSummary } from "../src/lib/summarize";
import { prisma } from "../src/lib/prisma";

// Apply Claude-authored summaries to products. Reads a JSON file of
// [{ id, summary }] and stores each as Product.summary, stamping the current
// review-signature hash so a future refresh only re-touches apps whose reviews
// actually changed. Run: tsx scripts/apply-summaries.ts <file.json>
async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: tsx scripts/apply-summaries.ts <file.json>");
    process.exit(1);
  }
  const items = JSON.parse(readFileSync(file, "utf8")) as {
    id: string;
    summary: IdeaSummary;
  }[];

  // Cards carry the review samples needed to compute the skip-hash.
  const cards = await getIdeaCards(2000);
  const byId = new Map(cards.map((c) => [c.id, c]));

  let ok = 0;
  let failed = 0;
  for (const it of items) {
    const card = byId.get(it.id);
    const hash = card ? summaryHash(card) : `claude:${it.id}`;
    try {
      await prisma.product.update({
        where: { id: it.id },
        data: { summary: JSON.stringify(it.summary), summaryHash: hash },
      });
      ok++;
      console.log(
        `[ok] ${card?.name ?? it.id} — ${it.summary.gaps?.length ?? 0} gaps, type=${it.summary.opportunityType ?? "-"}`
      );
    } catch (e) {
      failed++;
      console.error(`[fail] ${it.id}: ${(e as Error).message}`);
    }
  }
  console.log(`\nApplied ${ok}, failed ${failed}.`);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
