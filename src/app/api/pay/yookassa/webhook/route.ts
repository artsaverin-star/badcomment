import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, yookassaEnabled } from "@/lib/yookassa";
import { grantTokens } from "@/lib/tokens";
import { grantUnlock, type BuyKind } from "@/lib/unlocks";

export const dynamic = "force-dynamic";

// ЮKassa payment notification. We never trust the body — we re-fetch the payment
// from the API and credit only if it's actually succeeded+paid. The payment id is
// the ledger ref, so a re-delivered webhook can't double-credit. Always answer 200
// so ЮKassa doesn't retry forever.
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

  const meta = payment?.metadata ?? {};
  const userId = meta.userId;
  const ref = `yk:${id}`;
  if (!userId) return NextResponse.json({ ok: true });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true });

    // New direct-₽ model: metadata.kind = deck | category | lifetime.
    if (meta.kind === "deck" || meta.kind === "category" || meta.kind === "lifetime") {
      await grantUnlock(userId, meta.kind as BuyKind, meta.slug ?? null, ref);
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
      await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: "lifetime", ref, balanceAfter: user.tokens } });
    } else {
      await grantTokens(userId, tokens, "purchase", ref);
    }
  } catch {
    /* swallow — ack anyway, ЮKassa retries on non-200 */
  }
  return NextResponse.json({ ok: true });
}
