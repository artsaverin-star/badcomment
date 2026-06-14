import Link from "next/link";
import NavTabs from "./NavTabs";
import AuthButton from "./AuthButton";
import HeaderSearch from "./HeaderSearch";
import SettingsMenu from "./SettingsMenu";
import { t, type Locale } from "@/lib/i18n";

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
  const tr = t(locale);
  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg-page)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="inApp" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </span>
          <span className="hidden text-[22px] font-bold tracking-[-0.2px] text-[var(--color-text-primary)] [font-family:var(--brand-font-family)] sm:inline">
            inApp
          </span>
        </Link>
        <div className="ml-1 sm:ml-3">
          <NavTabs catalogLabel={tr.nav.catalog} ideasLabel={tr.nav.ideas} />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <HeaderSearch locale={locale} />
          </div>
          <AuthButton locale={locale} />
          <SettingsMenu locale={locale} theme={theme} />
        </div>
      </div>

      {/* Phone: full-width search under the bar */}
      <div className="px-4 pb-3 sm:hidden">
        <HeaderSearch locale={locale} compact />
      </div>
    </header>
  );
}
