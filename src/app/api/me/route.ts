import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isFriendIdentity } from "@/lib/friends";

export const dynamic = "force-dynamic";

// Additive fields for the new site (spec 06 §3.6): user.id, user.email, plus (= unlimited),
// plusSource, plusUntil, and lifetime:false for guests. The old UI reads only the original ones.
export async function GET() {
  const u = await getSessionUser();
  if (!u) {
    return NextResponse.json({
      user: null,
      premium: false,
      friend: false,
      unlimited: false,
      lifetime: false,
      plus: false,
      plusSource: null,
      plusUntil: null,
    });
  }
  const friend = isFriendIdentity(u);
  const premiumActive = !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());
  const unlimited = u.isAdmin || u.lifetime || friend || premiumActive;
  const plusSource = u.isAdmin ? "admin" : u.lifetime ? "lifetime" : friend ? "friend" : premiumActive ? "premium" : null;
  return NextResponse.json({
    user: {
      username: u.username,
      firstName: u.firstName,
      isAdmin: u.isAdmin,
      premiumUntil: u.premiumUntil,
      id: u.id,
      email: u.email,
    },
    premium: unlimited,
    friend,
    unlimited,
    lifetime: u.lifetime,
    plus: unlimited,
    plusSource,
    plusUntil: plusSource === "premium" ? u.premiumUntil : null,
  });
}
