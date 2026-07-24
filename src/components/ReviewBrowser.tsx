"use client";

import { useState, useCallback } from "react";

// Per-app review browser. Theme chips ARE the filter: each chip is one of the
// app's own emergent themes with its review count and polarity colour. Clicking
// a chip lazy-loads the app's reviews (public/reviews/<slug>/<id>.json, fetched
// once) and shows only that theme's reviews. "Все" shows everything.

export type Theme = { name: string; nameEn: string; count: number; polarity: string };
type Review = { rating: number; text: string; theme: string };

const dot = (p: string) =>
  p === "love" ? "#22c55e" : p === "pain" ? "#f97316" : "#94a3b8";

function Stars({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-caption" style={{ color: n >= 4 ? "#eab308" : n <= 2 ? "#f97316" : "#94a3b8" }}>
      {"★".repeat(Math.max(1, Math.min(5, n)))}
      <span className="text-[var(--color-text-tertiary)]">{"★".repeat(5 - Math.max(1, Math.min(5, n)))}</span>
    </span>
  );
}

export default function ReviewBrowser({
  slug, id, themes, total, ru,
}: { slug: string; id: string; themes: Theme[]; total: number; ru: boolean }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (reviews) return;
    setLoading(true);
    try {
      const r = await fetch(`/reviews/${slug}/${encodeURIComponent(id)}.json`).then((x) => (x.ok ? x.json() : null));
      setReviews(Array.isArray(r?.reviews) ? r.reviews : []);
    } catch { setReviews([]); }
    setLoading(false);
  }, [reviews, slug, id]);

  const pick = (theme: string | null) => { setOpen(true); setActive(theme); load(); };

  const shown = reviews
    ? (active ? reviews.filter((r) => r.theme === active) : reviews).slice().sort((a, b) => a.rating - b.rating)
    : [];

  return (
    <div className="mt-3">
      {/* theme columns = filter */}
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => pick(t.name)}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-footnote transition-colors ${
              active === t.name
                ? "border-[var(--color-border-strong)] bg-[var(--color-surface-card-subtle)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dot(t.polarity) }} />
            <span>{ru ? t.name : t.nameEn}</span>
            <span className="tabular-nums text-[var(--color-text-tertiary)]">{t.count}</span>
          </button>
        ))}
        {open && (
          <button
            type="button"
            onClick={() => pick(null)}
            className={`rounded-full border px-3 py-1.5 text-footnote transition-colors ${
              active === null
                ? "border-[var(--color-border-strong)] bg-[var(--color-surface-card-subtle)] text-[var(--color-text-primary)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {ru ? "все" : "all"} <span className="tabular-nums text-[var(--color-text-tertiary)]">{total}</span>
          </button>
        )}
      </div>

      {/* reviews of the picked theme */}
      {open && (
        <div className="mt-4">
          {loading && <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "загружаю отзывы…" : "loading reviews…"}</p>}
          {!loading && reviews && (
            <>
              <p className="mb-3 text-caption text-[var(--color-text-tertiary)]">
                {active ? (ru ? `${active}: ` : `${themes.find((t) => t.name === active)?.nameEn ?? active}: `) : ""}
                <span className="tabular-nums">{shown.length}</span> {ru ? "отзывов" : "reviews"}
              </p>
              <ol className="flex flex-col gap-3">
                {shown.slice(0, 200).map((r, i) => (
                  <li key={i} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3">
                    <Stars n={r.rating} />
                    <p className="mt-1.5 text-footnote text-pretty text-[var(--color-text-secondary)]">{r.text}</p>
                  </li>
                ))}
              </ol>
              {shown.length > 200 && (
                <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">{ru ? `и ещё ${shown.length - 200}` : `and ${shown.length - 200} more`}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
