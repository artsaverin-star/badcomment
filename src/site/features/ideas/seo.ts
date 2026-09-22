import { SITE_URL } from "@/site/config";
import { defineStrings, format } from "@/site/i18n/strings";
import { LOCALES, type Locale } from "@/site/i18n/locales";
import { pluralCategory } from "@/site/i18n/translate";

// Search-engine metadata of the ideas pages (spec 09 G9; review seo S3, S7–S11). Server only
// (imported by the page files), so none of this reaches a client bundle. The visible H1 and
// subtitle stay the app's (parity); only <title>, descriptions and OG/Twitter tags are web copy.

export function alternatesFor(
  locale: Locale,
  path: (l: Locale) => string,
): { canonical: string; languages: Record<string, string> } {
  const url = (l: Locale) => `${SITE_URL}${path(l)}`;
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
  };
}

/** Open Graph locale tags (same values as research/landing). */
export const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", en: "en_US", de: "de_DE", fr: "fr_FR", ja: "ja_JP" };

/** The site's Organization node, inlined (Rich Results do not always resolve bare @id refs). */
export const ORG_REF = { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "inApp", url: SITE_URL } as const;

/** Serialize JSON-LD safely inside <script> (no "</script>" breakout). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * A meta description of at most 155 characters (ja: 80): cut at the last sentence end inside
 * the limit, otherwise at the last space, and add «…». JSON-LD keeps the full text.
 */
export function clampDescription(text: string, locale: Locale): string {
  const limit = locale === "ja" ? 80 : 155;
  const clean = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(clean);
  if (chars.length <= limit) return clean;
  const head = chars.slice(0, limit).join("");
  // Last sentence end inside the limit (the mark is kept; the following space is not).
  const sentence = Math.max(...[". ", "! ", "? ", "。", "！", "？"].map((m) => head.lastIndexOf(m)));
  if (sentence >= limit * 0.5) return head.slice(0, sentence + 1);
  const space = head.lastIndexOf(" ");
  const cut = space >= limit * 0.5 ? head.slice(0, space) : chars.slice(0, limit - 1).join("");
  return `${cut.replace(/[\s,;:–—-]+$/u, "")}…`;
}

const seoStrings = defineStrings({
  ru: {
    catalogTitle: "Идеи приложений из реальных отзывов",
    catalogDescription:
      "{ideas} приложений из разборов реальных отзывов в {topics}: что можно создать или улучшить. Бесплатно открыты {free}.",
    ideaTitle: "{title} — идея приложения",
  },
  en: {
    catalogTitle: "App ideas from real user reviews",
    catalogDescription:
      "{ideas} app ideas from review breakdowns across {topics} topics: what could be built or improved. {free} ideas are free to read.",
    ideaTitle: "{title} — app idea",
  },
  de: {
    catalogTitle: "App-Ideen aus echten Rezensionen",
    catalogDescription:
      "{ideas} App-Ideen aus Analysen echter Rezensionen in {topics} Themen: was sich bauen oder verbessern lässt. {free} Ideen sind kostenlos.",
    ideaTitle: "{title} — App-Idee",
  },
  fr: {
    catalogTitle: "Idées d’apps tirées de vrais avis",
    catalogDescription:
      "{ideas} idées d’apps issues de décryptages d’avis dans {topics} thèmes : ce qu’on peut créer ou améliorer. {free} idées sont gratuites.",
    ideaTitle: "{title} — idée d’app",
  },
  ja: {
    catalogTitle: "口コミから生まれたアプリのアイデア",
    catalogDescription:
      "{topics}分野の口コミ分析から生まれた{ideas}件のアプリアイデア。何をつくれるか、何を良くできるか。{free}件のアイデアは無料で読めます。",
    ideaTitle: "{title}｜アプリのアイデア",
  },
});

/** Russian case forms the app packs do not carry ("в 35 темах"). */
const ruTopicsIn = (n: number) => `${n} ${pluralCategory("ru", n) === "one" ? "теме" : "темах"}`;

/**
 * `/ideas` title and description with the counts from data (ideas, topics, free ideas).
 * `countIdea` is the page's t.count("идея", n) (ru: "293 идеи", "5 идей").
 */
export function ideasCatalogMeta(
  locale: Locale,
  counts: { ideas: number; topics: number; free: number },
  fmt: { number: (n: number) => string; countIdea: (n: number) => string },
): { title: string; description: string } {
  const s = seoStrings[locale];
  const vars =
    locale === "ru"
      ? { ideas: fmt.countIdea(counts.ideas), topics: ruTopicsIn(counts.topics), free: fmt.countIdea(counts.free) }
      : { ideas: fmt.number(counts.ideas), topics: fmt.number(counts.topics), free: fmt.number(counts.free) };
  return { title: s.catalogTitle, description: format(s.catalogDescription, vars) };
}

/** `<title>` of a readable idea: the card title + "app idea" (the H1 stays the card title). */
export function ideaSeoTitle(locale: Locale, title: string): string {
  return format(seoStrings[locale].ideaTitle, { title });
}
