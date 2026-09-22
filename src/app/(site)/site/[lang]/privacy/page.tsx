import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { Badge } from "@/site/ui/Badge";
import { Heading } from "@/site/ui/Heading";

// TODO(legal): PLACEHOLDER for the web privacy policy (spec 09 C3, G4: the app's privacy
// sheet layout with web-specific text — ia_session cookie, analytics, YooKassa, account data).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function PrivacyPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading title={t("Конфиденциальность")} />
      <Badge tone="neutral">TODO · privacy placeholder</Badge>
    </div>
  );
}
