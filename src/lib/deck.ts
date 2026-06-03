import { unstable_cache } from "next/cache";
import { getIdeaCards, type IdeaCard } from "./queries";
import type { IdeaSummary } from "./summarize";
import type { Locale } from "./i18n";

// Per-page size for the lazy feed (initial server render + each scroll fetch).
export const PAGE_SIZE = 24;

// The slice of an IdeaCard the feed UI actually renders. The full IdeaCard
// carries review samples, quotes, theme tallies, histograms and cloneability
// internals the LLM/summarizer needs but the card never displays; shipping all
// of that to the browser for hundreds of cards is what forced the old 60-card
// cap. We project down to display fields so the whole deck can stream in.
export type FeedCard = {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
  installs: number | null;
  ratingCount: number | null;
  avgRating: number | null;
  screenshots: string[];
  summary: IdeaSummary | null;
};

function toFeedCard(c: IdeaCard): FeedCard {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    category: c.category,
    installs: c.installs,
    ratingCount: c.ratingCount,
    avgRating: c.avgRating,
    screenshots: c.screenshots,
    summary: c.summary,
  };
}

// The whole ranked deck, trimmed and cached. Building it loads every
// summary-bearing app's reviews and runs the ranking math — too heavy to repeat
// on the force-dynamic homepage per request on the small prod box. unstable_cache
// keeps the computed deck in the Node server's memory across requests, so the
// expensive pass runs at most once per revalidate window; pagination then just
// slices the cached array. Keyed by locale (prose differs); scalars don't.
export async function getFullDeck(locale: Locale): Promise<FeedCard[]> {
  const cached = unstable_cache(
    async () => {
      const cards = await getIdeaCards(Number.MAX_SAFE_INTEGER, null, true, locale);
      return cards.map(toFeedCard);
    },
    ["full-deck", locale],
    { revalidate: 300, tags: ["deck"] },
  );
  return cached();
}

// Category / opportunity-type filtering over the cached deck. Cheap in-memory
// pass so the homepage tabs don't fragment the cache by query string.
export function filterDeck(
  deck: FeedCard[],
  cat: string | null,
  type: string | null,
): FeedCard[] {
  let f = deck;
  if (cat) f = f.filter((c) => c.category === cat);
  if (type) f = f.filter((c) => c.summary?.opportunityType === type);
  return f;
}
