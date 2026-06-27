"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import IdeaGrid from "./IdeaGrid";
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
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={`text-[var(--color-text-tertiary)] transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-text-primary)] ${className}`}>
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
      className="group flex h-full flex-col rounded-[26px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5%,var(--color-surface-card))] sm:p-9"
    >
      <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--color-text-brand)]">{ru ? "Разбор ниши" : "Niche breakdown"}</p>
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
      <div className="mt-auto flex items-center justify-between pt-7">
        <p className="text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{metaLine(c, ru)}</p>
        <Arrow className="shrink-0" />
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
      className="group flex h-full flex-col rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5%,var(--color-surface-card))]"
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

// People's-rating tab — live categories plus muted "soon" tiles.
function RatingsGrid({ ru, lp }: { ru: boolean; lp: string }) {
  const live = [
    { slug: "astrology", name: ru ? "Астрология" : "Astrology", blurb: ru ? "100 приложений по реальным отзывам: честная оценка и проверка на накрутку звезды." : "100 apps by real reviews: an honest score and a rating-authenticity check." },
    { slug: "dating-apps", name: ru ? "Знакомства" : "Dating", blurb: ru ? "100 приложений: где реальные люди, а где боты и накрученные звёзды." : "100 apps: where the real people are, and where the bots and gamed stars are." },
    { slug: "ai-avatars-headshots", name: ru ? "ИИ-фото" : "AI photo", blurb: ru ? "100 приложений: где результат правда похож на тебя, а где накрутка и обман в рекламе." : "100 apps: where the result really looks like you, and where the gamed stars and bait ads are." },
    { slug: "meditation-mindfulness", name: ru ? "Медитация" : "Meditation", blurb: ru ? "100 приложений: где правда успокаивает и тёплый голос, а где пустышка." : "100 apps: which truly calm you with a warm guide, and which are hollow." },
    { slug: "photo-editing", name: ru ? "Фоторедакторы" : "Photo editors", blurb: ru ? "100 приложений: где инструменты реально работают, а где портят фото и обманка в рекламе." : "100 apps: where the tools really work, and where they ruin the photo with bait ads." },
    { slug: "notes-pkm", name: ru ? "Заметки" : "Notes", blurb: ru ? "Приложения для заметок: где мысль пишется мгновенно и не теряется, а где тормозит." : "Notes apps: where a thought is captured instantly and never lost, and where it lags." },
  ];
  const soon = ru
    ? ["Игры", "VPN", "Погода", "Криптокошельки"]
    : ["Games", "VPN", "Weather", "Crypto wallets"];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {live.map((c) => (
        <a
          key={c.slug}
          href={`/${lp}/rating/${c.slug}`}
          className="group flex min-h-[148px] flex-col justify-between rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
        >
          <div>
            <p className="text-[12px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</p>
            <h3 className="mt-1.5 text-[23px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">{c.name}</h3>
          </div>
          <p className="text-[13.5px] leading-[1.45] text-[var(--color-text-secondary)]">{c.blurb}</p>
        </a>
      ))}
      {soon.map((name) => (
        <div
          key={name}
          className="flex min-h-[148px] flex-col justify-between rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 opacity-55 grayscale"
          aria-disabled="true"
        >
          <h3 className="text-[23px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">{name}</h3>
          <span className="text-[12px] font-semibold tracking-[0.04em] text-[var(--color-text-tertiary)]">{ru ? "Скоро" : "Soon"}</span>
        </div>
      ))}
    </div>
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
  const [view, setView] = useState<"ideas" | "categories" | "ratings">("ideas");

  useEffect(() => {
    const saved = localStorage.getItem("home-tab");
    if (saved !== "ideas" && saved !== "categories" && saved !== "ratings") return;
    const id = requestAnimationFrame(() => setView(saved));
    return () => cancelAnimationFrame(id);
  }, []);
  const setViewPersist = (v: "ideas" | "categories" | "ratings") => {
    setView(v);
    try { localStorage.setItem("home-tab", v); } catch { /* ignore */ }
  };

  // Order comes from the server (page.tsx pins the hand-curated premium niches to
  // the front); keep it so the gallery leads with the best breakdowns, not just
  // the highest observation counts. Featured = the first four (top premium).
  const ranked = catCards;
  const FEATURED = 4;

  // Hero salute — app icons flattened from the category cards, shuffled per load,
  // floated in the left/right margins behind the headline (never over the text).
  const [icons, setIcons] = useState<string[]>(catCards.flatMap((c) => c.icons).filter(Boolean));
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const arr = catCards.flatMap((c) => c.icons).filter(Boolean);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      setIcons(arr);
    });
    return () => cancelAnimationFrame(id);
  }, [catCards]);
  const positions = [
    "left-[2%] top-[6%]", "right-[3%] top-[10%]", "left-[7%] top-[34%]", "right-[8%] top-[30%]",
    "left-[1%] top-[62%]", "right-[2%] top-[58%]", "left-[13%] top-[16%]", "right-[14%] top-[48%]",
    "left-[9%] top-[80%]", "right-[10%] top-[78%]",
  ];
  const sizes = ["size-10 sm:size-12 lg:size-14", "size-9 sm:size-11 lg:size-12", "size-11 sm:size-14 lg:size-16"];
  const floats = icons.slice(0, positions.length);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-x-clip pb-3 pt-12 sm:pb-4 sm:pt-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
            {floats.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className={`ld-float absolute rounded-[14px] opacity-60 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85)] sm:opacity-70 ${sizes[i % sizes.length]} ${positions[i]} ${i >= 4 ? "hidden sm:block" : "block"}`}
                style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${i % 2 ? 7 : -7}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
              />
            ))}
          </div>
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h1 className="glow-sweep ld-fade text-[clamp(30px,7.6vw,44px)] font-black leading-[1.05] tracking-[-0.03em] text-[var(--color-text-primary)] text-balance sm:text-[56px]" style={{ animationDelay: "0.05s" }}>
              {ru ? "Знай, что поставить и что построить" : "Know what to install and what to build"}
            </h1>

            <p className="ld-fade mx-auto mt-3.5 max-w-[48ch] text-[15px] leading-[1.45] text-[var(--color-text-secondary)] sm:mt-4 sm:text-[19px] sm:leading-[1.5]" style={{ animationDelay: "0.1s" }}>
              {ru ? (
                <>Народный рейтинг приложений, разбор категорий и&nbsp;готовые идеи под&nbsp;реальный спрос из&nbsp;<span className="tabular-nums">{totalReviews > 0 ? totalReviews.toLocaleString("ru-RU") : "сотен тысяч"}</span> отзывов в&nbsp;App&nbsp;Store и&nbsp;Google&nbsp;Play.</>
              ) : (
                <>A people&rsquo;s app rating, category breakdowns and ready ideas backed by real demand, from <span className="tabular-nums">{totalReviews > 0 ? totalReviews.toLocaleString("en-US") : "hundreds of thousands of"}</span> App&nbsp;Store and Google&nbsp;Play reviews.</>
              )}
            </p>
          </div>
        </section>

      {/* Tabs — all ideas (cards) or all current categories (tiles). */}
      <div className="mx-auto mt-7 w-full max-w-5xl sm:mt-9">
        <div className="mb-7 flex justify-center sm:mb-8">
          <div className="flex w-full max-w-[480px] items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] p-1.5 backdrop-blur-xl">
            {(["ideas", "categories", "ratings"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewPersist(v)}
                aria-pressed={view === v}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2.5 text-[13px] font-semibold transition-colors sm:text-[14px] ${view === v ? "bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
              >
                {v === "ideas" ? (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.5 2A2.5 2.5 0 0 0 3 4.5v7A2.5 2.5 0 0 0 5.5 14h5A2.5 2.5 0 0 0 13 11.5v-7A2.5 2.5 0 0 0 10.5 2h-5Zm.5 3.5h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Zm0 3h2.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Z" /></svg>
                ) : v === "categories" ? (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.4" fill="currentColor" /><rect x="9" y="9" width="5.5" height="5.5" rx="1.4" fill="currentColor" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 9.5A.75.75 0 0 1 2.75 8.75H4.5a.75.75 0 0 1 .75.75V13a.75.75 0 0 1-.75.75H2.75A.75.75 0 0 1 2 13V9.5Zm5-4A.75.75 0 0 1 7.75 4.75H9.5a.75.75 0 0 1 .75.75V13a.75.75 0 0 1-.75.75H7.75A.75.75 0 0 1 7 13V5.5Zm5-3a.75.75 0 0 1 .75-.75h1.75a.75.75 0 0 1 .75.75V13a.75.75 0 0 1-.75.75h-1.75A.75.75 0 0 1 12 13V2.5Z" /></svg>
                )}
                <span>{v === "ideas" ? (ru ? "Идеи" : "Ideas") : v === "categories" ? (ru ? "Разбор категорий" : "Breakdowns") : (ru ? "Рейтинг" : "Ratings")}</span>
              </button>
            ))}
          </div>
        </div>

        {view === "ideas" ? (
          <IdeaGrid
            items={feed?.items ?? []}
            hasAccess={feed?.hasAccess ?? false}
            loggedIn={feed?.loggedIn ?? false}
            locale={locale}
            deckPrice={feed?.deckPrice ?? 0}
            starsHref={feed?.starsHref}
            starsLabel={feed?.starsLabel}
            lifetimeStarsHref={feed?.lifetimeStarsHref}
            lifetimePrice={feed?.lifetimePrice}
          />
        ) : view === "categories" ? (
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
          <RatingsGrid ru={ru} lp={ru ? "ru" : "en"} />
        )}
      </div>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
