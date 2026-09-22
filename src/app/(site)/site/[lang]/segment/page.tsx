import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { LAUNCH_CATEGORIES } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { Badge, LockBadge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { Heading } from "@/site/ui/Heading";

// TODO(research): PLACEHOLDER for the research catalog (tab «Разборы», spec 01 §3–4):
// 35 launch topics + «Скоро в новом формате», server-side search (?q=).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ResearchCatalogPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [{ q }, t, viewer] = await Promise.all([searchParams, getT(lang), getViewer()]);

  return (
    <div className="ia-page ia-page--grid flex flex-col gap-6">
      <Heading title={t("Разборы")} subtitle={t("Что людям важно в приложениях и чего им не хватает.")} />
      <Badge tone="neutral">TODO · research catalog placeholder{q ? ` · q=${q}` : ""}</Badge>
      <ul className="ia-grid m-0 list-none p-0">
        {LAUNCH_CATEGORIES.map((slug) => (
          <li key={slug}>
            <Card href={routes.topic(lang, slug)} variant="research" interactive className="h-full">
              <div className="flex flex-col gap-2.5 p-[22px]">
                <span className="ia-serif flex items-baseline justify-between gap-3 text-ia-card-title">
                  {slug}
                  {viewer.canReadResearch(slug) ? null : <LockBadge label="Plus" />}
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
