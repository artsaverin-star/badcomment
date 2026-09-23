import { APP_AUTH_CHALLENGE_PARAM } from "@/lib/appFlow";
import type { Locale } from "../../i18n/locales";
import { href, queryString } from "../../routing";

// Sign-in for the iOS app (docs/site-v2/APP-ACCOUNTS.md). Client-safe and pure.
//
//   app → ASWebAuthenticationSession → /api/app/auth/handoff/start?locale=<L>
//       → /<L>/login?app=1&return_to=/<L>/app-auth   (sign in on the website, "app mode")
//       → /<L>/app-auth                               (mints a one-time code, server-side)
//       → 307 inapp://auth?code=…                      (the session hands the URL to the app)
//
// The e-mail link opens outside the app's sign-in sheet (Mail → Safari), so it comes back to
// /<L>/app-auth?from=email: that variant renders a screen with «Открыть приложение» and opens
// inapp://auth?code=… from the page, so a declined or missed prompt is not a dead end.
// Codes and the inapp:// URL come from the server module src/lib/appAuth.ts; the PKCE binding
// of the code to the app install is explained in src/lib/appFlow.ts.

/** ?from=email on /<L>/app-auth: the request did not come from the app's sign-in sheet. */
export const APP_AUTH_FROM_EMAIL = "email";

/**
 * Public path of the hand-off page: /<L>/app-auth[?from=email[&c=<challenge>]]. The challenge
 * only rides along in the e-mail link's return path (the verify route turns it into the cookie).
 */
export function appAuthPath(
  locale: Locale,
  opts: { from?: typeof APP_AUTH_FROM_EMAIL; challenge?: string | null } = {},
): string {
  return (
    href(locale, "app-auth") +
    queryString({ from: opts.from, [APP_AUTH_CHALLENGE_PARAM]: opts.from ? opts.challenge || undefined : undefined })
  );
}

/** The sign-in page in app mode, coming back to the hand-off page. */
export function appLoginPath(locale: Locale): string {
  return href(locale, "login") + queryString({ app: 1, return_to: appAuthPath(locale) });
}

/** `?app=1` (first value when repeated). */
export function isAppMode(value: string | string[] | undefined | null): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "1";
}

/**
 * The Telegram app's own link for a bot deep link (https://t.me|telegram.me/<bot>?start=<p>
 * → tg://resolve?domain=<bot>&start=<p>). Inside the app's sign-in sheet a custom-scheme link
 * switches to Telegram and leaves this page (and its polling) in place, while an https link
 * could replace the page. null when the URL is not a bot link.
 */
export function telegramAppLink(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !/^(t\.me|telegram\.me)$/i.test(u.hostname)) return null;
    const bot = u.pathname.replace(/^\/+|\/+$/g, "");
    const start = u.searchParams.get("start");
    if (!/^[A-Za-z0-9_]{3,64}$/.test(bot) || !start || !/^[A-Za-z0-9_-]{1,64}$/.test(start)) return null;
    return `tg://resolve?domain=${bot}&start=${start}`;
  } catch {
    return null;
  }
}
