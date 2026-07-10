"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale } from "@/lib/i18n";

// Bottom tab bar for phones (hidden on md+, where the header has the center nav).
// Three surfaces: ideas / breakdowns / rating, active state from the path.
const TABS: { key: string; href: string; ru: string; en: string; icon: React.ReactNode }[] = [
  {
    key: "breakdowns", href: "/", ru: "Разборы", en: "Breakdowns",
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v16" /></>,
  },
  {
    key: "ideas", href: "/ideas", ru: "Идеи", en: "Ideas",
    icon: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>,
  },
  {
    key: "rating", href: "/rating", ru: "Рейтинг", en: "Rating",
    icon: <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.15 1 5.87L12 17.1l-5.25 2.76 1-5.87L3.5 9.66l5.9-.86L12 3.5Z" />,
  },
];

export default function BottomNav({ locale }: { locale: Locale }) {
  const ru = locale !== "en";
  const raw = usePathname() || "/";
  const path = raw.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  const lp = ru ? "/ru" : "/en";
  const active =
    path.startsWith("/ideas") ? "ideas"
      : path.startsWith("/rating") ? "rating"
      : path.startsWith("/categories") || path.startsWith("/segment") || path === "/" ? "breakdowns"
      : "";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={`${lp}${t.href === "/" ? "" : t.href}`}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-caption transition-colors ${
                on ? "font-semibold text-[var(--color-text-primary)]" : "font-medium text-[var(--color-text-tertiary)]"
              }`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={on ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
              {ru ? t.ru : t.en}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
