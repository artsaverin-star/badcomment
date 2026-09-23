// inApp Telegram bot (@inAppProBot): web login binding. Dependency-free (raw Bot
// API over fetch) + Prisma for the shared prod.db. Run as its own process;
// token/db come from env.
// Telegram Stars sales are OFF (owner, 2026-09-23): no invoices, pre-checkout is
// declined, buy links and old buttons point to the website. successful_payment
// handling stays only to finish a payment that was already under way.
//   TELEGRAM_BOT_TOKEN, DATABASE_URL
import { PrismaClient } from "@prisma/client";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}
// Token packs — historical only (fulfillment of in-flight invoices); nothing
// offers them anymore. Mirror of src/lib/tokenConfig.ts TOKEN_PACKS.
const PACKS = {
  s: { tokens: 100, stars: 500 },
  m: { tokens: 300, stars: 1250 },
  l: { tokens: 700, stars: 2500 },
};
const API = `https://api.telegram.org/bot${TOKEN}`;
// Internal grant: the bot calls the site (same box) to reuse grantUnlock for
// deck/category Stars purchases. Auth by the shared SESSION_SECRET.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";
const SITE = process.env.SITE_URL || "https://inapp.pro";
// Where to buy now: the website's Plus page (YooKassa, Russia).
const BUY_TEXT = `Оплата звёздами больше не принимается.\nДоступ навсегда можно купить на сайте: ${SITE}/ru/plus`;
const PRECHECKOUT_DECLINED = "Оплата звёздами больше не принимается. Купите доступ на сайте inapp.pro.";
const prisma = new PrismaClient();

async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// Resolve the site userId (by uid from the web, else upsert by telegram id).
async function resolveUserId({ userId, telegramFrom }) {
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (u) return u.id;
  }
  if (telegramFrom) {
    const tgId = String(telegramFrom.id);
    const u = await prisma.user
      .upsert({
        where: { telegramId: tgId },
        update: { username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
        create: { telegramId: tgId, username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
      })
      .catch(() => null);
    if (u) return u.id;
  }
  return null;
}

// Grant deck/category via the site (reuses grantUnlock). ref makes it idempotent; the site
// pings the owner in Telegram for a newly granted payment (`stars` = amount for that ping).
async function grantViaSite({ userId, kind, slug, ref, stars }) {
  const r = await fetch(`${SITE}/api/internal/grant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: SECRET, userId, kind, slug: slug ?? null, ref, stars: stars ?? null }),
  })
    .then((x) => x.json())
    .catch(() => null);
  return !!(r && r.ok);
}

// Owner's Telegram ping for a NEW Stars purchase granted here in the bot (lifetime, token
// packs). The site formats and sends it like its own pings (src/lib/purchaseNotify.ts).
// Best effort, not awaited: never delays or fails the buyer's flow.
function notifyPurchaseViaSite({ kind, stars, ref }) {
  fetch(`${SITE}/api/internal/purchase-notify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: SECRET, kind, stars: stars ?? null, ref: ref ?? null }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => {});
}

// Grant lifetime once. ref makes re-delivery idempotent.
// Returns "granted" (this call granted it), "dup" (already granted for this ref) or false.
async function grantLifetime({ userId, telegramFrom, ref }) {
  let user = null;
  if (userId) user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
  if (!user && telegramFrom) {
    const tgId = String(telegramFrom.id);
    user = await prisma.user.upsert({
      where: { telegramId: tgId },
      update: { username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
      create: { telegramId: tgId, username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
    });
  }
  if (!user) return false;
  if (ref) {
    const dup = await prisma.tokenLedger.findFirst({ where: { ref } }).catch(() => null);
    if (dup) return "dup";
  }
  await prisma.user.update({ where: { id: user.id }, data: { lifetime: true } });
  await prisma.tokenLedger.create({
    data: { userId: user.id, delta: 0, reason: "lifetime", ref: ref ?? null, balanceAfter: user.tokens },
  });
  return "granted";
}

// Credit tokens once. ref (telegram charge id) makes re-delivery idempotent.
// Returns { balance, fresh } (fresh = this call credited it) or null.
async function creditTokens({ userId, telegramFrom, amount, ref }) {
  let user = null;
  if (userId) user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
  if (!user && telegramFrom) {
    const tgId = String(telegramFrom.id);
    user = await prisma.user.upsert({
      where: { telegramId: tgId },
      update: { username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
      create: { telegramId: tgId, username: telegramFrom.username ?? null, firstName: telegramFrom.first_name ?? null },
    });
  }
  if (!user) return null;
  if (ref) {
    const dup = await prisma.tokenLedger.findFirst({ where: { ref } }).catch(() => null);
    if (dup) return { balance: user.tokens, fresh: false };
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: amount } } });
  await prisma.tokenLedger.create({
    data: { userId: user.id, delta: amount, reason: "purchase", ref: ref ?? null, balanceAfter: updated.tokens },
  });
  return { balance: updated.tokens, fresh: true };
}

async function handleMessage(m) {
  const chatId = m.chat.id;
  const text = m.text || "";

  if (m.successful_payment) {
    const sp = m.successful_payment;
    const payload = sp.invoice_payload || "";
    const parts = payload.split("_");
    const ref = sp.telegram_payment_charge_id ? `tg:${sp.telegram_payment_charge_id}` : null;
    const stars = Number.isInteger(sp.total_amount) ? sp.total_amount : null;

    if (payload.startsWith("life_")) {
      const uid = parts[1] || "";
      const granted = await grantLifetime({ userId: uid, telegramFrom: m.from, ref });
      const ok = !!granted;
      if (granted === "granted") notifyPurchaseViaSite({ kind: "lifetime", stars, ref });
      await tg("sendMessage", {
        chat_id: chatId,
        text: ok
          ? "♾️ Lifetime активен — весь каталог открыт навсегда. Вернитесь на сайт."
          : "⭐ Оплата получена. Вернитесь на сайт inApp.",
      });
      return;
    }

    if (payload.startsWith("deck_")) {
      const userId = await resolveUserId({ userId: parts[1] || "", telegramFrom: m.from });
      const ok = userId && (await grantViaSite({ userId, kind: "deck", ref, stars }));
      await tg("sendMessage", { chat_id: chatId, text: ok ? "🃏 Колода открыта — все карты с идеями ваши навсегда. Вернитесь на сайт." : "⭐ Оплата получена. Вернитесь на сайт inApp." });
      return;
    }

    if (payload.startsWith("cat_")) {
      const userId = await resolveUserId({ userId: parts[1] || "", telegramFrom: m.from });
      const ok = userId && (await grantViaSite({ userId, kind: "category", slug: parts[2] || "", ref, stars }));
      await tg("sendMessage", { chat_id: chatId, text: ok ? "🗂️ Категория открыта — выводы, идеи и конкуренты. Вернитесь на сайт." : "⭐ Оплата получена. Вернитесь на сайт inApp." });
      return;
    }

    // tokens_<packId>_<uid>_<ts>
    const packId = parts[1];
    const uid = parts[2] || "";
    const amount = (PACKS[packId] || PACKS.m).tokens;
    const credited = await creditTokens({ userId: uid, telegramFrom: m.from, amount, ref });
    const balance = credited ? credited.balance : null;
    if (credited?.fresh) notifyPurchaseViaSite({ kind: "tokens", stars, ref });
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        balance != null
          ? `⭐ Начислено ${amount} энергии. Баланс: ⚡ ${balance}. Вернитесь на сайт — открывайте разборы.`
          : `⭐ Оплата получена. Вернитесь на сайт inApp.`,
    });
    return;
  }

  if (text.startsWith("/start")) {
    const arg = text.split(" ")[1] || "";
    if (arg.startsWith("login_")) {
      // The same sign-in serves the website and the iOS app's sign-in sheet: «inApp», not «сайт».
      const token = arg.slice("login_".length);
      const lt = await prisma.loginToken.findUnique({ where: { token } }).catch(() => null);
      if (lt && lt.expiresAt > new Date()) {
        await prisma.loginToken.update({
          where: { token },
          data: { telegramId: String(m.from.id), username: m.from.username ?? null, firstName: m.from.first_name ?? null },
        });
        await tg("sendMessage", { chat_id: chatId, text: "✅ Вход выполнен. Вернитесь в inApp." });
      } else {
        await tg("sendMessage", { chat_id: chatId, text: "Ссылка для входа истекла. Откройте вход заново." });
      }
      return;
    }
    // Old buy deep links from the website (life_ / deck_ / cat_ / buy_): Stars are off.
    if (/^(life|deck|cat|buy)_/.test(arg)) {
      await tg("sendMessage", { chat_id: chatId, text: BUY_TEXT, disable_web_page_preview: true });
      return;
    }
    await tg("sendMessage", {
      chat_id: chatId,
      text: `inApp: разборы приложений по реальным отзывам и идеи под подтверждённый спрос.\nДоступ навсегда — на сайте: ${SITE}/ru/plus`,
      disable_web_page_preview: true,
    });
    return;
  }

  if (text === "/tokens" || text === "/buy" || text === "/premium") {
    await tg("sendMessage", { chat_id: chatId, text: BUY_TEXT, disable_web_page_preview: true });
  }
}

// «Весь сайт навсегда · ⭐» buttons still sitting in old chats.
async function handleCallback(cq) {
  if (typeof cq.data === "string" && cq.data.startsWith("buy_")) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id });
    if (cq.message?.chat?.id) await tg("sendMessage", { chat_id: cq.message.chat.id, text: BUY_TEXT, disable_web_page_preview: true });
  }
}

async function loop() {
  let offset = 0;
  console.log("inApp bot started, polling…");
  while (true) {
    try {
      const res = await tg("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "pre_checkout_query", "callback_query"],
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      for (const u of res.result) {
        offset = u.update_id + 1;
        try {
          // Stars are off: an old invoice can no longer be paid (Telegram shows the message).
          if (u.pre_checkout_query) await tg("answerPreCheckoutQuery", { pre_checkout_query_id: u.pre_checkout_query.id, ok: false, error_message: PRECHECKOUT_DECLINED });
          else if (u.message) await handleMessage(u.message);
          else if (u.callback_query) await handleCallback(u.callback_query);
        } catch (e) {
          console.error("update err", e?.message);
        }
      }
    } catch (e) {
      console.error("poll err", e?.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

loop();
