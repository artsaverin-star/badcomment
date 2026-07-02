"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

// Minimal sign-in wall for the niche dossier. The market overview and audience
// are shown above it for free; the honest rating, the review breakdown and the
// ideas live behind a free login.
export default function DossierGate({ ideasCount, locale = "ru" }: { ideasCount: number; locale?: Locale }) {
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";
  const items = ru
    ? ["Честный рейтинг 100 приложений по отзывам", "Выводы по реальным отзывам с цитатами", `${ideasCount} готовых идей под спрос`]
    : ["Honest rating of 100 apps by reviews", "Findings from real reviews with quotes", `${ideasCount} ready ideas backed by demand`];

  return (
    <section className="mt-24">
      <div className="card-min rounded-[28px] px-6 py-14 text-center sm:px-12 sm:py-20">
        <h2 className="text-title1 text-[var(--color-text-primary)]">
          {ru ? "Открыть весь разбор" : "Open the full breakdown"}
        </h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Рынок и аудиторию ты уже видишь. За бесплатным входом — честный рейтинг, выводы по отзывам и готовые идеи под спрос."
            : "You already see the market and audience. A free sign-in opens the honest rating, the review findings and ready ideas."}
        </p>

        <div className="mx-auto mt-9 flex max-w-[420px] flex-col gap-2.5 text-left">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[14px] bg-[var(--color-bg-muted)] px-4 py-3 text-callout text-[var(--color-text-secondary)]">
              <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[#30d158]"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.8 9.2l2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {it}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAuth(true)}
          className="mt-9 rounded-full bg-[var(--color-text-primary)] px-8 py-3.5 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90"
        >
          {ru ? "Войти и открыть" : "Sign in to open"}
        </button>
        <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Бесплатно, по почте или Telegram" : "Free, by email or Telegram"}</p>
      </div>
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </section>
  );
}
