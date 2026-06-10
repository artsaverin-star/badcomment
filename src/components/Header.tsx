import Link from "next/link";
import { Button } from "@saverin/ui-web";
import LangSwitch from "./LangSwitch";
import NavTabs from "./NavTabs";
import ThemeSwitch from "./ThemeSwitch";
import { t, type Locale } from "@/lib/i18n";

// Figma "Menu" (2020:6402): a surface-card top bar — wordmark on the left,
// language + theme segmented switches and the sign-in button on the right.
export default function Header({
  locale,
  theme,
}: {
  locale: Locale;
  theme: "light" | "dark";
}) {
  const tr = t(locale);
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-surface-card)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 text-[22px] font-bold tracking-[-0.2px] [font-family:var(--brand-font-family)]"
          >
            <span className="text-[var(--color-text-brand)]">in</span>
            <span className="text-[var(--color-text-primary)]">App</span>
          </Link>
          <NavTabs catalogLabel={tr.nav.catalog} ideasLabel={tr.nav.ideas} />
        </div>
        <div className="flex items-center gap-3">
          <LangSwitch locale={locale} />
          <ThemeSwitch theme={theme} />
          <Button variant="primary" size="M">
            {tr.nav.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}
