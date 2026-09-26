import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { getPulseCategoryNames, getPulseDemand } from "@/site/sitedata/pulse";
import { PulseCard } from "@/site/features/pulse/PulseCard";
import { PulseFeed } from "@/site/features/pulse/PulseFeed";
import { PulseFilters } from "@/site/features/pulse/PulseFilters";
import {
  isDefaultPulseQuery,
  levelScale,
  parsePulseQuery,
  pickStrings,
  PULSE_FEED_ROWS,
  pulseDataVersion,
  pulseFeedPage,
  selectPulseNeeds,
  type PulseQuery,
  type RawPulseQuery,
} from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import { format } from "@/site/i18n/translate";
import { localeAlternates, OG_LOCALE } from "@/site/features/research/seo";
import { Heading } from "@/site/ui";
import "@/site/features/pulse/pulse-kit.css";
import "@/site/features/pulse/pulse.css";

// Tab «Пульс» (SPEC app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md «Лента»): concrete
// needs from reviews as gauge cards (direction A «Прибор»), strongest pain first (score, then
// share — the file's order). Compact controls via query params: ?category=, ?q=, ?page=. The
// kind switch is gone (owner, 2026-09-25: «убрать просят жалуются это мусор»); ?kind= is a
// retired key and ignored, like view/scope/sort. Only the unfiltered first page is indexable.
// The list grows by itself (owner, 2026-09-26: «неудобно пагинация, пусть автоподгрузка
// будет»): this page renders ?page=N (24 cards) with the «Назад · N / M · Дальше» links for
// crawlers and no-JS; PulseFeed hides the counter and «Дальше» once hydrated and appends the
// next pages from GET /api/site/pulse as the reader nears the end.

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<RawPulseQuery> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = pulseStrings[lang];
  const query = parsePulseQuery(await searchParams);
  const alternates = localeAlternates(lang, "pulse");
  const title = `${s.title} — ${s.subtitle}`;
  return {
    title,
    description: s.metaDescription,
    alternates,
    openGraph: { type: "website", siteName: "inApp", title: `${title} — inApp`, description: s.metaDescription, url: alternates.canonical as string, locale: OG_LOCALE[lang] },
    twitter: { card: "summary", title: `${title} — inApp`, description: s.metaDescription },
    robots: { index: isDefaultPulseQuery(query), follow: true },
  };
}

export default async function PulsePage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [data, raw] = await Promise.all([getPulseDemand(), searchParams]);
  const names = await getPulseCategoryNames(lang, data);
  const s = pulseStrings[lang];
  const query = parsePulseQuery(raw);
  const results = selectPulseNeeds(data.needs, query, lang);
  const { page, pages, items: visible } = pulseFeedPage(results, query.page);
  const options = data.categories
    .map((category) => ({ id: category.id, name: names.get(category.id) ?? category.id }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));
  const link = (patch: Partial<PulseQuery>) => {
    const next = { ...query, page: 1, ...patch };
    return routes.pulse(lang, { category: next.category, q: next.q, page: next.page });
  };
  const filtered = !isDefaultPulseQuery({ ...query, page: 1 });

  return (
    <div className="ia-page ia-page--grid ia-pulse" data-pulse="feed">
      <Heading title={s.title} subtitle={s.subtitle} />
      {data.needs.length ? (
        <div className="ia-pulse-controls">
          <PulseFilters
            key={`${query.category}|${query.q}`}
            action={routes.pulse(lang)}
            category={query.category}
            query={query.q}
            options={options}
            strings={{ category: s.category, allCategories: s.allCategories, search: s.search, searchPlaceholder: s.searchPlaceholder, searchSubmit: s.searchSubmit, apply: s.apply }}
          />
          {filtered ? (
            <Link className="ia-pulse-reset" href={routes.pulse(lang)}>
              {s.reset}
            </Link>
          ) : null}
        </div>
      ) : null}
      {visible.length ? (
        <PulseFeed
          key={`${lang}|${query.category}|${query.q}|${page}`}
          locale={lang}
          category={query.category}
          q={query.q}
          page={page}
          pages={pages}
          total={results.length}
          version={pulseDataVersion(data)}
          ids={visible.map((need) => need.id)}
          prevHref={page > 1 ? link({ page: page - 1 }) : null}
          nextHref={page < pages ? link({ page: page + 1 }) : null}
          strings={pickStrings(s, PULSE_FEED_ROWS)}
        >
          {visible.map((need) => (
            <li key={need.id}>
              <PulseCard need={need} categoryName={names.get(need.categoryId) ?? need.categoryId} locale={lang} strings={s} />
            </li>
          ))}
        </PulseFeed>
      ) : (
        <section className="ia-card ia-card--utility ia-pulse-empty" data-pulse-empty="">
          <h2>{data.needs.length ? s.noResults : s.empty}</h2>
          <p>{data.needs.length ? s.noResultsBody : s.emptyBody}</p>
          {filtered ? (
            <Link className="ia-pulse-empty__reset" href={routes.pulse(lang)}>
              {s.reset}
            </Link>
          ) : null}
        </section>
      )}
      <details className="ia-pulse-about">
        <summary>{s.about}</summary>
        <p>{s.aboutSample}</p>
        <p>{s.aboutScore}</p>
        <p>{format(s.aboutLevels, { scale: levelScale(lang, s) })}</p>
      </details>
    </div>
  );
}
