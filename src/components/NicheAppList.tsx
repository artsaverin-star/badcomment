"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { plural } from "@/lib/format";

// The niche index: one row per app, sorted by how many reviews we read. Quiet
// typographic rows — icon, title, count and the three loudest themes — so
// people pick an app knowing what's inside it.

type Theme = { name: string; nameEn: string; polarity: "love" | "pain" | "mixed"; count: number; fallback?: boolean };
type App = {
  id: string;
  title: string;
  total: number;
  icon?: string;
  themes: Theme[];
  detailed: boolean;
};

type Status = "all" | "detailed" | "source";

export default function NicheAppList({ slug, apps, ru }: { slug: string; apps: App[]; ru: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return apps.filter(
      (a) =>
        (status === "all" || (status === "detailed" ? a.detailed : !a.detailed)) &&
        (!s || a.title.toLowerCase().includes(s) || a.themes.some((t) => (ru ? t.name : t.nameEn).toLowerCase().includes(s))),
    );
  }, [q, apps, ru, status]);
  const detailed = apps.filter((app) => app.detailed).length;
  const filters: { id: Status; label: string; count: number }[] = [
    { id: "all", label: ru ? "Все тексты" : "All texts", count: apps.length },
    { id: "detailed", label: ru ? "Темы размечены" : "Themes labelled", count: detailed },
    { id: "source", label: ru ? "Без тем" : "Without themes", count: apps.length - detailed },
  ];

  return (
    <>
      <div className="sticky top-[4.5rem] z-10 -mx-4 bg-[var(--color-bg-page)] px-4 py-2">
        <label className="block">
          <span className="sr-only">{ru ? "Поиск по приложению или теме" : "Search by app or theme"}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ru ? "приложение или тема" : "app or theme"}
            className="w-full rounded-full border border-[var(--color-border-subtle)] bg-transparent px-4 py-2.5 text-footnote text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={ru ? "Статус тематической разметки" : "Topic labelling status"}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
              className={`rounded-full border px-2.5 py-1 text-caption transition-colors ${
                status === filter.id
                  ? "border-[var(--color-border-strong)] bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {filter.label} <span className="ml-1 tabular-nums opacity-65">{filter.count}</span>
            </button>
          ))}
        </div>
        <p aria-live="polite" className="mt-1.5 px-1 text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {ru ? `Показано ${shown.length} из ${apps.length}` : `Showing ${shown.length} of ${apps.length}`}
        </p>
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-body text-[var(--color-text-tertiary)]">{ru ? "Ничего не нашлось." : "Nothing found."}</p>
      )}

      <ol className="mt-2 flex flex-col">
        {shown.map((a) => (
          <li key={a.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
            <Link href={`${lp}/reviews/${slug}/${a.id}`} className="group flex gap-3.5 py-3.5">
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)]" />
              ) : (
                <div className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-subhead text-[var(--color-text-primary)] transition-opacity group-hover:opacity-60">
                    {a.title}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                    {a.total.toLocaleString(lc)} {ru ? plural(a.total, "отзыв", "отзыва", "отзывов") : a.total === 1 ? "review" : "reviews"}
                  </span>
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-caption text-[var(--color-text-tertiary)]">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 ${a.detailed ? "bg-[var(--color-accent-brand-subtle)] text-[var(--color-text-secondary)]" : "border border-[var(--color-border-subtle)]"}`}>
                    {a.detailed ? (ru ? "темы размечены" : "themes labelled") : ru ? "тексты доступны" : "texts available"}
                  </span>
                  <span className="min-w-0 truncate">
                    {a.detailed
                      ? a.themes.filter((t) => !t.fallback).slice(0, 3).map((t, i) => (
                          <span key={t.name}>
                            {i > 0 && " · "}
                            {ru ? t.name : t.nameEn}
                          </span>
                        ))
                      : ru ? "оценки и поиск по полному тексту" : "ratings and full-text search"}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
