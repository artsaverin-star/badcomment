import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import CategoryWorkspaceHeader from "@/components/CategoryWorkspaceHeader";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { ideaCard, ideaContentEn } from "@/lib/regenCards";
import { listIdeas } from "@/lib/ideas";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { appSlugify } from "@/lib/ratingAppSlug";
import { getNichePatterns, listSourceApps, reviewNicheTotals, themeLabel, type NichePattern, type ReviewSourceApp, type ReviewTheme } from "@/lib/reviews";
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
};
type RatingSet = { name: string; nameEn?: string; apps: RatingApp[] };

function cleanTitle(value: string) {
  const title = (value || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function TopicRow({ pattern, locale }: { pattern: NichePattern; locale: Locale }) {
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const title = ru ? pattern.title : pattern.titleEn || pattern.title;
  return (
    <li className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      <details className="group/topic">
        <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 text-callout text-[var(--color-text-primary)]">{title}</span>
          <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{(pattern.count || 0).toLocaleString(lc)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open/topic:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="pb-5 pr-8">
          <p className="text-caption text-[var(--color-text-tertiary)]">
            {pattern.apps.length.toLocaleString(lc)} {ru ? "приложений" : "apps"} · {pattern.polarity === "pain" ? (ru ? "жалобы" : "complaints") : pattern.polarity === "love" ? (ru ? "похвала" : "praise") : (ru ? "смешанная тема" : "mixed")}
          </p>
          {pattern.evidence.slice(0, 3).map((item, index) => (
            <blockquote key={`${item.app}-${index}`} className="mt-3 border-l-2 border-[var(--color-border-subtle)] pl-3 text-footnote text-[var(--color-text-secondary)]">
              “{item.quote}” <span className="text-[var(--color-text-tertiary)]">— {item.app}, {item.rating}★</span>
            </blockquote>
          ))}
        </div>
      </details>
    </li>
  );
}

function ThemeList({ themes, locale }: { themes: ReviewTheme[]; locale: Locale }) {
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  return (
    <ul className="divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
      {themes.map((theme) => (
        <li key={`${theme.name}-${theme.polarity}`} className="flex items-start justify-between gap-4 py-3">
          <span>
            <span className="block text-footnote text-[var(--color-text-primary)]">{themeLabel(theme, locale)}</span>
            <span className="mt-0.5 block text-caption text-[var(--color-text-tertiary)]">{theme.polarity === "pain" ? (ru ? "жалобы" : "complaints") : theme.polarity === "love" ? (ru ? "похвала" : "praise") : (ru ? "смешанная" : "mixed")}</span>
          </span>
          <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-secondary)]">{theme.count.toLocaleString(lc)}</span>
        </li>
      ))}
    </ul>
  );
}

function AppRow({
  app,
  review,
  index,
  slug,
  locale,
}: {
  app: RatingApp;
  review?: ReviewSourceApp;
  index: number;
  slug: string;
  locale: Locale;
}) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const themes = [...(review?.themes || [])].filter((theme) => !theme.fallback).sort((a, b) => b.count - a.count);
  const visibleThemes = themes.slice(0, 6);
  const remainingThemes = themes.slice(6);

  return (
    <li className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      <details className="group/app">
        <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="w-6 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
          {app.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.icon} alt="" width={40} height={40} loading="lazy" className="size-10 shrink-0 rounded-[10px] object-cover" />
          ) : <span className="size-10 shrink-0 rounded-[10px] bg-[var(--color-bg-muted)]" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-subhead text-[var(--color-text-primary)]">{app.title}</span>
            <span className="mt-0.5 block text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {review?.total.toLocaleString(lc) || "0"} {ru ? "отзывов" : "reviews"} · {themes.length.toLocaleString(lc)} {ru ? "тем" : "topics"}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-subhead tabular-nums text-[var(--color-text-primary)]">{app.realScore ?? "—"}</span>
            <span className="block text-caption text-[var(--color-text-tertiary)]">{ru ? "балл" : "score"}</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open/app:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="pb-6 pl-9 sm:pl-[76px]">
          {visibleThemes.length > 0 ? <ThemeList themes={visibleThemes} locale={locale} /> : <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Темы ещё не готовы." : "Topics are not ready yet."}</p>}
          {remainingThemes.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-footnote font-semibold text-[var(--color-text-secondary)]">{ru ? `Ещё ${remainingThemes.length} тем` : `${remainingThemes.length} more topics`}</summary>
              <div className="mt-3"><ThemeList themes={remainingThemes} locale={locale} /></div>
            </details>
          )}
          <div className="mt-5 flex flex-wrap gap-4">
            {review && <Link href={`${lp}/reviews/${slug}/${review.id}`} className="text-footnote font-semibold text-[var(--color-text-primary)] underline underline-offset-4">{ru ? "Размеченные отзывы" : "Labelled reviews"}</Link>}
            <Link href={`${lp}/rating/${slug}/${appSlugify(app.title)}`} className="text-footnote font-semibold text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Разбор приложения" : "App breakdown"}</Link>
          </div>
        </div>
      </details>
    </li>
  );
}

function IdeaRow({
  title,
  observations,
  index,
  ideaHref,
  planHref,
  ru,
  lc,
}: {
  title: string;
  observations: number;
  index: number;
  ideaHref: string;
  planHref: string;
  ru: boolean;
  lc: string;
}) {
  return (
    <li className="flex items-start gap-3 border-b border-[var(--color-border-subtle)] py-4 last:border-b-0">
      <span className="w-6 shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{String(index + 1).padStart(2, "0")}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-callout text-[var(--color-text-primary)]">{title}</span>
        <span className="mt-1 block text-caption tabular-nums text-[var(--color-text-tertiary)]">{observations.toLocaleString(lc)} {ru ? "наблюдений" : "observations"}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:gap-4">
        <Link href={ideaHref} className="text-footnote font-semibold text-[var(--color-text-secondary)] underline underline-offset-4">{ru ? "Разбор" : "Breakdown"}</Link>
        <Link href={planHref} className="text-footnote font-semibold text-[var(--color-text-primary)] underline underline-offset-4">{ru ? "План" : "Plan"}</Link>
      </span>
    </li>
  );
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

export default async function WorkspaceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale, user] = await Promise.all([params, getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const rating = (RATING_BY_SLUG as Record<string, RatingSet>)[slug];
  const corpus = reviewNicheTotals(slug);
  if (!rating || !corpus) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const lc = ru ? "ru-RU" : "en-US";
  const name = ru ? rating.name : rating.nameEn || rating.name;
  const ideas = listIdeas().filter((idea) => idea.category === slug);
  const patterns = [...getNichePatterns(slug, locale)].sort((a, b) => (b.count || 0) - (a.count || 0));
  const reviewApps = listSourceApps(slug);
  const reviewById = new Map(reviewApps.map((app) => [app.id, app]));
  const visiblePatterns = patterns.slice(0, 8);
  const remainingPatterns = patterns.slice(8);
  const visibleApps = rating.apps.slice(0, 10);
  const remainingApps = rating.apps.slice(10);
  const visibleIdeas = ideas.slice(0, 6);
  const remainingIdeas = ideas.slice(6);

  const ideaTitle = (idea: (typeof ideas)[number]) => {
    const card = ideaCard(idea.slug, locale);
    const en = locale === "en" ? ideaContentEn(idea.slug, locale) : null;
    return cleanTitle(card?.title ?? en?.title ?? idea.title);
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-10 sm:px-6 sm:pt-16">
      <AtmosphereSetter random />
      <CategoryWorkspaceHeader name={name} locale={locale} apps={corpus.apps} reviews={corpus.reviews} topics={patterns.length} />

      <section className="mt-10" aria-labelledby="workspace-apps">
        <p className="text-caption font-semibold tabular-nums text-[var(--color-text-tertiary)]">01</p>
        <h2 id="workspace-apps" className="text-title2 text-[var(--color-text-primary)]">{ru ? "Приложения" : "Apps"}</h2>
        <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Внутри — темы и ссылка на каждый размеченный отзыв." : "Open an app for topics and every labelled review."}</p>
        <ol className="mt-4 border-y border-[var(--color-border-subtle)]">
          {visibleApps.map((app, index) => <AppRow key={app.id} app={app} review={reviewById.get(app.id)} index={index} slug={slug} locale={locale} />)}
        </ol>
        {remainingApps.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-footnote font-semibold text-[var(--color-text-secondary)]">{ru ? `Показать ещё ${remainingApps.length} приложений` : `Show ${remainingApps.length} more apps`}</summary>
            <ol className="mt-3 border-y border-[var(--color-border-subtle)]">
              {remainingApps.map((app, index) => <AppRow key={app.id} app={app} review={reviewById.get(app.id)} index={index + visibleApps.length} slug={slug} locale={locale} />)}
            </ol>
          </details>
        )}
      </section>

      <section className="mt-14" aria-labelledby="workspace-topics">
        <p className="text-caption font-semibold tabular-nums text-[var(--color-text-tertiary)]">02</p>
        <h2 id="workspace-topics" className="text-title2 text-[var(--color-text-primary)]">{ru ? "Общие темы категории" : "Category-wide topics"}</h2>
        <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Повторяются у разных приложений. Внутри — реальные цитаты." : "Repeated across apps, with real quotes inside."}</p>
        <ol className="mt-4 border-y border-[var(--color-border-subtle)]">
          {visiblePatterns.map((pattern) => <TopicRow key={`${pattern.title}-${pattern.polarity}`} pattern={pattern} locale={locale} />)}
        </ol>
        {remainingPatterns.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-footnote font-semibold text-[var(--color-text-secondary)]">{ru ? `Показать ещё ${remainingPatterns.length} тем` : `Show ${remainingPatterns.length} more topics`}</summary>
            <ol className="mt-3 border-y border-[var(--color-border-subtle)]">{remainingPatterns.map((pattern) => <TopicRow key={`${pattern.title}-${pattern.polarity}`} pattern={pattern} locale={locale} />)}</ol>
          </details>
        )}
      </section>

      <section className="mt-14" aria-labelledby="workspace-ideas">
        <p className="text-caption font-semibold tabular-nums text-[var(--color-text-tertiary)]">03</p>
        <h2 id="workspace-ideas" className="text-title2 text-[var(--color-text-primary)]">{ru ? "Что можно сделать" : "What to build"}</h2>
        <ol className="mt-4 border-y border-[var(--color-border-subtle)]">
          {visibleIdeas.map((idea, index) => <IdeaRow key={idea.slug} title={ideaTitle(idea)} observations={idea.stats.observations} index={index} ideaHref={`${lp}/ideas/${idea.slug}`} planHref={`${lp}/build/${slug}/${idea.slug}`} ru={ru} lc={lc} />)}
        </ol>
        {remainingIdeas.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-footnote font-semibold text-[var(--color-text-secondary)]">{ru ? `Показать ещё ${remainingIdeas.length} идей` : `Show ${remainingIdeas.length} more ideas`}</summary>
            <ol className="mt-3 border-y border-[var(--color-border-subtle)]">{remainingIdeas.map((idea, index) => <IdeaRow key={idea.slug} title={ideaTitle(idea)} observations={idea.stats.observations} index={index + visibleIdeas.length} ideaHref={`${lp}/ideas/${idea.slug}`} planHref={`${lp}/build/${slug}/${idea.slug}`} ru={ru} lc={lc} />)}</ol>
          </details>
        )}
      </section>
    </main>
  );
}
