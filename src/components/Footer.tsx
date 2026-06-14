import Link from "next/link";

// Site footer — keeps the legally-required pages (оферта, контакты, тарифы)
// reachable from every page, which payment providers (ЮKassa) check for.
export default function Footer() {
  const links = [
    { href: "/premium", label: "Тарифы" },
    { href: "/offer", label: "Оферта" },
    { href: "/contacts", label: "Контакты" },
  ];
  return (
    <footer className="mt-auto border-t border-[var(--color-border-subtle)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <span className="text-caption text-[var(--color-text-tertiary)]">© {"2026"} inApp</span>
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
