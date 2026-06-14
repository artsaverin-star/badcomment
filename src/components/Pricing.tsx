"use client";

import { useState } from "react";

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

export default function Pricing({ botUrl }: { botUrl: string }) {
  const [billing, setBilling] = useState<"month" | "half">("half");
  const plan = PLANS[billing];

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
        <p className="mt-1 flex items-center gap-1.5 text-caption text-[var(--color-text-tertiary)]">
          ≈ <span className="font-semibold text-[#f5b301]">{plan.stars} ⭐</span> Telegram Stars
        </p>

        <a
          href={botUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3.5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1 .5l.36-5.1L17.9 6.2c.4-.36-.09-.56-.62-.2L6.7 12.9l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6l19.46-7.5c.9-.33 1.69.2 1.49 1.06Z" />
          </svg>
          Оформить в Telegram
        </a>

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
        Оплата через Telegram Stars в боте. Отмена в любой момент.
      </p>
    </div>
  );
}
