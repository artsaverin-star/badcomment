"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

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

function reviewsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "отзывов";
  if (d === 1) return "отзыв";
  if (d >= 2 && d <= 4) return "отзыва";
  return "отзывов";
}
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

// A clean, Apple-style category card — tidy app-icon row, big headline, the
// governing thought, quiet stats, and a restrained «Смотреть разбор» link.
function CategoryCoverCard({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, 6);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group flex h-full flex-col rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] sm:p-8"
    >
      <h3 className="text-[28px] font-semibold leading-[1.06] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[34px]">{c.name}</h3>
      <p className="mt-2.5 text-[13px] text-[var(--color-text-tertiary)]">{ru ? `Разбор категории · ${c.apps} ${appsWord(c.apps)}` : `Category breakdown · ${c.apps} apps`}</p>

      {icons.length > 0 && (
        <div className="mt-6 flex items-center gap-2">
          {icons.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" loading="lazy" decoding="async" className="size-10 rounded-[12px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
          ))}
        </div>
      )}

      {c.hook && <p className="mt-6 text-[16px] font-light leading-[1.5] text-[var(--color-text-primary)] sm:text-[17px]">{c.hook}</p>}
      {c.blurb && <p className="mt-4 text-[14px] leading-[1.5] text-[var(--color-text-tertiary)]">{c.blurb}</p>}

      <div className="mt-auto pt-7">
        <p className="text-[13px] tabular-nums text-[var(--color-text-tertiary)]">
          {ru
            ? `${c.observations} ${obsWord(c.observations)}${c.ideas > 0 ? ` · ${c.ideas} ${ideasWord(c.ideas)}` : ""}`
            : `${c.observations} observations${c.ideas > 0 ? ` · ${c.ideas} ideas` : ""}`}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-text-primary)]">
          {ru ? "Смотреть разбор" : "See the breakdown"}
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-[var(--color-text-brand)] transition-transform duration-300 group-hover:translate-x-1">
            <path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

// Marketing landing: animated hero with a salute of drifting app icons, then a
// gallery of selling category cards (no more genre/app/idea carousels).
export default function Landing({
  catCards = [],
  locale = "ru",
  totalReviews = 0,
  loggedIn = false,
}: {
  catCards?: CatCard[];
  locale?: Locale;
  totalReviews?: number;
  loggedIn?: boolean;
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);

  // Hero salute — icons flattened from the category cards, shuffled per load.
  const baseIcons = catCards.flatMap((c) => c.icons).filter(Boolean);
  const [icons, setIcons] = useState<string[]>(baseIcons);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const arr = catCards.flatMap((c) => c.icons).filter(Boolean);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      setIcons(arr);
    });
    return () => cancelAnimationFrame(id);
  }, [catCards]);

  const positions = [
    "left-[3%] top-[6%]", "right-[5%] top-[9%]", "left-[11%] top-[33%]", "right-[8%] top-[30%]",
    "left-[1%] bottom-[18%]", "right-[2%] bottom-[20%]", "left-[20%] top-[2%]", "right-[22%] bottom-[5%]",
    "left-[31%] bottom-[1%]", "right-[31%] top-[3%]", "left-[16%] bottom-[3%]", "right-[13%] bottom-[8%]",
    "left-[41%] top-[0%]", "right-[43%] bottom-[1%]",
  ];
  const sizes = ["size-10 sm:size-12 lg:size-14", "size-9 sm:size-11 lg:size-12", "size-11 sm:size-14 lg:size-16"];
  const floats = icons.slice(0, positions.length);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-x-clip px-4 pb-12 pt-20 sm:pt-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {floats.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className={`ld-float absolute block rounded-[14px] opacity-70 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85)] sm:opacity-80 ${sizes[i % sizes.length]} ${positions[i]}`}
              style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${i % 2 ? 7 : -7}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="ld-fade text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[60px]" style={{ animationDelay: "0.05s" }}>
            {ru ? <>Тысячи отзывов<br />в готовые выводы</> : <>Thousands of reviews<br />into clear conclusions</>}
          </h1>

          <p className="ld-fade mx-auto mt-5 max-w-xl text-lead text-[var(--color-text-secondary)]" style={{ animationDelay: "0.1s" }}>
            {ru
              ? "Читаем отзывы по приложениям и собираем их в готовые выводы: что пользователи хвалят, на что злятся. А ещё предлагаем идеи новых приложений — на основе того, что люди просят."
              : "We read app reviews and turn them into clear conclusions: what users love and what they hate. And we surface ideas for new apps from what people ask for."}
          </p>
          {totalReviews > 0 && (
            <p className="ld-fade mx-auto mt-3 text-callout text-[var(--color-text-tertiary)]" style={{ animationDelay: "0.13s" }}>
              {ru ? "Уже разобрали " : "Already analyzed "}
              <span className="font-semibold tabular-nums text-[var(--color-text-secondary)]">{totalReviews.toLocaleString(ru ? "ru-RU" : "en-US")}</span>
              {ru ? ` ${reviewsWord(totalReviews)}` : " reviews"}
            </p>
          )}

          {!loggedIn && (
            <div className="ld-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
              <button type="button" onClick={() => setModal(true)} className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Category cover cards — shown immediately, no scroll-reveal */}
      {catCards.length > 0 && (
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
          {catCards.map((c) => (
            <CategoryCoverCard key={c.slug} c={c} ru={ru} />
          ))}
        </div>
      )}

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
