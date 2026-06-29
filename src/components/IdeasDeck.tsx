"use client";

import { useState } from "react";
import { IdeaCards } from "./TestCards";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import type { Locale } from "@/lib/i18n";

type Card = { title: string; oneLiner: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string; reviewGrid?: { quote: string; rating: number; app: string }[]; icon: string };

// The /ideas deck: the same idea cards as the niche dossiers, with the
// progressive gate — first 6 free, sign in for more, then unlock the deck.
export default function IdeasDeck({
  ideas, total, gate, loggedIn, locale = "ru", deckPrice, starsHref, starsLabel, lifetimeStarsHref, lifetimePrice,
}: {
  ideas: Card[]; total: number; gate: "auth" | "paywall" | null; loggedIn: boolean; locale?: Locale;
  deckPrice: number; starsHref?: string; starsLabel?: string; lifetimeStarsHref?: string; lifetimePrice?: number;
}) {
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";

  return (
    <>
      <IdeaCards ideas={ideas} />

      {gate === "auth" && (
        <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center gap-3 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Войди и смотри все идеи" : "Sign in to see every idea"}</div>
          <p className="max-w-[44ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{ru ? `Это первые ${ideas.length}. За входом ждут ещё десятки идей под спрос по разным нишам. Вход бесплатный, пара секунд.` : `These are the first ${ideas.length}. Sign in for dozens more demand-backed ideas across niches. It is free and takes seconds.`}</p>
          <button type="button" onClick={() => setAuth(true)} className="mt-1 rounded-full bg-[var(--color-button-primary-bg)] px-7 py-3 text-[15px] font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">{ru ? "Войти" : "Sign in"}</button>
        </div>
      )}
      {gate === "paywall" && (
        <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center gap-4 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Открой весь сайт" : "Unlock the whole site"}</div>
          <p className="max-w-[44ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{ru ? `Это первые ${ideas.length}. Один платёж открывает все ${total} идей, разборы всех категорий и народный рейтинг. Навсегда.` : `These are the first ${ideas.length}. One payment unlocks all ${total} ideas, every category breakdown and the people's rating. Forever.`}</p>
          <BuyButton kind="deck" price={deckPrice} loggedIn={loggedIn} locale={locale} starsHref={starsHref} starsLabel={starsLabel} lifetimePrice={lifetimePrice} lifetimeStarsHref={lifetimeStarsHref} />
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
