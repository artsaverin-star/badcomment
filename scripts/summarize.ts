import "dotenv/config";
import { homedir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import { getIdeaCards } from "../src/lib/queries";
import { generateSummary, summaryHash } from "../src/lib/summarize";
import { prisma } from "../src/lib/prisma";

// API key lives outside the repo (it's public). Prefer the dedicated file,
// fall back to whatever is already in the environment (e.g. on the VM).
dotenv.config({ path: join(homedir(), ".config/badcomment/yagpt.env") });

const LIMIT = Number(process.env.SUMMARIZE_LIMIT ?? 60);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function run() {
  if (!process.env.YAGPT_API_KEY || !process.env.YAGPT_FOLDER_ID) {
    console.error("Missing YAGPT_API_KEY / YAGPT_FOLDER_ID — nothing to do.");
    process.exit(1);
  }

  const started = Date.now();
  const cards = await getIdeaCards(LIMIT);
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const card of cards) {
    const hash = summaryHash(card);
    const existing = await prisma.product.findUnique({
      where: { id: card.id },
      select: { summary: true, summaryHash: true },
    });

    if (existing?.summary && existing.summaryHash === hash) {
      skipped++;
      continue;
    }

    const summary = await generateSummary(card);
    if (!summary) {
      failed++;
      console.error(`[fail] ${card.name}`);
      await sleep(500);
      continue;
    }

    await prisma.product.update({
      where: { id: card.id },
      data: { summary: JSON.stringify(summary), summaryHash: hash },
    });
    generated++;
    console.log(`[ok] ${card.name} — ${summary.gaps.length} gaps, ${summary.wedge.length} moves`);
    await sleep(700); // gentle on the model API
  }

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(
    `\nDone in ${secs}s — ${generated} generated, ${skipped} unchanged, ${failed} failed.`
  );
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
