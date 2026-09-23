import { revokeAppSession } from "@/lib/appAuth";
import { appJson, rateLimit, requireAppUser } from "@/lib/appHttp";

// POST /api/app/auth/logout (Bearer) — signs this app install out: its token stops working.
//   → 200 {ok:true} | 401

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, "logout");
  if (limited) return limited;
  const me = await requireAppUser(req);
  if (!me.ok) return me.response;
  await revokeAppSession(me.auth.sessionId);
  return appJson({ ok: true });
}
