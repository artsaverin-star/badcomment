"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

type NicheItem = {
  slug: string;
  name: string;
  sourceReviews: number;
  appsPlanned: number;
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
              <Link href={`${lp}/reviews/${niche.slug}`} className="group flex items-baseline gap-4 py-3.5">
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
