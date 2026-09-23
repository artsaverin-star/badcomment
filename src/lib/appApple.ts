import crypto from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "./prisma";
import { isAppleRelayEmail, sha256Hex } from "./appAuth";

// Sign in with Apple for the iOS app (docs/site-v2/APP-ACCOUNTS.md).
//
// The app sends Apple's identity token (a JWT signed RS256 by Apple) plus the raw nonce it
// generated; the token's `nonce` claim must be SHA-256(rawNonce) in hex. When the server has a
// Sign in with Apple key (env SIWA_KEY_ID + SIWA_PRIVATE_KEY + APPLE_TEAM_ID) it also redeems the
// one-time authorization code for a refresh token, stored encrypted, so that deleting the
// account can revoke the Apple sign-in (TN3194).

export const APPLE_ISSUER = "https://appleid.apple.com";
/** Bundle id of the iOS app = `aud` of its identity tokens = client_id at Apple's token API. */
export const APPLE_CLIENT_ID = "com.artsaverin.inapp";
const JWKS_URL = "https://appleid.apple.com/auth/keys";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";
const APPLE_HTTP_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Injection points (tests)

type Fetch = typeof fetch;
const realFetch: Fetch = (input, init) => fetch(input, init);
let appleFetch: Fetch = realFetch;

/** A function returning Apple's JWKS document ({keys: [...]}). */
export type JwksFetcher = () => Promise<unknown>;

async function fetchAppleJwks(): Promise<unknown> {
  const res = await appleFetch(JWKS_URL, { cache: "no-store", signal: AbortSignal.timeout(APPLE_HTTP_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
  return res.json();
}
let jwksFetcher: JwksFetcher = fetchAppleJwks;

/** Test hook: where the JWKS comes from (null = Apple). Clears the key cache. */
export function setAppleJwksFetcher(f: JwksFetcher | null) {
  jwksFetcher = f ?? fetchAppleJwks;
  jwksCache = null;
}

/** Test hook: HTTP client for Apple's token/revoke endpoints (null = the real fetch). */
export function setAppleFetch(f: Fetch | null) {
  appleFetch = f ?? realFetch;
}

// ---------------------------------------------------------------------------
// Apple's signing keys (cached)

const JWKS_TTL_MS = 6 * 60 * 60_000;
/** An unknown `kid` refetches the set, but not more often than this (key rotation). */
const JWKS_MIN_REFETCH_MS = 60_000;

let jwksCache: { keys: Map<string, crypto.KeyObject>; fetchedAt: number } | null = null;
let jwksLoading: Promise<void> | null = null;

/** Apple's JWKS could not be fetched and nothing is cached: the sign-in cannot be checked now. */
export class AppleUnavailableError extends Error {}
/** The identity token is not a valid, fresh Apple token for this app and nonce. */
export class AppleTokenError extends Error {}

async function loadJwks(): Promise<void> {
  if (!jwksLoading) {
    jwksLoading = (async () => {
      try {
        const doc = (await jwksFetcher()) as { keys?: unknown } | null;
        const keys = new Map<string, crypto.KeyObject>();
        for (const k of Array.isArray(doc?.keys) ? doc.keys : []) {
          const jwk = k as { kty?: unknown; kid?: unknown; n?: unknown; e?: unknown; use?: unknown };
          if (jwk.kty !== "RSA" || typeof jwk.kid !== "string" || typeof jwk.n !== "string" || typeof jwk.e !== "string") continue;
          if (jwk.use !== undefined && jwk.use !== "sig") continue;
          try {
            keys.set(jwk.kid, crypto.createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" }));
          } catch {
            // skip a malformed key
          }
        }
        if (!keys.size) throw new Error("JWKS without usable keys");
        jwksCache = { keys, fetchedAt: Date.now() };
      } finally {
        jwksLoading = null;
      }
    })();
  }
  return jwksLoading;
}

async function appleKey(kid: string): Promise<crypto.KeyObject | null> {
  const now = Date.now();
  const cached = jwksCache;
  if (cached) {
    const age = now - cached.fetchedAt;
    const key = cached.keys.get(kid);
    if (key && age < JWKS_TTL_MS) return key;
    if (!key && age < JWKS_MIN_REFETCH_MS) return null;
  }
  try {
    await loadJwks();
  } catch {
    // Apple unreachable: a stale set still verifies tokens signed with a known key.
    if (!cached) throw new AppleUnavailableError("Apple JWKS unavailable");
    return cached.keys.get(kid) ?? null;
  }
  return jwksCache?.keys.get(kid) ?? null;
}

// ---------------------------------------------------------------------------
// Identity token

export type AppleClaims = {
  sub: string;
  /** Lower-cased; null when Apple sent none. */
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
};

const b64json = (part: string): Record<string, unknown> => {
  const v = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as unknown;
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new AppleTokenError("not an object");
  return v as Record<string, unknown>;
};
const truthy = (v: unknown) => v === true || v === "true";

/** Clock skew tolerated on exp / iat. */
const SKEW_S = 60;

/**
 * Verifies an Apple identity token: RS256 signature against Apple's JWKS, iss, aud (the app's
 * bundle id), exp, iat and nonce = SHA-256(rawNonce) hex. Throws AppleTokenError (→ 401) or
 * AppleUnavailableError (→ 503).
 */
export async function verifyAppleIdentityToken(identityToken: string, rawNonce: string, nowMs = Date.now()): Promise<AppleClaims> {
  const parts = identityToken.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) throw new AppleTokenError("malformed");
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = b64json(parts[0]);
    payload = b64json(parts[1]);
  } catch {
    throw new AppleTokenError("malformed");
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new AppleTokenError("alg");

  const key = await appleKey(header.kid);
  if (!key) throw new AppleTokenError("unknown key");
  const signed = crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  if (!signed) throw new AppleTokenError("signature");

  if (payload.iss !== APPLE_ISSUER) throw new AppleTokenError("iss");
  const aud = payload.aud;
  if (!(aud === APPLE_CLIENT_ID || (Array.isArray(aud) && aud.includes(APPLE_CLIENT_ID)))) throw new AppleTokenError("aud");
  const nowS = nowMs / 1000;
  if (typeof payload.exp !== "number" || payload.exp + SKEW_S < nowS) throw new AppleTokenError("exp");
  if (typeof payload.iat === "number" && payload.iat - SKEW_S > nowS) throw new AppleTokenError("iat");
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255) throw new AppleTokenError("sub");
  if (typeof payload.nonce !== "string" || payload.nonce.toLowerCase() !== sha256Hex(rawNonce)) throw new AppleTokenError("nonce");

  const email = typeof payload.email === "string" && payload.email.includes("@") ? payload.email.trim().toLowerCase() : null;
  return {
    sub: payload.sub,
    email: email && email.length <= 254 ? email : null,
    emailVerified: truthy(payload.email_verified),
    isPrivateEmail: truthy(payload.is_private_email) || isAppleRelayEmail(email),
  };
}

// ---------------------------------------------------------------------------
// Account resolution

export type AppleFullName = { givenName?: string | null; familyName?: string | null } | null | undefined;

function displayName(fullName: AppleFullName): string | null {
  const clean = (s: unknown) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100) : "");
  return clean(fullName?.givenName) || clean(fullName?.familyName) || null;
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * The account of an Apple identity:
 *   1. an account already signed in with this Apple ID (appleId = sub);
 *   2. else an existing website account whose e-mail equals Apple's VERIFIED, non-relay e-mail —
 *      linked (appleId set) unless it already has another Apple ID or a password (the old site's
 *      password sign-up never verified e-mails, so such an address proves nothing);
 *   3. else a new account (Apple's verified e-mail kept when no other account uses it).
 * Name: Apple sends it only on the first authorization; it fills an empty firstName.
 */
export async function findOrCreateAppleUser(claims: AppleClaims, fullName?: AppleFullName): Promise<User> {
  const name = displayName(fullName);
  const verifiedEmail = claims.email && claims.emailVerified ? claims.email : null;

  const known = await prisma.user.findUnique({ where: { appleId: claims.sub } });
  if (known) {
    const data: Prisma.UserUpdateInput = {};
    if (!known.firstName && name) data.firstName = name;
    if (!known.email && verifiedEmail && !(await prisma.user.findUnique({ where: { email: verifiedEmail }, select: { id: true } }))) {
      data.email = verifiedEmail;
    }
    if (!Object.keys(data).length) return known;
    try {
      return await prisma.user.update({ where: { id: known.id }, data });
    } catch (e) {
      if (isUniqueViolation(e)) return known;
      throw e;
    }
  }

  const holder = verifiedEmail ? await prisma.user.findUnique({ where: { email: verifiedEmail } }) : null;
  const linkable = !!holder && !claims.isPrivateEmail && !holder.appleId && !holder.passwordHash;
  try {
    if (holder && linkable) {
      return await prisma.user.update({
        where: { id: holder.id },
        data: { appleId: claims.sub, firstName: holder.firstName ?? name },
      });
    }
    return await prisma.user.create({
      data: { appleId: claims.sub, email: holder ? null : verifiedEmail, firstName: name },
    });
  } catch (e) {
    // A parallel sign-in with the same Apple ID won the race: use its account.
    if (!isUniqueViolation(e)) throw e;
    const winner = await prisma.user.findUnique({ where: { appleId: claims.sub } });
    if (winner) return winner;
    // The e-mail was taken meanwhile: create without it.
    return prisma.user.create({ data: { appleId: claims.sub, email: null, firstName: name } });
  }
}

// ---------------------------------------------------------------------------
// Refresh token: redeem, store encrypted, revoke

type SiwaConfig = { keyId: string; teamId: string; privateKey: crypto.KeyObject };
let siwaKeyCache: { raw: string; key: crypto.KeyObject } | null = null;

function parsePrivateKey(raw: string): crypto.KeyObject {
  if (siwaKeyCache?.raw === raw) return siwaKeyCache.key;
  let text = raw.trim().replace(/\\n/g, "\n");
  if (!text.includes("-----BEGIN")) {
    const decoded = Buffer.from(text, "base64");
    const asText = decoded.toString("utf8");
    if (asText.includes("-----BEGIN")) text = asText;
    else {
      const key = crypto.createPrivateKey({ key: decoded, format: "der", type: "pkcs8" });
      siwaKeyCache = { raw, key };
      return key;
    }
  }
  const key = crypto.createPrivateKey(text);
  siwaKeyCache = { raw, key };
  return key;
}

function siwaConfig(): SiwaConfig | null {
  const keyId = process.env.SIWA_KEY_ID?.trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  // Production passes the .p8 as base64 (SIWA_PRIVATE_KEY_B64): a multi-line PEM can't go
  // through the deploy's one-line .env sync.
  const b64 = process.env.SIWA_PRIVATE_KEY_B64?.trim();
  const pem = process.env.SIWA_PRIVATE_KEY || (b64 ? Buffer.from(b64, "base64").toString("utf8") : undefined);
  if (!keyId || !teamId || !pem?.trim()) return null;
  try {
    return { keyId, teamId, privateKey: parsePrivateKey(pem) };
  } catch {
    console.error("[apple] SIWA_PRIVATE_KEY is not a valid .p8 key");
    return null;
  }
}

/** True when SIWA_KEY_ID + SIWA_PRIVATE_KEY + APPLE_TEAM_ID are set (token redeem + revoke on). */
export function siwaConfigured(): boolean {
  return siwaConfig() !== null;
}

/** Apple's client_secret: an ES256 JWT signed with the Sign in with Apple key (5 minutes). */
export function appleClientSecret(nowMs = Date.now()): string {
  const cfg = siwaConfig();
  if (!cfg) throw new Error("Sign in with Apple key is not configured");
  const iat = Math.floor(nowMs / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const input = `${enc({ alg: "ES256", kid: cfg.keyId, typ: "JWT" })}.${enc({
    iss: cfg.teamId,
    iat,
    exp: iat + 300,
    aud: APPLE_ISSUER,
    sub: APPLE_CLIENT_ID,
  })}`;
  const sig = crypto.sign("sha256", Buffer.from(input), { key: cfg.privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${sig.toString("base64url")}`;
}

function encryptionKey(): Buffer {
  const secret =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-insecure-secret" : null);
  if (!secret) throw new Error("SESSION_SECRET is required in production");
  return Buffer.from(crypto.hkdfSync("sha256", secret, "inapp-app-accounts", "apple-refresh-token-v1", 32));
}

/** AES-256-GCM: "v1.<iv>.<ciphertext>.<tag>" (base64url parts). */
export function encryptAppSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), ct.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
}

/** The plaintext of encryptAppSecret, or null (other key, tampered, malformed). */
export function decryptAppSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [v, iv, ct, tag] = sealed.split(".");
  if (v !== "v1" || !iv || !ct || !tag) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

async function postToApple(url: string, form: Record<string, string>): Promise<Response> {
  return appleFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(form).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(APPLE_HTTP_TIMEOUT_MS),
  });
}

/**
 * Redeems the app's one-time authorization code and stores Apple's refresh token (encrypted)
 * on the account. Only when the key is configured; never throws (sign-in works without it).
 * The returned id_token must belong to the same Apple user (sub) as the verified identity token.
 */
export async function storeAppleRefreshToken(userId: string, authorizationCode: string, expectedSub: string): Promise<boolean> {
  if (!siwaConfigured()) {
    // The code expires in 5 minutes: this account's Apple sign-in can never be revoked on
    // deletion (TN3194, App Review 5.1.1(v)). Loud in production so a missing key is noticed.
    if (process.env.NODE_ENV === "production") {
      console.error("[apple] SIWA_KEY_ID / SIWA_PRIVATE_KEY / APPLE_TEAM_ID not configured: Apple refresh token not stored");
    }
    return false;
  }
  try {
    const res = await postToApple(TOKEN_URL, {
      client_id: APPLE_CLIENT_ID,
      client_secret: appleClientSecret(),
      code: authorizationCode,
      grant_type: "authorization_code",
    });
    if (!res.ok) {
      console.warn(`[apple] authorization code redeem failed: HTTP ${res.status}`);
      return false;
    }
    const body = (await res.json()) as { refresh_token?: unknown; id_token?: unknown };
    if (typeof body.refresh_token !== "string" || !body.refresh_token) return false;
    // Apple always returns an id_token for this grant; without one the code's owner is unknown.
    if (typeof body.id_token !== "string") {
      console.warn("[apple] authorization code redeemed without an id_token; ignored");
      return false;
    }
    // Straight from Apple over TLS: decoding is enough to compare the subject.
    const sub = b64json(body.id_token.split(".")[1] ?? "").sub;
    if (sub !== expectedSub) {
      console.warn("[apple] authorization code belongs to another Apple ID; ignored");
      return false;
    }
    await prisma.user.update({ where: { id: userId }, data: { appleRefreshToken: encryptAppSecret(body.refresh_token) } });
    return true;
  } catch (error) {
    console.warn(`[apple] authorization code redeem failed: ${(error as Error)?.name ?? "error"}`);
    return false;
  }
}

/** Revokes the stored Apple refresh token (account deletion). true only when Apple confirmed. */
export async function revokeAppleRefreshToken(sealed: string | null | undefined): Promise<boolean> {
  if (!sealed || !siwaConfigured()) return false;
  const token = decryptAppSecret(sealed);
  if (!token) return false;
  try {
    const res = await postToApple(REVOKE_URL, {
      client_id: APPLE_CLIENT_ID,
      client_secret: appleClientSecret(),
      token,
      token_type_hint: "refresh_token",
    });
    if (!res.ok) console.warn(`[apple] token revoke failed: HTTP ${res.status}`);
    return res.ok;
  } catch (error) {
    console.warn(`[apple] token revoke failed: ${(error as Error)?.name ?? "error"}`);
    return false;
  }
}
