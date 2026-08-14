"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { plural } from "@/lib/format";

export type Theme = { name: string; nameEn: string; count: number; polarity: "love" | "pain" | "mixed"; fallback?: boolean; scope?: "app" | "niche" | "universal" | "fallback" };
export type Review = { rating: number; text: string; theme?: string; themes?: string[] };

const PAGE = 40;

export default function ReviewBrowser({
  slug,
  id,
  themes,
  total,
  initial,
  ratingCounts,
  ru,
  initialQuery = "",
}: {
  slug: string;
  id: string;
  themes: Theme[];
  total: number;
  initial: Review[];
  ratingCounts: number[];
  ru: boolean;
  initialQuery?: string;
}) {
  const [all, setAll] = useState<Review[] | null>(null);
  const [theme, setTheme] = useState("");
  const [stars, setStars] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [worstFirst, setWorstFirst] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const loading = useRef(false);
  const locale = ru ? "ru-RU" : "en-US";
  const themeByName = useMemo(() => new Map(themes.map((item) => [item.name, item])), [themes]);
  const orderedThemes = useMemo(
    () => [...themes].sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count),
    [themes],
  );

  const load = useCallback(async () => {
    if (all || loading.current) return;
    loading.current = true;
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`).then((item) => item.ok ? item.json() : null);
      setAll(Array.isArray(response?.reviews) ? response.reviews as Review[] : []);
    } catch {
      setAll([]);
    }
    loading.current = false;
  }, [all, slug, id]);

  useEffect(() => {
    const browser = window as Window & { requestIdleCallback?: (callback: () => void) => number };
    if (browser.requestIdleCallback) browser.requestIdleCallback(() => void load());
    else setTimeout(() => void load(), 300);
  }, [load]);

  const shown = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return (all ?? initial)
      .filter((review) => {
        const labels = review.themes?.length ? review.themes : review.theme ? [review.theme] : [];
        return (!theme || labels.includes(theme)) && (!stars || review.rating === Number(stars)) && (!needle || review.text.toLocaleLowerCase().includes(needle));
      })
      .sort((a, b) => worstFirst ? a.rating - b.rating : b.rating - a.rating);
  }, [all, initial, query, stars, theme, worstFirst]);

  const exact = all !== null;
  const matched = exact
    ? shown.length
    : theme && !stars && !query.trim()
      ? themeByName.get(theme)?.count ?? shown.length
      : !theme && !stars && !query.trim()
        ? total
        : shown.length;

  const resetLimit = () => setLimit(PAGE);

  return (
    <section className="mt-8" aria-labelledby="review-list-heading">
      <div className="border-y border-[var(--color-border-subtle)] py-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto]">
          <label>
            <span className="sr-only">{ru ? "Тема отзыва" : "Review topic"}</span>
            <select
              value={theme}
              onChange={(event) => { setTheme(event.target.value); resetLimit(); }}
              className="h-10 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-3 text-footnote text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
            >
              <option value="">{ru ? `Все темы (${themes.length})` : `All topics (${themes.length})`}</option>
              {orderedThemes.map((item) => (
                <option key={item.name} value={item.name}>
                  {ru ? item.name : item.nameEn} — {item.count.toLocaleString(locale)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">{ru ? "Оценка" : "Rating"}</span>
            <select
              value={stars}
              onChange={(event) => { setStars(event.target.value); resetLimit(); }}
              className="h-10 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-3 text-footnote text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
            >
              <option value="">{ru ? "Все оценки" : "All ratings"}</option>
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating}★ — {(ratingCounts[rating - 1] || 0).toLocaleString(locale)}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">{ru ? "Поиск по тексту" : "Search review text"}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); resetLimit(); }}
              placeholder={ru ? "Поиск по тексту" : "Search review text"}
              className="h-10 w-full rounded-lg border border-[var(--color-border-subtle)] bg-transparent px-3 text-footnote text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
            />
          </label>

          <button
            type="button"
            onClick={() => setWorstFirst((value) => !value)}
            className="h-10 whitespace-nowrap rounded-lg border border-[var(--color-border-subtle)] px-3 text-footnote text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          >
            {worstFirst ? (ru ? "Сначала 1★" : "1★ first") : ru ? "Сначала 5★" : "5★ first"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h2 id="review-list-heading" className="text-title3 text-[var(--color-text-primary)]">{ru ? "Отзывы" : "Reviews"}</h2>
        <p className="text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          {matched.toLocaleString(locale)} {ru ? plural(matched, "отзыв", "отзыва", "отзывов") : matched === 1 ? "review" : "reviews"}
        </p>
      </div>

      {!exact && <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">{ru ? "Загружаю полный список…" : "Loading the complete list…"}</p>}
      {exact && shown.length === 0 && <p className="mt-6 text-body text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено." : "Nothing found."}</p>}

      <ol className="mt-2 flex flex-col">
        {shown.slice(0, limit).map((review, index) => {
          const labels = review.themes?.length ? review.themes : review.theme ? [review.theme] : [];
          return (
            <li key={`${index}-${review.rating}-${review.text.slice(0, 24)}`} className="border-b border-[var(--color-border-subtle)] py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 rounded-md bg-[var(--color-bg-muted)] px-2 py-0.5 text-caption font-semibold tabular-nums text-[var(--color-text-primary)]" aria-label={`${review.rating}/5`}>
                  {review.rating}★
                </span>
                {labels.map((name) => {
                  const item = themeByName.get(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setTheme(theme === name ? "" : name); resetLimit(); }}
                      className={`rounded-full border px-2 py-0.5 text-[11px] leading-5 ${
                        theme === name
                          ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                          : item?.fallback
                            ? "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"
                            : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      {ru ? name : item?.nameEn ?? name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-footnote text-pretty leading-relaxed text-[var(--color-text-secondary)]">{review.text}</p>
            </li>
          );
        })}
      </ol>

      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + PAGE * 2)}
          className="mt-5 w-full rounded-lg border border-[var(--color-border-subtle)] py-2.5 text-footnote text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
        >
          {ru ? `Показать ещё · осталось ${(shown.length - limit).toLocaleString(locale)}` : `Show more · ${(shown.length - limit).toLocaleString(locale)} left`}
        </button>
      )}
    </section>
  );
}
