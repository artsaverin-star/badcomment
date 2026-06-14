"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type IdeaCard = {
  slug: string;
  category: string;
  categoryName: string;
  title: string;
  oneLiner: string;
  stats: { apps: number; reviews: number; observations: number };
};

// Ideas index browser: free-text search (title / one-liner / category) + a
// category filter, over the review-derived idea cards.
export default function IdeasBrowser({ ideas }: { ideas: IdeaCard[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const nq = q.trim().toLowerCase();

  const cats = useMemo(() => {
    const m = new Map<string, string>();
    ideas.forEach((i) => m.set(i.category, i.categoryName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"));
  }, [ideas]);

  const filtered = ideas.filter((i) => {
    if (cat !== "all" && i.category !== cat) return false;
    if (!nq) return true;
    return (
      i.title.toLowerCase().includes(nq) ||
      i.oneLiner.toLowerCase().includes(nq) ||
      i.categoryName.toLowerCase().includes(nq)
    );
  });

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-8 bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 focus-within:border-[var(--color-text-tertiary)]">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Поиск по идеям"
              className="w-full bg-transparent text-body text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
          </label>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 text-callout text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-tertiary)]"
          >
            <option value="all">Все категории</option>
            {cats.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="mx-auto mt-2 max-w-2xl text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {filtered.length} {filtered.length === 1 ? "идея" : filtered.length >= 2 && filtered.length <= 4 ? "идеи" : "идей"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-callout text-[var(--color-text-tertiary)]">Ничего не найдено.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((idea) => (
            <Link
              key={idea.slug}
              href={`/ideas/${idea.slug}`}
              className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-text-tertiary)]"
            >
              <div className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">
                {idea.categoryName}
              </div>
              <div className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
                {idea.title}
              </div>
              <p className="text-callout text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
              <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                {idea.stats.apps} приложений · {idea.stats.reviews.toLocaleString("ru-RU")} отзывов ·{" "}
                {idea.stats.observations.toLocaleString("ru-RU")} наблюдений
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
