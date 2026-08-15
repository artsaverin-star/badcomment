import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NicheDossier from "@/components/NicheDossier";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import { canUseWorkspaceBeta } from "@/lib/workspaceAccess";

export const dynamic = "force-dynamic";

type RatingSet = { name: string; nameEn?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const rating = (RATING_BY_SLUG as Record<string, RatingSet>)[slug];
  const name = rating ? (ru ? rating.name : rating.nameEn || rating.name) : slug;
  return {
    title: `${name} — beta`,
    description: ru ? "Закрытая beta единого разбора категории." : "Private beta of the unified category dossier.",
    robots: { index: false, follow: false },
  };
}

export default async function WorkspaceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale, user] = await Promise.all([params, getLocale(), getSessionUser()]);
  if (!canUseWorkspaceBeta(user)) notFound();

  const lp = locale === "en" ? "/en" : "/ru";
  return <NicheDossier slug={slug} locale={locale} backHref={`${lp}/workspace`} workspace />;
}
