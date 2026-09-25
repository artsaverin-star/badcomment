// «Рейтинг» on the new site (docs/site-v2/DECISIONS.md «Web-only sections»; redesign spec §3, §8;
// spec 11 §8.3): the app's dormant ClarityRatings data, imported from the iOS bundle into
// content/v2/<L>/rating by `npx tsx scripts/v2/import-app-content.ts --only=rating`. Up to 100 apps
// per niche with the inApp review score, the App Store star, icons and screenshots (compact Apple
// CDN paths: build URLs with features/rating/media.ts), editorial texts, review quotes and the
// niche's tasks.
//
//   listRatingNiches(L)               the catalogue: niches with a review corpus, alphabetical
//   listRatingGroups(L)               the same cards in the catalogue's 10 groups (groups.ts)
//   getRatingNiche(L, niche)          one niche: apps in raw data order (= rank order) + scenarios
//   getRatingApp(L, niche, slug)      one app of a niche (its place is app.rank)
//   getRatingScenario(L, niche, n)    one task page (/<L>/rating/<niche>/tasks/<n>)
//   ratingTaskCards(niche)            the niche's readable tasks with their first 4 apps
//   appTasks(niche, appId)            the tasks that name an app
//   nicheNeighbours(niche, app)       5 alternatives: the top 3 and the app's rank neighbours
//   ratingAppNiches(L, appId)         the app in every niche that rates it
//   relatedNiches(L, niche, 4)        topics that share apps (then the same group)
//   searchRatingApps(L, q, off, lim)  the catalogue search (GET /api/site/rating-search)
//   ratingNicheName(L, niche)         the niche's display name + its language (reviews use it too)
//   ratingAppSlug(niche, appId)       the app's URL slug, for links from the review archive
//   hasRatingNiche(niche)             the niche has a rating page
//   ratingShareImage(L, niche?)       the share card (src/app/api/og)
//
// Data locale: ru pages read ru data; en/de/fr/ja read the English data (render it with
// lang={dataLang}); de/fr/ja get their own launch-topic names and quote translations from an
// overlay (each name/quote carries its own language). Texts arrive final from the importer —
// nothing here rewrites them.
//
// PUBLIC: the whole rating is free (owner, 2026-09-25, spec 11 D2) — quotes, task gaps, task app
// lists and «также упомянуты» included. Nothing here or in the pages reads the viewer; do not add
// a gate back. The API is synchronous (the files are read once per process, see
// src/site/content/rating.ts); `await` on the results is harmless.

import "server-only";

import { ogImage } from "@/lib/og";
import { appSlugify } from "@/lib/ratingAppSlug";
import { hasReviewCorpus, listSourceApps } from "@/lib/reviews";
import { getRatingIndex, getRatingNicheFile, getRatingOverlay } from "../content/rating";
import type { RatingIndexEntry, RatingIndexFile, RatingLeaderFile, RatingNicheFile, RatingOverlayFile } from "../content/rating-types";
import { compareNames } from "../content/text";
import { RATING_GROUPS, ratingGroupOf, type RatingGroupId } from "../features/rating/groups";
import { foldSearch, matchesFolded, searchTokens, titleContains } from "../features/rating/matches";
import { toOldLocale, type Locale } from "../i18n/locales";

export type { RatingLeaderFile } from "../content/rating-types";
export type { RatingGroupId } from "../features/rating/groups";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

/** The language of the rating's texts on a page: ru for ru pages, en for the others. */
export type RatingDataLang = "ru" | "en";

/** A review fragment. PUBLIC (spec 11 D2). */
export type RatingQuote = {
  text: string;
  /** Its own language: a translation ("ru" / "de" / "fr" / "ja") or the App Store original ("en"). */
  lang: Locale;
};

export type RatingAppEntry = {
  /** App Store id (digits). */
  id: string;
  /** URL slug (/<L>/rating/<niche>/<slug>); stable, derived from the raw data order. */
  slug: string;
  /**
   * The app's place in the niche: raw data index + 1 (spec 11 D3; the files are sorted by
   * realScore descending, ties keep data order). It never changes when a list is re-sorted.
   */
  rank: number;
  /** Store title, verbatim (not translated; no lang attribute needed). */
  title: string;
  /** Short display name («Hevy»), unique across the rating; = title when there is none. */
  short: string;
  /** Compact Apple CDN path of the App Store icon (features/rating/media.ts); null = none. */
  icon: string | null;
  /** Compact Apple CDN paths of the screenshots, store order, ≤ 10; [] = none. */
  shots: string[];
  /** inApp review score 0–100 («из 100 · отзывы»). */
  realScore: number | null;
  /** App Store star average 0–5 at collection time («из 5 · магазин»). */
  storeAvg: number | null;
  /** App Store rating count at collection time. */
  ratings: number;
  /** Reviews read for this app («отзывов прочитано»); null = unknown. */
  reviewsRead: number | null;
  /** Editorial texts in dataLang; null = do not render (missing or withheld). */
  verdict: string | null;
  loved: string | null;
  weak: string | null;
  whoFor: string | null;
  /** PUBLIC. In data order, at most 8; empty = no «Опыт пользователей» section. */
  quotes: RatingQuote[];
  /** The app has a page in the review archive (/<L>/reviews/<niche>/<id>). */
  hasReviews: boolean;
};

/** One task of the niche («Для чего тебе приложение?» / «Выбор по задаче»), in dataLang. */
export type RatingScenario = {
  /** 1-based index: routes.ratingTask(L, niche, n). */
  n: number;
  /** Audience name (the scenario page's status line); null = hide. */
  name: string | null;
  /** The task; scenarios with job === null are not listed and have no page. */
  job: string | null;
  /** «Что проверить перед выбором». PUBLIC. */
  gap: string | null;
  /** Rated apps for the task, in order («Порядок списка не означает рейтинг»). PUBLIC. */
  appIds: string[];
  /** Named apps without a card («В материале также упомянуты: …»). PUBLIC. */
  unmatched: string[];
};

export type RatingNiche = {
  slug: string;
  /** The app's topic name (H1s, rows) and its language (render with lang={nameLang}). */
  name: string;
  nameLang: Locale;
  /**
   * SEO head term in dataLang (spec 11 §6.2): ru completes «Лучшие приложения для …», en
   * completes "Best … apps". de/fr/ja pages use `name` instead (features/rating/seo.ts h1Name).
   */
  seoName: string;
  /** The name the pre-v2 pages and <title>s used. No longer used by the pages. */
  titleName: string;
  /** One editorial sentence in dataLang (the niche page's intro); null = none. */
  intro: string | null;
  /** YYYY-MM-DD: the last content change of the niche (sitemap lastmod). */
  updatedAt: string;
  /** Language of every text below (verdicts, scenarios). */
  dataLang: RatingDataLang;
  /** Apps in the niche's rating. */
  count: number;
  /** Reviews read for the niche (the method section). */
  totalReviews: number;
  /** Raw data order = rank order (the URL slugs depend on it). Sort copies for display. */
  apps: RatingAppEntry[];
  /** Every scenario of the data locale (n = index + 1); filter `job` for display. */
  scenarios: RatingScenario[];
};

export type RatingNicheName = { name: string; nameLang: Locale };

/** A catalogue card: read from the index only (the catalogue opens no niche file). */
export type RatingNicheCard = {
  slug: string;
  name: string;
  nameLang: Locale;
  /** Apps in the niche's rating. */
  count: number;
  /** Reviews read for the niche. */
  totalReviews: number;
  /** One sentence in the data language (ru pages: ru, others: en); null = none. */
  intro: string | null;
  /** YYYY-MM-DD: the niche's last content change. */
  updatedAt: string;
  /** Ranks 1–4 (the icon folder; leaders[0] is the leader line). */
  leaders: RatingLeaderFile[];
  group: RatingGroupId;
};

export type RatingGroup = { id: RatingGroupId; cards: RatingNicheCard[] };

/** A task of a niche as a list row (niche page, app page, task page «Другие задачи»). */
export type RatingTaskCard = {
  /** routes.ratingTask(L, niche, n). */
  n: number;
  /** Audience name; null = hide. */
  name: string | null;
  job: string;
  gap: string | null;
  /** The first 4 rated apps of the task, in its order. */
  apps: { id: string; short: string; icon: string | null }[];
  /** All rated apps of the task. */
  appCount: number;
};

/** The same app in one niche (ratingAppNiches). */
export type RatingAppNiche = {
  niche: string;
  name: string;
  nameLang: Locale;
  /** The app's URL slug in that niche. */
  appSlug: string;
  rank: number;
  /** Apps in that niche. */
  count: number;
  realScore: number | null;
};

export type RatingSearchItem = {
  niche: string;
  nicheName: string;
  nicheLang: Locale;
  id: string;
  /** App URL slug: routes.ratingApp(L, niche, slug). */
  slug: string;
  /** The app's place in that niche (RatingAppEntry.rank). */
  rank: number;
  title: string;
  /** Compact CDN path of the icon; null = none. */
  icon: string | null;
  realScore: number | null;
  storeAvg: number | null;
  /** whoFor ?? verdict, cut to 280 characters at a word boundary. */
  summary: string | null;
  summaryLang: RatingDataLang;
};

export type RatingSearchResult = {
  /** All matches of the query. */
  total: number;
  /** The requested page (`offset`, `limit`). */
  items: RatingSearchItem[];
};

export type RatingScenarioView = {
  niche: RatingNiche;
  scenario: RatingScenario & { job: string };
  /** The scenario's rated apps in appIds order. PUBLIC. */
  apps: RatingAppEntry[];
};

/** Search page size (spec §3.1: the first 40, then «Показать остальные N»). */
export const RATING_SEARCH_PAGE = 40;

// ---------------------------------------------------------------------------------------------
// Index, names, niche scope
// ---------------------------------------------------------------------------------------------

/** The language of the rating texts for a page locale: ru stays ru, others read English. */
export function ratingDataLocale(l: Locale): RatingDataLang {
  return toOldLocale(l);
}

function overlayOf(l: Locale): RatingOverlayFile | null {
  return l === "de" || l === "fr" || l === "ja" ? getRatingOverlay(l) : null;
}

const indexMaps = new WeakMap<RatingIndexFile, Map<string, RatingIndexEntry>>();

function indexMap(dl: RatingDataLang): Map<string, RatingIndexEntry> {
  const file = getRatingIndex(dl);
  if (!file) return new Map();
  let map = indexMaps.get(file);
  if (!map) {
    map = new Map(file.niches.map((n) => [n.slug, n]));
    indexMaps.set(file, map);
  }
  return map;
}

/**
 * The niche has a rating page: it is in the bundle, has apps and has a review corpus — the old
 * pages 404'd a niche without one (astrology), same rule: 71 of 72.
 */
function usable(slug: string): boolean {
  if (!SAFE_SLUG.test(slug)) return false;
  const entry = indexMap("en").get(slug);
  return !!entry && entry.count > 0 && hasReviewCorpus(slug);
}

/** True when the niche has a rating page (/<L>/rating/<niche>). */
export function hasRatingNiche(niche: string): boolean {
  return usable(niche);
}

/**
 * The niche's display name in a page locale and the language it is written in: the app's topic
 * name (ru: text.ru; en: the topic catalogue for the 35 launch topics, else the English rating
 * name; de/fr/ja: their own catalogue name for the launch topics, else English). The review
 * archive uses the same name. Null for a niche outside the rating.
 */
export function ratingNicheName(l: Locale, niche: string): RatingNicheName | null {
  const entry = indexMap(ratingDataLocale(l)).get(niche);
  if (!entry) return null;
  const own = overlayOf(l)?.names[niche];
  return own ? { name: own.name, nameLang: own.nameLang } : { name: entry.name, nameLang: entry.nameLang };
}

type CatalogueCache = { index: RatingIndexFile | null; overlay: RatingOverlayFile | null; cards: RatingNicheCard[]; groups: RatingGroup[] };
const catalogueCache = new Map<Locale, CatalogueCache>();

function catalogue(l: Locale): CatalogueCache {
  const index = getRatingIndex(ratingDataLocale(l));
  const overlay = overlayOf(l);
  const hit = catalogueCache.get(l);
  if (hit && hit.index === index && hit.overlay === overlay) return hit;
  const cards: RatingNicheCard[] = [];
  for (const entry of index?.niches ?? []) {
    if (!usable(entry.slug)) continue;
    const name = ratingNicheName(l, entry.slug) ?? { name: entry.name, nameLang: entry.nameLang };
    cards.push({
      slug: entry.slug,
      name: name.name,
      nameLang: name.nameLang,
      count: entry.count,
      totalReviews: entry.totalReviews,
      intro: entry.intro,
      updatedAt: entry.updatedAt,
      leaders: entry.leaders,
      // Every usable niche is in GROUP_OF (scripts/v2/check-content.ts fails otherwise).
      group: ratingGroupOf(entry.slug) ?? RATING_GROUPS[RATING_GROUPS.length - 1],
    });
  }
  cards.sort((a, b) => compareNames(a.name, b.name, l) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const groups = RATING_GROUPS.map((id) => ({ id, cards: cards.filter((c) => c.group === id) })).filter((g) => g.cards.length > 0);
  const value = { index, overlay, cards, groups };
  catalogueCache.set(l, value);
  return value;
}

/** The catalogue: every niche with a rating page, alphabetical by displayed name (ClarityRatings :71-74). */
export function listRatingNiches(l: Locale): RatingNicheCard[] {
  return catalogue(l).cards;
}

/** The catalogue in its groups (spec 11 D7): RATING_GROUPS order, cards alphabetical; empty groups dropped. */
export function listRatingGroups(l: Locale): RatingGroup[] {
  return catalogue(l).groups;
}

// ---------------------------------------------------------------------------------------------
// Slugs. Rating apps have no stored slug: the old site derived it from the title (appSlugify),
// so the first app with a given slug keeps that URL; a later namesake in the same niche (the old
// site could not reach it) gets "<slug>-<app id>". Keyed to the RAW data order — display sorting
// must never feed it, or the suffixes move.
// ---------------------------------------------------------------------------------------------

type SlugIndex = { slugs: string[]; bySlug: Map<string, number>; byId: Map<string, string> };
const slugIndexes = new WeakMap<RatingNicheFile, SlugIndex>();

function slugIndex(file: RatingNicheFile): SlugIndex {
  const hit = slugIndexes.get(file);
  if (hit) return hit;
  const bySlug = new Map<string, number>();
  const byId = new Map<string, string>();
  const slugs = file.apps.map((app, i) => {
    let slug = appSlugify(app.title);
    // "tasks" is the static segment of the task pages (/rating/<niche>/tasks/<n>), which wins over
    // an app slug: an app titled «Tasks» must never own it (none does today; spec §3.4).
    if (slug === "tasks") slug = `tasks-${app.id}`;
    if (bySlug.has(slug)) slug = `${slug}-${app.id}`;
    bySlug.set(slug, i);
    if (!byId.has(app.id)) byId.set(app.id, slug);
    return slug;
  });
  const index = { slugs, bySlug, byId };
  slugIndexes.set(file, index);
  return index;
}

/**
 * URL slug of an app in a niche's rating, or null when the app is not rated there. The slug is
 * the same in every locale; `l` only picks which data file to read (default: English).
 */
export function ratingAppSlug(niche: string, appId: string, l: Locale = "en"): string | null {
  if (!usable(niche)) return null;
  const file = getRatingNicheFile(ratingDataLocale(l), niche);
  return file ? (slugIndex(file).byId.get(appId) ?? null) : null;
}

// ---------------------------------------------------------------------------------------------
// Niches, apps, scenarios
// ---------------------------------------------------------------------------------------------

type NicheCacheEntry = { file: RatingNicheFile; overlay: RatingOverlayFile | null; value: RatingNiche };
// Built niches, most recent last (5 locales × the busiest niches).
const MAX_CACHED = 64;
const nicheCache = new Map<string, NicheCacheEntry>();

function buildNiche(l: Locale, slug: string, file: RatingNicheFile, overlay: RatingOverlayFile | null): RatingNiche {
  const { slugs } = slugIndex(file);
  const name = ratingNicheName(l, slug) ?? { name: file.name, nameLang: file.nameLang };
  const reviewed = new Set(listSourceApps(slug).map((a) => a.id));
  return {
    slug,
    name: name.name,
    nameLang: name.nameLang,
    seoName: file.seoName,
    titleName: file.titleName,
    intro: file.intro,
    updatedAt: file.updatedAt,
    dataLang: file.locale,
    count: file.count,
    totalReviews: file.totalReviews,
    apps: file.apps.map((app, i) => ({
      id: app.id,
      slug: slugs[i],
      rank: i + 1,
      title: app.title,
      short: app.short,
      icon: app.icon,
      shots: app.shots,
      realScore: app.realScore,
      storeAvg: app.storeAvg,
      ratings: app.ratings,
      reviewsRead: app.reviewsRead,
      verdict: app.verdict,
      loved: app.loved,
      weak: app.weak,
      whoFor: app.whoFor,
      quotes: overlay?.quotes[`${slug}:${app.id}`] ?? app.quotes,
      hasReviews: reviewed.has(app.id),
    })),
    scenarios: file.scenarios,
  };
}

/** One niche with all its apps (raw order) and scenarios, or null when it has no rating page. */
export function getRatingNiche(l: Locale, niche: string): RatingNiche | null {
  if (!usable(niche)) return null;
  const file = getRatingNicheFile(ratingDataLocale(l), niche);
  if (!file) return null;
  const overlay = overlayOf(l);
  const key = `${l}:${niche}`;
  const hit = nicheCache.get(key);
  nicheCache.delete(key);
  if (hit && hit.file === file && hit.overlay === overlay) {
    nicheCache.set(key, hit);
    return hit.value;
  }
  const value = buildNiche(l, niche, file, overlay);
  nicheCache.set(key, { file, overlay, value });
  while (nicheCache.size > MAX_CACHED) nicheCache.delete(nicheCache.keys().next().value!);
  return value;
}

/** One app of a niche by its URL slug (its place is `app.rank`). */
export function getRatingApp(l: Locale, niche: string, appSlug: string): { niche: RatingNiche; app: RatingAppEntry } | null {
  const found = getRatingNiche(l, niche);
  const app = found?.apps.find((a) => a.slug === appSlug);
  return found && app ? { niche: found, app } : null;
}

/**
 * A task page: `n` is the 1-based scenario index of the data locale (/^[1-9]\d{0,2}$/ as a URL
 * segment). Null when out of range or when the task is not readable (→ notFound()).
 */
export function getRatingScenario(l: Locale, niche: string, n: string | number): RatingScenarioView | null {
  const num = typeof n === "number" ? n : /^[1-9]\d{0,2}$/.test(n) ? Number(n) : NaN;
  if (!Number.isInteger(num) || num < 1 || num > 999) return null;
  const found = getRatingNiche(l, niche);
  const scenario = found?.scenarios[num - 1];
  if (!found || !scenario?.job) return null;
  const byId = new Map(found.apps.map((a) => [a.id, a]));
  const apps = scenario.appIds.map((id) => byId.get(id)).filter((a): a is RatingAppEntry => !!a);
  return { niche: found, scenario: { ...scenario, job: scenario.job }, apps };
}

// ---------------------------------------------------------------------------------------------
// Tasks and neighbours of a niche (spec 11 §4.2.8, §4.3.12–13). Memoised per built niche: a
// RatingNiche is rebuilt only when its file or overlay changes.
// ---------------------------------------------------------------------------------------------

/** Task rows shown per task (IconStack) — the rest is `appCount`. */
const TASK_ICONS = 4;

type TaskIndex = { cards: RatingTaskCard[]; ids: Set<string>[] };
const taskIndexes = new WeakMap<RatingNiche, TaskIndex>();

function taskIndex(niche: RatingNiche): TaskIndex {
  const hit = taskIndexes.get(niche);
  if (hit) return hit;
  const byId = new Map(niche.apps.map((a) => [a.id, a]));
  const cards: RatingTaskCard[] = [];
  const ids: Set<string>[] = [];
  for (const s of niche.scenarios) {
    if (!s.job) continue;
    const apps = s.appIds.map((id) => byId.get(id)).filter((a): a is RatingAppEntry => !!a);
    cards.push({
      n: s.n,
      name: s.name,
      job: s.job,
      gap: s.gap,
      apps: apps.slice(0, TASK_ICONS).map((a) => ({ id: a.id, short: a.short, icon: a.icon })),
      appCount: apps.length,
    });
    ids.push(new Set(apps.map((a) => a.id)));
  }
  const value = { cards, ids };
  taskIndexes.set(niche, value);
  return value;
}

/** The niche's readable tasks (a job), in data order, each with its first 4 apps. */
export function ratingTaskCards(niche: RatingNiche): RatingTaskCard[] {
  return taskIndex(niche).cards;
}

/** The tasks whose app list (all of it, not only the first 4) names the app, in data order. */
export function appTasks(niche: RatingNiche, appId: string): RatingTaskCard[] {
  const { cards, ids } = taskIndex(niche);
  return cards.filter((_, i) => ids[i].has(appId));
}

/**
 * The app page's alternatives: ranks 1–3 and the app's rank neighbours (rank − 1, rank + 1),
 * minus the app itself, in rank order — 5 when the niche has 6 apps or more (D8). Where that set
 * is short (the top 4 and the last app overlap it) it is filled with the next-nearest ranks
 * (rank + 2, rank − 2, rank + 3, …), so Hevy (№ 1) gets 2–6. The neighbour chain links every
 * app page.
 */
export function nicheNeighbours(niche: RatingNiche, app: Pick<RatingAppEntry, "rank">): RatingAppEntry[] {
  const count = niche.apps.length;
  const valid = (r: number) => r >= 1 && r <= count && r !== app.rank;
  const ranks = new Set([1, 2, 3, app.rank - 1, app.rank + 1].filter(valid));
  for (let d = 2; ranks.size < 5 && (app.rank + d <= count || app.rank - d >= 1); d++) {
    for (const r of [app.rank + d, app.rank - d]) if (ranks.size < 5 && valid(r)) ranks.add(r);
  }
  return [...ranks].sort((a, b) => a - b).map((r) => niche.apps[r - 1]);
}

// ---------------------------------------------------------------------------------------------
// Search (ClarityRatingData.catalogue, spec §3.1 «Server search»)
// ---------------------------------------------------------------------------------------------

type SearchRow = { item: RatingSearchItem; folded: string[] };
type SearchCorpus = {
  files: (RatingNicheFile | null)[];
  overlay: RatingOverlayFile | null;
  niches: RatingNicheCard[];
  rows: SearchRow[];
  /** App id → the app in every usable niche, niches alphabetical. */
  appNiches: Map<string, RatingAppNiche[]>;
  /** Niche slug → its app ids. */
  nicheApps: Map<string, Set<string>>;
  /** relatedNiches results, by `${slug}:${limit}`. */
  related: Map<string, RatingNicheCard[]>;
};
const corpora = new Map<Locale, SearchCorpus>();

const SUMMARY_MAX = 280;

/** Cut at the last plain space before `max` (Russian no-break spaces keep short words attached). */
function clip(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const at = head.lastIndexOf(" ");
  const cut = at >= max * 0.6 ? head.slice(0, at) : head.replace(/[\uD800-\uDBFF]$/, "");
  return cut.replace(/[\s,;:.—–-]+$/u, "") + "…";
}

/**
 * Every usable niche file of a page locale, read once: the search rows (niches alphabetically,
 * apps in data order, each with its folded [title, niche name, whoFor]) and the cross-niche
 * indexes (an app's other niches, the apps a niche shares with others).
 */
function searchCorpus(l: Locale): SearchCorpus {
  const dl = ratingDataLocale(l);
  const niches = listRatingNiches(l);
  const files = niches.map((n) => getRatingNicheFile(dl, n.slug));
  const overlay = overlayOf(l);
  const hit = corpora.get(l);
  if (
    hit &&
    hit.niches === niches &&
    hit.overlay === overlay &&
    hit.files.length === files.length &&
    hit.files.every((f, i) => f === files[i])
  )
    return hit;
  const rows: SearchRow[] = [];
  const appNiches = new Map<string, RatingAppNiche[]>();
  const nicheApps = new Map<string, Set<string>>();
  niches.forEach((niche, n) => {
    const file = files[n];
    if (!file) return;
    const { slugs } = slugIndex(file);
    const foldedName = foldSearch(niche.name, l);
    nicheApps.set(niche.slug, new Set(file.apps.map((a) => a.id)));
    file.apps.forEach((app, i) => {
      const summary = app.whoFor ?? app.verdict;
      rows.push({
        item: {
          niche: niche.slug,
          nicheName: niche.name,
          nicheLang: niche.nameLang,
          id: app.id,
          slug: slugs[i],
          rank: i + 1,
          title: app.title,
          icon: app.icon,
          realScore: app.realScore,
          storeAvg: app.storeAvg,
          summary: summary === null ? null : clip(summary),
          summaryLang: dl,
        },
        folded: [foldSearch(app.title, l), foldedName, app.whoFor ? foldSearch(app.whoFor, l) : ""],
      });
      let list = appNiches.get(app.id);
      if (!list) appNiches.set(app.id, (list = []));
      list.push({
        niche: niche.slug,
        name: niche.name,
        nameLang: niche.nameLang,
        appSlug: slugs[i],
        rank: i + 1,
        count: file.count,
        realScore: app.realScore,
      });
    });
  });
  const corpus = { files, overlay, niches, rows, appNiches, nicheApps, related: new Map<string, RatingNicheCard[]>() };
  corpora.set(l, corpus);
  return corpus;
}

// Full sorted result lists of recent queries, most recent last.
const MAX_SEARCHES = 200;
const searchCache = new Map<string, { corpus: SearchCorpus; items: RatingSearchItem[] }>();

/**
 * The app in every niche that rates it (niches alphabetical by displayed name, the current one
 * included; the app page lists the others under «В других рейтингах»).
 */
export function ratingAppNiches(l: Locale, appId: string): RatingAppNiche[] {
  return searchCorpus(l).appNiches.get(appId) ?? [];
}

/**
 * Up to `limit` topics related to a niche (spec 11 §6.6): the niches sharing the most app ids
 * (at least one), ties by totalReviews descending, then the rest of its group alphabetically.
 */
export function relatedNiches(l: Locale, slug: string, limit = 4): RatingNicheCard[] {
  const corpus = searchCorpus(l);
  const key = `${slug}:${limit}`;
  const hit = corpus.related.get(key);
  if (hit) return hit;
  const own = corpus.nicheApps.get(slug);
  const self = corpus.niches.find((n) => n.slug === slug);
  if (!own || !self) return [];
  const shared = corpus.niches
    .filter((n) => n.slug !== slug)
    .map((card) => {
      let count = 0;
      for (const id of corpus.nicheApps.get(card.slug) ?? []) if (own.has(id)) count++;
      return { card, count };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || b.card.totalReviews - a.card.totalReviews)
    .map((x) => x.card);
  const out = shared.slice(0, limit);
  // corpus.niches is alphabetical already.
  for (const card of corpus.niches) {
    if (out.length >= limit) break;
    if (card.slug !== slug && card.group === self.group && !out.includes(card)) out.push(card);
  }
  corpus.related.set(key, out);
  return out;
}

/**
 * Apps whose title, niche name or «для каких задач» text contains every word of `q` (case- and
 * diacritic-insensitive), each app once (its first niche alphabetically). Order (spec 11 §4.1):
 * titles containing the whole query first, then the review score descending (missing last), then
 * the rank within one niche, then the title. Returns the total and the page `offset…offset+limit` (`limit: "all"` = everything
 * after `offset`). No quotes or task texts in the items (they are not needed there).
 */
export function searchRatingApps(
  l: Locale,
  q: string,
  offset = 0,
  limit: number | "all" = RATING_SEARCH_PAGE,
): RatingSearchResult {
  const query = q.trim();
  const tokens = query ? searchTokens(query, l) : [];
  if (tokens.length === 0) return { total: 0, items: [] };
  const corpus = searchCorpus(l);
  const key = `${l}:${foldSearch(query, l).replace(/\s+/gu, " ")}`;
  let hit = searchCache.get(key);
  searchCache.delete(key);
  if (!hit || hit.corpus !== corpus) {
    const seen = new Set<string>();
    const matched: RatingSearchItem[] = [];
    for (const row of corpus.rows) {
      if (!matchesFolded(tokens, row.folded) || seen.has(row.item.id)) continue;
      seen.add(row.item.id);
      matched.push(row.item);
    }
    const contains = titleContains(query, l);
    matched.sort((a, b) => {
      const ca = contains(a.title);
      const cb = contains(b.title);
      if (ca !== cb) return ca ? -1 : 1;
      if (a.realScore !== b.realScore) return (b.realScore ?? -1) - (a.realScore ?? -1);
      // Equal scores in one niche keep its ranks (D3: ties keep data order), «№ 2» before «№ 3».
      if (a.niche === b.niche) return a.rank - b.rank;
      return compareNames(a.title, b.title, l);
    });
    hit = { corpus, items: matched };
  }
  searchCache.set(key, hit);
  while (searchCache.size > MAX_SEARCHES) searchCache.delete(searchCache.keys().next().value!);
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const end = limit === "all" ? undefined : start + Math.max(0, Math.floor(limit));
  return { total: hit.items.length, items: hit.items.slice(start, end) };
}

// ---------------------------------------------------------------------------------------------
// Share image
// ---------------------------------------------------------------------------------------------

/**
 * The 1200×630 share card the rating pages have always used (src/app/api/og): the niche, its
 * app count and leader; ru or en.
 */
export function ratingShareImage(l: Locale, niche?: string): string {
  return ogImage(ratingDataLocale(l) === "ru", niche && usable(niche) ? niche : undefined);
}
