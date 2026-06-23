"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import { LIFETIME, FRIEND_PRICE_RUB, FRIEND_DISCOUNT_PCT } from "@/lib/tokenConfig";
import { trackBeginCheckout, trackAddPaymentInfo } from "@/lib/track";
import type { Locale } from "@/lib/i18n";

// Launch-promo entry point that lives in the header: an animated discount badge
// that opens the «Друг проекта» offer — lifetime access to everything forever at
// the discounted launch price. Reuses the YooKassa flow (kind: "friend", which
// the server maps to a lifetime grant).
export default function LaunchOffer({
  locale = "ru",
  loggedIn,
}: {
  locale?: Locale;
  loggedIn: boolean;
}) {
  const ru = locale !== "en";
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function openOffer() {
    setErr(null);
    trackBeginCheckout({ id: "friend", name: "Друг проекта", price: FRIEND_PRICE_RUB });
    setOpen(true);
  }

  async function pay(method: "bank_card" | "sbp") {
    if (!loggedIn) {
      setOpen(false);
      setAuth(true);
      return;
    }
    trackAddPaymentInfo({ id: "friend", name: "Друг проекта", price: FRIEND_PRICE_RUB }, method);
    setBusy(method);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "friend", method }),
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

  const benefits = ru
    ? ["Все разборы категорий — открыты навсегда", "Все идеи и спец-статьи", "Каждая новая публикация и ниша тоже входит", "Один платёж — больше никогда"]
    : ["Every category breakdown — open forever", "All ideas and special reports", "Every future publication and niche included", "One payment — never again"];

  return (
    <>
      {/* Animated discount badge in the header */}
      <button
        type="button"
        onClick={openOffer}
        aria-label={ru ? "Спецпредложение" : "Special offer"}
        className="promo-badge relative flex h-9 shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-brand)] pl-2 pr-2.5 text-[13px] font-bold text-white"
      >
        <span className="absolute -inset-0.5 -z-10 animate-ping rounded-full bg-[var(--color-accent-brand)] opacity-40" aria-hidden />
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="14" cy="14" r="2.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M15.5 4.5 4.5 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="tabular-nums">−{FRIEND_DISCOUNT_PCT}%</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="flex w-full max-w-[440px] flex-col gap-5 rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)] sm:rounded-[var(--radius-2xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-brand)]">{ru ? "В честь запуска" : "Launch offer"}</div>
                <div className="mt-1.5 text-[24px] font-black leading-[1.1] tracking-[-0.02em] text-[var(--color-text-primary)]">{ru ? "Стать другом проекта" : "Become a friend of the project"}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>
              </button>
            </div>

            <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? "Пожизненный доступ ко всем разборам, идеям и статьям — навсегда. Поддержи проект на старте и больше никогда не плати."
                : "Lifetime access to every breakdown, idea and article — forever. Back the project at launch and never pay again."}
            </p>

            <div className="flex items-end gap-3">
              <span className="text-[34px] font-black leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">{FRIEND_PRICE_RUB}&nbsp;₽</span>
              <span className="pb-1 text-[18px] font-semibold text-[var(--color-text-tertiary)] line-through">{LIFETIME.rub}&nbsp;₽</span>
              <span className="mb-1 rounded-full bg-[var(--color-accent-brand)] px-2 py-0.5 text-[12px] font-bold text-white">−{FRIEND_DISCOUNT_PCT}%</span>
            </div>

            <ul className="flex flex-col gap-2">
              {benefits.map((f) => (
                <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0 text-[#4ade80]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5">
              <button type="button" onClick={() => pay("bank_card")} disabled={!!busy} className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60">
                {busy === "bank_card" ? "…" : loggedIn ? (ru ? "Картой РФ" : "Card (RU)") : (ru ? "Войти и стать другом" : "Sign in to join")}
              </button>
              {loggedIn && (
                <button type="button" onClick={() => pay("sbp")} disabled={!!busy} className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60">
                  {busy === "sbp" ? "…" : ru ? "Через СБП" : "Via SBP"}
                </button>
              )}
            </div>
            {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
          </div>
        </div>,
        document.body,
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
