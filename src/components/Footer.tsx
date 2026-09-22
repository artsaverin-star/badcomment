"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale } from "@/lib/i18n";
import { IOS_PRIVACY_URL, isNoCommercePath } from "@/lib/legalPages";

const linkCls = "text-footnote text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]";

// Site footer — keeps the legally-required pages (условия, оферта, контакты,
// тарифы) reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  // The idea feed is a full-screen swipe surface — no footer there.
  const pathname = usePathname();
  if (pathname === "/cards") return null;
  // The Terms of Use / Support pages opened from the iOS app link only to each
  // other and the app's privacy policy: every other site page shows web prices.
  const noCommerce = isNoCommercePath(pathname);
  const links: { href: string; label: string }[] = noCommerce
    ? [
        { href: "/offer", label: ru ? "Условия использования" : "Terms of Use" },
        { href: "/contacts", label: ru ? "Контакты" : "Support" },
      ]
    : [
        { href: "/", label: ru ? "Разборы" : "Breakdowns" },
        { href: "/build", label: ru ? "Создание" : "Create" },
        { href: "/ideas", label: ru ? "Идеи" : "Ideas" },
        { href: "/rating", label: ru ? "Рейтинг" : "Rating" },
        { href: "/reviews", label: ru ? "Отзывы" : "Reviews" },
        { href: "/mcp", label: "MCP" },
        { href: "/saved", label: ru ? "Избранное" : "Saved" },
        { href: "/apps", label: ru ? "Все приложения" : "All apps" },
        { href: "/tokens", label: ru ? "Доступ" : "Access" },
        { href: "/offer", label: ru ? "Условия использования" : "Terms of Use" },
        { href: "/offer/payment", label: ru ? "Оферта" : "Payment offer" },
        { href: "/contacts", label: ru ? "Контакты" : "Support" },
      ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="text-caption text-[var(--color-text-tertiary)]"><span className="font-bold text-[var(--color-text-secondary)]">inApp</span> · © 2026</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={`${lp}${l.href === "/" ? "" : l.href}`} className={linkCls}>
              {l.label}
            </Link>
          ))}
          {noCommerce && (
            <a href={IOS_PRIVACY_URL} target="_blank" rel="noopener noreferrer" className={linkCls}>
              {ru ? "Политика конфиденциальности iOS-приложения" : "Privacy Policy (iOS app)"}
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
