"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { plural } from "@/lib/format";

type NicheItem = {
  slug: string;
  name: string;
  sourceReviews: number;
  appsPlanned: number;
  patterns: number;
  themes: number;
  appThemesReady: boolean;
};

type Filter = "all" | "ready" | "queued";
type Sort = "reviews" | "name" | "readiness";

export default function ReviewNicheCatalogue({ niches, ru, lp }: { niches: NicheItem[]; ru: boolean; lp: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("reviews");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase(ru ? "ru" : "en"));
  const lc = ru ? "ru-RU" : "en-US";
  const ready = niches.filter((niche) => niche.appThemesReady).length;
  const queued = niches.length - ready;
  const filtered = useMemo(() => {
    const result = niches.filter(
        (niche) =>
          (!deferredQuery || niche.name.toLocaleLowerCase(ru ? "ru" : "en").includes(deferredQuery)) &&
          (filter === "all" || (filter === "ready" ? niche.appThemesReady : !niche.appThemesReady)),
      );
    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, ru ? "ru" : "en");
      if (sort === "readiness") return Number(b.appThemesReady) - Number(a.appThemesReady) || b.themes - a.themes || b.sourceReviews - a.sourceReviews;
      return b.sourceReviews - a.sourceReviews;
    });
  }, [deferredQuery, filter, niches, ru, sort]);

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: ru ? "Все" : "All", count: niches.length },
    { id: "ready", label: ru ? "Темы приложений" : "App themes", count: ready },
    { id: "queued", label: ru ? "В очереди" : "Queued", count: queued },
  ];

  return (
    <section className="mt-8" aria-labelledby="reviews-catalogue-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{ru ? "Навигация по корпусу" : "Explore the corpus"}</p>
          <h2 id="reviews-catalogue-heading" className="mt-1 text-title2 text-[var(--color-text-primary)]">{ru ? "Найти нишу" : "Find a niche"}</h2>
        </div>
        <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {filtered.length} {ru ? plural(filtered.length, "результат", "результата", "результатов") : filtered.length === 1 ? "result" : "results"}
        </span>
      </div>

      <label className="mt-4 block">
        <span className="sr-only">{ru ? "Поиск по названию ниши" : "Search by niche name"}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ru ? "Например: сон, финансы, ИИ…" : "For example: sleep, finance, AI…"}
          className="h-11 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 text-body text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
        />
      </label>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label={ru ? "Статус разметки" : "Labelling status"}>
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-caption transition-colors ${
                filter === item.id
                  ? "border-[var(--color-border-strong)] bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              {item.label} <span className="ml-1 tabular-nums opacity-65">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-label={ru ? "Порядок тематик" : "Niche order"}>
          <span className="mr-0.5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Сначала" : "Sort"}</span>
          {([
            { id: "reviews", label: ru ? "много отзывов" : "most reviews" },
            { id: "readiness", label: ru ? "подробные" : "detailed" },
            { id: "name", label: ru ? "А—Я" : "A—Z" },
          ] as { id: Sort; label: string }[]).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={sort === item.id}
              onClick={() => setSort(item.id)}
              className={`rounded-full px-2.5 py-1 text-caption transition-colors ${sort === item.id ? "bg-[var(--color-bg-muted)] font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((niche) => (
            <li key={niche.slug}>
              <Link href={`${lp}/reviews/${niche.slug}`} className="card-min group block h-full rounded-2xl p-4">
                <span className="flex items-baseline gap-4">
                  <span className="min-w-0 flex-1 text-headline text-[var(--color-text-primary)] transition-opacity group-hover:opacity-60">{niche.name}</span>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{niche.sourceReviews.toLocaleString(lc)}</span>
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5 text-caption text-[var(--color-text-tertiary)]">
                  <span className="rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5"><span className="tabular-nums">{niche.appsPlanned}</span> {ru ? "прил." : niche.appsPlanned === 1 ? "app" : "apps"}</span>
                  <span className="rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[var(--color-text-secondary)]"><span className="tabular-nums">{niche.patterns}</span> {ru ? plural(niche.patterns, "паттерн", "паттерна", "паттернов") : niche.patterns === 1 ? "pattern" : "patterns"}</span>
                  {niche.themes > 0 && <span className="rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5"><span className="tabular-nums">{niche.themes}</span> {ru ? plural(niche.themes, "тема", "темы", "тем") : niche.themes === 1 ? "theme" : "themes"}</span>}
                  {!niche.appThemesReady && <span className="rounded-full border border-[var(--color-border-subtle)] px-2 py-0.5">{ru ? "приложения в очереди" : "apps queued"}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl border border-[var(--color-border-subtle)] px-5 py-10 text-center text-body text-[var(--color-text-tertiary)]">
          {ru ? "Ничего не найдено. Попробуй более короткий запрос." : "Nothing found. Try a shorter query."}
        </p>
      )}
    </section>
  );
}
