"use client";

import { useState } from "react";

// The "разобранные приложения" grid on a category page. Shows a compact set by
// default (4 on phones, up to 10 on desktop) and reveals the rest on tap, so a
// long catalog doesn't dominate the page on mobile. Tiles are server-rendered
// and passed in as children-by-index.
export default function SegmentAppList({
  tiles,
  total,
  locale = "ru",
}: {
  tiles: React.ReactNode[];
  total: number;
  locale?: "ru" | "en";
}) {
  const ru = locale !== "en";
  const [open, setOpen] = useState(false);

  const btn =
    "flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]";

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tiles.map((node, i) => {
          // `contents` lets the inner tile be the grid cell; `hidden` drops it.
          const cls = open ? "contents" : i < 4 ? "contents" : i < 10 ? "hidden sm:contents" : "hidden";
          return (
            <div key={i} className={cls}>
              {node}
            </div>
          );
        })}
      </div>

      {total > 4 && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          // On desktop the first 10 already show, so the reveal is phone-only
          // unless there are more than 10.
          className={`${btn} ${total > 10 ? "" : "sm:hidden"}`}
        >
          {ru ? "Показать все" : "Show all"}
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {open && (
        <button type="button" onClick={() => setOpen(false)} className={btn}>
          {ru ? "Свернуть" : "Show less"}
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="rotate-180">
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}
