"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type Chip = { slug: string; name: string };

// Horizontal, scrollable category filter strip (gallery-style). Each chip is a
// link that filters the idea grid by niche via ?cat=, preserving the sort.
export default function CategoryChips({ chips, current, sort, locale = "ru" }: { chips: Chip[]; current?: string; sort?: string; locale?: Locale }) {
  const ru = locale !== "en";
  const href = (cat?: string) => {
    const p = new URLSearchParams();
    if (cat) p.set("cat", cat);
    if (sort && sort !== "balance") p.set("sort", sort);
    const q = p.toString();
    return q ? `/?${q}` : "/";
  };
  const item = (label: string, active: boolean, cat?: string) => (
    <Link
      key={cat ?? "all"}
      href={href(cat)}
      scroll={false}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-footnote font-medium transition-colors ${
        active
          ? "border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]"
          : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-center gap-2">
        {item(ru ? "Все ниши" : "All niches", !current)}
        {chips.map((c) => item(c.name, c.slug === current, c.slug))}
      </div>
    </div>
  );
}
