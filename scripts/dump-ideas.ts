import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { getSegmentBySlug } from "../src/lib/segments";

// Harvest candidate "idea" reviews for a genre: individual reviews where a user
// asks for something the app (or the genre) doesn't do. These feed the white-space
// "voices" tier — existence proofs of unmet needs, curated in-session afterwards.
//
// This is a WIDE net on purpose: the markers below drag in plenty of noise
// ("wish I could give it 0 stars", "please refund me"). The script just narrows
// ~hundreds-of-thousands of reviews to a few hundred candidates; the real
// curation (drop junk, keep genuine product ideas, pick the best quote) happens
// when Claude reads ideas.json in-session. Read-only, one genre at a time.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db tsx scripts/dump-ideas.ts <slug>

const SLUG = process.argv[2] ?? "language-learning";
const REVIEWS_PER_APP = Number(process.env.IDEAS_REVIEWS ?? 800);
const POSITIVES_PER_APP = Number(process.env.IDEAS_POSITIVES ?? 400);
const PER_APP_CAP = Number(process.env.IDEAS_PER_APP_CAP ?? 25);
const QUOTE_MAX = 300;

// Wish / absence / request phrasing, EN + RU. Lowercased substring match.
const MARKERS = [
  // EN — wish / desire
  "i wish", "wish there was", "wish it had", "wish they", "would love", "would be great",
  "would be nice", "would be amazing", "would be perfect", "if only", "i hope they add",
  // EN — absence / request
  "there's no", "there is no", "no option to", "no way to", "doesn't let", "does not let",
  "doesn't have", "does not have", "please add", "should add", "should be able", "needs a ",
  "needs an ", "missing the", "feature request", "wish list", "i'd love if", "would pay for",
  // RU — wish / desire
  "хотелось бы", "хочу чтобы", "хочется чтобы", "хотелось чтобы", "было бы здорово",
  "было бы удобно", "было бы классно", "мечтаю", "не помешало бы", "если бы можно",
  // RU — absence / request
  "жаль что нет", "жаль, что нет", "не хватает", "нет возможности", "не предусмотрено",
  "почему нельзя", "почему нет", "добавьте", "добавили бы", "сделайте", "нельзя ли",
  "хотелось бы видеть",
];

type Cand = { app: string; source: "neg" | "pos"; marker: string; quote: string };

function trimQuote(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > QUOTE_MAX ? t.slice(0, QUOTE_MAX - 1).trimEnd() + "…" : t;
}

function firstMarker(lower: string): string | null {
  for (const m of MARKERS) if (lower.includes(m)) return m;
  return null;
}

async function main() {
  const segment = getSegmentBySlug(SLUG, "en");
  if (!segment) {
    console.error(`no segment for slug "${SLUG}"`);
    process.exit(1);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: {
      name: true,
      listings: {
        select: {
          reviews: { select: { text: true }, take: REVIEWS_PER_APP, orderBy: { postedAt: "desc" } },
          positives: { select: { text: true }, take: POSITIVES_PER_APP },
        },
      },
    },
  });

  const out: Cand[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  for (const p of products) {
    const negatives = p.listings.flatMap((l) => l.reviews);
    const positives = p.listings.flatMap((l) => l.positives);
    let perApp = 0;

    const take = (text: string, source: "neg" | "pos") => {
      if (perApp >= PER_APP_CAP) return;
      scanned++;
      const trimmed = text.trim();
      if (trimmed.length < 25) return; // too short to carry an idea
      const marker = firstMarker(trimmed.toLowerCase());
      if (!marker) return;
      const key = trimmed.slice(0, 80).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ app: p.name, source, marker, quote: trimQuote(trimmed) });
      perApp++;
    };

    for (const r of negatives) take(r.text, "neg");
    for (const r of positives) take(r.text, "pos");
  }

  writeFileSync("ideas.json", JSON.stringify({ slug: SLUG, count: out.length, candidates: out }, null, 2));

  const byApp: Record<string, number> = {};
  for (const c of out) byApp[c.app] = (byApp[c.app] ?? 0) + 1;
  console.log(`scanned ${scanned} reviews across ${products.length} apps`);
  console.log(`wrote ideas.json — ${out.length} candidates`);
  console.log(`per app:`, JSON.stringify(byApp));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
