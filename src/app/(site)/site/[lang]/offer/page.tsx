import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { Badge } from "@/site/ui/Badge";
import { Heading } from "@/site/ui/Heading";

// TODO(legal): PLACEHOLDER for the terms of use. The shipped iOS app opens /{ru,en}/offer
// («Условия использования») — this URL must always answer 200 (DECISIONS §7, spec 09 O6/O10).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function OfferPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading title={t("Условия использования")} />
      <Badge tone="neutral">TODO · terms placeholder</Badge>
    </div>
  );
}
