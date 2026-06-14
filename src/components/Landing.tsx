"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

export type LandingApp = { name: string; icon: string };

// Count-up animation from 0 to the real value.
function Counter({ value }: { value: number }) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let raf = 0;
    let start: number | null = null;
    const dur = 1500;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{n.toLocaleString("ru-RU")}</span>;
}

// Marketing landing for logged-out visitors: animated hero with drifting app
// icons, a stats band, a scrolling brand marquee and feature cards. Original
// code in the app's own dark theme.
export default function Landing({
  apps,
  stats,
  locale = "ru",
}: {
  apps: LandingApp[];
  stats: { apps: number; reviews: number; categories: number };
  locale?: Locale;
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);

  const withIcon = apps.filter((a) => a.icon);
  // Scatter a handful of icons around the hero.
  const floats = withIcon.slice(0, 10);
  const positions = [
    "left-[4%] top-[8%]", "right-[6%] top-[10%]", "left-[12%] top-[44%]", "right-[10%] top-[40%]",
    "left-[2%] bottom-[14%]", "right-[3%] bottom-[16%]", "left-[22%] top-[2%]", "right-[24%] bottom-[6%]",
    "left-[34%] bottom-[2%]", "right-[34%] top-[4%]",
  ];
  // Cap the marquee — with hundreds of icons the row is enormous and scrolls
  // visually fast even at a long duration. A short, fixed set drifts slowly.
  const marqueeApps = withIcon.slice(0, 18);
  const marquee = [...marqueeApps, ...marqueeApps];

  const nf = (n: number) => n.toLocaleString("ru-RU");

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
              className={`ld-float absolute hidden size-12 rounded-[14px] opacity-70 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] sm:block lg:size-14 ${positions[i]}`}
              style={{ ["--d" as string]: `${5 + (i % 4)}s`, ["--r" as string]: `${(i % 2 ? 6 : -6)}deg`, animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <Link
            href="/ideas"
            className="ld-fade inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-caption font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          >
            <span className="size-1.5 rounded-full bg-[#4ade80]" />
            {ru ? "Идеи продуктов из реальных отзывов" : "Product ideas from real reviews"}
          </Link>

          <h1 className="ld-fade mt-6 text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[60px]" style={{ animationDelay: "0.05s" }}>
            {ru ? (
              <>Тысячи отзывов —<br />в готовые выводы</>
            ) : (
              <>Thousands of reviews,<br />distilled into conclusions</>
            )}
          </h1>

          <p className="ld-fade mx-auto mt-5 max-w-xl text-lead text-[var(--color-text-secondary)]" style={{ animationDelay: "0.1s" }}>
            {ru
              ? `Разобрали ${nf(stats.reviews)} отзывов по ${nf(stats.apps)} приложениям и ${stats.categories} категориям. Что пользователи хвалят, на что злятся и какие продукты стоит строить.`
              : `We read ${nf(stats.reviews)} reviews across ${nf(stats.apps)} apps and ${stats.categories} categories — what users love, hate, and which products are worth building.`}
          </p>

          <div className="ld-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
            >
              {ru ? "Начать бесплатно" : "Start free"}
            </button>
            <Link
              href="/premium"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Тарифы →" : "Pricing →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Brand marquee */}
      {withIcon.length > 6 && (
        <section className="relative overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="ld-marquee flex w-max gap-3" style={{ ["--mq" as string]: "120s" }}>
            {marquee.map((a, i) => (
              <span
                key={i}
                className="flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1.5 pl-1.5 pr-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.icon} alt="" className="size-8 rounded-[9px]" />
                <span className="text-footnote font-medium text-[var(--color-text-secondary)]">{a.name}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Stats band — plain numbers, animated count-up */}
      <section className="mx-auto flex w-full max-w-3xl flex-wrap items-start justify-center gap-x-14 gap-y-8 px-4 py-12 sm:gap-x-24">
        {[
          { v: stats.reviews, l: ru ? "отзывов прочитано" : "reviews read" },
          { v: stats.apps, l: ru ? "приложений разобрано" : "apps analyzed" },
          { v: stats.categories, l: ru ? "категорий" : "categories" },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <div className="text-[44px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[56px]">
              <Counter value={s.v} />
            </div>
            <div className="mt-1 text-footnote text-[var(--color-text-tertiary)]">{s.l}</div>
          </div>
        ))}
      </section>

      {/* Feature cards */}
      <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3">
        {[
          { t: ru ? "Разборы по отзывам" : "Review breakdowns", d: ru ? "Каждый вывод прослеживается до реальных цитат 1–5★." : "Every conclusion traces to real 1–5★ quotes." },
          { t: ru ? "Идеи продуктов" : "Product ideas", d: ru ? "Гэпы рынка с доказанным спросом — что строить." : "Market gaps with proven demand — what to build." },
          { t: ru ? "Поиск по каталогу" : "Catalog search", d: ru ? "Тысячи приложений в десятках категорий." : "Thousands of apps across dozens of categories." },
        ].map((f) => (
          <div key={f.t} className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
            <div className="text-lead font-semibold text-[var(--color-text-primary)]">{f.t}</div>
            <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{f.d}</p>
          </div>
        ))}
      </section>

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
