import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";

export const dynamic = "force-dynamic";

type RApp = { title?: string; ratings?: number };
type RSet = { name: string; nameEn?: string; apps?: RApp[] };
const RATING = RATING_BY_SLUG as Record<string, RSet>;

// Crawlable directory of every app teardown, grouped by niche. Footer-linked so
// search engines have a path to all per-app pages (otherwise they'd be orphans).
// Low-key for humans, full crawl surface for bots.

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const title = ru ? "Все приложения — разборы отзывов | inApp" : "All apps — review breakdowns | inApp";
  const description = ru
    ? "Полный список приложений с разбором отзывов по нишам: что хвалят, на что злятся, цитаты пользователей."
    : "Every app we've analyzed, grouped by niche: what users love, what they hate, with real quotes.";
  return {
    title,
    description,
    alternates: { canonical: `https://inapp.pro/${lp}/apps`, languages: { ru: "https://inapp.pro/ru/apps", en: "https://inapp.pro/en/apps", "x-default": "https://inapp.pro/en/apps" } },
    robots: { index: true, follow: true },
  };
}

export default async function AppsDirectory() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";

  // Built straight from the people's-rating catalog so every active niche and
  // its analyzed apps are here — the authoritative, current source. Each app
  // links to its niche rating page, where its verdict lives.
  const groups = Object.entries(RATING)
    .filter(([slug]) => isActiveCategory(slug))
    .map(([slug, r]) => {
      const apps = (r.apps ?? [])
        .filter((a) => a.title)
        .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
        .map((a) => a.title as string);
      if (!apps.length) return null;
      return { slug, name: (ru ? r.name : r.nameEn) || r.name, apps };
    })
    .filter((g): g is { slug: string; name: string; apps: string[] } => !!g)
    .sort((a, b) => a.name.localeCompare(b.name, ru ? "ru" : "en"));

  const total = groups.reduce((s, g) => s + g.apps.length, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-title1 text-[var(--color-text-primary)]">
        {ru ? "Все приложения" : "All apps"}
      </h1>
      <p className="mt-2 text-callout text-[var(--color-text-tertiary)]">
        {ru ? `${total.toLocaleString("ru-RU")} приложений с разбором отзывов в ${groups.length} нишах` : `${total.toLocaleString("en-US")} apps with review breakdowns across ${groups.length} niches`}
      </p>

      <div className="mt-10 flex flex-col gap-9">
        {groups.map((g) => (
          <section key={g.slug}>
            <Link href={`${lp}/rating/${g.slug}`} className="text-subhead text-[var(--color-text-primary)] hover:text-[var(--color-text-brand)]">
              {g.name}
            </Link>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {g.apps.map((a, i) => (
                <Link key={i} href={`${lp}/rating/${g.slug}`} className="text-callout text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline">
                  {a}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
