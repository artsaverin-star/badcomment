"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MessageIcon from "./MessageIcon";
import type { Locale } from "@/lib/i18n";

type Saved = { slug: string; category: string; categoryName: string; title: string; oneLiner: string; demand: number };

// «Избранное» — the ideas a visitor hearted in the feed, kept in localStorage
// (feed:saved). Lives in the profile area now, not in the feed itself.
export default function SavedIdeas({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const [items, setItems] = useState<Saved[] | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const s = JSON.parse(localStorage.getItem("feed:saved") || "[]");
        setItems(Array.isArray(s) ? s : []);
      } catch { setItems([]); }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function remove(slug: string) {
    setItems((prev) => {
      const next = (prev || []).filter((s) => s.slug !== slug);
      try { localStorage.setItem("feed:saved", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[var(--color-border-subtle)] p-10 text-center">
        <div className="text-[40px]">🤍</div>
        <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">{ru ? "Пока пусто. Листай ленту идей и жми ♥ на тех, что стоит построить." : "Empty for now. Browse the idea feed and tap ♥ on the ones worth building."}</p>
        <Link href="/cards" className="mt-5 inline-flex rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-[14px] font-semibold text-[var(--color-button-primary-text)]">{ru ? "В ленту идей" : "To the idea feed"}</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((s) => (
        <div key={s.slug} className="flex items-start gap-3 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4">
          <Link href={`/segment/${s.category}`} className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-[11px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{s.categoryName}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums text-[var(--color-text-tertiary)]"><MessageIcon size={12} /> {s.demand}</span>
            </div>
            <div className="mt-1.5 text-[16px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)]">{s.title}</div>
            <div className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[var(--color-text-secondary)]">{s.oneLiner}</div>
          </Link>
          <button type="button" onClick={() => remove(s.slug)} aria-label={ru ? "Убрать" : "Remove"} className="shrink-0 text-[#ff3b5c]">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
