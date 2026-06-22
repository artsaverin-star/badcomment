import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";
import { drawIdea } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// «Колода идей»: draw one random top idea. First draw free, then DRAW_COST energy;
// the drawn idea is fully unlocked. Returns the card + new balance (or 402 if short).
export async function POST() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });

  const unlimited =
    u.isAdmin || u.lifetime || isFriendIdentity(u) || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());

  const res = await drawIdea(u.id, unlimited);
  if (!res.ok) {
    if (res.reason === "funds") {
      return NextResponse.json({ error: "funds", balance: res.balance, needed: res.needed }, { status: 402 });
    }
    return NextResponse.json({ done: true, balance: res.balance }); // drawn the whole deck
  }
  return NextResponse.json({ ok: true, card: res.card, free: res.free, cost: res.cost, balance: res.balance, remaining: res.remaining });
}
