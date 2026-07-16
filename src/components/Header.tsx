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

  // Strip a leading /ru or /en so matching works on either locale prefix.
  const path = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const activeKey =
    path.startsWith("/build") ? "build"
      : path.startsWith("/ideas") ? "ideas"
      : path.startsWith("/rating") ? "rating"
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
            side widths. Hidden on small screens; the footer keeps the links. */}
        {/* When the row gets tight (offer badge + sign-in on the right) the
            item icons go first, then the last label ellipsizes — the nav never
            slides under the controls. */}
        <nav className="absolute left-1/2 hidden max-w-[40vw] -translate-x-1/2 items-center gap-1 md:flex min-[1200px]:max-w-none">
          {NAV.map((n, i) => {
            const active = n.key === activeKey;
            const last = i === NAV.length - 1;
            return (
              <Link
                key={n.key}
                href={`${lp}${n.href === "/" ? "" : n.href}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-footnote font-semibold transition-colors ${last ? "min-w-0" : "shrink-0"} ${
                  active
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hidden shrink-0 min-[1100px]:block">{n.icon}</svg>
                <span className={last ? "truncate" : undefined}>{ru ? n.ru : n.en}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {showOffer && <LaunchOffer locale={locale} loggedIn={loggedIn} />}
          <AuthButton locale={locale} />
          <LangMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
