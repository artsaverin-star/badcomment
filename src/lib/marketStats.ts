import type { FeedCard } from "./deck";
import type { Segment, PriceBand } from "./segments";
import type { OpportunityType } from "./summarize";

// Per-genre aggregate read off the live deck. Everything here is a real,
// observed quantity (install base, rating-weighted satisfaction, leader
// concentration, opportunity-type mix) — the *revenue* layer that turns these
// into money is an explicit, editable estimate computed client-side from the
// assumption sliders, never baked in here.
export type GenreStat = {
  slug: string;
  name: string;
  appCount: number;
  // Estimated installed base: real Google installs where present, else a
  // ratings×100 proxy (mirrors the deck ranking) so Apple-only apps still count.
  installBase: number;
  // Rating-count-weighted average star rating across the genre's apps (null if
  // none carry a rating). Dissatisfaction = 5 − avgRating.
  avgRating: number | null;
  ratingCount: number;
  // Dominant opportunity angle + the full mix, for the bubble color + tooltip.
  oppType: OpportunityType | null;
  oppCounts: Partial<Record<OpportunityType, number>>;
  // Biggest single app and its share of the genre's install base — how
  // concentrated (one giant) vs. fragmented (many mid apps) the genre is.
  leaderName: string | null;
  leaderShare: number;
  price: PriceBand;
};

export type MarketStats = {
  genres: GenreStat[];
  totals: {
    apps: number;
    genres: number;
    installBase: number;
    ratingCount: number;
  };
};

// Same popularity proxy the deck ranking uses: real installs, else ratings×100.
function popProxy(c: FeedCard): number {
  if (c.installs != null) return c.installs;
  if (c.ratingCount) return c.ratingCount * 100;
  return 0;
}

export function computeMarketStats(deck: FeedCard[], segments: Segment[]): MarketStats {
  const byId = new Map(deck.map((c) => [c.id, c]));

  const genres = segments.map((seg): GenreStat => {
    const members = seg.appIds
      .map((id) => byId.get(id))
      .filter((c): c is FeedCard => c != null);

    let installBase = 0;
    let ratingCount = 0;
    let ratingWeight = 0;
    let ratingWeighted = 0;
    let leaderName: string | null = null;
    let leaderPop = 0;
    const oppCounts: Partial<Record<OpportunityType, number>> = {};

    for (const c of members) {
      const pop = popProxy(c);
      installBase += pop;
      if (pop > leaderPop) {
        leaderPop = pop;
        leaderName = c.name;
      }
      if (c.ratingCount) ratingCount += c.ratingCount;
      if (c.avgRating != null) {
        const w = c.ratingCount ?? 1;
        ratingWeight += w;
        ratingWeighted += c.avgRating * w;
      }
      const ot = c.summary?.opportunityType;
      if (ot) oppCounts[ot] = (oppCounts[ot] ?? 0) + 1;
    }

    const oppType =
      (Object.entries(oppCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | OpportunityType
        | undefined) ?? null;

    return {
      slug: seg.slug,
      name: seg.name,
      appCount: members.length,
      installBase,
      avgRating: ratingWeight ? ratingWeighted / ratingWeight : null,
      ratingCount,
      oppType,
      oppCounts,
      leaderName,
      leaderShare: installBase ? leaderPop / installBase : 0,
      price: seg.price,
    };
  });

  return {
    genres,
    totals: {
      apps: genres.reduce((s, g) => s + g.appCount, 0),
      genres: genres.length,
      installBase: genres.reduce((s, g) => s + g.installBase, 0),
      ratingCount: genres.reduce((s, g) => s + g.ratingCount, 0),
    },
  };
}
