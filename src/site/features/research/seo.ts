import type { Metadata } from "next";
import { SITE_URL } from "../../config";
import { LOCALES, type Locale } from "../../i18n/locales";
import { format, pluralCategory } from "../../i18n/translate";
import type { ResearchStrings } from "./strings";

// Canonical + hreflang for the research pages (spec 09 G9): self-canonical without query,
// all five locales, x-default → /en/…  `path` is the part after the locale ("segment/x").

export function localeAlternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const url = (l: Locale) => `${SITE_URL}/${l}${path ? `/${path}` : ""}`;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = url(l);
  languages["x-default"] = url("en");
  return { canonical: url(locale), languages };
}

/** Open Graph locale tags ("ru_RU", …). */
export const OG_LOCALE: Record<Locale, string> = {
  ru: "ru_RU",
  en: "en_US",
  de: "de_DE",
  fr: "fr_FR",
  ja: "ja_JP",
};

/** JSON for a <script type="application/ld+json">, safe inside HTML. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Indexable topic pages (the old topic pages had the same robots, review seo S8). */
export const TOPIC_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  "max-image-preview": "large",
  "max-snippet": -1,
};

// ---------------------------------------------------------------------------
// Titles and descriptions (review seo S2, S3, S10)
// ---------------------------------------------------------------------------

/** Search-result width budget of a full <title>, brand suffix included (CJK counts double). */
const TITLE_BUDGET = 65;
/** The root layout appends " — inApp" (ja "｜inApp"): at most 8 width units. */
const BRAND_WIDTH = 8;

/** A title with the brand, as the root layout's title.template renders it (for og:/twitter:title). */
export function withBrand(title: string, locale: Locale): string {
  return locale === "ja" ? `${title}｜inApp` : `${title} — inApp`;
}

const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u;

/** Rough display width: CJK and full-width characters count as 2. */
export function displayWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += WIDE.test(ch) ? 2 : 1;
  return w;
}

/**
 * <title> of a topic page (the layout adds the brand): the app's topic name plus the keywords
 * the old topic titles ranked for («Идеи приложений: … — что построить в нише»). The longest
 * variant that fits the budget wins; the H1 stays the app's name.
 */
export function topicTitle(s: ResearchStrings, name: string): string {
  const variants = [s.seoTitleLong, s.seoTitle, s.seoTitleShort].map((tpl) => format(tpl, { name }));
  return variants.find((v) => displayWidth(v) + BRAND_WIDTH <= TITLE_BUDGET) ?? variants[variants.length - 1];
}

/** "35 тем" / "35 topics" / "35のテーマ" with the app's plural rules. */
export function topicsCount(s: ResearchStrings, locale: Locale, n: number, number: (n: number) => string): string {
  const category = pluralCategory(locale, n);
  const tpl =
    category === "one" ? s.topicsOne : category === "few" ? s.topicsFew : category === "many" ? s.topicsMany : s.topicsOther;
  return format(tpl, { n: number(n) });
}

/**
 * Meta description ≤ 155 characters (ja: 80): cut at the last sentence end within the limit,
 * else at the last space, then add «…». The page itself and JSON-LD keep the full text.
 */
export function clampDescription(text: string, locale: Locale): string {
  const limit = locale === "ja" ? 80 : 155;
  const chars = [...text.trim()];
  if (chars.length <= limit) return text.trim();
  const head = chars.slice(0, limit - 1).join("");
  const sentenceEnd = Math.max(
    ...[". ", "! ", "? ", "。", "！", "？"].map((mark) => {
      const i = head.lastIndexOf(mark);
      return i < 0 ? -1 : i + mark.trimEnd().length;
    }),
  );
  if (sentenceEnd >= limit * 0.5) return head.slice(0, sentenceEnd);
  const space = head.search(/\s\S*$/);
  const cut = locale === "ja" || space < limit * 0.5 ? head : head.slice(0, space);
  return `${cut.replace(/[\s,;:—–-]+$/u, "")}…`;
}

// ---------------------------------------------------------------------------
// JSON-LD nodes (review seo S9)
// ---------------------------------------------------------------------------

/**
 * The site's Organization, inlined where Article needs it (Google's Rich Results Test does not
 * always resolve an @id defined in another <script>). Same @id as the root layout's node; the
 * logo stays with that node (review seo S6).
 */
export const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#org`,
  name: "inApp",
  url: SITE_URL,
} as const;

/** BreadcrumbList: inApp › {section} › {page}; each item = [name, absolute URL]. */
export function breadcrumbList(id: string, items: ReadonlyArray<readonly [string, string]>) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };
}
