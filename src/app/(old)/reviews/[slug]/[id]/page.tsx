import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import ReviewAccessGate from "@/components/ReviewAccessGate";
import ReviewBrowser from "@/components/ReviewBrowser";
import { getAccess } from "@/lib/access";
import { getLocale } from "@/lib/i18n.server";
import { canAccessReviewCategory } from "@/lib/reviewAccess";
import { getApp, getNiche, nicheName, readReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";
const FIRST = 40;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const app = getApp(slug, id);
  const niche = getNiche(slug);
  if (!app || !niche) return {};
  const ru = (await getLocale()) !== "en";
  const title = ru ? `${app.title}: размеченные отзывы — inApp` : `${app.title}: labelled reviews — inApp`;
  const description = ru
    ? `${app.total} полных отзывов о «${app.title}» с оценками и многотемной разметкой каждого текста.`
    : `${app.total} complete reviews of "${app.title}" with ratings and multi-topic labels for every text.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/reviews/${slug}/${id}`,
      languages: {
        ru: `https://inapp.pro/ru/reviews/${slug}/${id}`,
        en: `https://inapp.pro/en/reviews/${slug}/${id}`,
        "x-default": `https://inapp.pro/en/reviews/${slug}/${id}`,
      },
    },
    openGraph: { title, description, type: "article", siteName: "inApp" },
  };
}

export default async function AppReviews({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { slug, id } = await params;
  const app = getApp(slug, id);
  const niche = getNiche(slug);
  if (!app || !niche) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const access = await getAccess();
  const unlocked = canAccessReviewCategory(access, slug);
  if (!unlocked) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <BackLink fallback={`${lp}/reviews/${slug}`}>{nicheName(niche, locale)}</BackLink>
        <header className="mt-4">
          <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{app.title}</h1>
          <p className="mt-2 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{app.total.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}</p>
        </header>
        <ReviewAccessGate locale={locale} loggedIn={access.loggedIn} apps={1} reviews={app.total} />
      </main>
    );
  }
  const reviews = readReviews(slug, id);
  const ratingCounts = [0, 0, 0, 0, 0];
  for (const review of reviews) ratingCounts[Math.max(1, Math.min(5, review.rating)) - 1]++;
  const initial = [...reviews].sort((a, b) => a.rating - b.rating).slice(0, FIRST);
  const topicCount = app.themes.filter((theme) => !theme.fallback).length;
  const queryParam = (await searchParams).q;
  const initialQuery = (Array.isArray(queryParam) ? queryParam[0] : queryParam || "").slice(0, 160);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <BackLink fallback={`${lp}/reviews/${slug}`}>{nicheName(niche, locale)}</BackLink>
      <header className="mt-4 flex items-start gap-4">
        {app.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.icon} alt="" width={64} height={64} className="size-14 shrink-0 rounded-[14px] border border-[var(--color-border-subtle)] sm:size-16" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{app.title}</h1>
          <p className="mt-2 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
            {app.total.toLocaleString(lc)} {ru ? "отзывов" : "reviews"} · {topicCount.toLocaleString(lc)} {ru ? "тем" : "topics"}
          </p>
        </div>
      </header>

      <ReviewBrowser slug={slug} id={app.id} themes={app.themes} total={app.total} initial={initial} ratingCounts={ratingCounts} ru={ru} initialQuery={initialQuery} />
    </main>
  );
}
