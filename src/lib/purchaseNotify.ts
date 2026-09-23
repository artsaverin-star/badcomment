import https from "node:https";
import { after } from "next/server";
import { prisma } from "./prisma";

// Owner ping in Telegram for every NEW paid purchase: YooKassa (webhook) and Telegram Stars
// deck/category grants (the bot → /api/internal/grant). Stars lifetime and token packs are
// granted inside the bot itself; the bot then asks the site to send the same ping
// (/api/internal/purchase-notify). Stars sales are switched off (2026-09-23); those paths only
// finish payments that were already under way.
// Sent by the site's bot (TELEGRAM_BOT_TOKEN, @inAppProBot) to PURCHASE_NOTIFY_TG_IDS
// (comma list of Telegram user ids) or, when unset, to every admin with a linked Telegram.
// PURCHASE_NOTIFY=off switches it off. Never throws and never delays the payment flow:
// callers use notifyPurchaseLater(), which runs after the response and pings a payment ref at
// most once per process (the site is one `next start` process). The text carries no personal
// data — product, amount, payment method, source and totals only.
// The server is in Russia and its connections to api.telegram.org are dropped now and then
// (2026-09): every message is retried with backoff for ~30 minutes, and each attempt also tries
// the Bot API addresses directly (TLS still verifies api.telegram.org).

export type PurchaseKind = "lifetime" | "deck" | "category" | "tokens";

export type PurchaseInfo = {
  kind: PurchaseKind;
  provider: "yookassa" | "stars";
  /** Real ₽ charged (YooKassa). */
  amountRub?: number | null;
  /** Stars charged (Telegram Stars). */
  stars?: number | null;
  /** YooKassa payment method type: bank_card | sbp | … */
  method?: string | null;
  /** Checkout surface (PaymentAttempt.source / YooKassa metadata.source). */
  source?: string | null;
  slug?: string | null;
  /** YooKassa test-shop payment. */
  test?: boolean;
};

/** Today's ₽ payments (YooKassa) in Moscow time, and everyone with lifetime access. */
export type PurchaseStats = { todayCount: number; todayRub: number; lifetimeUsers: number };

const PRODUCT: Record<PurchaseKind, string> = {
  lifetime: "inApp Plus навсегда",
  deck: "колода идей (старый товар)",
  category: "категория (старый товар)",
  tokens: "пакет энергии (старый товар)",
};

const METHOD: Record<string, string> = { bank_card: "карта", sbp: "СБП", yoo_money: "ЮMoney", sberbank: "SberPay", tinkoff_bank: "T-Pay" };

const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

/**
 * Buyer-influenced text (checkout source, legacy slug) → a plain token Telegram cannot turn into
 * a link or a mention: only letters, digits, "_", "-" and "/" survive (so "https://x.com" and
 * "t.me/x" lose their dots and colons).
 */
export function plainToken(value: string | null | undefined, max = 60): string | null {
  const clean = (value ?? "").replace(/[^A-Za-z0-9_/-]/g, "_").slice(0, max);
  return /[A-Za-z0-9]/.test(clean) ? clean : null;
}

/** The message text (plain text, no parse_mode). Pure: unit-tested. */
export function formatPurchaseMessage(p: PurchaseInfo, stats?: PurchaseStats | null): string {
  const slug = plainToken(p.slug);
  const source = plainToken(p.source);
  const product = p.kind === "category" && slug ? `категория «${slug}» (старый товар)` : PRODUCT[p.kind];
  const price =
    p.provider === "stars"
      ? `${p.stars ? `${p.stars} ⭐` : "⭐"} · Telegram Stars`
      : `${p.amountRub ? rub(p.amountRub) : "сумма неизвестна"} · ЮKassa${p.method ? `, ${METHOD[p.method] ?? plainToken(p.method, 30) ?? "другой способ"}` : ""}`;
  const lines = [`${p.test ? "🧪 Тестовый платёж\n" : ""}💰 Новая покупка: ${product}`, price];
  if (source) lines.push(`Откуда: ${source}`);
  if (stats) {
    lines.push(
      stats.todayCount
        ? `Сегодня (МСК) на сайте: ${stats.todayCount} ${plural(stats.todayCount, "оплата", "оплаты", "оплат")} на ${rub(stats.todayRub)}`
        : "Сегодня (МСК) на сайте: оплат в рублях нет",
    );
    lines.push(`Доступ навсегда: ${stats.lifetimeUsers} ${plural(stats.lifetimeUsers, "человек", "человека", "человек")}`);
  }
  return lines.join("\n");
}

/** Start of the current day in Moscow (UTC+3, no DST) as a UTC instant. */
export function moscowDayStart(now: Date = new Date()): Date {
  const msk = new Date(now.getTime() + 3 * 3600_000);
  return new Date(Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate()) - 3 * 3600_000);
}

// Paid ₽ ledger rows: a YooKassa payment ref ("yk:<payment id>") — never admin grants or Stars.
const PAID_REASONS = ["lifetime", "buy_deck", "buy_category", "purchase"];

async function purchaseStats(): Promise<PurchaseStats | null> {
  try {
    const [rows, lifetimeUsers] = await Promise.all([
      prisma.tokenLedger.findMany({
        where: { reason: { in: PAID_REASONS }, createdAt: { gte: moscowDayStart() }, ref: { startsWith: "yk:" }, amountRub: { not: null } },
        select: { ref: true, amountRub: true },
        take: 10_000,
      }),
      prisma.user.count({ where: { lifetime: true } }),
    ]);
    // One payment = one ref, even if a racing re-delivery ever wrote its ledger row twice.
    const byRef = new Map(rows.map((r) => [r.ref, r.amountRub ?? 0]));
    return { todayCount: byRef.size, todayRub: [...byRef.values()].reduce((a, b) => a + b, 0), lifetimeUsers };
  } catch {
    return null;
  }
}

export function parseTgIds(value: string | undefined | null): string[] {
  return [...new Set((value ?? "").split(",").map((s) => s.trim()).filter((s) => /^-?\d{1,20}$/.test(s)))];
}

async function recipients(): Promise<string[]> {
  const fromEnv = parseTgIds(process.env.PURCHASE_NOTIFY_TG_IDS);
  if (fromEnv.length) return fromEnv;
  const admins = await prisma.user.findMany({ where: { isAdmin: true, telegramId: { not: null } }, select: { telegramId: true } });
  return parseTgIds(admins.map((a) => a.telegramId).join(","));
}

/** Delivery knobs (tests shorten the delays and switch the direct addresses off). */
export const telegramDelivery = {
  /** Known Bot API addresses, tried when the normal route fails. */
  directIps: ["149.154.167.220", "149.154.166.110"],
  /** Wait before each attempt: ~31.5 minutes in total. */
  retryDelaysMs: [0, 15_000, 60_000, 180_000, 600_000, 1_200_000],
};

type SendResult = "sent" | "rejected" | "failed";

/** POST to https://api.telegram.org<path> via one fixed IPv4 address; resolves the HTTP status. */
function postViaIp(ip: string, path: string, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "api.telegram.org",
        path,
        method: "POST",
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
        timeout: 8000,
        lookup: (_host, opts, cb) =>
          (opts as { all?: boolean }).all ? (cb as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: ip, family: 4 }]) : cb(null, ip, 4),
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end(body);
  });
}

/** One attempt: the normal route, then each direct address. 4xx = Telegram said no (final). */
async function sendOnce(token: string, payload: string): Promise<SendResult> {
  const base = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";
  const status = await fetch(`${base}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    signal: AbortSignal.timeout(8000),
  }).then((r) => r.status, () => 0);
  if (status >= 200 && status < 300) return "sent";
  if (status >= 400 && status < 500 && status !== 429) return "rejected";
  if (process.env.TELEGRAM_API_BASE) return "failed";
  for (const ip of telegramDelivery.directIps) {
    const s = await postViaIp(ip, `/bot${token}/sendMessage`, payload).catch(() => 0);
    if (s >= 200 && s < 300) return "sent";
    if (s >= 400 && s < 500 && s !== 429) return "rejected";
  }
  return "failed";
}

async function sendWithRetry(token: string, chatId: string, text: string): Promise<boolean> {
  const payload = JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true });
  for (const delay of telegramDelivery.retryDelaysMs) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const result = await sendOnce(token, payload).catch((): SendResult => "failed");
    if (result === "sent") return true;
    if (result === "rejected") {
      console.error("purchase notify: telegram rejected the message (has the owner started the bot?)");
      return false;
    }
  }
  console.error("purchase notify: telegram unreachable, gave up");
  return false;
}

/** Sends the ping (retrying for up to ~30 min). Resolves to the number of chats reached; never throws. */
export async function notifyPurchase(p: PurchaseInfo): Promise<number> {
  if (process.env.PURCHASE_NOTIFY === "off") return 0;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("purchase notify: TELEGRAM_BOT_TOKEN is not set");
    return 0;
  }
  try {
    const [to, stats] = await Promise.all([recipients(), purchaseStats()]);
    if (!to.length) {
      console.error("purchase notify: no recipients (PURCHASE_NOTIFY_TG_IDS or an admin with Telegram)");
      return 0;
    }
    const text = formatPurchaseMessage(p, stats);
    const results = await Promise.all(to.map((chatId) => sendWithRetry(token, chatId, text)));
    return results.filter(Boolean).length;
  } catch {
    console.error("purchase notify: failed");
    return 0;
  }
}

// Payment refs already pinged by this process (a concurrent re-delivery must not ping twice).
const pinged = new Map<string, number>();
const PINGED_TTL_MS = 48 * 3600_000;

/** First call for `ref` in this process → true; later calls (within 48 h) → false. */
export function claimPing(ref: string, now = Date.now()): boolean {
  for (const [k, t] of pinged) if (now - t > PINGED_TTL_MS) pinged.delete(k);
  if (pinged.has(ref)) return false;
  pinged.set(ref, now);
  return true;
}

/**
 * Schedules the ping after the response (Next `after`); outside a request it just starts it.
 * `ref` = the payment ref ("yk:<id>", "tg:<charge id>"): pinged at most once.
 */
export function notifyPurchaseLater(p: PurchaseInfo, ref: string): boolean {
  if (!claimPing(ref)) return false;
  try {
    after(() => notifyPurchase(p));
  } catch {
    void notifyPurchase(p);
  }
  return true;
}
