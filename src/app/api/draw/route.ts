import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";
import { drawIdea, peekIdea } from "@/lib/tokens";
import { GUEST_DRAWS } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

const GUEST_COOKIE = "gd"; // guest draw count — server-enforced cap (survives reload)

// «Колода идей»: draw one random top idea. Logged-out visitors get GUEST_DRAWS free
// cards, capped by a cookie (so a page reload can't reset the freebies). Logged-in:
// first FREE_DRAWS free, then DRAW_COST energy, idea fully unlocked. `exclude` =
// no repeats within a session.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.filter((s: unknown) => typeof s === "string").slice(0, 500) : [];

  const u = await getSessionUser();
  if (!u) {
    const jar = await cookies();
    const used = Number(jar.get(GUEST_COOKIE)?.value || 0);
    if (used >= GUEST_DRAWS) return NextResponse.json({ needAuth: true });
    const card = peekIdea(exclude);
    if (!card) return NextResponse.json({ done: true });
    const res = NextResponse.json({ ok: true, card, guest: true, free: true, cost: 0, guestUsed: used + 1 });
    res.cookies.set(GUEST_COOKIE, String(used + 1), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  const unlimited =
    u.isAdmin || u.lifetime || isFriendIdentity(u) || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());

  const res = await drawIdea(u.id, unlimited, exclude);
  if (!res.ok) {
    if (res.reason === "funds") {
      return NextResponse.json({ error: "funds", balance: res.balance, needed: res.needed }, { status: 402 });
    }
    return NextResponse.json({ done: true, balance: res.balance });
  }
  return NextResponse.json({ ok: true, card: res.card, free: res.free, cost: res.cost, balance: res.balance, remaining: res.remaining });
}
