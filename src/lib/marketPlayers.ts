export type MarketPlayer = {
  appStoreId: string;
  name: string;
  developer: string;
  subtitle?: string;
  averageRating: number | null;
  ratingCount: number | null;
  iconUrl: string;
  screenshots: string[];
  screenshotsFetchedAt: string;
  screenshotSourceUrl: string;
  reviewHref?: string;
};

export type MarketKeyword = {
  term: string;
  sourceUrl: string;
  resultsFetchedAt: string;
  results: { appStoreId: string; ranking: number }[];
};

export type MarketSnapshot = {
  source: string;
  store: string;
  platform: string;
  collectedAt: string;
  leaderTerm: string;
  keywords: MarketKeyword[];
  apps: MarketPlayer[];
};

export type MarketMode = "search" | "leaders";

// Search order comes from Apple's Search API. The second view compares rating counts only
// within the broad query's sample, never implying a market-share estimate.
export function marketPlayerRows(data: MarketSnapshot, mode: MarketMode, term: string) {
  const query = data.keywords.find((keyword) => keyword.term === (mode === "leaders" ? data.leaderTerm : term));
  if (!query) return [];
  const byId = new Map(data.apps.map((app) => [app.appStoreId, app]));
  const rows = query.results.flatMap((result) => {
    const app = byId.get(result.appStoreId);
    return app ? [{ app, ranking: result.ranking }] : [];
  });
  return mode === "search"
    ? rows.sort((a, b) => a.ranking - b.ranking)
    : rows.sort((a, b) => (b.app.ratingCount ?? -1) - (a.app.ratingCount ?? -1) || a.ranking - b.ranking);
}

export function marketPlayerKeywords(data: MarketSnapshot, appStoreId: string) {
  return data.keywords.flatMap((keyword) => {
    const result = keyword.results.find((app) => app.appStoreId === appStoreId);
    return result ? [{ term: keyword.term, ranking: result.ranking }] : [];
  });
}
