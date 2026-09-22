"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { oldLp, oldRestPath } from "@/lib/oldHref";

// Site footer — keeps the legally-required pages (оферта, контакты, тарифы)
// reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const lp = oldLp(locale);
  // The idea feed is a full-screen swipe surface — no footer there. Match the
  // internal path so SSR ("/cards") and the client ("/ru/old/cards") agree.
  const pathname = usePathname();
  if (oldRestPath(pathname) === "/cards") return null;
  const links = [
    { path: "/", label: ru ? "Разборы" : "Breakdowns" },
    { path: "/build", label: ru ? "Создание" : "Create" },
    { path: "/ideas", label: ru ? "Идеи" : "Ideas" },
    { path: "/rating", label: ru ? "Рейтинг" : "Rating" },
    { path: "/reviews", label: ru ? "Отзывы" : "Reviews" },
    { path: "/mcp", label: "MCP" },
    { path: "/saved", label: ru ? "Избранное" : "Saved" },
    { path: "/apps", label: ru ? "Все приложения" : "All apps" },
    { path: "/tokens", label: ru ? "Доступ" : "Access" },
    { path: "/offer", label: ru ? "Оферта" : "Terms" },
    { path: "/contacts", label: ru ? "Контакты" : "Contacts" },
  ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="text-caption text-[var(--color-text-tertiary)]"><span className="font-bold text-[var(--color-text-secondary)]">inApp</span> · © 2026</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.path} href={`${lp}${l.path === "/" ? "" : l.path}`} className="text-footnote text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
