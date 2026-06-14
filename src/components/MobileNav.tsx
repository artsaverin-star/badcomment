"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@saverin/ui-web";
import LangSwitch from "./LangSwitch";
import ThemeSwitch from "./ThemeSwitch";
import AuthButton from "./AuthButton";
import { t, type Locale } from "@/lib/i18n";

// Compact header control for phones: a single menu button that opens a sheet
// with the section nav + language/theme switches + sign-in. Desktop keeps the
// controls inline (see Header); this is rendered only under sm.
export default function MobileNav({
  locale,
  theme,
}: {
  locale: Locale;
  theme: "light" | "dark";
}) {
  const tr = t(locale);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll + wire Escape while the sheet is up. (Navigation closes
  // the sheet via each link's onClick, so no pathname effect is needed.)
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tabs = [
    { href: "/", label: tr.nav.catalog, active: !(pathname === "/ideas" || pathname.startsWith("/ideas/")) },
    { href: "/ideas", label: tr.nav.ideas, active: pathname === "/ideas" || pathname.startsWith("/ideas/") },
  ];

  return (
    <>
      <IconButton
        variant="ghost"
        size="M"
        aria-label={open ? "Закрыть меню" : "Меню"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        icon={
          open ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )
        }
      />

      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-14 z-30 cursor-default bg-black/40 [animation:sheet-backdrop-in_.2s_ease]"
          />
          <div className="absolute inset-x-0 top-full z-40 origin-top border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.5)] [animation:sheet-down_.22s_cubic-bezier(0.32,0.72,0,1)]">
            <nav className="mx-auto flex max-w-5xl flex-col px-4 py-2 sm:px-6">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`border-b border-[var(--color-border-subtle)] py-3.5 text-lead font-semibold last:border-0 ${
                    tab.active
                      ? "text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
              <div className="flex items-center justify-between gap-3 py-3.5">
                <LangSwitch locale={locale} />
                <ThemeSwitch theme={theme} />
              </div>
              <div className="pb-2 pt-2">
                <AuthButton compact locale={locale} />
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
