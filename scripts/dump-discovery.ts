import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { getSegmentBySlug } from "../src/lib/segments";

// Taxonomy-discovery harvest: a broad, stratified sample of real reviews with NO
// keyword filter at all, so the needs taxonomy can be derived from MEANING in
// session instead of guessed up front. This is the input to the semantic
// classification work — read it, cluster the real jobs-to-be-done, then author a
// richer honest need list (data suggests, human approves). Read-only, one genre.
//
// Usage: DATABASE_URL=file:/opt/badcomment/data/prod.db tsx scripts/dump-discovery.ts <slug>

const SLUG = process.argv[2] ?? "language-learning";
const NEG_PER_APP = Number(process.env.DISCOVERY_NEG ?? 70);
const POS_PER_APP = Number(process.env.DISCOVERY_POS ?? 25);
const NEG_WINDOW = Number(process.env.DISCOVERY_NEG_WINDOW ?? 400);
const POS_WINDOW = Number(process.env.DISCOVERY_POS_WINDOW ?? 150);
const TEXT_MAX = 240;

type Sample = { stance: "neg" | "pos"; rating: number; title: string | null; text: string };

function trim(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > TEXT_MAX ? t.slice(0, TEXT_MAX - 1).trimEnd() + "…" : t;
}

// Evenly stride a most-recent-first list down to `n` items, so the sample spans
// the whole window instead of only the newest cluster (recency would bias the
// taxonomy toward whatever the apps changed last).
function stride<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = items.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * step)]);
  return out;
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
          reviews: {
            select: { rating: true, title: true, text: true },
            take: NEG_WINDOW,
            orderBy: { postedAt: "desc" },
          },
          positives: {
            select: { rating: true, title: true, text: true },
            take: POS_WINDOW,
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const out: { app: string; samples: Sample[] }[] = [];
  let total = 0;

  const clean = (
    rows: { rating: number; title: string | null; text: string }[],
    stance: "neg" | "pos",
    cap: number
  ): Sample[] => {
    const picked: Sample[] = [];
    for (const r of stride(rows, rows.length)) {
      const text = r.text.trim();
      if (text.length < 20) continue;
      const key = text.slice(0, 80).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ stance, rating: r.rating, title: r.title?.trim() || null, text: trim(text) });
    }
    return stride(picked, cap);
  };

  for (const p of products) {
    const negatives = p.listings.flatMap((l) => l.reviews);
    const positives = p.listings.flatMap((l) => l.positives);
    const samples = [...clean(negatives, "neg", NEG_PER_APP), ...clean(positives, "pos", POS_PER_APP)];
    out.push({ app: p.name, samples });
    total += samples.length;
  }

  writeFileSync("discovery.json", JSON.stringify({ slug: SLUG, total, apps: out }, null, 2));
  console.log(`wrote discovery.json — ${total} samples across ${products.length} apps`);
  console.log(`per app:`, JSON.stringify(Object.fromEntries(out.map((a) => [a.app, a.samples.length]))));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
