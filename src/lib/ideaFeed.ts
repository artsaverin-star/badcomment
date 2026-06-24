import { listIdeas } from "./ideas";
import { PREMIUM_NICHE_SET } from "./premiumNiches";
import { ideaContentEn } from "./regenCards";
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
export const FEED_FREE_DEPTH = 2;

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
  // Pool = the hand-finished premium niches only (their copy reads cleanly),
  // ordered by the curated best-first ranking in ideaFeedOrder.json.
  const pool = listIdeas()
    .filter((i) => PREMIUM_NICHE_SET.has(i.category))
    .sort((a, b) => (FEED_RANK.get(a.slug) ?? 9999) - (FEED_RANK.get(b.slug) ?? 9999));

  const items: FeedIdea[] = pool.map((i, idx) => {
    const en = ru ? null : ideaContentEn(i.slug, locale);
    const showDepth = owner || idx < FEED_FREE_DEPTH;
    return {
      slug: i.slug,
      category: i.category,
      categoryName: en?.categoryName ?? i.categoryName,
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
  return { items, dailySlug };
}
