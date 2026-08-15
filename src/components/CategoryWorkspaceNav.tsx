import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { plural } from "@/lib/format";

export type CategoryWorkspaceView = "overview" | "apps" | "reviews" | "ideas";
type WorkspaceNavItem = { key: CategoryWorkspaceView; label: string; href: string };

const icon = (name: CategoryWorkspaceView) => {
  if (name === "apps") return <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 9h16M9 4v16" /></>;
  if (name === "reviews") return <><path d="M20 11a8 8 0 0 1-8.5 8L4 20l1-7.5A8 8 0 1 1 20 11Z" /><path d="M8 10h8M8 13h5" /></>;
  if (name === "ideas") return <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" /></>;
  return <><path d="M4 19V9M10 19V5M16 19v-7M21 19H3" /></>;
};

function WorkspaceNavLink({ item, active }: { item: WorkspaceNavItem; active: CategoryWorkspaceView }) {
  const current = item.key === active;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-footnote font-semibold transition-colors ${current ? "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{icon(item.key)}</svg>
      {item.label}
    </Link>
  );
}

export function CategoryWorkspaceHeader({
  name,
  locale,
  apps,
  reviews,
}: {
  name: string;
  locale: Locale;
  apps: number;
  reviews: number;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  return (
    <header className="border-b border-[var(--color-border-subtle)] pb-6">
      <Link href={`${lp}/workspace`} className="text-caption font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">
        {ru ? "← Все категории" : "← All categories"}
      </Link>
      <p className="mt-5 text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">Beta</p>
      <h1 className="mt-1 text-title1 text-balance text-[var(--color-text-primary)]">{name}</h1>
      <p className="mt-3 text-caption tabular-nums text-[var(--color-text-tertiary)]">
        {apps.toLocaleString(lc)} {ru ? plural(apps, "приложение", "приложения", "приложений") : apps === 1 ? "app" : "apps"}
        {` · ${reviews.toLocaleString(lc)} ${ru ? plural(reviews, "отзыв", "отзыва", "отзывов") : reviews === 1 ? "review" : "reviews"}`}
      </p>
    </header>
  );
}

export default function CategoryWorkspaceNav({
  slug,
  locale,
  active,
}: {
  slug: string;
  locale: Locale;
  active: CategoryWorkspaceView;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const base = `${lp}/workspace/${slug}`;
  const research: WorkspaceNavItem[] = [
    { key: "overview", label: ru ? "Сводка" : "Summary", href: base },
    { key: "apps", label: ru ? "Приложения" : "Apps", href: `${base}?view=apps` },
    { key: "reviews", label: ru ? "Темы и отзывы" : "Topics & reviews", href: `${base}?view=reviews` },
  ];
  const action = { key: "ideas" as const, label: ru ? "Идеи и создание" : "Ideas & creation", href: `${base}?view=ideas` };

  return (
    <aside aria-label={ru ? "Структура категории" : "Category structure"}>
      <div className="card-min rounded-[18px] p-2 md:sticky md:top-24">
        <p className="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{ru ? "Исследование" : "Research"}</p>
        <nav className="flex flex-col">{research.map((item) => <WorkspaceNavLink key={item.key} item={item} active={active} />)}</nav>
        <div className="my-2 border-t border-[var(--color-border-subtle)]" />
        <p className="px-3 pb-1 text-caption font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{ru ? "Действие" : "Action"}</p>
        <WorkspaceNavLink item={action} active={active} />
      </div>
    </aside>
  );
}
