import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, yookassaEnabled } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

// ЮKassa payment notification. We never trust the body — we re-fetch the payment
// from the API and grant premium only if it's actually succeeded+paid. Always
// answer 200 so ЮKassa doesn't retry forever.
export async function POST(req: Request) {
  if (!yookassaEnabled()) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as { object?: { id?: string } } | null;
  const id = body?.object?.id;
  if (!id) return NextResponse.json({ ok: true });

  let payment;
  try {
    payment = await getPayment(id);
  } catch {
    return NextResponse.json({ ok: true });
  }
  if (payment?.status !== "succeeded" || payment?.paid !== true) return NextResponse.json({ ok: true });

  const userId = payment?.metadata?.userId;
  const days = Number(payment?.metadata?.days || 0);
  if (!userId || !days) return NextResponse.json({ ok: true });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const now = new Date();
      const base = user.premiumUntil && new Date(user.premiumUntil) > now ? new Date(user.premiumUntil) : now;
      const until = new Date(base.getTime() + days * 86400000);
      await prisma.user.update({ where: { id: userId }, data: { premiumUntil: until } });
    }
  } catch {
    /* swallow — ack anyway, ЮKassa retries on non-200 */
  }
  return NextResponse.json({ ok: true });
}
