"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";
import LangMenu from "./LangMenu";
import LaunchOffer from "./LaunchOffer";
import Logo from "./Logo";
import { type Locale } from "@/lib/i18n";

// Center nav items: icon + label, active state driven by the current path.
const NAV: { key: string; href: string; ru: string; en: string; icon: React.ReactNode }[] = [
  {
    key: "breakdowns", href: "/", ru: "Разборы", en: "Breakdowns",
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></>,
  },
  {
    key: "build", href: "/build", ru: "Создание", en: "Create",
    icon: <><path d="M12 5v14M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="5" /></>,
  },
  {
    key: "ideas", href: "/ideas", ru: "Идеи", en: "Ideas",
    icon: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>,
  },
  {
    key: "rating", href: "/rating", ru: "Рейтинг", en: "Rating",
    icon: <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.15 1 5.87L12 17.1l-5.25 2.76 1-5.87L3.5 9.66l5.9-.86L12 3.5Z" />,
  },
  {
    key: "reviews", href: "/reviews", ru: "Отзывы", en: "Reviews",
    icon: <><path d="M21 11.5a8.38 8.38 0 0 1-9 8.32L3 21l1.18-9A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8 10h8M8 13.5h5" /></>,
  },
  {
    key: "mcp", href: "/mcp", ru: "MCP", en: "MCP",
    icon: <><path d="M9 7V3M15 7V3" /><path d="M6 7h12v4a6 6 0 0 1-12 0V7Z" /><path d="M12 17v4" /></>,
  },
];

// Floating header. At the top it's chrome-less; on scroll it condenses into a
// glass pill. Wordmark left, section nav centered (icon + label, active-aware),
// account/settings right.
export default function Header({
  locale,
  loggedIn = false,
  showOffer = false,
}: {
  locale: Locale;
  loggedIn?: boolean;
  showOffer?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const ru = locale !== "en";
  // Prefix nav links with the active locale so navigation never falls back to
  // the cookie's language (which caused sections to flip to Russian on click).
  const lp = ru ? "/ru" : "/en";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll + wire Escape while the burger sheet is up. Links close it
  // via onClick, so no pathname effect is needed.
  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Strip a leading /ru or /en so matching works on either locale prefix.
  const path = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const activeKey =
    path.startsWith("/build") ? "build"
      : path.startsWith("/ideas") ? "ideas"
      : path.startsWith("/rating") ? "rating"
      : path.startsWith("/reviews") ? "reviews"
      : path.startsWith("/mcp") ? "mcp"
      : path === "/" || path.startsWith("/categories") || path.startsWith("/segment") ? "breakdowns"
      : "";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`relative mx-auto flex h-12 items-center gap-2 rounded-full pr-2 transition-all duration-300 ease-out sm:h-14 sm:pr-2.5 ${
          scrolled
            ? "max-w-3xl border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] pl-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:pl-5"
            : "max-w-6xl border border-transparent bg-transparent pl-1 shadow-none sm:pl-1"
        }`}
      >
        <Link href={lp} aria-label="inApp" className="flex shrink-0 items-center transition-opacity hover:opacity-70">
          <Logo iconSize={26} textClassName="text-[23px]" />
        </Link>

        {/* Center nav — absolutely centered so it stays put regardless of the
            side widths. Six sections need real room, so it only renders on wide
            screens (≥1200px); everything narrower gets the burger sheet. */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 min-[1200px]:flex">
          {NAV.map((n) => {
            const active = n.key === activeKey;
            return (
              <Link
                key={n.key}
                href={`${lp}${n.href === "/" ? "" : n.href}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-footnote font-semibold transition-colors ${
                  active
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{n.icon}</svg>
                {ru ? n.ru : n.en}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {showOffer && <LaunchOffer locale={locale} loggedIn={loggedIn} />}
          <AuthButton locale={locale} />
          <LangMenu locale={locale} />
          <button
            type="button"
            aria-label={menuOpen ? (ru ? "Закрыть меню" : "Close menu") : ru ? "Меню" : "Menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)] min-[1200px]:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Burger sheet: the whole section nav on phones (the header center nav
          is desktop-only, and the old bottom tab bar is gone). */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/40 [animation:sheet-backdrop-in_.2s_ease] min-[1200px]:hidden"
          />
          <div className="absolute inset-x-3 top-full z-40 mt-2 origin-top rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] [animation:sheet-down_.22s_cubic-bezier(0.32,0.72,0,1)] sm:left-auto sm:right-4 sm:w-80 min-[1200px]:hidden">
            <nav className="flex flex-col">
              {NAV.map((n) => {
                const active = n.key === activeKey;
                return (
                  <Link
                    key={n.key}
                    href={`${lp}${n.href === "/" ? "" : n.href}`}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-headline transition-colors ${
                      active
                        ? "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{n.icon}</svg>
                    {ru ? n.ru : n.en}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
