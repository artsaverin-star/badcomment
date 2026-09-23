// In-memory token buckets for the app sign-in endpoints (docs/site-v2/APP-ACCOUNTS.md).
// One Node process serves the site (deploy/deploy.sh → systemd `next start`), so a per-process
// map is enough to blunt brute force and hammering; it resets on restart, which is fine.
//
// A bucket holds `capacity` tokens and refills `perMinute` tokens a minute; each request takes
// one. Keys are "<bucket>:<client key>" (IP, or user id for per-account limits).

type Bucket = { tokens: number; at: number };

export type RateRule = { capacity: number; perMinute: number };

/** Limits of the app auth endpoints (per IP unless noted). */
export const APP_RATE_RULES = {
  apple: { capacity: 10, perMinute: 10 },
  exchange: { capacity: 10, perMinute: 10 },
  handoff: { capacity: 30, perMinute: 30 },
  logout: { capacity: 20, perMinute: 20 },
  deleteAccount: { capacity: 5, perMinute: 5 },
  /** Per account: RevenueCat re-reads on demand. */
  entitlements: { capacity: 6, perMinute: 6 },
} as const satisfies Record<string, RateRule>;

const MAX_KEYS = 20_000;
const buckets = new Map<string, Bucket>();

/** Takes one token. `retryAfter` (seconds) is set when the bucket is empty. */
export function takeToken(bucket: string, key: string, rule: RateRule, now = Date.now()): { ok: boolean; retryAfter: number } {
  const id = `${bucket}:${key}`;
  const perMs = rule.perMinute / 60_000;
  const prev = buckets.get(id);
  const tokens = prev ? Math.min(rule.capacity, prev.tokens + (now - prev.at) * perMs) : rule.capacity;
  if (tokens < 1) {
    buckets.set(id, { tokens, at: now });
    return { ok: false, retryAfter: Math.max(1, Math.ceil((1 - tokens) / perMs / 1000)) };
  }
  if (!prev && buckets.size >= MAX_KEYS) prune(now);
  buckets.set(id, { tokens: tokens - 1, at: now });
  return { ok: true, retryAfter: 0 };
}

/** Drops buckets idle for 10 minutes (every rule above is full again by then). */
function prune(now: number) {
  for (const [id, b] of buckets) if (now - b.at > 10 * 60_000) buckets.delete(id);
  // Still full (an attack from many addresses): forget the oldest half.
  if (buckets.size >= MAX_KEYS) {
    let drop = Math.floor(buckets.size / 2);
    for (const id of buckets.keys()) {
      if (drop-- <= 0) break;
      buckets.delete(id);
    }
  }
}

/** Test hook: forget every bucket. */
export function resetRateLimits() {
  buckets.clear();
}

/**
 * Client address for rate limiting. nginx (deploy/nginx-badcomment.conf) sets X-Real-IP to the
 * peer address; X-Forwarded-For's first entry is client-controlled, so it is only a fallback
 * (local dev without nginx).
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const fwd = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return fwd ? fwd.slice(0, 64) : "local";
}
