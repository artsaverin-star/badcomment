import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isLaunchIdea } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { Badge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { BackButton, DetailToolbar } from "@/site/ui/Toolbar";

// TODO(ideas): PLACEHOLDER for an idea page (spec 02 §3): full page on direct URL, modal
// (intercepting route) from cards; locked ideas show art only + paywall.

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function IdeaPlaceholder({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !isLaunchIdea(id)) notFound();
  const [t, viewer] = await Promise.all([getT(lang), getViewer()]);

  return (
    <div className="ia-reading-page">
      <DetailToolbar
        leading={<BackButton label={t("Назад")} fallbackHref={routes.ideas(lang)} />}
        title={t("Идея")}
      />
      <article className="ia-page ia-page--reading flex flex-col gap-6">
        <Badge tone="neutral">TODO · idea placeholder</Badge>
        <h1 className="ia-heading__title">{id}</h1>
        <Card>
          <p className="m-0">{viewer.canReadIdea(id) ? "canReadIdea: true" : "canReadIdea: false (locked)"}</p>
        </Card>
        <AppStoreBadge />
      </article>
    </div>
  );
}
