"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5a5 5 0 0 0-3 9v1.5h6V11.5a5 5 0 0 0-3-9Z" />
      <path d="M8 16.5h4M8.5 18.5h3" />
    </svg>
  );
}

// Top-bar section tabs (getgems-style): icon + label, active tab in the brand
// colour. No underline.
export default function NavTabs({
  catalogLabel,
  ideasLabel,
}: {
  catalogLabel: string;
  ideasLabel: string;
}) {
  const pathname = usePathname();
  const inIdeas = pathname === "/ideas" || pathname.startsWith("/ideas/");
  const tabs = [
    { href: "/", label: catalogLabel, active: !inIdeas, Icon: GridIcon },
    { href: "/ideas", label: ideasLabel, active: inIdeas, Icon: BulbIcon },
  ];
  return (
    <nav className="flex items-center gap-2 sm:gap-5">
      {tabs.map(({ href, label, active, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-semibold transition-colors sm:px-0 sm:py-0 sm:text-[16px] ${
            active
              ? "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] sm:bg-transparent"
              : "bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] sm:bg-transparent"
          }`}
        >
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
