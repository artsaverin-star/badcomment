import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";
import { drawIdea, peekIdea } from "@/lib/tokens";
import { FREE_ANON_CARDS } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

const GUEST_COOKIE = "fc"; // anon free-reveal count — server-enforced (survives reload)

// «Колода»: reveal one deck card. Anon visitors get FREE_ANON_CARDS free reveals
// (cookie-capped, so a reload can't reset them). Logged-in non-owners get
// FREE_REG_CARDS reveals, then `paywall` (buy the deck). Deck owners / unlimited
// reveal freely. `exclude` = no repeats within a session.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.filter((s: unknown) => typeof s === "string").slice(0, 500) : [];

  const u = await getSessionUser();
  if (!u) {
    const jar = await cookies();
    const used = Number(jar.get(GUEST_COOKIE)?.value || 0);
    if (used >= FREE_ANON_CARDS) return NextResponse.json({ needAuth: true });
    const card = peekIdea(exclude);
    if (!card) return NextResponse.json({ done: true });
    const res = NextResponse.json({ ok: true, card, guest: true, guestUsed: used + 1 });
    res.cookies.set(GUEST_COOKIE, String(used + 1), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return res;
  }

  const unlimited =
    u.isAdmin || u.lifetime || isFriendIdentity(u) || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());

  const res = await drawIdea(u.id, unlimited, exclude);
  if (!res.ok) {
    if (res.reason === "paywall") return NextResponse.json({ paywall: true });
    return NextResponse.json({ done: true });
  }
  return NextResponse.json({ ok: true, card: res.card, remaining: res.remaining, replay: res.replay });
}
