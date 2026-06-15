"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.6" />
      <rect x="11" y="3" width="6" height="6" rx="1.6" />
      <rect x="3" y="11" width="6" height="6" rx="1.6" />
      <rect x="11" y="11" width="6" height="6" rx="1.6" />
    </svg>
  );
}
function AppsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3.5" y="3.5" width="13" height="13" rx="3.5" />
      <circle cx="10" cy="10" r="2.3" />
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5a5 5 0 0 0-3 9v1.5h6V11.5a5 5 0 0 0-3-9Z" />
      <path d="M8 16.5h4M8.5 18.5h3" />
    </svg>
  );
}

// Top-bar section tabs (desktop): Категории / Приложения / Идеи, driven by URL
// (?view=apps). No underline; active tab in primary text colour.
export default function NavTabs({
  catalogLabel,
  appsLabel,
  ideasLabel,
}: {
  catalogLabel: string;
  appsLabel: string;
  ideasLabel: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const inIdeas = pathname === "/ideas" || pathname.startsWith("/ideas/");
  const inApps = pathname === "/" && sp.get("view") === "apps";
  // Подсвечиваем «Категории» только на главной (не на страницах приложений/категорий).
  const inCats = pathname === "/" && !inApps;

  const tabs = [
    { href: "/", label: catalogLabel, active: inCats, Icon: GridIcon },
    { href: "/?view=apps", label: appsLabel, active: inApps, Icon: AppsIcon },
    { href: "/ideas", label: ideasLabel, active: inIdeas, Icon: BulbIcon },
  ];
  return (
    <nav className="flex items-center gap-5">
      {tabs.map(({ href, label, active, Icon }) => (
        <Link
          key={label}
          href={href}
          className={`flex items-center gap-1.5 text-[16px] font-semibold transition-colors ${
            active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
