"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Admin cell: a bookmark icon + count; clicking opens a popup listing the exact
// ideas a user saved. Mirrors the TokenHistory pattern used by other columns.
export default function FavoritesCell({ titles, name }: { titles: string[]; name: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!titles.length) return <span className="text-[var(--color-text-tertiary)]">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] px-2.5 py-1 text-footnote font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.9c0-.5.4-.9.9-.9h10.2c.5 0 .9.4.9.9v14.6c0 .34-.39.53-.65.32L12 16.2l-5.35 3.62c-.26.21-.65.02-.65-.32V4.9z" /></svg>
        {titles.length}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative flex max-h-[85vh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] sm:rounded-[22px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-headline text-[var(--color-text-primary)]">{name}</div>
                <div className="text-caption text-[var(--color-text-tertiary)]">{titles.length} в избранном</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <ol className="flex-1 divide-y divide-[var(--color-border-subtle)] overflow-y-auto px-5">
              {titles.map((t, i) => (
                <li key={i} className="flex gap-3 py-3 text-callout text-[var(--color-text-secondary)]">
                  <span className="shrink-0 tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
