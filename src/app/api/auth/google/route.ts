import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Google Identity Services: the client sends the ID token (credential); we verify
// it via Google's tokeninfo endpoint, check the audience, then upsert + session.
// No client secret / redirect needed — only the public client id.
export async function POST(req: Request) {
  const { credential } = await req.json().catch(() => ({}));
  if (!credential) return NextResponse.json({ error: "no credential" }, { status: 400 });

  const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!ti || !ti.sub || (clientId && ti.aud !== clientId)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const email = ti.email && ti.email_verified !== "false" ? (ti.email as string) : null;
  const name = ti.given_name || ti.name || null;

  const firstUser = (await prisma.user.count()) === 0;
  let user = await prisma.user.findUnique({ where: { googleId: ti.sub } });
  if (!user && email) user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: ti.sub, email: email ?? user.email, firstName: user.firstName ?? name } });
  } else {
    user = await prisma.user.create({ data: { googleId: ti.sub, email, firstName: name, isAdmin: firstUser } });
  }
  await setSession(user.id);
  const premium = !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());
  return NextResponse.json({ ok: true, premium });
}
