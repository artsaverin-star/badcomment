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

export type AppMeta = {
  title: string;
  icon: string | null;
};

export async function fetchAppMeta(
  store: Store,
  appId: string,
  country: string
): Promise<AppMeta> {
  if (store === "google") {
    const app = await gplay.app({ appId, country });
    return { title: app.title, icon: app.icon ?? null };
  }
  const app = await appStore.app({ id: appId, country });
  return { title: app.title, icon: app.icon ?? null };
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
