import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import CategoryWorkspaceNav, { type CategoryWorkspaceView } from "@/components/CategoryWorkspaceNav";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { ideaCard, ideaContentEn } from "@/lib/regenCards";
import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { getNicheOpportunities } from "@/lib/nicheOpportunities";
import { getNicheThesis } from "@/lib/nicheThesis";
import { appSlugify } from "@/lib/ratingAppSlug";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNichePatterns, listSourceApps, reviewNicheTotals, themeLabel } from "@/lib/reviews";
import { getSessionUser } from "@/lib/session";
import { tg } from "@/lib/typo";
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
type RatingSet = {
  name: string;
  nameEn?: string;
  count?: number;
  totalReviews?: number;
  apps: RatingApp[];
};

const VIEWS: CategoryWorkspaceView[] = ["overview", "apps", "ideas", "reviews", "build"];

function viewFrom(value: string | string[] | undefined): CategoryWorkspaceView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return VIEWS.includes(candidate as CategoryWorkspaceView) ? candidate as CategoryWorkspaceView : "overview";
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
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ slug }, query, locale, user] = await Promise.all([params, searchParams, getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const rating = (RATING_BY_SLUG as Record<string, RatingSet>)[slug];
  const category = getCategoryBySlug(slug, locale);
  const corpus = reviewNicheTotals(slug);
  if (!rating || !corpus) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const active = viewFrom(query.view);
  const name = ru ? rating.name : rating.nameEn || rating.name;
  const ideas = listIdeas().filter((idea) => idea.category === slug);
  const patterns = [...getNichePatterns(slug, locale)].sort((a, b) => (b.count || 0) - (a.count || 0));
  const reviewApps = [...listSourceApps(slug)].sort((a, b) => b.total - a.total);
  const ratingById = new Map(rating.apps.map((app) => [app.id, app]));
  const thesis = getNicheThesis(slug, locale);
  const opportunities = getNicheOpportunities(slug, locale);

  const ideaText = (idea: (typeof ideas)[number]) => {
    const card = ideaCard(idea.slug, locale);
    const en = locale === "en" ? ideaContentEn(idea.slug, locale) : null;
    return {
      title: cleanTitle(card?.title ?? en?.title ?? idea.title),
      oneLiner: card?.oneLiner ?? en?.oneLiner ?? idea.oneLiner,
    };
  };

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 pb-28 pt-10 sm:px-6 sm:pt-16">
      <AtmosphereSetter random />
      <CategoryWorkspaceNav
        slug={slug}
        name={name}
        locale={locale}
        active={active}
        apps={corpus.apps}
        reviews={corpus.reviews}
        ideas={ideas.length}
      />

      {active === "overview" && (
        <div className="mt-10">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Обзор" : "Overview"}</h2>
          {category?.kicker && <p className="mt-3 max-w-[66ch] text-callout text-[var(--color-text-secondary)]">{category.kicker}</p>}

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { view: "apps", n: corpus.apps, label: ru ? "приложений" : "apps" },
              { view: "reviews", n: corpus.reviews, label: ru ? "отзывов" : "reviews" },
              { view: "reviews", n: patterns.length, label: ru ? "тем категории" : "category topics" },
              { view: "ideas", n: ideas.length, label: ru ? "идей" : "ideas" },
            ].map((item, index) => (
              <Link key={`${item.view}-${index}`} href={`${lp}/workspace/${slug}?view=${item.view}`} className="card-min rounded-[18px] p-5 transition-colors hover:border-[var(--color-border-strong)]">
                <span className="block text-title2 tabular-nums text-[var(--color-text-primary)]">{item.n.toLocaleString(lc)}</span>
                <span className="mt-2 block text-caption text-[var(--color-text-tertiary)]">{item.label}</span>
              </Link>
            ))}
          </div>

          {thesis && (
            <section className="card-min mt-8 rounded-[22px] p-6 sm:p-7">
              <h3 className="text-caption font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{ru ? "Вывод разбора" : "Breakdown conclusion"}</h3>
              <p className="mt-3 text-title3 text-pretty text-[var(--color-text-primary)]">{tg(thesis.governing)}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                {thesis.pillars.map((pillar) => (
                  <div key={pillar.title} className="border-t border-[var(--color-border-subtle)] pt-4">
                    <h4 className="text-headline text-[var(--color-text-primary)]">{tg(pillar.title)}</h4>
                    <p className="mt-2 text-footnote text-[var(--color-text-secondary)]">{tg(pillar.dek)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {patterns.length > 0 && (
            <section className="mt-10">
              <div className="flex items-end justify-between gap-4">
                <h3 className="text-title3 text-[var(--color-text-primary)]">{ru ? "Крупные темы отзывов" : "Largest review topics"}</h3>
                <Link href={`${lp}/workspace/${slug}?view=reviews`} className="text-footnote text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Все темы" : "All topics"}</Link>
              </div>
              <ol className="mt-3 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                {patterns.slice(0, 6).map((pattern) => (
                  <li key={`${pattern.title}-${pattern.polarity}`} className="flex items-start justify-between gap-5 py-4">
                    <span className="text-callout text-[var(--color-text-primary)]">{ru ? pattern.title : pattern.titleEn || pattern.title}</span>
                    <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{(pattern.count || 0).toLocaleString(lc)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {active === "apps" && (
        <section className="mt-10">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Приложения" : "Apps"}</h2>
          <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{rating.apps.length.toLocaleString(lc)} {ru ? "позиций в рейтинге" : "ranked apps"}</p>
          <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
            {rating.apps.map((app, index) => (
              <li key={app.id}>
                <Link href={`${lp}/rating/${slug}/${appSlugify(app.title)}`} className="group flex items-center gap-4 py-4">
                  <span className="w-7 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
                  {app.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)] object-cover" />
                  ) : <span className="size-11 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-subhead text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{app.title}</span>
                    <span className="mt-1 block text-caption tabular-nums text-[var(--color-text-tertiary)]">
                      {app.storeAvg?.toFixed(1) ?? "—"}★ · {(app.ratings || 0).toLocaleString(lc)} {ru ? "оценок" : "ratings"}
                    </span>
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

      {active === "ideas" && (
        <section className="mt-10">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Идеи" : "Ideas"}</h2>
          <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ideas.length.toLocaleString(lc)} {ru ? "идей по отзывам этой категории" : "ideas from this category's reviews"}</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {ideas.map((idea, index) => {
              const copy = ideaText(idea);
              return (
                <li key={idea.slug}>
                  <Link href={`${lp}/ideas/${idea.slug}`} className="card-min group block h-full rounded-[22px] p-5">
                    <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-4 text-headline text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{copy.title}</h3>
                    <p className="mt-2 text-footnote text-pretty text-[var(--color-text-secondary)]">{copy.oneLiner}</p>
                    <p className="mt-5 text-caption tabular-nums text-[var(--color-text-tertiary)]">{idea.stats.observations.toLocaleString(lc)} {ru ? "наблюдений" : "observations"}</p>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {active === "reviews" && (
        <div className="mt-10">
          <section>
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Темы отзывов" : "Review topics"}</h2>
            <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{patterns.length.toLocaleString(lc)} {ru ? "тем на уровне категории" : "category-level topics"}</p>
            <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
              {patterns.map((pattern) => (
                <li key={`${pattern.title}-${pattern.polarity}`} className="py-5">
                  <div className="flex items-start justify-between gap-5">
                    <h3 className="text-headline text-[var(--color-text-primary)]">{ru ? pattern.title : pattern.titleEn || pattern.title}</h3>
                    <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{(pattern.count || 0).toLocaleString(lc)}</span>
                  </div>
                  <p className="mt-2 text-caption text-[var(--color-text-tertiary)]">{pattern.apps.length.toLocaleString(lc)} {ru ? "приложений" : "apps"} · {pattern.polarity === "pain" ? (ru ? "жалобы" : "complaints") : pattern.polarity === "love" ? (ru ? "похвала" : "praise") : (ru ? "смешанная тема" : "mixed")}</p>
                  {(ru ? pattern.plus : pattern.plusEn) && <p className="mt-3 text-footnote text-[var(--color-text-secondary)]">{ru ? pattern.plus : pattern.plusEn}</p>}
                  {(ru ? pattern.minus : pattern.minusEn) && <p className="mt-2 text-footnote text-[var(--color-text-secondary)]">{ru ? pattern.minus : pattern.minusEn}</p>}
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Отзывы по приложениям" : "Reviews by app"}</h2>
            <p className="mt-2 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{reviewApps.length.toLocaleString(lc)} {ru ? "приложений" : "apps"} · {corpus.reviews.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}</p>
            <ol className="mt-5 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
              {reviewApps.map((app) => {
                const ratingApp = ratingById.get(app.id);
                const topics = app.themes.filter((theme) => !theme.fallback).sort((a, b) => b.count - a.count);
                return (
                  <li key={app.id}>
                    <Link href={`${lp}/reviews/${slug}/${app.id}`} className="group flex items-center gap-4 py-4">
                      {ratingApp?.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ratingApp.icon} alt="" width={44} height={44} loading="lazy" className="size-11 shrink-0 rounded-[11px] border border-[var(--color-border-subtle)] object-cover" />
                      ) : <span className="size-11 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-subhead text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{app.title}</span>
                        <span className="mt-1 block truncate text-caption text-[var(--color-text-tertiary)]">
                          {topics.slice(0, 2).map((topic) => themeLabel(topic, locale)).join(" · ") || (ru ? "темы ещё не готовы" : "topics not ready")}
                        </span>
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

      {active === "build" && (
        <section className="mt-10">
          <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Создать" : "Create"}</h2>
          <p className="mt-2 max-w-[60ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Выберите идею и откройте план продукта." : "Choose an idea and open its product plan."}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(opportunities.length > 0 ? opportunities.map((item) => ({ slug: item.slug, title: item.title, text: item.tagline })) : ideas.map((idea) => ({ slug: idea.slug, title: ideaText(idea).title, text: ideaText(idea).oneLiner }))).map((item) => (
              <Link key={item.slug} href={`${lp}/build/${slug}/${item.slug}`} className="card-min group flex h-full flex-col rounded-[22px] p-5">
                <h3 className="text-headline text-[var(--color-text-primary)] group-hover:text-[var(--color-text-brand)]">{item.title}</h3>
                <p className="mt-2 flex-1 text-footnote text-[var(--color-text-secondary)]">{item.text}</p>
                <span className="mt-5 text-footnote font-semibold text-[var(--color-text-primary)]">{ru ? "Открыть план →" : "Open plan →"}</span>
              </Link>
            ))}
          </div>
          <Link href={`${lp}/build/${slug}`} className="mt-6 inline-flex rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-footnote font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-primary)]">
            {ru ? "Выбрать по проблеме" : "Choose by problem"}
          </Link>
        </section>
      )}
    </main>
  );
}
