"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Per-app review reader. The app's OWN themes are the navigation, grouped the
// way people actually ask about them: what gets praised, what gets complained
// about, what splits opinion. Picking a theme filters the stream below, and
// stars and free text narrow it further.
//
// The first screen is server-rendered (readable and indexable without JS); the
// full review file is prefetched in the background right after mount, so every
// filter after that is instant and nothing ever shows a spinner mid-read.

export type Theme = { name: string; nameEn: string; count: number; polarity: "love" | "pain" | "mixed" };
export type Review = { rating: number; text: string; theme: string };

const PAGE = 30;

function Stars({ n }: { n: number }) {
  const v = Math.max(1, Math.min(5, n));
  return (
    <span className="shrink-0 text-caption tabular-nums" aria-label={`${v}/5`}>
      <span className="text-[var(--color-text-secondary)]">{"★".repeat(v)}</span>
      <span className="text-[var(--color-border-strong)]">{"★".repeat(5 - v)}</span>
    </span>
  );
}

function Chip({
  on,
  onClick,
  disabled = false,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-caption transition-colors disabled:opacity-40 ${
        on
          ? "border-transparent bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
          : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function ReviewBrowser({
  slug,
  id,
  themes,
  total,
  initial,
  ratingCounts,
  ru,
}: {
  slug: string;
  id: string;
  themes: Theme[];
  total: number;
  initial: Review[];
  ratingCounts: number[];
  ru: boolean;
}) {
  const [all, setAll] = useState<Review[] | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [worstFirst, setWorstFirst] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const loading = useRef(false);
  const lc = ru ? "ru-RU" : "en-US";

  const load = useCallback(async () => {
    if (all || loading.current) return;
    loading.current = true;
    try {
      const r = await fetch(`/reviews/${slug}/${encodeURIComponent(id)}.json`).then((x) => (x.ok ? x.json() : null));
      setAll(Array.isArray(r?.reviews) ? (r.reviews as Review[]) : []);
    } catch {
      setAll([]);
    }
    loading.current = false;
  }, [all, slug, id]);

  // Warm the full file as soon as the browser is idle, so the first filter tap
  // is instant instead of waiting on a fetch.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void load());
    else setTimeout(() => void load(), 400);
  }, [load]);

  const reset = () => {
    setTheme(null);
    setStars(null);
    setQ("");
    setLimit(PAGE);
  };

  const pool = all ?? initial;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = pool.filter(
      (r) =>
        (!theme || r.theme === theme) &&
        (!stars || r.rating === stars) &&
        (!needle || r.text.toLowerCase().includes(needle)),
    );
    return list.sort((a, b) => (worstFirst ? a.rating - b.rating : b.rating - a.rating));
  }, [pool, theme, stars, q, worstFirst]);

  const filtered = !!theme || !!stars || !!q.trim();
  // Before the full file lands only the server slice is filterable, so counts
  // come from the index instead of from what happens to be in memory.
  const exact = all !== null;
  const matched = exact ? shown.length : theme ? (themes.find((t) => t.name === theme)?.count ?? shown.length) : total;
  const activeTheme = themes.find((t) => t.name === theme);

  const groups = (
    [
      { key: "love", label: ru ? "Хвалят" : "Praised" },
      { key: "pain", label: ru ? "Ругают" : "Complained about" },
      { key: "mixed", label: ru ? "Смешанно" : "Mixed" },
    ] as const
  )
    .map((g) => ({ ...g, items: themes.filter((t) => t.polarity === g.key).sort((a, b) => b.count - a.count) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mt-10">
      <h2 className="text-title3 text-[var(--color-text-primary)]">{ru ? "О чём пишут" : "What people write about"}</h2>
      <p className="mt-1.5 max-w-[58ch] text-footnote text-[var(--color-text-secondary)]">
        {ru
          ? "Темы этого приложения, а не общие ярлыки. Нажми тему, чтобы читать только её отзывы."
          : "This app's own themes, not generic labels. Tap a theme to read only its reviews."}
      </p>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {groups.map((g) => (
          <div key={g.key} className="min-w-0 flex-1">
            <h3 className="border-b border-[var(--color-border-subtle)] pb-2 text-caption text-[var(--color-text-tertiary)]">{g.label}</h3>
            <ul className="flex flex-col">
              {g.items.map((t) => {
                const on = theme === t.name;
                return (
                  <li key={t.name} className="border-b border-[var(--color-border-subtle)]">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme(on ? null : t.name);
                        setLimit(PAGE);
                      }}
                      aria-pressed={on}
                      className="flex w-full items-baseline gap-3 py-2.5 text-left transition-colors"
                    >
                      <span
                        className={`min-w-0 flex-1 text-footnote ${
                          on ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        {ru ? t.name : t.nameEn}
                      </span>
                      <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{t.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Sticky control bar: what you are reading, how many, and the way out. */}
      <div className="sticky top-[4.5rem] z-10 -mx-4 mt-8 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-4 pb-2.5 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-footnote text-[var(--color-text-primary)]">
            {activeTheme ? (ru ? activeTheme.name : activeTheme.nameEn) : ru ? "Все отзывы" : "All reviews"}
            <span className="ml-1.5 tabular-nums text-[var(--color-text-tertiary)]">{matched.toLocaleString(lc)}</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Chip on={false} onClick={() => setWorstFirst((v) => !v)}>
              {worstFirst ? (ru ? "сначала плохие" : "worst first") : ru ? "сначала хорошие" : "best first"}
            </Chip>
            {filtered && (
              <Chip on={false} onClick={reset}>
                {ru ? "сбросить" : "clear"}
              </Chip>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = ratingCounts[n - 1] ?? 0;
            const on = stars === n;
            return (
              <Chip
                key={n}
                on={on}
                disabled={!c}
                onClick={() => {
                  setStars(on ? null : n);
                  setLimit(PAGE);
                }}
              >
                {n}★ <span className="tabular-nums opacity-60">{c}</span>
              </Chip>
            );
          })}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          placeholder={ru ? "поиск по тексту отзывов" : "search review text"}
          className="mt-2 w-full rounded-full border border-[var(--color-border-subtle)] bg-transparent px-4 py-2 text-footnote text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
        />
      </div>

      {!exact && (
        <p className="mt-4 text-caption text-[var(--color-text-tertiary)]">
          {ru ? "подгружаю остальные отзывы" : "loading the rest of the reviews"}
        </p>
      )}

      {exact && shown.length === 0 && (
        <p className="mt-6 text-body text-[var(--color-text-tertiary)]">
          {ru ? "Под эти условия ничего не подошло." : "Nothing matches these filters."}
        </p>
      )}

      <ol className="flex flex-col">
        {shown.slice(0, limit).map((r, i) => (
          <li key={`${i}-${r.rating}`} className="border-b border-[var(--color-border-subtle)] py-3.5">
            <div className="flex items-baseline gap-2.5">
              <Stars n={r.rating} />
              {!theme && (
                <span className="min-w-0 truncate text-caption text-[var(--color-text-tertiary)]">
                  {ru ? r.theme : themes.find((t) => t.name === r.theme)?.nameEn ?? r.theme}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-footnote text-pretty text-[var(--color-text-secondary)]">{r.text}</p>
          </li>
        ))}
      </ol>

      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE * 3)}
          className="mt-5 w-full rounded-full border border-[var(--color-border-subtle)] py-2.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          {ru ? `Показать ещё, осталось ${(shown.length - limit).toLocaleString(lc)}` : `Show more, ${(shown.length - limit).toLocaleString(lc)} left`}
        </button>
      )}
    </div>
  );
}
