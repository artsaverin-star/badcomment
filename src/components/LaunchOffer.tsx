"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import { LIFETIME, FRIEND_PRICE_RUB, FRIEND_DISCOUNT_PCT } from "@/lib/tokenConfig";
import { trackBeginCheckout, trackAddPaymentInfo } from "@/lib/track";
import type { Locale } from "@/lib/i18n";

// Launch-promo entry point that lives in the header: an animated discount badge
// that opens the single lifetime offer at the discounted launch price. The copy
// mirrors BuyButton word for word — one offer, one voice on every surface.
// Reuses the YooKassa flow (kind: "friend", which the server maps to a
// lifetime grant — the API param name is legacy, do not rename).
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
    trackBeginCheckout({ id: "friend", name: "Весь сайт навсегда", price: FRIEND_PRICE_RUB });
    setOpen(true);
  }

  async function pay(method: "bank_card" | "sbp") {
    if (!loggedIn) {
      setOpen(false);
      setAuth(true);
      return;
    }
    trackAddPaymentInfo({ id: "friend", name: "Весь сайт навсегда", price: FRIEND_PRICE_RUB }, method);
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
    ? ["Все категории и идеи под подтверждённый спрос", "Новые ниши входят без доплат", "Один платёж, доступ навсегда"]
    : ["Every category and demand-backed idea", "New niches included, no extra cost", "One payment, access forever"];

  return (
    <>
      {/* Animated discount badge in the header */}
      <button
        type="button"
        onClick={openOffer}
        aria-label={ru ? "Цена для первых" : "Founding price"}
        className="promo-badge relative flex h-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-brand)] px-3 text-footnote font-bold text-white"
      >
        <span className="promo-ring absolute -inset-0.5 -z-10 rounded-full bg-[var(--color-accent-brand)] opacity-0" aria-hidden />
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
                <div className="text-caption font-semibold text-[var(--color-text-brand)]">{ru ? "Доступ для первых" : "Founding access"}</div>
                <div className="mt-1.5 text-title2 text-[var(--color-text-primary)]">{ru ? "Весь сайт навсегда" : "The whole site, forever"}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>
              </button>
            </div>

            <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? "Забираешь весь сайт навсегда: все разборы, идеи под спрос и народный рейтинг, включая всё, что выйдет дальше."
                : "Take the whole site forever: every breakdown, demand-backed idea and the people's rating, including everything that comes next."}
            </p>

            <div>
              <div className="flex items-end gap-3">
                <span className="text-stat text-[var(--color-text-primary)]">{FRIEND_PRICE_RUB}&nbsp;₽</span>
                <span className="pb-1 text-subhead font-semibold text-[var(--color-text-tertiary)] line-through">{LIFETIME.rub}&nbsp;₽</span>
                <span className="mb-1 rounded-full bg-[var(--color-accent-brand)] px-2 py-0.5 text-caption font-bold text-white">−{FRIEND_DISCOUNT_PCT}%</span>
              </div>
              <p className="mt-1.5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Цена для первых покупателей. Дальше дороже." : "Price for the first buyers. It goes up from here."}</p>
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
                {busy === "bank_card" ? "…" : loggedIn ? (ru ? "Картой РФ" : "Card (RU)") : (ru ? "Войти и открыть" : "Sign in to unlock")}
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
