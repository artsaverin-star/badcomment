import Link from "next/link";
import Logo from "./Logo";
import { type Locale } from "@/lib/i18n";

// Site footer — keeps the legally-required pages (оферта, контакты, тарифы)
// reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const links = [
    { href: "/apps", label: ru ? "Все приложения" : "All apps" },
    { href: "/tokens", label: ru ? "Энергия" : "Energy" },
    { href: "/offer", label: ru ? "Оферта" : "Terms" },
    { href: "/contacts", label: ru ? "Контакты" : "Contacts" },
  ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <span className="flex items-center gap-1.5 text-caption text-[var(--color-text-tertiary)]">© {"2026"} <Logo className="text-[15px]" /></span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-footnote text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
