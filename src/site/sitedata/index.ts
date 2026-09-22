// Server-only adapters from the NEW site to the OLD site's data (ARCHITECTURE §2 sitedata,
// DECISIONS §3–§4). Read-only reuse of src/lib/** loaders and src/data/**; everything returned
// here is public store/catalogue data (no review text, nothing gated).
//
//   getTopicApps(L, slug)   «Приложения в этой теме»: the App Store market players of a topic
//   getSoonTopics(L)        the old site's other topics («Скоро в новом формате»)
//   oldTopicHref(L, slug)   «Прежняя версия разбора» → /<ru|en>/old/segment/<slug>
//   reviewsHubHref(L, slug) «Все отзывы по теме»     → /<ru|en>/reviews/<slug>
//
// Old pages speak ru/en only: de/fr/ja get English names and /en/… links (toOldLocale).
// Links to old pages cross the root layout — render them as plain <a>, never next/link.

import "server-only";

import active from "@/data/active-categories.json";
import { marketPlayerRows, type MarketSnapshot } from "@/lib/marketPlayers";
import { marketPlayersFor } from "@/lib/marketPlayers.server";
import { toOldLocale, type Locale } from "../i18n/locales";
import { isLaunchCategory } from "../manifest.generated";
import { routes } from "../routing";
import snapshotJson from "./old-site.snapshot.json";
import type { OldSiteSnapshot, SoonTopic, TopicApp, TopicApps } from "./types";

export type { OldSiteSnapshot, SoonTopic, TopicApp, TopicApps } from "./types";

const snapshot = snapshotJson as OldSiteSnapshot;
const topicPages: ReadonlySet<string> = new Set(snapshot.topicPages);
const reviewHubs: ReadonlySet<string> = new Set(snapshot.reviewHubs);
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const oldPrefix = (l: Locale) => `/${toOldLocale(l)}`;

/** Old topic page in its previous version (/<ru|en>/old/segment/<slug>), or null. */
export function oldTopicHref(l: Locale, slug: string): string | null {
  return topicPages.has(slug) ? routes.oldSite(l, `/segment/${slug}`) : null;
}

/** The old reviews hub of a topic (/<ru|en>/reviews/<slug>, served in place), or null. */
export function reviewsHubHref(l: Locale, slug: string): string | null {
  return reviewHubs.has(slug) ? `${oldPrefix(l)}/reviews/${slug}` : null;
}

/** True when links to old pages lead to another language than the page (de/fr/ja → English). */
export function oldLinksInEnglish(l: Locale): boolean {
  return toOldLocale(l) !== l;
}

const appsCache = new Map<string, TopicApps | null>();

/**
 * «Приложения в этой теме»: the apps App Store returns for the topic's broad query
 * ("habit tracker", …), most ratings first — the old site's «Лидеры ниши» view
 * (src/components/MarketPlayersList.tsx, mode "leaders"). Null when the old site has no
 * snapshot for the topic.
 */
export function getTopicApps(l: Locale, slug: string): TopicApps | null {
  if (!SAFE_SLUG.test(slug)) return null;
  const key = `${toOldLocale(l)}:${slug}`;
  if (appsCache.has(key)) return appsCache.get(key) ?? null;

  let data: MarketSnapshot | null = null;
  try {
    data = marketPlayersFor(slug);
  } catch (error) {
    console.error(`[sitedata] market players for ${slug}:`, error);
  }
  let result: TopicApps | null = null;
  if (data) {
    const links = snapshot.apps[slug] ?? {};
    const prefix = oldPrefix(l);
    const apps: TopicApp[] = marketPlayerRows(data, "leaders", data.leaderTerm).map(({ app }) => {
      const link = links[app.appStoreId];
      return {
        appStoreId: app.appStoreId,
        name: app.name,
        developer: app.developer,
        iconUrl: app.iconUrl,
        averageRating: app.averageRating,
        ratingCount: app.ratingCount,
        storeUrl: `https://apps.apple.com/${data.store}/app/id${app.appStoreId}`,
        pageHref: link?.page ? `${prefix}/${link.page}` : null,
        reviewsHref: link?.reviews ? `${prefix}/reviews/${slug}/${app.appStoreId}` : null,
      };
    });
    result = apps.length ? { store: data.store, collectedAt: data.collectedAt, term: data.leaderTerm, apps } : null;
  }
  appsCache.set(key, result);
  return result;
}

const soonCache = new Map<string, SoonTopic[]>();

/**
 * The old site's active topics that are not in the app's launch edition and still have an
 * old topic page (served in place with the «Скоро обновление» banner), sorted by name.
 */
export function getSoonTopics(l: Locale): SoonTopic[] {
  const lang = toOldLocale(l);
  const hit = soonCache.get(lang);
  if (hit) return hit;
  const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
  const list = (active as string[])
    .filter((slug) => !isLaunchCategory(slug) && topicPages.has(slug) && snapshot.topics[slug])
    .map((slug) => ({ slug, name: snapshot.topics[slug][lang], href: `/${lang}/segment/${slug}`, lang }))
    .sort((a, b) => collator.compare(a.name, b.name));
  soonCache.set(lang, list);
  return list;
}
