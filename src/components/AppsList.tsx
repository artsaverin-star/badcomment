"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { BrowseAppItem } from "./CatalogBrowser";

function reviewsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "отзывов";
  if (d === 1) return "отзыв";
  if (d >= 2 && d <= 4) return "отзыва";
  return "отзывов";
}

function AppCard({ a }: { a: BrowseAppItem }) {
  return (
    <Link
      href={`/${a.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_66px] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card-subtle)]"
    >
      {a.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-10 shrink-0 rounded-[11px] object-cover" />
      ) : (
        <div className="size-10 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-callout font-medium text-[var(--color-text-primary)]">{a.name}</span>
        {a.reviews > 0 && (
          <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
            разобрали {a.reviews.toLocaleString("ru-RU")} {reviewsWord(a.reviews)}
          </span>
        )}
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
        <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

// Apps grid with infinite scroll: server renders the first page; more pages load
// from /api/catalog/apps as the sentinel nears the viewport.
export default function AppsList({ initial, total }: { initial: BrowseAppItem[]; total: number }) {
  const [apps, setApps] = useState<BrowseAppItem[]>(initial);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (apps.length >= total) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loading) return;
        setLoading(true);
        fetch(`/api/catalog/apps?offset=${apps.length}&limit=60`)
          .then((r) => r.json())
          .then((d) => setApps((prev) => [...prev, ...((d.apps as BrowseAppItem[]) || [])]))
          .catch(() => {})
          .finally(() => setLoading(false));
      },
      { rootMargin: "700px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [apps.length, total, loading]);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <AppCard key={a.slug} a={a} />
        ))}
      </div>
      {apps.length < total && (
        <div ref={sentinel} className="flex justify-center py-8 text-caption text-[var(--color-text-tertiary)]">
          {loading ? "Загружаем…" : ""}
        </div>
      )}
    </>
  );
}
