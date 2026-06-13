"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// Client catalog: search (category or app name) + a ready/all filter over the
// domain-grouped category grid. Readiness is precomputed server-side and passed
// as `ready` so this stays free of server-only libs.
export type BrowseApp = { name: string; icon: string | null };
export type BrowseCategory = {
  slug: string;
  name: string;
  appsCount: number;
  apps: BrowseApp[];
  ready: boolean;
  deprioritized: boolean;
};
export type BrowseDomain = { slug: string; name: string; categories: BrowseCategory[] };

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}

export default function CatalogBrowser({ domains }: { domains: BrowseDomain[] }) {
  const [q, setQ] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);
  const nq = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    const match = (c: BrowseCategory) => {
      if (onlyReady && !c.ready) return false;
      if (!nq) return true;
      if (c.name.toLowerCase().includes(nq)) return true;
      return c.apps.some((a) => a.name.toLowerCase().includes(nq));
    };
    return domains
      .map((d) => ({ ...d, categories: d.categories.filter(match) }))
      .filter((d) => d.categories.length > 0);
  }, [domains, nq, onlyReady]);

  const total = filtered.reduce((s, d) => s + d.categories.length, 0);

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-8 bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 focus-within:border-[var(--color-text-tertiary)]">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              inputMode="search"
              placeholder="Поиск категории или приложения"
              className="w-full bg-transparent text-body text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
          </label>
          <div className="flex items-center gap-2">
            {[
              { key: false, label: "Все" },
              { key: true, label: "Готовые" },
            ].map((f) => (
              <button
                key={String(f.key)}
                type="button"
                onClick={() => setOnlyReady(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-footnote font-semibold transition-colors ${
                  onlyReady === f.key
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-tertiary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {total} {total === 1 ? "категория" : total >= 2 && total <= 4 ? "категории" : "категорий"}
            </span>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <p className="py-16 text-center text-callout text-[var(--color-text-tertiary)]">
          Ничего не найдено по запросу «{q}».
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {filtered.map((d) => (
            <section key={d.slug} className="flex flex-col gap-3">
              <h2 className="border-b border-[var(--color-border-subtle)] pb-2 text-[20px] font-semibold text-[var(--color-text-primary)]">
                {d.name}
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.categories.map((c) => (
                  <CategoryCard key={c.slug} cat={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ cat }: { cat: BrowseCategory }) {
  const icons = cat.apps.filter((a) => a.icon).slice(0, 4);
  const dim = cat.deprioritized || !cat.ready;
  const body = (
    <>
      <div className="flex shrink-0 -space-x-1.5">
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon ?? ""}
            alt=""
            className={`size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)] ${
              dim ? "opacity-40 grayscale" : ""
            }`}
          />
        ))}
      </div>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`truncate text-callout font-semibold ${dim ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>
          {cat.name}
        </span>
        <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {cat.appsCount} {appsWord(cat.appsCount)}
        </span>
      </span>
    </>
  );

  if (cat.deprioritized) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-3 py-2.5">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/segment/${cat.slug}`}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--color-text-tertiary)]"
    >
      {body}
    </Link>
  );
}
