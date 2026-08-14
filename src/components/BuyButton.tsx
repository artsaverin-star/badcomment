"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import AuthModal from "./AuthModal";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import {
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackLoginRequired,
  trackOfferOpen,
  trackPaymentError,
  trackPaymentRedirect,
  trackPaywallView,
} from "@/lib/track";
import type { Locale } from "@/lib/i18n";

// One honest offer everywhere: the whole product forever for one payment. Old
// SKU-shaped props remain accepted while historical call sites are retired,
// but price, copy and checkout payload all come from this component.
export default function BuyButton({
  loggedIn,
  locale = "ru",
  inline = false,
  children,
  triggerClassName,
  source,
}: {
  loggedIn: boolean;
  locale?: Locale;
  inline?: boolean;
  children?: React.ReactNode;
  triggerClassName?: string;
  source?: string;
  // Backward-compatible, intentionally ignored.
  label?: string;
  title?: string;
  subtitle?: string;
  kind?: string;
  slug?: string;
  price?: number;
  categorySlug?: string;
  categoryPrice?: number;
  categoryName?: string;
  starsHref?: string;
  starsLabel?: string;
  lifetimePrice?: number;
  lifetimeStarsHref?: string;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const pathname = usePathname() || lp;
  const eventSource = source || pathname;
  const item = { id: "lifetime", name: "inApp — полный доступ навсегда", price: ACCESS_PRICE_RUB };
  const [signedIn, setSignedIn] = useState(loggedIn);
  const [auth, setAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pendingMethod = useRef<"bank_card" | "sbp" | null>(null);

  useEffect(() => {
    trackPaywallView(eventSource, ACCESS_PRICE_RUB);
  }, [eventSource]);

  const benefits = ru
    ? [
        "1 451 072 отзыва с поштучной разметкой",
        "Все категории, приложения, темы и полные тексты",
        "Все разборы, идеи под спрос и народный рейтинг",
        "Полный ASO-аудит и готовые тексты для App Store",
        "MCP-сервер для Codex, Claude и других клиентов",
      ]
    : [
        "1,451,072 individually labelled reviews",
        "Every category, app, topic and complete review text",
        "Every breakdown, demand-backed idea and people's rating",
        "A complete ASO audit and ready-to-use App Store copy",
        "The MCP server for Codex, Claude and other clients",
      ];

  function openOffer() {
    setErr(null);
    trackOfferOpen(eventSource, signedIn, ACCESS_PRICE_RUB);
    if (signedIn) trackBeginCheckout(item, eventSource);
    setOpen(true);
  }

  async function createCheckout(method: "bank_card" | "sbp") {
    trackAddPaymentInfo(item, method, eventSource);
    setBusy(method);
    setErr(null);
    try {
      const response = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "lifetime", method, source: eventSource }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.url) {
        trackPaymentRedirect(eventSource, method, ACCESS_PRICE_RUB);
        window.location.assign(data.url);
        return;
      }
      trackPaymentError(eventSource, method, response.ok ? "missing_url" : `http_${response.status}`);
      setErr(data.error || (ru ? "Не удалось создать платёж" : "Couldn't create payment"));
    } catch {
      trackPaymentError(eventSource, method, "network");
      setErr(ru ? "Сеть недоступна" : "Network unavailable");
    } finally {
      setBusy(null);
    }
  }

  function pay(method: "bank_card" | "sbp") {
    if (!signedIn) {
      pendingMethod.current = method;
      trackLoginRequired(eventSource);
      setAuth(true);
      return;
    }
    void createCheckout(method);
  }

  function authSuccess() {
    setSignedIn(true);
    setAuth(false);
    trackBeginCheckout(item, eventSource);
    const method = pendingMethod.current;
    pendingMethod.current = null;
    if (method) void createCheckout(method);
  }

  const panel = (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">
          {ru ? "Полный доступ" : "Full access"}
        </p>
        <h2 className="mt-1.5 text-title2 text-balance text-[var(--color-text-primary)]">
          {ru ? "Весь inApp навсегда" : "All of inApp, forever"}
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{ACCESS_PRICE_RUB}&nbsp;₽</span>
          <span className="text-footnote text-[var(--color-text-tertiary)]">
            {ru ? "разовый платёж · без подписки" : "one payment · no subscription"}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2.5 text-footnote text-[var(--color-text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0 text-[#4ade80]">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => pay("bank_card")}
          disabled={!!busy}
          className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy === "bank_card" ? "…" : ru ? `Оплатить картой — ${ACCESS_PRICE_RUB} ₽` : `Pay by card — ₽${ACCESS_PRICE_RUB}`}
        </button>
        <button
          type="button"
          onClick={() => pay("sbp")}
          disabled={!!busy}
          className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
        >
          {busy === "sbp" ? "…" : ru ? `Оплатить через СБП — ${ACCESS_PRICE_RUB} ₽` : `Pay via SBP — ₽${ACCESS_PRICE_RUB}`}
        </button>
      </div>

      {!signedIn && (
        <p className="text-center text-caption text-[var(--color-text-tertiary)]">
          {ru ? "Перед переходом к оплате попросим войти — доступ привяжется к аккаунту." : "You'll sign in before payment so access is attached to your account."}
        </p>
      )}
      <p className="text-center text-caption text-[var(--color-text-tertiary)]">
        {ru ? "Доступ включается автоматически после подтверждения ЮKassa. " : "Access starts automatically after YooKassa confirms the payment. "}
        <Link href={`${lp}/offer`} className="underline underline-offset-2 hover:text-[var(--color-text-primary)]">{ru ? "Условия" : "Terms"}</Link>
        {" · "}
        <Link href={`${lp}/contacts`} className="underline underline-offset-2 hover:text-[var(--color-text-primary)]">{ru ? "Поддержка" : "Support"}</Link>
      </p>
      {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
    </div>
  );

  if (inline) {
    return (
      <>
        <div className="w-full max-w-[460px] rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.5)]">
          {panel}
        </div>
        {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={authSuccess} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openOffer}
        className={triggerClassName ?? "btn-shimmer inline-flex items-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 text-body font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"}
      >
        {children ?? (ru ? `Открыть всё навсегда — ${ACCESS_PRICE_RUB} ₽` : `Unlock everything forever — ₽${ACCESS_PRICE_RUB}`)}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[460px] rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)] sm:rounded-[var(--radius-2xl)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>
              </button>
            </div>
            {panel}
          </div>
        </div>,
        document.body,
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={authSuccess} />}
    </>
  );
}
