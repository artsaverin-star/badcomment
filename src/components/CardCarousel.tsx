"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

// Cards render in two layouts: a horizontal swipe carousel, or a vertical feed
// where each card reveals on scroll. Frame/Shot read this to pick their box.
const LayoutCtx = createContext<"carousel" | "feed">("carousel");

// Fade + rise a child in once it scrolls into view (used by the feed layout).
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out will-change-transform"
      style={{ opacity: shown ? 1 : 0, transform: shown ? "translateY(0) scale(1)" : "translateY(28px) scale(0.97)" }}
    >
      {children}
    </div>
  );
}

// Social-media-style swipeable carousel of insight cards. Each slide is a fixed
// portrait rectangle; neighbours peek on both sides and fade toward the edges.
// Swipe / arrows / keys move between them. Built for the /<slug>/test experiment
// — share-worthy frames generated straight from the app's review breakdown.

export type CoverSlide = {
  kind: "cover";
  name: string;
  icon: string | null;
  icons?: string[];
  developer?: string;
  description?: string;
  reviewsScanned: number;
  observations: number;
  avgRating: number | null;
  ratingCount: number | null;
};

// Scattered "salute" of app icons around the cover, like the homepage hero.
const SALUTE_POS = [
  "left-[5%] top-[6%]",
  "right-[6%] top-[5%]",
  "left-[2%] top-[33%]",
  "right-[3%] top-[31%]",
  "left-[7%] bottom-[12%]",
  "right-[6%] bottom-[14%]",
  "left-[26%] top-[1%]",
  "right-[28%] bottom-[3%]",
  "left-[40%] bottom-[0%]",
  "right-[42%] top-[0%]",
];
const SALUTE_SIZE = ["size-10 sm:size-12", "size-9 sm:size-11", "size-11 sm:size-14"];

// Thematic line glyphs for the chapter-divider salute (generic wellbeing/habit
// symbols — heart, shield, streak, check, star, clock, growth, chat, leaf, target).
const CHAPTER_GLYPHS = [
  "M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z",
  "M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z",
  "M12 3c1.2 3-1.8 4.2-1.8 7a4 4 0 0 0 7.8 0c0-1.4-.7-2.7-1.6-3.8.4 2-1.2 3.3-2.2 3.3.6-2.2-.9-5.5-2.2-6.5Z",
  "M4 12l5 5L20 6",
  "m12 3 2.6 5.6 6 .7-4.4 4.1 1.2 6L12 17.8 6.6 19.4l1.2-6L3.4 9.3l6-.7L12 3Z",
  "M12 7v5l3.5 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  "M4 20V4M4 20h16M7 15l3.5-4 3 2L19 7",
  "M5 5h14v10H10l-4 4v-4H5V5Z",
  "M12 21c-7 0-9-6-9-9 5 0 9 1 9 9Zm0 0c0-8 4-9 9-9 0 3-2 9-9 9Z",
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
];

export type StatsSlide = {
  kind: "stats";
  title: string;
  hist: Record<string, number>;
  avg: number | null;
  ratingCount: number | null;
};

export type ShotSlide = {
  kind: "shot";
  image: string;
  name: string;
};

export type Quote = { app?: string; rating: number; date: string; text: string };

export type Tone = "up" | "down" | "mixed" | "info";

export type InsightSlide = {
  kind: "insight";
  kicker?: string;
  title: string;
  body?: string;
  plus?: string;
  minus?: string;
  count: number;
  tone: Tone;
  quote?: Quote;
  evidence: Quote[];
  pos?: number;
  ofTotal?: number;
};

export type ChapterSlide = {
  kind: "chapter";
  index: number;
  total: number;
  heading: string;
  dek: string;
};

export type IdeaSlide = {
  kind: "idea";
  title: string;
  oneLiner: string;
  pitch: string;
  features: string[];
  apps: number;
  observations: number;
  evidence: Quote[];
};

export type Slide = CoverSlide | StatsSlide | ShotSlide | ChapterSlide | InsightSlide | IdeaSlide;

const TONE = {
  up: { glow: "#4ade80", label: { ru: "Хвалят", en: "Loved" } },
  down: { glow: "#ff8585", label: { ru: "Не нравится", en: "Disliked" } },
  mixed: { glow: "#f5b301", label: { ru: "Спорно", en: "Mixed" } },
  info: { glow: "var(--color-text-tertiary)", label: { ru: "Наблюдение", en: "Observation" } },
} as const;

// Card box: tall portrait on mobile, wider/shorter on desktop.
const BOX = "h-[78svh] max-h-[680px] min-h-[520px] sm:h-[66svh] sm:max-h-[560px] sm:min-h-[460px]";

function obsWord(n: number, ru: boolean): string {
  if (!ru) return n === 1 ? "observation" : "observations";
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

export default function CardCarousel({ slides, locale = "ru", layout = "carousel" }: { slides: Slide[]; locale?: "ru" | "en"; layout?: "carousel" | "feed" }) {
  const ru = locale !== "en";
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Centre detection + programmatic scroll are measurement-based (read each
  // slide's real offset) so they work with the peek layout where a slide is
  // narrower than the scrollport.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < el.children.length; i++) {
          const c = el.children[i] as HTMLElement;
          const cc = c.offsetLeft + c.clientWidth / 2;
          const d = Math.abs(cc - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        setActive(best);
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
    const child = el.children[clamped] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2, behavior: "smooth" });
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

  const renderCard = (s: Slide) =>
    s.kind === "cover" ? (
      <Cover s={s} ru={ru} />
    ) : s.kind === "stats" ? (
      <Stats s={s} ru={ru} />
    ) : s.kind === "shot" ? (
      <Shot s={s} ru={ru} />
    ) : s.kind === "chapter" ? (
      <Chapter s={s} ru={ru} />
    ) : s.kind === "idea" ? (
      <IdeaCard s={s} ru={ru} />
    ) : (
      <Insight s={s} ru={ru} />
    );

  // Vertical feed: cards stacked, each revealing as it scrolls into view.
  if (layout === "feed") {
    return (
      <LayoutCtx.Provider value="feed">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
          {slides.map((s, i) => (
            <Reveal key={i}>{renderCard(s)}</Reveal>
          ))}
        </div>
      </LayoutCtx.Provider>
    );
  }

  return (
    <LayoutCtx.Provider value="carousel">
    <div className="mx-auto w-full max-w-[520px] select-none outline-none sm:max-w-[760px]" onKeyDown={onKey} tabIndex={0}>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-[5%] py-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-[9%] [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
            maskImage: "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)",
          }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              className="w-[90%] shrink-0 snap-center transition-[opacity,transform] duration-300 will-change-transform sm:w-[86%]"
              style={{ opacity: i === active ? 1 : 0.4, transform: i === active ? "scale(1)" : "scale(0.93)" }}
            >
              {renderCard(s)}
            </div>
          ))}
        </div>

        {/* Edge arrows (desktop) */}
        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label={ru ? "Назад" : "Previous"}
          disabled={active === 0}
          className="absolute left-[-6px] top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] shadow-lg transition-opacity hover:text-[var(--color-text-primary)] disabled:opacity-0 sm:flex"
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
          className="absolute right-[-6px] top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] shadow-lg transition-opacity hover:text-[var(--color-text-primary)] disabled:opacity-0 sm:flex"
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
    </LayoutCtx.Provider>
  );
}

// A slide is a fixed-height story frame in the carousel; in the feed it grows
// to fit its content (no inner scroll, no clipped text).
function Frame({ children, glow }: { children: React.ReactNode; glow?: string }) {
  const box = useContext(LayoutCtx) === "feed" ? "min-h-[300px]" : BOX;
  return (
    <div
      className={`relative flex ${box} w-full flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] sm:p-8`}
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
  const salute = s.icons?.filter(Boolean).slice(0, SALUTE_POS.length) ?? [];
  return (
    <Frame glow="var(--color-text-brand)">
      {salute.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {salute.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className={`ld-float absolute block rounded-[14px] opacity-50 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85)] sm:opacity-60 ${SALUTE_SIZE[i % SALUTE_SIZE.length]} ${SALUTE_POS[i]}`}
              style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${i % 2 ? 7 : -7}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
            />
          ))}
          {/* центральный скрим, чтобы текст читался поверх иконок */}
          <span className="absolute inset-0" style={{ background: "radial-gradient(58% 46% at 50% 50%, var(--color-surface-card) 38%, transparent 100%)" }} />
        </div>
      )}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
        {s.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.icon} alt="" className="size-20 rounded-[22px] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]" />
        ) : null}
        <h1 className="text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)]">{s.name}</h1>
        {s.description && (
          <p className="max-w-[30ch] text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{s.description}</p>
        )}
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
      <div className="relative flex items-center justify-center text-caption text-[var(--color-text-tertiary)]">
        <span className="font-semibold tracking-tight text-[var(--color-text-secondary)]">inapp.pro</span>
      </div>
    </Frame>
  );
}

function Stats({ s, ru }: { s: StatsSlide; ru: boolean }) {
  const rows = [5, 4, 3, 2, 1];
  const total = rows.reduce((a, n) => a + (s.hist[String(n)] ?? 0), 0);
  const max = Math.max(1, ...rows.map((n) => s.hist[String(n)] ?? 0));
  const color = (star: number) => (star <= 2 ? "#ff8585" : star === 3 ? "#f5b301" : "var(--color-text-tertiary)");
  return (
    <Frame glow="var(--color-text-brand)">
      <div className="relative mb-2">
        <span className="inline-flex rounded-full bg-[var(--color-bg-muted)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[var(--color-text-secondary)]">
          {ru ? "Оценки" : "Ratings"}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col justify-center gap-6">
        {s.avg != null && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-[52px] font-bold leading-none tabular-nums text-[var(--color-text-primary)]">{s.avg.toFixed(1)}</div>
            <div className="text-[18px] tabular-nums tracking-tight text-[#f5b301]">
              {"★".repeat(Math.round(s.avg))}
              {"☆".repeat(Math.max(0, 5 - Math.round(s.avg)))}
            </div>
            {s.ratingCount != null && (
              <div className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
                {s.ratingCount.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "оценок" : "ratings"}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {rows.map((star) => {
            const count = s.hist[String(star)] ?? 0;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2.5 text-caption text-[var(--color-text-tertiary)]">
                <span className="w-6 shrink-0 tabular-nums">{star}★</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (count / max) * 100)}%`, background: color(star) }} />
                </span>
                <span className="w-9 shrink-0 text-right tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-caption text-[var(--color-text-tertiary)]">{s.title}</span>
        <span className="text-caption font-semibold tracking-tight text-[var(--color-text-tertiary)]">inapp.pro</span>
      </div>
    </Frame>
  );
}

// Standalone screenshot slide between text cards — full-bleed, no black frames;
// label + wordmark overlaid on gradient scrims for legibility.
function Shot({ s, ru }: { s: ShotSlide; ru: boolean }) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const box = useContext(LayoutCtx) === "feed" ? "h-[70svh] max-h-[620px] min-h-[440px]" : BOX;
  return (
    <div className={`relative flex ${box} w-full flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
      <div className="relative z-10 flex items-center justify-between gap-2 p-5">
        <span className="inline-flex rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
          {ru ? "Экран" : "Screen"}
        </span>
        <span className="truncate text-caption font-medium text-white/85">{s.name}</span>
      </div>
      <div className="relative z-10 mt-auto flex justify-end p-5">
        <span className="text-caption font-semibold tracking-tight text-white/85">inapp.pro</span>
      </div>
    </div>
  );
}

// Chapter divider — announces the next narrative beat of the category story.
function Chapter({ s, ru }: { s: ChapterSlide; ru: boolean }) {
  return (
    <Frame glow="var(--color-text-brand)">
      <div aria-hidden className="pointer-events-none absolute inset-0 text-[var(--color-text-brand)]">
        {SALUTE_POS.map((pos, i) => (
          <span
            key={i}
            className={`ld-float absolute block opacity-[0.16] ${SALUTE_SIZE[i % SALUTE_SIZE.length]} ${pos}`}
            style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${i % 2 ? 7 : -7}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-full">
              <path d={CHAPTER_GLYPHS[i % CHAPTER_GLYPHS.length]} />
            </svg>
          </span>
        ))}
        <span className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 50%, var(--color-surface-card) 30%, transparent 100%)" }} />
      </div>
      <div className="relative flex flex-1 flex-col justify-center gap-5">
        <span className="text-caption font-bold tracking-[0.02em] text-[var(--color-text-brand)]">
          {(ru ? "Глава " : "Chapter ") + s.index} · {s.total}
        </span>
        <h2 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[34px]">{s.heading}</h2>
        <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{s.dek}</p>
      </div>
      <div className="relative flex items-center justify-end">
        <span className="text-caption font-semibold tracking-tight text-[var(--color-text-tertiary)]">inapp.pro</span>
      </div>
    </Frame>
  );
}

// Reusable reviews bottom-sheet, shared by insight and idea cards.
function ReviewsDialog({
  dref,
  glow,
  kicker,
  title,
  evidence,
  total,
  ru,
}: {
  dref: React.RefObject<HTMLDialogElement | null>;
  glow: string;
  kicker: string;
  title: string;
  evidence: Quote[];
  total?: number;
  ru: boolean;
}) {
  return (
    <dialog
      ref={dref}
      onClose={() => {
        document.documentElement.style.overflow = "";
      }}
      onClick={(e) => {
        if (e.target === dref.current) dref.current?.close();
      }}
      className="mx-0 mb-0 mt-auto w-full max-w-none rounded-[var(--radius-2xl)] rounded-b-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-left text-[var(--color-text-primary)] backdrop:bg-black/70 sm:mx-auto sm:mb-auto sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:rounded-b-[var(--radius-2xl)]"
    >
      <div className="flex max-h-[85vh] flex-col sm:max-h-[80vh]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide" style={{ background: `color-mix(in srgb, ${glow} 18%, transparent)`, color: glow }}>
              {kicker}
            </span>
            <span className="text-lead font-semibold leading-snug">{title}</span>
            {total != null && total > evidence.length && (
              <span className="text-caption text-[var(--color-text-tertiary)]">
                {ru ? `Показываем ${evidence.length} примеров из ${total} наблюдений` : `Showing ${evidence.length} of ${total} observations`}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => dref.current?.close()}
            aria-label={ru ? "Закрыть" : "Close"}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] outline-none transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col overflow-y-auto overscroll-contain px-4 py-1">
          {evidence.map((e, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] py-4 first:border-t-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {e.app && <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{e.app}</span>}
                <span className="tabular-nums text-caption text-[#f5b301]">
                  {"★".repeat(e.rating)}
                  {"☆".repeat(Math.max(0, 5 - e.rating))}
                </span>
                {e.date && <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>}
              </span>
              <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{e.text}</p>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

function IdeaCard({ s, ru }: { s: IdeaSlide; ru: boolean }) {
  const glow = "var(--color-text-brand)";
  const dialog = useRef<HTMLDialogElement>(null);
  const openReviews = () => {
    document.documentElement.style.overflow = "hidden";
    dialog.current?.showModal();
  };
  return (
    <Frame glow={glow}>
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide" style={{ background: `color-mix(in srgb, ${glow} 18%, transparent)`, color: glow }}>
          {ru ? "Идея" : "Idea"}
        </span>
        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {s.apps} {ru ? "прил." : "apps"} · {s.observations} {ru ? "набл." : "obs"}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden">
        <h2 className="text-[22px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)]">{s.title}</h2>
        <p className="line-clamp-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]">{s.oneLiner}</p>
        {s.pitch && (
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</span>
            <p className="line-clamp-4 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{s.pitch}</p>
          </div>
        )}
        {s.features.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {s.features.slice(0, 4).map((f, i) => (
              <span key={i} className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-2.5 py-1 text-caption text-[var(--color-text-secondary)]">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={openReviews}
          disabled={s.evidence.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums ring-1 ring-transparent transition-all duration-200 hover:ring-[color-mix(in_srgb,var(--glow)_55%,transparent)] disabled:cursor-default disabled:opacity-100"
          style={{ background: `color-mix(in srgb, ${glow} 16%, transparent)`, color: glow, ["--glow" as string]: glow }}
        >
          {s.observations} {obsWord(s.observations, ru)}
          {s.evidence.length > 0 && (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span className="text-caption font-semibold tracking-tight text-[var(--color-text-tertiary)]">inapp.pro</span>
      </div>

      <ReviewsDialog dref={dialog} glow={glow} kicker={ru ? "Идея" : "Idea"} title={s.title} evidence={s.evidence} total={s.observations} ru={ru} />
    </Frame>
  );
}

function Insight({ s, ru }: { s: InsightSlide; ru: boolean }) {
  const tone = TONE[s.tone];
  const dialog = useRef<HTMLDialogElement>(null);
  const openReviews = () => {
    document.documentElement.style.overflow = "hidden";
    dialog.current?.showModal();
  };

  const toneTag = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide"
      style={{ background: `color-mix(in srgb, ${tone.glow} 18%, transparent)`, color: tone.glow }}
    >
      {s.kicker || tone.label[ru ? "ru" : "en"]}
    </span>
  );
  const pos =
    s.pos != null && s.ofTotal != null ? (
      <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
        {s.pos}/{s.ofTotal}
      </span>
    ) : null;
  const countButton = (
    <button
      type="button"
      onClick={openReviews}
      disabled={s.evidence.length === 0}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums ring-1 ring-transparent transition-all duration-200 hover:ring-[color-mix(in_srgb,var(--glow)_55%,transparent)] disabled:cursor-default disabled:opacity-100"
      style={{ background: `color-mix(in srgb, ${tone.glow} 16%, transparent)`, color: tone.glow, ["--glow" as string]: tone.glow }}
    >
      {s.count} {obsWord(s.count, ru)}
      {s.evidence.length > 0 && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
  const wordmark = <span className="text-caption font-semibold tracking-tight text-[var(--color-text-tertiary)]">inapp.pro</span>;

  return (
    <Frame glow={tone.glow}>
      <div className="relative mb-4 flex items-center justify-between">
        {toneTag}
        {pos}
      </div>

      <div className="relative flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <h2 className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[21px]">{s.title}</h2>

        {s.body ? (
          <p className="text-[14px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[14.5px]">{s.body}</p>
        ) : s.tone === "mixed" ? (
          // Both polarities present — keep the +/− markers so they read apart.
          <>
            {s.plus && (
              <p className="flex items-start gap-2 text-[14px] leading-[1.5]">
                <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#4ade80_22%,transparent)] text-[12px] font-bold leading-none text-[#4ade80]">+</span>
                <span className="line-clamp-4 text-[var(--color-text-secondary)]">{s.plus}</span>
              </p>
            )}
            {s.minus && (
              <p className="flex items-start gap-2 text-[14px] leading-[1.5]">
                <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#ff8585_22%,transparent)] text-[13px] font-bold leading-none text-[#ff8585]">−</span>
                <span className="line-clamp-4 text-[var(--color-text-secondary)]">{s.minus}</span>
              </p>
            )}
          </>
        ) : (
          // The tone tag already says praise/gripe — drop the marker, just a lede.
          (s.plus || s.minus) && (
            <p className="line-clamp-[7] text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{s.plus || s.minus}</p>
          )
        )}

        {!s.body && s.quote && (
          <figure className="mt-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3.5">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {s.quote.app && <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{s.quote.app}</span>}
              <span className="text-caption tabular-nums text-[#f5b301]">
                {"★".repeat(s.quote.rating)}
                {"☆".repeat(Math.max(0, 5 - s.quote.rating))}
              </span>
              <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{s.quote.date}</span>
            </div>
            <p className="line-clamp-3 text-[13px] italic leading-relaxed text-[var(--color-text-secondary)]">“{s.quote.text}”</p>
          </figure>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        {countButton}
        {wordmark}
      </div>

      <ReviewsDialog dref={dialog} glow={tone.glow} kicker={s.kicker || tone.label[ru ? "ru" : "en"]} title={s.title} evidence={s.evidence} total={s.count} ru={ru} />
    </Frame>
  );
}
