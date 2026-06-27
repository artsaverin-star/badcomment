"use client";

import { useState } from "react";

// Compact authenticity chip on a rating row. Shows just the verdict word; the
// full explanation opens in a popup on tap (keeps the row clean).
export default function RatingAuthBadge({
  label, word, note, bg, fg, closeLabel,
}: { label: string; word: string; note: string; bg: string; fg: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  const hasNote = !!note?.trim();
  return (
    <>
      <button
        type="button"
        onClick={hasNote ? () => setOpen(true) : undefined}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-opacity hover:opacity-80"
        style={{ background: bg, color: fg, cursor: hasNote ? "pointer" : "default" }}
        aria-haspopup={hasNote ? "dialog" : undefined}
      >
        {word}
        {hasNote && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="opacity-70"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" /><path d="M6 5.2v2.6M6 3.6v.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
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
