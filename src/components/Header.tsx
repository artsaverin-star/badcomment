import Link from "next/link";
import NavTabs from "./NavTabs";
import MobileNav from "./MobileNav";
import AuthButton from "./AuthButton";
import HeaderSearch from "./HeaderSearch";
import SettingsMenu from "./SettingsMenu";
import { t, type Locale } from "@/lib/i18n";

// Translucent sticky top bar: wordmark + nav (left), catalog search (center),
// settings + sign-in (right). Under sm everything collapses into MobileNav's
// sheet so a phone shows only the wordmark + a single menu button.
export default function Header({
  locale,
  theme,
}: {
  locale: Locale;
  theme: "light" | "dark";
}) {
  const tr = t(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_82%,transparent)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="shrink-0 text-[22px] font-bold tracking-[-0.2px] [font-family:var(--brand-font-family)]"
          >
            <span className="text-[var(--color-text-primary)]">inApp</span>
          </Link>
          <div className="hidden sm:block">
            <NavTabs catalogLabel={tr.nav.catalog} ideasLabel={tr.nav.ideas} />
          </div>
        </div>

        {/* Desktop search (center) + controls (right) */}
        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <HeaderSearch locale={locale} />
          <SettingsMenu locale={locale} theme={theme} />
          <AuthButton locale={locale} />
        </div>

        {/* Phone: one menu button → sheet */}
        <div className="ml-auto sm:hidden">
          <MobileNav locale={locale} theme={theme} />
        </div>
      </div>
    </header>
  );
}
