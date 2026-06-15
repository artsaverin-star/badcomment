"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Bottom navigation for phones (Shazam-style): a floating pill with Категории /
// Приложения / Идеи + a separate circular Поиск button. Hidden on desktop (sm+).
function GridIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.6" />
    </svg>
  );
}
function AppsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" />
      <circle cx="10" cy="10" r="2.3" />
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5a5 5 0 0 0-3 9v1.5h6V11.5a5 5 0 0 0-3-9Z" />
      <path d="M8 16.5h4M8.5 18.5h3" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MobileTabBar({
  catalogLabel,
  appsLabel,
  ideasLabel,
  searchLabel,
}: {
  catalogLabel: string;
  appsLabel: string;
  ideasLabel: string;
  searchLabel: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const inIdeas = pathname === "/ideas" || pathname.startsWith("/ideas/");
  const inSearch = pathname === "/search";
  const inApps = pathname === "/" && sp.get("view") === "apps";
  const inCats = !inIdeas && !inSearch && !inApps;

  const tabs = [
    { href: "/", label: catalogLabel, active: inCats, Icon: GridIcon },
    { href: "/?view=apps", label: appsLabel, active: inApps, Icon: AppsIcon },
    { href: "/ideas", label: ideasLabel, active: inIdeas, Icon: BulbIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-4 z-50 flex justify-center gap-2.5 px-4 sm:hidden">
      <div className="flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_92%,transparent)] p-1.5 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md">
        {tabs.map(({ href, label, active, Icon }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-full px-3.5 py-1.5 text-[10px] font-semibold transition-colors ${
              active ? "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </div>
      <Link
        href="/search"
        aria-label={searchLabel}
        className={`flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] shadow-[0_12px_32px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md transition-colors ${
          inSearch ? "bg-[var(--color-accent-brand)] text-white" : "bg-[color-mix(in_srgb,var(--color-surface-card)_92%,transparent)] text-[var(--color-text-primary)]"
        }`}
      >
        <SearchIcon />
      </Link>
    </nav>
  );
}
