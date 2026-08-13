"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { plural } from "@/lib/format";

// Per-app review reader. The app's OWN themes are the navigation, grouped the
// way people actually ask about them: what gets praised, what gets complained
// about, what splits opinion. Picking a theme filters the stream below, and
// stars and free text narrow it further.
//
// The first screen is server-rendered (readable and indexable without JS); the
// full review file is prefetched in the background right after mount, so every
// filter after that is instant and nothing ever shows a spinner mid-read.

export type Theme = { name: string; nameEn: string; count: number; polarity: "love" | "pain" | "mixed"; fallback?: boolean };
export type Review = { rating: number; text: string; theme?: string };

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
      const r = await fetch(`/api/reviews/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`).then((x) => (x.ok ? x.json() : null));
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
      { key: "love", label: ru ? "В основном хвалят" : "Mostly praised" },
      { key: "pain", label: ru ? "В основном критикуют" : "Mostly criticised" },
      { key: "mixed", label: ru ? "Мнения расходятся" : "Opinions differ" },
      { key: "fallback", label: ru ? "Без конкретики" : "Unspecific" },
    ] as const
  )
    .map((g) => ({
      ...g,
      items: themes
        .filter((t) => (g.key === "fallback" ? t.fallback : !t.fallback && t.polarity === g.key))
        .sort((a, b) => b.count - a.count),
    }))
    .filter((g) => g.items.length > 0);

  const activeThemeReviews = all && activeTheme ? all.filter((review) => review.theme === activeTheme.name) : [];
  const activeRatings = [0, 0, 0, 0, 0];
  for (const review of activeThemeReviews) activeRatings[Math.max(1, Math.min(5, review.rating)) - 1]++;
  const activeTotal = activeRatings.reduce((sum, count) => sum + count, 0);
  const activePositive = activeTotal ? ((activeRatings[3] + activeRatings[4]) / activeTotal) * 100 : 0;
  const activeNeutral = activeTotal ? (activeRatings[2] / activeTotal) * 100 : 0;
  const activeNegative = activeTotal ? ((activeRatings[0] + activeRatings[1]) / activeTotal) * 100 : 0;

  // The canonical rating block (big average + tappable star histogram) — the
  // shape every store teaches people to read. The average is honest: it is the
  // average of the reviews we read, not the store rating.
  const histTotal = ratingCounts.reduce((a, b) => a + b, 0);
  const avg = histTotal ? ratingCounts.reduce((a, c, i) => a + c * (i + 1), 0) / histTotal : 0;
  const maxStars = Math.max(...ratingCounts, 1);

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-5 border-y border-[var(--color-border-subtle)] py-5 sm:flex-row sm:items-center sm:gap-10">
        <div className="shrink-0">
          <div className="text-stat tabular-nums text-[var(--color-text-primary)]">{avg.toFixed(1)}</div>
          <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
            {ru
              ? `из 5, по ${histTotal.toLocaleString(lc)} ${plural(histTotal, "прочитанному отзыву", "прочитанным отзывам", "прочитанным отзывам")}`
              : `of 5, across ${histTotal.toLocaleString(lc)} ${histTotal === 1 ? "review" : "reviews"}`}
          </div>
          <p className="mt-1 max-w-[20ch] text-caption leading-snug text-[var(--color-text-tertiary)]">
            {ru ? "Это профиль корпуса, не текущий рейтинг магазина" : "Corpus profile, not the current store rating"}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = ratingCounts[n - 1] ?? 0;
            const on = stars === n;
            return (
              <button
                key={n}
                type="button"
                disabled={!c}
                aria-pressed={on}
                aria-label={ru
                  ? `${n} ${plural(n, "звезда", "звезды", "звёзд")}: ${c.toLocaleString(lc)} ${plural(c, "отзыв", "отзыва", "отзывов")}`
                  : `${n} ${n === 1 ? "star" : "stars"}: ${c.toLocaleString(lc)} ${c === 1 ? "review" : "reviews"}`}
                onClick={() => {
                  setStars(on ? null : n);
                  setLimit(PAGE);
                }}
                className="flex w-full items-center gap-3 py-[5px] disabled:opacity-40"
              >
                <span className={`w-6 shrink-0 text-left text-caption tabular-nums ${on ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                  {n}★
                </span>
                <span className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <span
                    className="block h-full rounded-full bg-[var(--color-text-primary)]"
                    style={{ width: `${(c / maxStars) * 100}%`, opacity: stars === null || on ? 0.75 : 0.25 }}
                  />
                </span>
                <span className={`w-12 shrink-0 text-right text-caption tabular-nums ${on ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>
                  {c.toLocaleString(lc)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {groups.length > 0 && <>
        <h2 className="mt-9 text-title3 text-[var(--color-text-primary)]">{ru ? "О чём пишут" : "What people write about"}</h2>
        <p className="mt-1.5 max-w-[58ch] text-footnote text-[var(--color-text-secondary)]">
          {ru
            ? "Направление показывает, как тема выглядит в совокупности. Отдельный отзыв может с ним не совпадать — выбери тему и проверь её звёздный профиль и все тексты."
            : "Direction describes a theme in aggregate. An individual review may differ — select a theme to inspect its star profile and every text."}
        </p>

        <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
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
                          {t.fallback && (
                            <> {" "}<span className="ml-1.5 rounded-full bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                              {ru ? "остаток" : "remainder"}
                            </span></>
                          )}
                        </span>
                        <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                          {t.count.toLocaleString(lc)} · {total ? ((t.count / total) * 100).toFixed(t.count / total < 0.01 ? 1 : 0) : 0}%
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </>}

      {activeTheme && exact && (
        <section className="card-min mt-6 rounded-[20px] p-4 sm:p-5" aria-live="polite" aria-label={ru ? "Профиль выбранной темы" : "Selected theme profile"}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-caption uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">{activeTheme.fallback ? (ru ? "Нейтральный остаток" : "Neutral remainder") : ru ? "Профиль темы" : "Theme profile"}</p>
              <h3 className="mt-1 text-headline text-[var(--color-text-primary)]">{ru ? activeTheme.name : activeTheme.nameEn}</h3>
              <p className="mt-1 max-w-[58ch] text-caption leading-relaxed text-[var(--color-text-tertiary)]">
                {activeTheme.fallback
                  ? ru
                    ? "В этих текстах недостаточно конкретики для надёжной продуктовой темы."
                    : "These texts are not specific enough for a reliable product theme."
                  : ru
                    ? `Общее направление: ${activeTheme.polarity === "love" ? "в основном хвалят" : activeTheme.polarity === "pain" ? "в основном критикуют" : "мнения расходятся"}. Ниже — фактические оценки отдельных отзывов.`
                    : `Overall direction: ${activeTheme.polarity === "love" ? "mostly praised" : activeTheme.polarity === "pain" ? "mostly criticised" : "opinions differ"}. Below are the actual ratings of individual reviews.`}
              </p>
            </div>
            <p className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{activeTotal.toLocaleString(lc)} {ru ? plural(activeTotal, "отзыв", "отзыва", "отзывов") : activeTotal === 1 ? "review" : "reviews"}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">
            <div className="p-3">
              <p className="text-headline tabular-nums text-[var(--color-text-primary)]">{activePositive.toFixed(0)}%</p>
              <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">4–5★</p>
            </div>
            <div className="border-x border-[var(--color-border-subtle)] p-3">
              <p className="text-headline tabular-nums text-[var(--color-text-primary)]">{activeNeutral.toFixed(0)}%</p>
              <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">3★</p>
            </div>
            <div className="p-3">
              <p className="text-headline tabular-nums text-[var(--color-text-primary)]">{activeNegative.toFixed(0)}%</p>
              <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">1–2★</p>
            </div>
          </div>
        </section>
      )}

      {/* Sticky control bar: what you are reading, how many, and the way out. */}
      <div className="sticky top-[4.5rem] z-10 -mx-4 mt-8 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-4 pb-2.5 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-footnote text-[var(--color-text-primary)]">
            {activeTheme ? (ru ? activeTheme.name : activeTheme.nameEn) : ru ? "Все отзывы" : "All reviews"}
            {stars && <span className="tabular-nums"> · {stars}★</span>}
            {" "}<span className="ml-1.5 tabular-nums text-[var(--color-text-tertiary)]">{matched.toLocaleString(lc)}</span>
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
        <label className="mt-2 block">
          <span className="sr-only">{ru ? "Поиск по тексту отзывов" : "Search review text"}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={ru ? "поиск по тексту отзывов" : "search review text"}
            className="w-full rounded-full border border-[var(--color-border-subtle)] bg-transparent px-4 py-2 text-footnote text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
        </label>
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
              {!theme && r.theme && (
                <span className="min-w-0 truncate text-caption text-[var(--color-text-tertiary)]">
                  {ru ? r.theme : themes.find((t) => t.name === r.theme)?.nameEn ?? r.theme}
                  {themes.find((t) => t.name === r.theme)?.fallback && <span className="ml-1">· {ru ? "без конкретики" : "unspecific"}</span>}
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
