// Pure logic of «Пульс»: query parsing, feed selection, the category embed, route resolution
// and the number phrases. No I/O — shared by the pages, the old archive bridge and the tests.

import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { format, pluralCategory } from "@/site/i18n/translate";
import { PAIN_LEVELS, painLevel, painScore, type PainLevel } from "./gauge";
import type { PulseStrings } from "./strings";
import type { PulseDemand, PulseNeed, PulseText } from "./types";
import { PULSE_NEED_ID, PULSE_SLUG } from "./validate";

// ---------------------------------------------------------------------------
// Feed query (?category=&q=&page=). Retired keys are ignored: the prototype's view, scope and
// sort, and kind (the «Все · Просят · Жалуются» switch, removed by the owner on 2026-09-25).
// ---------------------------------------------------------------------------

export type PulseQuery = { q: string; category: string; page: number };
export type RawPulseQuery = Record<string, string | string[] | undefined>;
/** Divisible by 2 and 3, so every grid row is full. */
export const PULSE_PAGE_SIZE = 24;
/** Needs shown in «Пульс категории»: the #1 as the lead with its gauge, then rows #2…#5. */
export const PULSE_EMBED_LIMIT = 5;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function parsePulseQuery(raw: RawPulseQuery): PulseQuery {
  const page = Number(first(raw.page));
  const category = first(raw.category).trim().slice(0, 100);
  return {
    q: first(raw.q).trim().slice(0, 200),
    category: PULSE_SLUG.test(category) ? category : "",
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

/** True when the feed shows its canonical, indexable state. */
export function isDefaultPulseQuery(q: PulseQuery): boolean {
  return !q.q && !q.category && q.page === 1;
}

/** The need's text in the page locale (the build guarantees all five; English as a safety net). */
export function needText(text: PulseText, locale: Locale): string {
  return text[locale] || text.en || text.ru || "";
}

/** Global feed order (the file's order): score desc, then share desc, then id. */
export function byStrength(a: PulseNeed, b: PulseNeed): number {
  return b.score - a.score || b.share - a.share || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Feed: category ∩ every search word (title or summary in the page locale). */
export function selectPulseNeeds(needs: readonly PulseNeed[], query: PulseQuery, locale: Locale): PulseNeed[] {
  const words = query.q.toLocaleLowerCase(INTL_LOCALE[locale]).split(/\s+/).filter(Boolean);
  return needs
    .filter((need) => {
      if (query.category && need.categoryId !== query.category) return false;
      if (!words.length) return true;
      const text = `${needText(need.title, locale)} ${needText(need.summary, locale)}`.toLocaleLowerCase(INTL_LOCALE[locale]);
      return words.every((word) => text.includes(word));
    })
    .sort(byStrength);
}

/** Needs of one category, strongest first (rank 1 = strongest). */
export function categoryNeeds(data: Pick<PulseDemand, "needs">, categoryId: string): PulseNeed[] {
  return data.needs.filter((need) => need.categoryId === categoryId).sort((a, b) => a.rank - b.rank || byStrength(a, b));
}

/** The one data test for «Пульс категории»: the section AND its TOC entry exist only then. */
export function hasCategoryPulse(data: Pick<PulseDemand, "needs">, categoryId: string): boolean {
  return data.needs.some((need) => need.categoryId === categoryId);
}

// ---------------------------------------------------------------------------
// Detail route: /<L>/pulse/<category>--<slug>
// ---------------------------------------------------------------------------

export type PulseRoute =
  | { type: "need"; need: PulseNeed }
  /** A retired prototype/insight URL: the feed, filtered by its category when it is known. */
  | { type: "redirect"; category: string | null }
  | { type: "notFound" };

/** Decode a route parameter once (proxy rewrites may keep %-escapes); null when malformed. */
export function decodeRouteParam(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * Prototype ids had colons ("dating-apps:insight:66dc…", ":signal:", ":pattern:"); the iOS
 * prototype routed "insight/<id>". Any id with a colon or the word "insight" is retired.
 */
export function isRetiredPulseId(id: string): boolean {
  return id.includes(":") || /(^|[^a-z])insights?([^a-z]|$)/.test(id);
}

/** The category a retired id belonged to, when it is still a Pulse category. */
export function retiredCategory(id: string, categories: ReadonlySet<string>): string | null {
  const candidate = id.replace(/^insights?[/:]/, "").split(/[:/]/)[0];
  return PULSE_SLUG.test(candidate) && categories.has(candidate) ? candidate : null;
}

export function resolvePulseRoute(rawId: string, data: Pick<PulseDemand, "needs" | "categories">): PulseRoute {
  const id = decodeRouteParam(rawId);
  if (id === null || id.length > 300) return { type: "notFound" };
  if (PULSE_NEED_ID.test(id)) {
    const need = data.needs.find((item) => item.id === id);
    return need ? { type: "need", need } : { type: "notFound" };
  }
  if (isRetiredPulseId(id)) {
    return { type: "redirect", category: retiredCategory(id, new Set(data.categories.map((c) => c.id))) };
  }
  return { type: "notFound" };
}

// ---------------------------------------------------------------------------
// Number phrases
// ---------------------------------------------------------------------------

type Forms = { one: string; few: string; many: string };
const forms = (s: PulseStrings, key: "reviews" | "apps" | "inApps" | "needs" | "allNeeds" | "aboutApps"): Forms => ({
  one: s[`${key}One`],
  few: s[`${key}Few`],
  many: s[`${key}Many`],
});

function plural(locale: Locale, n: number, f: Forms): string {
  const category = pluralCategory(locale, n);
  return category === "one" ? f.one : category === "few" ? f.few : f.many;
}

export function formatNumber(locale: Locale, n: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}

/** «267 отзывов» / "267 reviews". */
export function reviewsPhrase(locale: Locale, s: PulseStrings, n: number): string {
  return format(plural(locale, n, forms(s, "reviews")), { n: formatNumber(locale, n) });
}

/** «67 приложений» / "67 apps". */
export function appsPhrase(locale: Locale, s: PulseStrings, n: number): string {
  return format(plural(locale, n, forms(s, "apps")), { n: formatNumber(locale, n) });
}

/** «8 потребностей» / "8 needs" (the subtitle of «Пульс категории»). */
export function needsPhrase(locale: Locale, s: PulseStrings, n: number): string {
  return format(plural(locale, n, forms(s, "needs")), { n: formatNumber(locale, n) });
}

/** «Все 7 потребностей» / "All 7 needs" (the link under «Пульс категории»). */
export function allNeedsPhrase(locale: Locale, s: PulseStrings, n: number): string {
  return format(plural(locale, n, forms(s, "allNeeds")), { n: formatNumber(locale, n) });
}

/** «45 975 отзывов о 100 приложениях» / "45,975 reviews of 100 apps" (agrees with the app count). */
export function aboutAppsPhrase(locale: Locale, s: PulseStrings, reviews: number, apps: number): string {
  return format(plural(locale, apps, forms(s, "aboutApps")), { reviews: reviewsPhrase(locale, s, reviews), n: formatNumber(locale, apps) });
}

/** «в 67 из 100 приложений» / "in 67 of 100 apps" (ru/en/de agree with the total, fr with n). */
export function inAppsPhrase(locale: Locale, s: PulseStrings, n: number, total: number): string {
  const template = plural(locale, locale === "fr" ? n : total, forms(s, "inApps"));
  return format(template, { n: formatNumber(locale, n), total: formatNumber(locale, total) });
}

/** The two facts of a need: «267 отзывов», «в 67 из 100 приложений» (rendered by PulseFactList). */
export function countsFacts(locale: Locale, s: PulseStrings, need: Pick<PulseNeed, "reviewCount" | "appCount" | "categoryAppCount">): [string, string] {
  return [reviewsPhrase(locale, s, need.reviewCount), inAppsPhrase(locale, s, need.appCount, need.categoryAppCount)];
}

/** The card's grey line as text: «267 отзывов · в 67 из 100 приложений». */
export function countsLine(locale: Locale, s: PulseStrings, need: Pick<PulseNeed, "reviewCount" | "appCount" | "categoryAppCount">): string {
  return countsFacts(locale, s, need).join(" · ");
}

// ---------------------------------------------------------------------------
// Word level (thresholds: painLevel in ./gauge.ts)
// ---------------------------------------------------------------------------

const LEVEL_KEY: Record<PainLevel, "levelMild" | "levelNoticeable" | "levelStrong" | "levelAcute"> = {
  mild: "levelMild",
  noticeable: "levelNoticeable",
  strong: "levelStrong",
  acute: "levelAcute",
};

/** «Сильная» / "Strong" for a 7. */
export function levelWord(s: PulseStrings, score: number): string {
  return s[LEVEL_KEY[painLevel(score)]];
}

/** «боль 7 из 10» (under the word level). */
export function painOfPhrase(s: PulseStrings, score: number): string {
  return format(s.painOf, { score: painScore(score) });
}

/** «Боль 7 из 10, сильная.» for screen readers. */
export function painAria(locale: Locale, s: PulseStrings, score: number): string {
  return format(s.painAria, { score: painScore(score), level: levelWord(s, score).toLocaleLowerCase(INTL_LOCALE[locale]) });
}

/** «Боль 7 из 10, сильная. 267 отзывов, в 67 из 100 приложений.» — the text alternative of a card or row. */
export function needAria(locale: Locale, s: PulseStrings, need: Pick<PulseNeed, "score" | "reviewCount" | "appCount" | "categoryAppCount">): string {
  const counts = format(s.countsAria, {
    reviews: reviewsPhrase(locale, s, need.reviewCount),
    apps: inAppsPhrase(locale, s, need.appCount, need.categoryAppCount),
  });
  return `${painAria(locale, s, need.score)}${locale === "ja" ? "" : " "}${counts}`;
}

/** «1–3 фоновая · 4–6 заметная · 7–8 сильная · 9–10 острая» for «Как считаем». */
export function levelScale(locale: Locale, s: PulseStrings): string {
  return PAIN_LEVELS.map((band) => `${band.from}–${band.to} ${levelWord(s, band.from).toLocaleLowerCase(INTL_LOCALE[locale])}`).join(" · ");
}


/** «0,6 %» with one decimal; below 0.1 % → «<0,1 %». */
export function sharePercent(locale: Locale, share: number): string {
  const pct = new Intl.NumberFormat(INTL_LOCALE[locale], { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return share < 0.001 ? `<${pct.format(0.001)}` : pct.format(share);
}

/** «проверено вручную: 48 из 55», or null when nothing was hand-checked. */
export function verifiedPhrase(locale: Locale, s: PulseStrings, need: Pick<PulseNeed, "precision" | "precisionSample">): string | null {
  if (need.precision === null || !need.precisionSample) return null;
  const correct = Math.round(need.precision * need.precisionSample);
  return format(s.verified, { correct: formatNumber(locale, correct), sample: formatNumber(locale, need.precisionSample) });
}
