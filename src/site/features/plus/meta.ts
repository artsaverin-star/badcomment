import type { Metadata } from "next";
import { SITE_URL } from "../../config";
import type { Locale } from "../../i18n/locales";

// Share cards of the account pages (/plus, /login, /library). Without their own openGraph they
// inherit the root /opengraph-image — the old site's card that says "No paywall", which is the
// opposite of /plus (SEO review S5). Until composed 1200×630 cards exist, they show the app icon
// as a small "summary" card.

const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", en: "en_US", de: "de_DE", fr: "fr_FR", ja: "ja_JP" };

export function accountShareMeta(locale: Locale, url: string, title: string, description: string): Metadata {
  const image = { url: `${SITE_URL}/brand/app-icon-256.png`, width: 256, height: 256, alt: "inApp" };
  return {
    openGraph: { type: "website", siteName: "inApp", url, title, description, locale: OG_LOCALE[locale], images: [image] },
    twitter: { card: "summary", title, description, images: [image.url] },
  };
}
