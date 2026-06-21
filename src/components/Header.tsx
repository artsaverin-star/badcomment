import Link from "next/link";
import AuthButton from "./AuthButton";
import HeaderSearch from "./HeaderSearch";
import SettingsMenu from "./SettingsMenu";
import Logo from "./Logo";
import { type Locale } from "@/lib/i18n";

// Sticky top bar — identical structure on phone and desktop (getgems-style): the
// wordmark + section nav on the left, the catalog search + sign-in + the animated
// settings menu on the right. On phones the nav collapses to icons and the search
// drops to a full-width row under the bar, so the nice menu animation is the same
// everywhere (no separate hamburger sheet).
export default function Header({
  locale,
  theme,
}: {
  locale: Locale;
  theme: "light" | "dark";
}) {
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg-page)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="inApp"
          className="flex shrink-0 items-center transition-opacity hover:opacity-70"
        >
          <Logo iconSize={30} textClassName="text-[30px]" />
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <HeaderSearch locale={locale} />
          </div>
          <Link
            href="/search"
            aria-label={locale === "en" ? "Search" : "Поиск"}
            className="flex size-9 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] sm:hidden"
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
