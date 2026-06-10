"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Section tabs in the top bar: Каталог (the category/разбор index at "/") and
// Идеи (review-derived app ideas at "/ideas"). Active section is underlined.
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
    { href: "/", label: catalogLabel, active: !inIdeas },
    { href: "/ideas", label: ideasLabel, active: inIdeas },
  ];
  return (
    <nav className="flex items-center gap-4">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`text-[15px] font-semibold transition-colors ${
            tab.active
              ? "text-[var(--color-text-primary)] underline decoration-[var(--color-text-brand)] decoration-2 underline-offset-8"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
