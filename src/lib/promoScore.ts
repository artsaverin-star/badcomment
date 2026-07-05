import { RATING_BY_SLUG } from "@/data/peoplesRating";
import market from "@/data/nicheMarket.json";

// «Пробиваемость»: how realistic it is for a new app to get seen in this
// niche. Composed only from data the site already shows: how much of the
// shelf the top three hold, how much of the ranking is gamed, how many
// genuinely strong apps guard it, and how big the searching crowd is.

type RApp = { ratings?: number; realScore?: number };
type RFile = { apps: RApp[]; count: number; inflated: number };

export type PromoParts = {
  score: number; // 0-100, higher = easier to break in
  top3Share: number; // 0-100, % of ratings held by the top three
  inflatedShare: number; // 0-100, % of ranked apps with a gamed star
  strongCount: number; // apps with realScore >= 70
  demandMass: number; // ratingsTotal, people who rate this kind of app
};

// Demand normalisation needs the whole catalog: log-scale between the
// smallest and biggest niche, same trick as the idea-demand axis.
const massBySlug: Record<string, number> = {};
for (const [slug, m] of Object.entries(market as Record<string, { ratingsTotal?: number } | null>)) {
  massBySlug[slug] = m?.ratingsTotal ?? 0;
}
const logs = Object.values(massBySlug).filter((v) => v > 0).map((v) => Math.log10(v));
const lo = Math.min(...logs);
const hi = Math.max(...logs);
const demandNorm = (v: number) => {
  if (v <= 0) return 0.5; // unknown mass reads as neutral, not empty
  const t = hi > lo ? (Math.log10(v) - lo) / (hi - lo) : 0.5;
  return Math.min(1, Math.max(0, t));
};

export function promoScore(slug: string): PromoParts | null {
  const r = (RATING_BY_SLUG as Record<string, RFile>)[slug];
  if (!r || !r.apps?.length) return null;
  const totalRatings = r.apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const top3 = [...r.apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).slice(0, 3)
    .reduce((s, a) => s + (a.ratings || 0), 0);
  const top3Share = totalRatings > 0 ? top3 / totalRatings : 0.5;
  const inflatedShare = r.count > 0 ? r.inflated / r.count : 0;
  const strongCount = r.apps.filter((a) => (a.realScore ?? 0) >= 70).length;
  const strongShare = r.apps.length > 0 ? strongCount / r.apps.length : 0;
  const mass = massBySlug[slug] ?? totalRatings;
  // Brand moat: the share of ratings sitting in mega-apps (1M+ ratings).
  // In brand niches (marketplaces, delivery, messengers) people install the
  // name they know, not what store search shows — the shelf being "spread"
  // there is an illusion of openness.
  const megaShare = totalRatings > 0
    ? r.apps.filter((a) => (a.ratings || 0) >= 1e6).reduce((s, a) => s + (a.ratings || 0), 0) / totalRatings
    : 0;

  // Free shelf + few strong guards + honest ranking + reachable crowd - brand moat.
  const score = Math.round(
    100 * (0.3 * (1 - top3Share) + 0.2 * (1 - strongShare) + 0.15 * (1 - inflatedShare) + 0.15 * demandNorm(mass) + 0.2 * (1 - megaShare)),
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    top3Share: Math.round(top3Share * 100),
    inflatedShare: Math.round(inflatedShare * 100),
    strongCount,
    demandMass: mass,
  };
}
