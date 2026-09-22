import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Badge } from "@/site/ui/Badge";
import { Heading } from "@/site/ui/Heading";
import { BackButton, DetailToolbar } from "@/site/ui/Toolbar";

// TODO(settings): PLACEHOLDER for «О материалах» (spec 02 §8.7; web deltas spec 09 G11).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function SettingsAboutPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div>
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.settings(lang)} />} />
      <div className="ia-page ia-page--library flex flex-col gap-6">
        <Heading title={t("О материалах")} />
        <Badge tone="neutral">TODO · settings/about placeholder</Badge>
      </div>
    </div>
  );
}
