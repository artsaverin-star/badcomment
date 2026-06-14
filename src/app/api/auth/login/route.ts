import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = mail ? await prisma.user.findUnique({ where: { email: mail } }) : null;
  if (!user || !verifyPassword(typeof password === "string" ? password : "", user.passwordHash)) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }
  await setSession(user.id);
  const premium = user.isAdmin || !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());
  return NextResponse.json({ ok: true, premium });
}
