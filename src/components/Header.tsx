import Link from "next/link";
import LangSwitch from "./LangSwitch";
import NavTabs from "./NavTabs";
import ThemeSwitch from "./ThemeSwitch";
import MobileNav from "./MobileNav";
import AuthButton from "./AuthButton";
import { t, type Locale } from "@/lib/i18n";

// Translucent sticky top bar (Apple-style: blurred surface + hairline).
// Desktop keeps controls inline; under sm they collapse into MobileNav's sheet
// so a phone shows only the wordmark + a single menu button.
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
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="shrink-0 text-[22px] font-bold tracking-[-0.2px] [font-family:var(--brand-font-family)]"
          >
            <span className="text-[var(--color-text-brand)]">in</span>
            <span className="text-[var(--color-text-primary)]">App</span>
          </Link>
          <div className="hidden sm:block">
            <NavTabs catalogLabel={tr.nav.catalog} ideasLabel={tr.nav.ideas} />
          </div>
        </div>

        {/* Desktop controls */}
        <div className="hidden items-center gap-3 sm:flex">
          <LangSwitch locale={locale} />
          <ThemeSwitch theme={theme} />
          <AuthButton />
        </div>

        {/* Phone: one menu button → sheet */}
        <div className="sm:hidden">
          <MobileNav locale={locale} theme={theme} />
        </div>
      </div>
    </header>
  );
}
