"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Theme = { name: string; nameEn: string; count: number; fallback?: boolean };
type App = { id: string; title: string; total: number; icon?: string; themes: Theme[] };

export default function NicheAppList({ slug, apps, ru }: { slug: string; apps: App[]; ru: boolean }) {
  const [query, setQuery] = useState("");
  const locale = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return apps.filter((app) => !needle || app.title.toLocaleLowerCase().includes(needle) || app.themes.some((theme) => (ru ? theme.name : theme.nameEn).toLocaleLowerCase().includes(needle)));
  }, [apps, query, ru]);

  return (
    <>
      <label className="block">
        <span className="sr-only">{ru ? "Поиск приложения или темы" : "Search app or topic"}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ru ? "Поиск приложения или темы" : "Search app or topic"}
          className="h-11 w-full rounded-lg border border-[var(--color-border-subtle)] bg-transparent px-4 text-body text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
        />
      </label>
      <p className="mt-2 text-caption tabular-nums text-[var(--color-text-tertiary)]">{ru ? "Найдено" : "Found"}: {filtered.length}</p>

      {filtered.length ? (
        <ol className="mt-2 flex flex-col">
          {filtered.map((app) => {
            const topicCount = app.themes.filter((theme) => !theme.fallback).length;
            return (
              <li key={app.id} className="border-b border-[var(--color-border-subtle)]">
                <Link href={`${lp}/reviews/${slug}/${app.id}`} className="group flex items-center gap-3.5 py-3.5">
                  {app.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)]" />
                  ) : (
                    <div className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-subhead text-[var(--color-text-primary)] group-hover:opacity-60">{app.title}</span>
                    <span className="mt-0.5 block text-caption tabular-nums text-[var(--color-text-tertiary)]">
                      {topicCount.toLocaleString(locale)} {ru ? "тем" : "topics"}
                    </span>
                  </span>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">
                    {app.total.toLocaleString(locale)} {ru ? "отзывов" : "reviews"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 text-body text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено." : "Nothing found."}</p>
      )}
    </>
  );
}
