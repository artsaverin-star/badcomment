"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import { FRIEND_PRICE_RUB, LIFETIME, LAUNCH_PROMO } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// The builder's paywall. The pains stay readable for everyone — walking the
// wizard to the plan is the paid payload. The ladder: one showcase idea with
// no account, four hand-picked ideas after a free sign-in, everything with
// the single lifetime purchase.
export default function BuildGate({
  loggedIn,
  demoHref,
  demoTitle,
  locale = "ru",
}: {
  loggedIn: boolean;
  demoHref: string;
  demoTitle: string;
  locale?: Locale;
}) {
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";
  const life = LAUNCH_PROMO ? FRIEND_PRICE_RUB : LIFETIME.rub;

  const items = loggedIn
    ? (ru
      ? ["Четыре бесплатные идеи уже открыты, ищи метку «открыто» в списках болей", `Весь сайт навсегда за ${life} ₽ открывает сборку по любой боли, разборы и рейтинг`]
      : ["Your four free ideas are already open, look for the green badge in the pain lists", `The whole site forever for ${life} ₽ opens the build for any pain, plus the breakdowns and the rating`])
    : (ru
      ? ["Один пример открыт без входа, попробуй сборку от боли до плана", "Бесплатный вход открывает четыре отобранные идеи целиком", `Весь сайт навсегда за ${life} ₽: любые боли, планы, разборы и рейтинг`]
      : ["One example is open with no account, try the build from pain to plan", "A free sign-in opens four hand-picked ideas in full", `The whole site forever for ${life} ₽: every pain, plan, breakdown and rating`]);

  return (
    <section className="card-min rounded-[28px] px-6 py-12 text-center sm:px-12 sm:py-16">
      <h2 className="text-title1 text-[var(--color-text-primary)]">
        {ru ? "Дальше план сборки" : "Next: the build plan"}
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] text-lead text-pretty text-[var(--color-text-secondary)]">
        {ru
          ? "Боли выше видят все. Конструктор ведёт выбранную боль до готового плана: решение, аудитория, конкуренты, имя, ASO и промты для дизайна и кода."
          : "The pains above are public. The builder walks your pick all the way to the plan: solution, audience, competitors, name, ASO and the design and code prompts."}
      </p>

      <div className="mx-auto mt-8 flex max-w-[440px] flex-col gap-2.5 text-left">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[14px] bg-[var(--color-bg-muted)] px-4 py-3 text-callout text-[var(--color-text-secondary)]">
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[#30d158]"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.8 9.2l2.1 2.1 4.3-4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {it}
          </div>
        ))}
      </div>

      {loggedIn ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <BuyButton loggedIn locale={locale} />
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setAuth(true)}
            className="rounded-full bg-[var(--color-text-primary)] px-8 py-3.5 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90"
          >
            {ru ? "Войти и открыть четыре идеи" : "Sign in, open four ideas"}
          </button>
          <p className="text-footnote text-[var(--color-text-tertiary)]">
            {ru ? "Бесплатно, по почте или Telegram. Купить весь сайт можно сразу после входа." : "Free, by email or Telegram. You can buy the whole site right after signing in."}
          </p>
          <Link href={demoHref} className="text-footnote font-semibold text-[var(--color-text-secondary)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-text-primary)]">
            {ru ? `Или попробуй пример без входа: «${demoTitle}»` : `Or try the open example first: “${demoTitle}”`}
          </Link>
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </section>
  );
}
