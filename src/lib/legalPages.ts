// Pages the inApp iOS app opens from Settings: /offer (Terms of Use) and
// /contacts (Support). App Review reads them, so the shared chrome must not
// show website prices or buy buttons there (App Store Guideline 3.1.1).
// Client-safe: no server imports.

// External documents both pages link to (same URLs as in App Store Connect).
export const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
export const IOS_PRIVACY_URL = "https://artsaverin-star.github.io/legal/inapp/privacy.html";
export const APPLE_REFUND_URL = "https://reportaproblem.apple.com";

const NO_COMMERCE_PATHS = new Set(["/offer", "/contacts"]);

// usePathname() can return either the browser URL (/en/offer) or the path the
// locale proxy rewrote it to (/offer), so strip the locale prefix first.
export function isNoCommercePath(pathname: string | null | undefined): boolean {
  const path = (pathname || "/").replace(/^\/(ru|en)(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  return NO_COMMERCE_PATHS.has(path);
}
