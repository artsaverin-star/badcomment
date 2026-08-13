import type { Metadata } from "next";
import Link from "next/link";
import ReviewNicheCatalogue from "@/components/ReviewNicheCatalogue";
import { plural } from "@/lib/format";
import { getLocale } from "@/lib/i18n.server";
import { listReviewCatalogue, progress, totals } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const t = totals();
  const title = ru ? "Отзывы по темам — inApp" : "Reviews by theme — inApp";
  const description = ru
    ? `${t.sourceReviews.toLocaleString("ru-RU")} отзывов о ${t.sourceApps.toLocaleString("ru-RU")} приложениях: проверяемые паттерны ниш, темы продуктов и исходные цитаты.`
    : `${t.sourceReviews.toLocaleString("en-US")} reviews across ${t.sourceApps.toLocaleString("en-US")} apps: verifiable niche patterns, product themes, and source quotes.`;
  return {
    title,
    description,
    alternates: {
      canonical: "/reviews",
      languages: { ru: "https://inapp.pro/ru/reviews", en: "https://inapp.pro/en/reviews", "x-default": "https://inapp.pro/en/reviews" },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

function Stat({ n, label, locale }: { n: number; label: string; locale: string }) {
  return (
    <div>
      <div className="text-stat tabular-nums text-[var(--color-text-primary)]">{n.toLocaleString(locale)}</div>
      <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  );
}

function CoverageRow({ label, note, done, total, locale }: { label: string; note: string; done: number; total: number; locale: string }) {
  const pct = total ? (done / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-subhead text-[var(--color-text-primary)]">{label}</p>
          <p className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{note}</p>
        </div>
        <p className="shrink-0 text-footnote tabular-nums text-[var(--color-text-secondary)]">
          {done.toLocaleString(locale)} / {total.toLocaleString(locale)}
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]" aria-hidden="true">
        <div className="h-full rounded-full bg-[var(--color-text-brand)]" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export default async function ReviewsHome() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const niches = listReviewCatalogue(locale);
  const t = totals();
  const nichesWithPatterns = niches.filter((niche) => niche.patterns > 0).length;
  const visiblePatternCount = niches.reduce((sum, niche) => sum + niche.patterns, 0);
  const detailedNiches = niches.filter((niche) => niche.appThemesReady).length;
  const detailedCorpusPct = t.sourceReviews ? (t.reviews / t.sourceReviews) * 100 : 0;
  const updated = new Intl.DateTimeFormat(lc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${progress.updatedAt}T00:00:00Z`));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        "@id": "https://inapp.pro/reviews#dataset",
        name: ru ? "Корпус отзывов о мобильных приложениях inApp" : "inApp mobile app review corpus",
        description: ru
          ? `Полные тексты и оценки ${t.sourceReviews} отзывов о ${t.sourceApps} приложениях, организованные по нишам и продуктам; обработанная часть дополнена тематической разметкой.`
          : `Complete texts and ratings from ${t.sourceReviews} reviews across ${t.sourceApps} apps, organised by niche and product; the processed subset also includes topic labels.`,
        url: `https://inapp.pro${lp}/reviews`,
        dateModified: progress.updatedAt,
        creator: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
        variableMeasured: ["review text", "star rating", "theme", "aggregate theme polarity"],
        measurementTechnique: ru ? "Тематическая кластеризация с проверяемыми цитатами" : "Thematic clustering with verifiable quotes",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "inApp", item: "https://inapp.pro" },
          { "@type": "ListItem", position: 2, name: ru ? "Отзывы" : "Reviews", item: `https://inapp.pro${lp}/reviews` },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="max-w-[68ch]">
        <p className="text-footnote font-semibold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">
          {ru ? "Голос пользователей, без пересказа" : "The user voice, not a summary"}
        </p>
        <h1 className="mt-2 text-display font-bold text-[var(--color-text-primary)]">{ru ? "Отзывы" : "Reviews"}</h1>
        <p className="mt-4 text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? `Все ${t.sourceReviews.toLocaleString(lc)} отзывов на месте: 71 категория, ${t.sourceApps.toLocaleString(lc)} приложения, полные тексты и оценки. Поверх исходного корпуса мы добавляем проверяемые паттерны ниш и темы отдельных продуктов.`
            : `All ${t.sourceReviews.toLocaleString(lc)} reviews are here: 71 categories, ${t.sourceApps.toLocaleString(lc)} apps, complete texts and ratings. Verifiable niche patterns and product-specific topics are layered onto the source corpus.`}
        </p>
      </header>

      <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-[var(--color-border-subtle)] pt-6 sm:grid-cols-4">
        <Stat n={t.sourceNiches} label={ru ? plural(t.sourceNiches, "ниша", "ниши", "ниш") : "niches"} locale={lc} />
        <Stat n={t.sourceApps} label={ru ? plural(t.sourceApps, "приложение", "приложения", "приложений") : "apps"} locale={lc} />
        <Stat n={ru ? t.nichePatterns : visiblePatternCount} label={ru ? plural(t.nichePatterns, "паттерн ниши", "паттерна ниши", "паттернов ниш") : "translated niche patterns"} locale={lc} />
        <Stat n={t.sourceReviews} label={ru ? plural(t.sourceReviews, "исходный отзыв", "исходных отзыва", "исходных отзывов") : "source reviews"} locale={lc} />
      </div>

      <section className="card-min mt-9 rounded-[22px] p-5 sm:p-6" aria-labelledby="reviews-coverage-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{ru ? "Паспорт данных" : "Data passport"}</p>
            <h2 id="reviews-coverage-heading" className="mt-1 text-title3 text-[var(--color-text-primary)]">{ru ? "Что доступно и что размечено" : "What is available and labelled"}</h2>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? `Обновлено ${updated}` : `Updated ${updated}`}</p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-8">
          <CoverageRow
            label={ru ? "Исходные тексты" : "Source texts"}
            note={ru ? `Все ${t.sourceApps.toLocaleString(lc)} приложения открываются по категориям` : `All ${t.sourceApps.toLocaleString(lc)} apps can be opened by category`}
            done={t.sourceReviews}
            total={t.sourceReviews}
            locale={lc}
          />
          <CoverageRow
            label={ru ? "Паттерны рынка" : "English pattern coverage"}
            note={ru ? "Во всех нишах · от 8 сигналов и 3 приложений" : `${visiblePatternCount.toLocaleString(lc)} translated patterns · source analysis covers all 71 niches`}
            done={nichesWithPatterns}
            total={t.sourceNiches}
            locale={lc}
          />
          <CoverageRow
            label={ru ? "Темы конкретных приложений" : "Themes of individual apps"}
            note={ru ? `${detailedNiches} ниш · обработано ${detailedCorpusPct.toFixed(1)}% полного корпуса` : `${detailedNiches} niches · ${detailedCorpusPct.toFixed(1)}% of the complete corpus processed`}
            done={progress.appsDone}
            total={progress.appsPlanned}
            locale={lc}
          />
        </div>

        <div className="mt-6 grid gap-3 border-t border-[var(--color-border-subtle)] pt-5 sm:grid-cols-3">
          <div>
            <p className="text-subhead text-[var(--color-text-primary)]">{ru ? "Живые доказательства" : "Live evidence"}</p>
            <p className="mt-1 text-caption leading-relaxed text-[var(--color-text-tertiary)]">{ru ? "У каждого паттерна есть цитаты, приложение и оценка." : "Every pattern includes quotes, app name, and rating."}</p>
          </div>
          <div>
            <p className="text-subhead text-[var(--color-text-primary)]">{ru ? "Два уровня анализа" : "Two analysis layers"}</p>
            <p className="mt-1 text-caption leading-relaxed text-[var(--color-text-tertiary)]">{ru ? "Паттерны ниши не смешиваются с темами одного продукта." : "Niche patterns are kept separate from single-product themes."}</p>
          </div>
          <div>
            <p className="text-subhead text-[var(--color-text-primary)]">{ru ? "Честный остаток" : "Honest remainder"}</p>
            <p className="mt-1 text-caption leading-relaxed text-[var(--color-text-tertiary)]">{ru ? "Короткие и неоднозначные тексты не превращаются в выдуманные инсайты." : "Short or ambiguous texts are not turned into invented insights."}</p>
          </div>
        </div>

        <Link href={`${lp}/reviews/methodology`} className="mt-5 inline-flex items-center gap-1.5 text-footnote font-semibold text-[var(--color-text-brand)] transition-opacity hover:opacity-60">
          {ru ? "Как устроена разметка →" : "How the labelling works →"}
        </Link>
      </section>

      {niches.length === 0 ? <p className="mt-10 text-body text-[var(--color-text-tertiary)]">{ru ? "Скоро." : "Coming soon."}</p> : <ReviewNicheCatalogue niches={niches} ru={ru} lp={lp} />}

      <p className="mt-10 border-t border-[var(--color-border-subtle)] pt-5 text-footnote text-[var(--color-text-tertiary)]">
        {ru ? "Эти же данные доступны твоему ИИ-агенту: " : "The same data is available to your AI agent: "}
        <Link href={`${lp}/mcp`} className="text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--color-text-primary)]">
          {ru ? "MCP-сервер inApp" : "the inApp MCP server"}
        </Link>
      </p>
    </main>
  );
}
