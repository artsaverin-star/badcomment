// ЮKassa card payments (RU cards). Dormant until YOOKASSA_SHOP_ID +
// YOOKASSA_SECRET_KEY are set in the prod env (/opt/badcomment/.env) — never in
// git. Flow: createPayment() → redirect user to confirmation_url → ЮKassa calls
// our webhook → we verify via getPayment() and grant premium.

const SHOP = process.env.YOOKASSA_SHOP_ID;
const SECRET = process.env.YOOKASSA_SECRET_KEY;
const API = "https://api.yookassa.ru/v3";

export function yookassaEnabled(): boolean {
  return Boolean(SHOP && SECRET);
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${SHOP}:${SECRET}`).toString("base64");
}

export async function createPayment(opts: {
  amountRub: number;
  description: string;
  metadata: Record<string, string>;
  returnUrl: string;
  idempotenceKey: string;
  method?: "bank_card" | "sbp"; // force a specific method (e.g. СБП); omit = show all
}): Promise<{ confirmation?: { confirmation_url?: string } }> {
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Idempotence-Key": opts.idempotenceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { value: opts.amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      // Оплата на защищённой странице ЮKassa (надёжно во всех браузерах, включая
      // Safari). Это домен ЮKassa, а не уход на сторонний сайт.
      confirmation: { type: "redirect", return_url: opts.returnUrl },
      ...(opts.method ? { payment_method_data: { type: opts.method } } : {}),
      description: opts.description,
      metadata: opts.metadata,
    }),
  });
  if (!res.ok) throw new Error(`yookassa create ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getPayment(id: string): Promise<{
  status?: string;
  paid?: boolean;
  metadata?: Record<string, string>;
  amount?: { value?: string; currency?: string };
}> {
  const res = await fetch(`${API}/payments/${id}`, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`yookassa get ${res.status}`);
  return res.json();
}
