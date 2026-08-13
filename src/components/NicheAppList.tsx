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
};

export default function NicheAppList({ slug, apps, ru }: { slug: string; apps: App[]; ru: boolean }) {
  const [q, setQ] = useState("");
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return apps;
    return apps.filter(
      (a) => a.title.toLowerCase().includes(s) || a.themes.some((t) => (ru ? t.name : t.nameEn).toLowerCase().includes(s)),
    );
  }, [q, apps, ru]);

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
                <p className="mt-1 truncate text-caption text-[var(--color-text-tertiary)]">
                  {a.themes.filter((t) => !t.fallback).slice(0, 3).map((t, i) => (
                    <span key={t.name}>
                      {i > 0 && " · "}
                      {ru ? t.name : t.nameEn}
                    </span>
                  ))}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
