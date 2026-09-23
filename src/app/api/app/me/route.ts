import { appUserPayload } from "@/lib/appAuth";
import { currentAppEntitlement, plusSummary } from "@/lib/appEntitlements";
import { appJson, requireAppUser } from "@/lib/appHttp";

// GET /api/app/me (Bearer) — the signed-in account and its Plus (docs/site-v2/APP-ACCOUNTS.md):
//   → 200 {user: {id, name, email, methods}, plus: {active, lifetime, until, sources}} | 401
// The App Store part of Plus (source "app") is RevenueCat's entitlement, re-read when the cached
// value is older than 15 minutes (waits at most 3 s, else the cache answers).

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const me = await requireAppUser(req);
  if (!me.ok) return me.response;
  const user = me.auth.user;
  const app = await currentAppEntitlement(user);
  return appJson({ user: appUserPayload(user), plus: plusSummary(user, app) });
}
