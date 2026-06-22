import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ user: null, premium: false, friend: false, unlimited: false });
  const friend = isFriendIdentity(u);
  const unlimited = u.isAdmin || u.lifetime || friend || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());
  return NextResponse.json({
    user: { username: u.username, firstName: u.firstName, isAdmin: u.isAdmin, premiumUntil: u.premiumUntil },
    premium: unlimited,
    friend,
    unlimited,
    lifetime: u.lifetime,
  });
}
