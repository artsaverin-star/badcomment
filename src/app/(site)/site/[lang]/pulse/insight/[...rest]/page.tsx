import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { resolvePulseRoute } from "@/site/features/pulse/query";

// Retired prototype route "insight/<id>" (the curated insights the Pulse demand layer replaced):
// → the feed, filtered by the insight's category when it is still a Pulse category.

type Props = { params: Promise<{ lang: string; rest: string[] }> };

export default async function RetiredPulseInsight({ params }: Props) {
  const { lang, rest } = await params;
  if (!isLocale(lang)) notFound();
  const route = resolvePulseRoute(`insight/${rest.join("/")}`, await getPulseDemand());
  redirect(routes.pulse(lang, { category: route.type === "redirect" ? (route.category ?? undefined) : undefined }));
}
