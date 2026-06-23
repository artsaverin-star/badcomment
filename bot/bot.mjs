// inApp Telegram bot (@inAppProBot): web login binding + token packs via
// Telegram Stars. Dependency-free (raw Bot API over fetch) + Prisma for the
// shared prod.db. Run as its own process; token/db come from env.
//   TELEGRAM_BOT_TOKEN, DATABASE_URL
import { PrismaClient } from "@prisma/client";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}
// Token packs — must mirror src/lib/tokenConfig.ts (TOKEN_PACKS + LIFETIME).
const PACKS = {
  s: { tokens: 100, stars: 500 },
  m: { tokens: 300, stars: 1250 },
  l: { tokens: 700, stars: 2500 },
};
// Stars prices — mirror src/lib/tokenConfig.ts (LIFETIME.stars / DECK_STARS / CATEGORY_STARS).
const LIFETIME = { stars: 2000 };
const DECK_STARS = 150;
const CATEGORY_STARS = 300;
const API = `https://api.telegram.org/bot${TOKEN}`;
// Internal grant: the bot calls the site (same box) to reuse grantUnlock for
// deck/category Stars purchases. Auth by the shared SESSION_SECRET.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";
const SITE = process.env.SITE_URL || "https://inapp.pro";
const prisma = new PrismaClient();

async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// chatId -> site userId, passed from the web via ?start=buy_<userId>_<pack>. Used
// to credit the exact site account (even if it logged in via Google).
const pendingUid = new Map();

function packsKb() {
  return {
    inline_keyboard: [
      ...Object.entries(PACKS).map(([id, p]) => [
        { text: `⚡ ${p.tokens} энергии — ${p.stars} ⭐`, callback_data: `buy_${id}` },
      ]),
      [{ text: `♾️ Lifetime (всё навсегда) — ${LIFETIME.stars} ⭐`, callback_data: "buy_life" }],
    ],
  };
}

async function sendInvoice(chatId, packId = "m", uid = "") {
  const p = PACKS[packId] || PACKS.m;
  return tg("sendInvoice", {
    chat_id: chatId,
    title: `inApp — ${p.tokens} энергии`,
    description: `${p.tokens} энергии на открытие разборов, идей и категорий в inApp.`,
    // payload: tokens_<packId>_<siteUserId|>_<ts>
    payload: `tokens_${packId}_${uid}_${Date.now()}`,
    // Telegram Stars: currency XTR, empty provider_token (required for Stars).
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${p.tokens} энергии`, amount: p.stars }],
  });
}

async function sendLifetimeInvoice(chatId, uid = "") {
  return tg("sendInvoice", {
    chat_id: chatId,
    title: "inApp — Lifetime",
    description: "Полный доступ ко всем разборам, идеям и категориям inApp — навсегда.",
    payload: `life_${uid}_${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "Lifetime — всё навсегда", amount: LIFETIME.stars }],
  });
}

async function sendDeckInvoice(chatId, uid = "") {
  return tg("sendInvoice", {
    chat_id: chatId,
    title: "inApp — Колода идей",
    description: "Лучшая идея из каждой премиум-ниши, разобранная по реальным отзывам — навсегда.",
    payload: `deck_${uid}_${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "Колода идей", amount: DECK_STARS }],
  });
}

async function sendCategoryInvoice(chatId, uid = "", slug = "") {
  return tg("sendInvoice", {
    chat_id: chatId,
    title: "inApp — Разбор категории",
    description: "Вся ниша: выводы, все идеи и разбор конкурентов — навсегда.",
    payload: `cat_${uid}_${slug}_${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "Разбор категории", amount: CATEGORY_STARS }],
  });
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

// Grant deck/category via the site (reuses grantUnlock). ref makes it idempotent.
async function grantViaSite({ userId, kind, slug, ref }) {
  const r = await fetch(`${SITE}/api/internal/grant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: SECRET, userId, kind, slug: slug ?? null, ref }),
  })
    .then((x) => x.json())
    .catch(() => null);
  return !!(r && r.ok);
}

// Grant lifetime once. ref makes re-delivery idempotent.
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
    if (dup) return true;
  }
  await prisma.user.update({ where: { id: user.id }, data: { lifetime: true } });
  await prisma.tokenLedger.create({
    data: { userId: user.id, delta: 0, reason: "lifetime", ref: ref ?? null, balanceAfter: user.tokens },
  });
  return true;
}

// Credit tokens once. ref (telegram charge id) makes re-delivery idempotent.
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
    if (dup) return user.tokens;
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { tokens: { increment: amount } } });
  await prisma.tokenLedger.create({
    data: { userId: user.id, delta: amount, reason: "purchase", ref: ref ?? null, balanceAfter: updated.tokens },
  });
  return updated.tokens;
}

async function handleMessage(m) {
  const chatId = m.chat.id;
  const text = m.text || "";

  if (m.successful_payment) {
    const sp = m.successful_payment;
    const payload = sp.invoice_payload || "";
    const parts = payload.split("_");
    const ref = sp.telegram_payment_charge_id ? `tg:${sp.telegram_payment_charge_id}` : null;

    if (payload.startsWith("life_")) {
      const uid = parts[1] || "";
      const ok = await grantLifetime({ userId: uid, telegramFrom: m.from, ref });
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
      const ok = userId && (await grantViaSite({ userId, kind: "deck", ref }));
      await tg("sendMessage", { chat_id: chatId, text: ok ? "🃏 Колода открыта — все карты с идеями ваши навсегда. Вернитесь на сайт." : "⭐ Оплата получена. Вернитесь на сайт inApp." });
      return;
    }

    if (payload.startsWith("cat_")) {
      const userId = await resolveUserId({ userId: parts[1] || "", telegramFrom: m.from });
      const ok = userId && (await grantViaSite({ userId, kind: "category", slug: parts[2] || "", ref }));
      await tg("sendMessage", { chat_id: chatId, text: ok ? "🗂️ Категория открыта — выводы, идеи и конкуренты. Вернитесь на сайт." : "⭐ Оплата получена. Вернитесь на сайт inApp." });
      return;
    }

    // tokens_<packId>_<uid>_<ts>
    const packId = parts[1];
    const uid = parts[2] || "";
    const amount = (PACKS[packId] || PACKS.m).tokens;
    const balance = await creditTokens({ userId: uid, telegramFrom: m.from, amount, ref });
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
      const token = arg.slice("login_".length);
      const lt = await prisma.loginToken.findUnique({ where: { token } }).catch(() => null);
      if (lt && lt.expiresAt > new Date()) {
        await prisma.loginToken.update({
          where: { token },
          data: { telegramId: String(m.from.id), username: m.from.username ?? null, firstName: m.from.first_name ?? null },
        });
        await tg("sendMessage", { chat_id: chatId, text: "✅ Вход выполнен. Вернитесь на сайт inApp." });
      } else {
        await tg("sendMessage", { chat_id: chatId, text: "Ссылка для входа истекла. Откройте вход на сайте заново." });
      }
      return;
    }
    if (arg.startsWith("life_")) {
      const uid = arg.slice("life_".length);
      if (uid) pendingUid.set(chatId, uid);
      await sendLifetimeInvoice(chatId, uid);
      return;
    }
    if (arg.startsWith("deck_")) {
      const uid = arg.slice("deck_".length);
      if (uid) pendingUid.set(chatId, uid);
      await sendDeckInvoice(chatId, uid);
      return;
    }
    if (arg.startsWith("cat_")) {
      const rest = arg.slice("cat_".length); // <uid>_<slug>
      const us = rest.split("_");
      const uid = us[0] || "";
      const slug = us[1] || "";
      if (uid) pendingUid.set(chatId, uid);
      await sendCategoryInvoice(chatId, uid, slug);
      return;
    }
    if (arg.startsWith("buy_")) {
      // buy_<userId>_<packId>  (web, logged in) | buy_<packId> | buy_
      const rest = arg.slice("buy_".length);
      const segs = rest ? rest.split("_") : [];
      let uid = "";
      let packId = "";
      if (segs.length >= 2) {
        uid = segs[0];
        packId = segs[1];
      } else if (segs.length === 1) {
        packId = segs[0];
      }
      if (uid) pendingUid.set(chatId, uid);
      if (packId && PACKS[packId]) {
        await sendInvoice(chatId, packId, uid);
      } else {
        await tg("sendMessage", { chat_id: chatId, text: "Выберите пакет энергии:", reply_markup: packsKb() });
      }
      return;
    }
    await tg("sendMessage", {
      chat_id: chatId,
      text: "inApp — разборы отзывов приложений с выводами.\nПополните энергию, чтобы открывать разборы, идеи и категории:",
      reply_markup: packsKb(),
    });
    return;
  }

  if (text === "/tokens" || text === "/buy" || text === "/premium") {
    await tg("sendMessage", { chat_id: chatId, text: "Выберите пакет энергии:", reply_markup: packsKb() });
  }
}

async function handleCallback(cq) {
  if (typeof cq.data === "string" && cq.data.startsWith("buy_")) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id });
    const chatId = cq.message.chat.id;
    const key = cq.data.slice("buy_".length);
    if (key === "life") await sendLifetimeInvoice(chatId, pendingUid.get(chatId) || "");
    else if (PACKS[key]) await sendInvoice(chatId, key, pendingUid.get(chatId) || "");
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
          if (u.pre_checkout_query) await tg("answerPreCheckoutQuery", { pre_checkout_query_id: u.pre_checkout_query.id, ok: true });
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
