"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import { TOKEN_PACKS, UNLOCK_COST, LIFETIME, tokensWord } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// Energy wallet + simple store: a short "what costs what" reference, then 4 SKU
// cards (3 packs + Lifetime), each with price and three pay buttons.
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
      setErr(d.error || "Не удалось создать платёж");
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(null);
    }
  }

  const primaryBtn =
    "w-full rounded-full bg-[var(--color-button-primary-bg)] px-3 py-2 text-footnote font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60";
  const secBtn =
    "w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-3 py-2 text-center text-footnote font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]";

  // 3 packs + lifetime, rendered uniformly.
  const skus = [
    ...TOKEN_PACKS.map((p) => ({
      id: p.id,
      title: `⚡ ${p.tokens}`,
      sub: tokensWord(p.tokens),
      rub: p.rub,
      stars: p.stars,
      badge: p.badge,
      cardBody: { pack: p.id } as { pack?: string; kind?: string },
      starsHref: packStars(p.id),
      highlight: false,
    })),
    {
      id: "life",
      title: "♾️ Навсегда",
      sub: "всё включено",
      rub: LIFETIME.rub,
      stars: LIFETIME.stars,
      badge: undefined as string | undefined,
      cardBody: { kind: "lifetime" } as { pack?: string; kind?: string },
      starsHref: lifeStars,
      highlight: true,
    },
  ];

  const ref = [
    { icon: "📱", l: "Приложение", c: UNLOCK_COST.app },
    { icon: "💡", l: "Идея", c: UNLOCK_COST.idea },
    { icon: "🗂", l: "Категория", c: UNLOCK_COST.category },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Balance */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 text-center">
        {unlimited ? (
          <p className="text-lead font-semibold text-[var(--color-text-primary)]">⭐ Полный доступ — энергия не нужна</p>
        ) : (
          <>
            <div className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">Баланс</div>
            <div className="text-[36px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
              ⚡ {loggedIn ? balance : 0}
            </div>
          </>
        )}
      </div>

      {/* What costs what — compact reference */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] px-4 py-3 text-center">
        {ref.map((x) => (
          <span key={x.l} className="flex items-center gap-1.5 text-footnote text-[var(--color-text-secondary)]">
            <span className="text-[15px]">{x.icon}</span>
            {x.l}
            <span className="font-bold tabular-nums text-[var(--color-text-brand)]">{x.c} ⚡</span>
          </span>
        ))}
      </div>

      {/* SKUs */}
      {!unlimited && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {skus.map((s) => (
              <div
                key={s.id}
                className={`flex flex-col gap-1 rounded-[var(--radius-xl)] border p-4 text-center ${
                  s.highlight
                    ? "border-2 border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_7%,transparent)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]"
                }`}
              >
                <div className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{s.title}</div>
                <div className="text-caption text-[var(--color-text-tertiary)]">{s.sub}</div>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span className="text-callout font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {s.rub.toLocaleString("ru-RU")} ₽
                  </span>
                  {s.badge && (
                    <span className="rounded-full bg-[var(--color-accent-brand-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-text-brand)]">
                      {s.badge}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {cardEnabled && (
                    <button
                      type="button"
                      onClick={() => buyCard({ ...s.cardBody, method: "bank_card" }, `${s.id}c`)}
                      disabled={busy === `${s.id}c`}
                      className={primaryBtn}
                    >
                      {busy === `${s.id}c` ? "…" : "Картой"}
                    </button>
                  )}
                  {cardEnabled && (
                    <button
                      type="button"
                      onClick={() => buyCard({ ...s.cardBody, method: "sbp" }, `${s.id}s`)}
                      disabled={busy === `${s.id}s`}
                      className={secBtn}
                    >
                      {busy === `${s.id}s` ? "…" : "СБП"}
                    </button>
                  )}
                  {loggedIn ? (
                    <a href={s.starsHref} className={secBtn}>
                      {s.stars} ⭐
                    </a>
                  ) : (
                    <button type="button" onClick={() => setAuth(true)} className={secBtn}>
                      {s.stars} ⭐
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
          {!cardEnabled && (
            <p className="text-center text-caption text-[var(--color-text-tertiary)]">
              Оплата картой скоро — пока доступны Telegram Stars.
            </p>
          )}
        </>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
