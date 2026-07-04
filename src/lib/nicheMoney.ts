import market from "@/data/nicheMarket.json";

// Order niches by the money on the table — the same revenue estimate the
// dossier shows. The founder should meet the richest niches first.

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

// Revenue first; niches without an estimate sink below, ordered by review mass.
export function nicheMoneyRank(slug: string): number {
  const m = (market as unknown as Record<string, Market | null>)[slug];
  if (!m) return 0;
  const rev = parseUsd(m.revenue?.high);
  if (rev > 0) return rev;
  return (m.ratingsTotal ?? 0) / 1e9; // always below any real revenue estimate
}

export function byNicheMoney<T>(items: T[], slugOf: (x: T) => string): T[] {
  return [...items].sort((a, b) => nicheMoneyRank(slugOf(b)) - nicheMoneyRank(slugOf(a)));
}
