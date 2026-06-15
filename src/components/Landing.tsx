"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import Reveal from "./Reveal";
import type { Locale } from "@/lib/i18n";

export type LandingApp = { name: string; icon: string; slug?: string | null; reviews?: number; free?: boolean };

// Russian plural for "отзыв" (review): 1 отзыв, 2–4 отзыва, 5+ отзывов.
function reviewsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "отзывов";
  if (d === 1) return "отзыв";
  if (d >= 2 && d <= 4) return "отзыва";
  return "отзывов";
}

// One scrolling row of the two-row carousels. Content is doubled so the
// translateX(-50%) loop is seamless; hover pauses (via .ld-marquee).
function MarqueeRow({
  items,
  reverse = false,
  speed = "90s",
}: {
  items: React.ReactNode[];
  reverse?: boolean;
  speed?: string;
}) {
  return (
    <div className="overflow-hidden py-1 [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
      <div
        className="ld-marquee flex w-max gap-2.5"
        style={{ ["--mq" as string]: speed, animationDirection: reverse ? "reverse" : undefined }}
      >
        {items}
        {items.map((n, i) => (
          <div key={`dup-${i}`} className="contents">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

// A single app pill in the «Приложения» carousel (icon + name + review count).
function AppBrick({ a, ru }: { a: LandingApp; ru: boolean }) {
  const cls =
    "flex shrink-0 items-center gap-3 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-2 pl-2 pr-5 transition-colors hover:border-[var(--color-border-strong)]";
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded-full object-cover" />
      <span className="flex flex-col leading-tight">
        <span className="text-footnote font-semibold text-[var(--color-text-primary)]">{a.name}</span>
        {a.reviews && a.reviews > 0 ? (
          <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
            {ru ? `разобрали ${a.reviews.toLocaleString("ru-RU")} ${reviewsWord(a.reviews)}` : `${a.reviews.toLocaleString("en-US")} reviews`}
          </span>
        ) : null}
      </span>
    </>
  );
  return a.slug ? (
    <Link href={`/${a.slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}

// Centered section heading + subtitle + «Все» link.
function SectionHead({ title, subtitle, href, all }: { title: string; subtitle: string; href: string; all: string }) {
  return (
    <div className="mx-auto mb-6 flex max-w-xl flex-col items-center gap-1.5 px-4 text-center">
      <h2 className="text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</h2>
      <p className="text-callout text-[var(--color-text-secondary)]">{subtitle}</p>
      <Link href={href} className="mt-1 text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
        {all}
      </Link>
    </div>
  );
}

// Line glyph per domain (categories use an icon, not an app logo).
function CatGlyph({ domain }: { domain?: string }) {
  const p: Record<string, React.ReactNode> = {
    "sleep-meditation": <path d="M14 9.5A5.5 5.5 0 0 1 7 3a5.5 5.5 0 1 0 6.8 6.6Z" />,
    "mind-self-help": <path d="M3 9a4 4 0 0 1 5-3.9A4 4 0 0 1 13 9c0 2.5-3 4-5 6-2-2-5-3.5-5-6Z" />,
    "women-family": <path d="M8 10.5 3.2 6a3 3 0 0 1 4.3-4.2l.5.5.5-.5A3 3 0 0 1 12.8 6L8 10.5Z" />,
    "fitness-nutrition": <path d="M8 1.5c1 2 3 3 3 5.5A3 3 0 1 1 5 7c0-2.5 2-3.5 3-5.5Z" />,
    learning: <path d="M8 2 1.5 5 8 8l6.5-3L8 2Zm-4 5v3.5c0 1 1.8 2 4 2s4-1 4-2V7" />,
    productivity: <path d="m3 8 3 3 6.5-7" />,
    "reading-podcasts": <path d="M8 3.5C6.5 2.5 4 2.5 2 3v9c2-.5 4.5-.5 6 .5 1.5-1 4-1 6-.5V3c-2-.5-4.5-.5-6 .5v9" />,
    "media-streaming": <path d="M5.5 3.5v9l7-4.5-7-4.5Z" />,
    "photo-video": <path d="M2 5.5h2l1-1.5h6l1 1.5h2v8H2v-8Zm6 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />,
    "ai-tools": <path d="M8 1.5 9.3 6 14 7.3 9.3 8.6 8 13l-1.3-4.4L2 7.3 6.7 6 8 1.5Z" />,
    "travel-places": <path d="M8 1.8a4.2 4.2 0 0 0-4.2 4.2c0 3 4.2 8 4.2 8s4.2-5 4.2-8A4.2 4.2 0 0 0 8 1.8Zm0 5.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />,
    money: <path d="M2.5 4.5h11v7h-11v-7Zm5.5 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />,
    "hobbies-lifestyle": <path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6 4.2 13.6l.7-4.3-3.1-3 4.3-.6L8 1.8Z" />,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {(domain && p[domain]) ?? <path d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z" />}
    </svg>
  );
}

// A single category pill in the «Категории» carousel — distinct from app pills:
// a brand-tinted glyph (not an app logo) + «разобрали N приложений».
function CatBrick({ c, ru }: { c: { name: string; slug: string; count: number; domain?: string }; ru: boolean }) {
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] py-2.5 pl-2.5 pr-5 transition-colors hover:border-[var(--color-border-strong)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-brand-subtle)] text-[var(--color-text-brand)]">
        <CatGlyph domain={c.domain} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-footnote font-semibold text-[var(--color-text-primary)]">{c.name}</span>
        <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {ru ? `разобрали ${c.count} ${appsWord(c.count)}` : `${c.count} apps analyzed`}
        </span>
      </span>
    </Link>
  );
}

// A rich idea card (matches the /ideas page) sized for the carousel.
function IdeaBrick({
  i,
  ru,
}: {
  i: { title: string; slug: string; categoryName: string; oneLiner?: string; domain?: string; stats?: { apps: number; reviews: number; observations: number } };
  ru: boolean;
}) {
  return (
    <Link
      href={`/ideas/${i.slug}`}
      className="flex w-[300px] shrink-0 flex-col gap-2 self-stretch whitespace-normal rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
        <CatGlyph domain={i.domain} />
        <span className="truncate">{i.categoryName}</span>
      </span>
      <span className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
        {i.title}
      </span>
      {i.oneLiner ? (
        <p className="line-clamp-4 text-footnote leading-[1.55] text-[var(--color-text-secondary)]">{i.oneLiner}</p>
      ) : null}
      {i.stats ? (
        <span className="mt-auto pt-1 text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {i.stats.apps} {appsWord(i.stats.apps)} · {i.stats.reviews.toLocaleString(ru ? "ru-RU" : "en-US")} отзывов
        </span>
      ) : null}
    </Link>
  );
}

// Marketing landing for logged-out visitors: animated hero with a salute of
// drifting app icons + scrolling app/category carousels. Original code in the
// app's own dark theme.
export default function Landing({
  apps,
  locale = "ru",
  totalReviews = 0,
  loggedIn = false,
  categories = [],
  ideas = [],
}: {
  apps: LandingApp[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
  categories?: { name: string; slug: string; count: number; icon?: string; domain?: string }[];
  ideas?: {
    title: string;
    slug: string;
    categoryName: string;
    oneLiner?: string;
    domain?: string;
    stats?: { apps: number; reviews: number; observations: number };
  }[];
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);

  // Re-shuffle on the client each mount so the icon salute differs every load
  // (server stays deterministic; rAF keeps setState out of the effect body).
  const [shuffled, setShuffled] = useState<LandingApp[]>(apps);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const arr = apps.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      setShuffled(arr);
    });
    return () => cancelAnimationFrame(id);
  }, [apps]);

  const withIcon = shuffled.filter((a) => a.icon);
  // A scattered "salute" of icons around the hero (the set is shuffled per load).
  const positions = [
    "left-[3%] top-[6%]", "right-[5%] top-[9%]", "left-[11%] top-[33%]", "right-[8%] top-[30%]",
    "left-[1%] bottom-[18%]", "right-[2%] bottom-[20%]", "left-[20%] top-[2%]", "right-[22%] bottom-[5%]",
    "left-[31%] bottom-[1%]", "right-[31%] top-[3%]", "left-[16%] bottom-[3%]", "right-[13%] bottom-[8%]",
    "left-[41%] top-[0%]", "right-[43%] bottom-[1%]",
  ];
  const sizes = ["size-10 sm:size-12 lg:size-14", "size-9 sm:size-11 lg:size-12", "size-11 sm:size-14 lg:size-16"];
  const floats = withIcon.slice(0, positions.length);

  // App bricks for the «Приложения» carousel — prefer clickable (ready) apps.
  const carouselApps = (withIcon.filter((a) => a.slug).length >= 8 ? withIcon.filter((a) => a.slug) : withIcon).slice(0, 40);
  const appsRowA = carouselApps.filter((_, i) => i % 2 === 0);
  const appsRowB = carouselApps.filter((_, i) => i % 2 === 1);
  const catsRowA = categories.filter((_, i) => i % 2 === 0);
  const catsRowB = categories.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-x-clip px-4 pb-16 pt-20 sm:pt-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {floats.map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={a.icon}
              alt=""
              className={`ld-float absolute block rounded-[14px] opacity-70 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85)] sm:opacity-80 ${sizes[i % sizes.length]} ${positions[i]}`}
              style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${(i % 2 ? 7 : -7)}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="ld-fade text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[60px]" style={{ animationDelay: "0.05s" }}>
            {ru ? (
              <>Тысячи отзывов<br />в готовые выводы</>
            ) : (
              <>Thousands of reviews<br />into clear conclusions</>
            )}
          </h1>

          <p className="ld-fade mx-auto mt-5 max-w-xl text-lead text-[var(--color-text-secondary)]" style={{ animationDelay: "0.1s" }}>
            {ru
              ? "Читаем отзывы по приложениям и собираем их в готовые выводы: что пользователи хвалят, на что злятся. А ещё предлагаем идеи новых приложений — на основе того, что люди просят."
              : "We read app reviews and turn them into clear conclusions: what users love and what they hate. And we surface ideas for new apps from what people ask for."}
          </p>
          {totalReviews > 0 && (
            <p className="ld-fade mx-auto mt-3 text-callout text-[var(--color-text-tertiary)]" style={{ animationDelay: "0.13s" }}>
              {ru ? "Уже разобрали " : "Already analyzed "}
              <span className="font-semibold tabular-nums text-[var(--color-text-secondary)]">
                {totalReviews.toLocaleString(ru ? "ru-RU" : "en-US")}
              </span>
              {ru ? ` ${reviewsWord(totalReviews)}` : " reviews"}
            </p>
          )}

          <div className="ld-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
            {loggedIn ? (
              <Link
                href="/catalog"
                className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
              >
                {ru ? "Открыть каталог" : "Open catalog"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setModal(true)}
                className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
              >
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            )}
            <Link
              href="/tokens"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Токены" : "Tokens"}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories carousel (two rows, glyph icons) */}
      {categories.length > 2 && (
        <Reveal className="mt-16 w-full">
          <SectionHead
            title={ru ? "Категории" : "Categories"}
            subtitle={ru ? "Разборы по жанрам приложений — что внутри каждой ниши." : "Breakdowns by app genre — what's inside each niche."}
            href="/catalog"
            all={ru ? "Все категории" : "All categories"}
          />
          <div className="flex flex-col gap-2.5">
            <MarqueeRow speed="160s" items={catsRowA.map((c) => <CatBrick key={c.slug} c={c} ru={ru} />)} />
            {catsRowB.length > 0 && (
              <MarqueeRow speed="185s" items={catsRowB.map((c) => <CatBrick key={c.slug} c={c} ru={ru} />)} />
            )}
          </div>
        </Reveal>
      )}

      {/* Apps carousel (two rows, bricks) */}
      {carouselApps.length > 3 && (
        <Reveal className="mt-16 w-full">
          <SectionHead
            title={ru ? "Приложения" : "Apps"}
            subtitle={ru ? "Сотни приложений, по каждому разобрали все отзывы." : "Hundreds of apps — every review analyzed."}
            href="/catalog?view=apps"
            all={ru ? "Все приложения" : "All apps"}
          />
          <div className="flex flex-col gap-2.5">
            <MarqueeRow speed="170s" items={appsRowA.map((a, i) => <AppBrick key={`a-${i}`} a={a} ru={ru} />)} />
            {appsRowB.length > 0 && (
              <MarqueeRow speed="195s" items={appsRowB.map((a, i) => <AppBrick key={`b-${i}`} a={a} ru={ru} />)} />
            )}
          </div>
        </Reveal>
      )}

      {/* Ideas carousel (rich cards) */}
      {ideas.length > 0 && (
        <Reveal className="mt-16 w-full">
          <SectionHead
            title={ru ? "Идеи" : "Ideas"}
            subtitle={ru ? "Готовые идеи новых приложений — на основе того, что люди реально просят." : "Ready product ideas from what people actually ask for."}
            href="/ideas"
            all={ru ? "Все идеи" : "All ideas"}
          />
          <MarqueeRow speed="200s" items={ideas.map((i) => <IdeaBrick key={i.slug} i={i} ru={ru} />)} />
        </Reveal>
      )}

      {/* Final CTA */}
      <Reveal className="mx-auto mt-14 w-full max-w-3xl">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-12 text-center">
          <h2 className="text-[28px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[34px]">
            {ru ? "Откройте весь каталог" : "Open the full catalog"}
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-lead text-[var(--color-text-secondary)]">
            {ru ? "Разборы, идеи и отзывы — по сотням приложений." : "Breakdowns, ideas and reviews across hundreds of apps."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {loggedIn ? (
              <Link
                href="/catalog"
                className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
              >
                {ru ? "Открыть каталог" : "Open catalog"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setModal(true)}
                className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
              >
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            )}
            <Link
              href="/tokens"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Токены" : "Tokens"}
            </Link>
          </div>
        </div>
      </Reveal>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
