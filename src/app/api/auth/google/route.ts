import { NextResponse } from "next/server";
import { loginWithGoogle, verifyGoogleIdToken } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

// Google Identity Services: the client sends the ID token (credential); we verify
// it and open a session. (Content-blocker users who can't load GIS use the
// redirect flow at /api/auth/google/start instead.)
export async function POST(req: Request) {
  const { credential } = await req.json().catch(() => ({}));
  if (!credential) return NextResponse.json({ error: "no credential" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const profile = await verifyGoogleIdToken(credential, clientId);
  if (!profile) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const user = await loginWithGoogle(profile.sub, profile.email, profile.name);
  const premium = !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());
  return NextResponse.json({ ok: true, premium });
}
