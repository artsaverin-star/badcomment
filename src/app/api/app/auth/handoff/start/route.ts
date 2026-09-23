import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { appOrigin } from "@/lib/googleAuth";
import { handoffTarget, parseAppLocale } from "@/lib/appAuth";
import { APP_PKCE_COOKIE, APP_PKCE_COOKIE_MAX_AGE_S, normalizeCodeChallenge } from "@/lib/appFlow";
import { appJson, NO_STORE, rateLimit } from "@/lib/appHttp";

// GET /api/app/auth/handoff/start?locale=ru|en|de|fr|ja[&challenge=<S256>] — first stop of
// «Другой способ входа» in the iOS app (ASWebAuthenticationSession; docs/site-v2/APP-ACCOUNTS.md):
//   signed in on the website → 302 /<L>/app-auth (mints a one-time code → inapp://auth?code=…)
//   guest                    → 302 /<L>/login?app=1&return_to=/<L>/app-auth
// An unknown or missing locale falls back to en.
// `challenge` (alias `code_challenge`; PKCE, src/lib/appFlow.ts): SHA-256 of the app's verifier,
// base64url (43) or hex (64). Kept in the ia_app_pkce cookie (30 min) so /<L>/app-auth binds the
// code to it; without it the cookie is cleared. A malformed challenge → 400 bad_challenge.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimit(req, "handoff");
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  const locale = parseAppLocale(params.get("locale")) ?? "en";
  const rawChallenge = params.get("challenge") ?? params.get("code_challenge");
  const challenge = rawChallenge ? normalizeCodeChallenge(rawChallenge) : null;
  if (rawChallenge && !challenge) return appJson({ error: "bad_challenge" }, 400);
  let signedIn = false;
  try {
    signedIn = !!(await getSessionUser());
  } catch {
    signedIn = false; // no request cookies available: treat as a guest
  }
  const res = NextResponse.redirect(new URL(handoffTarget(locale, signedIn), appOrigin(req)), { status: 302, headers: NO_STORE });
  // Persistent (not a session cookie): ASWebAuthenticationSession shares persistent cookies with
  // Safari, where the e-mail link usually opens.
  res.cookies.set(APP_PKCE_COOKIE, challenge ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: challenge ? APP_PKCE_COOKIE_MAX_AGE_S : 0,
  });
  return res;
}
