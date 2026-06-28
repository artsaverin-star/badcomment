"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
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

// Small colourful section pill (All ideas / People's rating).
function NavPill({ href, label, gradient }: { href: string; label: string; gradient: string }) {
  return (
    <Link
      href={href}
      style={{ backgroundImage: gradient }}
      className="group inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
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


// Marketing landing: animated hero, then a switchable gallery of category
// breakdowns — an Apple-store-style bento (richer niches featured larger) or a
// compact list.
export default function Landing({
  catCards = [],
  locale = "ru",
  totalReviews = 0,
}: {
  catCards?: CatCard[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
  feed?: LandingFeed;
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);

  // Order comes from the server (page.tsx pins the hand-curated premium niches to
  // the front); keep it so the gallery leads with the best breakdowns, not just
  // the highest observation counts. Featured = the first four (top premium).
  // Homepage leads with the niches that have a full dossier (people's rating +
  // breakdown + ideas). Order pinned; rolled out one niche at a time.
  const ULTRA = ["astrology", "dating-apps", "ai-avatars-headshots", "meditation-mindfulness", "photo-editing", "notes-pkm", "language-learning", "period-cycle", "habit-tracking", "personal-finance", "calendars-tasks", "nutrition-calories", "crypto-investing", "music-streaming", "video-streaming", "food-delivery", "messaging-apps", "shopping-ecommerce"];
  const BLURB: Record<string, string> = {
    astrology: "100 приложений по реальным отзывам: честная оценка и проверка на накрутку звезды.",
    "dating-apps": "100 приложений: где реальные люди, а где боты и накрученные звёзды.",
    "ai-avatars-headshots": "100 приложений: где результат правда похож на тебя, а где накрутка и обман в рекламе.",
    "meditation-mindfulness": "100 приложений: где правда успокаивает и тёплый голос, а где пустышка.",
    "photo-editing": "100 приложений: где инструменты реально работают, а где портят фото и обманка в рекламе.",
    "notes-pkm": "Приложения для заметок: где мысль пишется мгновенно и не теряется, а где тормозит.",
    "language-learning": "100 приложений: где правда доводят до речи, а где только стрики и игра.",
    "period-cycle": "Трекеры цикла: где прогноз точен и данные в безопасности, а где врёт и торгует приватностью.",
    "habit-tracking": "100 приложений: где отметка мгновенна и напоминание приходит, а где стрик стыдит и бросаешь.",
    "personal-finance": "100 приложений: где правда видишь и держишь траты под контролем, а где рвётся синхронизация.",
    "calendars-tasks": "100 приложений: где напоминание приходит вовремя и ничего не теряется, а где молчит.",
    "nutrition-calories": "95 приложений: где подсчёт калорий честный и удобный, а где база врёт и тормозит.",
    "crypto-investing": "93 приложения: где кошелёк и биржа честны и надёжны, а где накрутка и заморозка средств.",
    "music-streaming": "94 приложения: где каталог, звук и плейлисты честны и удобны, а где накрутка и потеря музыки.",
    "video-streaming": "95 приложений: где каталог, плеер и синхронизация честны, а где накрутка и геоблок.",
    "food-delivery": "94 приложения: где заказ приходит точно и вовремя, а где накрутка и сломанная поддержка.",
    "messaging-apps": "94 приложения: где сообщения и звонки доходят надёжно и приватно, а где накрутка и пропавшие СМС.",
    "shopping-ecommerce": "95 приложений: где товар приходит как на фото и возврат работает, а где контрафакт и фиктивная доставка.",
  };
  const ranked = ULTRA
    .map((s) => { const c = catCards.find((x) => x.slug === s); return c ? { ...c, hook: BLURB[s] ?? c.hook } : null; })
    .filter((c): c is CatCard => !!c);

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
              {ru ? "Знай, что построить" : "Know what to build"}
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

      {/* Small section pills, then every niche with a full dossier. */}
      <div className="mx-auto mt-7 flex w-full max-w-5xl flex-wrap justify-center gap-2.5 px-4">
        <NavPill href="/ideas" label={ru ? "Все идеи" : "All ideas"} gradient="linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)" />
        <NavPill href="/rating" label={ru ? "Народный рейтинг" : "People's rating"} gradient="linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)" />
      </div>
      <div className="mx-auto mt-7 w-full max-w-5xl px-4 sm:mt-9">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((c) => (
            <CardCompact key={c.slug} c={c} ru={ru} />
          ))}
        </div>
      </div>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
