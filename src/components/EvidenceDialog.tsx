"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { EvidenceReview, NeedForkStat } from "@/lib/needsGap";

// The proof layer. Sub-problem tags and per-app rows double as triggers: clicking
// one opens the real reviews behind that count, pre-filtered to it. Inside, the
// app and problem filters combine freely — every count traces to readable reviews
// with the exact phrase that earned the label (highlighted), so nothing is taken
// on faith. The reviews are fetched on demand (/api/evidence) so a page never
// ships more than the aggregate numbers. Strings are precomputed on the server
// (i18n functions don't cross the client boundary).

export type EvidenceApp = {
  id: string;
  name: string;
  icon: string | null;
  complaints: number;
  complaintsText: string; // precomputed complaintsLabel(complaints)
  forks: NeedForkStat[];
};

const WINDOW = 20; // reviews rendered per page of the autoloader

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
  options: { value: string; label: string; count: number }[];
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
            {o.label}
            <span className="tabular-nums opacity-70">{o.count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

type Source = { kind: "segment"; slug: string } | { kind: "app"; productId: string };

export default function EvidenceDialog({
  source,
  needKey,
  title,
  total,
  forks,
  apps,
  seeAllLabel,
  appsBreakdownLabel,
  shownWord,
  ofWord,
  allLabel,
  byAppLabel,
  byProblemLabel,
  methodNote,
  loadingLabel,
  emptyLabel,
  errorLabel,
  translatedLabel,
  closeLabel,
}: {
  source: Source;
  needKey: string;
  title: string;
  total: number;
  forks: NeedForkStat[]; // need-level sub-problems that double as triggers
  apps?: EvidenceApp[]; // per-app breakdown (segment view only)
  seeAllLabel: string; // fallback trigger when the need has no sub-threads
  appsBreakdownLabel: string;
  shownWord: string;
  ofWord: string;
  allLabel: string;
  byAppLabel: string;
  byProblemLabel: string;
  methodNote: string;
  loadingLabel: string;
  emptyLabel: string;
  errorLabel: string;
  translatedLabel: string;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [app, setApp] = useState<string | null>(null);
  const [fork, setFork] = useState<string | null>(null);
  const [reviews, setReviews] = useState<EvidenceReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(WINDOW);
  const [opened, setOpened] = useState(false); // gate the fetch until first open

  // App filter options (segment only): value = product id, count from aggregation
  // so a chip number never shifts with the current selection.
  const appOptions = (apps ?? []).map((a) => ({ value: a.id, label: a.name, count: a.complaints }));
  const forkOptions = forks.map((f) => ({ value: f.key, label: f.label, count: f.mentions }));

  // Fetch the reviews behind the current app×fork combination on demand. The
  // server applies the same dedupe/primary-fork logic as the aggregation, so the
  // returned count matches the chips. AbortController drops stale responses.
  useEffect(() => {
    if (!opened) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ kind: source.kind, need: needKey });
    if (source.kind === "segment") params.set("slug", source.slug);
    else params.set("product", source.productId);
    if (fork) params.set("fork", fork);
    if (app) params.set("app", app);

    fetch(`/api/evidence?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { reviews?: EvidenceReview[] }) => {
        setReviews(data.reviews ?? []);
        setError(false);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setReviews([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [opened, source, needKey, app, fork]);

  // Autoloader: reveal another window when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => v + WINDOW);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [reviews.length, loading]);

  // Setting the loading flag and resetting the autoloader live in the handlers
  // (not the effect) so the effect only synchronizes with the network.
  const selectApp = (v: string | null) => {
    setLoading(true);
    setVisible(WINDOW);
    setApp(v);
  };
  const selectFork = (v: string | null) => {
    setLoading(true);
    setVisible(WINDOW);
    setFork(v);
  };
  const open = (nextApp: string | null, nextFork: string | null) => {
    setLoading(true);
    setVisible(WINDOW);
    setApp(nextApp);
    setFork(nextFork);
    setOpened(true);
    ref.current?.showModal();
  };

  const hasFilters = appOptions.length > 1 || forkOptions.length > 1;
  const shown = Math.min(visible, reviews.length);

  return (
    <>
      {forks.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {forks.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => open(null, f.key)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-muted)] px-2.5 py-1 text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {f.label}
              <span className="tabular-nums text-[var(--color-text-tertiary)]">{f.mentions}</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => open(null, null)}
          className="self-start rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
        >
          {seeAllLabel}
        </button>
      )}

      {apps && apps.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            {appsBreakdownLabel}
          </span>
          {apps.map((a) => (
            <div key={a.id} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => open(a.id, null)}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 self-start text-left transition-opacity hover:opacity-70"
              >
                {a.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon} alt="" className="size-6 shrink-0 rounded-[var(--radius-md)] object-cover" />
                )}
                <span className="text-[14px] text-[var(--color-text-primary)]">{a.name}</span>
                <span className="tabular-nums text-[12px] text-[var(--color-accent-danger)]">{a.complaintsText}</span>
              </button>
              {a.forks.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {a.forks.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => open(a.id, f.key)}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    >
                      {f.label}
                      <span className="tabular-nums text-[var(--color-text-tertiary)]">{f.mentions}</span>
                    </button>
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <dialog
        ref={ref}
        onClose={() => setOpened(false)}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="mx-0 mb-0 mt-auto w-full max-w-none rounded-[var(--radius-xl)] rounded-b-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-[var(--color-text-primary)] backdrop:bg-black/60 max-sm:animate-[sheet-up_0.28s_cubic-bezier(0.32,0.72,0,1)] max-sm:backdrop:animate-[sheet-backdrop-in_0.28s_ease-out] sm:mx-auto sm:mb-auto sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-b-[var(--radius-xl)]"
      >
        <div className="flex max-h-[85vh] flex-col sm:max-h-[80vh]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{title}</span>
              <span className="text-[12px] text-[var(--color-text-tertiary)]">
                {shownWord} {reviews.length} {ofWord} {total}
              </span>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={closeLabel}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {hasFilters && (
            <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] p-4">
              <FilterRow
                label={byProblemLabel}
                allLabel={allLabel}
                options={forkOptions}
                selected={fork}
                onSelect={selectFork}
              />
              <FilterRow
                label={byAppLabel}
                allLabel={allLabel}
                options={appOptions}
                selected={app}
                onSelect={selectApp}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {loading ? (
              <span className="py-6 text-center text-[13px] text-[var(--color-text-tertiary)]">{loadingLabel}</span>
            ) : error ? (
              <span className="py-6 text-center text-[13px] text-[var(--color-accent-danger)]">{errorLabel}</span>
            ) : reviews.length === 0 ? (
              <span className="py-6 text-center text-[13px] text-[var(--color-text-tertiary)]">{emptyLabel}</span>
            ) : (
              <>
                {reviews.slice(0, shown).map((e, i) => (
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
                      {e.translated && (
                        <span className="rounded-full bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-tertiary)]">
                          {translatedLabel}
                        </span>
                      )}
                    </span>
                    {e.title && <span className="text-[13px] font-medium">{e.title}</span>}
                    <p className="text-[13px] leading-[19px] text-[var(--color-text-secondary)]">
                      {highlight(e.text, e.match)}
                    </p>
                  </div>
                ))}
                {shown < reviews.length && <div ref={sentinel} className="h-1" />}
              </>
            )}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] p-3">
            <span className="text-[11px] leading-[16px] text-[var(--color-text-tertiary)]">{methodNote}</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
