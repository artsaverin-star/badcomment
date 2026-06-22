import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { createPayment, yookassaEnabled } from "@/lib/yookassa";
import { getPack, tokensWord, LIFETIME, DECK_PRICE_RUB, CATEGORY_PRICE_RUB, DECK_CREDIT_RUB } from "@/lib/tokenConfig";
import { PREMIUM_NICHE_SET } from "@/lib/premiumNiches";
import { ownsDeck } from "@/lib/unlocks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!yookassaEnabled()) {
    return NextResponse.json({ error: "Оплата картой ещё не подключена" }, { status: 503 });
  }
  const u = await getSessionUser();
  if (!u) return NextResponse.json({ error: "Нужно войти" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { kind?: string; slug?: string; pack?: string; method?: string };
  const method = body.method === "sbp" ? "sbp" : body.method === "bank_card" ? "bank_card" : undefined;

  // Build the SKU: new direct-₽ model (deck / category / lifetime), with the deck
  // price credited toward a later category or lifetime. Legacy token packs still
  // work for any in-flight checkout but are no longer offered in the UI.
  let amountRub: number;
  let description: string;
  let metadata: Record<string, string>;

  if (body.kind === "deck") {
    amountRub = DECK_PRICE_RUB;
    description = "inApp — Колода идей (топ-разборы)";
    metadata = { userId: u.id, kind: "deck" };
  } else if (body.kind === "category") {
    const slug = body.slug ?? "";
    if (!PREMIUM_NICHE_SET.has(slug)) return NextResponse.json({ error: "Категория недоступна" }, { status: 400 });
    const credit = (await ownsDeck(u.id)) ? DECK_CREDIT_RUB : 0;
    amountRub = Math.max(1, CATEGORY_PRICE_RUB - credit);
    description = "inApp — Разбор категории";
    metadata = { userId: u.id, kind: "category", slug };
  } else if (body.kind === "lifetime") {
    const credit = (await ownsDeck(u.id)) ? DECK_CREDIT_RUB : 0;
    amountRub = Math.max(1, LIFETIME.rub - credit);
    description = "inApp — Lifetime (всё навсегда)";
    metadata = { userId: u.id, kind: "lifetime" };
  } else {
    // Legacy token pack (kept for backward compatibility; not shown in UI).
    const p = getPack(body.pack ?? "");
    if (!p) return NextResponse.json({ error: "Неизвестный пак" }, { status: 400 });
    amountRub = p.rub;
    description = `inApp — ${p.tokens} ${tokensWord(p.tokens)}`;
    metadata = { userId: u.id, pack: p.id, tokens: String(p.tokens) };
  }

  // За nginx req.url видит localhost:3000 — строим публичный адрес из
  // forwarded-заголовков или SITE_URL, иначе вернёт на localhost.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.SITE_URL || (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin);
  try {
    const payment = await createPayment({
      amountRub,
      description,
      metadata,
      returnUrl: `${origin}/library`,
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
