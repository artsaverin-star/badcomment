import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SUPPORT_EMAIL } from "@/site/config";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { Badge } from "@/site/ui/Badge";
import { Card } from "@/site/ui/Card";
import { Heading } from "@/site/ui/Heading";

// TODO(legal): PLACEHOLDER for contacts. /en/contacts is the App Store support URL and the
// shipped iOS app opens /{ru,en}/contacts — this URL must always answer 200 (DECISIONS §7).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ContactsPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading title={t("Написать разработчику")} />
      <Badge tone="neutral">TODO · contacts placeholder</Badge>
      <Card>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-ia-accent">
          {SUPPORT_EMAIL}
        </a>
      </Card>
    </div>
  );
}
