import "dotenv/config";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { validKeys, TAXONOMY_VERSION } from "../src/lib/taxonomy";

// Applies the classification JSON produced by Claude/Sonnet (one file per dumped
// batch, saved to classify/out/) back onto Review.needs. This is the enforcement
// point of the "don't bullshit" contract: every label is validated before it's
// stored, so the model can never invent a category, flip a stance, or assert a
// need it can't quote.
//
//  - key must be in the taxonomy (else dropped, counted as rejected)
//  - stance must be pain | praise | neutral
//  - trigger must be a non-empty span that appears VERBATIM in the review text
//    (checked against the DB, not trusted — a quote the model can't actually
//    point to in the review is dropped)
//  - confidence clamped to 0..1
//
// An empty surviving label set is stored as "[]" (honest abstention) and still
// stamps needsVersion, so the row counts as classified and won't be re-dumped.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/apply-classify.ts <slug>

const SLUG = process.argv[2] ?? "language-learning";
const OUT_DIR = "classify/out";
const STANCES = new Set(["pain", "praise", "neutral"]);

type RawLabel = { key?: string; stance?: string; confidence?: number; trigger?: string };
type RawReview = { id?: string; labels?: RawLabel[] };
type Clean = { key: string; stance: string; confidence: number; trigger: string };

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function main() {
  const keys = validKeys(SLUG);
  if (keys.size === 0) {
    console.error(`no taxonomy for slug "${SLUG}"`);
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) {
    console.error(`no ${OUT_DIR}/ directory — save the chat replies there first`);
    process.exit(1);
  }

  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"));
  let applied = 0;
  let abstained = 0;
  let labelsKept = 0;
  let labelsRejected = 0;
  let triggerMismatch = 0;
  let idsNotFound = 0;
  let badFiles = 0;
  const rejectedKeys = new Map<string, number>();

  for (const file of files) {
    let parsed: { version?: string; reviews?: RawReview[] };
    try {
      parsed = JSON.parse(stripFences(readFileSync(`${OUT_DIR}/${file}`, "utf8")));
    } catch {
      console.error(`! ${file}: not valid JSON, skipped`);
      badFiles++;
      continue;
    }
    if (parsed.version && parsed.version !== TAXONOMY_VERSION) {
      console.error(`! ${file}: version "${parsed.version}" != "${TAXONOMY_VERSION}", skipped`);
      badFiles++;
      continue;
    }

    for (const rev of parsed.reviews ?? []) {
      if (!rev.id) continue;
      const review = await prisma.review.findUnique({ where: { id: rev.id }, select: { text: true } });
      if (!review) {
        idsNotFound++;
        continue;
      }

      const clean: Clean[] = [];
      for (const l of rev.labels ?? []) {
        const key = l.key?.trim() ?? "";
        const stance = l.stance?.trim() ?? "";
        const trigger = l.trigger?.trim() ?? "";
        if (!keys.has(key) || !STANCES.has(stance) || trigger.length === 0) {
          labelsRejected++;
          if (key && !keys.has(key)) rejectedKeys.set(key, (rejectedKeys.get(key) ?? 0) + 1);
          continue;
        }
        if (!review.text.includes(trigger)) {
          labelsRejected++;
          triggerMismatch++;
          continue;
        }
        const confidence = Math.max(0, Math.min(1, Number(l.confidence ?? 0)));
        clean.push({ key, stance, confidence, trigger });
        labelsKept++;
      }

      await prisma.review.update({
        where: { id: rev.id },
        data: { needs: JSON.stringify(clean), needsVersion: TAXONOMY_VERSION },
      });
      applied++;
      if (clean.length === 0) abstained++;
    }
  }

  console.log(`files: ${files.length} (${badFiles} bad)`);
  console.log(`reviews classified: ${applied} (of which ${abstained} abstained)`);
  console.log(`labels kept: ${labelsKept}, rejected: ${labelsRejected} (of which ${triggerMismatch} unquotable), ids not found: ${idsNotFound}`);
  if (rejectedKeys.size > 0) {
    console.log(`rejected unknown keys:`, JSON.stringify(Object.fromEntries(rejectedKeys)));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
