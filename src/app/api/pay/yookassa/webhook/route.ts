import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, yookassaEnabled } from "@/lib/yookassa";
import { grantTokens } from "@/lib/tokens";
import { grantUnlock, type BuyKind } from "@/lib/unlocks";

export const dynamic = "force-dynamic";

// ЮKassa payment notification. We never trust the body — we re-fetch the payment
// from the API and credit only if it's actually succeeded+paid. The payment id is
// the ledger ref, so a re-delivered webhook can't double-credit. We acknowledge
// only after a successful durable write; transient failures must be retried.
export async function POST(req: Request) {
  if (!yookassaEnabled()) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as { object?: { id?: string } } | null;
  const id = body?.object?.id;
  if (!id) return NextResponse.json({ ok: true });

  let payment;
  try {
    payment = await getPayment(id);
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  const meta = payment?.metadata ?? {};
  const userId = meta.userId;
  const checkoutId = meta.checkoutId;
  const ref = `yk:${id}`;
  const amountRub = Math.round(Number(payment?.amount?.value || 0)); // real ₽ charged
  if (!userId) return NextResponse.json({ ok: true });

  if (checkoutId) {
    await prisma.paymentAttempt.updateMany({
      where: { id: checkoutId, userId },
      // "succeeded" is reserved for the state after grantUnlock finishes.
      // Until then the browser must keep polling instead of reporting revenue.
      data: { providerPaymentId: id, status: payment?.status === "succeeded" ? "confirming" : payment?.status || "unknown" },
    }).catch(() => {});
  }
  if (payment?.status !== "succeeded" || payment?.paid !== true) return NextResponse.json({ ok: true });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true });

    // New direct-₽ model: metadata.kind = deck | category | lifetime.
    if (meta.kind === "deck" || meta.kind === "category" || meta.kind === "lifetime") {
      await grantUnlock(userId, meta.kind as BuyKind, meta.slug ?? null, ref, amountRub);
      if (checkoutId) {
        await prisma.paymentAttempt.updateMany({
          where: { id: checkoutId, userId },
          data: { status: "succeeded", confirmedAt: new Date(), error: null },
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Legacy: token pack or old lifetime flag (kept for in-flight checkouts).
    const tokens = Number(meta.tokens || 0);
    const lifetime = meta.lifetime === "1";
    if (!tokens && !lifetime) return NextResponse.json({ ok: true });
    const already = await prisma.tokenLedger.findFirst({ where: { ref } });
    if (already) return NextResponse.json({ ok: true });
    if (lifetime) {
      await prisma.user.update({ where: { id: userId }, data: { lifetime: true } });
      await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: "lifetime", ref, balanceAfter: user.tokens, amountRub } });
    } else {
      await grantTokens(userId, tokens, "purchase", ref);
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
