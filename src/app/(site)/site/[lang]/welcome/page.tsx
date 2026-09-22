import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Badge } from "@/site/ui/Badge";

// TODO(welcome): PLACEHOLDER for the onboarding replay (spec 03 §1, spec 09 §2.6): 4 story
// pages + paywall page, «Закрыть» returns to the previous URL. Full-screen: the shell hides
// its chrome on this route (src/site/shell/ChromeFrame.tsx chromeFor()).

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function WelcomePlaceholder({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--welcome flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
      <Badge tone="neutral">TODO · welcome placeholder</Badge>
      <h1 className="ia-display m-0">{t("Разборы отзывов")}</h1>
      <Link href={routes.settings(lang)} className="text-ia-secondary">
        {t("Закрыть")}
      </Link>
    </div>
  );
}
