"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { oldHref, oldRestPath } from "@/lib/oldHref";

const linkCls = "text-footnote text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]";

// Site footer — keeps the legally-required pages (условия, оферта, контакты,
// тарифы) reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  // The idea feed is a full-screen swipe surface — no footer there. Match the
  // internal path so SSR ("/cards") and the client ("/ru/old/cards") agree.
  const pathname = usePathname();
  if (oldRestPath(pathname) === "/cards") return null;
  // Terms of Use and the payment offer are separate pages since the App
  // Review hotfix (2026-09-22). On the new site the Apple-facing /offer and
  // /contacts are new-site pages, so no "no commerce" variant is needed here.
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
    { path: "/offer", label: ru ? "Условия использования" : "Terms of Use" },
    { path: "/offer/payment", label: ru ? "Оферта" : "Payment offer" },
    { path: "/contacts", label: ru ? "Контакты" : "Support" },
  ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="text-caption text-[var(--color-text-tertiary)]"><span className="font-bold text-[var(--color-text-secondary)]">inApp</span> · © 2026</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.path} href={oldHref(locale, l.path)} className={linkCls}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
