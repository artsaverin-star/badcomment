"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

// ЮKassa embedded widget — оплата картой прямо на сайте, без переадресации.
type YKWidget = { render: (selector: string) => void };
type YKCtor = new (opts: { confirmation_token: string; return_url?: string; error_callback?: () => void }) => YKWidget;
function loadYooKassa(): Promise<YKCtor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { YooMoneyCheckoutWidget?: YKCtor };
    if (w.YooMoneyCheckoutWidget) return resolve(w.YooMoneyCheckoutWidget);
    const s = document.createElement("script");
    s.src = "https://yookassa.ru/checkout-widget/v1/checkout-widget.js";
    s.onload = () => (w.YooMoneyCheckoutWidget ? resolve(w.YooMoneyCheckoutWidget) : reject(new Error("widget load failed")));
    s.onerror = () => reject(new Error("widget script error"));
    document.body.appendChild(s);
  });
}

// Premium pricing: one plan, two billing options. Monthly 1000 ₽, six months
// 3000 ₽ (−50% vs paying monthly). Paid in Telegram Stars via the bot.
const PLANS = {
  month: { label: "Месяц", rub: 1000, stars: 500, per: "1000 ₽ / мес", note: null as string | null },
  half: { label: "6 месяцев", rub: 3000, stars: 1600, per: "500 ₽ / мес", note: "−50%" },
};

const PERKS = [
  "Все разборы по категориям, а не только бесплатные",
  "Инсайты категории — синтез по 10+ приложениям для всех тем",
  "Все идеи продуктов с цепочкой доказательств из реальных отзывов",
  "Крупные цитаты и полный доступ к отзывам в каждом наблюдении",
  "Новые категории по мере готовности",
];

export default function Pricing({
  botUrl,
  cardEnabled = false,
  locale = "ru",
  loggedIn = false,
}: {
  botUrl: string;
  cardEnabled?: boolean;
  locale?: Locale;
  loggedIn?: boolean;
}) {
  const [billing, setBilling] = useState<"month" | "half">("half");
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authAction, setAuthAction] = useState<"card" | "tg">("card");
  const plan = PLANS[billing];

  async function payByCard() {
    setPaying(true);
    setPayErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billing }),
      });
      // Не залогинен — открываем авторизацию вместо ошибки.
      if (r.status === 401) {
        setAuthAction("card");
        setShowAuth(true);
        setPaying(false);
        return;
      }
      const d = await r.json();
      if (!r.ok || !d.token) throw new Error(d.error || "Не удалось создать платёж");
      const YK = await loadYooKassa();
      setWidgetOpen(true);
      await new Promise((res) => requestAnimationFrame(() => res(null)));
      const checkout = new YK({
        confirmation_token: d.token,
        return_url: window.location.origin + "/premium",
        error_callback: () => setPayErr("Ошибка платежа, попробуйте ещё раз"),
      });
      checkout.render("#yk-widget");
      setPaying(false);
    } catch (e) {
      setPayErr((e as Error).message);
      setPaying(false);
      setWidgetOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-[460px]">
      {/* Billing toggle */}
      <div className="relative mx-auto flex w-full max-w-[320px] rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] p-1">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--color-surface-card)] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${billing === "half" ? "100%" : "0"})` }}
        />
        {(["month", "half"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBilling(b)}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-footnote font-semibold transition-colors ${
              billing === b ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            {PLANS[b].label}
            {PLANS[b].note && (
              <span className="rounded-full bg-[color-mix(in_srgb,#30d158_22%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[#4ade80]">
                {PLANS[b].note}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan card */}
      <div className="mt-6 rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7">
        <div className="flex items-baseline gap-2">
          <span className="text-[40px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {plan.rub.toLocaleString("ru-RU")} ₽
          </span>
          <span className="text-callout text-[var(--color-text-tertiary)]">
            {billing === "half" ? "за 6 месяцев" : "в месяц"}
          </span>
        </div>
        <p className="mt-1 text-footnote text-[var(--color-text-secondary)]">
          {billing === "half" ? `${plan.per} · экономия 3000 ₽` : plan.per}
        </p>
        {loggedIn ? (
          <a
            href={botUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3.5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1 .5l.36-5.1L17.9 6.2c.4-.36-.09-.56-.62-.2L6.7 12.9l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6l19.46-7.5c.9-.33 1.69.2 1.49 1.06Z" />
            </svg>
            Оплатить {plan.stars} <span className="text-[#ffd54a]">⭐</span> в Telegram
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setAuthAction("tg");
              setShowAuth(true);
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3.5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1 .5l.36-5.1L17.9 6.2c.4-.36-.09-.56-.62-.2L6.7 12.9l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6l19.46-7.5c.9-.33 1.69.2 1.49 1.06Z" />
            </svg>
            Оплатить {plan.stars} <span className="text-[#ffd54a]">⭐</span> в Telegram
          </button>
        )}

        {cardEnabled && (
          <button
            type="button"
            onClick={payByCard}
            disabled={paying}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-6 py-3.5 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
              <path d="M2.5 9.5h19" />
            </svg>
            {paying ? "Создаём платёж…" : `Оплатить картой РФ — ${plan.rub.toLocaleString("ru-RU")} ₽`}
          </button>
        )}
        {payErr && <p className="mt-2 text-center text-caption text-[var(--color-accent-danger)]">{payErr}</p>}

        <ul className="mt-6 flex flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-6">
          {PERKS.map((p) => (
            <li key={p} className="flex gap-2.5 text-callout text-[var(--color-text-secondary)]">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#4ade80]">
                <path d="m4 10.5 3.5 3.5 8.5-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-center text-caption text-[var(--color-text-tertiary)]">
        {cardEnabled ? "Оплата картой РФ через ЮKassa или Telegram Stars. " : "Оплата через Telegram Stars в боте. "}
        Доступ открывается автоматически сразу после оплаты. Условия — в{" "}
        <Link href="/offer" className="hover:text-[var(--color-text-primary)] hover:underline">оферте</Link>.
      </p>

      {widgetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWidgetOpen(false);
          }}
        >
          <div className="relative w-full max-w-[480px] rounded-[var(--radius-2xl)] bg-white p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setWidgetOpen(false)}
              aria-label="Закрыть"
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/5 text-[18px] leading-none text-black/50 hover:bg-black/10"
            >
              ×
            </button>
            <div id="yk-widget" className="min-h-[320px] pt-6" />
          </div>
        </div>
      )}

      {showAuth && (
        <AuthModal
          locale={locale}
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            // После входа: карта — сразу продолжаем оплату; звёзды — перезагрузка,
            // чтобы ссылка на бота получила id аккаунта (тогда кнопка ведёт в бота).
            if (authAction === "card") payByCard();
            else window.location.reload();
          }}
        />
      )}
    </div>
  );
}
