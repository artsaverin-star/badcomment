"use client";

import { useRef, type ReactNode } from "react";
import type { NeedEvidence } from "@/lib/needsGap";

// The proof layer: a button that opens the real reviews behind a need's number.
// Every count must be traceable to readable reviews with the exact phrase that
// put each one there (highlighted) — so nothing on screen is taken on faith.
// Strings are precomputed on the server (i18n functions don't cross the
// client boundary); only plain data is passed in.

function highlight(text: string, match: string): ReactNode {
  if (!match) return text;
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[var(--radius-sm)] bg-[var(--color-accent-danger)]/15 px-0.5 text-[var(--color-text-primary)]">
        {text.slice(idx, idx + match.length)}
      </mark>
      {text.slice(idx + match.length)}
    </>
  );
}

export default function EvidenceDialog({
  buttonLabel,
  title,
  shownOf,
  methodNote,
  closeLabel,
  evidence,
}: {
  buttonLabel: string;
  title: string;
  shownOf: string;
  methodNote: string;
  closeLabel: string;
  evidence: NeedEvidence[];
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="self-start rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
      >
        {buttonLabel}
      </button>

      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-2xl rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-[var(--color-text-primary)] backdrop:bg-black/60"
      >
        <div className="flex max-h-[80vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{title}</span>
              <span className="text-[12px] text-[var(--color-text-tertiary)]">{shownOf}</span>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--color-bg-muted)]"
            >
              {closeLabel}
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {e.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.icon} alt="" className="size-5 shrink-0 rounded-[var(--radius-md)] object-cover" />
                  )}
                  <span className="text-[13px] font-medium">{e.app}</span>
                  <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(Math.max(0, 5 - e.rating))}
                  </span>
                </span>
                {e.title && <span className="text-[13px] font-medium">{e.title}</span>}
                <p className="text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                  {highlight(e.text, e.match)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] p-3">
            <span className="text-[11px] leading-[16px] text-[var(--color-text-tertiary)]">{methodNote}</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
