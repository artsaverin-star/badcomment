// Pure logic of «Пульс»: query parsing, feed selection, the category embed, route resolution
// and the number phrases. No I/O — shared by the pages, the old archive bridge and the tests.

import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { format, pluralCategory } from "@/site/i18n/translate";
import type { PulseStrings } from "./strings";
import type { PulseDemand, PulseKind, PulseNeed, PulseText } from "./types";
import { PULSE_NEED_ID, PULSE_SLUG } from "./validate";

// ---------------------------------------------------------------------------
// Feed query (?category=&kind=&q=&page=). Retired prototype keys (view, scope, sort) are ignored.
// ---------------------------------------------------------------------------

export type PulseQuery = { q: string; category: string; kind: PulseKind | ""; page: number };
export type RawPulseQuery = Record<string, string | string[] | undefined>;
/** Divisible by 2 and 3, so every grid row is full. */
export const PULSE_PAGE_SIZE = 24;
/** Compact rows in the category embed «Пульс категории». */
export const PULSE_EMBED_LIMIT = 5;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export function parsePulseQuery(raw: RawPulseQuery): PulseQuery {
  const page = Number(first(raw.page));
  const category = first(raw.category).trim().slice(0, 100);
  const kind = first(raw.kind);
  return {
    q: first(raw.q).trim().slice(0, 200),
    category: PULSE_SLUG.test(category) ? category : "",
    kind: kind === "request" || kind === "pain" ? kind : "",
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

/** True when the feed shows its canonical, indexable state. */
export function isDefaultPulseQuery(q: PulseQuery): boolean {
  return !q.q && !q.category && !q.kind && q.page === 1;
}

/** The need's text in the page locale (the build guarantees all five; English as a safety net). */
export function needText(text: PulseText, locale: Locale): string {
  return text[locale] || text.en || text.ru || "";
}

/** Global feed order (the file's order): score desc, then share desc, then id. */
export function byStrength(a: PulseNeed, b: PulseNeed): number {
  return b.score - a.score || b.share - a.share || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Feed: category ∩ kind ∩ every search word (title or summary in the page locale). */
export function selectPulseNeeds(needs: readonly PulseNeed[], query: PulseQuery, locale: Locale): PulseNeed[] {
  const words = query.q.toLocaleLowerCase(INTL_LOCALE[locale]).split(/\s+/).filter(Boolean);
  return needs
    .filter((need) => {
      if (query.category && need.categoryId !== query.category) return false;
      if (query.kind && need.kind !== query.kind) return false;
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
const forms = (s: PulseStrings, key: "reviews" | "apps" | "inApps"): Forms => ({
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

/** «в 67 из 100 приложений» / "in 67 of 100 apps" (ru/en/de agree with the total, fr with n). */
export function inAppsPhrase(locale: Locale, s: PulseStrings, n: number, total: number): string {
  const template = plural(locale, locale === "fr" ? n : total, forms(s, "inApps"));
  return format(template, { n: formatNumber(locale, n), total: formatNumber(locale, total) });
}

/** The card's grey line: «267 отзывов · в 67 из 100 приложений». */
export function countsLine(locale: Locale, s: PulseStrings, need: Pick<PulseNeed, "reviewCount" | "appCount" | "categoryAppCount">): string {
  return `${reviewsPhrase(locale, s, need.reviewCount)} · ${inAppsPhrase(locale, s, need.appCount, need.categoryAppCount)}`;
}

/** «Боль 7 из 10.» for screen readers. */
export function painAria(s: PulseStrings, score: number): string {
  return format(s.painAria, { score });
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

export function kindLabel(s: PulseStrings, kind: PulseKind): string {
  return kind === "request" ? s.kindRequest : s.kindPain;
}
