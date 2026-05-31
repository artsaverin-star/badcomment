import gplay from "google-play-scraper";
import appStore from "app-store-scraper";

export type Store = "google" | "apple";

export type RawReview = {
  externalId: string;
  author: string | null;
  rating: number;
  title: string | null;
  text: string;
  version: string | null;
  postedAt: Date | null;
};

export type AppMetrics = {
  score: number | null;
  ratingCount: number | null;
  installs: number | null;
  histogram: Record<string, number> | null;
  free: boolean | null;
  offersIAP: boolean | null;
  sizeBytes: number | null;
  description: string | null;
  screenshots: string[] | null;
  storeUpdatedAt: Date | null;
  releasedAt: Date | null;
};

// Pull a clean string[] of screenshot URLs from a raw store app response.
function toScreenshots(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const urls = v.filter((s): s is string => typeof s === "string" && s.length > 0);
  return urls.length ? urls : null;
}

export type AppMeta = {
  title: string;
  icon: string | null;
  developer: string | null;
  metrics: AppMetrics;
};

function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v); // epoch ms (google updated)
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

// A store listing as returned by search / top-list endpoints.
export type StoreListing = {
  store: Store;
  storeAppId: string;
  title: string;
  icon: string | null;
  developer: string | null;
};

export async function fetchAppMeta(
  store: Store,
  appId: string,
  country: string
): Promise<AppMeta> {
  if (store === "google") {
    const app: Record<string, unknown> = await gplay.app({ appId, country });
    return {
      title: String(app.title ?? ""),
      icon: (app.icon as string) ?? null,
      developer: (app.developer as string) ?? null,
      metrics: {
        score: typeof app.score === "number" ? app.score : null,
        ratingCount: toInt(app.ratings),
        installs: toInt(app.minInstalls),
        histogram: (app.histogram as Record<string, number>) ?? null,
        free: typeof app.free === "boolean" ? app.free : null,
        offersIAP: typeof app.offersIAP === "boolean" ? app.offersIAP : null,
        sizeBytes: null,
        description: (app.description as string) ?? null,
        screenshots: toScreenshots(app.screenshots),
        storeUpdatedAt: parseDate(app.updated),
        releasedAt: parseDate(app.released),
      },
    };
  }
  const app: Record<string, unknown> = await appStore.app({ id: appId, country });
  return {
    title: String(app.title ?? ""),
    icon: (app.icon as string) ?? null,
    developer: (app.developer as string) ?? null,
    metrics: {
      score: typeof app.score === "number" ? app.score : null,
      ratingCount: toInt(app.reviews),
      installs: null,
      histogram: null,
      free: typeof app.free === "boolean" ? app.free : null,
      offersIAP: null,
      sizeBytes: toInt(app.size),
      description: (app.description as string) ?? null,
      screenshots: toScreenshots(app.screenshots),
      storeUpdatedAt: parseDate(app.updated),
      releasedAt: parseDate(app.released),
    },
  };
}

// Top free apps in a store category. `category` is the store-specific enum
// value (string for google, numeric id for apple) from src/lib/categories.ts.
export async function topByCategory(
  store: Store,
  category: string | number,
  country: string,
  num = 10
): Promise<StoreListing[]> {
  if (store === "google") {
    const list = await gplay.list({
      category,
      collection: gplay.collection.TOP_FREE,
      num,
      country,
    });
    return list.map((a: Record<string, unknown>) => ({
      store: "google" as const,
      storeAppId: String(a.appId),
      title: String(a.title ?? ""),
      icon: (a.icon as string) ?? null,
      developer: (a.developer as string) ?? null,
    }));
  }
  const list = await appStore.list({
    category,
    collection: appStore.collection.TOP_FREE_IOS,
    num,
    country,
  });
  return list.map((a: Record<string, unknown>) => ({
    store: "apple" as const,
    storeAppId: String(a.id),
    title: String(a.title ?? ""),
    icon: (a.icon as string) ?? null,
    developer: (a.developer as string) ?? null,
  }));
}

// Search apps by name. Google Play's scraper search is currently broken
// (returns 0 results against live markup), so search is App Store only.
export async function searchApps(
  term: string,
  country: string,
  num = 10
): Promise<StoreListing[]> {
  const list = await appStore.search({ term, num, country });
  return list.map((a: Record<string, unknown>) => ({
    store: "apple" as const,
    storeAppId: String(a.id),
    title: String(a.title ?? ""),
    icon: (a.icon as string) ?? null,
    developer: (a.developer as string) ?? null,
  }));
}

// Fetch up to `max` most-recent reviews, paginating across pages.
export async function fetchReviews(
  store: Store,
  appId: string,
  country: string,
  max = 200
): Promise<RawReview[]> {
  if (store === "google") return fetchGoogleReviews(appId, country, max);
  return fetchAppleReviews(appId, country, max);
}

async function fetchGoogleReviews(
  appId: string,
  country: string,
  max: number
): Promise<RawReview[]> {
  const out: RawReview[] = [];
  let token: string | undefined;
  while (out.length < max) {
    const res = await gplay.reviews({
      appId,
      country,
      sort: gplay.sort.NEWEST,
      num: Math.min(150, max - out.length),
      paginate: true,
      nextPaginationToken: token,
    });
    const batch = res.data ?? res;
    for (const r of batch) {
      out.push({
        externalId: String(r.id),
        author: r.userName ?? null,
        rating: Number(r.score) || 0,
        title: r.title ?? null,
        text: r.text ?? "",
        version: r.version ?? null,
        postedAt: r.date ? new Date(r.date) : null,
      });
    }
    token = res.nextPaginationToken;
    if (!token || batch.length === 0) break;
  }
  return out.slice(0, max);
}

async function fetchAppleReviews(
  appId: string,
  country: string,
  max: number
): Promise<RawReview[]> {
  const out: RawReview[] = [];
  // Apple RSS exposes up to 10 pages of ~50 reviews each.
  for (let page = 1; page <= 10 && out.length < max; page++) {
    let batch: Record<string, unknown>[] = [];
    try {
      batch = await appStore.reviews({
        id: appId,
        country,
        page,
        sort: appStore.sort.RECENT,
      });
    } catch {
      break;
    }
    if (!batch || batch.length === 0) break;
    for (const r of batch) {
      out.push({
        externalId: String(r.id),
        author: (r.userName as string) ?? null,
        rating: Number(r.score) || 0,
        title: (r.title as string) ?? null,
        text: (r.text as string) ?? "",
        version: (r.version as string) ?? null,
        postedAt: r.updated ? new Date(r.updated as string) : null,
      });
    }
  }
  return out.slice(0, max);
}
