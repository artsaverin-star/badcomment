import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Begin "Login with Telegram": mint a one-time token, return the bot deep link.
// The user opens it, the bot stamps the token with their telegram id, and the
// client polls /api/auth/poll to finish.
export async function POST() {
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.loginToken.create({ data: { token, expiresAt } });
  const bot = process.env.BOT_USERNAME || "inAppProBot";
  return NextResponse.json({ token, url: `https://t.me/${bot}?start=login_${token}` });
}
