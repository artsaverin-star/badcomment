// inApp Telegram bot (@inAppProBot): web login binding + premium via Telegram
// Stars. Dependency-free (raw Bot API over fetch) + Prisma for the shared
// prod.db. Run as its own process; token/db come from env (never hardcoded).
//   TELEGRAM_BOT_TOKEN, DATABASE_URL, PREMIUM_STARS (default 500), PREMIUM_DAYS (30)
import { PrismaClient } from "@prisma/client";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN missing");
  process.exit(1);
}
const STARS = Number(process.env.PREMIUM_STARS || 500);
const DAYS = Number(process.env.PREMIUM_DAYS || 30);
const API = `https://api.telegram.org/bot${TOKEN}`;
const prisma = new PrismaClient();

async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

function premiumKb(ru = true) {
  return {
    inline_keyboard: [[{ text: ru ? `⭐ Премиум — ${STARS} Stars / ${DAYS} дней` : `⭐ Premium`, callback_data: "buy" }]],
  };
}

async function sendInvoice(chatId) {
  return tg("sendInvoice", {
    chat_id: chatId,
    title: "inApp Премиум",
    description: `Доступ ко всем разборам категорий и идеям на ${DAYS} дней.`,
    payload: `premium_${Date.now()}`,
    currency: "XTR",
    prices: [{ label: "Премиум", amount: STARS }],
  });
}

async function grantPremium(from) {
  const tgId = String(from.id);
  const now = new Date();
  const existing = await prisma.user.findUnique({ where: { telegramId: tgId } });
  const base = existing?.premiumUntil && new Date(existing.premiumUntil) > now ? new Date(existing.premiumUntil) : now;
  const until = new Date(base.getTime() + DAYS * 24 * 60 * 60 * 1000);
  await prisma.user.upsert({
    where: { telegramId: tgId },
    update: { premiumUntil: until, username: from.username ?? null, firstName: from.first_name ?? null },
    create: { telegramId: tgId, username: from.username ?? null, firstName: from.first_name ?? null, premiumUntil: until },
  });
  return until;
}

async function handleMessage(m) {
  const chatId = m.chat.id;
  const text = m.text || "";

  if (m.successful_payment) {
    const until = await grantPremium(m.from);
    await tg("sendMessage", {
      chat_id: chatId,
      text: `⭐ Премиум активен до ${until.toISOString().slice(0, 10)}. Вернитесь на сайт — всё открыто.`,
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
    await tg("sendMessage", {
      chat_id: chatId,
      text: "inApp — разборы отзывов приложений с выводами.\nОформите премиум, чтобы открыть весь каталог и идеи:",
      reply_markup: premiumKb(),
    });
    return;
  }

  if (text === "/premium") {
    await sendInvoice(chatId);
  }
}

async function handleCallback(cq) {
  if (cq.data === "buy") {
    await tg("answerCallbackQuery", { callback_query_id: cq.id });
    await sendInvoice(cq.message.chat.id);
  }
}

async function loop() {
  let offset = 0;
  console.log("inApp bot started, polling…");
  // eslint-disable-next-line no-constant-condition
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
