import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { getLocale } from "@/lib/i18n.server";
import { plural } from "@/lib/format";
import { reviewCorpusSlugs, reviewNicheTotals } from "@/lib/reviews";
import { getSessionUser } from "@/lib/session";
import { canUseWorkspaceBeta } from "@/lib/workspaceAccess";
import { WORKSPACE_DOMAINS } from "@/lib/workspaceTaxonomy";

export const dynamic = "force-dynamic";

type RatingApp = { icon?: string | null; ratings?: number };
type RatingSet = { name: string; nameEn?: string; count?: number; totalReviews?: number; apps?: RatingApp[] };

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  return {
    title: ru ? "Категории — beta" : "Categories — beta",
    description: ru ? "Закрытая beta структуры категорий." : "Private beta of the category structure.",
    robots: { index: false, follow: false },
  };
}

export default async function WorkspacePage() {
  const [locale, user] = await Promise.all([getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const reviewSlugs = new Set(reviewCorpusSlugs());
  const ratingBySlug = RATING_BY_SLUG as Record<string, RatingSet>;

  const categoryBySlug = new Map(
    Object.entries(ratingBySlug)
      .filter(([slug]) => reviewSlugs.has(slug))
      .map(([slug, rating]) => {
        const corpus = reviewNicheTotals(slug);
        const icons = [...(rating.apps || [])]
          .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
          .map((app) => app.icon)
          .filter((value): value is string => !!value)
          .slice(0, 2);
        return [slug, {
          slug,
          name: ru ? rating.name : rating.nameEn || rating.name,
          apps: corpus?.apps ?? rating.count ?? 0,
          reviews: corpus?.reviews ?? rating.totalReviews ?? 0,
          icons,
        }] as const;
      }),
  );

  const domains = WORKSPACE_DOMAINS.map((domain) => ({
    slug: domain.slug,
    name: ru ? domain.nameRu : domain.nameEn,
    categories: domain.categories
      .map((slug) => categoryBySlug.get(slug))
      .filter((category): category is NonNullable<typeof category> => !!category)
      .sort((a, b) => b.reviews - a.reviews),
  })).filter((domain) => domain.categories.length > 0);

  const categories = domains.flatMap((domain) => domain.categories);
  const totalApps = categories.reduce((sum, category) => sum + category.apps, 0);
  const totalReviews = categories.reduce((sum, category) => sum + category.reviews, 0);

  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <AtmosphereSetter random />
      <header className="border-b border-[var(--color-border-subtle)] pb-9">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">Beta · Admin</p>
        <h1 className="mt-3 text-display text-balance text-[var(--color-text-primary)]">{ru ? "Категории приложений" : "App categories"}</h1>
        <p className="mt-4 max-w-[54ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru ? "Сначала выберите область, затем категорию." : "Choose a domain, then a category."}
        </p>
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-2 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          <span>{domains.length.toLocaleString(lc)} {ru ? plural(domains.length, "область", "области", "областей") : "domains"}</span>
          <span>{categories.length.toLocaleString(lc)} {ru ? plural(categories.length, "категория", "категории", "категорий") : "categories"}</span>
          <span>{totalApps.toLocaleString(lc)} {ru ? plural(totalApps, "приложение", "приложения", "приложений") : "apps"}</span>
          <span>{totalReviews.toLocaleString(lc)} {ru ? plural(totalReviews, "отзыв", "отзыва", "отзывов") : "reviews"}</span>
        </div>
      </header>

      <div className="mt-4 border-y border-[var(--color-border-subtle)]">
        {domains.map((domain) => (
          <details key={domain.slug} className="group border-b border-[var(--color-border-subtle)] last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <h2 className="min-w-0 flex-1 text-title3 text-[var(--color-text-primary)]">{domain.name}</h2>
              <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{domain.categories.length} {ru ? "кат." : "cat."}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="grid gap-x-8 pb-6 sm:grid-cols-2">
              {domain.categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`${lp}/workspace/${category.slug}`}
                  className="group/category flex min-h-20 items-center gap-3 border-t border-[var(--color-border-subtle)] py-4"
                >
                  <span className="flex w-[54px] shrink-0 items-center">
                    {category.icons.map((icon, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={icon}
                        src={icon}
                        alt=""
                        width={38}
                        height={38}
                        loading="lazy"
                        className={`size-[38px] rounded-[10px] border border-[var(--color-border-subtle)] object-cover ${index > 0 ? "-ml-5" : ""}`}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-subhead text-[var(--color-text-primary)] group-hover/category:text-[var(--color-text-brand)]">{category.name}</span>
                    <span className="mt-1 block text-caption tabular-nums text-[var(--color-text-tertiary)]">
                      {category.apps.toLocaleString(lc)} {ru ? "прил." : "apps"} · {category.reviews.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}
                    </span>
                  </span>
                  <span className="shrink-0 text-callout text-[var(--color-text-tertiary)] transition-transform group-hover/category:translate-x-1">→</span>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
