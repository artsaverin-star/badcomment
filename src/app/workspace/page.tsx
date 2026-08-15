import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { plural } from "@/lib/format";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNichePatterns, reviewCorpusSlugs, reviewNicheTotals } from "@/lib/reviews";
import { getSessionUser } from "@/lib/session";
import { canUseWorkspaceBeta } from "@/lib/workspaceAccess";

export const dynamic = "force-dynamic";

type RatingApp = { icon?: string | null; ratings?: number };
type RatingSet = { name: string; nameEn?: string; count?: number; totalReviews?: number; apps?: RatingApp[] };

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  return {
    title: ru ? "Категории — beta" : "Categories — beta",
    description: ru ? "Закрытая beta новой структуры категорий." : "Private beta of the new category structure.",
    robots: { index: false, follow: false },
  };
}

export default async function WorkspacePage() {
  const [locale, user] = await Promise.all([getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const ideaCounts = new Map<string, number>();
  for (const idea of listIdeas()) ideaCounts.set(idea.category, (ideaCounts.get(idea.category) || 0) + 1);

  const reviewSlugs = new Set(reviewCorpusSlugs());
  const categories = Object.entries(RATING_BY_SLUG as Record<string, RatingSet>)
    .filter(([slug]) => reviewSlugs.has(slug))
    .map(([slug, rating]) => {
      const category = getCategoryBySlug(slug, locale);
      const corpus = reviewNicheTotals(slug);
      const icons = [...(rating.apps || [])]
        .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
        .map((app) => app.icon)
        .filter((icon): icon is string => !!icon)
        .slice(0, 3);
      return {
        slug,
        name: ru ? rating.name : rating.nameEn || rating.name,
        kicker: category?.kicker || "",
        apps: corpus?.apps ?? rating.count ?? 0,
        reviews: corpus?.reviews ?? rating.totalReviews ?? 0,
        ideas: ideaCounts.get(slug) || 0,
        topics: getNichePatterns(slug, locale).length,
        icons,
      };
    })
    .sort((a, b) => b.reviews - a.reviews);

  const totalApps = categories.reduce((sum, category) => sum + category.apps, 0);
  const totalReviews = categories.reduce((sum, category) => sum + category.reviews, 0);
  const totalIdeas = categories.reduce((sum, category) => sum + category.ideas, 0);

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-28 pt-14 sm:px-6 sm:pt-20">
      <AtmosphereSetter random />
      <header>
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">Beta · Admin</p>
        <h1 className="mt-3 text-display text-balance text-[var(--color-text-primary)]">{ru ? "Категории" : "Categories"}</h1>
        <p className="mt-4 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Выберите категорию. Внутри: обзор, приложения, идеи, размеченные отзывы и создание. Публичные разделы не изменены."
            : "Choose a category. Each category contains its overview, apps, ideas, labelled reviews and creation flow. Public sections are unchanged."}
        </p>
        <div className="mt-8 flex flex-wrap gap-x-9 gap-y-3 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
          <span>{categories.length.toLocaleString(lc)} {ru ? plural(categories.length, "категория", "категории", "категорий") : "categories"}</span>
          <span>{totalApps.toLocaleString(lc)} {ru ? plural(totalApps, "приложение", "приложения", "приложений") : "apps"}</span>
          <span>{totalReviews.toLocaleString(lc)} {ru ? plural(totalReviews, "отзыв", "отзыва", "отзывов") : "reviews"}</span>
          <span>{totalIdeas.toLocaleString(lc)} {ru ? plural(totalIdeas, "идея", "идеи", "идей") : "ideas"}</span>
        </div>
      </header>

      <section className="mt-12 grid gap-3 sm:grid-cols-2" aria-label={ru ? "Категории" : "Categories"}>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`${lp}/workspace/${category.slug}`}
            className="card-min group flex min-h-32 items-center gap-4 rounded-[22px] p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="flex w-[72px] shrink-0 items-center">
              {category.icons.map((icon, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={icon}
                  src={icon}
                  alt=""
                  width={42}
                  height={42}
                  loading="lazy"
                  className={`size-[42px] rounded-[11px] border border-[var(--color-border-subtle)] object-cover ${index > 0 ? "-ml-7" : ""}`}
                />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-headline text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{category.name}</span>
              {category.kicker && <span className="mt-1 line-clamp-2 block text-caption text-[var(--color-text-tertiary)]">{category.kicker}</span>}
              <span className="mt-3 block text-caption tabular-nums text-[var(--color-text-secondary)]">
                {category.apps.toLocaleString(lc)} {ru ? "прил." : "apps"} · {category.reviews.toLocaleString(lc)} {ru ? "отзывов" : "reviews"} · {category.ideas.toLocaleString(lc)} {ru ? "идей" : "ideas"}
              </span>
              <span className="mt-1 block text-caption tabular-nums text-[var(--color-text-tertiary)]">
                {category.topics.toLocaleString(lc)} {ru ? "тем категории" : "category topics"}
              </span>
            </span>
            <span className="text-title3 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
