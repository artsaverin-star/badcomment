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
function NavPill({ href, label, accent }: { href: string; label: string; accent: string }) {
  return (
    <Link
      href={href}
      style={{ ["--ec" as string]: accent }}
      className="edge-glow group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-[var(--color-border-subtle)] px-5 py-2.5 text-callout font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

// Compact tile — headline, small icon row, the hook, quiet stats.
function CardCompact({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, 4);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group flex h-full flex-col rounded-[22px] border border-[var(--color-border-subtle)] bg-[hsl(var(--atmo-h,28)_24%_12%_/_0.5)] p-6 transition-colors duration-200 hover:bg-[hsl(var(--atmo-h,28)_26%_16%_/_0.62)]"
    >
      <h3 className="text-headline text-[var(--color-text-primary)]">{c.name}</h3>
      {icons.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5">
          {icons.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-8 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
          ))}
        </div>
      )}
      {c.hook && <p className="mt-4 line-clamp-2 text-callout text-[var(--color-text-secondary)]">{firstSentence(c.hook)}</p>}
      <div className="mt-auto flex items-center justify-between pt-5">
        <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{metaLine(c, ru)}</p>
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
  // Ordered by how realistically a solo vibe-coder can ship it: pure single-player
  // software utilities at the top, then content/AI-heavier apps, then data-dependent
  // ones, and non-replicable marketplaces/infra (ride-hailing, streaming, crypto) at
  // the bottom — great for SEO but impossible to build solo.
  const ULTRA = ["meal-prep-grocery", "wardrobe-outfit", "car-maintenance", "ai-image-generation", "password-manager", "pet-care", "water-hydration", "wallpapers-widgets", "qr-scanner", "mind-mapping", "scanner-pdf", "ai-chatbot", "intermittent-fasting", "flashcards", "translator", "run-tracking", "voice-recorder", "resume-builder", "invoice-maker", "sobriety", "ai-writing", "journaling-mood", "focus-productivity", "habit-tracking", "notes-pkm", "sleep-tracking", "recipes-meal-planning", "plant-care", "baby-tracking", "workout-fitness", "calendars-tasks", "period-cycle", "nutrition-calories", "personal-finance", "meditation-mindfulness", "astrology", "photo-editing", "ai-avatars-headshots", "language-learning", "weather-apps", "travel-planning", "shopping-ecommerce", "food-delivery", "ride-hailing", "dating-apps", "messaging-apps", "music-streaming", "video-streaming", "crypto-investing"];
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
    "ride-hailing": "87 приложений: где машина приезжает вовремя и водителю честно платят, а где накрутка и сорванный заказ.",
    "weather-apps": "92 приложения: где прогноз сбывается и оповещение приходит вовремя, а где врёт радар и сыплет реклама.",
    "travel-planning": "90 приложений: где маршрут и брони не теряются и работают офлайн за границей, а где накрутка и сбои.",
    "sleep-tracking": "94 приложения: где трекинг сна точен и звуки убаюкивают, а где будильник врёт и сыплет реклама.",
    "focus-productivity": "72 приложения: где таймер работает в фоне и блокировка отвлечений держит, а где гимик и накрутка.",
    "journaling-mood": "95 приложений: где писать легко и видно динамику настроения, а где давит стрик и течёт приватность.",
    "workout-fitness": "91 приложение: где лог тренировки быстрый и прогрессия считается, а где накрутка и слетает история.",
    "recipes-meal-planning": "77 приложений: где рецепт сохраняется из сети и список покупок собирается сам, а где теряется коллекция.",
    "plant-care": "58 приложений: где полив напоминается умно и диагноз честный, а где накрутка и шаблонные советы.",
    "baby-tracking": "61 приложение: где лог кормления и сна жмётся одной рукой в 3 ночи и синхронится с партнёром, а где теряются данные.",
    "ai-writing": "87 приложений: где ИИ реально помогает писать, а где тонкая обёртка над ChatGPT с накруткой (36 из 87 накручены).",
  };
  const BLURB_EN: Record<string, string> = {
    astrology: "100 apps by real reviews: an honest score and a check on whose star is gamed.",
    "dating-apps": "100 apps: where the real people are, and where the bots and gamed stars are.",
    "ai-avatars-headshots": "100 apps: where the result really looks like you, and where it's gamed and the ads lie.",
    "meditation-mindfulness": "100 apps: where it truly calms with a warm voice, and where it's hollow.",
    "photo-editing": "100 apps: where the tools really work, and where they wreck photos and the ads lie.",
    "notes-pkm": "Notes apps: where a thought is written instantly and never lost, and where it lags.",
    "language-learning": "100 apps: where they really get you talking, and where it's just streaks and a game.",
    "period-cycle": "Cycle trackers: where the forecast is accurate and data is safe, and where it lies and sells your privacy.",
    "habit-tracking": "100 apps: where a check-in is instant and the reminder arrives, and where the streak shames you into quitting.",
    "personal-finance": "100 apps: where you really see and control spending, and where the sync keeps breaking.",
    "calendars-tasks": "100 apps: where the reminder arrives on time and nothing is lost, and where it stays silent.",
    "nutrition-calories": "95 apps: where calorie counting is honest and easy, and where the database lies and lags.",
    "crypto-investing": "93 apps: where the wallet and exchange are honest and reliable, and where it's gamed and funds get frozen.",
    "music-streaming": "94 apps: where the catalog, sound and playlists are honest and easy, and where it's gamed and music goes missing.",
    "video-streaming": "95 apps: where the catalog, player and sync are honest, and where it's gamed and geo-blocked.",
    "food-delivery": "94 apps: where the order arrives right and on time, and where it's gamed and support is broken.",
    "messaging-apps": "94 apps: where messages and calls arrive reliably and privately, and where it's gamed and texts vanish.",
    "shopping-ecommerce": "95 apps: where the item arrives as pictured and returns work, and where it's counterfeit and delivery is faked.",
    "ride-hailing": "87 apps: where the car arrives on time and drivers are paid fairly, and where it's gamed and the ride falls through.",
    "weather-apps": "92 apps: where the forecast comes true and the alert arrives on time, and where the radar lies and ads pour in.",
    "travel-planning": "90 apps: where the itinerary and bookings hold and work offline abroad, and where it's gamed and glitches.",
    "sleep-tracking": "94 apps: where sleep tracking is accurate and the sounds lull you, and where the alarm lies and ads pour in.",
    "focus-productivity": "72 apps: where the timer runs in the background and blocking holds, and where it's a gimmick and gamed.",
    "journaling-mood": "95 apps: where writing is easy and the mood trend is visible, and where the streak pushes and privacy leaks.",
    "workout-fitness": "91 apps: where the workout log is fast and progression counts, and where it's gamed and history is lost.",
    "recipes-meal-planning": "77 apps: where a recipe saves from the web and the shopping list builds itself, and where the collection gets lost.",
    "plant-care": "58 apps: where watering is reminded smartly and the diagnosis is honest, and where it's gamed and the advice is generic.",
    "baby-tracking": "61 apps: where the feeding and sleep log taps one-handed at 3am and syncs with your partner, and where data is lost.",
    "ai-writing": "87 apps: where AI really helps you write, and where it's a thin ChatGPT wrapper with gamed reviews (36 of 87 inflated).",
  };
  const HOOKS = ru ? BLURB : BLURB_EN;
  const ranked = ULTRA
    .map((s) => { const c = catCards.find((x) => x.slug === s); return c ? { ...c, hook: HOOKS[s] ?? c.hook } : null; })
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
            <h1 className="glow-sweep ld-fade text-display text-[var(--color-text-primary)] text-balance" style={{ animationDelay: "0.05s" }}>
              {ru ? "Знай, что построить" : "Know what to build"}
            </h1>

            <p className="ld-fade mx-auto mt-3.5 max-w-[48ch] text-lead text-[var(--color-text-secondary)] sm:mt-4" style={{ animationDelay: "0.1s" }}>
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
        <NavPill href="/ideas" label={ru ? "Все идеи" : "All ideas"} accent="#c026d3" />
        <NavPill href="/rating" label={ru ? "Народный рейтинг" : "People's rating"} accent="#10b981" />
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
