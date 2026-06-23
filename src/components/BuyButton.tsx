"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import { LIFETIME, FRIEND_PRICE_RUB, FRIEND_DISCOUNT_PCT, LAUNCH_PROMO } from "@/lib/tokenConfig";
import { trackBeginCheckout, trackAddPaymentInfo } from "@/lib/track";
import type { Locale } from "@/lib/i18n";

// A buy trigger that opens a payment-options popup (card РФ / СБП) for a direct-₽
// SKU (deck or category). Telegram Stars for these isn't wired yet — it needs the
// external bot to handle deck_/cat_ commands — so only Lifetime offers Stars (in
// the store). Sign-in is requested first if needed.
export default function BuyButton({
  kind,
  slug,
  price,
  label,
  loggedIn,
  locale = "ru",
  title,
  subtitle,
  starsHref,
  starsLabel,
  lifetimePrice,
  lifetimeStarsHref,
}: {
  kind: "deck" | "category";
  slug?: string;
  price: number;
  label: string;
  loggedIn: boolean;
  locale?: Locale;
  title: string;
  subtitle: string;
  starsHref?: string;
  starsLabel?: string;
  lifetimePrice?: number;
  lifetimeStarsHref?: string;
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [lifeOpen, setLifeOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    setErr(null);
    trackBeginCheckout({ id: kind, name: title, price });
    setOpen(true);
  }

  // During the launch promo Lifetime is sold at the flat «Друг проекта» price.
  const lifeEff = LAUNCH_PROMO ? FRIEND_PRICE_RUB : lifetimePrice ?? 0;

  async function pay(method: "bank_card" | "sbp", payKind: "deck" | "category" | "lifetime" = kind) {
    const payValue = payKind === "lifetime" ? lifeEff : price;
    trackAddPaymentInfo({ id: payKind, name: payKind === "lifetime" ? "Lifetime" : title, price: payValue }, method);
    setBusy(`${payKind}:${method}`);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: payKind, slug: payKind === "category" ? slug : undefined, method }),
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

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="btn-shimmer inline-flex items-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
      >
        {loggedIn ? label : ru ? "Войти и открыть" : "Sign in to unlock"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="flex w-full max-w-[420px] flex-col gap-5 rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)] sm:rounded-[var(--radius-2xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</div>
                <div className="mt-1 text-[26px] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">{price}&nbsp;₽</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>
              </button>
            </div>
            <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{subtitle}</p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => pay("bank_card")}
                disabled={!!busy}
                className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy === `${kind}:bank_card` ? "…" : ru ? "Картой РФ" : "Card (RU)"}
              </button>
              <button
                type="button"
                onClick={() => pay("sbp")}
                disabled={!!busy}
                className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
              >
                {busy === `${kind}:sbp` ? "…" : ru ? "Через СБП" : "Via SBP"}
              </button>
              {starsHref && (
                <a
                  href={starsHref}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                >
                  <span aria-hidden>⭐</span> {starsLabel || (ru ? "Telegram Stars" : "Telegram Stars")}
                </a>
              )}
            </div>

            {lifetimePrice ? (
              <>
                <div className="flex items-center gap-3 text-caption text-[var(--color-text-tertiary)]">
                  <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                  {ru ? "или открой всё" : "or unlock everything"}
                  <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
                </div>
                <button
                  type="button"
                  onClick={() => setLifeOpen((v) => !v)}
                  aria-expanded={lifeOpen}
                  className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] px-4 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-brand)_14%,transparent)]"
                >
                  <span>{ru ? "♾️ Lifetime — всё навсегда" : "♾️ Lifetime — everything forever"}</span>
                  <span className="font-bold">{lifeEff}&nbsp;₽</span>
                  {LAUNCH_PROMO && (
                    <>
                      <s className="text-[var(--color-text-tertiary)]">{lifetimePrice}&nbsp;₽</s>
                      <span className="rounded-full bg-[var(--color-accent-brand)] px-1.5 py-0.5 text-[11px] font-bold text-white">−{FRIEND_DISCOUNT_PCT}%</span>
                    </>
                  )}
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className={`transition-transform ${lifeOpen ? "rotate-180" : ""}`} aria-hidden><path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {lifeOpen && (
                  <div className="flex flex-col gap-2.5 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-4">
                    <ul className="mb-1 flex flex-col gap-2">
                      {(ru
                        ? ["Все категории сайта — открыты навсегда", "Все новые публикации и ниши тоже входят", "Колода идей целиком", "Платить снова не нужно"]
                        : ["Every category on the site — open forever", "All future publications and niches included", "The whole idea deck", "Never pay again"]
                      ).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0 text-[#4ade80]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => pay("bank_card", "lifetime")} disabled={!!busy} className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60">
                      {busy === "lifetime:bank_card" ? "…" : ru ? "Картой РФ" : "Card (RU)"}
                    </button>
                    <button type="button" onClick={() => pay("sbp", "lifetime")} disabled={!!busy} className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60">
                      {busy === "lifetime:sbp" ? "…" : ru ? "Через СБП" : "Via SBP"}
                    </button>
                    {!LAUNCH_PROMO && lifetimeStarsHref && (
                      <a href={lifetimeStarsHref} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
                        <span aria-hidden>⭐</span> {LIFETIME.stars.toLocaleString("ru-RU")} Telegram
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : null}
            {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
          </div>
        </div>,
        document.body,
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
