"use client";

import { useState } from "react";

// Authenticity plaque on a rating row. Same square card shape as the
// store/people score plaques next to it; the full explanation opens in a
// popup on tap (keeps the row clean).
export default function RatingAuthBadge({
  caption, label, word, note, fg, detailsLabel, closeLabel,
}: { caption: string; label: string; word: string; note: string; fg: string; detailsLabel: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const hasNote = !!note?.trim();
  return (
    <>
      <button
        type="button"
        onClick={hasNote ? () => setOpen(true) : undefined}
        className="rounded-[12px] border border-[var(--color-border-subtle)] px-3 py-2 text-left transition-opacity hover:opacity-80"
        style={{ cursor: hasNote ? "pointer" : "default" }}
        aria-haspopup={hasNote ? "dialog" : undefined}
      >
        <div className="text-[11.5px] text-[var(--color-text-tertiary)]">{caption}</div>
        <div className="mt-1 text-[18px] font-semibold leading-none" style={{ color: fg }}>{word}</div>
        {hasNote && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-text-tertiary)]">
            {detailsLabel}
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="opacity-70"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" /><path d="M6 5.2v2.6M6 3.6v.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </div>
        )}
      </button>

      {open && hasNote && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[420px] rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-5 shadow-[0_-20px_70px_-20px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[12px] font-medium tracking-[0.02em]" style={{ color: fg }}>{label}: {word}</div>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{note}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full bg-[var(--color-button-secondary-bg)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
