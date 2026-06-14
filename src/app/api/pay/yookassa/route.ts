import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { createPayment, yookassaEnabled } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

// Plans must mirror Pricing.tsx / the bot: month 1000₽/30д, 6 мес 3000₽/180д.
const PLANS: Record<string, { rub: number; days: number; title: string }> = {
  month: { rub: 1000, days: 30, title: "Месяц" },
  half: { rub: 3000, days: 180, title: "6 месяцев" },
};

export async function POST(req: Request) {
  if (!yookassaEnabled()) {
    return NextResponse.json({ error: "Оплата картой ещё не подключена" }, { status: 503 });
  }
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const p = PLANS[body.plan ?? ""];
  if (!p) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });

  const origin = new URL(req.url).origin;
  try {
    const payment = await createPayment({
      amountRub: p.rub,
      description: `inApp Премиум — ${p.title}`,
      metadata: { userId: u.id, plan: body.plan as string, days: String(p.days) },
      returnUrl: `${origin}/premium`,
      idempotenceKey: crypto.randomUUID(),
    });
    const url = payment?.confirmation?.confirmation_url ?? null;
    if (!url) return NextResponse.json({ error: "ЮKassa не вернула ссылку" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
