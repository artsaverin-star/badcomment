import { compareNames } from "../../content/text";

// The niche list's orders (spec 11 §4.2.1, D3, D6). Client-safe: the niche list sorts on the
// client, the page renders the same order on the server (`?sort=`), and the JSON-LD ItemList
// follows the default (`review`).
//   review   rank ascending: the raw data order (every file is sorted by realScore descending,
//            ties keep data order), so the rank never changes when the list is re-sorted
//   store    storeAvg descending (missing last), then rank
//   ratings  App Store rating count descending, then rank («Популярные»)
//   name     title (localizedStandardCompare), then rank
// Always sorts a copy: the raw data order feeds the app URL slugs and the ranks.

/** The four orders of the niche list (chips «По отзывам · По App Store · Популярные · По названию»). */
export type RatingSort = "review" | "store" | "ratings" | "name";

export const RATING_SORTS: readonly RatingSort[] = ["review", "store", "ratings", "name"];

type Sortable = {
  title: string;
  realScore: number | null;
  storeAvg: number | null;
  /** Raw data index + 1 (sitedata RatingAppEntry.rank). Without it (legacy callers) ties go by title. */
  rank?: number;
  /** App Store rating count. */
  ratings?: number;
};

export function sortRatedApps<A extends Sortable>(apps: readonly A[], sort: RatingSort, locale: string): A[] {
  const byRank = (a: A, b: A) => (a.rank !== undefined && b.rank !== undefined ? a.rank - b.rank : compareNames(a.title, b.title, locale));
  return [...apps].sort((a, b) => {
    switch (sort) {
      case "review":
        if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
        if (a.realScore !== b.realScore) return (b.realScore ?? -1) - (a.realScore ?? -1);
        return compareNames(a.title, b.title, locale);
      case "store":
        if (a.storeAvg !== b.storeAvg) return (b.storeAvg ?? -1) - (a.storeAvg ?? -1);
        return byRank(a, b);
      case "ratings":
        if ((a.ratings ?? 0) !== (b.ratings ?? 0)) return (b.ratings ?? 0) - (a.ratings ?? 0);
        return byRank(a, b);
      case "name":
        return compareNames(a.title, b.title, locale) || byRank(a, b);
    }
  });
}
