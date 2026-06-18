"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import Reveal from "./Reveal";
import type { Locale } from "@/lib/i18n";

export type CatCard = {
  slug: string;
  name: string;
  icons: string[];
  apps: number;
  reviews: number;
  observations: number;
  ideas: number;
  painHook: string;
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

const CARD_POS = [
  "left-[4%] top-[8%]",
  "right-[5%] top-[6%]",
  "left-[2%] top-[42%]",
  "right-[3%] top-[40%]",
  "left-[6%] bottom-[12%]",
  "right-[5%] bottom-[14%]",
  "left-[23%] top-[2%]",
  "right-[25%] bottom-[4%]",
  "left-[40%] bottom-[1%]",
  "right-[42%] top-[1%]",
];

// A big, selling category card — the segment cover (app-icon salute + headline
// + hook + stats) condensed, with a «Смотреть разбор» CTA.
function CategoryCoverCard({ c, ru }: { c: CatCard; ru: boolean }) {
  const icons = c.icons.filter(Boolean).slice(0, CARD_POS.length);
  return (
    <Link
      href={`/segment/${c.slug}`}
      className="group relative block overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] transition-colors hover:border-[var(--color-border-strong)] sm:p-8"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.16]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
      {icons.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {icons.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className={`ld-float absolute block size-11 rounded-[13px] opacity-50 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.85)] sm:size-12 ${CARD_POS[i]}`}
              style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${i % 2 ? 7 : -7}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
            />
          ))}
          <span className="absolute inset-0" style={{ background: "radial-gradient(62% 56% at 50% 48%, var(--color-surface-card) 36%, transparent 100%)" }} />
        </div>
      )}

      <div className="relative flex flex-col items-center gap-3 text-center">
        <h3 className="text-[28px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[34px]">{c.name}</h3>
        <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {ru ? `Разбор категории · 2026 · ${c.apps} ${appsWord(c.apps)}` : `Category breakdown · 2026 · ${c.apps} apps`}
        </p>
        {c.painHook && (
          <p className="mx-auto max-w-[44ch] text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {ru ? (
              <>
                А знаете, на что злятся сильнее всего? <b className="text-[var(--color-text-primary)]">{c.painHook.charAt(0).toLowerCase() + c.painHook.slice(1)}</b>. Сделайте без этого — и у вас потенциальный хит.
              </>
            ) : (
              <>
                The #1 thing people hate here? <b className="text-[var(--color-text-primary)]">{c.painHook}</b>. Build one without it — and you’ve got a hit.
              </>
            )}
          </p>
        )}
        <p className="text-footnote text-[var(--color-text-secondary)]">
          {ru ? (
            <>
              Прочитали <b className="tabular-nums text-[var(--color-text-primary)]">{c.reviews.toLocaleString("ru-RU")}</b> {reviewsWord(c.reviews)} · собрали{" "}
              <b className="tabular-nums text-[var(--color-text-primary)]">{c.observations}</b> {obsWord(c.observations)}
              {c.ideas > 0 ? <> · <b className="tabular-nums text-[var(--color-text-primary)]">{c.ideas}</b> {ideasWord(c.ideas)}</> : null}
            </>
          ) : (
            <>
              Read <b className="tabular-nums text-[var(--color-text-primary)]">{c.reviews.toLocaleString("en-US")}</b> reviews · {c.observations} observations
              {c.ideas > 0 ? <> · {c.ideas} ideas</> : null}
            </>
          )}
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-transform group-hover:scale-[1.03]">
          {ru ? "Смотреть разбор" : "See the breakdown"}
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

          <div className="ld-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
            {loggedIn ? (
              <Link href="/catalog" className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">
                {ru ? "Открыть каталог" : "Open catalog"}
              </Link>
            ) : (
              <button type="button" onClick={() => setModal(true)} className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            )}
            <Link href="/tokens" className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]">
              {ru ? "Энергия" : "Energy"}
            </Link>
          </div>
        </div>
      </section>

      {/* Category cover cards */}
      {catCards.length > 0 && (
        <Reveal className="w-full">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
            {catCards.map((c) => (
              <CategoryCoverCard key={c.slug} c={c} ru={ru} />
            ))}
          </div>
        </Reveal>
      )}

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
