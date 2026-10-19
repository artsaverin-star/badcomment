// Sign in with Apple on the website. The Services ID (com.artsaverin.inapp.web) is grouped with the
// iOS app's primary App ID in the same team, so Apple gives a person the same `sub` here as in the
// app: a web sign-in lands in the account the app created (User.appleId), Plus bought in the app
// included. The Services ID comes from the build (repo variable APPLE_WEB_CLIENT_ID →
// NEXT_PUBLIC_APPLE_WEB_CLIENT_ID, also shows the button); APPLE_WEB_CLIENT_ID in the server env
// overrides it. No refresh token is kept for web sign-ins: revocation on account deletion
// (src/lib/appApple.ts) covers the app's tokens only.

/** The cookies of one web Apple sign-in live only under the Apple auth routes. */
export const APPLE_OAUTH_COOKIE_PATH = "/api/auth/apple";

export function appleWebClientId(): string | null {
  const id = (process.env.APPLE_WEB_CLIENT_ID || process.env.NEXT_PUBLIC_APPLE_WEB_CLIENT_ID || "").trim();
  return id || null;
}

/** Apple's `user` form field (first authorization only): {"name":{"firstName","lastName"},"email"}. */
export function appleWebFullName(raw: FormDataEntryValue | null): { givenName: string | null; familyName: string | null } | null {
  if (typeof raw !== "string" || !raw || raw.length > 2000) return null;
  try {
    const name = (JSON.parse(raw) as { name?: { firstName?: unknown; lastName?: unknown } })?.name;
    const pick = (v: unknown) => (typeof v === "string" ? v : null);
    return name ? { givenName: pick(name.firstName), familyName: pick(name.lastName) } : null;
  } catch {
    return null;
  }
}
