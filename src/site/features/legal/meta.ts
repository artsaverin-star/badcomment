import type { Metadata } from "next";
import { SITE_URL } from "@/site/config";
import { LOCALES, type Locale } from "@/site/i18n/locales";

// Metadata for the pages of the legal / settings / welcome / saved features (spec 09 G9):
// title and description in the page locale, a self-canonical without query, hreflang for the
// five locales + x-default (en), robots per page, Open Graph + Twitter with the locale tag and
// an image of the new site. Server-only by usage (plain data).

/** Open Graph locale tags (og:locale wants language_TERRITORY). */
export const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", en: "en_US", de: "de_DE", fr: "fr_FR", ja: "ja_JP" };

/**
 * Default share image: the iOS app icon (512², public/media). Without one these pages would
 * show nothing or inherit the old site's «No paywall» card. Replace with the composed 1200×630
 * `/og/<L>/legal.png` once scripts/v2 generates it (review/seo.md S5).
 */
const DEFAULT_IMAGE = { url: "/media/app-icon-512.png", width: 512, height: 512, alt: "inApp" } as const;

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
  /** Absolute or site-relative 1200×630 Open Graph image (large Twitter card). */
  image?: string;
}): Metadata {
  const url = (l: Locale) => `${SITE_URL}${path(l)}`;
  const img = image ? { url: image } : DEFAULT_IMAGE;
  const abs = img.url.startsWith("/") ? `${SITE_URL}${img.url}` : img.url;
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
      locale: OG_LOCALE[locale],
      type: "website",
      images: [{ ...img, url: abs }],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} — inApp`,
      ...(description ? { description } : {}),
      images: [abs],
    },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
  };
}
