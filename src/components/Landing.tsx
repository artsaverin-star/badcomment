"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import Reveal from "./Reveal";
import CatGlyph from "./CatGlyph";
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
        <CatGlyph domain={i.domain} size={14} />
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
              {ru ? "Энергия" : "Energy"}
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

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
