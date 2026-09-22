import type { Metadata } from "next";
import { SITE_URL } from "@/site/config";
import { LOCALES, type Locale } from "@/site/i18n/locales";

// Canonical + hreflang for the ideas pages (spec 09 G9): a self-canonical without query
// parameters, the 5 locales, and x-default → /en/….

export function alternatesFor(locale: Locale, path: (l: Locale) => string): Metadata["alternates"] {
  const url = (l: Locale) => `${SITE_URL}${path(l)}`;
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
  };
}

/** Serialize JSON-LD safely inside <script> (no "</script>" breakout). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
