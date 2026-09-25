import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { formatNodes } from "@/site/features/rating/format";
import { MZ_ORIGIN } from "@/site/features/rating/media";
import { RatingAppCard } from "@/site/features/rating/RatingAppCard";
import { RatingImageGuard } from "@/site/features/rating/RatingImageGuard";
import { RatingTaskList } from "@/site/features/rating/RatingTaskList";
import { taskJsonLd } from "@/site/features/rating/schema";
import { rankVars } from "@/site/features/rating/score";
import { dataLang, isIndexableTask, taskAlternates, taskIndex, taskTitle } from "@/site/features/rating/seo";
import { ratingStrings } from "@/site/features/rating/strings";
import "@/site/features/rating/rating.css";
import { OG_LOCALE, TOPIC_ROBOTS, clampDescription, jsonLd, withBrand } from "@/site/features/research/seo";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { isLaunchCategory } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { getRatingNiche, getRatingScenario, ratingShareImage, ratingTaskCards } from "@/site/sitedata/rating";
import { nicheTopicLink } from "@/site/sitedata/topics";
import { BackButton, Card, DetailToolbar, EmptyCard, Heading, RatingIcon, ROW_GLYPH, RowCard, SourceIcon } from "@/site/ui";

// A task of a niche (/<L>/rating/<niche>/tasks/<n>; spec 11 §4.4): the app's
// ClarityScenarioViewContent (ClarityRatings.swift:335-394), opened from the niche page's «Для
// чего тебе приложение?», the app page's «Упоминается в задачах» and the sibling tasks. The job
// as the heading (the niche as the link back), the audience line, «Что проверить перед выбором»
// as an inset, the apps the research names for the task as the niche's row cards (rank, icon,
// screenshots, score — «Порядок списка не означает рейтинг пригодности»), the names without a
// card, the niche's other tasks, then the rows to the whole ranking and the research.
// PUBLIC (spec 11 D2): nothing here reads the viewer; do not add a gate back. `n` is the 1-based
// index into the data locale's scenarios (ru and en line up); an unreadable task is a 404. The
// tasks of a non-launch niche exist in Russian only: their en/de/fr/ja URLs (the language switcher
// builds them from the path) redirect to the niche page of that language. Indexable only with a
// gap, an audience, ≥ 3 apps and a title that fits (features/rating/seo.ts isIndexableTask, D11);
// the rest is `noindex, follow`. hreflang pairs ru and en only when both copies are indexable
// (seo.ts taskAlternates).

type Props = { params: Promise<{ lang: string; slug: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, n } = await params;
  if (!isLocale(lang)) return {};
  const view = getRatingScenario(lang, slug, n);
  if (!view) return {};
  const { niche, scenario } = view;
  const title = taskTitle(lang, niche, scenario);
  const description = clampDescription(scenario.gap ?? scenario.job, lang);
  const index = taskIndex(getRatingScenario("ru", slug, n), isLaunchCategory(slug) ? getRatingScenario("en", slug, n) : null);
  const alternates = taskAlternates(lang, `rating/${slug}/tasks/${scenario.n}`, index);
  // The niche's card, like the niche page: the task belongs to that niche.
  const image = ratingShareImage(lang, slug);
  return {
    title,
    description,
    alternates,
    robots: isIndexableTask(lang, niche, view) ? TOPIC_ROBOTS : { index: false, follow: true },
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: withBrand(title, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
      images: [image],
    },
    twitter: { card: "summary_large_image", title: withBrand(title, lang), description, images: [image] },
  };
}

export default async function RatingTaskPage({ params }: Props) {
  const { lang, slug, n } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const view = getRatingScenario(locale, slug, n);
  if (!view) {
    // A Russian-only task (non-launch niche) opened in another language: that language's niche.
    if (locale !== "ru" && getRatingScenario("ru", slug, n) && getRatingNiche(locale, slug)) redirect(routes.ratingNiche(locale, slug));
    notFound();
  }
  preconnect(MZ_ORIGIN);
  const { niche, scenario, apps } = view;
  const t = await getT(locale);
  const s = ratingStrings[locale];
  const textLang = dataLang(locale);
  const nameLang = niche.nameLang === locale ? undefined : niche.nameLang;
  const topic = nicheTopicLink(locale, slug);
  const nicheHref = routes.ratingNiche(locale, slug);
  const otherTasks = ratingTaskCards(niche).filter((task) => task.n !== scenario.n);
  // « В материале также упомянуты: » ends with a space in ru only: trim, join with one space
  // (none in Japanese).
  const mentioned =
    scenario.unmatched.length > 0
      ? `${t("В материале также упомянуты: ").trim()}${locale === "ja" ? "" : " "}${scenario.unmatched.join(", ")}${t(". Отдельных карточек в этой подборке нет.")}`
      : null;

  return (
    <>
      <RatingImageGuard />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(taskJsonLd(locale, t, view)) }} />
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={nicheHref} />}
        title={t("Выбор по задаче")}
      />
      <div className="ia-page ia-page--catalog ia-page--stack">
        <Heading
          className="ia-heading--fixed"
          title={<span lang={textLang}>{scenario.job}</span>}
          subtitle={
            <Link className="ia-rt-hero__niche" href={nicheHref} lang={nameLang}>
              {niche.name}
            </Link>
          }
        />
        {/* Right under the heading, as on the niche and app pages (the job above is data too). */}
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}
        {scenario.name ? (
          <p className="ia-search-status" lang={textLang}>
            {scenario.name}
          </p>
        ) : null}

        {scenario.gap ? (
          <section className="ia-rt-inset" aria-labelledby="rating-gap-title">
            <h2 id="rating-gap-title" className="ia-rt-inset__title">
              {t("Что проверить перед выбором")}
            </h2>
            <p className="ia-rt-prose" lang={textLang}>
              {scenario.gap}
            </p>
          </section>
        ) : null}

        <section className="ia-rt-section" aria-labelledby="rating-task-apps-title">
          <h2 id="rating-task-apps-title" className="ia-section-title ia-section-title--bold">
            {t("Какими приложениями пользуются")}
          </h2>
          <p className="ia-search-status">
            {t(
              "Эти приложения упомянуты в разборе этой задачи. Открой каждое, чтобы сравнить сильные стороны и ограничения. Порядок списка не означает рейтинг пригодности.",
            )}
          </p>
          {apps.length === 0 ? (
            <EmptyCard
              title={t("Пока нет связанных карточек")}
              body={t("В исследовании есть описание задачи, но недостаточно данных для списка подходящих приложений.")}
            />
          ) : (
            // The task's order (not the rank); each row still shows the app's place in the niche.
            <ol id="rating-task-apps" className="ia-rt-list" style={rankVars(s.rankShort)} aria-labelledby="rating-task-apps-title">
              {apps.map((app) => (
                <RatingAppCard
                  key={app.slug}
                  app={app}
                  href={routes.ratingApp(locale, slug, app.slug)}
                  locale={locale}
                  dataLang={textLang}
                  variant="row"
                />
              ))}
            </ol>
          )}
          {mentioned ? <p className="ia-footnote">{mentioned}</p> : null}
        </section>

        {otherTasks.length > 0 ? (
          <section className="ia-rt-section" aria-labelledby="rating-other-tasks">
            <h2 id="rating-other-tasks" className="ia-section-title ia-section-title--bold">
              {s.otherTasksTitle}
            </h2>
            <Card>
              <RatingTaskList tasks={otherTasks} niche={slug} locale={locale} dataLang={textLang} variant="compact" />
            </Card>
          </section>
        ) : null}

        <RowCard
          href={nicheHref}
          glyph={<RatingIcon {...ROW_GLYPH} />}
          title={formatNodes(s.wholeNicheTitle, { name: nameLang ? <span lang={nameLang}>{niche.name}</span> : niche.name })}
          subtitle={format(s.wholeNicheBody, { apps: counted(locale, niche.count, s.appsWord) })}
        />
        {topic ? (
          <RowCard
            href={topic.href}
            glyph={<SourceIcon {...ROW_GLYPH} />}
            title={t("Откуда взят этот разбор")}
            subtitle={t("Прочитать исследование и наблюдения из отзывов")}
          />
        ) : null}
      </div>
    </>
  );
}
