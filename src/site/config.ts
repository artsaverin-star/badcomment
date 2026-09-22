// Site-wide constants of the new site. Client-safe (no server imports).
import legal from "@/data/legal.json";

export const BRAND = "inApp";

/** Canonical origin for metadata, canonicals, hreflang and JSON-LD. */
export const SITE_URL = "https://inapp.pro";

/** The iOS app (in App Review since 2026-09-21, DECISIONS §13). */
export const APP_STORE_APP_ID = "6814396315";

/**
 * The App Store link of the iOS app. EMPTY while Apple reviews the app: every App Store
 * badge then opens the "in review, continue on the web" dialog instead of a link.
 * The owner pastes the link here by hand after approval, e.g.
 * "https://apps.apple.com/app/id6814396315". No automatic polling of Apple (DECISIONS §13).
 */
export const APP_STORE_URL: string = "";

/** Support address (src/data/legal.json, shared with the old site's contacts page). */
export const SUPPORT_EMAIL: string = legal.email;

/** Official "Download on the App Store" badge art (also asserted by the CI smoke tests). */
export const APP_STORE_BADGE_SRC = "/badges/app-store.svg";

/** First year of the © line. */
export const COPYRIGHT_YEAR = 2026;
