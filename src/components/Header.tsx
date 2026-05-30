import Link from "next/link";
import LangSwitch from "./LangSwitch";
import type { Locale } from "@/lib/i18n";

export default function Header({ locale }: { locale: Locale }) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          bad<span className="text-red-600">comment</span>
        </Link>
        <LangSwitch locale={locale} />
      </div>
    </header>
  );
}
