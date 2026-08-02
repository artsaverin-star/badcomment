import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import { getLocale } from "@/lib/i18n.server";
import { getApp, getNiche, nicheName, readReviews, split } from "@/lib/reviews";
import { isActiveCategory } from "@/lib/categoryVisibility";
import ReviewBrowser from "@/components/ReviewBrowser";

export const dynamic = "force-dynamic";

// One app, read through its own themes. The first slice of reviews is rendered
// on the server so the page is readable (and indexable) without JavaScript, then
// the browser pulls the rest on demand.
const FIRST = 40;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const app = getApp(slug, id);
  const niche = getNiche(slug);
  if (!app || !niche) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const themes = app.themes.slice(0, 4).map((t) => (ru ? t.name : t.nameEn)).join(", ");
  const title = ru ? `${app.title}: отзывы по темам — inApp` : `${app.title}: reviews by theme — inApp`;
  const description = ru
    ? `${app.total} отзывов о «${app.title}», разобранных по темам: ${themes}. Реальные тексты пользователей, а не пересказ.`
    : `${app.total} reviews of "${app.title}" broken down by theme: ${themes}. Real user texts, not a summary.`;
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

export default async function AppReviews({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const app = getApp(slug, id);
  const niche = getNiche(slug);
  if (!app || !niche) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";

  const s = split(app.themes);
  const reviews = readReviews(slug, id);
  // The star histogram needs the whole file, which we already read here — so it
  // ships with the page instead of waiting on the client fetch.
  const ratingCounts = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const i = Math.max(1, Math.min(5, r.rating)) - 1;
    ratingCounts[i]++;
  }
  // Worst first: people come here for the failure modes, and the client keeps
  // the same order until someone flips it.
  const initial = [...reviews].sort((a, b) => a.rating - b.rating).slice(0, FIRST);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <BackLink fallback={`${lp}/reviews/${slug}`}>{nicheName(niche, locale)}</BackLink>

      <div className="mt-4 flex items-start gap-4">
        {app.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.icon} alt="" width={72} height={72} className="size-16 shrink-0 rounded-[17px] border border-[var(--color-border-subtle)] sm:size-18" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-title2 text-balance text-[var(--color-text-primary)]">{app.title}</h1>
          <p className="mt-1.5 text-footnote text-[var(--color-text-tertiary)]">
            <span className="tabular-nums">{app.total.toLocaleString(lc)}</span> {ru ? "прочитанных отзывов" : "reviews read"} ·{" "}
            <span className="tabular-nums">{app.themes.length}</span> {ru ? "тем" : "themes"}
          </p>
          <p className="mt-1 text-footnote text-[var(--color-text-tertiary)]">
            {ru ? "хвалят" : "praise"} <span className="tabular-nums">{Math.round(s.lovePct)}%</span> · {ru ? "смешанно" : "mixed"}{" "}
            <span className="tabular-nums">{Math.round(s.mixedPct)}%</span> · {ru ? "ругают" : "complain"}{" "}
            <span className="tabular-nums">{Math.round(s.painPct)}%</span>
          </p>
        </div>
      </div>

      {isActiveCategory(slug) && (
        <nav className="mt-5 flex flex-wrap gap-2">
          <Link href={`${lp}/rating/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Место в рейтинге" : "Place in the rating"}
          </Link>
          <Link href={`${lp}/segment/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Разбор ниши" : "Niche breakdown"}
          </Link>
        </nav>
      )}

      <ReviewBrowser slug={slug} id={app.id} themes={app.themes} total={app.total} initial={initial} ratingCounts={ratingCounts} ru={ru} />
    </main>
  );
}
