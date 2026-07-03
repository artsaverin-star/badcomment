"use client";

import { useEffect, useRef, useState } from "react";
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

  // Show a desktop scroll-right affordance while there's more strip to the right.
  const scroller = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [chips.length]);
  const scrollRight = () => scroller.current?.scrollBy({ left: 320, behavior: "smooth" });

  // "All niches" = the unfiltered deck; tapping an active niche tile also
  // clears the filter.
  return (
    <div className="relative">
      <div ref={scroller} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max items-stretch gap-2.5">
        <Link href={href()} scroll={false} className={tile(!current)}>
          <span className={`flex size-9 items-center justify-center rounded-[10px] ${!current ? "bg-[color-mix(in_srgb,var(--color-bg-page)_25%,transparent)]" : "bg-[var(--color-bg-muted)]"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={!current ? "text-[var(--color-bg-page)]" : "text-[var(--color-text-secondary)]"}>
              <rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
          </span>
          <span className={label(!current)}>{ru ? "Все ниши" : "All niches"}</span>
        </Link>
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
      {/* Desktop-only scroll-right button with a fade, hidden once at the end. */}
      {!atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center pr-1 md:flex">
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--color-bg-page)] to-transparent" />
          <button
            type="button"
            onClick={scrollRight}
            aria-label={ru ? "Ещё ниши" : "More niches"}
            className="pointer-events-auto relative flex size-9 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] shadow-[0_2px_8px_-2px_rgba(18,18,22,0.15)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
