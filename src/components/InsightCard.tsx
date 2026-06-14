"use client";

import { useRef } from "react";

// THE single insight card, shared everywhere (category summary, app page,
// ideas) so the design system stays unified. A card that opens a reviews modal.

export type Evidence = { app?: string; rating: number; date: string; quote: string };

function pluralNabl(n: number): string {
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
}: {
  title: string;
  body?: string;
  apps?: string[];
  count: number;
  kicker?: string;
  evidence: Evidence[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => {
    // <html> is the scroll container (globals: overflow-y:scroll) — lock it.
    document.documentElement.style.overflow = "hidden";
    ref.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group/card flex w-full flex-col gap-1.5 border-t border-[var(--color-border-subtle)] py-4 text-left first:border-t-0"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-[16px] font-semibold leading-snug text-[var(--color-text-primary)]">{title}</span>
          <span className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-bg-muted)] px-3 py-1.5 text-[13px] font-semibold tabular-nums text-[var(--color-text-secondary)] ring-1 ring-transparent transition-all duration-200 group-hover/card:-translate-y-0.5 group-hover/card:bg-[var(--color-accent-brand-subtle)] group-hover/card:text-[var(--color-text-brand)] group-hover/card:ring-[color-mix(in_srgb,var(--color-text-brand)_45%,transparent)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5.1" r="0.9" fill="currentColor" />
            </svg>
            {count} {pluralNabl(count)}
          </span>
        </span>
        {body && <span className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{body}</span>}
        {apps && apps.length > 0 && (
          <span className="text-[12px] leading-relaxed text-[var(--color-text-tertiary)]">{apps.join(" · ")}</span>
        )}
      </button>

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
              aria-label="Закрыть"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] outline-none transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain p-4">
            {evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {e.app && <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{e.app}</span>}
                  <span className="tabular-nums text-caption text-[#f5b301]">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(Math.max(0, 5 - e.rating))}
                  </span>
                  <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>
                </span>
                <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{e.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
