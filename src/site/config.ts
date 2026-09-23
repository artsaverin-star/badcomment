// Site-wide constants of the new site. Client-safe (no server imports).
import legal from "@/data/legal.json";
import type { Locale } from "./i18n/locales";

export const BRAND = "inApp";

/** Canonical origin for metadata, canonicals, hreflang and JSON-LD. */
export const SITE_URL = "https://inapp.pro";

/** The iOS app «App Ideas & Niches: inApp» — approved and on sale since 2026-09-23. */
export const APP_STORE_APP_ID = "6814396315";

/**
 * The App Store link of the iOS app. Storefront-neutral on purpose: Apple opens the
 * visitor's own country store (the site has 5 locales). Set to "" to bring back the
 * "in review, continue on the web" dialog on every badge.
 */
export const APP_STORE_URL: string = "https://apps.apple.com/app/id6814396315";

/** Support address = the developer e-mail in App Store Connect (src/data/legal.json → appDeveloper). */
export const SUPPORT_EMAIL: string = legal.appDeveloper.email;

/** Developer details exactly as in App Store Connect (Terms of Use, Support). */
export const APP_DEVELOPER = legal.appDeveloper;

/** The website's payment seller (YooKassa) — shown only in the payment offer at /offer/payment. */
export const WEB_SELLER = { fullName: legal.fullName, selfEmployed: legal.selfEmployed, inn: legal.inn, email: legal.email };

/** Official "Download on the App Store" badge art (also asserted by the CI smoke tests). */
export const APP_STORE_BADGE_SRC = "/badges/app-store.svg";

/**
 * Apple's localized badge artwork per locale, when it is added to public/badges (Apple
 * Marketing Resources, e.g. "/badges/app-store-ru.svg"). Empty today: every locale shows the
 * US-English art with a localized accessible name and caption (src/site/ui/AppStore.tsx).
 * Keep APP_STORE_BADGE_SRC on the topic pages (research TopicExtras): the CI smoke test greps
 * /ru/segment/* for it.
 */
export const APP_STORE_BADGE_LOCALIZED: Readonly<Partial<Record<Locale, string>>> = {};

/** First year of the © line. */
export const COPYRIGHT_YEAR = 2026;
