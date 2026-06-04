import "dotenv/config";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { getSegmentBySlug } from "../src/lib/segments";
import { getTaxonomy, renderTaxonomy, taxonomyVersion } from "../src/lib/taxonomy";

// Keyless semantic-classification harvest. Dumps a stratified, id-tagged sample
// of NOT-YET-classified negative reviews and writes each batch as a SELF-CONTAINED
// prompt file: copy one file's contents into a fresh Claude/Sonnet chat, paste
// the JSON it returns into classify/out/<same-name>.json, then run apply-classify.
//
// This is the same dump -> Claude -> apply loop as summaries, but Claude is you
// in another window — no API key needed. Idempotent: only rows whose needsVersion
// differs from the current taxonomy version are dumped, so re-runs pick up the rest.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/dump-classify.ts <slug>

const SLUG = process.argv[2] ?? "language-learning";

const NEG_PER_APP = Number(process.env.CLASSIFY_PER_APP ?? 60);
const NEG_WINDOW = Number(process.env.CLASSIFY_WINDOW ?? 600);
const BATCH_SIZE = Number(process.env.CLASSIFY_BATCH ?? 40);
const TEXT_MAX = 600;
const IN_DIR = "classify/in";

type Row = { id: string; app: string; rating: number; title: string | null; text: string };

function stride<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * step)]);
  return out;
}

function trim(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > TEXT_MAX ? t.slice(0, TEXT_MAX - 1).trimEnd() + "…" : t;
}

function promptFor(batch: Row[], genre: string, version: string): string {
  const reviews = batch.map((r) => ({ id: r.id, app: r.app, rating: r.rating, title: r.title, text: r.text }));
  return `You are classifying real app-store reviews of ${genre.toUpperCase()} against a FIXED taxonomy of user needs. Your output is consumed by a program — follow the schema exactly and output JSON only.

TAXONOMY (you may ONLY use these keys):
${renderTaxonomy(SLUG)}

RULES — quality over coverage:
1. Use ONLY keys from the taxonomy above. Never invent a key. A label may be a bare need (e.g. "speak") or a fork (e.g. "speak.recognition"); prefer the most specific fork that genuinely fits, otherwise the bare need.
2. A review may match several needs — list each. If NOTHING in the taxonomy truly fits, return an empty "labels" array for that review. Do NOT force a match. Abstaining is correct for off-topic, generic ("good", "ok", "love it"), or unrelated reviews.
3. For each label give "stance": "pain" (a complaint / unmet need), "praise" (the app does this well), or "neutral".
4. For each label give "trigger": a SHORT span copied VERBATIM from the review text that justifies the label. Copy exact characters — do not paraphrase, summarize, translate, or fix spelling. If you cannot quote a span, do not emit the label.
5. Give "confidence" 0.0–1.0. Be conservative; if unsure, lower it or abstain.
6. Judge each review in its own language (English or Russian); keep the trigger in that language.
7. IGNORE and never label political, religious, or ideological ("woke") complaints — out of scope.
8. Output ONE JSON object only. No prose, no markdown fences.

OUTPUT SCHEMA:
{"version":"${version}","reviews":[{"id":"<review id>","labels":[{"key":"speak.recognition","stance":"pain","confidence":0.9,"trigger":"it never understands me"}]}]}

Every review id below MUST appear exactly once in "reviews", even when its "labels" is empty.

REVIEWS:
${JSON.stringify(reviews, null, 1)}
`;
}

async function main() {
  const segment = getSegmentBySlug(SLUG, "en");
  const tax = getTaxonomy(SLUG);
  if (!segment || !tax) {
    console.error(`no segment/taxonomy for slug "${SLUG}"`);
    process.exit(1);
  }

  const version = taxonomyVersion(SLUG);
  const appIds = segment.appIds;
  const products = await prisma.product.findMany({
    where: { id: { in: appIds } },
    select: {
      name: true,
      listings: {
        select: {
          reviews: {
            where: { OR: [{ needsVersion: null }, { needsVersion: { not: version } }] },
            select: { id: true, rating: true, title: true, text: true },
            take: NEG_WINDOW,
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });

  const rows: Row[] = [];
  for (const p of products) {
    const reviews = p.listings.flatMap((l) => l.reviews);
    const usable = reviews.filter((r) => r.text.trim().length >= 20);
    for (const r of stride(usable, NEG_PER_APP)) {
      rows.push({ id: r.id, app: p.name, rating: r.rating, title: r.title?.trim() || null, text: trim(r.text) });
    }
  }

  rmSync(IN_DIR, { recursive: true, force: true });
  mkdirSync(IN_DIR, { recursive: true });

  const batches: { file: string; count: number }[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const file = `${SLUG}-${String(batches.length + 1).padStart(3, "0")}.txt`;
    writeFileSync(`${IN_DIR}/${file}`, promptFor(batch, tax.en, version));
    batches.push({ file, count: batch.length });
  }

  writeFileSync(
    "classify/manifest.json",
    JSON.stringify({ slug: SLUG, version, totalReviews: rows.length, batches }, null, 2)
  );

  console.log(`wrote ${batches.length} prompt batches (${rows.length} reviews) to ${IN_DIR}/`);
  console.log(`taxonomy version: ${version}`);
  console.log(`next: paste each classify/in/*.txt into a fresh Claude/Sonnet chat,`);
  console.log(`save the JSON reply to classify/out/<same-name>.json, then run apply-classify.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
