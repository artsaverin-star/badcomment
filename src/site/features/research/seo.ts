import type { Metadata } from "next";
import { SITE_URL } from "../../config";
import { LOCALES, type Locale } from "../../i18n/locales";

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
