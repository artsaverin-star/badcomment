import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { LAUNCH_IDEAS } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { Badge, LockBadge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { Heading } from "@/site/ui/Heading";

// TODO(ideas): PLACEHOLDER for the ideas catalog (tab «Идеи», spec 02 §1–2): 293 cards,
// category picker, entitlement-scoped search (?q=&category=).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function IdeasCatalogPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [{ q, category }, t, viewer] = await Promise.all([searchParams, getT(lang), getViewer()]);
  const ideas = LAUNCH_IDEAS.filter((id) => !category || id.startsWith(`${category}-`)).slice(0, 24);

  return (
    <div className="ia-page ia-page--grid flex flex-col gap-6">
      <Heading title={t("Идеи")} subtitle={t("Что можно создать или улучшить.")} />
      <Badge tone="neutral">
        TODO · ideas catalog placeholder{q ? ` · q=${q}` : ""}
        {category ? ` · category=${category}` : ""}
      </Badge>
      <ul className="ia-grid m-0 list-none p-0">
        {ideas.map((id) => (
          <li key={id}>
            <Card href={routes.idea(lang, id)} variant="idea" interactive className="h-full">
              <div className="flex items-center justify-between gap-3 p-5">
                <span className="ia-serif text-ia-card-title">{id}</span>
                {viewer.canReadIdea(id) ? null : <LockBadge variant="disc" label="Plus" />}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
