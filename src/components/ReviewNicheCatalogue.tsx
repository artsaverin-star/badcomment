"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

type NicheItem = {
  slug: string;
  name: string;
  sourceReviews: number;
  appsPlanned: number;
  unlocked: boolean;
};

export default function ReviewNicheCatalogue({ niches, ru, lp }: { niches: NicheItem[]; ru: boolean; lp: string }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase(ru ? "ru" : "en"));
  const locale = ru ? "ru-RU" : "en-US";
  const filtered = useMemo(
    () => niches.filter((niche) => !deferredQuery || niche.name.toLocaleLowerCase(ru ? "ru" : "en").includes(deferredQuery)),
    [deferredQuery, niches, ru],
  );

  return (
    <section className="mt-9" aria-labelledby="review-categories-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="review-categories-heading" className="text-title2 text-[var(--color-text-primary)]">{ru ? "Категории" : "Categories"}</h2>
        <span className="text-footnote tabular-nums text-[var(--color-text-tertiary)]">{filtered.length}</span>
      </div>
      <label className="mt-4 block">
        <span className="sr-only">{ru ? "Поиск категории" : "Search categories"}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ru ? "Поиск категории" : "Search categories"}
          className="h-11 w-full rounded-lg border border-[var(--color-border-subtle)] bg-transparent px-4 text-body text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
        />
      </label>

      {filtered.length ? (
        <ul className="mt-4 grid sm:grid-cols-2 sm:gap-x-8">
          {filtered.map((niche) => (
            <li key={niche.slug} className="border-b border-[var(--color-border-subtle)]">
              <Link href={`${lp}/reviews/${niche.slug}`} className="group flex items-center gap-3 py-3.5">
                <span className="sr-only">{niche.unlocked ? (ru ? "Открыто." : "Open.") : (ru ? "Только с полным доступом." : "Full access required.")}</span>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${niche.unlocked ? "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]" : "border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"}`} aria-hidden="true">
                  {niche.unlocked ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3.25 8.25 3 3 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
                  )}
                </span>
                <span className="min-w-0 flex-1 text-subhead text-[var(--color-text-primary)] group-hover:opacity-60">{niche.name}</span>
                <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                  {niche.appsPlanned.toLocaleString(locale)} {ru ? "прил." : "apps"} · {niche.sourceReviews.toLocaleString(locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-body text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено." : "Nothing found."}</p>
      )}
    </section>
  );
}
