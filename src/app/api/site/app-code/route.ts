import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { codeForUser } from "@/lib/appStoreCodes";

// GET /api/site/app-code — the signed-in website lifetime buyer's personal App Store code
// (free lifetime Plus in the iOS app). 401 guest, 403 not a lifetime buyer, {code:null} when
// the pool is empty. Personal data: never cached.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  if (!me.lifetime) return NextResponse.json({ error: "not_eligible" }, { status: 403, headers: NO_STORE });
  const code = await codeForUser(me);
  return NextResponse.json(
    code
      ? { code: code.code, redeemUrl: code.redeemUrl, expiresAt: code.expiresAt.toISOString(), expired: code.expired }
      : { code: null },
    { headers: NO_STORE },
  );
}
