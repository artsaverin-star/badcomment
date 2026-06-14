import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(mail)) return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  if (typeof password !== "string" || password.length < 6)
    return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email: mail } });
  if (exists) return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });

  const firstUser = (await prisma.user.count()) === 0;
  const user = await prisma.user.create({
    data: {
      email: mail,
      passwordHash: hashPassword(password),
      firstName: (typeof name === "string" && name.trim()) || null,
      isAdmin: firstUser,
    },
  });
  await setSession(user.id);
  const premium = user.isAdmin || !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());
  return NextResponse.json({ ok: true, premium });
}
