"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import { LIFETIME, FRIEND_PRICE_RUB, FRIEND_DISCOUNT_PCT, LAUNCH_PROMO } from "@/lib/tokenConfig";
import { trackBeginCheckout, trackAddPaymentInfo } from "@/lib/track";
import type { Locale } from "@/lib/i18n";

// The site's single paywall. The base offer is lifetime («весь сайт навсегда»).
// When categorySlug+categoryPrice are passed (niche surfaces), the popup adds a
// cheaper entry SKU — this one niche forever — next to the lifetime option.
// Pays via card РФ / СБП. Other legacy props (kind, price, stars) are still
// accepted so existing call sites compile, but don't drive anything.
export default function BuyButton({
  loggedIn,
  locale = "ru",
  label,
  title,
  subtitle,
  inline = false,
  categorySlug,
  categoryPrice,
  categoryName,
}: {
  loggedIn: boolean;
  locale?: Locale;
  label?: string;
  title?: string;
  subtitle?: string;
  inline?: boolean;
  // Entry SKU: unlock one niche forever (shown only when both are passed).
  categorySlug?: string;
  categoryPrice?: number;
  categoryName?: string;
  // ── accepted for backward-compat, no longer drive the SKU ──
  kind?: string;
  slug?: string;
  price?: number;
  starsHref?: string;
  starsLabel?: string;
  lifetimePrice?: number;
  lifetimeStarsHref?: string;
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const catAvailable = !!(categorySlug && categoryPrice);
  const [sku, setSku] = useState<"lifetime" | "category">(catAvailable ? "category" : "lifetime");

  // The lifetime price: discounted launch price while the promo is on, else the
  // standard one.
  const eff = LAUNCH_PROMO ? FRIEND_PRICE_RUB : LIFETIME.rub;
  const chosenPrice = sku === "category" && catAvailable ? (categoryPrice as number) : eff;

  // Single-offer copy is owned here, not by call sites — every paywall on the
  // site shows the same wording and price. The label/title/subtitle props are
  // still accepted (legacy call sites) but intentionally ignored so no surface
  // can advertise a stale per-category/per-deck price. During the launch promo
  // it is framed as a founding price («Доступ для первых») that will rise — honest
  // urgency that makes raising the number later natural.
  void label; void title; void subtitle;
  const ttl = catAvailable
    ? (ru ? "Открыть навсегда" : "Unlock forever")
    : LAUNCH_PROMO
      ? (ru ? "Доступ для первых" : "Founding access")
      : (ru ? "Весь сайт навсегда" : "The whole site, forever");
  const sub = sku === "category" && catAvailable
    ? (ru
      ? "Открываешь эту нишу целиком и навсегда: идеи, выводы и деньги."
      : "Open this niche in full, forever: the ideas, the findings and the money.")
    : (ru
      ? "Забираешь весь сайт навсегда: все разборы, идеи под спрос и народный рейтинг, включая всё, что выйдет дальше."
      : "Take the whole site forever: every breakdown, demand-backed idea and the people's rating, including everything that comes next.");
  const triggerLabel = catAvailable
    ? (ru ? `Открыть за ${categoryPrice} ₽` : `Unlock for ${categoryPrice} ₽`)
    : (ru ? `Открыть весь сайт за ${eff} ₽` : `Unlock the whole site, ${eff} ₽`);

  function onClick() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    setErr(null);
    trackBeginCheckout(
      sku === "category" && catAvailable
        ? { id: "category", name: "Разбор ниши", price: chosenPrice }
        : { id: "lifetime", name: "Весь сайт навсегда", price: eff },
    );
    setOpen(true);
  }

  async function pay(method: "bank_card" | "sbp") {
    trackAddPaymentInfo(
      sku === "category" && catAvailable
        ? { id: "category", name: "Разбор ниши", price: chosenPrice }
        : { id: "lifetime", name: "Весь сайт навсегда", price: eff },
      method,
    );
    setBusy(method);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          sku === "category" && catAvailable
            ? { kind: "category", slug: categorySlug, method }
            : { kind: "lifetime", method },
        ),
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

  // Card РФ / СБП + the «what you get» list — shared by the popup and inline panel.
  const benefits = sku === "category" && catAvailable
    ? (ru
      ? ["Все идеи ниши с механикой и деньгами", "Закрытые выводы с цитатами", "Оценка выручки и вывод о деньгах", "Дизайн-промпт экранов в ChatGPT у каждой идеи"]
      : ["Every idea in the niche, with mechanics and money", "The locked findings with quotes", "Revenue estimate and the money takeaway", "A ChatGPT screens prompt with every idea"])
    : (ru
      ? ["Все категории и идеи под подтверждённый спрос", "Новые ниши входят без доплат", "Один платёж, доступ навсегда"]
      : ["Every category and demand-backed idea", "New niches included, no extra cost", "One payment, access forever"]);

  // Two-SKU picker (niche surfaces only): this niche alone or everything.
  const skuPicker = catAvailable ? (
    <div className="flex flex-col gap-2">
      {([
        { id: "category" as const, t: ru ? "Только эта ниша" : "This niche only", s: categoryName, p: `${categoryPrice} ₽`, strike: undefined as string | undefined },
        { id: "lifetime" as const, t: ru ? "Весь сайт навсегда" : "The whole site forever", s: ru ? "все ниши, включая новые" : "every niche, including new ones", p: `${eff} ₽`, strike: LAUNCH_PROMO ? `${LIFETIME.rub} ₽` : undefined },
      ]).map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setSku(o.id)}
          aria-pressed={sku === o.id}
          className={`flex items-baseline justify-between gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors ${sku === o.id ? "border-[var(--color-text-primary)]" : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"}`}
        >
          <span className="min-w-0">
            <span className="block text-callout font-semibold text-[var(--color-text-primary)]">{o.t}</span>
            {o.s && <span className="mt-0.5 block truncate text-caption text-[var(--color-text-tertiary)]">{o.s}</span>}
          </span>
          <span className="shrink-0 text-callout font-semibold tabular-nums text-[var(--color-text-primary)]">
            {o.p}
            {o.strike && <s className="ml-1.5 font-normal text-[var(--color-text-tertiary)]">{o.strike}</s>}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  const methods = (
    <>
      <p className="text-footnote text-[var(--color-text-secondary)]">{sub}</p>

      <ul className="flex flex-col gap-2">
        {benefits.map((f) => (
          <li key={f} className="flex items-start gap-2 text-footnote text-[var(--color-text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0 text-[#4ade80]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {f}
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
      </div>

      {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
    </>
  );

  // Price block (big number + struck-through original + the founding-price note
  // during the launch promo).
  const priceBlock = (
    <div className="mt-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-headline text-[var(--color-text-primary)]">{eff}&nbsp;₽</span>
        {LAUNCH_PROMO && (
          <>
            <s className="text-callout text-[var(--color-text-tertiary)]">{LIFETIME.rub}&nbsp;₽</s>
            <span className="rounded-full bg-[var(--color-accent-brand)] px-1.5 py-0.5 text-caption font-bold text-white">−{FRIEND_DISCOUNT_PCT}%</span>
          </>
        )}
      </div>
      {LAUNCH_PROMO && (
        <p className="mt-1.5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Цена для первых покупателей. Дальше дороже." : "Price for the first buyers. It goes up from here."}</p>
      )}
    </div>
  );

  // Inline: render the panel straight on the page (no trigger, no popup).
  if (inline) {
    return (
      <>
        {!loggedIn ? (
          <button
            type="button"
            onClick={() => setAuth(true)}
            className="btn-shimmer inline-flex items-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 text-body font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {ru ? "Войти и открыть" : "Sign in to unlock"}
          </button>
        ) : (
          <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.5)]">
            <div className="min-w-0">
              <div className="text-headline text-[var(--color-text-primary)]">{ttl}</div>
              {!catAvailable && priceBlock}
            </div>
            {skuPicker}
            {methods}
          </div>
        )}
        {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="btn-shimmer inline-flex items-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 text-body font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
      >
        {loggedIn ? triggerLabel : ru ? "Войти и открыть" : "Sign in to unlock"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="flex w-full max-w-[420px] flex-col gap-5 rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-6 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)] sm:rounded-[var(--radius-2xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-headline text-[var(--color-text-primary)]">{ttl}</div>
                {!catAvailable && priceBlock}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>
              </button>
            </div>
            {skuPicker}
            {methods}
          </div>
        </div>,
        document.body,
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
