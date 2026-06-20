import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import active from "@/data/active-categories.json";

export const dynamic = "force-dynamic";

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

  const groups = (active as string[])
    .map((cs) => {
      const cat = getCategoryBySlug(cs, locale);
      if (!cat) return null;
      const apps = cat.apps
        .filter((a) => a.productId && hasInsight(a.productId))
        .map((a) => ({ name: a.name, slug: getSlugByProductId(a.productId as string) }))
        .filter((a): a is { name: string; slug: string } => !!a.slug);
      if (!apps.length) return null;
      return { slug: cs, name: cat.name, apps };
    })
    .filter((g): g is { slug: string; name: string; apps: { name: string; slug: string }[] } => !!g);

  const total = groups.reduce((s, g) => s + g.apps.length, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[36px]">
        {ru ? "Все приложения" : "All apps"}
      </h1>
      <p className="mt-2 text-[15px] text-[var(--color-text-tertiary)]">
        {ru ? `${total} приложений с разбором отзывов в ${groups.length} нишах` : `${total} apps with review breakdowns across ${groups.length} niches`}
      </p>

      <div className="mt-10 flex flex-col gap-9">
        {groups.map((g) => (
          <section key={g.slug}>
            <Link href={`/segment/${g.slug}`} className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)] hover:text-[var(--color-text-brand)]">
              {g.name}
            </Link>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {g.apps.map((a) => (
                <Link key={a.slug} href={`/${a.slug}`} className="text-[14px] text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline">
                  {a.name}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
