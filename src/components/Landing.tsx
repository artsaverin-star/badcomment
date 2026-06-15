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

// Marketing landing for logged-out visitors: animated hero with a salute of
// drifting app icons + a scrolling brand marquee. Original code in the app's
// own dark theme.
export default function Landing({
  apps,
  locale = "ru",
  totalReviews = 0,
  loggedIn = false,
  categories = [],
  ideas = [],
  stats,
  quotes = [],
}: {
  apps: LandingApp[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
  categories?: { name: string; slug: string; count: number }[];
  ideas?: { title: string; slug: string; categoryName: string }[];
  stats?: { reviews: number; apps: number; categories: number; ideas: number };
  quotes?: string[];
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);
  const steps = ru
    ? [
        { t: "Читаем все отзывы", d: "Берём сотни отзывов 1–5★ по каждому приложению в категории." },
        { t: "Собираем выводы", d: "Что хвалят, на что злятся, какие проблемы повторяются у разных приложений." },
        { t: "Предлагаем идеи", d: "Готовые идеи новых приложений — на основе того, что люди реально просят." },
      ]
    : [
        { t: "Read every review", d: "Hundreds of 1–5★ reviews for each app in a category." },
        { t: "Distill conclusions", d: "What users love, hate, and which problems repeat across apps." },
        { t: "Surface ideas", d: "Ready product ideas based on what people actually ask for." },
      ];

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
  // Cap the marquee — with hundreds of icons the row is enormous and scrolls
  // visually fast even at a long duration. A short, fixed set drifts slowly.
  // Prefer ready apps (clickable + carry a real review count).
  const marqueeApps = (withIcon.filter((a) => a.slug).slice(0, 18).length >= 6
    ? withIcon.filter((a) => a.slug)
    : withIcon
  ).slice(0, 18);
  const marquee = [...marqueeApps, ...marqueeApps];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:pt-24">
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
              {ru ? "Тарифы →" : "Pricing →"}
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

      {/* Brand marquee */}
      {withIcon.length > 6 && (
        <section className="relative mt-10 overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="ld-marquee flex w-max gap-3" style={{ ["--mq" as string]: "120s" }}>
            {marquee.map((a, i) => {
              const inner = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="size-9 shrink-0 rounded-full object-cover" />
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
              const cls =
                "flex shrink-0 items-center gap-3 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-2 pl-2 pr-5 transition-colors hover:border-[var(--color-border-strong)]";
              return a.slug ? (
                <Link key={i} href={`/${a.slug}`} className={cls}>
                  {inner}
                </Link>
              ) : (
                <span key={i} className={cls}>
                  {inner}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories preview */}
      {categories.length > 0 && (
        <Reveal className="mx-auto mt-12 w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ru ? "Категории" : "Categories"}
            </h2>
            <Link href="/catalog" className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
              {ru ? "Все →" : "All →"}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/segment/${c.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]"
              >
                <span className="truncate font-medium text-[var(--color-text-primary)]">{c.name}</span>
                <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{c.count}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {/* Apps preview */}
      {apps.length > 0 && (
        <Reveal className="mx-auto mt-10 w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ru ? "Приложения" : "Apps"}
            </h2>
            <Link href="/catalog?view=apps" className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
              {ru ? "Все →" : "All →"}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {apps.slice(0, 6).map((a) => (
              <Link
                key={a.slug}
                href={`/${a.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="size-10 shrink-0 rounded-[11px] object-cover" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-callout font-medium text-[var(--color-text-primary)]">{a.name}</span>
                  {a.reviews && a.reviews > 0 ? (
                    <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
                      {ru ? `разобрали ${a.reviews.toLocaleString("ru-RU")} ${reviewsWord(a.reviews)}` : `${a.reviews} reviews`}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
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
              {ru ? "Все →" : "All →"}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {ideas.map((i) => (
              <Link
                key={i.slug}
                href={`/ideas/${i.slug}`}
                className="flex flex-col gap-0.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]"
              >
                <span className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">{i.categoryName}</span>
                <span className="font-medium leading-snug text-[var(--color-text-primary)]">{i.title}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      {/* Real review quotes */}
      {quotes.length > 0 && (
        <Reveal className="mx-auto mt-14 w-full max-w-5xl">
          <h2 className="mb-1 text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
            {ru ? "Что пишут пользователи" : "What users write"}
          </h2>
          <p className="mb-5 text-callout text-[var(--color-text-secondary)]">
            {ru ? "Реальные отзывы из приложений — из них и собираются выводы." : "Real app reviews — the source of every conclusion."}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quotes.map((q, i) => (
              <figure
                key={i}
                className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-[var(--color-text-tertiary)]">
                  <path d="M8 10h8M8 14h5M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <blockquote className="mt-3 text-callout leading-[1.6] text-[var(--color-text-secondary)]">«{q}»</blockquote>
              </figure>
            ))}
          </div>
        </Reveal>
      )}

      {/* How it works */}
      <Reveal className="mx-auto mt-14 w-full max-w-5xl">
        <h2 className="mb-6 text-center text-[24px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {ru ? "Как это работает" : "How it works"}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.t}
              className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-callout font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lead font-semibold text-[var(--color-text-primary)]">{s.t}</h3>
              <p className="mt-1.5 text-callout leading-[1.6] text-[var(--color-text-secondary)]">{s.d}</p>
            </div>
          ))}
        </div>
      </Reveal>

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
              {ru ? "Тарифы →" : "Pricing →"}
            </Link>
          </div>
        </div>
      </Reveal>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
