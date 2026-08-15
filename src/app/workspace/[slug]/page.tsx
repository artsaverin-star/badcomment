import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import CategoryWorkspaceNav, { CategoryWorkspaceHeader, type CategoryWorkspaceView } from "@/components/CategoryWorkspaceNav";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { ideaCard, ideaContentEn } from "@/lib/regenCards";
import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { appSlugify } from "@/lib/ratingAppSlug";
import { getNichePatterns, listSourceApps, reviewNicheTotals, themeLabel } from "@/lib/reviews";
import { getSessionUser } from "@/lib/session";
import { canUseWorkspaceBeta } from "@/lib/workspaceAccess";

export const dynamic = "force-dynamic";

type RatingApp = {
  id: string;
  title: string;
  icon?: string | null;
  storeAvg?: number | null;
  ratings?: number;
  realScore?: number | null;
  verdict?: string;
  en?: { verdict?: string };
};
type RatingSet = { name: string; nameEn?: string; apps: RatingApp[] };

const VIEWS: CategoryWorkspaceView[] = ["overview", "apps", "reviews", "ideas"];

function viewFrom(value: string | string[] | undefined): CategoryWorkspaceView {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "build") return "ideas";
  return VIEWS.includes(candidate as CategoryWorkspaceView) ? candidate as CategoryWorkspaceView : "overview";
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanTitle(value: string) {
  const title = (value || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const rating = (RATING_BY_SLUG as Record<string, RatingSet>)[slug];
  const name = rating ? (ru ? rating.name : rating.nameEn || rating.name) : slug;
  return {
    title: `${name} — beta`,
    description: ru ? "Закрытая beta структуры категории." : "Private beta of the category structure.",
    robots: { index: false, follow: false },
  };
}

export default async function WorkspaceCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string | string[]; app?: string | string[] }>;
}) {
  const [{ slug }, query, locale, user] = await Promise.all([params, searchParams, getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const rating = (RATING_BY_SLUG as Record<string, RatingSet>)[slug];
  const corpus = reviewNicheTotals(slug);
  if (!rating || !corpus) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const active = viewFrom(query.view);
  const selectedAppId = one(query.app);
  const name = ru ? rating.name : rating.nameEn || rating.name;
  const ideas = listIdeas().filter((idea) => idea.category === slug);
  const patterns = [...getNichePatterns(slug, locale)].sort((a, b) => (b.count || 0) - (a.count || 0));
  const reviewApps = [...listSourceApps(slug)].sort((a, b) => b.total - a.total);
  const reviewById = new Map(reviewApps.map((app) => [app.id, app]));
  const ratingById = new Map(rating.apps.map((app) => [app.id, app]));
  const selectedReviewApp = selectedAppId ? reviewById.get(selectedAppId) : undefined;
  const selectedRatingApp = selectedAppId ? ratingById.get(selectedAppId) : undefined;

  const ideaTitle = (idea: (typeof ideas)[number]) => {
    const card = ideaCard(idea.slug, locale);
    const en = locale === "en" ? ideaContentEn(idea.slug, locale) : null;
    return cleanTitle(card?.title ?? en?.title ?? idea.title);
  };

  const topApps = rating.apps.slice(0, 5);
  const topPatterns = patterns.slice(0, 6);
  const topIdeas = ideas.slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 pb-28 pt-10 sm:px-6 sm:pt-16">
      <AtmosphereSetter random />
      <CategoryWorkspaceHeader name={name} locale={locale} apps={corpus.apps} reviews={corpus.reviews} />

      <div className="mt-8 grid gap-8 md:grid-cols-[210px_minmax(0,1fr)] md:gap-12">
        <CategoryWorkspaceNav slug={slug} locale={locale} active={active} />
        <div className="min-w-0">
          {active === "overview" && (
            <div>
              <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Сводка" : "Summary"}</h2>
              <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Рынок → проблемы → идеи" : "Market → problems → ideas"}</p>

              <section className="mt-8" aria-labelledby="workspace-market">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 id="workspace-market" className="text-title3 text-[var(--color-text-primary)]">{ru ? "1. Приложения" : "1. Apps"}</h3>
                  <Link href={`${lp}/workspace/${slug}?view=apps`} className="text-footnote text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Весь рейтинг" : "Full ranking"}</Link>
                </div>
                <ol className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {topApps.map((app, index) => (
                    <li key={app.id}>
                      <Link href={`${lp}/workspace/${slug}?view=apps&app=${app.id}`} className="group flex items-center gap-3 py-3.5">
                        <span className="w-6 text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
                        {app.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={app.icon} alt="" width={36} height={36} className="size-9 rounded-[9px] object-cover" />
                        ) : <span className="size-9 rounded-[9px] bg-[var(--color-bg-muted)]" />}
                        <span className="min-w-0 flex-1 truncate text-subhead text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{app.title}</span>
                        <span className="text-caption tabular-nums text-[var(--color-text-secondary)]">{app.realScore ?? "—"}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-10" aria-labelledby="workspace-problems">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 id="workspace-problems" className="text-title3 text-[var(--color-text-primary)]">{ru ? "2. Темы отзывов" : "2. Review topics"}</h3>
                  <Link href={`${lp}/workspace/${slug}?view=reviews`} className="text-footnote text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Все темы" : "All topics"}</Link>
                </div>
                <ol className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {topPatterns.map((pattern) => (
                    <li key={`${pattern.title}-${pattern.polarity}`} className="flex items-start justify-between gap-5 py-3.5">
                      <span className="text-callout text-[var(--color-text-primary)]">{ru ? pattern.title : pattern.titleEn || pattern.title}</span>
                      <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{(pattern.count || 0).toLocaleString(lc)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-10" aria-labelledby="workspace-solutions">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 id="workspace-solutions" className="text-title3 text-[var(--color-text-primary)]">{ru ? "3. Идеи" : "3. Ideas"}</h3>
                  <Link href={`${lp}/workspace/${slug}?view=ideas`} className="text-footnote text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Все идеи" : "All ideas"}</Link>
                </div>
                <ol className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {topIdeas.map((idea, index) => (
                    <li key={idea.slug} className="flex items-center gap-3 py-4">
                      <span className="w-6 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
                      <span className="min-w-0 flex-1 text-callout text-[var(--color-text-primary)]">{ideaTitle(idea)}</span>
                      <Link href={`${lp}/build/${slug}/${idea.slug}`} className="shrink-0 text-footnote font-semibold text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "План" : "Plan"}</Link>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}

          {active === "apps" && selectedReviewApp && (
            <article>
              <Link href={`${lp}/workspace/${slug}?view=apps`} className="text-footnote text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "← Все приложения" : "← All apps"}</Link>
              <div className="mt-6 flex items-center gap-4">
                {selectedRatingApp?.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedRatingApp.icon} alt="" width={64} height={64} className="size-16 rounded-[16px] object-cover" />
                ) : <span className="size-16 rounded-[16px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0 flex-1">
                  <h2 className="text-title2 text-balance text-[var(--color-text-primary)]">{selectedReviewApp.title}</h2>
                  <p className="mt-1 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                    {selectedReviewApp.total.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}
                    {selectedRatingApp?.storeAvg ? ` · ${selectedRatingApp.storeAvg.toFixed(1)}★` : ""}
                    {selectedRatingApp?.realScore ? ` · ${selectedRatingApp.realScore} ${ru ? "балл inApp" : "inApp score"}` : ""}
                  </p>
                </div>
              </div>
              {selectedRatingApp?.verdict && <p className="mt-6 text-callout text-pretty text-[var(--color-text-secondary)]">{ru ? selectedRatingApp.verdict : selectedRatingApp.en?.verdict || selectedRatingApp.verdict}</p>}

              <section className="mt-10">
                <h3 className="text-title3 text-[var(--color-text-primary)]">{ru ? "Темы приложения" : "App topics"}</h3>
                <ol className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {[...selectedReviewApp.themes].filter((theme) => !theme.fallback).sort((a, b) => b.count - a.count).map((theme) => (
                    <li key={`${theme.name}-${theme.polarity}`} className="flex items-start justify-between gap-5 py-4">
                      <span>
                        <span className="block text-callout text-[var(--color-text-primary)]">{themeLabel(theme, locale)}</span>
                        <span className="mt-1 block text-caption text-[var(--color-text-tertiary)]">{theme.polarity === "pain" ? (ru ? "жалобы" : "complaints") : theme.polarity === "love" ? (ru ? "похвала" : "praise") : (ru ? "смешанная тема" : "mixed")}</span>
                      </span>
                      <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{theme.count.toLocaleString(lc)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={`${lp}/reviews/${slug}/${selectedReviewApp.id}`} className="rounded-full bg-[var(--color-text-primary)] px-5 py-3 text-footnote font-semibold text-[var(--color-bg-page)]">{ru ? "Открыть отзывы" : "Open reviews"}</Link>
                {selectedRatingApp && <Link href={`${lp}/rating/${slug}/${appSlugify(selectedRatingApp.title)}`} className="rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-footnote font-semibold text-[var(--color-text-primary)]">{ru ? "Полный разбор" : "Full breakdown"}</Link>}
              </div>
            </article>
          )}

          {active === "apps" && !selectedReviewApp && (
            <section>
              <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Приложения" : "Apps"}</h2>
              <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Рейтинг по содержанию отзывов" : "Ranking based on review text"}</p>
              <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                {rating.apps.map((app, index) => (
                  <li key={app.id}>
                    <Link href={`${lp}/workspace/${slug}?view=apps&app=${app.id}`} className="group flex items-center gap-4 py-4">
                      <span className="w-7 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
                      {app.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={app.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] object-cover" />
                      ) : <span className="size-11 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-subhead text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{app.title}</span>
                        <span className="mt-1 block text-caption tabular-nums text-[var(--color-text-tertiary)]">{app.storeAvg?.toFixed(1) ?? "—"}★ · {(app.ratings || 0).toLocaleString(lc)} {ru ? "оценок" : "ratings"}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-headline tabular-nums text-[var(--color-text-primary)]">{app.realScore ?? "—"}</span>
                        <span className="block text-caption text-[var(--color-text-tertiary)]">{ru ? "балл" : "score"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {active === "reviews" && (
            <div>
              <section>
                <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Темы категории" : "Category topics"}</h2>
                <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Повторяются в отзывах разных приложений" : "Repeated across reviews from different apps"}</p>
                <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {patterns.map((pattern) => (
                    <li key={`${pattern.title}-${pattern.polarity}`} className="py-4">
                      <div className="flex items-start justify-between gap-5">
                        <h3 className="text-callout text-[var(--color-text-primary)]">{ru ? pattern.title : pattern.titleEn || pattern.title}</h3>
                        <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{(pattern.count || 0).toLocaleString(lc)}</span>
                      </div>
                      <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">{pattern.apps.length.toLocaleString(lc)} {ru ? "приложений" : "apps"} · {pattern.polarity === "pain" ? (ru ? "жалобы" : "complaints") : pattern.polarity === "love" ? (ru ? "похвала" : "praise") : (ru ? "смешанная тема" : "mixed")}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-12">
                <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Отзывы по приложениям" : "Reviews by app"}</h2>
                <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Приложение → его темы → тексты отзывов" : "App → its topics → review texts"}</p>
                <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                  {reviewApps.map((app) => {
                    const ratingApp = ratingById.get(app.id);
                    const topics = app.themes.filter((theme) => !theme.fallback).sort((a, b) => b.count - a.count);
                    return (
                      <li key={app.id}>
                        <Link href={`${lp}/workspace/${slug}?view=apps&app=${app.id}`} className="group flex items-center gap-4 py-4">
                          {ratingApp?.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ratingApp.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] object-cover" />
                          ) : <span className="size-11 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-subhead text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{app.title}</span>
                            <span className="mt-1 block truncate text-caption text-[var(--color-text-tertiary)]">{topics.slice(0, 2).map((topic) => themeLabel(topic, locale)).join(" · ") || (ru ? "темы ещё не готовы" : "topics not ready")}</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-footnote tabular-nums text-[var(--color-text-secondary)]">{app.total.toLocaleString(lc)}</span>
                            <span className="block text-caption text-[var(--color-text-tertiary)]">{topics.length.toLocaleString(lc)} {ru ? "тем" : "topics"}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
          )}

          {active === "ideas" && (
            <section>
              <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Идеи и создание" : "Ideas & creation"}</h2>
              <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Идея → разбор → план продукта" : "Idea → breakdown → product plan"}</p>
              <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                {ideas.map((idea, index) => (
                  <li key={idea.slug} className="py-5">
                    <div className="flex gap-3">
                      <span className="w-6 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-headline text-[var(--color-text-primary)]">{ideaTitle(idea)}</h3>
                        <p className="mt-2 text-caption tabular-nums text-[var(--color-text-tertiary)]">{idea.stats.observations.toLocaleString(lc)} {ru ? "наблюдений" : "observations"}</p>
                        <div className="mt-4 flex flex-wrap gap-4">
                          <Link href={`${lp}/ideas/${idea.slug}`} className="text-footnote font-semibold text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Разбор идеи" : "Idea breakdown"}</Link>
                          <Link href={`${lp}/build/${slug}/${idea.slug}`} className="text-footnote font-semibold text-[var(--color-text-primary)] underline underline-offset-4">{ru ? "План продукта" : "Product plan"}</Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href={`${lp}/build/${slug}`} className="mt-7 inline-flex rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-footnote font-semibold text-[var(--color-text-primary)]">{ru ? "Выбрать проблему вручную" : "Choose a problem manually"}</Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
