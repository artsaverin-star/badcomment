import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSessionUser } from "@/lib/session";
import { createPayment, yookassaEnabled } from "@/lib/yookassa";
import { LIFETIME, FRIEND_PRICE_RUB, LAUNCH_PROMO, DECK_CREDIT_RUB } from "@/lib/tokenConfig";
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

  // The single SKU: lifetime access to everything. New deck/category/pack
  // checkouts are gone (the webhook still fulfills any in-flight ones).
  let amountRub: number;
  let description: string;
  let metadata: Record<string, string>;

  if (body.kind === "lifetime") {
    if (LAUNCH_PROMO) {
      // Launch promo: Lifetime sells at the flat «Друг проекта» price.
      amountRub = FRIEND_PRICE_RUB;
    } else {
      const credit = (await ownsDeck(u.id)) ? DECK_CREDIT_RUB : 0;
      amountRub = Math.max(1, LIFETIME.rub - credit);
    }
    description = "inApp — Lifetime (всё навсегда)";
    metadata = { userId: u.id, kind: "lifetime" };
  } else if (body.kind === "friend") {
    // Launch promo — lifetime ownership at the discounted founding price. The
    // "friend" kind is a legacy API name; the buyer-facing copy says «весь сайт
    // навсегда». Grants lifetime via metadata.kind so the webhook needs no
    // special case.
    amountRub = FRIEND_PRICE_RUB;
    description = "inApp — Весь сайт навсегда";
    metadata = { userId: u.id, kind: "lifetime", promo: "friend" };
  } else {
    return NextResponse.json({ error: "Неизвестный товар" }, { status: 400 });
  }

  // За nginx req.url видит localhost:3000 — строим публичный адрес из
  // forwarded-заголовков или SITE_URL, иначе вернёт на localhost.
  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.SITE_URL || (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin);
  const idem = crypto.randomUUID();
  const skuLabel = body.kind === "friend" ? "friend" : "lifetime";
  try {
    const payment = await createPayment({
      amountRub,
      description,
      metadata,
      // The return page reads these to fire the GA4/Metrica `purchase` event.
      returnUrl: `${origin}/library?bought=${skuLabel}&v=${amountRub}&t=${idem}`,
      idempotenceKey: idem,
      method,
    });
    const url = payment?.confirmation?.confirmation_url ?? null;
    if (!url) return NextResponse.json({ error: "ЮKassa не вернула ссылку" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
