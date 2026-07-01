"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

export type SwipeCard = {
  slug: string;
  category: string;
  categoryName: string;
  title: string;
  oneLiner: string;
  whyPay: string;
  pricePoint: string;
  money: number;
  simplicity: number;
  demand: number;
  composite: number;
};

const META = {
  money: { ru: "Деньги", en: "Money", color: "#30d158" },
  simplicity: { ru: "Простота", en: "Simplicity", color: "#0a84ff" },
  demand: { ru: "Спрос", en: "Demand", color: "#bf5af2" },
} as const;

const GLYPH: Record<"money" | "simplicity" | "demand", React.ReactNode> = {
  money: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.4 9.2c0-1-1.1-1.7-2.4-1.7s-2.5.8-2.5 1.9c0 2.6 5 1.4 5 4 0 1.1-1.2 1.9-2.5 1.9s-2.5-.8-2.5-1.8" /></>,
  simplicity: <path d="M15.6 5.4a3.6 3.6 0 00-4.7 4.7l-5.7 5.7a1.6 1.6 0 002.2 2.2l5.7-5.7a3.6 3.6 0 004.7-4.7l-2.1 2.1-1.7-.5-.5-1.7 2.1-2.1z" />,
  demand: <><path d="M4 16l5-5 3 3 6-6" /><path d="M15 8h4v4" /></>,
};

function MetricPill({ k, value }: { k: "money" | "simplicity" | "demand"; value: number }) {
  const c = META[k].color;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-footnote font-medium tabular-nums text-[var(--color-text-secondary)]" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)` }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPH[k]}</svg>
      {value}
    </span>
  );
}

const SPRING = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease";

// Original left/right swipe card deck. Drag or use the arrows/keys to move
// through ideas; the top card springs back if the drag is short, or flies off
// when it passes the threshold. Transform-only for a smooth 60fps feel.
export default function IdeaSwipeDeck({ cards, locale = "ru" }: { cards: SwipeCard[]; locale?: Locale }) {
  const ru = locale !== "en";
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [flyOff, setFlyOff] = useState<0 | 1 | -1>(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);
  const width = 460;

  const total = cards.length;
  const advance = useCallback((dir: 1 | -1) => {
    setFlyOff(dir);
    window.setTimeout(() => {
      setIndex((i) => (i + 1) % total);
      setFlyOff(0);
      setDrag(0);
    }, 260);
  }, [total]);

  const back = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setDrag(0);
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance(1);
      else if (e.key === "ArrowLeft") { if (index === 0) back(); else back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, index]);

  const onDown = (e: React.PointerEvent) => {
    if (flyOff) return;
    startX.current = e.clientX;
    pointerId.current = e.pointerId;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDrag(e.clientX - startX.current);
  };
  const onUp = () => {
    if (startX.current === null) return;
    const d = drag;
    startX.current = null;
    setDragging(false);
    const threshold = 110;
    if (d <= -threshold) advance(1);
    else if (d >= threshold) { setDrag(0); back(); }
    else setDrag(0);
  };

  if (!total) return null;
  const cur = cards[index];

  const topX = flyOff ? flyOff * (width + 240) : drag;
  const rot = topX / 22;
  const opacity = flyOff ? 0 : 1 - Math.min(Math.abs(drag) / 460, 0.35);
  const progress = Math.min(Math.abs(drag) / 110, 1);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[560px] w-full max-w-[460px] select-none">
        {/* third card */}
        <StackCard depth={2} />
        {/* second card, subtly rises as you drag the top away */}
        <StackCard depth={1} rise={progress} />
        {/* top card */}
        <div
          className="absolute inset-0 touch-none"
          style={{ transform: `translateX(${topX}px) rotate(${rot}deg)`, opacity, transition: dragging ? "none" : SPRING, cursor: dragging ? "grabbing" : "grab", willChange: "transform" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <CardBody c={cur} ru={ru} />
          {/* swipe hint badges */}
          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-[color-mix(in_srgb,#ff6961_60%,transparent)] px-3 py-1 text-footnote font-semibold text-[#ff6961] transition-opacity" style={{ opacity: drag < -20 ? progress : 0 }}>{ru ? "Дальше" : "Skip"}</div>
          <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-[color-mix(in_srgb,#30d158_60%,transparent)] px-3 py-1 text-footnote font-semibold text-[#30d158] transition-opacity" style={{ opacity: drag > 20 ? progress : 0 }}>{ru ? "Назад" : "Back"}</div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-8 flex items-center gap-4">
        <button type="button" aria-label={ru ? "Назад" : "Back"} onClick={back} className="flex size-12 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6" /></svg>
        </button>
        <span className="min-w-[64px] text-center text-footnote tabular-nums text-[var(--color-text-tertiary)]">{index + 1} / {total}</span>
        <button type="button" aria-label={ru ? "Дальше" : "Next"} onClick={() => advance(1)} className="flex size-12 items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 6l6 6-6 6" /></svg>
        </button>
      </div>
      <p className="mt-5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Тяни карточку или жми стрелки" : "Drag the card or use the arrows"}</p>
    </div>
  );
}

function StackCard({ depth, rise = 0 }: { depth: 1 | 2; rise?: number }) {
  const scale = (depth === 1 ? 0.94 : 0.88) + (depth === 1 ? rise * 0.06 : 0);
  const y = (depth === 1 ? 20 : 40) - (depth === 1 ? rise * 20 : 0);
  return (
    <div className="absolute inset-0" style={{ transform: `translateY(${y}px) scale(${scale})`, opacity: depth === 1 ? 0.9 : 0.6, transition: SPRING, willChange: "transform" }} aria-hidden="true">
      <div className="h-full rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]" />
    </div>
  );
}

function CardBody({ c, ru }: { c: SwipeCard; ru: boolean }) {
  return (
    <article className="edge-glow relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-footnote text-[var(--color-text-tertiary)]">{c.categoryName}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent-brand)_16%,transparent)] px-2.5 py-1 text-footnote font-semibold text-[var(--color-text-primary)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M4 20V11M10 20V5M16 20v-6M3 20h18" /></svg>{c.composite}
        </span>
      </div>

      <h2 className="mt-5 text-title1 font-semibold leading-tight text-balance text-[var(--color-text-primary)]">{c.title}</h2>
      <p className="mt-4 text-body text-pretty text-[var(--color-text-secondary)]">{c.oneLiner}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <MetricPill k="money" value={c.money} />
        <MetricPill k="simplicity" value={c.simplicity} />
        <MetricPill k="demand" value={c.demand} />
      </div>

      {c.whyPay && (
        <div className="mt-6 rounded-[16px] bg-[var(--color-bg-muted)] p-4">
          <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Кто и сколько платит" : "Who pays and how much"}</div>
          <p className="mt-1 text-callout text-[var(--color-text-secondary)]">{c.whyPay}</p>
        </div>
      )}

      <a href={`/${ru ? "ru" : "en"}/segment/${c.category}`} className="mt-auto inline-flex items-center gap-1.5 pt-6 text-callout font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]" onPointerDown={(e) => e.stopPropagation()}>
        {ru ? "Открыть разбор ниши" : "Open the niche breakdown"}
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </a>
    </article>
  );
}
