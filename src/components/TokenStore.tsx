"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import { DECK_PRICE_RUB, LIFETIME, DECK_CREDIT_RUB } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const fmt = (n: number) => n.toLocaleString("ru-RU");

// Direct-₽ store. Two SKUs: the whole-deck unlock (290) and Lifetime (everything
// forever). Categories are bought on their own pages. Card + СБП for both; Stars
// for Lifetime (the bot has a life_ command). The deck price credits toward Lifetime.
export default function TokenStore({
  unlimited,
  loggedIn,
  cardEnabled,
  botStart,
  uid,
  ownsDeck = false,
  locale = "ru",
}: {
  unlimited: boolean;
  loggedIn: boolean;
  cardEnabled: boolean;
  botStart: string;
  uid: string;
  ownsDeck?: boolean;
  locale?: Locale;
}) {
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ru = locale !== "en";
  const lifeStars = `${botStart}life_${uid}`;

  async function buy(kind: string, method: string, key: string) {
    if (!loggedIn) return setAuth(true);
    setBusy(key);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, method }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) return window.location.assign(d.url);
      setErr(d.error || (ru ? "Не удалось создать платёж" : "Couldn't create payment"));
    } catch {
      setErr(ru ? "Сеть недоступна" : "Network unavailable");
    } finally {
      setBusy(null);
    }
  }

  if (unlimited) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-8 text-center">
        <p className="text-lead font-semibold text-[var(--color-text-primary)]">{ru ? "⭐ Полный доступ — у тебя открыто всё" : "⭐ Full access — everything is unlocked"}</p>
        <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{ru ? "Все идеи, разборы и категории твои навсегда." : "Every idea, breakdown and category is yours forever."}</p>
      </div>
    );
  }

  const lifePrice = ownsDeck ? LIFETIME.rub - DECK_CREDIT_RUB : LIFETIME.rub;

  const cardButton = (kind: string, label: string) => (
    <div className="mt-auto flex flex-col gap-2.5 pt-7">
      <button
        type="button"
        onClick={() => (cardEnabled ? buy(kind, "bank_card", `${kind}c`) : setAuth(true))}
        disabled={busy === `${kind}c`}
        className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-footnote font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy === `${kind}c` ? "…" : label}
      </button>
      {cardEnabled && (
        <button
          type="button"
          onClick={() => buy(kind, "sbp", `${kind}s`)}
          disabled={busy === `${kind}s`}
          className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
        >
          {busy === `${kind}s` ? "…" : ru ? "Оплатить через СБП" : "Pay via SBP"}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Lifetime — the hero offer */}
      <div className="mx-auto w-full max-w-[560px]">
        <div className="relative flex flex-col rounded-[var(--radius-2xl)] border-2 border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,var(--color-surface-card))] p-6">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-accent-brand)] px-3 py-0.5 text-[11px] font-bold text-white">
            {ru ? "🔥 Всё навсегда" : "🔥 Everything forever"}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Lifetime" : "Lifetime"}</span>
          </div>
          <div className="mt-3">
            {ownsDeck && <s className="block text-[14px] leading-none text-[var(--color-text-tertiary)]">{fmt(LIFETIME.rub)}&nbsp;₽</s>}
            <span className="mt-1 block whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">{fmt(lifePrice)}&nbsp;₽</span>
          </div>
          <div className="mt-2 text-callout font-semibold text-[var(--color-text-brand)]">{ru ? "♾️ Все ниши, разборы и идеи — навсегда" : "♾️ Every niche, breakdown and idea — forever"}</div>
          {ownsDeck && <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{ru ? `Колода зачтена — −${DECK_CREDIT_RUB} ₽` : `Deck credited — −${DECK_CREDIT_RUB} ₽`}</div>}
          <ul className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-5">
            {(ru
              ? ["Все категории и идеи открыты навсегда", "Тысячи реальных отзывов, разобранные в готовые выводы", "Платить снова не нужно"]
              : ["Every category and idea open forever", "Thousands of real reviews turned into ready conclusions", "Never pay again"]
            ).map((f) => (
              <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#4ade80]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {f}
              </li>
            ))}
          </ul>
          {cardButton("lifetime", ru ? "Купить картой РФ" : "Pay by card (RU)")}
          {loggedIn ? (
            <a href={lifeStars} className="mt-2.5 flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
              <span aria-hidden>⭐</span> {LIFETIME.stars.toLocaleString("ru-RU")} Telegram
            </a>
          ) : (
            <button type="button" onClick={() => setAuth(true)} className="mt-2.5 flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)]">
              <span aria-hidden>⭐</span> {LIFETIME.stars.toLocaleString("ru-RU")} Telegram
            </button>
          )}
        </div>
      </div>

      {/* Deck — cheaper entry */}
      <div className="mx-auto w-full max-w-[560px]">
        <p className="mb-3 text-center text-callout text-[var(--color-text-tertiary)]">{ru ? "Или начни с колоды" : "Or start with the deck"}</p>
        <div className="flex flex-col rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Колода идей" : "Idea deck"}</span>
            {ownsDeck && <span className="shrink-0 rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-brand)]">{ru ? "у тебя есть" : "owned"}</span>}
          </div>
          <div className="mt-3 block whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">{fmt(DECK_PRICE_RUB)}&nbsp;₽</div>
          <div className="mt-2 text-callout font-semibold text-[var(--color-text-brand)]">{ru ? "Лучшая идея из каждой ниши — навсегда" : "The best idea from every niche — forever"}</div>
          <ul className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-5">
            {(ru
              ? ["Топ-разборы со всех премиум-ниш в одной колоде", "Полный разбор каждой: что строить, для кого, как заработать", "Цена зачтётся, если возьмёшь Lifetime"]
              : ["Top breakdowns from every premium niche in one deck", "Each fully broken down: what to build, for whom, how to earn", "Price credits toward Lifetime if you upgrade"]
            ).map((f) => (
              <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#4ade80]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {f}
              </li>
            ))}
          </ul>
          {ownsDeck ? (
            <p className="mt-7 rounded-full bg-[var(--color-surface-card-subtle)] px-4 py-3 text-center text-footnote font-semibold text-[var(--color-text-tertiary)]">{ru ? "Колода уже открыта ✓" : "Deck already unlocked ✓"}</p>
          ) : (
            cardButton("deck", ru ? "Открыть колоду картой РФ" : "Unlock deck by card (RU)")
          )}
        </div>
      </div>

      {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
      {!cardEnabled && (
        <p className="text-center text-caption text-[var(--color-text-tertiary)]">
          {ru ? "Оплата картой скоро — пока доступны Telegram Stars." : "Card payments coming soon — Telegram Stars available now."}
        </p>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
