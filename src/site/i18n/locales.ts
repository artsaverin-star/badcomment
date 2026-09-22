// Locales of the new site + locale negotiation. Pure and edge-safe: no fs, no
// next/headers, no React. Imported by src/proxy.ts (through the routing decision),
// by server code and by client components alike.
//
// Negotiation is the web port of the app's AppLocale.restore (docs/site-v2/spec/09 §2.2):
//   1. an explicit locale in the URL always wins (the proxy never redirects it away);
//   2. bare paths: the `locale` cookie if it is one of the five;
//   3. otherwise Accept-Language in q-order — for each tag: an exact match, then the base
//      language (de-CH → de), then any available locale that starts with `<base>-`;
//   4. otherwise `en` (the app's default, Resources/locales.json).

/** Display/picker order is fixed: Русский, English, Deutsch, Français, 日本語. */
export const LOCALES = ["ru", "en", "de", "fr", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Native names; never translated (APP/Content/AppLocale.swift). */
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  ja: "日本語",
};

/** BCP 47 tags for Intl formatting (numbers, dates, plural rules). */
export const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  ja: "ja-JP",
};

/** The old site speaks only ru and en. */
export const OLD_LOCALES = ["ru", "en"] as const;
export type OldLocale = (typeof OLD_LOCALES)[number];

/** Shared with the old site (which maps any non-`en` value to Russian). */
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isOldLocale(value: unknown): value is OldLocale {
  return value === "ru" || value === "en";
}

/** Old-site locale for a new-site locale: ru stays ru, everything else reads the English archive. */
export function toOldLocale(l: string | null | undefined): OldLocale {
  return l === "ru" ? "ru" : "en";
}

/**
 * Accept-Language → language tags ordered by q (stable for equal q), lower-cased,
 * without `*` and without tags explicitly refused with q=0.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  const entries: { tag: string; q: number; i: number }[] = [];
  header.split(",").forEach((part, i) => {
    const [rawTag, ...params] = part.trim().split(";");
    const tag = rawTag?.trim().toLowerCase();
    if (!tag || tag === "*") return;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split("=");
      if (k?.trim() === "q") {
        const n = Number.parseFloat(v ?? "");
        q = Number.isFinite(n) ? n : 0;
      }
    }
    if (q <= 0) return;
    entries.push({ tag, q, i });
  });
  entries.sort((a, b) => b.q - a.q || a.i - b.i);
  return entries.map((e) => e.tag);
}

/** One Accept-Language tag → a supported locale, or null. */
export function matchLanguageTag(tag: string): Locale | null {
  const t = tag.trim().toLowerCase().replace(/_/g, "-");
  if (!t) return null;
  if (isLocale(t)) return t; // exact
  const base = t.split("-")[0];
  if (isLocale(base)) return base; // base language (de-CH → de)
  // any available locale that starts with `<base>-` (none of today's five have a region,
  // kept so the rule survives adding e.g. "pt-BR")
  const prefixed = (LOCALES as readonly string[]).find((l) => l.startsWith(`${base}-`));
  return (prefixed as Locale | undefined) ?? null;
}

export function negotiateLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  for (const tag of parseAcceptLanguage(input.acceptLanguage)) {
    const hit = matchLanguageTag(tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
