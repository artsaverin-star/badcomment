// Types of the generated rating content in `content/v2/<L>/rating/**` (web-only section
// «Рейтинг»; docs: site-v2 redesign spec §8 «Data plan», spec 11 §8.1).
//
// The contract between `scripts/v2/import-rating.ts` (the writer, run through
// `import-app-content.ts --only=rating`) and `src/site/content/rating.ts` (the reader).
// Client-safe: types only, no imports at runtime.
//
// Texts are stored once per data locale (ru, en). de/fr/ja pages read the English files plus a
// small overlay with their own topic names and quote translations.
//
//   content/v2/{ru,en}/rating/index.json      RatingIndexFile   (all 72 niches of the app bundle)
//   content/v2/{ru,en}/rating/<slug>.json     RatingNicheFile
//   content/v2/{de,fr,ja}/rating/overlay.json RatingOverlayFile
//
// Every text field is final: overrides, «readable», typography and trust wording were applied by
// the importer. The reader does no text processing of its own.
//
// PUBLIC: the whole rating is free (owner, 2026-09-25, spec 11 D2) — texts, quotes, task gaps
// and task app lists alike. Nothing here is gated; do not add a gate back.
//
// Media are compact Apple CDN paths: the part of an `https://is1-ssl.mzstatic.com/image/thumb/…`
// URL between `/image/thumb/` and the last `/` (the size variant). The pages build the sized URLs
// with src/site/features/rating/media.ts; the importer accepts only
// /^[A-Za-z0-9][A-Za-z0-9._@/-]*\.(?:png|jpe?g)$/i.

import type { LocaleCode } from "./types";

export type RatingDataLocale = "ru" | "en";
export type RatingOverlayLocale = "de" | "fr" | "ja";

/** A review fragment of an app (ClarityRatingData.quotes). PUBLIC (spec 11 D2). */
export interface RatingQuoteFile {
  text: string;
  /** "ru" / "de" / "fr" / "ja" for a translation, "en" for the App Store original. */
  lang: LocaleCode;
}

export interface RatingAppFile {
  /** App Store id (digits). */
  id: string;
  /** Store title, verbatim (a few titles contain Cyrillic look-alike letters). */
  title: string;
  /**
   * Short display name: the store title cut at the first " - ", " – ", " — ", ": " or " | " when
   * the head is 2–40 chars AND unique (case-insensitive) among all apps of the rating (heads and
   * full titles); else = title. The same in ru and en.
   */
  short: string;
  /** Compact mzstatic path of the 512 px App Store icon; null = none. PUBLIC. */
  icon: string | null;
  /** Compact mzstatic paths of the App Store screenshots, store order, unique, ≤ 10; [] = none. */
  shots: string[];
  /** inApp review score 0–100. The file's apps are sorted by it, descending (rank = index + 1). */
  realScore: number | null;
  /** App Store star average 0–5 at collection time. */
  storeAvg: number | null;
  /** App Store rating count at collection time. */
  ratings: number;
  /** Reviews read for this app (peoplesRating `nrev`, 20–543); null = unknown. */
  reviewsRead: number | null;
  /** Each text is null when missing, withheld or not readable (ClarityRatingData.readable). */
  verdict: string | null;
  loved: string | null;
  weak: string | null;
  whoFor: string | null;
  /** In data order, deduplicated by original text. PUBLIC (spec 11 D2). */
  quotes: RatingQuoteFile[];
}

/** One audience segment of the niche's research dossier («Выбор по задаче»). */
export interface RatingScenarioFile {
  /** 1-based index into the niche's full segment list (the /tasks/<n> URL). */
  n: number;
  /** Segment (audience) name, or null when not readable. */
  name: string | null;
  /** The job; a scenario with job === null is not shown and has no page. */
  job: string | null;
  /** «Что проверить перед выбором». PUBLIC (spec 11 D2). */
  gap: string | null;
  /** Rated apps that serve the job, in `servedBy` order (exact title, else a unique normalized title). PUBLIC. */
  appIds: string[];
  /** `servedBy` names without a rated app («также упомянуты»). PUBLIC. */
  unmatched: string[];
}

export interface RatingNicheFile {
  version: 1;
  locale: RatingDataLocale;
  category: string;
  /** The app's topic name (text.ru / the topic catalogue), shown in H1s and rows. */
  name: string;
  nameLang: LocaleCode;
  /**
   * SEO head term in the file's language (spec 11 §6.2; scripts/v2/data/rating-seo.json): ru
   * completes «Лучшие приложения для …» (genitive), en completes "Best … apps" (never ends in
   * "app"/"apps"). Required in both locales.
   */
  seoName: string;
  /** The niche name the pre-v2 pages and <title>s used (peoplesRating name / nameEn). */
  titleName: string;
  /** One editorial sentence, 60–180 chars, file language (spec 11 §6.3); null only for astrology. */
  intro: string | null;
  /** Apps in the niche's rating. */
  count: number;
  /** Reviews read for the niche's rating. */
  totalReviews: number;
  /** YYYY-MM-DD (UTC) of the last content change of this file (sitemap lastmod). */
  updatedAt: string;
  /** Raw peoplesRating order (realScore descending): the URL slug index and the rank depend on it. */
  apps: RatingAppFile[];
  scenarios: RatingScenarioFile[];
}

/** One of a niche's first apps, for the catalogue card (icon folder + leader line). */
export interface RatingLeaderFile {
  id: string;
  title: string;
  short: string;
  icon: string | null;
  realScore: number | null;
}

export interface RatingIndexEntry {
  slug: string;
  name: string;
  nameLang: LocaleCode;
  count: number;
  totalReviews: number;
  intro: string | null;
  updatedAt: string;
  /** Ranks 1–4 (catalogue folder + leader line): the niche file's first 4 apps. */
  leaders: RatingLeaderFile[];
}

export interface RatingIndexFile {
  version: 1;
  locale: RatingDataLocale;
  source: {
    description: string;
    /** sha256 of every input (app packs, peoplesRating, topic catalogues, rating-seo.json). */
    sha256: Record<string, string>;
  };
  /** Max updatedAt of the niches (the rating hub's sitemap lastmod). */
  generatedAt: string;
  stats: {
    niches: number;
    apps: number;
    scenarios: number;
    readableScenarios: number;
    appsWithQuotes: number;
    quotes: number;
    /** Across all niche files (an app in two niches counts twice). */
    appsWithIcon: number;
    appsWithShots: number;
    shots: number;
  };
  /** All niches of the bundle in peoplesRating key order (the reader filters and sorts). */
  niches: RatingIndexEntry[];
}

export interface RatingOverlayFile {
  version: 1;
  locale: RatingOverlayLocale;
  /** Own topic names for the launch topics (the other niches keep the English name). */
  names: Record<string, { name: string; nameLang: LocaleCode }>;
  /** "<niche>:<appId>" → the app's full quote list, only for apps with at least one own translation. */
  quotes: Record<string, RatingQuoteFile[]>;
}
