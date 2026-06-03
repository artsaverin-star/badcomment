"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";

// Top-level sections: the idea feed ("/") and the market map ("/market").
// usePathname drives the active pill, so this is a thin client island inside the
// otherwise-server Header.
export default function MainNav({ locale }: { locale: Locale }) {
  const tr = t(locale);
  const pathname = usePathname();
  const items = [
    { href: "/", label: tr.nav.ideas, active: pathname === "/" },
    { href: "/market", label: tr.nav.market, active: pathname === "/market" || pathname.startsWith("/market/") },
    { href: "/market2", label: tr.nav.market2, active: pathname.startsWith("/market2") },
  ];
  return (
    <nav className="flex items-center gap-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1 text-[13px] font-medium transition-colors [font-family:var(--brand-font-family)]",
            i.active
              ? "bg-[var(--color-accent-brand)] text-[var(--color-button-primary-text)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
