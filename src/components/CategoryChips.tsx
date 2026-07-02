"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type Chip = { slug: string; name: string };

const Lock = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="-ml-0.5 shrink-0 opacity-70"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" /></svg>
);

// Horizontal, scrollable category filter strip (gallery-style). "All niches" is
// free; filtering by a specific niche is a premium feature — for non-owners the
// niche chips show a lock and send them to the unlock gate instead of filtering.
export default function CategoryChips({ chips, current, sort, locale = "ru", locked = false }: { chips: Chip[]; current?: string; sort?: string; locale?: Locale; locked?: boolean }) {
  const ru = locale !== "en";
  const href = (cat?: string) => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (sort && sort !== "balance") p.set("sort", sort);
    const q = p.toString();
    return q ? `/?${q}` : "/";
  };
  const toGate = () => document.getElementById("idea-gate")?.scrollIntoView({ behavior: "smooth", block: "center" });

  const base = "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-footnote font-medium transition-colors inline-flex items-center gap-1.5";
  const cls = (active: boolean) => `${base} ${active ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)]"}`;

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2">
        <Link href={href()} scroll={false} className={cls(!current)}>{ru ? "Все ниши" : "All niches"}</Link>
        {chips.map((c) =>
          locked ? (
            <button key={c.slug} type="button" onClick={toGate} className={cls(false)}>
              <Lock />{c.name}
            </button>
          ) : (
            <Link key={c.slug} href={href(c.slug)} scroll={false} className={cls(c.slug === current)}>{c.name}</Link>
          ),
        )}
      </div>
    </div>
  );
}
