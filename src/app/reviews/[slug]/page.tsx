import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import { getLocale } from "@/lib/i18n.server";
import { getNiche, nicheName, split, loudest } from "@/lib/reviews";
import { plural } from "@/lib/format";
import { isActiveCategory } from "@/lib/categoryVisibility";
import NicheAppList from "@/components/NicheAppList";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const name = nicheName(niche, locale);
  const reviews = niche.apps.reduce((s, a) => s + a.total, 0);
  const title = ru ? `Отзывы: ${name} — inApp` : `Reviews: ${name} — inApp`;
  const description = ru
    ? `${reviews.toLocaleString("ru-RU")} отзывов о ${niche.apps.length} приложениях ниши «${name}», разобранных по темам: что хвалят и на что жалуются.`
    : `${reviews.toLocaleString("en-US")} reviews across ${niche.apps.length} "${name}" apps, broken down by theme: what people praise and what they complain about.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/reviews/${slug}`,
      languages: {
        ru: `https://inapp.pro/ru/reviews/${slug}`,
        en: `https://inapp.pro/en/reviews/${slug}`,
        "x-default": `https://inapp.pro/en/reviews/${slug}`,
      },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

export default async function NicheReviews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";

  const allThemes = niche.apps.flatMap((a) => a.themes);
  const s = split(allThemes);
  const reviews = niche.apps.reduce((n, a) => n + a.total, 0);
  const topPain = loudest(niche.apps, "pain");
  const topLove = loudest(niche.apps, "love");
  const linked = isActiveCategory(slug);

  const apps = niche.apps.map((a) => ({
    id: a.id,
    title: a.title,
    total: a.total,
    icon: a.icon,
    themes: a.themes,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <BackLink fallback={`${lp}/reviews`}>{ru ? "Отзывы" : "Reviews"}</BackLink>

      <h1 className="mt-3 text-title1 text-[var(--color-text-primary)]">{nicheName(niche, locale)}</h1>
      <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">
        <span className="tabular-nums">{niche.apps.length}</span> {ru ? plural(niche.apps.length, "приложение", "приложения", "приложений") : "apps"} ·{" "}
        <span className="tabular-nums">{reviews.toLocaleString(lc)}</span> {ru ? plural(reviews, "отзыв", "отзыва", "отзывов") : "reviews"} ·{" "}
        <span className="tabular-nums">{allThemes.length}</span> {ru ? plural(allThemes.length, "тема", "темы", "тем") : "themes"}
      </p>
      {niche.apps.length < (niche.appsPlanned || 0) && (
        <p className="mt-1.5 text-caption text-[var(--color-text-tertiary)]">
          {ru
            ? `Ниша ещё размечается, готово ${niche.apps.length} из ${niche.appsPlanned}.`
            : `Still labelling this niche: ${niche.apps.length} of ${niche.appsPlanned} apps done.`}
        </p>
      )}

      <div className="mt-6 border-y border-[var(--color-border-subtle)]">
        <p className="flex flex-wrap gap-x-5 gap-y-1 py-3 text-footnote text-[var(--color-text-secondary)]">
          <span>{ru ? "хвалят" : "praise"} <span className="tabular-nums">{Math.round(s.lovePct)}%</span></span>
          <span>{ru ? "смешанно" : "mixed"} <span className="tabular-nums">{Math.round(s.mixedPct)}%</span></span>
          <span>{ru ? "ругают" : "complain"} <span className="tabular-nums">{Math.round(s.painPct)}%</span></span>
        </p>
        {topLove && (
          <p className="border-t border-[var(--color-border-subtle)] py-3 text-footnote text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-tertiary)]">{ru ? "чаще всего хвалят: " : "most praised: "}</span>
            {ru ? topLove.name : topLove.nameEn} <span className="tabular-nums text-[var(--color-text-tertiary)]">{topLove.count}</span>
          </p>
        )}
        {topPain && (
          <p className="border-t border-[var(--color-border-subtle)] py-3 text-footnote text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-tertiary)]">{ru ? "чаще всего ругают: " : "most complained about: "}</span>
            {ru ? topPain.name : topPain.nameEn} <span className="tabular-nums text-[var(--color-text-tertiary)]">{topPain.count}</span>
          </p>
        )}
      </div>

      {linked && (
        <nav className="mt-5 flex flex-wrap gap-2">
          <Link href={`${lp}/rating/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Народный рейтинг ниши" : "People's rating"}
          </Link>
          <Link href={`${lp}/segment/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Разбор ниши" : "Niche breakdown"}
          </Link>
        </nav>
      )}

      <div className="mt-8">
        <NicheAppList slug={slug} apps={apps} ru={ru} />
      </div>
    </main>
  );
}
