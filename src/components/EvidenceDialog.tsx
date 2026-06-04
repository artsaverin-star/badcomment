"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import type { NeedEvidence } from "@/lib/needsGap";

// The proof layer: a button that opens the real reviews behind a need's number.
// Every count must be traceable to readable reviews with the exact phrase that
// put each one there (highlighted) — so nothing on screen is taken on faith.
// The popup is a capped sample of the total; filters narrow it by app and by
// sub-problem. Strings are precomputed on the server (i18n functions don't
// cross the client boundary); only plain data is passed in.

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

function countBy(values: string[]): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors " +
        (active
          ? "bg-[var(--color-accent-brand)] text-[var(--color-button-primary-text)]"
          : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")
      }
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  allLabel: string;
  options: { value: string; count: number }[];
  selected: string | null;
  onSelect: (v: string | null) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={selected === null} onClick={() => onSelect(null)}>
          {allLabel}
        </Chip>
        {options.map((o) => (
          <Chip key={o.value} active={selected === o.value} onClick={() => onSelect(o.value)}>
            {o.value}
            <span className="tabular-nums opacity-70">{o.count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

export default function EvidenceDialog({
  buttonLabel,
  title,
  total,
  shownWord,
  ofWord,
  allLabel,
  byAppLabel,
  byProblemLabel,
  methodNote,
  closeLabel,
  evidence,
}: {
  buttonLabel: string;
  title: string;
  total: number;
  shownWord: string;
  ofWord: string;
  allLabel: string;
  byAppLabel: string;
  byProblemLabel: string;
  methodNote: string;
  closeLabel: string;
  evidence: NeedEvidence[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [app, setApp] = useState<string | null>(null);
  const [fork, setFork] = useState<string | null>(null);

  const apps = useMemo(() => countBy(evidence.map((e) => e.app).filter(Boolean)), [evidence]);
  const forks = useMemo(() => countBy(evidence.map((e) => e.fork).filter(Boolean)), [evidence]);

  const filtered = evidence.filter((e) => (!app || e.app === app) && (!fork || e.fork === fork));
  const hasFilters = apps.length > 1 || forks.length > 1;

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
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                {shownWord} {filtered.length} {ofWord} {total}
              </span>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--color-bg-muted)]"
            >
              {closeLabel}
            </button>
          </div>

          {hasFilters && (
            <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4">
              <FilterRow label={byProblemLabel} allLabel={allLabel} options={forks} selected={fork} onSelect={setFork} />
              <FilterRow label={byAppLabel} allLabel={allLabel} options={apps} selected={app} onSelect={setApp} />
            </div>
          )}

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {filtered.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {e.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.icon} alt="" className="size-5 shrink-0 rounded-[var(--radius-md)] object-cover" />
                  )}
                  {e.app && <span className="text-[13px] font-medium">{e.app}</span>}
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
