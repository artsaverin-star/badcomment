"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type Chip = { slug: string; name: string; icon?: string | null; hue?: number };

const Lock = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" /></svg>
);

// Niche filter strip as square tiles (60fps-style): the niche's top-app icon
// on top, the label below. "All niches" is free; filtering by a specific niche
// is premium — for non-owners tiles show a lock and scroll to the unlock gate.
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

  const tile = (active: boolean) =>
    `relative flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-[18px] p-3 pt-3.5 text-center transition-colors ${
      active ? "bg-[var(--color-text-primary)]" : "card-min"
    }`;
  const label = (active: boolean) =>
    `line-clamp-2 w-full text-caption leading-[1.25] ${active ? "text-[var(--color-bg-page)]" : "text-[var(--color-text-secondary)]"}`;

  const art = (c: Chip) =>
    c.icon ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={c.icon} alt="" loading="lazy" decoding="async" className="size-9 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
    ) : (
      <span className="art-wash flex size-9 items-center justify-center rounded-[10px]" style={c.hue != null ? ({ "--art-h": c.hue } as React.CSSProperties) : undefined} />
    );

  // No "all niches" tile: tapping the active tile again clears the filter.
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-stretch gap-2.5">
        {chips.map((c) => {
          const active = c.slug === current;
          return locked ? (
            <button key={c.slug} type="button" onClick={toGate} className={tile(false)}>
              {art(c)}
              <span className={label(false)}>{c.name}</span>
              <span className="absolute right-2 top-2 text-[var(--color-text-tertiary)]"><Lock /></span>
            </button>
          ) : (
            <Link key={c.slug} href={href(active ? undefined : c.slug)} scroll={false} className={tile(active)}>
              {art(c)}
              <span className={label(active)}>{c.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
