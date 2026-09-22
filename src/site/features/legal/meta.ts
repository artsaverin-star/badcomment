import type { Metadata } from "next";
import { SITE_URL } from "@/site/config";
import { LOCALES, type Locale } from "@/site/i18n/locales";

// Metadata for the pages of the legal / settings / welcome features (spec 09 G9):
// title and description in the page locale, a self-canonical without query, hreflang for the
// five locales + x-default (en), robots per page. Server-only by usage (plain data).

export function pageMetadata({
  locale,
  path,
  title,
  description,
  index,
  image,
}: {
  locale: Locale;
  /** Public path of this page in a locale, e.g. (l) => routes.offer(l). */
  path: (l: Locale) => string;
  title: string;
  description?: string;
  index: boolean;
  /** Absolute or site-relative Open Graph image. */
  image?: string;
}): Metadata {
  const url = (l: Locale) => `${SITE_URL}${path(l)}`;
  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: url(locale),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    openGraph: {
      title: `${title} — inApp`,
      ...(description ? { description } : {}),
      url: url(locale),
      siteName: "inApp",
      locale,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
  };
}
