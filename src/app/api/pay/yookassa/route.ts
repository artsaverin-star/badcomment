import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { createPayment, yookassaEnabled } from "@/lib/yookassa";
import { getPack, tokensWord, LIFETIME } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!yookassaEnabled()) {
    return NextResponse.json({ error: "Оплата картой ещё не подключена" }, { status: 503 });
  }
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { pack?: string; kind?: string; method?: string };

  // Either a token pack or the one-time lifetime SKU.
  const lifetime = body.kind === "lifetime";
  const p = lifetime ? null : getPack(body.pack ?? "");
  if (!lifetime && !p) return NextResponse.json({ error: "Неизвестный пак" }, { status: 400 });

  const method = body.method === "sbp" ? "sbp" : body.method === "bank_card" ? "bank_card" : undefined;

  // За nginx req.url видит localhost:3000 — строим публичный адрес из
  // forwarded-заголовков или SITE_URL, иначе вернёт на localhost.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.SITE_URL || (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin);
  try {
    const payment = await createPayment({
      amountRub: lifetime ? LIFETIME.rub : p!.rub,
      description: lifetime ? "inApp — Lifetime (всё навсегда)" : `inApp — ${p!.tokens} ${tokensWord(p!.tokens)}`,
      metadata: lifetime
        ? { userId: u.id, lifetime: "1" }
        : { userId: u.id, pack: p!.id, tokens: String(p!.tokens) },
      returnUrl: `${origin}/tokens`,
      idempotenceKey: crypto.randomUUID(),
      method,
    });
    const url = payment?.confirmation?.confirmation_url ?? null;
    if (!url) return NextResponse.json({ error: "ЮKassa не вернула ссылку" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
