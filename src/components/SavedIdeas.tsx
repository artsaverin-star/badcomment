"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { IdeaCards, favSubscribe, favSnapshot } from "./TestCards";
import type { Locale } from "@/lib/i18n";

type Score = { money: number; simplicity: number; demand: number; composite: number; whyPay?: string; pricePoint?: string };
export type SavedPreview = {
  category: string; categoryName: string; title: string; oneLiner: string;
  gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string;
  reviewGrid?: { quote: string; rating: number; app: string; quoteRu?: string }[];
  icon: string; hue?: number; cover?: string; score?: Score; locked?: boolean;
};

// «Избранное» — the ideas bookmarked on the cards (localStorage favIdeas). Uses
// the very same IdeaCards deck as the homepage/dossier, so a saved idea looks and
// opens exactly like everywhere else. Removing = unbookmark on the card itself,
// and the list reacts live via the shared favIdeas store. Legacy hearts from the
// old feed (feed:saved) are merged in once, so nothing saved before is lost.
export default function SavedIdeas({ items, locale = "ru", loggedIn = false }: { items: Record<string, SavedPreview>; locale?: Locale; loggedIn?: boolean }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";

  // One-time migration of legacy hearts into favIdeas.
  const [migrated, setMigrated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const fav = new Set<string>(JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]);
        const legacy = JSON.parse(localStorage.getItem("feed:saved") || "[]") as { slug?: string }[];
        let changed = false;
        for (const s of Array.isArray(legacy) ? legacy : []) if (s?.slug && !fav.has(s.slug)) { fav.add(s.slug); changed = true; }
        if (changed) localStorage.setItem("favIdeas", JSON.stringify([...fav]));
      } catch { /* ignore */ }
      setMigrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const snap = useSyncExternalStore(favSubscribe, favSnapshot, () => "[]");
  let slugs: string[] = [];
  try { slugs = JSON.parse(snap) as string[]; } catch { /* ignore */ }
  const shown = slugs.filter((s) => items[s]);

  if (!migrated) return null;

  if (shown.length === 0) {
    return (
      <div className="card-min rounded-[22px] p-10 text-center">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-[var(--color-text-tertiary)]">
          <path d="M6 4.9c0-.5.4-.9.9-.9h10.2c.5 0 .9.4.9.9v14.6c0 .34-.39.53-.65.32L12 16.2l-5.35 3.62c-.26.21-.65.02-.65-.32V4.9z" />
        </svg>
        <p className="mx-auto mt-4 max-w-[36ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Пока пусто. Жми закладку на карточках идей, и они соберутся здесь." : "Empty for now. Tap the bookmark on idea cards and they will collect here."}</p>
        <Link href={`${lp}/ideas`} className="mt-6 inline-flex rounded-full bg-[var(--color-text-primary)] px-5 py-2.5 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">{ru ? "К идеям" : "To the ideas"}</Link>
      </div>
    );
  }

  const cards = shown.map((slug) => {
    const s = items[slug];
    return {
      slug,
      title: s.title, oneLiner: s.oneLiner, gap: s.gap, pitch: s.pitch, features: s.features,
      antiFeatures: s.antiFeatures, monetization: s.monetization, reviewGrid: s.reviewGrid,
      icon: s.icon, hue: s.hue, cover: s.cover, score: s.score, locked: s.locked,
      category: s.categoryName, categorySlug: s.category,
    };
  });

  return <IdeaCards ideas={cards} loggedIn={loggedIn} locale={locale} />;
}
