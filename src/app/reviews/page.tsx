import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import reviewsIndex from "@/data/reviewsIndex.json";

export const dynamic = "force-dynamic";

type Idx = Record<string, { name: string; apps: { id: string; title: string; total: number; themes: unknown[] }[] }>;
const IDX = reviewsIndex as Idx;

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const title = ru ? "Отзывы по темам — inApp" : "Reviews by theme — inApp";
  const description = ru
    ? "Реальные отзывы каждого приложения, разобранные по его собственным темам с подсчётом."
    : "Every app's real reviews, broken down into its own themes with counts.";
  return { title, description, alternates: { canonical: "/reviews" } };
}

export default async function ReviewsHome() {
  const ru = (await getLocale()) !== "en";
  const lp = ru ? "/ru" : "/en";
  const niches = Object.entries(IDX)
    .map(([slug, v]) => ({ slug, name: v.name, apps: v.apps.length, reviews: v.apps.reduce((s, a) => s + (a.total || 0), 0) }))
    .sort((a, b) => b.reviews - a.reviews);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-display font-bold text-[var(--color-text-primary)]">{ru ? "Отзывы" : "Reviews"}</h1>
      <p className="mt-3 max-w-[60ch] text-body text-[var(--color-text-secondary)]">
        {ru
          ? "Реальные отзывы по каждому приложению, разобранные по его собственным темам. Тема, число отзывов, тональность. Кликни тему, чтобы прочитать именно эти отзывы."
          : "Real reviews for each app, grouped into its own themes. Theme, review count, sentiment. Tap a theme to read exactly those reviews."}
      </p>

      {niches.length === 0 ? (
        <p className="mt-10 text-body text-[var(--color-text-tertiary)]">{ru ? "Скоро." : "Coming soon."}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {niches.map((n) => (
            <li key={n.slug}>
              <Link
                href={`${lp}/reviews/${n.slug}`}
                className="flex items-baseline justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]"
              >
                <span className="text-headline text-[var(--color-text-primary)]">{n.name}</span>
                <span className="shrink-0 text-footnote text-[var(--color-text-tertiary)]">
                  <span className="tabular-nums">{n.apps}</span> {ru ? "прил" : "apps"} · <span className="tabular-nums">{n.reviews.toLocaleString(ru ? "ru-RU" : "en-US")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
