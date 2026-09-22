import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Badge } from "@/site/ui/Badge";
import { Button } from "@/site/ui/Button";
import { EmptyState } from "@/site/ui/EmptyState";
import { Heading } from "@/site/ui/Heading";
import { BookmarkIcon, SettingsIcon } from "@/site/ui/icons";

// TODO(library): PLACEHOLDER for «Сохранённое» (spec 02 §6): local-first bookmarks + notes,
// filters ?filter=&q=, account sync; the gear opens Settings.

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function SavedPlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading
        variant="large"
        title={t("Сохранённое")}
        subtitle={t("Твоя библиотека")}
        trailing={
          <Link href={routes.settings(lang)} className="ia-icon-btn ia-icon-btn--circle" aria-label={t("Настройки")}>
            <SettingsIcon size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
        }
      />
      <Badge tone="neutral">TODO · saved placeholder</Badge>
      <EmptyState
        icon={<BookmarkIcon size={30} strokeWidth={1.6} />}
        title={t("Пока нет сохранённого")}
        action={
          <Button href={routes.research(lang)} variant="rect" block>
            {t("Открыть разборы")}
          </Button>
        }
      />
    </div>
  );
}
