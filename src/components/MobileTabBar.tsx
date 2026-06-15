"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Bottom navigation for phones: a single bar with Категории / Приложения / Идеи /
// Поиск and a sliding highlight that animates under the active tab. Hidden on
// desktop (sm+), where the header nav + search are used.
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
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
  const inCats = pathname === "/" && !inApps;

  const tabs = [
    { href: "/", label: catalogLabel, active: inCats, Icon: GridIcon },
    { href: "/?view=apps", label: appsLabel, active: inApps, Icon: AppsIcon },
    { href: "/ideas", label: ideasLabel, active: inIdeas, Icon: BulbIcon },
    { href: "/search", label: searchLabel, active: inSearch, Icon: SearchIcon },
  ];
  const activeIndex = tabs.findIndex((t) => t.active);

  return (
    <>
      {/* Scrim: фейдит контент у низа, чтобы меню не сливалось. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-32 bg-gradient-to-t from-[var(--color-bg-page)] via-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] to-transparent sm:hidden"
      />
      <nav className="tabbar-in fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
        <div className="relative mx-auto flex max-w-[440px] items-stretch rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85)]">
          {/* Sliding highlight under the active tab — стиль как у переключателя темы. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(25%-3px)] rounded-full bg-[var(--color-surface-card)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.06),0px_1px_1px_0px_rgba(0,0,0,0.08)] transition-[transform,opacity] duration-300 ease-out"
            style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)`, opacity: activeIndex < 0 ? 0 : 1 }}
          />
          {tabs.map(({ href, label, active, Icon }) => (
            <Link
              key={label}
              href={href}
              className={`relative z-10 flex flex-1 flex-col items-center gap-1 rounded-full py-2.5 text-[10px] font-semibold transition-colors duration-200 active:scale-90 ${
                active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"
              }`}
            >
              <Icon />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
