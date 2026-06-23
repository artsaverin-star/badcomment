"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
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
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onClick() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    setErr(null);
    setOpen(true);
  }

  async function pay(method: "bank_card" | "sbp") {
    setBusy(method);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, slug, method }),
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
                {busy === "bank_card" ? "…" : ru ? "Картой РФ" : "Card (RU)"}
              </button>
              <button
                type="button"
                onClick={() => pay("sbp")}
                disabled={!!busy}
                className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
              >
                {busy === "sbp" ? "…" : ru ? "Через СБП" : "Via SBP"}
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
            {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
          </div>
        </div>,
        document.body,
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
