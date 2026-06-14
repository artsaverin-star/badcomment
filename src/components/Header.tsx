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
        <Link
          href="/"
          className="shrink-0 text-[22px] font-bold tracking-[-0.2px] [font-family:var(--brand-font-family)]"
        >
          <span className="text-[var(--color-text-primary)]">inApp</span>
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
