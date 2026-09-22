import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isLaunchCategory } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { Badge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { BackButton, DetailToolbar } from "@/site/ui/Toolbar";

// TODO(research): PLACEHOLDER for a research article (spec 01 §5–6): gate/locked preview,
// TOC, bookmark, note, idea cards, plus the web-only blocks (apps, market players with
// id="main-players" and store badges — CI smoke test, ARCHITECTURE §5.4).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ResearchArticlePlaceholder({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang) || !isLaunchCategory(slug)) notFound();
  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);
  const readable = viewer.canReadResearch(slug);

  return (
    <div className="ia-reading-page">
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.research(lang)} />} />
      <article className="ia-page ia-page--reading flex flex-col gap-6">
        <Badge tone="neutral">TODO · research article placeholder</Badge>
        <h1 className="ia-heading__title">{slug}</h1>
        <Card>
          <p className="m-0">{readable ? "canReadResearch: true" : "canReadResearch: false (locked preview)"}</p>
        </Card>
        <AppStoreBadge />
      </article>
    </div>
  );
}
