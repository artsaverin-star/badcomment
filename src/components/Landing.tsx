"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import IdeaFeed from "./IdeaFeed";
import type { Locale } from "@/lib/i18n";
import type { FeedIdea } from "@/lib/ideaFeed";

export type LandingFeed = {
  items: FeedIdea[];
  hasAccess: boolean;
  loggedIn: boolean;
  deckPrice: number;
  starsHref?: string;
  starsLabel?: string;
  lifetimeStarsHref?: string;
  lifetimePrice?: number;
};

export type CatCard = {
  slug: string;
  name: string;
  icons: string[];
  apps: number;
  reviews: number;
  observations: number;
  ideas: number;
  hook: string;
  blurb: string;
};
function appsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "приложений";
  if (d === 1) return "приложение";
  if (d >= 2 && d <= 4) return "приложения";
  return "приложений";
}
function obsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}
function ideasWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "идей";
  if (d === 1) return "идея";
  if (d >= 2 && d <= 4) return "идеи";
  return "идей";
}

const Arrow = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={`text-[var(--color-text-brand)] transition-transform duration-300 group-hover:translate-x-1 ${className}`}>
    <path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function metaLine(c: CatCard, ru: boolean): string {
  return ru
    ? `${c.observations} ${obsWord(c.observations)}${c.ideas > 0 ? ` · ${c.ideas} ${ideasWord(c.ideas)}` : ""}`
    : `${c.observations} observations${c.ideas > 0 ? ` · ${c.ideas} ideas` : ""}`;
}

// The sharpest, complete first sentence of a governing thought — the homepage
// cards lead with the hook, not a wall of text.
function firstSentence(t?: string) {
  if (!t) return "";
  const m = t.match(/^.*?[.!?…](\s|$)/);
  return (m ? m[0] : t).trim();
}

// Big "hero" tile (Apple-store featured) — bold headline, icon row, the hook
// (one sentence), stats and CTA.
function CardLarge({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, 6);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group flex h-full transform-gpu flex-col rounded-[26px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[0_22px_50px_-22px_rgba(0,0,0,0.28)] sm:p-9"
    >
      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-brand)]">{ru ? "Разбор ниши" : "Niche breakdown"}</p>
      <h3 className="mt-2 text-[26px] font-black leading-[1.04] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[38px]">{c.name}</h3>
      {icons.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {icons.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-11 rounded-[13px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
          ))}
        </div>
      )}
      {c.hook && <p className="mt-6 text-[17px] font-light leading-[1.5] text-[var(--color-text-primary)] sm:text-[19px]">{firstSentence(c.hook)}</p>}
      <div className="mt-auto pt-7">
        <p className="text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{metaLine(c, ru)}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-text-primary)]">
          {ru ? "Смотреть разбор" : "See the breakdown"}
          <Arrow />
        </span>
      </div>
    </Link>
  );
}

// Compact tile — headline, small icon row, the hook, quiet stats.
function CardCompact({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, 4);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group flex h-full transform-gpu flex-col rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
    >
      <h3 className="text-[21px] font-black leading-[1.06] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[23px]">{c.name}</h3>
      {icons.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5">
          {icons.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-8 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
          ))}
        </div>
      )}
      {c.hook && <p className="mt-4 line-clamp-2 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{firstSentence(c.hook)}</p>}
      <div className="mt-auto flex items-center justify-between pt-5">
        <p className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{metaLine(c, ru)}</p>
        <Arrow className="shrink-0" />
      </div>
    </Link>
  );
}

// One row in list view.
function ListRow({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, 4);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3.5 transition-colors hover:border-[var(--color-border-strong)] sm:gap-5 sm:px-5"
    >
      <div className="hidden shrink-0 items-center -space-x-2 sm:flex">
        {icons.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-9 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)] ring-offset-1 ring-offset-[var(--color-surface-page)]" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-black leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[18px]">{c.name}</h3>
        {c.hook && <p className="mt-1 line-clamp-1 text-[13px] leading-snug text-[var(--color-text-tertiary)]">{c.hook}</p>}
      </div>
      <p className="hidden shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)] md:block">{metaLine(c, ru)}</p>
      <Arrow className="shrink-0" />
    </Link>
  );
}

// Marketing landing: animated hero, then a switchable gallery of category
// breakdowns — an Apple-store-style bento (richer niches featured larger) or a
// compact list.
export default function Landing({
  catCards = [],
  locale = "ru",
  totalReviews = 0,
  feed,
}: {
  catCards?: CatCard[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
  feed?: LandingFeed;
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);
  const [view, setView] = useState<"cards" | "list">("cards");

  useEffect(() => {
    const saved = localStorage.getItem("home-view");
    if (saved !== "cards" && saved !== "list") return;
    const id = requestAnimationFrame(() => setView(saved));
    return () => cancelAnimationFrame(id);
  }, []);
  const setViewPersist = (v: "cards" | "list") => {
    setView(v);
    try { localStorage.setItem("home-view", v); } catch { /* ignore */ }
  };

  // Order comes from the server (page.tsx pins the hand-curated premium niches to
  // the front); keep it so the gallery leads with the best breakdowns, not just
  // the highest observation counts. Featured = the first four (top premium).
  const ranked = catCards;
  const FEATURED = 4;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-x-clip px-2 pb-3 pt-12 sm:px-4 sm:pb-4 sm:pt-7">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="glow-sweep ld-fade text-[clamp(27px,7.4vw,40px)] font-black leading-[1.04] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[60px]" style={{ animationDelay: "0.05s" }}>
              {ru ? (
                <>Проанализировали<br /><span className="tabular-nums">{totalReviews > 0 ? totalReviews.toLocaleString("ru-RU") : "сотни тысяч"}</span> отзывов</>
              ) : (
                <>We analyzed <span className="tabular-nums">{totalReviews > 0 ? totalReviews.toLocaleString("en-US") : "hundreds of thousands of"}</span><br />app reviews</>
              )}
            </h1>

            <p className="ld-fade mx-auto mt-4 max-w-xl text-lead text-[var(--color-text-secondary)]" style={{ animationDelay: "0.1s" }}>
              {ru
                ? "Отзывы из App Store и Google Play — разложили по нишам, выводам и конкретным идеям: какие приложения людям реально нужны."
                : "Reviews from the App Store and Google Play — broken down by niche, conclusions and concrete ideas: which apps people actually need."}
            </p>
          </div>
        </section>

      {/* The idea feed, embedded right here — swipe the validated ideas inline. */}
      {feed && feed.items.length > 0 && (
        <section className="mx-auto mt-1 w-full max-w-3xl px-2 sm:mt-2 sm:px-4">
          <IdeaFeed
            items={feed.items}
            dailySlug={null}
            hasAccess={feed.hasAccess}
            locale={locale}
            loggedIn={feed.loggedIn}
            deckPrice={feed.deckPrice}
            starsHref={feed.starsHref}
            starsLabel={feed.starsLabel}
            lifetimeStarsHref={feed.lifetimeStarsHref}
            lifetimePrice={feed.lifetimePrice}
            compact
            intro={{
              title: ru ? "Идеи, которые уже просят" : "Ideas people already want",
              sub: ru ? "Листай ленту — каждая идея из реальных отзывов." : "Flip through the feed — every idea from real reviews.",
            }}
          />
        </section>
      )}

      {/* Gallery — the third block: category breakdowns */}
      {catCards.length > 0 && (
        <div className="mx-auto w-full max-w-5xl px-2 sm:px-4">
          <div className="mb-3 mt-10 text-center">
            <h2 className="text-[clamp(24px,6vw,34px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)]">{ru ? "Разбор категорий" : "Niche breakdowns"}</h2>
          </div>
          {/* view toggle */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] p-1.5 backdrop-blur-xl">
              {(["cards", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewPersist(v)}
                  aria-pressed={view === v}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-colors ${view === v ? "bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
                >
                  {v === "cards" ? (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="9" y="9" width="5.5" height="5.5" rx="1.4" fill="currentColor" /></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="2" rx="1" fill="currentColor" /><rect x="1.5" y="7" width="13" height="2" rx="1" fill="currentColor" /><rect x="1.5" y="11.5" width="13" height="2" rx="1" fill="currentColor" /></svg>
                  )}
                  <span>{v === "cards" ? (ru ? "Карточками" : "Cards") : (ru ? "Списком" : "List")}</span>
                </button>
              ))}
            </div>
          </div>

          {view === "cards" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {ranked.map((c, i) =>
                i < FEATURED ? (
                  <div key={c.slug} className="lg:col-span-3"><CardLarge c={c} ru={ru} /></div>
                ) : (
                  <div key={c.slug} className="lg:col-span-2"><CardCompact c={c} ru={ru} /></div>
                )
              )}
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
              {ranked.map((c) => <ListRow key={c.slug} c={c} ru={ru} />)}
            </div>
          )}
        </div>
      )}

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
