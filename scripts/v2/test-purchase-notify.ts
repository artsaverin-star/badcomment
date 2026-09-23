// Owner's Telegram ping on a new purchase (src/lib/purchaseNotify.ts): message text, recipients,
// the YooKassa webhook (one ping per payment, none for re-deliveries — also concurrent ones — or
// unpaid payments), the bot's internal endpoints, the kill switch, that buyer-influenced text
// cannot become a link, retries through a flaky connection, and that a Telegram outage never
// breaks payments.
// Amounts use Intl's ru-RU group separator (no-break space, \u00a0), so "1 499 ₽" never wraps.
// Runs the real route handlers against a throw-away SQLite DB; YooKassa and Telegram are local
// fakes — nothing leaves the machine.
//   npm run test:purchase-notify
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

const dir = mkdtempSync(path.join(tmpdir(), "purchase-notify-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
process.env.DATABASE_URL = dbUrl;
process.env.SESSION_SECRET = "test-session-secret";
process.env.YOOKASSA_SHOP_ID = "shop";
process.env.YOOKASSA_SECRET_KEY = "key";
process.env.TELEGRAM_BOT_TOKEN = "123:bot-token";
delete process.env.PURCHASE_NOTIFY_TG_IDS;
delete process.env.PURCHASE_NOTIFY;
delete process.env.TELEGRAM_API_BASE;
execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: ["ignore", "ignore", "inherit"] });

// Prisma's query engine does not hold the event loop open while a query runs (see test-app-accounts.ts).
const keepAlive = setInterval(() => undefined, 60_000);

let prisma: (typeof import("../../src/lib/prisma"))["prisma"];
let notify: typeof import("../../src/lib/purchaseNotify");
let webhook: typeof import("../../src/app/api/pay/yookassa/webhook/route");
let grantRoute: typeof import("../../src/app/api/internal/grant/route");
let notifyRoute: typeof import("../../src/app/api/internal/purchase-notify/route");

// ---------------------------------------------------------------------------
// Fakes: YooKassa GET /payments/<id> and Telegram sendMessage.

type Payment = { id: string; status: string; paid: boolean; metadata: Record<string, string>; amount: { value: string; currency: string }; payment_method?: { type: string }; test?: boolean };
const payments = new Map<string, Payment>();
const sent: Array<{ url: string; chat_id: string; text: string }> = [];
let telegramDown = false;
let telegramCalls = 0;
let telegramDropsLeft = 0; // the next N calls fail at the network level (flaky connection)
let telegramStatus = 200;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://api.yookassa.ru/v3/payments/")) {
    const p = payments.get(url.split("/").pop() ?? "");
    return p ? new Response(JSON.stringify(p), { status: 200 }) : new Response("{}", { status: 404 });
  }
  if (url.startsWith("https://api.telegram.org/")) {
    telegramCalls++;
    if (telegramDown) throw new TypeError("fetch failed");
    if (telegramDropsLeft > 0) {
      telegramDropsLeft--;
      throw new TypeError("fetch failed");
    }
    if (telegramStatus !== 200) return new Response(JSON.stringify({ ok: false }), { status: telegramStatus });
    const body = JSON.parse(String(init?.body ?? "{}")) as { chat_id: string; text: string };
    sent.push({ url, chat_id: String(body.chat_id), text: body.text });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(input, init);
}) as typeof fetch;

/** Pings run after the response; outside Next they start right away — wait for them to land. */
async function settle(expected: number, ms = 1500): Promise<void> {
  const until = Date.now() + ms;
  while (sent.length < expected && Date.now() < until) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 60)); // and give a stray extra ping the chance to show up
}

const post = (url: string, body: unknown) =>
  new Request(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

let buyerId = "";
function yk(id: string, extra: Partial<Payment> = {}): Payment {
  const p: Payment = {
    id,
    status: "succeeded",
    paid: true,
    metadata: { userId: buyerId, kind: "lifetime", source: "v2_paywall" },
    amount: { value: "1499.00", currency: "RUB" },
    payment_method: { type: "sbp" },
    ...extra,
  };
  payments.set(id, p);
  return p;
}

before(async () => {
  ({ prisma } = await import("../../src/lib/prisma"));
  notify = await import("../../src/lib/purchaseNotify");
  webhook = await import("../../src/app/api/pay/yookassa/webhook/route");
  grantRoute = await import("../../src/app/api/internal/grant/route");
  notifyRoute = await import("../../src/app/api/internal/purchase-notify/route");
  // No real network: no direct-IP fallback; retries 30 ms apart instead of minutes.
  notify.telegramDelivery.directIps = [];
  notify.telegramDelivery.retryDelaysMs = [0, 30, 30];
});

beforeEach(async () => {
  sent.length = 0;
  telegramDown = false;
  telegramCalls = 0;
  telegramDropsLeft = 0;
  telegramStatus = 200;
  delete process.env.PURCHASE_NOTIFY_TG_IDS;
  delete process.env.PURCHASE_NOTIFY;
  await prisma.tokenLedger.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { isAdmin: true, telegramId: "111", username: "owner" } });
  await prisma.user.create({ data: { isAdmin: true, email: "admin-without-telegram@example.com" } });
  await prisma.user.create({ data: { telegramId: "999", username: "not_an_admin" } });
  const buyer = await prisma.user.create({ data: { email: "buyer@example.com", username: "buyer_name", firstName: "Buyer" } });
  buyerId = buyer.id;
});

after(async () => {
  clearInterval(keepAlive);
  globalThis.fetch = realFetch;
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe("message text", () => {
  test("YooKassa lifetime: product, amount, method, source, totals", () => {
    const text = notify.formatPurchaseMessage(
      { kind: "lifetime", provider: "yookassa", amountRub: 1499, method: "bank_card", source: "v2_paywall" },
      { todayCount: 2, todayRub: 2998, lifetimeUsers: 14 },
    );
    assert.equal(
      text,
      "💰 Новая покупка: inApp Plus навсегда\n1\u00a0499 ₽ · ЮKassa, карта\nОткуда: v2_paywall\nСегодня (МСК) на сайте: 2 оплаты на 2\u00a0998 ₽\nДоступ навсегда: 14 человек",
    );
  });
  test("Stars, test payment, category slug, plurals", () => {
    assert.equal(notify.formatPurchaseMessage({ kind: "lifetime", provider: "stars", stars: 500 }), "💰 Новая покупка: inApp Plus навсегда\n500 ⭐ · Telegram Stars");
    assert.match(notify.formatPurchaseMessage({ kind: "lifetime", provider: "yookassa", amountRub: 1499, test: true }), /^🧪 Тестовый платёж\n💰/);
    assert.match(notify.formatPurchaseMessage({ kind: "category", provider: "stars", slug: "yoga" }), /категория «yoga»/);
    const none = notify.formatPurchaseMessage({ kind: "lifetime", provider: "stars" }, { todayCount: 0, todayRub: 0, lifetimeUsers: 21 });
    assert.match(none, /Сегодня \(МСК\) на сайте: оплат в рублях нет\nДоступ навсегда: 21 человек$/);
    assert.match(notify.formatPurchaseMessage({ kind: "lifetime", provider: "yookassa", amountRub: 1499 }, { todayCount: 1, todayRub: 1499, lifetimeUsers: 1 }), /: 1 оплата на 1\u00a0499 ₽\nДоступ навсегда: 1 человек$/);
    assert.match(notify.formatPurchaseMessage({ kind: "lifetime", provider: "yookassa", amountRub: 1499 }, { todayCount: 5, todayRub: 7495, lifetimeUsers: 3 }), /5 оплат на 7\u00a0495 ₽\nДоступ навсегда: 3 человека$/);
  });
  test("buyer-influenced source / slug / method cannot become a link or mention", () => {
    const text = notify.formatPurchaseMessage({
      kind: "category",
      provider: "yookassa",
      amountRub: 290,
      source: "https://evil.example/steal?x=1",
      slug: "t.me/scam",
      method: "weird.method://x",
    });
    const values = text.split("\n").map((l) => l.replace(/^[^:]*: /, ""));
    for (const v of values) assert.ok(!/[.:@?=]/.test(v), v);
    assert.match(text, /Откуда: https_\/\/evil_example\/steal_x_1$/m);
    assert.match(text, /· ЮKassa, weird_method_\/\/x$/m);
    assert.match(text, /категория «t_me\/scam»/);
    assert.equal(notify.plainToken("..."), null);
    assert.equal(notify.plainToken("/ru/segment/yoga"), "/ru/segment/yoga");
  });
  test("claimPing: once per ref", () => {
    assert.equal(notify.claimPing("yk:unit-1", 1_000), true);
    assert.equal(notify.claimPing("yk:unit-1", 2_000), false);
    assert.equal(notify.claimPing("yk:unit-1", 1_000 + 49 * 3600_000), true, "forgotten after 48 h");
  });
  test("Moscow day start and Telegram id parsing", () => {
    assert.equal(notify.moscowDayStart(new Date("2026-09-23T20:59:00Z")).toISOString(), "2026-09-22T21:00:00.000Z");
    assert.equal(notify.moscowDayStart(new Date("2026-09-23T21:00:00Z")).toISOString(), "2026-09-23T21:00:00.000Z");
    assert.deepEqual(notify.parseTgIds(" 1, 2,2,,abc, -100123 "), ["1", "2", "-100123"]);
  });
});

describe("YooKassa webhook", () => {
  test("one ping to the admin with Telegram, none for a re-delivery; no personal data", async () => {
    yk("p1");
    const r1 = await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p1" } }));
    assert.equal(r1.status, 200);
    await settle(1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].chat_id, "111");
    assert.match(sent[0].url, /\/bot123:bot-token\/sendMessage$/);
    assert.match(sent[0].text, /inApp Plus навсегда\n1\u00a0499 ₽ · ЮKassa, СБП\nОткуда: v2_paywall\nСегодня \(МСК\) на сайте: 1 оплата на 1\u00a0499 ₽\nДоступ навсегда: 1 человек/);
    for (const pii of ["buyer@example.com", "buyer_name", "Buyer", buyerId]) assert.ok(!sent[0].text.includes(pii), pii);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: buyerId } })).lifetime, true);

    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p1" } }));
    await settle(2, 300);
    assert.equal(sent.length, 1, "re-delivered webhook must not ping again");
  });

  test("concurrent re-deliveries of one payment: one grant, one ping", async () => {
    yk("p-race");
    const res = await Promise.all(Array.from({ length: 12 }, () => webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p-race" } }))));
    assert.ok(res.every((r) => r.status === 200));
    await settle(2, 500);
    assert.equal(sent.length, 1);
    assert.equal(await prisma.tokenLedger.count({ where: { ref: "yk:p-race" } }), 1);
    assert.match(sent[0].text, /на сайте: 1 оплата на 1\u00a0499 ₽/);
  });

  test("unpaid / pending payments do not ping", async () => {
    yk("p2", { status: "pending", paid: false });
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p2" } }));
    await settle(1, 300);
    assert.equal(sent.length, 0);
  });

  test("test-shop payment is marked", async () => {
    yk("p3", { test: true, payment_method: { type: "bank_card" } });
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p3" } }));
    await settle(1);
    assert.match(sent[0].text, /^🧪 Тестовый платёж\n💰 Новая покупка: inApp Plus навсегда\n1\u00a0499 ₽ · ЮKassa, карта/);
  });

  test("flaky connection: retried until delivered, exactly once", async () => {
    telegramDropsLeft = 2;
    yk("p-flaky");
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p-flaky" } }));
    await settle(1);
    assert.equal(sent.length, 1);
    assert.equal(telegramCalls, 3);
  });

  test("Telegram says no (4xx): not retried", async () => {
    telegramStatus = 403;
    yk("p-403");
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p-403" } }));
    await settle(1, 300);
    assert.equal(sent.length, 0);
    assert.equal(telegramCalls, 1);
  });

  test("Telegram down: the purchase is still granted and acknowledged", async () => {
    telegramDown = true;
    yk("p4");
    const r = await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p4" } }));
    assert.equal(r.status, 200);
    await settle(1, 300);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: buyerId } })).lifetime, true);
  });

  test("PURCHASE_NOTIFY_TG_IDS overrides the admins; PURCHASE_NOTIFY=off mutes", async () => {
    process.env.PURCHASE_NOTIFY_TG_IDS = "222, 333";
    yk("p5");
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p5" } }));
    await settle(2);
    assert.deepEqual(sent.map((s) => s.chat_id).sort(), ["222", "333"]);

    sent.length = 0;
    process.env.PURCHASE_NOTIFY = "off";
    yk("p6");
    await webhook.POST(post("/api/pay/yookassa/webhook", { object: { id: "p6" } }));
    await settle(1, 300);
    assert.equal(sent.length, 0);
  });
});

describe("bot endpoints", () => {
  test("/api/internal/grant pings once per Stars payment", async () => {
    const body = { secret: "test-session-secret", userId: buyerId, kind: "deck", ref: "tg:c1", stars: 150 };
    assert.equal((await grantRoute.POST(post("/api/internal/grant", body))).status, 200);
    await settle(1);
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /^💰 Новая покупка: колода идей \(старый товар\)\n150 ⭐ · Telegram Stars\nСегодня \(МСК\) на сайте: оплат в рублях нет\n/);
    assert.equal((await grantRoute.POST(post("/api/internal/grant", body))).status, 200);
    await settle(2, 300);
    assert.equal(sent.length, 1);
  });

  test("/api/internal/purchase-notify: secret, kind, send", async () => {
    assert.equal((await notifyRoute.POST(post("/api/internal/purchase-notify", { secret: "nope", kind: "lifetime" }))).status, 403);
    assert.equal((await notifyRoute.POST(post("/api/internal/purchase-notify", { secret: "test-session-secret", kind: "car" }))).status, 400);
    assert.equal(sent.length, 0);
    const body = { secret: "test-session-secret", kind: "tokens", stars: 500, ref: "tg:t1" };
    assert.deepEqual(await (await notifyRoute.POST(post("/api/internal/purchase-notify", body))).json(), { ok: true, queued: true });
    await settle(1);
    assert.match(sent[0].text, /^💰 Новая покупка: пакет энергии \(старый товар\)\n500 ⭐ · Telegram Stars/);
    assert.deepEqual(await (await notifyRoute.POST(post("/api/internal/purchase-notify", body))).json(), { ok: true, queued: false }, "same ref twice");
    await settle(2, 300);
    assert.equal(sent.length, 1);
  });
});
