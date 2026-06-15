import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, yookassaEnabled } from "@/lib/yookassa";
import { grantTokens } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// ЮKassa payment notification. We never trust the body — we re-fetch the payment
// from the API and credit tokens only if it's actually succeeded+paid. The
// payment id is the ledger ref, so a re-delivered webhook can't double-credit.
// Always answer 200 so ЮKassa doesn't retry forever.
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
  const tokens = Number(payment?.metadata?.tokens || 0);
  const lifetime = payment?.metadata?.lifetime === "1";
  const ref = `yk:${id}`;
  if (!userId || (!tokens && !lifetime)) return NextResponse.json({ ok: true });

  try {
    const already = await prisma.tokenLedger.findFirst({ where: { ref } });
    if (already) return NextResponse.json({ ok: true });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true });
    if (lifetime) {
      await prisma.user.update({ where: { id: userId }, data: { lifetime: true } });
      await prisma.tokenLedger.create({
        data: { userId, delta: 0, reason: "lifetime", ref, balanceAfter: user.tokens },
      });
    } else {
      await grantTokens(userId, tokens, "purchase", ref);
    }
  } catch {
    /* swallow — ack anyway, ЮKassa retries on non-200 */
  }
  return NextResponse.json({ ok: true });
}
