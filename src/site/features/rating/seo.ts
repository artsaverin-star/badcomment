import type { Metadata } from "next";
import { SITE_URL } from "../../config";
import { counted } from "../../i18n/count";
import { INTL_LOCALE, toOldLocale, type Locale, type OldLocale } from "../../i18n/locales";
import { format } from "../../i18n/strings";
import { clampDescription, displayWidth } from "../research/seo";
import { starText } from "./format";
import { ratingStrings } from "./strings";
import { displayTitle, points } from "./text";

// SEO of the rating pages (spec 11 §6.1): canonicals, <title>s, descriptions and the robots
// rule of the task pages. Pure; the JSON-LD builders are in ./schema.ts, the sitemaps in
// src/site/sitedata/rating-sitemap.ts.
//
// Canonical + hreflang of the pages whose content is ru/en data (rating, review archive): the
// Russian and English pages are the canonical pair (the same URLs the old pages were indexed
// under); a de/fr/ja copy — localized chrome, English data — declares the English page canonical.
// `en: false` = the page exists only in Russian data (a task page of a non-launch niche: the
// English bundle has scenarios for the 35 launch topics only), so only ru is listed.

export function dataAlternates(
  locale: Locale,
  path: string,
  { en = true }: { en?: boolean } = {},
): NonNullable<Metadata["alternates"]> {
  const url = (l: OldLocale) => `${SITE_URL}/${l}${path ? `/${path}` : ""}`;
  if (!en) return { canonical: url("ru"), languages: { ru: url("ru") } };
  return { canonical: url(toOldLocale(locale)), languages: { ru: url("ru"), en: url("en"), "x-default": url("en") } };
}

/**
 * The page's canonical URL as dataAlternates names it (de/fr/ja → the /en/… page), for JSON-LD
 * `url`, `@id` and breadcrumb items. Percent-encoded the way Next renders the <link rel=canonical>
 * (two app slugs carry Cyrillic look-alike letters). `path` is the part after the locale.
 */
export function dataCanonical(locale: Locale, path: string, { en = true }: { en?: boolean } = {}): string {
  const l: OldLocale = en ? toOldLocale(locale) : "ru";
  return new URL(`${SITE_URL}/${l}${path ? `/${path}` : ""}`).href;
}

/** The language the data of a page is printed in, when it is not the page's own (de/fr/ja → "en"). */
export function dataLang(locale: Locale): OldLocale | undefined {
  const dl = toOldLocale(locale);
  return dl === locale ? undefined : dl;
}

// Mirrors research/seo.ts (TITLE_BUDGET, BRAND_WIDTH are private there): a full <title> with
// the layout's brand suffix (" — inApp", ja "｜inApp") fits 65 width units, CJK counting double.
const TITLE_BUDGET = 65;
const BRAND_WIDTH = 8;
/** Niche <title>s may run to 70: the head term plus «топ-N» is what they rank for (§6.1). */
export const NICHE_TITLE_BUDGET = 70;

/**
 * A long text (a task's job) as a <title>: cut at a word boundary (ja: at any character) so
 * that the title plus the brand suffix fits the search-result width budget, then «…».
 */
export function clampTitle(text: string, locale: Locale): string {
  const title = text.trim().replace(/\s+/gu, " ");
  const room = TITLE_BUDGET - BRAND_WIDTH;
  if (displayWidth(title) <= room) return title;
  const chars = [...title];
  let width = 1; // the ellipsis
  let end = 0;
  for (; end < chars.length; end++) {
    const w = displayWidth(chars[end]);
    if (width + w > room) break;
    width += w;
  }
  let head = chars.slice(0, end).join("");
  // Cut inside a word: fall back to the last space (not for Japanese, which has none).
  if (locale !== "ja" && !/\s/u.test(chars[end] ?? " ")) {
    const space = head.search(/\s\S*$/u);
    if (space >= room * 0.5) head = head.slice(0, space);
  }
  return `${head.replace(/[\s,;:.—–-]+$/u, "")}…`;
}

// ---------------------------------------------------------------------------------------------
// Niche names, titles and descriptions
// ---------------------------------------------------------------------------------------------

/** What the title helpers read of a niche (sitedata `RatingNiche`). */
type NicheNames = { name: string; seoName: string | null };

/**
 * The niche as H1s and <title>s name it: the search head term of the data file (`seoName`,
 * §6.2: ru «трекинга привычек» completes «Лучшие приложения для …», en "habit tracker"
 * completes "Best … apps") on ru/en pages; the topic name on de/fr/ja pages (§6.1).
 */
export function h1Name(locale: Locale, niche: NicheNames): string {
  return (locale === "ru" || locale === "en") && niche.seoName ? niche.seoName : niche.name;
}

/**
 * The niche page's <title>: the longest of «…: топ-N по отзывам», «…: топ-N» and the bare H1
 * that fits NICHE_TITLE_BUDGET with the brand suffix; else the bare H1.
 */
export function nicheTitle(locale: Locale, niche: NicheNames & { count: number }): string {
  const s = ratingStrings[locale];
  const vars = { name: h1Name(locale, niche), count: niche.count };
  const variants = [s.nicheMetaTitle, s.nicheMetaTitleShort, s.nicheH1].map((tpl) => format(tpl, vars));
  return variants.find((v) => displayWidth(v) + BRAND_WIDTH <= NICHE_TITLE_BUDGET) ?? variants[variants.length - 1];
}

/**
 * The niche page's meta description: the count, the head term, the reviews read and the top 3
 * by short name («Лидеры: Hevy, Way of Life и Awesome Habits»), clamped to 155 (ja 80).
 */
export function nicheDescription(
  locale: Locale,
  niche: NicheNames & { count: number; totalReviews: number; apps: ReadonlyArray<{ short: string }> },
): string {
  const s = ratingStrings[locale];
  const top = new Intl.ListFormat(INTL_LOCALE[locale], { type: "conjunction" }).format(
    niche.apps.slice(0, 3).map((a) => displayTitle(a.short)),
  );
  return clampDescription(
    format(s.nicheMetaDescription, {
      apps: counted(locale, niche.count, s.appsWord),
      count: niche.count,
      name: h1Name(locale, niche),
      reviews: counted(locale, niche.totalReviews, s.reviewsByWord),
      top,
    }),
    locale,
  );
}

/** The catalogue's <title>: «Рейтинг приложений по отзывам: лучшие в 71 теме». */
export function catalogueTitle(locale: Locale, topics: number): string {
  const s = ratingStrings[locale];
  return format(s.metaTitle, { topics: counted(locale, topics, s.topicsInWord) });
}

// ---------------------------------------------------------------------------------------------
// Task pages
// ---------------------------------------------------------------------------------------------

type TaskScenario = { name: string | null; job: string; gap: string | null };
/** What the task helpers read of a task page's data (sitedata `getRatingScenario`). */
type TaskView = { niche: NicheNames; scenario: TaskScenario; apps: ReadonlyArray<unknown> };

/** «{audience}: приложения для {name}» — the task title before any clamping. */
function taskHead(locale: Locale, niche: NicheNames, audience: string): string {
  return format(ratingStrings[locale].taskMetaTitle, { audience, name: h1Name(locale, niche) });
}

/** A <title> fits the search-result width with the brand suffix, unclamped. */
function fitsTitle(title: string): boolean {
  return displayWidth(title) + BRAND_WIDTH <= TITLE_BUDGET;
}

/**
 * A task page's <title>: the audience and the niche head term («Новички: приложения для
 * трекинга привычек»); the job when the audience name is missing. A de/fr/ja page (English data)
 * whose own template is too wide takes the English title of its canonical when that fits, instead
 * of a half-English title cut mid-phrase; anything else too wide is clamped.
 */
export function taskTitle(locale: Locale, niche: NicheNames, scenario: TaskScenario): string {
  if (!scenario.name) return clampTitle(scenario.job, locale);
  const own = taskHead(locale, niche, scenario.name);
  if (fitsTitle(own)) return own;
  const dl = toOldLocale(locale);
  if (dl !== locale) {
    const canonical = taskHead(dl, niche, scenario.name);
    if (fitsTitle(canonical)) return canonical;
  }
  return clampTitle(own, locale);
}

/**
 * The task page is indexable (§6.1, D11): it has the gap text, an audience name, at least 3 rated
 * apps and a title that fits the budget unclamped (ru 31, en 68 today). Every other task page is
 * `noindex, follow`. de/fr/ja pages follow their canonical — the English page — so they are
 * judged by the English title: an indexable copy never points at a noindex canonical.
 */
export function isIndexableTask(
  locale: Locale,
  niche: NicheNames,
  view: { scenario: TaskScenario; apps: ReadonlyArray<unknown> },
): boolean {
  const { scenario } = view;
  if (!scenario.gap || !scenario.name || view.apps.length < 3) return false;
  return fitsTitle(taskHead(toOldLocale(locale), niche, scenario.name));
}

/** Which data-language copies of one task are indexable (null view = that page does not exist). */
export function taskIndex(ru: TaskView | null, en: TaskView | null): Record<OldLocale, boolean> {
  return { ru: ru !== null && isIndexableTask("ru", ru.niche, ru), en: en !== null && isIndexableTask("en", en.niche, en) };
}

/**
 * A task page's canonical and hreflang. Unlike the other rating pages, indexability is decided
 * per language (D11: the ru and en titles differ in width), and a hreflang target must be
 * indexable itself: the canonical page names itself and the other data language only when both
 * are indexable (x-default = en when en is); a page whose canonical is noindex declares its
 * canonical only. The sitemap entries use the same alternates (rating-sitemap.ts).
 */
export function taskAlternates(locale: Locale, path: string, index: Record<OldLocale, boolean>): NonNullable<Metadata["alternates"]> {
  const url = (l: OldLocale) => `${SITE_URL}/${l}/${path}`;
  const own = toOldLocale(locale);
  if (!index[own]) return { canonical: url(own) };
  const languages: Record<string, string> = {};
  for (const l of ["ru", "en"] as const) if (index[l]) languages[l] = url(l);
  if (index.en) languages["x-default"] = url("en");
  return { canonical: url(own), languages };
}

// ---------------------------------------------------------------------------------------------
// App pages
// ---------------------------------------------------------------------------------------------

/**
 * An app page's <title>: «Hevy: отзывы, плюсы и минусы». An app rated in 2 or more niches (342
 * apps) has a page in each, so the niche joins the title to keep every <title> unique. It goes
 * last — «Hevy: отзывы, плюсы и минусы (Привычки)» — so a cut in the search results drops the
 * niche, not the query words; the short form «Hevy: отзывы (Привычки)» when the long one is wider
 * than the budget (65 with the brand). A trailing parenthetical of the niche name goes (no nested
 * brackets). `niches` = ratingAppNiches(L, app.id).length.
 */
export function appTitle(locale: Locale, app: { short: string }, niche: { name: string }, niches: number): string {
  const s = ratingStrings[locale];
  if (niches < 2) return format(s.appMetaTitle, { app: app.short });
  const topic = niche.name.replace(/\s*[(（][^()（）]*[)）]$/u, "") || niche.name;
  const variants = [s.appMetaTitleNiche, s.appMetaTitleNicheShort].map((tpl) => format(tpl, { app: app.short, niche: topic }));
  return variants.find(fitsTitle) ?? variants[variants.length - 1];
}

/** A description's verdict opening is at least this long (characters), when the verdict is. */
const LEAD_MIN = 40;

/**
 * An app page's meta description (§6.1): the verdict's opening — its first sentence, with the
 * next ones while it is shorter than 40 characters («Fotor.», «Когда работает.» say nothing
 * alone) — plus the two scores («… Оценка по отзывам — 91 из 100, в App Store — 4,9★.») when that
 * fits uncut; otherwise the scores first, then the verdict up to the budget (clampDescription:
 * 155, ja 80 — a whole sentence when one ends past the middle, else a word and «…»). The template
 * naming the app is left for the apps without a verdict (22 ru, 32 en).
 */
export function appDescription(
  locale: Locale,
  app: { short: string; realScore: number | null; storeAvg: number | null; verdict: string | null },
): string {
  const s = ratingStrings[locale];
  const score = app.realScore ?? "—";
  const star = app.storeAvg !== null ? starText(locale, app.storeAvg) : "—";
  if (!app.verdict) return clampDescription(format(s.appMetaDescription, { app: displayTitle(app.short), score, star }), locale);
  const facts = format(s.appMetaFacts, { score, star });
  let opening = "";
  for (const sentence of points(app.verdict, toOldLocale(locale))) {
    opening = opening ? `${opening} ${sentence}` : sentence;
    if ([...opening].length >= LEAD_MIN) break;
  }
  const lead = `${opening} ${facts}`.trim();
  if (opening && clampDescription(lead, locale) === lead) return lead;
  return clampDescription(`${facts} ${app.verdict}`, locale);
}
