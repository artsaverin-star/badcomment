import { prisma } from "./prisma";
import { fetchAppMeta, fetchReviews, type Store } from "./scrapers";
import { tagThemes } from "./themes";

export const NEGATIVE_MAX_RATING = 2;

export type IngestResult = {
  appId: string;
  title: string;
  fetched: number;
  negative: number;
  stored: number;
};

export async function ingestApp(
  store: Store,
  storeAppId: string,
  country = "us",
  max = 200
): Promise<IngestResult> {
  const meta = await fetchAppMeta(store, storeAppId, country);

  const app = await prisma.app.upsert({
    where: { store_storeAppId_country: { store, storeAppId, country } },
    create: { store, storeAppId, country, title: meta.title, icon: meta.icon },
    update: { title: meta.title, icon: meta.icon, lastScrapedAt: new Date() },
  });

  const reviews = await fetchReviews(store, storeAppId, country, max);
  const negatives = reviews.filter((r) => r.rating > 0 && r.rating <= NEGATIVE_MAX_RATING);

  let stored = 0;
  for (const r of negatives) {
    const themes = tagThemes(`${r.title ?? ""} ${r.text}`);
    const res = await prisma.review.upsert({
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
    if (res) stored++;
  }

  await prisma.app.update({
    where: { id: app.id },
    data: { lastScrapedAt: new Date() },
  });

  return {
    appId: app.id,
    title: meta.title,
    fetched: reviews.length,
    negative: negatives.length,
    stored,
  };
}
