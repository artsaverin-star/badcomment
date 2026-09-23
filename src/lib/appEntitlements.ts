import { prisma } from "./prisma";
import { isFriendIdentity } from "./friends";

// inApp Plus bought in the iOS app (App Store) → Plus on the server (docs/site-v2/APP-ACCOUNTS.md).
//
// The app reports purchases to RevenueCat under the account's User.id (Purchases.logIn after
// sign-in). The server reads the entitlement "plus" back with the app's PUBLIC SDK key and
// caches it on User (appPlusUntil / appLifetime / appCheckedAt). Only accounts that signed in
// in the app (User.appLinkedAt) are ever checked.
//
// Freshness: a cached value older than 15 minutes is re-read. When the cache says "active" the
// re-read happens in the background (nobody waits); when it says "not active" the caller waits
// at most 3 s (someone may have just bought in the app) and falls back to the cache.

export const REVENUECAT_ENTITLEMENT = "plus";
/** The iOS app's public SDK key (Inapp/Info.plist RevenueCatPublicSDKKey; revenuecat.json). */
const DEFAULT_REVENUECAT_PUBLIC_KEY = "appl_jHqCUVPRsIVxPSySaipvXAvyGpw";
export const APP_ENTITLEMENT_TTL_MS = 15 * 60_000;
/** Longest a page render / API call waits for RevenueCat. */
export const APP_ENTITLEMENT_TIMEOUT_MS = 3_000;
/** After a failed check, requests do not wait for RevenueCat again for this long. */
const FAILURE_BACKOFF_MS = 60_000;

export type AppEntitlementFields = {
  appLinkedAt: Date | null;
  appPlusUntil: Date | null;
  appLifetime: boolean;
  appCheckedAt: Date | null;
};

const APP_FIELDS = { appLinkedAt: true, appPlusUntil: true, appLifetime: true, appCheckedAt: true } as const;

/** The app entitlement columns of a user row (missing columns → "never linked"). */
export function appFieldsOf(u: Partial<AppEntitlementFields> | null | undefined): AppEntitlementFields {
  return {
    appLinkedAt: toDate(u?.appLinkedAt),
    appPlusUntil: toDate(u?.appPlusUntil),
    appLifetime: u?.appLifetime === true,
    appCheckedAt: toDate(u?.appCheckedAt),
  };
}

function toDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** App Store Plus is active: lifetime, or a subscription that has not expired yet. */
export function appPlusActive(u: Partial<AppEntitlementFields> | null | undefined, now = Date.now()): boolean {
  const f = appFieldsOf(u);
  return f.appLifetime || (!!f.appPlusUntil && f.appPlusUntil.getTime() > now);
}

// ---------------------------------------------------------------------------
// RevenueCat

type Fetch = typeof fetch;
let rcFetch: Fetch = (input, init) => fetch(input, init);

/** Test hook: replace the HTTP client used for RevenueCat (null = the real fetch). */
export function setRevenueCatFetch(f: Fetch | null) {
  rcFetch = f ?? ((input, init) => fetch(input, init));
  inflight.clear();
  failedAt.clear();
}

export function revenueCatPublicKey(): string {
  return process.env.REVENUECAT_PUBLIC_KEY?.trim() || DEFAULT_REVENUECAT_PUBLIC_KEY;
}

/** Sandbox (TestFlight / Xcode) purchases grant nothing in production unless explicitly allowed. */
function sandboxAllowed(): boolean {
  return process.env.REVENUECAT_ALLOW_SANDBOX === "1" || process.env.NODE_ENV !== "production";
}

export type AppEntitlement = { lifetime: boolean; until: Date | null };

type RcEntitlement = { expires_date?: string | null; grace_period_expires_date?: string | null; product_identifier?: string };
type RcPurchase = { is_sandbox?: boolean };
type RcBody = {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement | undefined>;
    subscriptions?: Record<string, RcPurchase | undefined>;
    non_subscriptions?: Record<string, RcPurchase[] | undefined>;
  };
};

/** RevenueCat v1 subscriber JSON → the "plus" entitlement (not entitled → {false, null}). */
export function parseRevenueCatSubscriber(body: unknown, opts: { allowSandbox: boolean }): AppEntitlement {
  const none: AppEntitlement = { lifetime: false, until: null };
  const sub = (body as RcBody | null)?.subscriber;
  const ent = sub?.entitlements?.[REVENUECAT_ENTITLEMENT];
  if (!ent || typeof ent !== "object") return none;

  if (!opts.allowSandbox) {
    const pid = ent.product_identifier ?? "";
    const subscription = sub?.subscriptions?.[pid];
    const oneTime = sub?.non_subscriptions?.[pid];
    const sandbox = subscription
      ? subscription.is_sandbox === true
      : Array.isArray(oneTime) && oneTime.length > 0 && oneTime.every((p) => p?.is_sandbox === true);
    if (sandbox) return none;
  }

  // expires_date: null = non-expiring (the lifetime product).
  if (ent.expires_date === null) return { lifetime: true, until: null };
  const dates = [ent.expires_date, ent.grace_period_expires_date]
    .map((s) => (typeof s === "string" ? new Date(s) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
  if (!dates.length) return none;
  return { lifetime: false, until: new Date(Math.max(...dates.map((d) => d.getTime()))) };
}

/** One RevenueCat read. null = could not tell (network, timeout, non-200, bad JSON). */
export async function fetchAppEntitlement(userId: string, timeoutMs = APP_ENTITLEMENT_TIMEOUT_MS): Promise<AppEntitlement | null> {
  try {
    const res = await rcFetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${revenueCatPublicKey()}`,
        Accept: "application/json",
        "X-Platform": "ios",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[revenuecat] subscriber check failed: HTTP ${res.status}`);
      return null;
    }
    return parseRevenueCatSubscriber(await res.json(), { allowSandbox: sandboxAllowed() });
  } catch (error) {
    console.warn(`[revenuecat] subscriber check failed: ${(error as Error)?.name ?? "error"}`);
    return null;
  }
}

const inflight = new Map<string, Promise<AppEntitlementFields | null>>();
const failedAt = new Map<string, number>();

/**
 * Re-reads RevenueCat now and stores the result on User. Concurrent calls for one account share
 * one request. null = RevenueCat did not answer (the cache is left as it was).
 */
export function refreshAppEntitlement(
  userId: string,
  opts: { timeoutMs?: number; ignoreBackoff?: boolean } = {},
): Promise<AppEntitlementFields | null> {
  const running = inflight.get(userId);
  if (running) return running;
  const failed = failedAt.get(userId);
  if (!opts.ignoreBackoff && failed && Date.now() - failed < FAILURE_BACKOFF_MS) return Promise.resolve(null);

  const job = (async () => {
    const ent = await fetchAppEntitlement(userId, opts.timeoutMs);
    if (!ent) {
      failedAt.set(userId, Date.now());
      if (failedAt.size > 10_000) failedAt.clear();
      return null;
    }
    failedAt.delete(userId);
    try {
      const row = await prisma.user.update({
        where: { id: userId },
        data: { appLifetime: ent.lifetime, appPlusUntil: ent.until, appCheckedAt: new Date() },
        select: APP_FIELDS,
      });
      return appFieldsOf(row);
    } catch {
      return null; // the account was deleted meanwhile
    }
  })().finally(() => inflight.delete(userId));
  inflight.set(userId, job);
  return job;
}

/**
 * The app entitlement of a user row, fresh enough to decide access (see the header comment).
 * `force` re-reads RevenueCat regardless of the cache (POST /api/app/entitlements/refresh).
 */
export async function currentAppEntitlement(
  user: { id: string } & Partial<AppEntitlementFields>,
  opts: { force?: boolean; timeoutMs?: number } = {},
): Promise<AppEntitlementFields> {
  const cached = appFieldsOf(user);
  if (!cached.appLinkedAt) return cached;
  if (opts.force) return (await refreshAppEntitlement(user.id, { timeoutMs: opts.timeoutMs, ignoreBackoff: true })) ?? cached;

  const fresh = !!cached.appCheckedAt && Date.now() - cached.appCheckedAt.getTime() < APP_ENTITLEMENT_TTL_MS;
  if (fresh) return cached;
  if (appPlusActive(cached)) {
    // Stale but active: answer now, re-read in the background (a refund shows up within minutes).
    void refreshAppEntitlement(user.id, { timeoutMs: opts.timeoutMs });
    return cached;
  }
  return (await refreshAppEntitlement(user.id, { timeoutMs: opts.timeoutMs })) ?? cached;
}

/** App Store Plus of an account known only by id (MCP). Never throws. */
export async function appPlusForUserId(userId: string): Promise<boolean> {
  try {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, ...APP_FIELDS } });
    if (!row?.appLinkedAt) return false;
    return appPlusActive(await currentAppEntitlement(row));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The contract's `plus` object (GET /api/app/me, POST /api/app/entitlements/refresh)

export type PlusSource = "web_lifetime" | "web_premium" | "friend" | "admin" | "app";
export type PlusSummary = { active: boolean; lifetime: boolean; until: string | null; sources: PlusSource[] };

export type PlusUser = {
  isAdmin: boolean;
  lifetime: boolean;
  premiumUntil: Date | null;
  telegramId: string | null;
  username: string | null;
  email: string | null;
};

/**
 * Every reason the account has Plus. `lifetime` = the access has no end date (web or app
 * lifetime, admin, friend); `until` = the latest end of the time-limited sources otherwise.
 */
export function plusSummary(user: PlusUser, app: Partial<AppEntitlementFields>, now = Date.now()): PlusSummary {
  const premiumUntil = toDate(user.premiumUntil);
  const appFields = appFieldsOf(app);
  const premiumActive = !!premiumUntil && premiumUntil.getTime() > now;
  const friend = isFriendIdentity(user);
  const appActive = appPlusActive(appFields, now);

  const sources: PlusSource[] = [];
  if (user.lifetime) sources.push("web_lifetime");
  if (premiumActive) sources.push("web_premium");
  if (friend) sources.push("friend");
  if (user.isAdmin) sources.push("admin");
  if (appActive) sources.push("app");

  const lifetime = user.lifetime || friend || user.isAdmin || (appActive && appFields.appLifetime);
  let until: Date | null = null;
  if (!lifetime) {
    for (const d of [premiumActive ? premiumUntil : null, appActive ? appFields.appPlusUntil : null]) {
      if (d && (!until || d > until)) until = d;
    }
  }
  return { active: sources.length > 0, lifetime, until: until ? until.toISOString() : null, sources };
}
