"use client";

import { useRef } from "react";

// THE single insight card, shared everywhere (category summary, app page,
// ideas) so the design system stays unified. A card that opens a reviews modal.

export type Evidence = { app?: string; rating: number; date: string; quote: string; quoteRu?: string };

function pluralNabl(n: number, ru: boolean): string {
  if (!ru) return n === 1 ? "observation" : "observations";
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

export default function InsightCard({
  title,
  body,
  apps,
  count,
  kicker,
  evidence,
  plus,
  minus,
  card = false,
  locale = "ru",
}: {
  title: string;
  body?: string;
  apps?: string[];
  count: number;
  kicker?: string;
  evidence: Evidence[];
  plus?: string; // что хвалят
  minus?: string; // на что злятся
  card?: boolean; // boxed card (category summary grid) vs hairline row
  locale?: import("@/lib/i18n").Locale;
}) {
  const ru = locale !== "en";
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => {
    // <html> is the scroll container (globals: overflow-y:scroll) — lock it.
    document.documentElement.style.overflow = "hidden";
    ref.current?.showModal();
  };

  // Tone of the observation, from the average rating of its evidence: люди
  // довольны (👍) или злятся (👎).
  const avg = evidence.length ? evidence.reduce((s, e) => s + (e.rating || 0), 0) / evidence.length : 0;
  const tone: "up" | "down" | "info" = avg >= 3.5 ? "up" : avg > 0 && avg <= 2.6 ? "down" : "info";

  return (
    <>
      <div
        className={
          card
            ? "flex h-full w-full flex-col items-start gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
            : "flex w-full flex-col items-start gap-1.5 border-t border-[var(--color-border-subtle)] py-4 first:border-t-0"
        }
      >
        <span
          className={
            card
              ? "text-callout font-semibold text-[var(--color-text-primary)]"
              : "text-body text-[var(--color-text-primary)]"
          }
        >
          {title}
        </span>
        {body && <span className="text-callout text-[var(--color-text-secondary)]">{body}</span>}
        {plus && (
          <span className="flex items-start gap-2 text-callout">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#4ade80_22%,transparent)] text-caption font-bold leading-none text-[#4ade80]">+</span>
            <span className="text-[var(--color-text-secondary)]">{plus}</span>
          </span>
        )}
        {minus && (
          <span className="flex items-start gap-2 text-callout">
            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,#ff8585_22%,transparent)] text-footnote font-bold leading-none text-[#ff8585]">−</span>
            <span className="text-[var(--color-text-secondary)]">{minus}</span>
          </span>
        )}
        {apps && apps.length > 0 && (
          <span className="text-caption leading-relaxed text-[var(--color-text-tertiary)]">{apps.join(" · ")}</span>
        )}
        <button
          type="button"
          onClick={open}
          className={`${card ? "mt-auto pt-1.5" : "mt-1.5"} flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-bg-muted)] px-3 py-1.5 text-footnote font-semibold tabular-nums text-[var(--color-text-secondary)] ring-1 ring-transparent transition-all duration-200 hover:bg-[var(--color-accent-brand-subtle)] hover:text-[var(--color-text-brand)] hover:ring-[color-mix(in_srgb,var(--color-text-brand)_45%,transparent)]`}
        >
          {tone === "up" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#4ade80" aria-hidden="true">
              <path d="M2 10h3.5v11H2zM7.5 10 12 1.8c1.6.1 2.8 1.5 2.5 3.1L13.8 9h6a2.4 2.4 0 0 1 2.4 2.9l-1.5 7.2A2.4 2.4 0 0 1 18.3 21H7.5V10Z" />
            </svg>
          ) : tone === "down" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff8585" aria-hidden="true">
              <path d="M22 14h-3.5V3H22zM16.5 14 12 22.2c-1.6-.1-2.8-1.5-2.5-3.1L10.2 15h-6a2.4 2.4 0 0 1-2.4-2.9l1.5-7.2A2.4 2.4 0 0 1 5.7 3h10.8v11Z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5.1" r="0.9" fill="currentColor" />
            </svg>
          )}
          {count} {pluralNabl(count, ru)}
        </button>
      </div>

      <dialog
        ref={ref}
        onClose={() => {
          document.documentElement.style.overflow = "";
        }}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="mx-0 mb-0 mt-auto w-full max-w-none rounded-[var(--radius-2xl)] rounded-b-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-[var(--color-text-primary)] backdrop:bg-black/70 sm:mx-auto sm:mb-auto sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-b-[var(--radius-2xl)]"
      >
        <div className="flex max-h-[85vh] flex-col sm:max-h-[80vh]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
            <span className="flex min-w-0 flex-col gap-1">
              {kicker && <span className="text-caption text-[var(--color-text-tertiary)]">{kicker}</span>}
              <span className="text-lead font-semibold leading-snug">{title}</span>
            </span>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={ru ? "Закрыть" : "Close"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] outline-none transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col overflow-y-auto overscroll-contain px-4 py-1">
            {evidence.map((e, i) => (
              <div
                key={i}
                className="rev-in flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] py-4 first:border-t-0"
                style={{ animationDelay: `${Math.min(i, 14) * 0.04}s` }}
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {e.app && <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{e.app}</span>}
                  <span className="tabular-nums text-caption text-[#9aa0a6]">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(Math.max(0, 5 - e.rating))}
                  </span>
                  <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>
                </span>
                <p className="text-footnote italic leading-relaxed text-[var(--color-text-secondary)]">{ru ? e.quoteRu ?? e.quote : e.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
