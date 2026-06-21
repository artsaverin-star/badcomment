"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import { TOKEN_PACKS, UNLOCK_COST, LIFETIME, LIFETIME_REGULAR, tokensWord } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const BASE_RATE = TOKEN_PACKS[0].rub / TOKEN_PACKS[0].tokens; // ₽ per energy at the smallest pack
const fmt = (n: number) => n.toLocaleString("ru-RU");

// Energy wallet + pricing-style store. Four SKU cards (3 packs + Lifetime) with
// struck anchor price, a "what you can open" feature list, and one primary CTA
// (card) plus compact СБП / Stars options.
export default function TokenStore({
  balance,
  unlimited,
  loggedIn,
  cardEnabled,
  botStart,
  uid,
  locale = "ru",
}: {
  balance: number;
  unlimited: boolean;
  loggedIn: boolean;
  cardEnabled: boolean;
  botStart: string;
  uid: string;
  locale?: Locale;
}) {
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ru = locale !== "en";

  const packStars = (id: string) => `${botStart}buy_${uid ? `${uid}_` : ""}${id}`;
  const lifeStars = `${botStart}life_${uid}`;

  async function buyCard(body: { pack?: string; kind?: string; method?: string }, key: string) {
    if (!loggedIn) return setAuth(true);
    setBusy(key);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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

  type Sku = {
    id: string;
    name: string;
    tokens: number | null;
    rub: number;
    stars: number;
    anchor?: number;
    badge?: string;
    features: string[];
    body: { pack?: string; kind?: string };
    starsHref: string;
    popular?: boolean;
    hero?: boolean;
  };

  const packSkus: Sku[] = TOKEN_PACKS.map((p) => {
    const anchor = Math.round((p.tokens * BASE_RATE) / 10) * 10;
    return {
      id: p.id,
      name: p.id === "s" ? (ru?"Старт":"Starter") : p.id === "m" ? (ru?"Выгодный":"Value") : (ru?"Про":"Pro"),
      tokens: p.tokens,
      rub: p.rub,
      stars: p.stars,
      anchor: anchor > p.rub ? anchor : undefined,
      badge: p.badge,
      popular: p.id === "l",
      features: ru
        ? [
            `до ${Math.floor(p.tokens / UNLOCK_COST.category)} категорий целиком`,
            `или ${Math.floor(p.tokens / UNLOCK_COST.idea)} идей`,
            `или ${Math.floor(p.tokens / UNLOCK_COST.app)} приложений`,
          ]
        : [
            `up to ${Math.floor(p.tokens / UNLOCK_COST.category)} full categories`,
            `or ${Math.floor(p.tokens / UNLOCK_COST.idea)} ideas`,
            `or ${Math.floor(p.tokens / UNLOCK_COST.app)} apps`,
          ],
      body: { pack: p.id },
      starsHref: packStars(p.id),
    };
  });

  const life: Sku = {
    id: "life",
    name: ru ? "Ранний доступ" : "Early access",
    tokens: null,
    rub: LIFETIME.rub,
    stars: LIFETIME.stars,
    anchor: LIFETIME_REGULAR,
    badge: ru ? `потом ${fmt(LIFETIME_REGULAR)} ₽` : `then ${fmt(LIFETIME_REGULAR)} ₽`,
    hero: true,
    features: ru
      ? [
          "Проект только начинается — вы заходите одним из первых",
          "Все разделы, ниши, выводы и идеи — открыты навсегда",
          "Доступ остаётся с вами навсегда, платить снова не нужно",
        ]
      : [
          "The project is just starting — you're getting in early",
          "Every section, niche, conclusion and idea — open forever",
          "Your access stays forever — never pay again",
        ],
    body: { kind: "lifetime" },
    starsHref: lifeStars,
  };

  const renderSku = (s: Sku) => (
    <div
      key={s.id}
      className={`relative flex flex-col rounded-[var(--radius-2xl)] border p-6 transition-shadow hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] ${
        s.hero
          ? "border-2 border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,var(--color-surface-card))]"
          : s.popular
            ? "border-[var(--color-border-strong)] bg-[var(--color-surface-card)]"
            : "border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]"
      }`}
    >
      {(s.popular || s.hero) && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-accent-brand)] px-3 py-0.5 text-[11px] font-bold text-white">
          {s.hero ? (ru ? "🔥 Ранний доступ" : "🔥 Early access") : (ru ? "Популярный" : "Popular")}
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{s.name}</span>
        {s.badge && (
          <span className="shrink-0 rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-brand)]">
            {s.badge}
          </span>
        )}
      </div>
      <div className="mt-3">
        {s.anchor && <s className="block text-[14px] leading-none text-[var(--color-text-tertiary)]">{fmt(s.anchor)}&nbsp;₽</s>}
        <span className="mt-1 block whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
          {fmt(s.rub)}&nbsp;₽
        </span>
      </div>
      <div className="mt-2 whitespace-nowrap text-callout font-semibold text-[var(--color-text-brand)]">
        {s.tokens != null ? `⚡ ${s.tokens} ${ru ? tokensWord(s.tokens) : "energy"}` : ru ? "♾️ Навсегда" : "♾️ Forever"}
      </div>
      <ul className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-5">
        {s.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-[#4ade80]">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2.5 pt-7">
        <button
          type="button"
          onClick={() => (cardEnabled ? buyCard({ ...s.body, method: "bank_card" }, `${s.id}c`) : setAuth(true))}
          disabled={busy === `${s.id}c`}
          className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-footnote font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === `${s.id}c` ? "…" : ru ? "Купить картой РФ" : "Pay by card (RU)"}
        </button>
        {cardEnabled && (
          <button
            type="button"
            onClick={() => buyCard({ ...s.body, method: "sbp" }, `${s.id}s`)}
            disabled={busy === `${s.id}s`}
            className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
          >
            {busy === `${s.id}s` ? "…" : ru ? "Оплатить через СБП" : "Pay via SBP"}
          </button>
        )}
        {loggedIn ? (
          <a
            href={s.starsHref}
            className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            <span aria-hidden>⭐</span> {s.stars.toLocaleString("ru-RU")} Telegram
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setAuth(true)}
            className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            <span aria-hidden>⭐</span> {s.stars.toLocaleString("ru-RU")} Telegram
          </button>
        )}
      </div>
    </div>
  );

  if (unlimited) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-8 text-center">
        <p className="text-lead font-semibold text-[var(--color-text-primary)]">{ru ? "⭐ Полный доступ — энергия не нужна" : "⭐ Full access — no energy needed"}</p>
        <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{ru ? "У тебя открыты все приложения, идеи и категории." : "You have every app, idea and category unlocked."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Balance plate */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-5 py-2.5">
          <span className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Баланс" : "Balance"}</span>
          <span className="text-[20px] font-bold tabular-nums leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">
            ⚡ {loggedIn ? balance : 0}
          </span>
        </span>
      </div>

      {/* Founding lifetime — the headline offer (beta price) */}
      <div className="mx-auto w-full max-w-[560px]">{renderSku(life)}</div>

      {/* Energy packs — secondary one-off top-ups */}
      <div className="flex flex-col gap-4">
        <p className="text-center text-callout text-[var(--color-text-tertiary)]">
          {ru ? "Или разовое пополнение энергии" : "Or a one-off energy top-up"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{packSkus.map(renderSku)}</div>
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
