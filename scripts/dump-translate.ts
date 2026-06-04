import "dotenv/config";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { getSegmentBySlug } from "../src/lib/segments";
import { taxonomyVersion } from "../src/lib/taxonomy";
import { TRANSLATION_VERSION, hasCyrillic } from "../src/lib/translate";

// Keyless RU-translation harvest, the same dump -> Claude -> apply loop as
// classification (no API key — Claude is you in another window). Dumps the
// reviews that can surface as evidence (a PAIN label at the current taxonomy
// version) and are NOT already Russian and NOT yet translated at the current
// version, as self-contained prompt files. Paste each into a fresh chat, save
// the JSON reply to translate/out/<same-name>.json, then run apply-translate.
//
// Idempotent: only rows whose translationVersion differs from the current one
// are dumped, so re-runs pick up the rest.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/dump-translate.ts <slug>

const SLUG = process.argv[2] ?? "language-learning";

const WINDOW = Number(process.env.TRANSLATE_WINDOW ?? 600); // newest reviews per app to consider (matches evidence cap)
const BATCH_SIZE = Number(process.env.TRANSLATE_BATCH ?? 40);
const IN_DIR = "translate/in";

type Row = { id: string; title: string | null; text: string };

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function hasPain(needsJson: string | null): boolean {
  try {
    const labels = JSON.parse(needsJson || "[]") as { stance?: string }[];
    return labels.some((l) => l.stance === "pain");
  } catch {
    return false;
  }
}

function promptFor(batch: Row[]): string {
  const reviews = batch.map((r) => ({ id: r.id, title: r.title, text: r.text }));
  return `You are translating real app-store reviews into natural, fluent Russian. Your output is consumed by a program — follow the schema exactly and output JSON only.

RULES:
1. Translate "title" and "text" into Russian. Keep the author's tone and register (casual stays casual, angry stays angry). Translate meaning, not word-for-word.
2. Keep it faithful: do not soften, sharpen, summarize, censor, or add anything. Preserve emoji and product/feature names as written.
3. If "title" is null, return null for "titleRu". Never drop a review.
4. Output ONE JSON object only. No prose, no markdown fences.

OUTPUT SCHEMA:
{"version":"${TRANSLATION_VERSION}","reviews":[{"id":"<review id>","titleRu":"<ru title or null>","textRu":"<ru text>"}]}

Every review id below MUST appear exactly once in "reviews".

REVIEWS:
${JSON.stringify(reviews, null, 1)}
`;
}

async function main() {
  const segment = getSegmentBySlug(SLUG, "en");
  if (!segment) {
    console.error(`no segment for slug "${SLUG}"`);
    process.exit(1);
  }
  const version = taxonomyVersion(SLUG);

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: {
      listings: {
        select: {
          reviews: {
            where: {
              needsVersion: version,
              OR: [{ translationVersion: null }, { translationVersion: { not: TRANSLATION_VERSION } }],
            },
            select: { id: true, title: true, text: true, needs: true },
            take: WINDOW,
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });

  const rows: Row[] = [];
  for (const p of products) {
    for (const r of p.listings.flatMap((l) => l.reviews)) {
      const text = clean(r.text);
      if (text.length < 12) continue; // too short to be useful evidence
      if (hasCyrillic(text)) continue; // already Russian — no translation needed
      if (!hasPain(r.needs)) continue; // only pain-labeled reviews can surface as evidence
      rows.push({ id: r.id, title: r.title?.trim() || null, text });
    }
  }

  rmSync(IN_DIR, { recursive: true, force: true });
  mkdirSync(IN_DIR, { recursive: true });

  const batches: { file: string; count: number }[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const file = `${SLUG}-${String(batches.length + 1).padStart(3, "0")}.txt`;
    writeFileSync(`${IN_DIR}/${file}`, promptFor(batch));
    batches.push({ file, count: batch.length });
  }

  writeFileSync(
    "translate/manifest.json",
    JSON.stringify({ slug: SLUG, version: TRANSLATION_VERSION, totalReviews: rows.length, batches }, null, 2),
  );

  console.log(`wrote ${batches.length} prompt batches (${rows.length} reviews) to ${IN_DIR}/`);
  console.log(`translation version: ${TRANSLATION_VERSION}`);
  console.log(`next: paste each translate/in/*.txt into a fresh Claude chat,`);
  console.log(`save the JSON reply to translate/out/<same-name>.json, then run apply-translate.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
