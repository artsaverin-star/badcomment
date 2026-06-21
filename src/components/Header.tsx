import Link from "next/link";
import AuthButton from "./AuthButton";
import SettingsMenu from "./SettingsMenu";
import Logo from "./Logo";
import { type Locale } from "@/lib/i18n";

// Minimalist floating glass pill (Bevel-style), identical on phone and desktop:
// wordmark on the left, then a search icon (→ /search), the account button and the
// settings menu on the right. Search is a dedicated page everywhere (no inline
// input) to keep the bar clean.
export default function Header({
  locale,
  theme,
}: {
  locale: Locale;
  theme: "light" | "dark";
}) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_68%,transparent)] pl-4 pr-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:h-14 sm:pl-5 sm:pr-2.5">
        <Link
          href="/"
          aria-label="inApp"
          className="flex shrink-0 items-center transition-opacity hover:opacity-70"
        >
          <Logo iconSize={26} textClassName="text-[23px]" />
        </Link>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/search"
            aria-label={locale === "en" ? "Search" : "Поиск"}
            className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="m17 17-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <AuthButton locale={locale} />
          <SettingsMenu locale={locale} theme={theme} />
        </div>
      </div>
    </header>
  );
}
