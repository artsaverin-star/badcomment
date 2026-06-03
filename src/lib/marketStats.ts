import type { FeedCard } from "./deck";
import type { Segment, PriceBand } from "./segments";
import type { OpportunityType } from "./summarize";

// One app inside a genre, projected down to what the drill-down list needs.
// The deepest nesting level on /market: tap through to its full idea card.
export type GenreMember = {
  id: string;
  name: string;
  icon: string | null;
  tagline: string;
  oppType: OpportunityType | null;
  buildability: number | null;
};

// Everything /market needs to render a genre as a self-contained "opportunity
// brief" answering the five launch questions, glued to its authored prose:
//   1. Is there a market?      -> installBase + ratingCount
//   2. Is it taken?            -> appCount + leaderShare (concentration)
//   3. Where's the gap?        -> oppType mix + authored problems + mined gaps/wedge
//   4. Hard to build?          -> avg buildability
//   5. How do they earn?       -> authored pricing + price band
// Quant is read off the live deck; prose is the hand-authored segment copy.
export type GenreStat = {
  slug: string;
  name: string;
  appCount: number;
  // Estimated installed base: real Google installs where present, else a
  // ratings×100 proxy (mirrors the deck ranking) so Apple-only apps still count.
  installBase: number;
  avgRating: number | null;
  ratingCount: number;
  oppType: OpportunityType | null;
  oppCounts: Partial<Record<OpportunityType, number>>;
  // Biggest app's share of the genre's install base: high = one giant dominates
  // (taken), low = fragmented (room to enter).
  leaderName: string | null;
  leaderShare: number;
  // Average authored buildability (1-5) across apps that carry a score; null if
  // none. Lower = harder for a small team to rebuild a real rival.
  buildability: number | null;
  price: PriceBand;
  // Authored, locale-resolved genre prose.
  pricing: string;
  audience: string;
  problems: string[];
  // Real, app-specific signal mined from the genre's idea cards (already
  // banal-filtered upstream): what users hate, and concrete moves to win.
  gapTitles: string[];
  wedge: string[];
  icons: string[];
  members: GenreMember[];
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

function popProxy(c: FeedCard): number {
  if (c.installs != null) return c.installs;
  if (c.ratingCount) return c.ratingCount * 100;
  return 0;
}

function dedupeCap(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= cap) break;
  }
  return out;
}

export function computeMarketStats(deck: FeedCard[], segments: Segment[]): MarketStats {
  const byId = new Map(deck.map((c) => [c.id, c]));

  const genres = segments.map((seg): GenreStat => {
    const members = seg.appIds
      .map((id) => byId.get(id))
      .filter((c): c is FeedCard => c != null)
      .sort((a, b) => popProxy(b) - popProxy(a));

    let installBase = 0;
    let ratingCount = 0;
    let ratingWeight = 0;
    let ratingWeighted = 0;
    let leaderName: string | null = null;
    let leaderPop = 0;
    let buildSum = 0;
    let buildN = 0;
    const oppCounts: Partial<Record<OpportunityType, number>> = {};
    const gaps: string[] = [];
    const wedge: string[] = [];

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
      if (typeof c.summary?.buildability === "number") {
        buildSum += c.summary.buildability;
        buildN += 1;
      }
      for (const g of c.summary?.gaps ?? []) if (g.title) gaps.push(g.title);
      for (const w of c.summary?.wedge ?? []) wedge.push(w);
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
      buildability: buildN ? buildSum / buildN : null,
      price: seg.price,
      pricing: seg.pricing,
      audience: seg.audience,
      problems: seg.problems,
      gapTitles: dedupeCap(gaps, 10),
      wedge: dedupeCap(wedge, 8),
      icons: members.filter((c) => c.icon).slice(0, 5).map((c) => c.icon as string),
      members: members.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        tagline: c.summary?.tagline ?? "",
        oppType: c.summary?.opportunityType ?? null,
        buildability: typeof c.summary?.buildability === "number" ? c.summary.buildability : null,
      })),
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
