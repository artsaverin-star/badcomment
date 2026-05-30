import { prisma } from "./prisma";
import { fetchAppMeta, fetchReviews, type Store, type StoreListing } from "./scrapers";
import { productSlug } from "./match";
import { tagThemes } from "./themes";

export const NEGATIVE_MAX_RATING = 2;

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
};

// Find or create the canonical Product for a listing, keyed by name slug so
// the same app across both stores collapses into one entity.
async function resolveProduct(meta: ListingMeta) {
  const slug = productSlug(meta.title);
  const head = meta.title.split(/[:\-–—|]/)[0].trim() || meta.title;
  return prisma.product.upsert({
    where: { slug },
    create: {
      slug,
      name: head,
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
    },
    update: {
      title: meta.title,
      icon: meta.icon,
      category: meta.category ?? undefined,
      rank: meta.rank ?? undefined,
      productId: product.id,
      lastScrapedAt: new Date(),
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
  return ingestForMeta(
    {
      store: listing.store,
      storeAppId: listing.storeAppId,
      country,
      title: listing.title,
      icon: listing.icon,
      developer: listing.developer,
      category,
      rank,
    },
    max
  );
}
