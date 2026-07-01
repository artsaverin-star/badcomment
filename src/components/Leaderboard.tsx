"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import type { Locale } from "@/lib/i18n";

export type Row = {
  title: string; oneLiner: string; category: string; categoryName: string;
  money: number; simplicity: number; demand: number; composite: number;
  whyPay: string; pricePoint: string;
};

const COLORS = { money: "#30d158", simplicity: "#0a84ff", demand: "#ff9f0a" };

function Bars({ money, simplicity, demand, ru }: { money: number; simplicity: number; demand: number; ru: boolean }) {
  const rows: [string, number, string][] = [
    [ru ? "Деньги" : "Money", money, COLORS.money],
    [ru ? "Простота" : "Simplicity", simplicity, COLORS.simplicity],
    [ru ? "Спрос" : "Demand", demand, COLORS.demand],
  ];
  return (
    <div className="flex w-full flex-col gap-1 sm:w-[190px]">
      {rows.map(([label, v, c]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-[58px] shrink-0 text-[11px] text-[var(--color-text-tertiary)]">{label}</span>
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v}%`, background: c }} />
          </span>
          <span className="w-[20px] shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function Leaderboard({
  rows, total, gate, loggedIn, locale = "ru", deckPrice, starsHref, starsLabel, lifetimeStarsHref, lifetimePrice,
}: {
  rows: Row[]; total: number; gate: "auth" | "paywall" | null; loggedIn: boolean; locale?: Locale;
  deckPrice: number; starsHref?: string; starsLabel?: string; lifetimeStarsHref?: string; lifetimePrice?: number;
}) {
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";

  return (
    <>
      <ol className="flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
        {rows.map((r, i) => (
          <li key={i}>
            <a href={`/${lp}/segment/${r.category}`} className="group flex flex-col gap-3 py-5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:flex-row sm:items-center sm:gap-5">
              <div className="flex items-start gap-3.5 sm:flex-1">
                <span className="mt-0.5 w-6 shrink-0 text-right text-subhead font-semibold tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent-brand)_16%,transparent)] px-2 py-0.5 text-[12px] font-semibold text-[var(--color-text-primary)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-6M3 20h18" /></svg>{r.composite}
                    </span>
                    <span className="truncate text-[12px] text-[var(--color-text-tertiary)]">{r.categoryName}</span>
                    {r.pricePoint && <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]">{r.pricePoint}</span>}
                  </div>
                  <h3 className="mt-1.5 text-headline text-[var(--color-text-primary)]">{r.title}</h3>
                  {r.whyPay && <p className="mt-1 text-callout text-[var(--color-text-secondary)]">{r.whyPay}</p>}
                </div>
              </div>
              <Bars money={r.money} simplicity={r.simplicity} demand={r.demand} ru={ru} />
            </a>
          </li>
        ))}
      </ol>

      {gate === "auth" && (
        <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center gap-3 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center">
          <div className="text-subhead text-[var(--color-text-primary)]">{ru ? "Войди и смотри весь рейтинг идей" : "Sign in to see the full idea ranking"}</div>
          <p className="max-w-[44ch] text-callout text-[var(--color-text-secondary)]">{ru ? `Это топ-${rows.length}. За входом ещё ${total - rows.length} идей, отранжированных по деньгам и простоте. Вход бесплатный.` : `This is the top ${rows.length}. Sign in for ${total - rows.length} more ideas ranked by money and simplicity. Free.`}</p>
          <button type="button" onClick={() => setAuth(true)} className="mt-1 rounded-full bg-[var(--color-button-primary-bg)] px-7 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">{ru ? "Войти" : "Sign in"}</button>
        </div>
      )}
      {gate === "paywall" && (
        <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center gap-4 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center">
          <div className="text-subhead text-[var(--color-text-primary)]">{ru ? "Открой весь рейтинг идей" : "Unlock the full ranking"}</div>
          <p className="max-w-[44ch] text-callout text-[var(--color-text-secondary)]">{ru ? `Это топ-${rows.length}. Один платёж открывает все ${total} идей с оценками, разборы и рейтинг. Навсегда.` : `This is the top ${rows.length}. One payment unlocks all ${total} scored ideas, breakdowns and the rating. Forever.`}</p>
          <BuyButton kind="deck" price={deckPrice} loggedIn={loggedIn} locale={locale} starsHref={starsHref} starsLabel={starsLabel} lifetimePrice={lifetimePrice} lifetimeStarsHref={lifetimeStarsHref} />
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
