import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createPayment, yookassaEnabled } from "@/lib/yookassa";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

function cleanSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim().slice(0, 160);
  return source && /^[a-zA-Z0-9_./:-]+$/.test(source) ? source : null;
}

export async function POST(req: Request) {
  if (!yookassaEnabled()) {
    return NextResponse.json({ error: "Оплата картой ещё не подключена" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
  if (user.lifetime || user.isAdmin) return NextResponse.json({ error: "Полный доступ уже открыт" }, { status: 409 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; method?: string; source?: string };
  if (body.kind !== "lifetime" && body.kind !== "friend") {
    return NextResponse.json({ error: "Неизвестный товар" }, { status: 400 });
  }
  const method = body.method === "sbp" ? "sbp" : body.method === "bank_card" ? "bank_card" : null;
  if (!method) return NextResponse.json({ error: "Выберите способ оплаты" }, { status: 400 });

  const checkoutId = crypto.randomUUID();
  const source = cleanSource(body.source);
  await prisma.paymentAttempt.create({
    data: {
      id: checkoutId,
      userId: user.id,
      sku: "lifetime",
      method,
      source,
      amountRub: ACCESS_PRICE_RUB,
    },
  });

  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.SITE_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(req.url).origin);

  try {
    const payment = await createPayment({
      amountRub: ACCESS_PRICE_RUB,
      description: "inApp — полный доступ навсегда",
      metadata: {
        userId: user.id,
        kind: "lifetime",
        checkoutId,
        ...(source ? { source } : {}),
      },
      returnUrl: `${origin}/library?checkout=${encodeURIComponent(checkoutId)}`,
      idempotenceKey: checkoutId,
      method,
    });
    const url = payment.confirmation?.confirmation_url ?? null;
    if (!url || !payment.id) {
      await prisma.paymentAttempt.update({ where: { id: checkoutId }, data: { status: "failed", error: "missing_confirmation" } });
      return NextResponse.json({ error: "ЮKassa не вернула ссылку" }, { status: 502 });
    }
    await prisma.paymentAttempt.updateMany({
      // A very fast webhook may already be confirming the payment. Only the
      // initial creator is allowed to move a fresh row into provider pending.
      where: { id: checkoutId, status: "created" },
      data: { providerPaymentId: payment.id, status: payment.status || "pending" },
    });
    return NextResponse.json({ url, checkout: checkoutId });
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: checkoutId },
      data: { status: "failed", error: error instanceof Error ? error.message.slice(0, 300) : "unknown" },
    }).catch(() => {});
    return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 502 });
  }
}
