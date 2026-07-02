"use client";

import { useState } from "react";
import { IdeaCards } from "./TestCards";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import type { Locale } from "@/lib/i18n";

type Score = { money: number; simplicity: number; demand: number; composite: number; whyPay?: string; pricePoint?: string };
type Card = { title: string; oneLiner: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string; reviewGrid?: { quote: string; rating: number; app: string }[]; icon: string; score?: Score; category?: string; categorySlug?: string };

// The idea deck with a premium gate: free cards, then a blurred peek of what is
// behind the gate with a centred lock + unlock action on top.
export default function IdeasDeck({
  ideas, lockedPreview = [], total, gate, loggedIn, locale = "ru", deckPrice, starsHref, starsLabel, lifetimeStarsHref, lifetimePrice,
}: {
  ideas: Card[]; lockedPreview?: Card[]; total: number; gate: "auth" | "paywall" | null; loggedIn: boolean; locale?: Locale;
  deckPrice: number; starsHref?: string; starsLabel?: string; lifetimeStarsHref?: string; lifetimePrice?: number;
}) {
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";

  return (
    <>
      <IdeaCards ideas={ideas} />

      {gate && (
        <div id="idea-gate" className="relative mt-4 scroll-mt-24">
          {lockedPreview.length > 0 && (
            <div className="pointer-events-none select-none blur-[6px] [mask-image:linear-gradient(to_bottom,black_0%,black_25%,transparent_85%)]" aria-hidden="true">
              <IdeaCards ideas={lockedPreview} locked locale={locale} />
            </div>
          )}

          <div className={`${lockedPreview.length > 0 ? "absolute inset-x-0 top-[8%]" : "relative"} flex justify-center px-4`}>
            <div className="flex w-full max-w-[520px] flex-col items-center gap-4 rounded-[24px] border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_88%,transparent)] p-8 text-center shadow-[0_24px_64px_-24px_rgba(18,18,22,0.28)] backdrop-blur-xl">
              <span className="flex size-12 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </span>
              {gate === "auth" ? (
                <>
                  <div className="text-title3 font-semibold text-[var(--color-text-primary)]">{ru ? "Войди и смотри все идеи" : "Sign in to see every idea"}</div>
                  <p className="max-w-[42ch] text-callout text-[var(--color-text-secondary)]">{ru ? `Это первые ${ideas.length} из ${total}. За входом ещё десятки идей под спрос по всем нишам. Вход бесплатный, пара секунд.` : `These are the first ${ideas.length} of ${total}. Sign in for dozens more demand-backed ideas across every niche. Free, takes seconds.`}</p>
                  <button type="button" onClick={() => setAuth(true)} className="mt-1 rounded-full bg-[var(--color-button-primary-bg)] px-8 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">{ru ? "Войти" : "Sign in"}</button>
                </>
              ) : (
                <>
                  <div className="text-title3 font-semibold text-[var(--color-text-primary)]">{ru ? "Открой весь сайт" : "Unlock the whole site"}</div>
                  <p className="max-w-[42ch] text-callout text-[var(--color-text-secondary)]">{ru ? `Это первые ${ideas.length} из ${total}. Один платёж открывает все идеи, разборы всех категорий и народный рейтинг. Навсегда.` : `These are the first ${ideas.length} of ${total}. One payment unlocks every idea, all category breakdowns and the people's rating. Forever.`}</p>
                  <BuyButton kind="deck" price={deckPrice} loggedIn={loggedIn} locale={locale} starsHref={starsHref} starsLabel={starsLabel} lifetimePrice={lifetimePrice} lifetimeStarsHref={lifetimeStarsHref} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
