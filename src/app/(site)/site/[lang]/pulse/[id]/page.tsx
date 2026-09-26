import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { getPulseCategoryNames, getPulseDemand, pulseCategoryHref } from "@/site/sitedata/pulse";
import { PulseBreakdown, PulseEvidenceList, PulseFacts, PulseStars, PulseWhere } from "@/site/features/pulse/PulseDetail";
import { PulseGauge, PulseLevel } from "@/site/features/pulse/PulseGauge";
import { PulseRows } from "@/site/features/pulse/PulseRows";
import { categoryNeeds, countsFacts, needText, painAria, resolvePulseRoute, sharePercent, verifiedPhrase } from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import { format } from "@/site/i18n/translate";
import { clampDescription, localeAlternates, OG_LOCALE } from "@/site/features/research/seo";
import { BackButton, DetailToolbar } from "@/site/ui";
import "@/site/features/pulse/pulse-kit.css";
import "@/site/features/pulse/pulse.css";

// A need (SPEC «Подробности», direction A «Прибор»): the category and the title; a large gauge
// with the word level; the facts line; the summary and the link to the category breakdown;
// «Из чего складывается 7/10» (the three terms of the score); «Где об этом пишут» (a dot per
// app of the category, next to the apps where it comes up most); the star split of the matching
// reviews; quotes (the first is public, the rest need the category's research access — gated
// here on the server); the other needs of the category as bar rows. No kind label.
// Ids are "<category>--<slug>". Retired prototype ids (with ":" or "insight") redirect to the
// feed filtered by their category; anything else unknown is a 404.

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const route = resolvePulseRoute(id, await getPulseDemand());
  if (route.type !== "need") return {};
  const s = pulseStrings[lang];
  const need = route.need;
  const title = `${needText(need.title, lang)} — ${s.title}`;
  const description = clampDescription(needText(need.summary, lang), lang);
  const alternates = localeAlternates(lang, `pulse/${need.id}`);
  return {
    title,
    description,
    alternates,
    openGraph: { type: "article", siteName: "inApp", title: `${title} — inApp`, description, url: alternates.canonical as string, locale: OG_LOCALE[lang] },
    twitter: { card: "summary", title: `${title} — inApp`, description },
    // Listed in the sitemap: the public part (title, numbers, first quote) is the same for everyone.
    robots: { index: true, follow: true },
  };
}

export default async function PulseNeedPage({ params }: Props) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const data = await getPulseDemand();
  const route = resolvePulseRoute(id, data);
  if (route.type === "redirect") redirect(routes.pulse(lang, { category: route.category ?? undefined }));
  if (route.type !== "need") notFound();
  const need = route.need;

  const [viewer, t, names] = await Promise.all([getViewer(), getT(lang), getPulseCategoryNames(lang, data)]);
  const s = pulseStrings[lang];
  const readable = viewer.canReadResearch(need.categoryId);
  const categoryName = names.get(need.categoryId) ?? need.categoryId;
  const breakdown = pulseCategoryHref(lang, need.categoryId);
  const others = categoryNeeds(data, need.categoryId).filter((other) => other.id !== need.id);
  const verified = verifiedPhrase(lang, s, need);
  const numbers = [...countsFacts(lang, s, need), format(s.shareOfCategory, { share: sharePercent(lang, need.share) }), ...(verified ? [verified] : [])];
  const unlock = {
    href: routes.plus(lang, { source: "pulse_need" }),
    label: t("Открыть все материалы"),
    signInHref: viewer.loggedIn ? null : routes.login(lang, { returnTo: routes.pulseNeed(lang, need.id) }),
  };

  return (
    <div className="ia-pulse-page" data-pulse="detail">
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.pulse(lang, { category: need.categoryId })} />} />
      <article className="ia-page ia-page--reading ia-pulse-detail" aria-labelledby="pulse-need-title">
        <header className="ia-pulse-panel ia-pulse-detail__head">
          <Link className="ia-pulse-detail__category" href={routes.pulse(lang, { category: need.categoryId })}>
            {categoryName}
          </Link>
          <h1 className="ia-pulse-detail__title" id="pulse-need-title">
            {needText(need.title, lang)}
          </h1>
          <div className="ia-pulse-detail__meter">
            <PulseGauge score={need.score} size="page" id={`pg-${need.id}`} />
            <PulseLevel score={need.score} strings={s} className="ia-pulse-level--large" />
            <span className="ia-pulse-sr-only">{painAria(lang, s, need.score)}</span>
          </div>
          <PulseFacts facts={numbers} className="ia-pulse-detail__numbers" />
          <p className="ia-pulse-detail__summary">{needText(need.summary, lang)}</p>
          {breakdown ? (
            breakdown.oldSite ? (
              <a className="ia-pulse-detail__research" href={breakdown.href}>
                {s.research} <span aria-hidden="true">→</span>
              </a>
            ) : (
              <Link className="ia-pulse-detail__research" href={breakdown.href}>
                {s.research} <span aria-hidden="true">→</span>
              </Link>
            )
          ) : null}
        </header>
        <PulseBreakdown need={need} params={data.source.score} locale={lang} strings={s} />
        <PulseWhere need={need} locale={lang} strings={s} />
        <div className="ia-pulse-panel">
          <PulseStars counts={need.ratingCounts} locale={lang} strings={s} />
        </div>
        <PulseEvidenceList need={need} readable={readable} locale={lang} strings={s} unlock={unlock} />
        {others.length ? (
          <section className="ia-pulse-section" aria-labelledby="pulse-more-title">
            <h2 className="ia-pulse-section__title" id="pulse-more-title">
              {s.moreInCategory}
            </h2>
            <div className="ia-pulse-panel ia-pulse-panel--rows">
              <PulseRows needs={others} locale={lang} strings={s} />
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
