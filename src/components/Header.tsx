import Link from "next/link";
import LangSwitch from "./LangSwitch";
import type { Locale } from "@/lib/i18n";

export default function Header({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-page)]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-[20px] font-bold tracking-[-0.3px] text-[var(--color-text-primary)] [font-family:var(--brand-font-family)]"
        >
          bad<span className="text-[var(--color-text-brand)]">comment</span>
        </Link>
        <LangSwitch locale={locale} />
      </div>
    </header>
  );
}
