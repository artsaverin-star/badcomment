import crypto from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { isCodeVerifier, normalizeCodeChallenge } from "./appFlow";
import { isSafeLocalPath } from "./safeReturn";

// iOS app accounts: bearer sessions, the website → app hand-off, and the `user` object of the
// app API (docs/site-v2/APP-ACCOUNTS.md). No Next.js APIs here: the new site's /<L>/app-auth
// page imports mintAppLoginCode + appAuthRedirectUrl, the /api/app/** routes import the rest.
//
// Secrets (session tokens, hand-off codes) are 32 random bytes, base64url (43 chars), handed
// out once; the database keeps only their SHA-256.

/** Locales of the new site; /api/app/auth/handoff/start accepts exactly these. */
export const APP_LOCALES = ["ru", "en", "de", "fr", "ja"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

/** Where /<L>/app-auth sends the one-time code (the iOS app's URL scheme). */
export const APP_AUTH_CALLBACK = "inapp://auth";
/** Hand-off codes live 5 minutes and work once. */
export const APP_LOGIN_CODE_TTL_MS = 5 * 60_000;
/** AppSession.lastUsedAt is written at most this often per session. */
const LAST_USED_THROTTLE_MS = 10 * 60_000;

const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

export function newAppSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** True for strings shaped like our tokens/codes (cheap reject before hashing + a DB read). */
export function isAppSecretShape(value: unknown): value is string {
  return typeof value === "string" && SECRET_RE.test(value);
}

// ---------------------------------------------------------------------------
// Sessions (Authorization: Bearer <token>)

/**
 * Opens an app session for the user and marks the account as used in the app (appLinkedAt,
 * which switches on the RevenueCat check). Returns the bearer token (shown once).
 */
export async function createAppSession(userId: string, deviceLabel?: string | null): Promise<string> {
  const token = newAppSecret();
  const label = typeof deviceLabel === "string" ? deviceLabel.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 64) || null : null;
  await prisma.$transaction([
    prisma.appSession.create({ data: { userId, tokenHash: sha256Hex(token), deviceLabel: label, lastUsedAt: new Date() } }),
    prisma.user.updateMany({ where: { id: userId, appLinkedAt: null }, data: { appLinkedAt: new Date() } }),
  ]);
  return token;
}

/** The token of `Authorization: Bearer <token>`, or null (absent, other scheme, malformed). */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(header);
  return m && isAppSecretShape(m[1]) ? m[1] : null;
}

/** True when the request carries `Authorization: Bearer …` (then cookies are not consulted). */
export function hasBearerHeader(req: Request): boolean {
  return /^Bearer(\s|$)/i.test(req.headers.get("authorization")?.trim() ?? "");
}

export type AppAuth = { sessionId: string; user: User };

/** The signed-in app user of a request (valid bearer token), else null. */
export async function authenticateBearer(req: Request): Promise<AppAuth | null> {
  const token = parseBearer(req.headers.get("authorization"));
  if (!token) return null;
  const session = await prisma.appSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session) return null;
  const now = Date.now();
  if (!session.lastUsedAt || now - session.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    await prisma.appSession
      .updateMany({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } })
      .catch(() => undefined);
  }
  return { sessionId: session.id, user: session.user };
}

/** Sign-out of one app install: its token stops working immediately. */
export async function revokeAppSession(sessionId: string): Promise<void> {
  await prisma.appSession.deleteMany({ where: { id: sessionId } });
}

// ---------------------------------------------------------------------------
// Website → app hand-off (Telegram / Google / e-mail sign-in inside ASWebAuthenticationSession)

/** "ru" | … for a supported locale, else null. */
export function parseAppLocale(value: unknown): AppLocale | null {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value) ? (value as AppLocale) : null;
}

/**
 * Where GET /api/app/auth/handoff/start sends the browser: the hand-off page when a website
 * session exists, else the sign-in page with return_to = that page (a same-site path, checked
 * with the one validator of sign-in return paths).
 */
export function handoffTarget(locale: AppLocale, signedIn: boolean): string {
  // New-site pages (the app's sign-in sheet), not old-site navigation: oldHref() does not apply.
  const appAuth = `/${locale}/app-auth`; // old-links: allow
  if (!isSafeLocalPath(appAuth)) throw new Error("unsafe app-auth path");
  if (signedIn) return appAuth;
  return `/${locale}/login?app=1&return_to=${encodeURIComponent(appAuth)}`; // old-links: allow
}

/**
 * One-time hand-off code for a website-signed-in user (called by the /<L>/app-auth page).
 * 32 random bytes, base64url; SHA-256 stored; valid 5 minutes; single use.
 * `challenge` (PKCE, src/lib/appFlow.ts): the code then works only with the matching verifier.
 */
export async function mintAppLoginCode(userId: string, opts: { challenge?: string | null } = {}): Promise<string> {
  const code = newAppSecret();
  const now = Date.now();
  const challenge = normalizeCodeChallenge(opts.challenge);
  // Housekeeping: codes are useless a minute after they expire.
  await prisma.appLoginCode.deleteMany({ where: { expiresAt: { lt: new Date(now - 60_000) } } }).catch(() => undefined);
  await prisma.appLoginCode.create({
    data: { codeHash: sha256Hex(code), userId, expiresAt: new Date(now + APP_LOGIN_CODE_TTL_MS), challenge },
  });
  return code;
}

/**
 * APP_HANDOFF_PKCE=required: every exchange must carry a verifier (codes minted without a
 * challenge become useless). Default: a code minted without a challenge can still be exchanged
 * without a verifier (app builds from before PKCE); a code with a challenge always needs its
 * verifier, and a verifier never redeems a code without a challenge.
 */
export function appHandoffPkceRequired(): boolean {
  return process.env.APP_HANDOFF_PKCE === "required";
}

/** `inapp://auth?code=…` — the redirect of the /<L>/app-auth page. */
export function appAuthRedirectUrl(code: string): string {
  return `${APP_AUTH_CALLBACK}?code=${encodeURIComponent(code)}`;
}

/**
 * Burns a hand-off code: its user id when it is known, unused, not expired and its PKCE binding
 * matches (see appHandoffPkceRequired), else null. A wrong verifier does not burn the code.
 */
export async function consumeAppLoginCode(code: unknown, verifier?: unknown): Promise<string | null> {
  if (!isAppSecretShape(code)) return null;
  let challenge: string | null = null;
  if (verifier !== undefined && verifier !== null && verifier !== "") {
    if (!isCodeVerifier(verifier)) return null;
    challenge = sha256Hex(verifier);
  } else if (appHandoffPkceRequired()) {
    return null;
  }
  const codeHash = sha256Hex(code);
  const now = new Date();
  // Atomic single use: exactly one caller flips usedAt (and only with the right verifier).
  const { count } = await prisma.appLoginCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: now }, challenge },
    data: { usedAt: now },
  });
  if (count !== 1) return null;
  const row = await prisma.appLoginCode.findUnique({ where: { codeHash }, select: { userId: true } });
  return row?.userId ?? null;
}

// ---------------------------------------------------------------------------
// The `user` object of the app API

export type AppSignInMethod = "apple" | "telegram" | "google" | "email";
export type AppUserPayload = { id: string; name: string | null; email: string | null; methods: AppSignInMethod[] };

/** Apple's "Hide My Email" relay addresses (mail reaches them only from registered senders). */
export function isAppleRelayEmail(email: string | null | undefined): boolean {
  return !!email && /@privaterelay\.appleid\.com$/i.test(email.trim());
}

export function appUserPayload(u: {
  id: string;
  firstName: string | null;
  username: string | null;
  email: string | null;
  appleId?: string | null;
  telegramId: string | null;
  googleId: string | null;
}): AppUserPayload {
  const methods: AppSignInMethod[] = [];
  if (u.appleId) methods.push("apple");
  if (u.telegramId) methods.push("telegram");
  if (u.googleId) methods.push("google");
  // Any real address can use the website's e-mail link sign-in (loginWithEmail matches by e-mail).
  if (u.email && !isAppleRelayEmail(u.email)) methods.push("email");
  return { id: u.id, name: u.firstName?.trim() || u.username?.trim() || null, email: u.email, methods };
}
