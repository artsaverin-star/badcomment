"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale } from "@/lib/i18n";

// Site footer — keeps the legally-required pages (оферта, контакты, тарифы)
// reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  // The idea feed is a full-screen swipe surface — no footer there.
  const pathname = usePathname();
  if (pathname === "/cards") return null;
  const links = [
    { href: "/", label: ru ? "Идеи" : "Ideas" },
    { href: "/categories", label: ru ? "Разборы" : "Breakdowns" },
    { href: "/rating", label: ru ? "Рейтинг" : "Rating" },
    { href: "/saved", label: ru ? "Избранное" : "Saved" },
    { href: "/apps", label: ru ? "Все приложения" : "All apps" },
    { href: "/tokens", label: ru ? "Энергия" : "Energy" },
    { href: "/offer", label: ru ? "Оферта" : "Terms" },
    { href: "/contacts", label: ru ? "Контакты" : "Contacts" },
  ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="text-caption text-[var(--color-text-tertiary)]"><span className="font-bold text-[var(--color-text-secondary)]">inApp</span> · © 2026</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={`${lp}${l.href === "/" ? "" : l.href}`} className="text-footnote text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
