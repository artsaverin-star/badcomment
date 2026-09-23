// The iOS app's sign-in on the website (docs/site-v2/APP-ACCOUNTS.md): pure helpers shared by the
// sign-in API routes (Google start + callback, e-mail verify), /api/app/auth/handoff/start,
// /api/app/auth/exchange (via src/lib/appAuth.ts), the /<L>/app-auth page and the app-mode
// sign-in page. No Node, Next.js or database APIs: client-safe.
//
// 1. Failed sign-ins inside the app's sign-in sheet go back to /<L>/login?app=1 (no site chrome,
//    no Plus offers; App Review 3.1.1), never to the landing page.
// 2. PKCE (RFC 7636, S256) binds a hand-off code to the app install that started the sign-in:
//      app: verifier = random secret, challenge = SHA-256(verifier) (base64url or lowercase hex)
//      GET /api/app/auth/handoff/start?locale=<L>&challenge=<challenge>
//        → cookie ia_app_pkce = challenge (30 min; the sheet shares Safari's cookies)
//      /<L>/app-auth mints the code with the cookie's challenge
//      POST /api/app/auth/exchange {code, verifier} → only when SHA-256(verifier) = challenge
//    The e-mail link may open in another browser (no cookie): the app-mode sign-in page puts the
//    challenge into the e-mail link's return path (/<L>/app-auth?from=email&c=<challenge>), and
//    the verify route turns it back into the cookie once the link itself is verified. The
//    /<L>/app-auth page never reads a challenge from its own URL: anyone can send such a URL.

export const APP_FLOW_LOCALES = ["ru", "en", "de", "fr", "ja"] as const;
export type AppFlowLocale = (typeof APP_FLOW_LOCALES)[number];

/** /<L>/app-auth, optionally followed by a query, fragment or sub-path. */
const APP_AUTH_PATH_RE = /^\/(ru|en|de|fr|ja)\/app-auth(?=[/?#]|$)/;

/** Locale of a sign-in return path that ends the iOS app's sign-in (/<L>/app-auth…), else null. */
export function appFlowLocale(returnPath: unknown): AppFlowLocale | null {
  if (typeof returnPath !== "string") return null;
  const m = APP_AUTH_PATH_RE.exec(returnPath);
  return m ? (m[1] as AppFlowLocale) : null;
}

/**
 * Where a failed sign-in lands: the app's sign-in page (/<L>/login?app=1&…) when the sign-in
 * started in the app (its return path is /<L>/app-auth), else the historical `/?…`.
 * The notice keys are the ones the sign-in page understands (src/site/features/auth/copy.ts).
 */
export function authFailurePath(returnPath: unknown, notice: { auth: string } | { login: string }): string {
  const [key, value] = "auth" in notice ? ["auth", notice.auth] : ["login", notice.login];
  const q = `${key}=${encodeURIComponent(value)}`;
  const l = appFlowLocale(returnPath);
  return l ? `/${l}/login?app=1&${q}` : `/?${q}`; // old-links: allow (new-site sign-in page)
}

// ---------------------------------------------------------------------------
// PKCE

/** Cookie holding the code challenge between handoff/start and /<L>/app-auth. */
export const APP_PKCE_COOKIE = "ia_app_pkce";
/** The app accepts a web sign-in for 30 minutes after starting it; so does the cookie. */
export const APP_PKCE_COOKIE_MAX_AGE_S = 30 * 60;
/** Query parameter of the e-mail link's return path that carries the challenge. */
export const APP_AUTH_CHALLENGE_PARAM = "c";

const HEX_CHALLENGE_RE = /^[0-9a-fA-F]{64}$/;
const B64URL_CHALLENGE_RE = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/; // 32 bytes, canonical last char
const VERIFIER_RE = /^[A-Za-z0-9._~-]{32,128}$/;

/**
 * A code challenge (SHA-256 of the verifier) as lowercase hex, or null when `v` is not one.
 * Accepted encodings: base64url without padding (43 chars, RFC 7636 S256) or hex (64 chars).
 */
export function normalizeCodeChallenge(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (HEX_CHALLENGE_RE.test(v)) return v.toLowerCase();
  if (!B64URL_CHALLENGE_RE.test(v)) return null;
  const bin = atob(`${v.replace(/-/g, "+").replace(/_/g, "/")}=`);
  let hex = "";
  for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  return hex.length === 64 ? hex : null;
}

/** An RFC 7636 code verifier (unreserved characters; 32–128 of them, RFC minimum 43 relaxed). */
export function isCodeVerifier(v: unknown): v is string {
  return typeof v === "string" && VERIFIER_RE.test(v);
}

/**
 * Splits the challenge off an /<L>/app-auth return path (the e-mail link's `rt`):
 * `/ru/app-auth?from=email&c=<challenge>` → { path: "/ru/app-auth?from=email", challenge }.
 * Other paths come back unchanged with challenge null.
 */
export function takeAppAuthChallenge(returnPath: string): { path: string; challenge: string | null } {
  if (!appFlowLocale(returnPath)) return { path: returnPath, challenge: null };
  const hashAt = returnPath.indexOf("#");
  const beforeHash = hashAt === -1 ? returnPath : returnPath.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : returnPath.slice(hashAt);
  const q = beforeHash.indexOf("?");
  if (q === -1) return { path: returnPath, challenge: null };
  const params = new URLSearchParams(beforeHash.slice(q + 1));
  const challenge = normalizeCodeChallenge(params.get(APP_AUTH_CHALLENGE_PARAM));
  params.delete(APP_AUTH_CHALLENGE_PARAM);
  const rest = params.toString();
  return { path: `${beforeHash.slice(0, q)}${rest ? `?${rest}` : ""}${hash}`, challenge };
}
