import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";
import { drawIdea, peekIdea } from "@/lib/tokens";
import { GUEST_DRAWS } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

// «Колода идей»: draw one random top idea. Logged-out visitors get a free teaser
// (no breakdown); the client caps them at GUEST_DRAWS. Logged-in: first draw free,
// then DRAW_COST energy, and the idea is fully unlocked. `exclude` avoids repeats.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.filter((s: unknown) => typeof s === "string").slice(0, 500) : [];

  const u = await getSessionUser();
  if (!u) {
    if (exclude.length >= GUEST_DRAWS) return NextResponse.json({ needAuth: true });
    const card = peekIdea(exclude);
    if (!card) return NextResponse.json({ done: true });
    return NextResponse.json({ ok: true, card, guest: true, free: true, cost: 0 });
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
