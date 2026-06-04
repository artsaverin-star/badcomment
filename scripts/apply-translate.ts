import "dotenv/config";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { TRANSLATION_VERSION } from "../src/lib/translate";

// Applies the RU translations produced by Claude (one file per dumped batch,
// saved to translate/out/) onto Review.textRu / titleRu, stamping
// translationVersion so the row won't be re-dumped. Validation is light — a
// translation can't be checked against the source the way a verbatim trigger
// can — but an empty/blank textRu is rejected and the original is left intact.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/apply-translate.ts

const OUT_DIR = "translate/out";

type RawReview = { id?: string; titleRu?: string | null; textRu?: string | null };

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`no ${OUT_DIR}/ directory — save the chat replies there first`);
    process.exit(1);
  }

  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"));
  let applied = 0;
  let skippedBlank = 0;
  let idsNotFound = 0;
  let badFiles = 0;

  for (const file of files) {
    let parsed: { version?: string; reviews?: RawReview[] };
    try {
      parsed = JSON.parse(stripFences(readFileSync(`${OUT_DIR}/${file}`, "utf8")));
    } catch {
      console.error(`! ${file}: not valid JSON, skipped`);
      badFiles++;
      continue;
    }
    if (parsed.version && parsed.version !== TRANSLATION_VERSION) {
      console.error(`! ${file}: version "${parsed.version}" != "${TRANSLATION_VERSION}", skipped`);
      badFiles++;
      continue;
    }

    for (const rev of parsed.reviews ?? []) {
      if (!rev.id) continue;
      const textRu = rev.textRu?.trim() ?? "";
      if (textRu.length === 0) {
        skippedBlank++;
        continue;
      }
      const titleRu = rev.titleRu?.trim() || null;
      const res = await prisma.review.updateMany({
        where: { id: rev.id },
        data: { textRu, titleRu, translationVersion: TRANSLATION_VERSION },
      });
      if (res.count === 0) idsNotFound++;
      else applied++;
    }
  }

  console.log(`files: ${files.length} (${badFiles} bad)`);
  console.log(`translations applied: ${applied}, blank skipped: ${skippedBlank}, ids not found: ${idsNotFound}`);
  console.log(`translation version: ${TRANSLATION_VERSION}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
