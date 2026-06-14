"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type BrowseApp = { name: string; icon: string | null };
export type BrowseCategory = {
  slug: string;
  name: string;
  appsCount: number;
  apps: BrowseApp[];
  live: boolean; // synthesis published (≥10 разборов)
  locked: boolean; // live but premium-gated for this viewer
};
export type BrowseDomain = { slug: string; name: string; categories: BrowseCategory[] };

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}

export default function CatalogBrowser({
  domains,
  premium,
}: {
  domains: BrowseDomain[];
  premium: boolean;
}) {
  const [q, setQ] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const nq = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    const match = (c: BrowseCategory) => {
      if (onlyLive && !c.live) return false;
      if (!nq) return true;
      if (c.name.toLowerCase().includes(nq)) return true;
      return c.apps.some((a) => a.name.toLowerCase().includes(nq));
    };
    return domains
      .map((d) => ({ ...d, categories: d.categories.filter(match) }))
      .filter((d) => d.categories.length > 0);
  }, [domains, nq, onlyLive]);

  const total = filtered.reduce((s, d) => s + d.categories.length, 0);
  const lockedCount = filtered.reduce((s, d) => s + d.categories.filter((c) => c.locked).length, 0);

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
                onClick={() => setOnlyLive(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-footnote font-semibold transition-colors ${
                  onlyLive === f.key
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

      {!premium && lockedCount > 0 && (
        <Link
          href="/premium"
          className="mx-auto mb-8 flex max-w-2xl items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] px-4 py-3"
        >
          <span className="text-[18px]">🔓</span>
          <span className="flex-1 text-callout text-[var(--color-text-primary)]">
            Открыто {4} категории бесплатно. Остальные разборы и идеи — в <b>премиуме</b>.
          </span>
          <span className="shrink-0 text-footnote font-semibold text-[var(--color-text-brand)]">Подключить →</span>
        </Link>
      )}

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
  const dim = !cat.live; // «Скоро» categories are greyscale
  const body = (
    <>
      <div className="flex shrink-0 -space-x-1.5">
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon ?? ""}
            alt=""
            className={`size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)] ${dim ? "opacity-40 grayscale" : ""}`}
          />
        ))}
      </div>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`flex items-center gap-1.5 truncate text-callout font-semibold ${dim ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>
          <span className="truncate">{cat.name}</span>
          {cat.locked && (
            <svg width="12" height="12" viewBox="0 0 14 14" className="shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true">
              <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" fill="none" />
            </svg>
          )}
        </span>
        <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {cat.live ? `${cat.appsCount} ${appsWord(cat.appsCount)}` : "Скоро"}
        </span>
      </span>
    </>
  );

  if (!cat.live) {
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
