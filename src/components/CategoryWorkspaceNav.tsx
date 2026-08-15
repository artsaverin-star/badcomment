import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { plural } from "@/lib/format";

export type CategoryWorkspaceView = "overview" | "apps" | "ideas" | "reviews" | "build";

export default function CategoryWorkspaceNav({
  slug,
  name,
  locale,
  active,
  apps,
  reviews,
  ideas,
}: {
  slug: string;
  name: string;
  locale: Locale;
  active: CategoryWorkspaceView;
  apps: number;
  reviews: number;
  ideas: number;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const base = `${lp}/workspace/${slug}`;
  const tabs: { key: CategoryWorkspaceView; label: string; href: string }[] = [
    { key: "overview", label: ru ? "Обзор" : "Overview", href: base },
    { key: "apps", label: ru ? "Приложения" : "Apps", href: `${base}?view=apps` },
    { key: "ideas", label: ru ? "Идеи" : "Ideas", href: `${base}?view=ideas` },
    { key: "reviews", label: ru ? "Отзывы" : "Reviews", href: `${base}?view=reviews` },
    { key: "build", label: ru ? "Создать" : "Create", href: `${base}?view=build` },
  ];

  return (
    <header className="border-b border-[var(--color-border-subtle)] pb-5">
      <Link href={`${lp}/workspace`} className="text-caption font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">
        {ru ? "← Категории" : "← Categories"}
      </Link>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">Beta</p>
          <h1 className="mt-1 text-title1 text-balance text-[var(--color-text-primary)]">{name}</h1>
        </div>
        <p className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {apps.toLocaleString(lc)} {ru ? plural(apps, "приложение", "приложения", "приложений") : apps === 1 ? "app" : "apps"}
          {` · ${reviews.toLocaleString(lc)} ${ru ? plural(reviews, "отзыв", "отзыва", "отзывов") : reviews === 1 ? "review" : "reviews"}`}
          {` · ${ideas.toLocaleString(lc)} ${ru ? plural(ideas, "идея", "идеи", "идей") : ideas === 1 ? "idea" : "ideas"}`}
        </p>
      </div>
      <div className="-mx-1 mt-5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav className="flex min-w-max items-center gap-1" aria-label={ru ? `Разделы категории «${name}»` : `${name} sections`}>
          {tabs.map((tab) => {
            const current = tab.key === active;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-footnote font-semibold transition-colors ${
                  current
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
