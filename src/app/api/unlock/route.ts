import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";
import { unlockItem } from "@/lib/tokens";
import { UNLOCK_COST, type UnlockType } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

const TYPES: UnlockType[] = ["app", "idea", "category"];

// Spend tokens to permanently unlock a piece of content. Returns the new balance
// (or 401 / 402 with the shortfall so the UI can route to the buy-tokens page).
export async function POST(req: Request) {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { type, slug } = await req.json().catch(() => ({}));
  if (!TYPES.includes(type) || typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Admins / friends / legacy comp already see everything — nothing to charge.
  const unlimited = u.isAdmin || isFriendIdentity(u) || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());
  if (unlimited) return NextResponse.json({ ok: true, already: true, balance: u.tokens ?? 0 });

  const res = await unlockItem(u.id, type as UnlockType, slug);
  if (!res.ok) {
    return NextResponse.json(
      { error: res.reason, balance: res.balance, needed: res.needed },
      { status: res.reason === "funds" ? 402 : 401 },
    );
  }
  return NextResponse.json({ ok: true, already: res.already, balance: res.balance, cost: UNLOCK_COST[type as UnlockType] });
}
