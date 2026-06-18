"use client";

import { useEffect, useRef, useState } from "react";

// Social-media-style swipeable carousel of insight cards. Each slide is a fixed
// rectangle (portrait, story-like) that snaps into place; swipe / arrows / keys
// move between them. Built for the /<slug>/test experiment — share-worthy frames
// generated straight from the app's review breakdown.

export type CoverSlide = {
  kind: "cover";
  name: string;
  icon: string | null;
  developer?: string;
  reviewsScanned: number;
  observations: number;
  avgRating: number | null;
  ratingCount: number | null;
};

export type Quote = { app?: string; rating: number; date: string; text: string };

export type Tone = "up" | "down" | "mixed" | "info";

export type InsightSlide = {
  kind: "insight";
  kicker?: string;
  title: string;
  plus?: string;
  minus?: string;
  count: number;
  tone: Tone;
  quote?: Quote;
};

export type Slide = CoverSlide | InsightSlide;

const TONE = {
  up: { glow: "#4ade80", label: { ru: "Хвалят", en: "Loved" } },
  down: { glow: "#ff8585", label: { ru: "Злятся", en: "Hated" } },
  mixed: { glow: "#f5b301", label: { ru: "Спорно", en: "Mixed" } },
  info: { glow: "var(--color-text-tertiary)", label: { ru: "Наблюдение", en: "Observation" } },
} as const;

function obsWord(n: number, ru: boolean): string {
  if (!ru) return n === 1 ? "observation" : "observations";
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

export default function CardCarousel({ slides, locale = "ru" }: { slides: Slide[]; locale?: "ru" | "en" }) {
  const ru = locale !== "en";
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Track which slide is centered, from scroll position (so swipe + buttons stay
  // in sync without per-slide observers).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setActive(Math.max(0, Math.min(slides.length - 1, i)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [slides.length]);

  const go = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[440px] select-none" onKeyDown={onKey} tabIndex={0}>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((s, i) => (
            <div key={i} className="w-full shrink-0 snap-center px-1">
              {s.kind === "cover" ? <Cover s={s} ru={ru} /> : <Insight s={s} ru={ru} index={i} total={slides.length} />}
            </div>
          ))}
        </div>

        {/* Edge arrows (desktop) */}
        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label={ru ? "Назад" : "Previous"}
          disabled={active === 0}
          className="absolute left-[-18px] top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] shadow-lg transition-opacity hover:text-[var(--color-text-primary)] disabled:opacity-0 sm:flex"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => go(active + 1)}
          aria-label={ru ? "Вперёд" : "Next"}
          disabled={active === slides.length - 1}
          className="absolute right-[-18px] top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] shadow-lg transition-opacity hover:text-[var(--color-text-primary)] disabled:opacity-0 sm:flex"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Progress dots */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-5 bg-[var(--color-text-brand)]" : "w-1.5 bg-[var(--color-border-strong)] hover:bg-[var(--color-text-tertiary)]"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-caption tabular-nums text-[var(--color-text-tertiary)]">
        {active + 1} / {slides.length}
      </p>
    </div>
  );
}

// A slide is a fixed-aspect portrait rectangle, like a story frame.
function Frame({ children, glow }: { children: React.ReactNode; glow?: string }) {
  return (
    <div
      className="relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]"
      style={glow ? { boxShadow: `0 24px 60px -30px rgba(0,0,0,0.7), inset 0 1px 0 0 color-mix(in srgb, ${glow} 30%, transparent)` } : undefined}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-[0.16]"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, ${glow} 0%, transparent 70%)` }}
        />
      )}
      {children}
    </div>
  );
}

function Cover({ s, ru }: { s: CoverSlide; ru: boolean }) {
  return (
    <Frame glow="var(--color-text-brand)">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
        {s.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.icon} alt="" className="size-20 rounded-[22px] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]" />
        ) : null}
        <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]">{s.name}</h1>
        {s.avgRating != null && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-[15px] tabular-nums tracking-tight text-[#f5b301]">
              {"★".repeat(Math.round(s.avgRating))}
              {"☆".repeat(Math.max(0, 5 - Math.round(s.avgRating)))}
            </div>
            <div className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {s.avgRating.toFixed(1)}
              {s.ratingCount != null ? ` · ${s.ratingCount.toLocaleString(ru ? "ru-RU" : "en-US")} ${ru ? "оценок" : "ratings"}` : ""}
            </div>
          </div>
        )}
        <p className="max-w-[26ch] text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {ru ? (
            <>
              Прочитали <b className="tabular-nums text-[var(--color-text-primary)]">{s.reviewsScanned.toLocaleString("ru-RU")}</b> отзывов и собрали{" "}
              <b className="tabular-nums text-[var(--color-text-primary)]">{s.observations}</b> наблюдений
            </>
          ) : (
            <>
              Read <b className="tabular-nums text-[var(--color-text-primary)]">{s.reviewsScanned.toLocaleString("en-US")}</b> reviews and distilled{" "}
              <b className="tabular-nums text-[var(--color-text-primary)]">{s.observations}</b> observations
            </>
          )}
        </p>
      </div>
      <div className="relative flex items-center justify-center gap-1.5 text-caption text-[var(--color-text-tertiary)]">
        <span className="font-semibold tracking-tight text-[var(--color-text-secondary)]">inApp</span>
        <span aria-hidden>·</span>
        <span>{ru ? "листайте →" : "swipe →"}</span>
      </div>
    </Frame>
  );
}

function Insight({ s, ru, index, total }: { s: InsightSlide; ru: boolean; index: number; total: number }) {
  const tone = TONE[s.tone];
  return (
    <Frame glow={tone.glow}>
      <div className="relative mb-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${tone.glow} 18%, transparent)`, color: tone.glow }}
        >
          {s.kicker || tone.label[ru ? "ru" : "en"]}
        </span>
        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {index}/{total - 1}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden">
        <h2 className="text-[21px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-text-primary)]">{s.title}</h2>

        {s.plus && (
          <p className="flex items-start gap-2 text-[14px] leading-[1.5]">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#4ade80_22%,transparent)] text-[12px] font-bold leading-none text-[#4ade80]">+</span>
            <span className="text-[var(--color-text-secondary)]">{s.plus}</span>
          </p>
        )}
        {s.minus && (
          <p className="flex items-start gap-2 text-[14px] leading-[1.5]">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#ff8585_22%,transparent)] text-[13px] font-bold leading-none text-[#ff8585]">−</span>
            <span className="text-[var(--color-text-secondary)]">{s.minus}</span>
          </p>
        )}

        {s.quote && (
          <figure className="mt-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {s.quote.app && <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{s.quote.app}</span>}
              <span className="text-caption tabular-nums text-[#f5b301]">
                {"★".repeat(s.quote.rating)}
                {"☆".repeat(Math.max(0, 5 - s.quote.rating))}
              </span>
              <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{s.quote.date}</span>
            </div>
            <p className="line-clamp-4 text-[13px] italic leading-relaxed text-[var(--color-text-secondary)]">“{s.quote.text}”</p>
          </figure>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums"
          style={{ background: `color-mix(in srgb, ${tone.glow} 16%, transparent)`, color: tone.glow }}
        >
          {s.count} {obsWord(s.count, ru)}
        </span>
        <span className="text-caption font-semibold tracking-tight text-[var(--color-text-tertiary)]">inApp</span>
      </div>
    </Frame>
  );
}
