import market from "@/data/nicheMarket.json";
import ideaScores from "@/data/ideaScores.json";

// Order niches by money a solo founder can actually reach: the revenue on the
// table (log-compressed so billions don't drown everything) times how solo-
// buildable the niche's ideas are on average. Streaming-scale markets with
// no solo angle sink; scanner/habit/AI-wrapper niches with real money rise.

type Market = {
  ratingsTotal?: number;
  installs?: { totalMax?: number } | null;
  revenue?: { high?: string } | null;
};

// "$38 млн" / "$1.2 млрд" / "$500K" -> dollars (for ordering only).
function parseUsd(s?: string): number {
  if (!s) return 0;
  const m = s.replace(",", ".").match(/([\d.]+)\s*(млрд|млн|K)?/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mul = m[2] === "млрд" ? 1e9 : m[2] === "млн" ? 1e6 : m[2] === "K" ? 1e3 : 1;
  return n * mul;
}

// Mean solo-buildability of the niche's ideas (the scoring pipeline's
// simplicity axis), 0..100.
const simplicityByNiche: Record<string, number> = (() => {
  const acc: Record<string, { s: number; n: number }> = {};
  for (const v of Object.values(ideaScores as Record<string, { category: string; simplicity: number }>)) {
    const a = (acc[v.category] ??= { s: 0, n: 0 });
    a.s += v.simplicity;
    a.n++;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, a.s / a.n]));
})();

export function nicheMoneyRank(slug: string): number {
  const m = (market as unknown as Record<string, Market | null>)[slug];
  const rev = parseUsd(m?.revenue?.high);
  // No revenue estimate yet (installs not harvested) reads as "unknown", not
  // "empty" — a neutral ~$100M log keeps the niche ranked by buildability.
  const logRev = rev > 0 ? Math.log10(rev) : 8;
  const simp = simplicityByNiche[slug] ?? 50;
  return logRev * simp;
}

export function byNicheMoney<T>(items: T[], slugOf: (x: T) => string): T[] {
  return [...items].sort((a, b) => nicheMoneyRank(slugOf(b)) - nicheMoneyRank(slugOf(a)));
}
