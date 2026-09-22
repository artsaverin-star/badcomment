import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/site/access";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { Badge } from "@/site/ui/Badge";
import { Button } from "@/site/ui/Button";

// TODO(landing): PLACEHOLDER. Replace with the landing (spec 08) for signed-out visitors.
// Front door rule (DECISIONS §9): signed in → 307 /<L>/segment.

export const metadata: Metadata = { robots: { index: false, follow: true } };

const HEADLINE: Record<Locale, string> = {
  ru: "Найди идею для приложения",
  en: "Find your next app idea",
  de: "Finde deine nächste App-Idee",
  fr: "Trouve ta prochaine idée d’application",
  ja: "次のアプリのアイデアを見つけよう",
};

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const viewer = await getViewer();
  if (viewer.loggedIn) redirect(routes.research(lang));
  const t = await getT(lang);

  return (
    <div className="ia-page ia-page--wide flex flex-col items-start gap-6 pt-12">
      <Badge tone="neutral">TODO · landing placeholder</Badge>
      <h1 className="ia-display m-0 max-w-[16ch]">{HEADLINE[lang]}</h1>
      <p className="ia-heading__subtitle max-w-[40ch]">{t("Что людям важно в приложениях и чего им не хватает.")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button href={routes.research(lang)} variant="welcome">
          {t("Разборы")}
        </Button>
        <Button href={routes.ideas(lang)} variant="secondary">
          {t("Идеи")}
        </Button>
        <AppStoreBadge size="lg" />
      </div>
    </div>
  );
}
