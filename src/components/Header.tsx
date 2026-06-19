import Link from "next/link";
import AuthButton from "./AuthButton";
import HeaderSearch from "./HeaderSearch";
import SettingsMenu from "./SettingsMenu";
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
          className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1 pl-1 pr-3.5 transition-colors hover:border-[var(--color-border-strong)]"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </span>
          <span className="text-[18px] font-bold leading-none tracking-[-0.2px] text-[var(--color-text-primary)] [font-family:var(--brand-font-family)]">inApp</span>
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
