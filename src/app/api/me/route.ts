import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ user: null, premium: false });
  const premium = u.isAdmin || !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());
  return NextResponse.json({
    user: { username: u.username, firstName: u.firstName, isAdmin: u.isAdmin, premiumUntil: u.premiumUntil },
    premium,
  });
}
