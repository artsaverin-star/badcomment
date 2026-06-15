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

// A single category pill in the «Категории» carousel (icon + name + app count).
function CatBrick({ c, ru }: { c: { name: string; slug: string; count: number; icon?: string }; ru: boolean }) {
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="flex shrink-0 items-center gap-3 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-2 pl-2 pr-5 transition-colors hover:border-[var(--color-border-strong)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.icon} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded-[11px] object-cover" />
      <span className="flex flex-col leading-tight">
        <span className="text-footnote font-semibold text-[var(--color-text-primary)]">{c.name}</span>
        <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {ru ? `${c.count} ${appsWord(c.count)}` : `${c.count} apps`}
        </span>
      </span>
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
  stats,
}: {
  apps: LandingApp[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
  categories?: { name: string; slug: string; count: number; icon?: string }[];
  ideas?: { title: string; slug: string; categoryName: string }[];
  stats?: { reviews: number; apps: number; categories: number; ideas: number };
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
  const withCatIcon = categories.filter((c) => c.icon);
  const catsRowA = withCatIcon.filter((_, i) => i % 2 === 0);
  const catsRowB = withCatIcon.filter((_, i) => i % 2 === 1);

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
              href="/premium"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Тарифы" : "Pricing"}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats band */}
      {stats && (
        <Reveal className="mx-auto mt-6 w-full max-w-4xl">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { n: stats.reviews, l: ru ? "отзывов разобрано" : "reviews analyzed" },
              { n: stats.apps, l: ru ? "приложений" : "apps" },
              { n: stats.categories, l: ru ? "категорий" : "categories" },
              { n: stats.ideas, l: ru ? "идей продуктов" : "product ideas" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-5 text-center"
              >
                <div className="text-[26px] font-bold tabular-nums tracking-[-0.01em] text-[var(--color-text-primary)]">
                  {s.n.toLocaleString(ru ? "ru-RU" : "en-US")}
                </div>
                <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Categories carousel (two rows, icons) */}
      {withCatIcon.length > 2 && (
        <Reveal className="mt-12 w-full">
          <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between px-1">
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ru ? "Категории" : "Categories"}
            </h2>
            <Link href="/catalog" className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
              {ru ? "Все" : "All"}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <MarqueeRow speed="75s" items={catsRowA.map((c) => <CatBrick key={c.slug} c={c} ru={ru} />)} />
            {catsRowB.length > 0 && (
              <MarqueeRow speed="85s" reverse items={catsRowB.map((c) => <CatBrick key={c.slug} c={c} ru={ru} />)} />
            )}
          </div>
        </Reveal>
      )}

      {/* Apps carousel (two rows, bricks) */}
      {carouselApps.length > 3 && (
        <Reveal className="mt-12 w-full">
          <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between px-1">
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ru ? "Приложения" : "Apps"}
            </h2>
            <Link href="/catalog?view=apps" className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
              {ru ? "Все" : "All"}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <MarqueeRow speed="95s" items={appsRowA.map((a, i) => <AppBrick key={`a-${i}`} a={a} ru={ru} />)} />
            {appsRowB.length > 0 && (
              <MarqueeRow speed="110s" reverse items={appsRowB.map((a, i) => <AppBrick key={`b-${i}`} a={a} ru={ru} />)} />
            )}
          </div>
        </Reveal>
      )}

      {/* Ideas preview */}
      {ideas.length > 0 && (
        <Reveal className="mx-auto mt-10 w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ru ? "Идеи" : "Ideas"}
            </h2>
            <Link href="/ideas" className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
              {ru ? "Все" : "All"}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ideas.map((i) => (
              <Link
                key={i.slug}
                href={`/ideas/${i.slug}`}
                className="flex flex-col gap-1.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
              >
                <span className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">{i.categoryName}</span>
                <span className="font-medium leading-snug text-[var(--color-text-primary)]">{i.title}</span>
              </Link>
            ))}
          </div>
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
              href="/premium"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Тарифы" : "Pricing"}
            </Link>
          </div>
        </div>
      </Reveal>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
