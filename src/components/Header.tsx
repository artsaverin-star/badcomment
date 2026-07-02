"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthButton from "./AuthButton";
import LangMenu from "./LangMenu";
import LaunchOffer from "./LaunchOffer";
import Logo from "./Logo";
import { type Locale } from "@/lib/i18n";

// Floating header. At the top of the page it's chrome-less — full content width,
// no pill, transparent. As soon as you scroll it animates down into a compact
// glass pill (Bevel-style): wordmark left, search/account/settings right.
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`mx-auto flex h-12 items-center gap-2 rounded-full pr-2 transition-all duration-300 ease-out sm:h-14 sm:pr-2.5 ${
          scrolled
            ? "max-w-lg border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] pl-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:pl-5"
            : "max-w-6xl border border-transparent bg-transparent pl-1 shadow-none sm:pl-1"
        }`}
      >
        <Link
          href="/"
          aria-label="inApp"
          className="flex shrink-0 items-center transition-opacity hover:opacity-70"
        >
          <Logo iconSize={26} textClassName="text-[23px]" />
        </Link>

        {/* Section nav lives here (not as hero buttons); collapses away with the
            pill on small screens — the footer keeps the same links reachable. */}
        {!scrolled && (
          <nav className="ml-5 hidden items-center gap-4 md:flex">
            <Link href="/categories" className="text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
              {locale === "en" ? "Breakdowns" : "Разборы"}
            </Link>
            <Link href="/rating" className="text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
              {locale === "en" ? "Rating" : "Рейтинг"}
            </Link>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {showOffer && <LaunchOffer locale={locale} loggedIn={loggedIn} />}
          <AuthButton locale={locale} />
          <LangMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
