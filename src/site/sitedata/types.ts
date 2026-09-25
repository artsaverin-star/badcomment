// Types of the new site's read-only view of OLD site data (client-safe, no imports).

/** src/site/sitedata/old-site.snapshot.json (see ./build-old-site-snapshot.ts). */
export interface OldSiteSnapshot {
  version: 1;
  /** YYYY-MM-DD of the last rebuild. */
  generatedAt: string;
  /** Names of the old site's 72 active topics, as the old topic page shows them. */
  topics: Record<string, { ru: string; en: string }>;
  /** Active topics whose old topic page renders (/<ru|en>/segment/<slug> in place). */
  topicPages: string[];
  /** Topics with an old reviews hub page (/<ru|en>/reviews/<slug>). */
  reviewHubs: string[];
  /** Launch topic → App Store id → old pages of that app (only apps that have one). */
  apps: Record<string, Record<string, { page?: string; reviews?: true }>>;
}

/** One app of a topic, as the new topic page shows it («Приложения в этой теме»). PUBLIC data. */
export interface TopicApp {
  appStoreId: string;
  name: string;
  developer: string;
  iconUrl: string;
  averageRating: number | null;
  ratingCount: number | null;
  /** https://apps.apple.com/<store>/app/id<id> */
  storeUrl: string;
  /** Old per-app page (/<ru|en>/<app-slug>), if the old site has one. */
  pageHref: string | null;
  /** The app's page in the review archive (/<L>/reviews/<topic>/<id>, new site), if any. */
  reviewsHref: string | null;
}

export interface TopicApps {
  /** App Store storefront of the snapshot ("us"). */
  store: string;
  /** ISO date of the App Store snapshot. */
  collectedAt: string;
  /** The broad query whose results are shown (e.g. "habit tracker"). */
  term: string;
  /** Apps of the broad query, most ratings first. */
  apps: TopicApp[];
}

/** A topic of the old site that the new site has not rewritten yet («Скоро в новом формате»). */
export interface SoonTopic {
  slug: string;
  name: string;
  /** Public URL of the old topic page, in place (/<ru|en>/segment/<slug>). */
  href: string;
  /** Language of `name` and of the target page (de/fr/ja read the English archive). */
  lang: "ru" | "en";
}
