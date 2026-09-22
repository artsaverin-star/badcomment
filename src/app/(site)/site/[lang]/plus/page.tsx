import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { Badge, Eyebrow } from "@/site/ui/Badge";

// TODO(plus): PLACEHOLDER for the paywall page (spec 03 §2): YooKassa lifetime SKU presented
// as Plus (990 ₽, prices frozen — DECISIONS §10), source = ?source=.

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function PlusPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [{ source }, t, viewer] = await Promise.all([searchParams, getT(lang), getViewer()]);

  return (
    <div className="ia-page ia-page--welcome flex flex-col items-center gap-5 pt-12 text-center">
      <Eyebrow>inApp PLUS</Eyebrow>
      <h1 className="ia-display m-0">{t("Полный доступ")}</h1>
      <Badge tone="neutral">
        TODO · paywall placeholder{source ? ` · source=${source}` : ""} · plus={String(viewer.plus)}
      </Badge>
    </div>
  );
}
