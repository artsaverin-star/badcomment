"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

// Bottom floating search button for phones (the old category/apps/ideas tabs
// were removed — navigation now lives in the page content).
export default function MobileTabBar({ searchLabel }: { searchLabel: string }) {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const active = pathname === "/search";

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-28 bg-gradient-to-t from-[var(--color-bg-page)] via-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] to-transparent sm:hidden"
      />
      <nav className="tabbar-in fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:hidden">
        <Link
          href="/search"
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-5 py-2.5 text-callout font-semibold shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85)] transition-all active:scale-95 ${
            active ? "text-[var(--color-text-brand)]" : "text-[var(--color-text-secondary)]"
          }`}
        >
          <SearchIcon />
          {searchLabel}
        </Link>
      </nav>
    </>
  );
}
