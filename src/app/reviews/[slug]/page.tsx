import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import NicheAppList from "@/components/NicheAppList";
import NichePatternList from "@/components/NichePatternList";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { plural } from "@/lib/format";
import { getLocale } from "@/lib/i18n.server";
import { getNiche, getNichePatterns, listSourceApps, nicheName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const name = nicheName(niche, locale);
  const processedReviews = niche.apps.reduce((sum, app) => sum + app.total, 0);
  const title = ru ? `Отзывы: ${name} — inApp` : `Reviews: ${name} — inApp`;
  const description = ru
    ? `${(niche.sourceReviews || processedReviews).toLocaleString("ru-RU")} отзывов о ${niche.appsPlanned} приложениях ниши «${name}»: проверяемые паттерны, темы продуктов и исходные цитаты.`
    : `${(niche.sourceReviews || processedReviews).toLocaleString("en-US")} reviews across ${niche.appsPlanned} "${name}" apps: verifiable patterns, product themes, and source quotes.`;
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

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="text-title3 tabular-nums text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-1 text-caption leading-snug text-[var(--color-text-tertiary)]">{label}</p>
    </div>
  );
}

export default async function NicheReviews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = getNiche(slug);
  if (!niche) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const name = nicheName(niche, locale);

  const allThemes = niche.apps.flatMap((app) => app.themes);
  const specificThemes = allThemes.filter((theme) => !theme.fallback);
  const processedReviews = niche.apps.reduce((sum, app) => sum + app.total, 0);
  const specificReviews = specificThemes.reduce((sum, theme) => sum + theme.count, 0);
  const specificCoverage = processedReviews ? (specificReviews / processedReviews) * 100 : 0;
  const appCoverage = niche.appsPlanned ? (niche.apps.length / niche.appsPlanned) * 100 : 0;
  const sourceReviews = niche.sourceReviews || processedReviews;
  const patterns = getNichePatterns(slug, locale);
  const sourcePatternCount = getNichePatterns(slug, "ru").length;
  const linked = isActiveCategory(slug);
  const sourceApps = listSourceApps(slug);
  const detailedById = new Map(niche.apps.map((app) => [app.id, app]));
  const apps = sourceApps.map((sourceApp) => {
    const detailed = detailedById.get(sourceApp.id);
    return {
      ...sourceApp,
      icon: detailed?.icon,
      themes: detailed?.themes || [],
      detailed: Boolean(detailed),
    };
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: ru ? `Отзывы о приложениях ниши «${name}»` : `Reviews of apps in the ${name} niche`,
    description: ru ? `${sourceReviews} отзывов и ${patterns.length} проверяемых паттернов ниши.` : `${sourceReviews} reviews and ${patterns.length} verifiable niche patterns.`,
    url: `https://inapp.pro${lp}/reviews/${slug}`,
    isPartOf: { "@id": "https://inapp.pro/reviews#dataset" },
    variableMeasured: ["review text", "star rating", "theme", "aggregate theme polarity"],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BackLink fallback={`${lp}/reviews`}>{ru ? "Все отзывы" : "All reviews"}</BackLink>

      <header className="mt-4 max-w-[68ch]">
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">{ru ? "Исследование ниши" : "Niche research"}</p>
        <h1 className="mt-2 text-title1 text-balance text-[var(--color-text-primary)]">{name}</h1>
        <p className="mt-3 text-body text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? `Все ${sourceReviews.toLocaleString(lc)} исходных отзывов доступны ниже: выбери приложение, оценку или найди фразу в тексте. Для уже обработанных приложений добавлены отдельные продуктовые темы.`
            : `All ${sourceReviews.toLocaleString(lc)} source reviews are available below: choose an app, rating, or search the text. Completed apps also include product-specific themes.`}
        </p>
      </header>

      <section className="card-min mt-7 rounded-[22px] p-5 sm:p-6" aria-label={ru ? "Паспорт исследования" : "Research passport"}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Metric value={sourceReviews.toLocaleString(lc)} label={ru ? "исходных отзывов в нише" : "source reviews in niche"} />
          <Metric value={niche.appsPlanned.toLocaleString(lc)} label={ru ? plural(niche.appsPlanned, "приложение в корпусе", "приложения в корпусе", "приложений в корпусе") : "apps in corpus"} />
          <Metric value={ru ? patterns.length : `${patterns.length}/${sourcePatternCount}`} label={ru ? plural(patterns.length, "сквозной паттерн", "сквозных паттерна", "сквозных паттернов") : "patterns translated"} />
          <Metric value={specificThemes.length} label={ru ? plural(specificThemes.length, "тема приложения", "темы приложений", "тем приложений") : "app-specific themes"} />
        </div>

        <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-subhead text-[var(--color-text-primary)]">{ru ? "Детальная разметка приложений" : "Detailed app labelling"}</p>
              <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
                {niche.apps.length > 0
                  ? ru
                    ? `${specificCoverage.toFixed(1)}% обработанных отзывов получили конкретную тему`
                    : `${specificCoverage.toFixed(1)}% of processed reviews have a specific theme`
                  : ru
                    ? "Паттерны ниши готовы; карточки приложений проходят отдельную проверку"
                    : "Niche patterns are ready; app cards undergo a separate validation pass"}
              </p>
            </div>
            <p className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">{niche.apps.length.toLocaleString(lc)} / {niche.appsPlanned.toLocaleString(lc)}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--color-text-brand)]" style={{ width: `${Math.min(100, appCoverage)}%` }} />
          </div>
          <Link href={`${lp}/reviews/methodology`} className="mt-4 inline-flex text-caption font-semibold text-[var(--color-text-brand)] transition-opacity hover:opacity-60">
            {ru ? "Порог доказательств и ограничения →" : "Evidence threshold and limitations →"}
          </Link>
        </div>
      </section>

      <section id="apps" className="mt-10 max-w-3xl scroll-mt-24" aria-labelledby="niche-apps-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-caption uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{ru ? "Полный корпус ниши" : "Complete niche corpus"}</p>
            <h2 id="niche-apps-heading" className="mt-1 text-title2 text-[var(--color-text-primary)]">{ru ? "Все приложения и отзывы" : "All apps and reviews"}</h2>
          </div>
          <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{apps.length} / {niche.appsPlanned}</span>
        </div>
        <p className="mt-2 max-w-[62ch] text-footnote text-[var(--color-text-secondary)]">
          {ru
            ? `Тексты доступны у всех ${apps.length} приложений. Значок «темы размечены» означает, что к оценкам и поиску добавлена проверенная тематическая навигация.`
            : `Review texts are available for all ${apps.length} apps. “Themes labelled” means verified topic navigation is available in addition to rating and text search.`}
        </p>
        <div className="mt-4"><NicheAppList slug={slug} apps={apps} ru={ru} /></div>
      </section>

      {patterns.length > 0 && <NichePatternList patterns={patterns} ru={ru} />}

      {!ru && patterns.length < sourcePatternCount && (
        <aside className="card-min mt-8 rounded-[20px] p-5">
          <p className="text-headline text-[var(--color-text-primary)]">The full pattern set is available in Russian</p>
          <p className="mt-1.5 max-w-[62ch] text-footnote leading-relaxed text-[var(--color-text-secondary)]">
            {patterns.length} of {sourcePatternCount} patterns are translated. The source analysis is complete; only the English editorial pass is still in progress.
          </p>
          <Link href={`/ru/reviews/${slug}`} className="mt-3 inline-flex text-caption font-semibold text-[var(--color-text-brand)] transition-opacity hover:opacity-60">
            Open all {sourcePatternCount} patterns in Russian →
          </Link>
        </aside>
      )}

      {linked && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={ru ? "Другие исследования ниши" : "Other niche research"}>
          <Link href={`${lp}/rating/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Народный рейтинг ниши" : "People's rating"}
          </Link>
          <Link href={`${lp}/segment/${slug}`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
            {ru ? "Разбор ниши" : "Niche breakdown"}
          </Link>
        </nav>
      )}

    </main>
  );
}
