import { currentAppEntitlement, plusSummary } from "@/lib/appEntitlements";
import { appJson, rateLimit, requireAppUser } from "@/lib/appHttp";

// POST /api/app/entitlements/refresh (Bearer) — re-reads RevenueCat now (the app calls it after
// an in-app purchase or restore) and answers the account's Plus.
//   → 200 {plus} | 401 | 429 (6 a minute per account)
// If RevenueCat does not answer within 5 s the cached value is returned.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await requireAppUser(req);
  if (!me.ok) return me.response;
  const user = me.auth.user;
  const limited = rateLimit(req, "entitlements", user.id);
  if (limited) return limited;
  const app = await currentAppEntitlement(user, { force: true, timeoutMs: 5_000 });
  return appJson({ plus: plusSummary(user, app) });
}
