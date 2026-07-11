"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";
import LangMenu from "./LangMenu";
import LaunchOffer from "./LaunchOffer";
import Logo from "./Logo";
import HeaderSearch from "./HeaderSearch";
import { type Locale } from "@/lib/i18n";

// Center nav items: icon + label, active state driven by the current path.
const NAV: { key: string; href: string; ru: string; en: string; icon: React.ReactNode }[] = [
  {
    key: "breakdowns", href: "/", ru: "Разборы", en: "Breakdowns",
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></>,
  },
  {
    key: "ideas", href: "/ideas", ru: "Идеи", en: "Ideas",
    icon: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>,
  },
  {
    key: "rating", href: "/rating", ru: "Рейтинг", en: "Rating",
    icon: <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.15 1 5.87L12 17.1l-5.25 2.76 1-5.87L3.5 9.66l5.9-.86L12 3.5Z" />,
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
  const [searchOpen, setSearchOpen] = useState(false);
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

  // Search is expanded at the top of the page; on scroll it folds into an icon
  // that clicking re-expands. Back at the top it always shows expanded again.
  const searchExpanded = !scrolled || searchOpen;

  // Strip a leading /ru or /en so matching works on either locale prefix.
  const path = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const activeKey =
    path.startsWith("/ideas") ? "ideas"
      : path.startsWith("/rating") ? "rating"
      : path.startsWith("/categories") || path.startsWith("/segment") || path === "/" ? "breakdowns"
      : "";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`relative mx-auto flex h-12 items-center gap-2 rounded-full pr-2 transition-all duration-300 ease-out sm:h-14 sm:pr-2.5 ${
          scrolled
            ? "max-w-2xl border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] pl-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:pl-5"
            : "max-w-6xl border border-transparent bg-transparent pl-1 shadow-none sm:pl-1"
        }`}
      >
        <Link href={lp} aria-label="inApp" className="flex shrink-0 items-center transition-opacity hover:opacity-70">
          <Logo iconSize={26} textClassName="text-[23px]" />
        </Link>

        {/* Section nav — in flow just after the wordmark so the right-side
            search box always fits. Hidden on small screens (footer keeps the
            links) and when the search is expanded on a condensed pill. */}
        <nav className={`ml-1 hidden items-center gap-1 lg:ml-3 ${scrolled && searchOpen ? "md:hidden" : "md:flex"}`}>
          {NAV.map((n) => {
            const active = n.key === activeKey;
            return (
              <Link
                key={n.key}
                href={`${lp}${n.href === "/" ? "" : n.href}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-footnote font-semibold transition-colors ${
                  active
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{n.icon}</svg>
                {ru ? n.ru : n.en}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {/* Instant catalog search — desktop only; phones use the bottom search
              tab and the mobile menu. Expanded at the top, an icon on scroll. */}
          {searchExpanded ? (
            <div className="mr-1 hidden w-[180px] md:block lg:w-[220px] xl:w-[260px]">
              <HeaderSearch locale={locale} compact />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={ru ? "Поиск" : "Search"}
              className="hidden size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)] md:inline-flex"
            >
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m17 17-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
          )}
          {showOffer && <LaunchOffer locale={locale} loggedIn={loggedIn} />}
          <AuthButton locale={locale} />
          <LangMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
