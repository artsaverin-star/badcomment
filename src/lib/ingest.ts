import { prisma } from "./prisma";
import {
  fetchAppMeta,
  fetchReviews,
  type AppMetrics,
  type Store,
  type StoreListing,
} from "./scrapers";
import { productSlug, productName } from "./match";
import { tagThemes, tagLoved } from "./themes";

export const NEGATIVE_MAX_RATING = 3;
export const POSITIVE_MIN_RATING = 4;
export const POSITIVE_SAMPLE_MAX = 50;

export type IngestResult = {
  productId: string;
  appId: string;
  title: string;
  fetched: number;
  negative: number;
  stored: number;
};

type ListingMeta = {
  store: Store;
  storeAppId: string;
  country: string;
  title: string;
  icon: string | null;
  developer: string | null;
  category?: string | null;
  rank?: number | null;
  metrics: AppMetrics;
};

const toBigInt = (n: number | null) =>
  n == null ? null : BigInt(Math.trunc(n));

function metricColumns(m: AppMetrics) {
  return {
    score: m.score,
    ratingCount: m.ratingCount,
    installs: toBigInt(m.installs),
    histogram: m.histogram ? JSON.stringify(m.histogram) : null,
    free: m.free,
    offersIAP: m.offersIAP,
    sizeBytes: toBigInt(m.sizeBytes),
    description: m.description,
    screenshots: m.screenshots ? JSON.stringify(m.screenshots) : null,
    storeUpdatedAt: m.storeUpdatedAt,
    releasedAt: m.releasedAt,
  };
}

// Find or create the canonical Product for a listing, keyed by name slug so
// the same app across both stores collapses into one entity.
async function resolveProduct(meta: ListingMeta) {
  const slug = productSlug(meta.title);
  return prisma.product.upsert({
    where: { slug },
    create: {
      slug,
      name: productName(meta.title),
      developer: meta.developer,
      icon: meta.icon,
      category: meta.category ?? null,
      rank: meta.rank ?? null,
    },
    update: {
      // Backfill icon/developer/category if we didn't have them before.
      icon: meta.icon ?? undefined,
      developer: meta.developer ?? undefined,
      category: meta.category ?? undefined,
    },
  });
}

async function ingestForMeta(meta: ListingMeta, max: number): Promise<IngestResult> {
  const product = await resolveProduct(meta);

  const metrics = metricColumns(meta.metrics);

  const app = await prisma.app.upsert({
    where: {
      store_storeAppId_country: {
        store: meta.store,
        storeAppId: meta.storeAppId,
        country: meta.country,
      },
    },
    create: {
      store: meta.store,
      storeAppId: meta.storeAppId,
      country: meta.country,
      title: meta.title,
      icon: meta.icon,
      category: meta.category ?? null,
      rank: meta.rank ?? null,
      productId: product.id,
      ...metrics,
    },
    update: {
      title: meta.title,
      icon: meta.icon,
      category: meta.category ?? undefined,
      rank: meta.rank ?? undefined,
      productId: product.id,
      lastScrapedAt: new Date(),
      ...metrics,
    },
  });

  const reviews = await fetchReviews(meta.store, meta.storeAppId, meta.country, max);
  const negatives = reviews.filter((r) => r.rating > 0 && r.rating <= NEGATIVE_MAX_RATING);

  let stored = 0;
  for (const r of negatives) {
    const themes = tagThemes(`${r.title ?? ""} ${r.text}`);
    await prisma.review.upsert({
      where: { appId_externalId: { appId: app.id, externalId: r.externalId } },
      create: {
        appId: app.id,
        externalId: r.externalId,
        author: r.author,
        rating: r.rating,
        title: r.title,
        text: r.text,
        version: r.version,
        postedAt: r.postedAt,
        themes: JSON.stringify(themes),
      },
      update: { themes: JSON.stringify(themes) },
    });
    stored++;
  }

  // Keep a sample of positive reviews to surface what users love.
  const positives = reviews
    .filter((r) => r.rating >= POSITIVE_MIN_RATING && r.text.trim().length > 0)
    .slice(0, POSITIVE_SAMPLE_MAX);

  for (const r of positives) {
    const loved = tagLoved(`${r.title ?? ""} ${r.text}`);
    await prisma.positiveReview.upsert({
      where: { appId_externalId: { appId: app.id, externalId: r.externalId } },
      create: {
        appId: app.id,
        externalId: r.externalId,
        author: r.author,
        rating: r.rating,
        title: r.title,
        text: r.text,
        postedAt: r.postedAt,
        loved: JSON.stringify(loved),
      },
      update: { loved: JSON.stringify(loved) },
    });
  }

  await prisma.app.update({
    where: { id: app.id },
    data: { lastScrapedAt: new Date() },
  });

  return {
    productId: product.id,
    appId: app.id,
    title: meta.title,
    fetched: reviews.length,
    negative: negatives.length,
    stored,
  };
}

// Ingest a single app by store id (used by the search "Analyze" flow and the
// scrape API). Fetches metadata from the store first.
export async function ingestApp(
  store: Store,
  storeAppId: string,
  country = "us",
  max = 200
): Promise<IngestResult> {
  const meta = await fetchAppMeta(store, storeAppId, country);
  return ingestForMeta(
    {
      store,
      storeAppId,
      country,
      title: meta.title,
      icon: meta.icon,
      developer: meta.developer,
      metrics: meta.metrics,
    },
    max
  );
}

// Ingest a listing already discovered via a top-list (we have its metadata,
// category and rank), so no extra app-detail fetch is needed.
export async function ingestListing(
  listing: StoreListing,
  category: string,
  rank: number,
  country = "us",
  max = 200
): Promise<IngestResult> {
  // Top-list endpoints return only basic listing data, so fetch the full app
  // detail to capture popularity/quality metrics. Fall back to listing-only
  // (empty metrics) if the detail fetch fails.
  let title = listing.title;
  let icon = listing.icon;
  let developer = listing.developer;
  let metrics: AppMetrics = {
    score: null,
    ratingCount: null,
    installs: null,
    histogram: null,
    free: null,
    offersIAP: null,
    sizeBytes: null,
    description: null,
    screenshots: null,
    storeUpdatedAt: null,
    releasedAt: null,
  };
  try {
    const detail = await fetchAppMeta(listing.store, listing.storeAppId, country);
    title = detail.title || title;
    icon = detail.icon ?? icon;
    developer = detail.developer ?? developer;
    metrics = detail.metrics;
  } catch {
    // keep listing-only data
  }

  return ingestForMeta(
    {
      store: listing.store,
      storeAppId: listing.storeAppId,
      country,
      title,
      icon,
      developer,
      category,
      rank,
      metrics,
    },
    max
  );
}
