"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import { TOKEN_PACKS, UNLOCK_COST, LIFETIME, tokensWord } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// Token wallet + pack store + lifetime SKU. Card payments go through ЮKassa
// (redirect); Stars payments deep-link into the bot, which sends an invoice.
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
  botStart: string; // https://t.me/<bot>?start=
  uid: string; // site userId ("" when logged out)
  locale?: Locale;
}) {
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const packStars = (id: string) => `${botStart}buy_${uid ? `${uid}_` : ""}${id}`;
  const lifeStars = `${botStart}life_${uid}`;

  async function buyCard(body: { pack?: string; kind?: string }, key: string) {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    setBusy(key);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        window.location.assign(d.url);
        return;
      }
      setErr(d.error || "Не удалось создать платёж");
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(null);
    }
  }

  const starsBtn =
    "rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2 text-center text-footnote font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]";

  return (
    <div className="flex flex-col gap-8">
      {/* Balance */}
      <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 text-center">
        {unlimited ? (
          <p className="text-lead font-semibold text-[var(--color-text-primary)]">⭐ Полный доступ — токены не нужны</p>
        ) : (
          <>
            <div className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">Баланс</div>
            <div className="mt-1 text-[40px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">
              ◎ {loggedIn ? balance : 0}
            </div>
            <div className="text-callout text-[var(--color-text-secondary)]">{tokensWord(loggedIn ? balance : 0)}</div>
          </>
        )}
      </div>

      {/* What tokens unlock */}
      <div>
        <p className="mb-3 text-center text-callout text-[var(--color-text-secondary)]">
          Токены — внутренняя валюта inApp. Тратишь их на раскрытие контента:
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { l: "Приложение", c: UNLOCK_COST.app },
            { l: "Идея", c: UNLOCK_COST.idea },
            { l: "Категория", c: UNLOCK_COST.category },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-4 text-center">
              <div className="text-[22px] font-bold tabular-nums text-[var(--color-text-brand)]">{x.c}</div>
              <div className="mt-0.5 text-caption text-[var(--color-text-secondary)]">{x.l}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-caption text-[var(--color-text-tertiary)]">
          Категория открывает весь жанр: синтез + все приложения + все идеи. Разблокировка навсегда.
        </p>
      </div>

      {/* Packs + lifetime */}
      {!unlimited && (
        <div className="flex flex-col gap-3">
          <h2 className="text-center text-[20px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
            Пополнить токены
          </h2>
          {TOKEN_PACKS.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-lead font-bold tabular-nums text-[var(--color-text-primary)]">
                  ◎ {p.tokens}
                  {p.badge && (
                    <span className="rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-brand)]">
                      {p.badge}
                    </span>
                  )}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">{p.rub} ₽ · или {p.stars} ⭐</span>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {cardEnabled && (
                  <button
                    type="button"
                    onClick={() => buyCard({ pack: p.id }, p.id)}
                    disabled={busy === p.id}
                    className="rounded-full bg-[var(--color-button-primary-bg)] px-4 py-2 text-footnote font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {busy === p.id ? "…" : `${p.rub} ₽ картой`}
                  </button>
                )}
                {loggedIn ? (
                  <a href={packStars(p.id)} className={starsBtn}>
                    {p.stars} ⭐
                  </a>
                ) : (
                  <button type="button" onClick={() => setAuth(true)} className={starsBtn}>
                    {p.stars} ⭐
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Lifetime */}
          <div className="mt-2 flex flex-col gap-3 rounded-[var(--radius-xl)] border-2 border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_7%,transparent)] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-lead font-bold text-[var(--color-text-primary)]">
                ♾️ Lifetime
                <span className="rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-brand)]">
                  всё включено
                </span>
              </span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                {LIFETIME.rub.toLocaleString("ru-RU")} ₽ · или {LIFETIME.stars} ⭐
              </span>
            </div>
            <p className="text-footnote text-[var(--color-text-secondary)]">
              Все приложения, идеи и категории — навсегда. Без токенов и ограничений.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {cardEnabled && (
                <button
                  type="button"
                  onClick={() => buyCard({ kind: "lifetime" }, "life")}
                  disabled={busy === "life"}
                  className="flex-1 rounded-full bg-[var(--color-button-primary-bg)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy === "life" ? "…" : `${LIFETIME.rub.toLocaleString("ru-RU")} ₽ картой`}
                </button>
              )}
              {loggedIn ? (
                <a href={lifeStars} className={`${starsBtn} flex-1`}>
                  {LIFETIME.stars} ⭐
                </a>
              ) : (
                <button type="button" onClick={() => setAuth(true)} className={`${starsBtn} flex-1`}>
                  {LIFETIME.stars} ⭐
                </button>
              )}
            </div>
          </div>

          {err && <p className="text-center text-caption text-[#ff6b6b]">{err}</p>}
          {!cardEnabled && (
            <p className="text-center text-caption text-[var(--color-text-tertiary)]">
              Оплата картой скоро — пока доступны Telegram Stars.
            </p>
          )}
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
