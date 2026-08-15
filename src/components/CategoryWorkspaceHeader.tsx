import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { plural } from "@/lib/format";

export default function CategoryWorkspaceHeader({
  name,
  locale,
  apps,
  reviews,
  topics,
}: {
  name: string;
  locale: Locale;
  apps: number;
  reviews: number;
  topics: number;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  return (
    <header className="border-b border-[var(--color-border-subtle)] pb-7">
      <Link href={`${lp}/workspace`} className="text-caption font-medium text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">
        {ru ? "← Все категории" : "← All categories"}
      </Link>
      <p className="mt-5 text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">Beta</p>
      <h1 className="mt-1 text-title1 text-balance text-[var(--color-text-primary)]">{name}</h1>
      <p className="mt-3 text-caption tabular-nums text-[var(--color-text-tertiary)]">
        {apps.toLocaleString(lc)} {ru ? plural(apps, "приложение", "приложения", "приложений") : apps === 1 ? "app" : "apps"}
        {` · ${reviews.toLocaleString(lc)} ${ru ? plural(reviews, "отзыв", "отзыва", "отзывов") : reviews === 1 ? "review" : "reviews"}`}
        {` · ${topics.toLocaleString(lc)} ${ru ? plural(topics, "тема", "темы", "тем") : topics === 1 ? "topic" : "topics"}`}
      </p>
    </header>
  );
}
