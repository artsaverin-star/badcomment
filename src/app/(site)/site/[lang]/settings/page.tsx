import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, LOCALE_NAMES, LOCALES } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes, switchLocaleHref } from "@/site/routing";
import { Badge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { Heading } from "@/site/ui/Heading";

// TODO(settings): PLACEHOLDER for Settings (spec 02 §8): Plus card, appearance (ia_theme),
// language, «Знакомство с приложением», about, contact/terms/privacy, old site link.

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function SettingsPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading variant="large" title={t("Настройки")} />
      <Badge tone="neutral">TODO · settings placeholder</Badge>
      <Card variant="group" className="flex flex-col">
        {LOCALES.map((l) => (
          <a key={l} href={switchLocaleHref(routes.settings(lang), l)} lang={l} className="px-4 py-4">
            {LOCALE_NAMES[l]} {l === lang ? "✓" : ""}
          </a>
        ))}
      </Card>
      <Link href={routes.settingsAbout(lang)} className="text-ia-accent">
        {t("О материалах")}
      </Link>
      <Link href={routes.welcome(lang)} className="text-ia-accent">
        {t("Знакомство с приложением")}
      </Link>
    </div>
  );
}
