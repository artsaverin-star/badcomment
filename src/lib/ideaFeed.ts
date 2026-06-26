import { listIdeas } from "./ideas";
import { isActiveCategory } from "./categoryVisibility";
import { ideaContentEn } from "./regenCards";
import { getCategoryBySlug } from "./researchCategories";
import { deepTg } from "./typo";
import feedOrder from "../data/ideaFeedOrder.json";
import type { Locale } from "./i18n";

// Curated best-first order (slug -> rank). Ideas not listed fall to the tail.
const FEED_RANK = new Map((feedOrder as string[]).map((slug, i) => [slug, i]));

// The idea feed — the core "Duolingo for app ideas" surface. Browsing previews
// (niche, title, one-liner, demand, one real quote) is free and unlimited; the
// DEPTH (the gap, what to build, features, monetization, more quotes) is the paid
// payload — included only for owners, plus a small free taste for everyone else.
// No depth is ever sent to a non-owner beyond the taste, so paid content can't leak.

export type FeedQuote = { text: string; app: string; rating: number };
export type FeedDepth = {
  gap: string;
  pitch: string;
  features: string[];
  monetization: string;
  quotes: FeedQuote[];
};
export type FeedIdea = {
  slug: string;
  category: string;
  categoryName: string;
  title: string;
  oneLiner: string;
  demand: number;
  quote: FeedQuote | null;
  depth: FeedDepth | null; // null = locked (non-owner, past the free taste)
};

// How many ideas a non-owner can open in full before the depth is paywalled.
// 0 — browsing previews is free, but opening ANY breakdown requires access.
export const FEED_FREE_DEPTH = 0;

function quoteOf(q?: { quote: string; app: string; rating: number }): FeedQuote | null {
  if (!q || !q.quote) return null;
  return { text: q.quote, app: q.app, rating: q.rating };
}

// Stable "idea of the day" index from the date — no Math.random so it's the same
// for everyone all day, and rotates daily.
function dailyIndex(len: number): number {
  if (len <= 0) return 0;
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % len;
}

export function buildFeed(locale: Locale, owner: boolean): { items: FeedIdea[]; dailySlug: string | null } {
  const ru = locale !== "en";
  // Pool = every live (active) category — the whole catalog is now cleaned to the
  // product-mechanism standard. Premium niches keep their curated best-first order
  // (ideaFeedOrder.json); everything else tails, sorted by demand (observations).
  const pool = listIdeas()
    .filter((i) => isActiveCategory(i.category))
    .sort((a, b) => {
      const ra = FEED_RANK.get(a.slug) ?? 9999;
      const rb = FEED_RANK.get(b.slug) ?? 9999;
      if (ra !== rb) return ra - rb;
      return (b.stats?.observations ?? 0) - (a.stats?.observations ?? 0);
    });

  // Localized category name from the canonical source (the EN overlay's
  // categoryName is unreliable — some entries kept the Russian label).
  const nameCache = new Map<string, string>();
  const catName = (slug: string, fallback: string) => {
    if (!nameCache.has(slug)) nameCache.set(slug, getCategoryBySlug(slug, locale)?.name ?? fallback);
    return nameCache.get(slug)!;
  };

  const items: FeedIdea[] = pool.map((i, idx) => {
    const en = ru ? null : ideaContentEn(i.slug, locale);
    const showDepth = owner || idx < FEED_FREE_DEPTH;
    return {
      slug: i.slug,
      category: i.category,
      categoryName: catName(i.category, i.categoryName),
      title: en?.title ?? i.title,
      oneLiner: en?.oneLiner ?? i.oneLiner,
      demand: i.stats?.observations ?? 0,
      quote: quoteOf(i.reviewGrid?.[0]),
      depth: showDepth
        ? {
            gap: en?.gap ?? i.gap,
            pitch: en?.pitch ?? i.idea?.pitch ?? "",
            features: en?.features ?? i.idea?.features ?? [],
            monetization: en?.monetization ?? i.idea?.monetization ?? "",
            quotes: (i.reviewGrid ?? []).slice(0, 5).map((q) => ({ text: q.quote, app: q.app, rating: q.rating })),
          }
        : null,
    };
  });

  const dailySlug = items.length ? items[dailyIndex(items.length)].slug : null;
  // Typograf the prose (titles, one-liners, breakdowns) so short prepositions
  // get a non-breaking space — no "висячие предлоги" at line ends.
  return { items: deepTg(items), dailySlug };
}
