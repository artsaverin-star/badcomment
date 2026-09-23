// iOS app accounts (docs/site-v2/APP-ACCOUNTS.md): Sign in with Apple, the website → app hand-off,
// bearer sessions, /api/app/me + Plus sources, RevenueCat, library sync via Bearer, account deletion.
// Runs the real route handlers against a throw-away SQLite DB built from prisma/schema.prisma;
// Apple (JWKS, token, revoke) and RevenueCat are replaced by local fakes — nothing leaves the machine.
//   npm run test:app-accounts
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import Module from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

const dir = mkdtempSync(path.join(tmpdir(), "app-accounts-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
process.env.DATABASE_URL = dbUrl;
process.env.SESSION_SECRET = "test-session-secret";
delete process.env.SIWA_KEY_ID;
delete process.env.SIWA_PRIVATE_KEY;
delete process.env.APPLE_TEAM_ID;
delete process.env.APP_ORIGIN;
execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: ["ignore", "ignore", "inherit"] });

// `import "server-only"` is a Next.js bundler alias; outside Next it is a no-op here.
const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...rest);
};

// Prisma's query engine does not hold the event loop open while a query runs; on some Node
// versions node:test then cancels a test that is only waiting for SQLite. Hold it open.
const keepAlive = setInterval(() => undefined, 60_000);

// The package compiles to CJS (no top-level await): load the modules in before().
let prisma: (typeof import("../../src/lib/prisma"))["prisma"];
let auth: typeof import("../../src/lib/appAuth");
let flow: typeof import("../../src/lib/appFlow");
let apple: typeof import("../../src/lib/appApple");
let ent: typeof import("../../src/lib/appEntitlements");
let rate: typeof import("../../src/lib/appRateLimit");
let mcpAccess: typeof import("../../src/lib/mcp/access");
let appleRoute: typeof import("../../src/app/api/app/auth/apple/route");
let handoffRoute: typeof import("../../src/app/api/app/auth/handoff/start/route");
let exchangeRoute: typeof import("../../src/app/api/app/auth/exchange/route");
let logoutRoute: typeof import("../../src/app/api/app/auth/logout/route");
let meRoute: typeof import("../../src/app/api/app/me/route");
let refreshRoute: typeof import("../../src/app/api/app/entitlements/refresh/route");
let accountRoute: typeof import("../../src/app/api/app/account/route");
let webDeleteRoute: typeof import("../../src/app/api/site/account/delete/route");
let libraryRoute: typeof import("../../src/app/api/site/library/route");
let mergeRoute: typeof import("../../src/app/api/site/library/merge/route");
let emailVerifyRoute: typeof import("../../src/app/api/auth/email/verify/route");
let googleStartRoute: typeof import("../../src/app/api/auth/google/start/route");

// ---------------------------------------------------------------------------
// Fake Apple: an RSA key published in a local JWKS, identity tokens signed with it.

const appleKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const strangerKeys = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-kid-1";
const jwks = { keys: [{ ...(appleKeys.publicKey.export({ format: "jwk" }) as object), kid: KID, alg: "RS256", use: "sig" }] };
let jwksFetches = 0;
let jwksDown = false;
const jwksFetcher = async () => {
  jwksFetches++;
  if (jwksDown) throw new Error("offline");
  return jwks;
};

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
function signRs256(header: object, payload: object, key: crypto.KeyObject): string {
  const input = `${b64(header)}.${b64(payload)}`;
  return `${input}.${crypto.sign("RSA-SHA256", Buffer.from(input), key).toString("base64url")}`;
}
const sha256hex = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

type TokenOpts = {
  sub: string;
  email?: string;
  emailVerified?: boolean | "true" | "false";
  isPrivate?: boolean | "true" | "false";
  aud?: string | string[];
  iss?: string;
  expInS?: number;
  nonceFor?: string;
  kid?: string;
  key?: crypto.KeyObject;
  alg?: string;
};
function appleToken(o: TokenOpts): { identityToken: string; rawNonce: string } {
  const rawNonce = crypto.randomBytes(16).toString("hex");
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: o.iss ?? "https://appleid.apple.com",
    aud: o.aud ?? "com.artsaverin.inapp",
    exp: now + (o.expInS ?? 600),
    iat: now,
    sub: o.sub,
    nonce: sha256hex(o.nonceFor ?? rawNonce),
    nonce_supported: true,
  };
  if (o.email) {
    payload.email = o.email;
    payload.email_verified = o.emailVerified ?? true;
    if (o.isPrivate !== undefined) payload.is_private_email = o.isPrivate;
  }
  return { identityToken: signRs256({ alg: o.alg ?? "RS256", kid: o.kid ?? KID }, payload, o.key ?? appleKeys.privateKey), rawNonce };
}

// Fake Apple token / revoke endpoints.
type AppleCall = { url: string; form: URLSearchParams };
let appleCalls: AppleCall[] = [];
let tokenEndpointSub = "";
let tokenEndpointIdToken = true;
const appleFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const form = new URLSearchParams(String(init?.body ?? ""));
  appleCalls.push({ url, form });
  if (url.endsWith("/auth/token")) {
    const idToken = `${b64({ alg: "RS256", kid: KID })}.${b64({ sub: tokenEndpointSub, iss: "https://appleid.apple.com" })}.sig`;
    return Response.json({
      access_token: "at",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "apple-refresh-secret",
      ...(tokenEndpointIdToken ? { id_token: idToken } : {}),
    });
  }
  if (url.endsWith("/auth/revoke")) return new Response(null, { status: 200 });
  return new Response("not found", { status: 404 });
}) as typeof fetch;

// Fake RevenueCat.
let rcCalls: string[] = [];
let rcAnswer: (userId: string) => Response | Promise<Response> = () => Response.json({ subscriber: { entitlements: {} } });
const rcFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  assert.match(url, /^https:\/\/api\.revenuecat\.com\/v1\/subscribers\//);
  assert.match(String((init?.headers as Record<string, string>)?.Authorization), /^Bearer appl_/);
  const userId = decodeURIComponent(url.split("/").pop() ?? "");
  rcCalls.push(userId);
  // Like the real fetch, give up when the caller's AbortSignal (timeout) fires.
  const signal = init?.signal;
  return new Promise<Response>((resolve, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    Promise.resolve(rcAnswer(userId)).then(resolve, reject);
  });
}) as typeof fetch;
const rcEntitled = (expires: string | null, extra: object = {}) =>
  Response.json({
    subscriber: {
      entitlements: { plus: { expires_date: expires, product_identifier: expires ? "com.artsaverin.inapp.annual" : "com.artsaverin.inapp.lifetime" } },
      ...extra,
    },
  });

// ---------------------------------------------------------------------------
// Helpers

const BASE = "http://localhost";
function req(pathname: string, init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string>; ip?: string } = {}) {
  const headers: Record<string, string> = { "x-real-ip": init.ip ?? "198.51.100.7", ...init.headers };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  let body: string | undefined;
  if (init.body !== undefined) {
    body = typeof init.body === "string" ? init.body : JSON.stringify(init.body);
    headers["content-type"] ??= "application/json";
  }
  return new Request(`${BASE}${pathname}`, { method: init.method ?? (body !== undefined ? "POST" : "GET"), headers, body });
}
async function signInApple(o: TokenOpts, extra: Record<string, unknown> = {}) {
  const t = appleToken(o);
  const res = await appleRoute.POST(req("/api/app/auth/apple", { body: { ...t, ...extra } }));
  return { res, body: (await res.json()) as { token?: string; user?: { id: string; name: string | null; email: string | null; methods: string[] }; error?: string } };
}
async function me(token: string) {
  const res = await meRoute.GET(req("/api/app/me", { token }));
  return { res, body: (await res.json()) as { user: { id: string; methods: string[] }; plus: { active: boolean; lifetime: boolean; until: string | null; sources: string[] } } };
}
const tick = () => new Promise((r) => setTimeout(r, 150));

before(async () => {
  prisma = (await import("../../src/lib/prisma")).prisma;
  auth = await import("../../src/lib/appAuth");
  flow = await import("../../src/lib/appFlow");
  apple = await import("../../src/lib/appApple");
  ent = await import("../../src/lib/appEntitlements");
  rate = await import("../../src/lib/appRateLimit");
  mcpAccess = await import("../../src/lib/mcp/access");
  appleRoute = await import("../../src/app/api/app/auth/apple/route");
  handoffRoute = await import("../../src/app/api/app/auth/handoff/start/route");
  exchangeRoute = await import("../../src/app/api/app/auth/exchange/route");
  logoutRoute = await import("../../src/app/api/app/auth/logout/route");
  meRoute = await import("../../src/app/api/app/me/route");
  refreshRoute = await import("../../src/app/api/app/entitlements/refresh/route");
  accountRoute = await import("../../src/app/api/app/account/route");
  webDeleteRoute = await import("../../src/app/api/site/account/delete/route");
  libraryRoute = await import("../../src/app/api/site/library/route");
  mergeRoute = await import("../../src/app/api/site/library/merge/route");
  emailVerifyRoute = await import("../../src/app/api/auth/email/verify/route");
  googleStartRoute = await import("../../src/app/api/auth/google/start/route");
  apple.setAppleJwksFetcher(jwksFetcher);
  apple.setAppleFetch(appleFetch);
  ent.setRevenueCatFetch(rcFetch);
});

beforeEach(() => {
  rate.resetRateLimits();
});

after(async () => {
  apple.setAppleJwksFetcher(null);
  apple.setAppleFetch(null);
  ent.setRevenueCatFetch(null);
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
  clearInterval(keepAlive);
});

// ---------------------------------------------------------------------------

describe("Apple identity token verification", () => {
  test("a valid token passes; claims are normalized; the JWKS is fetched once and cached", async () => {
    const t = appleToken({ sub: "apple-sub-verify", email: "Mixed@Example.COM", emailVerified: "true", isPrivate: "false" });
    const before = jwksFetches;
    const claims = await apple.verifyAppleIdentityToken(t.identityToken, t.rawNonce);
    assert.deepEqual(claims, { sub: "apple-sub-verify", email: "mixed@example.com", emailVerified: true, isPrivateEmail: false });
    const t2 = appleToken({ sub: "apple-sub-verify" });
    await apple.verifyAppleIdentityToken(t2.identityToken, t2.rawNonce);
    assert.ok(jwksFetches - before <= 1, "JWKS cached between verifications");
  });

  const rejects = async (t: { identityToken: string; rawNonce: string }, why: string) =>
    assert.rejects(() => apple.verifyAppleIdentityToken(t.identityToken, t.rawNonce), apple.AppleTokenError, why);

  test("nonce mismatch, wrong aud, wrong iss, expired, forged signature, alg none, unknown kid → rejected", async () => {
    await rejects(appleToken({ sub: "s", nonceFor: "another-raw-nonce" }), "nonce mismatch");
    const t = appleToken({ sub: "s" });
    await assert.rejects(() => apple.verifyAppleIdentityToken(t.identityToken, `${t.rawNonce}x`), apple.AppleTokenError, "raw nonce altered");
    await rejects(appleToken({ sub: "s", aud: "com.example.other" }), "wrong aud");
    await rejects(appleToken({ sub: "s", iss: "https://evil.example" }), "wrong iss");
    await rejects(appleToken({ sub: "s", expInS: -600 }), "expired");
    await rejects(appleToken({ sub: "s", key: strangerKeys.privateKey }), "signed by someone else");
    await rejects(appleToken({ sub: "s", alg: "none" }), "alg none");
    await rejects(appleToken({ sub: "s", kid: "unknown-kid" }), "unknown kid");
    const good = appleToken({ sub: "s" });
    const [h, p] = good.identityToken.split(".");
    const tampered = `${h}.${b64({ ...JSON.parse(Buffer.from(p, "base64url").toString()), sub: "someone-else" })}.${good.identityToken.split(".")[2]}`;
    await rejects({ identityToken: tampered, rawNonce: good.rawNonce }, "payload tampered");
    await rejects({ identityToken: "not.a.jwt!", rawNonce: "x" }, "garbage");
  });

  test("an aud array containing the bundle id is accepted", async () => {
    const t = appleToken({ sub: "s-aud-array", aud: ["com.example.other", "com.artsaverin.inapp"] });
    assert.equal((await apple.verifyAppleIdentityToken(t.identityToken, t.rawNonce)).sub, "s-aud-array");
  });

  test("Apple's keys unreachable and nothing cached → 503 unavailable", async () => {
    apple.setAppleJwksFetcher(jwksFetcher); // clears the cache
    jwksDown = true;
    try {
      const { res, body } = await signInApple({ sub: "s-offline" });
      assert.equal(res.status, 503);
      assert.equal(body.error, "unavailable");
    } finally {
      jwksDown = false;
    }
  });
});

describe("POST /api/app/auth/apple", () => {
  test("bad bodies → 400; invalid tokens → 401 invalid_token", async () => {
    for (const body of ["", "nope", [], {}, { identityToken: "x" }, { rawNonce: "x" }, { identityToken: 1, rawNonce: "x" }]) {
      const res = await appleRoute.POST(req("/api/app/auth/apple", { body }));
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    const wrongNonce = appleToken({ sub: "s1", nonceFor: "other" });
    let res = await appleRoute.POST(req("/api/app/auth/apple", { body: wrongNonce }));
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: "invalid_token" });
    res = await appleRoute.POST(req("/api/app/auth/apple", { body: appleToken({ sub: "s1", aud: "com.other" }) }));
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
  });

  test("a new Apple ID creates an account (name from fullName, e-mail kept), the same Apple ID signs into it again", async () => {
    const first = await signInApple(
      { sub: "apple-new-1", email: "new1@example.com" },
      { fullName: { givenName: "Anna", familyName: "K" } },
    );
    assert.equal(first.res.status, 200);
    assert.match(first.body.token!, /^[A-Za-z0-9_-]{43}$/);
    assert.deepEqual(first.body.user, { id: first.body.user!.id, name: "Anna", email: "new1@example.com", methods: ["apple", "email"] });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: first.body.user!.id } });
    assert.equal(row.appleId, "apple-new-1");
    assert.ok(row.appLinkedAt, "appLinkedAt set on first app sign-in");
    const stored = await prisma.appSession.findFirstOrThrow({ where: { userId: row.id } });
    assert.notEqual(stored.tokenHash, first.body.token, "only the hash is stored");
    assert.equal(stored.tokenHash, sha256hex(first.body.token!));

    const again = await signInApple({ sub: "apple-new-1" });
    assert.equal(again.body.user!.id, first.body.user!.id);
    assert.notEqual(again.body.token, first.body.token, "every sign-in gets its own session");
  });

  test("links to an existing website account by verified, non-relay e-mail", async () => {
    const web = await prisma.user.create({ data: { email: "web@example.com", telegramId: "777", firstName: "Web" } });
    const { body } = await signInApple({ sub: "apple-link-1", email: "WEB@example.com" }, { fullName: { givenName: "Ignored" } });
    assert.equal(body.user!.id, web.id);
    assert.deepEqual(body.user!.methods, ["apple", "telegram", "email"]);
    assert.equal(body.user!.name, "Web", "an existing name is kept");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: web.id } })).appleId, "apple-link-1");
  });

  test("does NOT link: unverified e-mail, relay e-mail, password account, account with another Apple ID", async () => {
    const unverifiedHolder = await prisma.user.create({ data: { email: "unverified@example.com" } });
    const a = await signInApple({ sub: "apple-nolink-1", email: "unverified@example.com", emailVerified: false });
    assert.notEqual(a.body.user!.id, unverifiedHolder.id);
    assert.equal(a.body.user!.email, null);

    const relay = "abc123@privaterelay.appleid.com";
    const relayHolder = await prisma.user.create({ data: { email: relay } });
    const b = await signInApple({ sub: "apple-nolink-2", email: relay, isPrivate: true });
    assert.notEqual(b.body.user!.id, relayHolder.id);
    assert.equal(b.body.user!.email, null, "the address belongs to another account");

    const pwHolder = await prisma.user.create({ data: { email: "pw@example.com", passwordHash: "scrypt$x$y" } });
    const c = await signInApple({ sub: "apple-nolink-3", email: "pw@example.com" });
    assert.notEqual(c.body.user!.id, pwHolder.id, "an unverified password sign-up proves nothing");
    assert.equal(c.body.user!.email, null);

    const otherApple = await prisma.user.create({ data: { email: "taken@example.com", appleId: "apple-someone-else" } });
    const d = await signInApple({ sub: "apple-nolink-4", email: "taken@example.com" });
    assert.notEqual(d.body.user!.id, otherApple.id);
  });

  test("a relay e-mail on a new account is stored but is not an e-mail sign-in method", async () => {
    const { body } = await signInApple({ sub: "apple-relay-new", email: "zzz@privaterelay.appleid.com", isPrivate: "true" });
    assert.equal(body.user!.email, "zzz@privaterelay.appleid.com");
    assert.deepEqual(body.user!.methods, ["apple"]);
  });

  test("rate limit: 10 a minute per IP, then 429 with Retry-After", async () => {
    for (let i = 0; i < 10; i++) assert.equal((await appleRoute.POST(req("/api/app/auth/apple", { body: {}, ip: "203.0.113.9" }))).status, 400);
    const res = await appleRoute.POST(req("/api/app/auth/apple", { body: {}, ip: "203.0.113.9" }));
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get("retry-after")) >= 1);
    assert.equal((await appleRoute.POST(req("/api/app/auth/apple", { body: {}, ip: "203.0.113.10" }))).status, 400, "other IPs unaffected");
  });
});

describe("Website → app hand-off", () => {
  test("handoff/start: 302 to the sign-in page (guest) with a validated locale", async () => {
    let res = await handoffRoute.GET(req("/api/app/auth/handoff/start?locale=de"));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), `${BASE}/de/login?app=1&return_to=%2Fde%2Fapp-auth`);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    for (const bad of ["xx", "../evil", "", "RU"]) {
      res = await handoffRoute.GET(req(`/api/app/auth/handoff/start?locale=${encodeURIComponent(bad)}`));
      assert.equal(res.headers.get("location"), `${BASE}/en/login?app=1&return_to=%2Fen%2Fapp-auth`, bad);
    }
    assert.equal(auth.handoffTarget("ja", true), "/ja/app-auth", "signed in → straight to the hand-off page");
  });

  test("a minted code is 43 chars, stored hashed, exchanged once for a token", async () => {
    const user = await prisma.user.create({ data: { email: "handoff@example.com", googleId: "g-1" } });
    const code = await auth.mintAppLoginCode(user.id);
    assert.match(code, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(auth.appAuthRedirectUrl(code), `inapp://auth?code=${code}`);
    const row = await prisma.appLoginCode.findFirstOrThrow({ where: { userId: user.id } });
    assert.equal(row.codeHash, sha256hex(code));
    assert.ok(row.expiresAt.getTime() - Date.now() <= 5 * 60_000 && row.expiresAt.getTime() - Date.now() > 4 * 60_000);

    const [x, y] = await Promise.all([
      exchangeRoute.POST(req("/api/app/auth/exchange", { body: { code } })),
      exchangeRoute.POST(req("/api/app/auth/exchange", { body: { code } })),
    ]);
    const statuses = [x.status, y.status].sort();
    assert.deepEqual(statuses, [200, 400], "single use, even under a race");
    const ok = (await (x.status === 200 ? x : y).json()) as { token: string; user: { id: string; methods: string[] } };
    assert.equal(ok.user.id, user.id);
    assert.deepEqual(ok.user.methods, ["google", "email"]);
    assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).appLinkedAt, "exchange links the account to the app");
    assert.equal((await me(ok.token)).res.status, 200);

    const again = await exchangeRoute.POST(req("/api/app/auth/exchange", { body: { code } }));
    assert.equal(again.status, 400);
    assert.deepEqual(await again.json(), { error: "invalid_code" });
  });

  test("expired, unknown and malformed codes → 400 invalid_code", async () => {
    const user = await prisma.user.create({ data: { email: "expired@example.com" } });
    const code = await auth.mintAppLoginCode(user.id);
    await prisma.appLoginCode.update({ where: { codeHash: sha256hex(code) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    for (const body of [{ code }, { code: auth.newAppSecret() }, { code: "short" }, { code: 42 }, {}, "junk"]) {
      const res = await exchangeRoute.POST(req("/api/app/auth/exchange", { body }));
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  const pkce = () => {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const digest = crypto.createHash("sha256").update(verifier).digest();
    return { verifier, b64: digest.toString("base64url"), hex: digest.toString("hex") };
  };
  let exchangeIp = 0; // many exchanges per test: spread them over IPs (10 a minute per IP)
  const exchange = (body: unknown) => exchangeRoute.POST(req("/api/app/auth/exchange", { body, ip: `203.0.113.${++exchangeIp}` }));

  test("PKCE: handoff/start keeps the challenge in a 30-min cookie, clears it without one, rejects a malformed one", async () => {
    const { b64, hex } = pkce();
    let res = await handoffRoute.GET(req(`/api/app/auth/handoff/start?locale=ru&challenge=${b64}`));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), `${BASE}/ru/login?app=1&return_to=%2Fru%2Fapp-auth`);
    let cookie = res.headers.get("set-cookie") ?? "";
    assert.match(cookie, new RegExp(`^ia_app_pkce=${hex};`), "stored normalized (lowercase hex)");
    assert.match(cookie, /Max-Age=1800/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    res = await handoffRoute.GET(req(`/api/app/auth/handoff/start?locale=ru&code_challenge=${hex.toUpperCase()}`));
    assert.match(res.headers.get("set-cookie") ?? "", new RegExp(`^ia_app_pkce=${hex};`), "hex and the code_challenge alias");
    res = await handoffRoute.GET(req("/api/app/auth/handoff/start?locale=ru"));
    cookie = res.headers.get("set-cookie") ?? "";
    assert.match(cookie, /^ia_app_pkce=;/, "no challenge → a stale one is cleared");
    assert.match(cookie, /Max-Age=0/);
    for (const bad of ["abc", "z".repeat(64), `${b64.slice(0, 42)}B`, `${hex}00`]) {
      res = await handoffRoute.GET(req(`/api/app/auth/handoff/start?locale=ru&challenge=${bad}`));
      assert.equal(res.status, 400, bad);
      assert.deepEqual(await res.json(), { error: "bad_challenge" });
    }
  });

  test("PKCE: a bound code needs its verifier; a verifier never redeems an unbound code; a wrong verifier does not burn it", async () => {
    const user = await prisma.user.create({ data: { email: "pkce@example.com" } });
    const { verifier, b64, hex } = pkce();
    const code = await auth.mintAppLoginCode(user.id, { challenge: b64 });
    assert.equal((await prisma.appLoginCode.findUniqueOrThrow({ where: { codeHash: sha256hex(code) } })).challenge, hex);

    assert.equal((await exchange({ code })).status, 400, "no verifier (e.g. another app that caught inapp://)");
    assert.equal((await exchange({ code, verifier: pkce().verifier })).status, 400, "someone else's verifier");
    assert.equal((await exchange({ code, verifier: "short" })).status, 400, "malformed verifier");
    const ok = await exchange({ code, code_verifier: verifier });
    assert.equal(ok.status, 200, "the app that started the sign-in (code_verifier alias)");
    assert.equal(((await ok.json()) as { user: { id: string } }).user.id, user.id);
    assert.equal((await exchange({ code, verifier })).status, 400, "still single use");

    // An attacker's code minted without a challenge, sent to a victim whose app uses PKCE.
    const unbound = await auth.mintAppLoginCode(user.id);
    assert.equal((await exchange({ code: unbound, verifier })).status, 400);
    const hexBound = await auth.mintAppLoginCode(user.id, { challenge: hex });
    assert.equal((await exchange({ code: hexBound, verifier })).status, 200, "a hex challenge works the same");

    // Default mode: codes without a challenge still work without a verifier (app builds before PKCE).
    assert.equal((await exchange({ code: unbound })).status, 200);
    process.env.APP_HANDOFF_PKCE = "required";
    try {
      const legacy = await auth.mintAppLoginCode(user.id);
      assert.equal((await exchange({ code: legacy })).status, 400, "APP_HANDOFF_PKCE=required");
      const bound = pkce();
      const strict = await auth.mintAppLoginCode(user.id, { challenge: bound.hex });
      assert.equal((await exchange({ code: strict, verifier: bound.verifier })).status, 200);
    } finally {
      delete process.env.APP_HANDOFF_PKCE;
    }
  });

  test("app flow helpers: failure paths, challenge parsing, the e-mail return path", () => {
    assert.equal(flow.appFlowLocale("/ja/app-auth"), "ja");
    assert.equal(flow.appFlowLocale("/ru/app-auth?from=email&c=1"), "ru");
    assert.equal(flow.appFlowLocale("/ru/app-authx"), null);
    assert.equal(flow.appFlowLocale("/xx/app-auth"), null);
    assert.equal(flow.appFlowLocale("/ru/segment"), null);
    assert.equal(flow.appFlowLocale(undefined), null);
    assert.equal(flow.authFailurePath("/de/app-auth", { auth: "google_error" }), "/de/login?app=1&auth=google_error");
    assert.equal(flow.authFailurePath("/fr/app-auth?from=email", { login: "expired" }), "/fr/login?app=1&login=expired");
    assert.equal(flow.authFailurePath("/ru/segment/x", { auth: "google_error" }), "/?auth=google_error", "the website keeps /?auth=");
    assert.equal(flow.authFailurePath(undefined, { login: "expired" }), "/?login=expired");

    const { verifier, b64, hex } = pkce();
    assert.equal(flow.normalizeCodeChallenge(b64), hex);
    assert.equal(flow.normalizeCodeChallenge(hex.toUpperCase()), hex);
    assert.equal(flow.normalizeCodeChallenge(`${b64}=`), null);
    assert.equal(flow.normalizeCodeChallenge(42), null);
    assert.ok(flow.isCodeVerifier(verifier));
    assert.ok(!flow.isCodeVerifier("a".repeat(31)) && !flow.isCodeVerifier("a".repeat(129)) && !flow.isCodeVerifier(`${verifier}!`));

    assert.deepEqual(flow.takeAppAuthChallenge(`/ru/app-auth?from=email&c=${b64}`), { path: "/ru/app-auth?from=email", challenge: hex });
    assert.deepEqual(flow.takeAppAuthChallenge(`/ru/app-auth?c=${hex}`), { path: "/ru/app-auth", challenge: hex });
    assert.deepEqual(flow.takeAppAuthChallenge("/ru/app-auth?from=email&c=junk"), { path: "/ru/app-auth?from=email", challenge: null });
    assert.deepEqual(flow.takeAppAuthChallenge(`/ru/segment?c=${hex}`), { path: `/ru/segment?c=${hex}`, challenge: null }, "only app-auth paths");
  });

  test("failed sign-ins that started in the app go back to /<L>/login?app=1, website ones to /?…", async () => {
    let res = await emailVerifyRoute.GET(new Request(`${BASE}/api/auth/email/verify?token=forged&rt=${encodeURIComponent("/de/app-auth?from=email&c=" + pkce().hex)}`));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), `${BASE}/de/login?app=1&login=expired`);
    assert.equal(res.headers.get("set-cookie"), null, "an unverified link never sets the challenge");
    res = await emailVerifyRoute.GET(new Request(`${BASE}/api/auth/email/verify?token=forged&rt=%2Fru%2Fsegment`));
    assert.equal(res.headers.get("location"), `${BASE}/?login=expired`);

    const saved = { a: process.env.GOOGLE_CLIENT_ID, b: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    try {
      res = await googleStartRoute.GET(new Request(`${BASE}/api/auth/google/start?return_to=%2Fja%2Fapp-auth`));
      assert.equal(res.headers.get("location"), `${BASE}/ja/login?app=1&auth=google_unconfigured`);
      res = await googleStartRoute.GET(new Request(`${BASE}/api/auth/google/start?return_to=%2Fen%2Fplus`));
      assert.equal(res.headers.get("location"), `${BASE}/?auth=google_unconfigured`);
    } finally {
      if (saved.a !== undefined) process.env.GOOGLE_CLIENT_ID = saved.a;
      if (saved.b !== undefined) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = saved.b;
    }
  });
});

describe("Bearer sessions", () => {
  test("missing, malformed or unknown tokens → 401; logout revokes only this session", async () => {
    assert.equal((await meRoute.GET(req("/api/app/me"))).status, 401);
    assert.equal((await meRoute.GET(req("/api/app/me", { headers: { authorization: "Basic abc" } }))).status, 401);
    assert.equal((await meRoute.GET(req("/api/app/me", { token: "short" }))).status, 401);
    assert.equal((await meRoute.GET(req("/api/app/me", { token: auth.newAppSecret() }))).status, 401);
    assert.equal(auth.parseBearer(`bearer   ${"a".repeat(43)}  `), "a".repeat(43));

    const user = await prisma.user.create({ data: { email: "bearer@example.com" } });
    const t1 = await auth.createAppSession(user.id);
    const t2 = await auth.createAppSession(user.id);
    assert.equal((await me(t1)).res.status, 200);
    const out = await logoutRoute.POST(req("/api/app/auth/logout", { method: "POST", token: t1 }));
    assert.equal(out.status, 200);
    assert.deepEqual(await out.json(), { ok: true });
    assert.equal((await meRoute.GET(req("/api/app/me", { token: t1 }))).status, 401);
    assert.equal((await me(t2)).res.status, 200, "the other device stays signed in");
    assert.equal((await logoutRoute.POST(req("/api/app/auth/logout", { method: "POST" }))).status, 401);
  });

  test("lastUsedAt is written at most every 10 minutes", async () => {
    const user = await prisma.user.create({ data: { email: "lastused@example.com" } });
    const token = await auth.createAppSession(user.id);
    const old = new Date(Date.now() - 60 * 60_000);
    await prisma.appSession.updateMany({ where: { userId: user.id }, data: { lastUsedAt: old } });
    await me(token);
    const first = (await prisma.appSession.findFirstOrThrow({ where: { userId: user.id } })).lastUsedAt!;
    assert.ok(first.getTime() > old.getTime());
    await me(token);
    const second = (await prisma.appSession.findFirstOrThrow({ where: { userId: user.id } })).lastUsedAt!;
    assert.equal(second.getTime(), first.getTime());
  });
});

describe("GET /api/app/me — Plus sources", () => {
  const signedIn = async (data: Parameters<typeof prisma.user.create>[0]["data"]) => {
    const u = await prisma.user.create({ data });
    return { id: u.id, token: await auth.createAppSession(u.id) };
  };

  test("website lifetime", async () => {
    rcAnswer = () => Response.json({ subscriber: { entitlements: {} } });
    const { token } = await signedIn({ email: "lifetime@example.com", lifetime: true });
    const { body } = await me(token);
    assert.deepEqual(body.plus, { active: true, lifetime: true, until: null, sources: ["web_lifetime"] });
  });

  test("website premium (time-limited)", async () => {
    const until = new Date(Date.now() + 10 * 86_400_000);
    const { token } = await signedIn({ email: "premium@example.com", premiumUntil: until });
    const { body } = await me(token);
    assert.deepEqual(body.plus, { active: true, lifetime: false, until: until.toISOString(), sources: ["web_premium"] });
  });

  test("friend (src/data/friends.json)", async () => {
    const friends = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/friends.json"), "utf8")) as string[];
    const f = friends.find((x) => x.includes("@"));
    if (!f) return;
    const { token } = await signedIn({ email: `${f.trim().toLowerCase()}` });
    const { body } = await me(token);
    assert.deepEqual(body.plus.sources, ["friend"]);
    assert.equal(body.plus.lifetime, true);
  });

  test("nothing → inactive", async () => {
    rcAnswer = () => Response.json({ subscriber: { entitlements: {} } });
    const { token } = await signedIn({ email: "free@example.com" });
    const { body } = await me(token);
    assert.deepEqual(body.plus, { active: false, lifetime: false, until: null, sources: [] });
  });

  test("App Store subscription via RevenueCat: checked, cached 15 min, forced by /entitlements/refresh", async () => {
    const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
    rcAnswer = () => rcEntitled(expires);
    const { id, token } = await signedIn({ email: "appsub@example.com" });
    rcCalls = [];
    const { body } = await me(token);
    assert.deepEqual(rcCalls, [id], "RevenueCat app_user_id = User.id");
    assert.deepEqual(body.plus, { active: true, lifetime: false, until: expires, sources: ["app"] });
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    assert.equal(row.appPlusUntil?.toISOString(), expires);
    assert.ok(row.appCheckedAt);

    await me(token);
    assert.equal(rcCalls.length, 1, "fresh cache: no second RevenueCat call");

    rcAnswer = () => rcEntitled(null); // upgraded to lifetime
    const refreshed = await refreshRoute.POST(req("/api/app/entitlements/refresh", { method: "POST", token }));
    assert.equal(refreshed.status, 200);
    assert.deepEqual(await refreshed.json(), { plus: { active: true, lifetime: true, until: null, sources: ["app"] } });
    assert.equal(rcCalls.length, 2);
  });

  test("App Store lifetime + website lifetime → both sources", async () => {
    rcAnswer = () => rcEntitled(null);
    const { token } = await signedIn({ email: "both@example.com", lifetime: true });
    const { body } = await me(token);
    assert.deepEqual(body.plus.sources, ["web_lifetime", "app"]);
  });

  test("stale + active answers from cache at once and re-reads in the background (a refund shows up)", async () => {
    const { id } = await signedIn({ email: "stale-active@example.com" });
    await prisma.user.update({
      where: { id },
      data: { appPlusUntil: new Date(Date.now() + 86_400_000), appCheckedAt: new Date(Date.now() - 20 * 60_000) },
    });
    rcCalls = [];
    rcAnswer = () => Response.json({ subscriber: { entitlements: {} } }); // refunded
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    const f = await ent.currentAppEntitlement(row);
    assert.equal(ent.appPlusActive(f), true, "cached answer");
    await tick();
    assert.deepEqual(rcCalls, [id]);
    const after = await prisma.user.findUniqueOrThrow({ where: { id } });
    assert.equal(ent.appPlusActive(after), false, "background refresh stored the refund");
  });

  test("stale + inactive waits for RevenueCat at most timeoutMs, then answers from cache and backs off", async () => {
    const { id } = await signedIn({ email: "slow@example.com" });
    rcCalls = [];
    rcAnswer = () => new Promise<Response>(() => undefined); // never answers; the abort signal wins
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    const started = Date.now();
    const f = await ent.currentAppEntitlement(row, { timeoutMs: 80 });
    assert.ok(Date.now() - started < 2_000);
    assert.equal(ent.appPlusActive(f), false);
    assert.equal(rcCalls.length, 1);
    await ent.currentAppEntitlement(row, { timeoutMs: 80 });
    assert.equal(rcCalls.length, 1, "no new call during the failure back-off");
    rcAnswer = () => rcEntitled(null);
    const forced = await ent.currentAppEntitlement(row, { force: true, timeoutMs: 1_000 });
    assert.equal(forced.appLifetime, true, "an explicit refresh ignores the back-off");
  });

  test("accounts never signed in in the app are never sent to RevenueCat", async () => {
    const u = await prisma.user.create({ data: { email: "webonly@example.com" } });
    rcCalls = [];
    const f = await ent.currentAppEntitlement(u);
    assert.equal(ent.appPlusActive(f), false);
    assert.deepEqual(rcCalls, []);
    assert.equal(await ent.appPlusForUserId(u.id), false);
  });

  test("RevenueCat parsing: grace period, expired, sandbox", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const grace = ent.parseRevenueCatSubscriber(
      { subscriber: { entitlements: { plus: { expires_date: past, grace_period_expires_date: future } } } },
      { allowSandbox: true },
    );
    assert.equal(grace.until?.toISOString(), future);
    const expired = ent.parseRevenueCatSubscriber({ subscriber: { entitlements: { plus: { expires_date: past } } } }, { allowSandbox: true });
    assert.equal(ent.appPlusActive({ appPlusUntil: expired.until, appLifetime: expired.lifetime }), false);
    const sandboxBody = {
      subscriber: {
        entitlements: { plus: { expires_date: null, product_identifier: "com.artsaverin.inapp.lifetime" } },
        non_subscriptions: { "com.artsaverin.inapp.lifetime": [{ is_sandbox: true }] },
      },
    };
    assert.deepEqual(ent.parseRevenueCatSubscriber(sandboxBody, { allowSandbox: false }), { lifetime: false, until: null });
    assert.deepEqual(ent.parseRevenueCatSubscriber(sandboxBody, { allowSandbox: true }), { lifetime: true, until: null });
    assert.deepEqual(ent.parseRevenueCatSubscriber({ subscriber: { entitlements: { other: {} } } }, { allowSandbox: true }), {
      lifetime: false,
      until: null,
    });
    assert.deepEqual(ent.parseRevenueCatSubscriber("junk", { allowSandbox: true }), { lifetime: false, until: null });
  });

  test("MCP access honours App Store Plus like getAccess()", async () => {
    rcAnswer = () => rcEntitled(null);
    const { id } = await signedIn({ email: "mcp-app@example.com" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id } });
    const access = await mcpAccess.accessForUser(u);
    assert.equal(access.unlimited, true);
    rcAnswer = () => Response.json({ subscriber: { entitlements: {} } });
    const { id: id2 } = await signedIn({ email: "mcp-free@example.com" });
    assert.equal((await mcpAccess.accessForUser(await prisma.user.findUniqueOrThrow({ where: { id: id2 } }))).unlimited, false);
  });
});

describe("Library sync with Bearer (/api/site/library, /merge)", () => {
  test("GET, POST ops and merge work with a bearer token; same validation; bad token → 401", async () => {
    const u = await prisma.user.create({ data: { email: "library@example.com" } });
    const token = await auth.createAppSession(u.id);

    let res = await libraryRoute.GET(req("/api/site/library", { token }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { user: u.id, research: [], idea: [], notes: {} });

    // A bearer write needs no Origin check (browsers never attach the header themselves).
    res = await libraryRoute.POST(
      req("/api/site/library", {
        token,
        headers: { origin: "https://elsewhere.example" },
        body: {
          ops: [
            { type: "saved", kind: "idea", slug: "habit-tracking-1", saved: true },
            { type: "note", kind: "research", slug: "habit-tracking", text: "заметка" },
            { type: "saved", kind: "idea", slug: "not-an-idea", saved: true },
          ],
        },
      }),
    );
    assert.equal(res.status, 200);
    const ops = (await res.json()) as { applied: number; rejected: { index: number }[] };
    assert.equal(ops.applied, 2);
    assert.deepEqual(ops.rejected.map((r) => r.index), [2]);

    res = await mergeRoute.POST(req("/api/site/library/merge", { token, body: { research: ["interior-design"], idea: [], notes: {} } }));
    assert.equal(res.status, 200);
    const merged = (await res.json()) as { research: string[]; idea: string[]; notes: Record<string, string> };
    assert.deepEqual(merged.research, ["interior-design"]);
    assert.deepEqual(merged.idea, ["habit-tracking-1"]);
    assert.equal(merged.notes["research:habit-tracking"], "заметка");

    res = await libraryRoute.POST(req("/api/site/library", { token, body: { ops: Array(201).fill({ type: "saved", kind: "idea", slug: "habit-tracking-1", saved: true }) } }));
    assert.equal(res.status, 400, "same op limit as the website");
    assert.equal((await libraryRoute.GET(req("/api/site/library", { token: auth.newAppSecret() }))).status, 401);
    assert.equal((await libraryRoute.GET(req("/api/site/library", { headers: { authorization: "Bearer junk" } }))).status, 401);
  });
});

describe("Sign in with Apple key: refresh token stored encrypted, revoked on deletion", () => {
  const ec = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  before(() => {
    process.env.SIWA_KEY_ID = "KEY123ABCD";
    process.env.APPLE_TEAM_ID = "D8GNCMFXH8";
    // .env style: one line with literal \n escapes.
    process.env.SIWA_PRIVATE_KEY = (ec.privateKey.export({ type: "pkcs8", format: "pem" }) as string).replace(/\n/g, "\\n");
  });
  after(() => {
    delete process.env.SIWA_KEY_ID;
    delete process.env.APPLE_TEAM_ID;
    delete process.env.SIWA_PRIVATE_KEY;
  });

  test("client secret is an ES256 JWT for the bundle id", () => {
    assert.equal(apple.siwaConfigured(), true);
    const jwt = apple.appleClientSecret();
    const [h, p, s] = jwt.split(".");
    assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KEY123ABCD", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(p, "base64url").toString());
    assert.equal(claims.iss, "D8GNCMFXH8");
    assert.equal(claims.sub, "com.artsaverin.inapp");
    assert.equal(claims.aud, "https://appleid.apple.com");
    assert.ok(crypto.verify("sha256", Buffer.from(`${h}.${p}`), { key: ec.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
  });

  test("encryption round-trips and rejects tampering", () => {
    const sealed = apple.encryptAppSecret("secret-value");
    assert.ok(!sealed.includes("secret-value"));
    assert.equal(apple.decryptAppSecret(sealed), "secret-value");
    const parts = sealed.split(".");
    parts[2] = Buffer.from("x").toString("base64url");
    assert.equal(apple.decryptAppSecret(parts.join(".")), null);
    assert.equal(apple.decryptAppSecret("junk"), null);
  });

  test("sign-in redeems the code; a code of another Apple ID is ignored; deletion revokes → appleRevoked:true", async () => {
    appleCalls = [];
    tokenEndpointSub = "apple-siwa-1";
    const { res, body } = await signInApple({ sub: "apple-siwa-1", email: "siwa@example.com" }, { authorizationCode: "c0de" });
    assert.equal(res.status, 200);
    assert.equal(appleCalls.length, 1);
    assert.equal(appleCalls[0].url, "https://appleid.apple.com/auth/token");
    assert.equal(appleCalls[0].form.get("client_id"), "com.artsaverin.inapp");
    assert.equal(appleCalls[0].form.get("code"), "c0de");
    assert.equal(appleCalls[0].form.get("grant_type"), "authorization_code");
    const row = await prisma.user.findUniqueOrThrow({ where: { id: body.user!.id } });
    assert.ok(row.appleRefreshToken && !row.appleRefreshToken.includes("apple-refresh-secret"), "stored encrypted");
    assert.equal(apple.decryptAppSecret(row.appleRefreshToken), "apple-refresh-secret");

    tokenEndpointSub = "someone-else";
    const other = await signInApple({ sub: "apple-siwa-2" }, { authorizationCode: "c0de2" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: other.body.user!.id } })).appleRefreshToken, null);

    tokenEndpointSub = "apple-siwa-3";
    tokenEndpointIdToken = false;
    try {
      const noId = await signInApple({ sub: "apple-siwa-3" }, { authorizationCode: "c0de3" });
      assert.equal(noId.res.status, 200, "sign-in itself still works");
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: noId.body.user!.id } })).appleRefreshToken, null, "no id_token → owner unknown → not stored");
    } finally {
      tokenEndpointIdToken = true;
    }

    appleCalls = [];
    const del = await accountRoute.DELETE(req("/api/app/account", { method: "DELETE", token: body.token, body: { confirm: "DELETE" } }));
    assert.equal(del.status, 200);
    assert.deepEqual(await del.json(), { ok: true, appleRevoked: true });
    assert.equal(appleCalls.length, 1);
    assert.equal(appleCalls[0].url, "https://appleid.apple.com/auth/revoke");
    assert.equal(appleCalls[0].form.get("token"), "apple-refresh-secret");
    assert.equal(appleCalls[0].form.get("token_type_hint"), "refresh_token");
    assert.equal(await prisma.user.findUnique({ where: { id: body.user!.id } }), null);
  });
});

describe("Account deletion", () => {
  test("DELETE /api/app/account: confirm required, then every relation cascades (SetNull where it must)", async () => {
    const { body } = await signInApple({ sub: "apple-delete-1", email: "delete@example.com" });
    const id = body.user!.id;
    const token = body.token!;
    await prisma.user.update({ where: { id }, data: { telegramId: "900001", lifetime: true } });
    const conn = await prisma.mcpConnection.create({
      data: { userId: id, clientIdHash: "h", clientName: "Client", redirectUri: "http://localhost/cb", resource: "r" },
    });
    await prisma.mcpToken.create({ data: { connectionId: conn.id, tokenHash: "mcp-token-hash", kind: "access", expiresAt: new Date(Date.now() + 3_600_000) } });
    await prisma.mcpAuthCode.create({
      data: { userId: id, connectionId: conn.id, codeHash: "mcp-code-hash", clientIdHash: "h", redirectUri: "x", challenge: "c", resource: "r", expiresAt: new Date() },
    });
    await prisma.mcpCall.create({ data: { userId: id, connectionId: conn.id, tool: "list_niches" } });
    const event = await prisma.mcpEvent.create({ data: { userId: id, connectionId: conn.id, event: "token" } });
    await prisma.pageView.create({ data: { userId: id, path: "/ru" } });
    await prisma.paymentAttempt.create({ data: { id: "pay-delete-1", userId: id, method: "card", amountRub: 990 } });
    await prisma.tokenLedger.create({ data: { userId: id, delta: 0, reason: "lifetime", balanceAfter: 0 } });
    await prisma.unlock.create({ data: { userId: id, type: "idea", slug: "habit-tracking-1" } });
    await prisma.favorite.create({ data: { userId: id, slug: "habit-tracking-1" } });
    await prisma.siteSaved.create({ data: { userId: id, kind: "idea", slug: "habit-tracking-2" } });
    await prisma.siteNote.create({ data: { userId: id, kind: "idea", slug: "habit-tracking-2", text: "t" } });
    const code = await prisma.appStoreCode.create({
      data: { code: "DELETECODE00000001", redeemUrl: "https://apps.apple.com/redeem", batch: "t", expiresAt: new Date("2099-01-01"), userId: id, assignedAt: new Date() },
    });
    await prisma.loginToken.create({ data: { token: "tg-login-1", telegramId: "900001", expiresAt: new Date(Date.now() + 60_000) } });
    await auth.mintAppLoginCode(id);

    let res = await accountRoute.DELETE(req("/api/app/account", { method: "DELETE", token, body: {} }));
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: "confirm_required" });
    res = await accountRoute.DELETE(req("/api/app/account", { method: "DELETE", token, body: { confirm: "delete" } }));
    assert.equal(res.status, 400, "exact word only");
    assert.equal((await accountRoute.DELETE(req("/api/app/account", { method: "DELETE", body: { confirm: "DELETE" } }))).status, 401);

    res = await accountRoute.DELETE(req("/api/app/account", { method: "DELETE", token, body: { confirm: "DELETE" } }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, appleRevoked: false }, "no Sign in with Apple key configured → not revoked");

    assert.equal(await prisma.user.findUnique({ where: { id } }), null);
    const counts = await Promise.all([
      prisma.appSession.count({ where: { userId: id } }),
      prisma.appLoginCode.count({ where: { userId: id } }),
      prisma.mcpConnection.count({ where: { userId: id } }),
      prisma.mcpToken.count({ where: { connectionId: conn.id } }),
      prisma.mcpAuthCode.count({ where: { userId: id } }),
      prisma.mcpCall.count({ where: { userId: id } }),
      prisma.pageView.count({ where: { userId: id } }),
      prisma.paymentAttempt.count({ where: { userId: id } }),
      prisma.tokenLedger.count({ where: { userId: id } }),
      prisma.unlock.count({ where: { userId: id } }),
      prisma.favorite.count({ where: { userId: id } }),
      prisma.siteSaved.count({ where: { userId: id } }),
      prisma.siteNote.count({ where: { userId: id } }),
      prisma.loginToken.count({ where: { telegramId: "900001" } }),
    ]);
    assert.deepEqual(counts, Array(counts.length).fill(0));
    const keptEvent = await prisma.mcpEvent.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(keptEvent.userId, null);
    assert.equal(keptEvent.connectionId, null);
    const keptCode = await prisma.appStoreCode.findUniqueOrThrow({ where: { id: code.id } });
    assert.equal(keptCode.userId, null, "the code stays out of the pool, unlinked");
    assert.equal((await meRoute.GET(req("/api/app/me", { token }))).status, 401, "the token died with the account");

    // Signing in with the same Apple ID afterwards starts a fresh account.
    const again = await signInApple({ sub: "apple-delete-1" });
    assert.notEqual(again.body.user!.id, id);
  });

  test("POST /api/site/account/delete refuses cross-site requests before touching the session", async () => {
    let res = await webDeleteRoute.POST(
      req("/api/site/account/delete", { body: { confirm: "DELETE" }, headers: { origin: "https://evil.example", host: "localhost" } }),
    );
    assert.equal(res.status, 403);
    res = await webDeleteRoute.POST(req("/api/site/account/delete", { body: { confirm: "DELETE" }, headers: { "sec-fetch-site": "cross-site" } }));
    assert.equal(res.status, 403);
    // nginx passes a client-sent X-Forwarded-Host through: it must not vouch for a foreign Origin.
    res = await webDeleteRoute.POST(
      req("/api/site/account/delete", {
        body: { confirm: "DELETE" },
        headers: { origin: "https://evil.example", host: "inapp.pro", "x-forwarded-host": "evil.example" },
      }),
    );
    assert.equal(res.status, 403);
  });
});
