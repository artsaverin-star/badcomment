import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Poll the login token. Once the bot has stamped it with a telegram id, upsert
// the user, open a session, and report success.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  const lt = await prisma.loginToken.findUnique({ where: { token } });
  if (!lt) return NextResponse.json({ error: "unknown" }, { status: 404 });
  if (lt.expiresAt < new Date()) {
    await prisma.loginToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (!lt.telegramId) return NextResponse.json({ pending: true });

  const adminIds = (process.env.ADMIN_TG_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const firstUser = (await prisma.user.count()) === 0;
  const user = await prisma.user.upsert({
    where: { telegramId: lt.telegramId },
    update: { username: lt.username, firstName: lt.firstName },
    create: {
      telegramId: lt.telegramId,
      username: lt.username,
      firstName: lt.firstName,
      isAdmin: firstUser || adminIds.includes(lt.telegramId),
    },
  });
  await prisma.loginToken.delete({ where: { token } }).catch(() => {});
  await setSession(user.id);
  const premium = !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());
  return NextResponse.json({ ok: true, premium, user: { username: user.username, firstName: user.firstName, isAdmin: user.isAdmin } });
}
