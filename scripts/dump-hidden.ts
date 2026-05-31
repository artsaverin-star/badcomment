import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { isBrandStorefront, isRewardFarm } from "../src/lib/cloneability";

// Dump compact con/pro samples for the still-YandexGPT (no opportunityType)
// products that getIdeaCards hides (storefront / reward-farm / cloneable=false),
// so Claude can re-author them in-session.
// Usage: tsx scripts/dump-hidden.ts [offset] [count]   (sorted by neg desc)

const WISH =
  /(wish|need|should|can'?t|cannot|no way|unable|missing|doesn'?t|lacks?|would be|if only|please add|add an option|hope they|не хвата|хотелось бы|нет возможност|было бы|не могу|добавьте|почему нельзя|отсутству|нельзя)/i;

function pickSamples(texts: string[], n: number, cap: number): string[] {
  const seen = new Set<string>();
  const clean = texts
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 20)
    .filter((t) => {
      const k = t.slice(0, 40).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const withSignal = clean.filter((t) => WISH.test(t));
  const rest = clean.filter((t) => !WISH.test(t)).sort((a, b) => b.length - a.length);
  return [...withSignal, ...rest].slice(0, n).map((t) => (t.length > cap ? t.slice(0, cap) : t));
}

async function run() {
  const offset = Number(process.argv[2] ?? 0);
  const count = Number(process.argv[3] ?? 1000);

  const products = await prisma.product.findMany({
    where: { summary: { not: null }, category: { not: null } },
    include: {
      listings: {
        select: {
          store: true,
          description: true,
          reviews: { select: { text: true } },
          positives: { select: { text: true } },
        },
      },
    },
  });

  type Row = {
    id: string;
    name: string;
    cat: string | null;
    neg: number;
    reason: string;
    wasCloneable: boolean | null;
    detailDesc: string | null;
    cons: string[];
    pros: string[];
  };
  const rows: Row[] = [];

  for (const p of products) {
    let s: { opportunityType?: string; cloneable?: boolean } | null = null;
    try {
      s = JSON.parse(p.summary as string);
    } catch {
      s = null;
    }
    if (s && s.opportunityType) continue; // already Claude-authored

    const detail =
      p.listings.find((l) => l.store === "google" && l.description) ??
      p.listings.find((l) => l.description) ??
      p.listings[0];
    const desc = detail?.description ?? null;
    const reason = isBrandStorefront(desc)
      ? "storefront"
      : isRewardFarm(desc)
        ? "rewardfarm"
        : s?.cloneable === false
          ? "clone=false"
          : "visible?";

    const negTexts = p.listings.flatMap((l) => l.reviews.map((r) => r.text));
    const posTexts = p.listings.flatMap((l) => l.positives.map((r) => r.text));

    rows.push({
      id: p.id,
      name: p.name,
      cat: p.category,
      neg: negTexts.length,
      reason,
      wasCloneable: s?.cloneable ?? null,
      detailDesc: desc ? desc.slice(0, 160) : null,
      cons: pickSamples(negTexts, 12, 200),
      pros: pickSamples(posTexts, 6, 140),
    });
  }

  rows.sort((a, b) => b.neg - a.neg);
  const byReason: Record<string, number> = {};
  for (const r of rows) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
  console.log(JSON.stringify({ total: rows.length, offset, count, byReason }));
  if (count === 0) {
    console.log(
      JSON.stringify(
        rows.map((r) => ({ id: r.id, name: r.name, cat: r.cat, neg: r.neg, reason: r.reason, wasCloneable: r.wasCloneable })),
        null,
        0
      )
    );
    return;
  }
  console.log(JSON.stringify(rows.slice(offset, offset + count), null, 0));
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
