"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type SavedPreview = { category: string; categoryName: string; title: string; oneLiner: string };

// «Избранное» — the ideas bookmarked on the cards (localStorage favIdeas,
// written by the deck's FavButton). Legacy hearts from the old feed
// (feed:saved, array of objects) are merged into favIdeas once on load, so
// nothing a visitor saved before the redesign is lost.
export default function SavedIdeas({ items, locale = "ru" }: { items: Record<string, SavedPreview>; locale?: Locale }) {
  const ru = locale !== "en";
  const [slugs, setSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const fav = new Set<string>(JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]);
        const legacy = JSON.parse(localStorage.getItem("feed:saved") || "[]") as { slug?: string }[];
        let migrated = false;
        for (const s of Array.isArray(legacy) ? legacy : []) {
          if (s?.slug && !fav.has(s.slug)) { fav.add(s.slug); migrated = true; }
        }
        if (migrated) localStorage.setItem("favIdeas", JSON.stringify([...fav]));
        setSlugs([...fav]);
      } catch { setSlugs([]); }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function remove(slug: string) {
    setSlugs((prev) => {
      const next = (prev || []).filter((s) => s !== slug);
      try { localStorage.setItem("favIdeas", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  if (slugs === null) return null;
  const shown = slugs.filter((s) => items[s]);

  if (shown.length === 0) {
    return (
      <div className="card-min rounded-[22px] p-10 text-center">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--color-text-tertiary)]">
          <path d="M6 4.9c0-.5.4-.9.9-.9h10.2c.5 0 .9.4.9.9v14.6c0 .34-.39.53-.65.32L12 16.2l-5.35 3.62c-.26.21-.65.02-.65-.32V4.9z" />
        </svg>
        <p className="mx-auto mt-4 max-w-[36ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Пока пусто. Жми закладку на карточках идей, и они соберутся здесь." : "Empty for now. Tap the bookmark on idea cards and they will collect here."}</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-[var(--color-text-primary)] px-5 py-2.5 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">{ru ? "К идеям" : "To the ideas"}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {shown.map((slug) => {
        const s = items[slug];
        return (
          <div key={slug} className="card-min flex items-start gap-3 rounded-[20px] p-5">
            <Link href={`/segment/${s.category}`} className="min-w-0 flex-1">
              <span className="block text-caption text-[var(--color-text-tertiary)]">{s.categoryName}</span>
              <span className="mt-1 block text-headline text-[var(--color-text-primary)]">{s.title}</span>
              <span className="mt-1.5 line-clamp-2 block text-callout text-[var(--color-text-secondary)]">{s.oneLiner}</span>
            </Link>
            <button type="button" onClick={() => remove(slug)} aria-label={ru ? "Убрать из избранного" : "Remove from saved"} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-text-tertiary)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4.9c0-.5.4-.9.9-.9h10.2c.5 0 .9.4.9.9v14.6c0 .34-.39.53-.65.32L12 16.2l-5.35 3.62c-.26.21-.65.02-.65-.32V4.9z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
