"use client";

import { useLocale, useT, useWebStrings } from "../i18n/client";
import { routes } from "../routing";
import { Button } from "../ui/Button";
import { ClarityArt } from "../ui/EmptyState";
import { AlertIcon, ArrowRightIcon, ResearchIcon } from "../ui/icons";
import { shellStrings } from "./strings";
import { FloatingTabBar } from "./TabBar";

// Full-page states of the new site, in the app's words (spec 09 G8, G13):
//   NotFoundView — «Материал недоступен» + a way back to «Разборы» (the tab bar stays visible)
//   ErrorView    — «Не удалось открыть материалы» / «Попробуй загрузить библиотеку ещё раз.» / «Повторить»

export function NotFoundView() {
  const locale = useLocale();
  const t = useT();
  const s = useWebStrings(shellStrings);
  return (
    <div className="ia-page ia-page--catalog flex flex-col items-center gap-6 py-16 text-center">
      <ClarityArt size={150} icon={<ResearchIcon size={22} strokeWidth={2} />} />
      <div className="flex flex-col gap-2.5">
        <h1 className="ia-heading__title">{t("Материал недоступен")}</h1>
        <p className="ia-heading__subtitle">{s.notFoundBody}</p>
      </div>
      <Button href={routes.research(locale)} variant="rect" icon={<ArrowRightIcon size={17} strokeWidth={2.2} />}>
        {t("Разборы")}
      </Button>
      <FloatingTabBar />
    </div>
  );
}

export function ErrorView({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="ia-page ia-page--catalog flex flex-col items-center gap-6 py-16 text-center" role="alert">
      <ClarityArt size={150} icon={<AlertIcon size={22} strokeWidth={2} />} />
      <div className="flex flex-col gap-2.5">
        <h1 className="ia-heading__title">{t("Не удалось открыть материалы")}</h1>
        <p className="ia-heading__subtitle">{t("Попробуй загрузить библиотеку ещё раз.")}</p>
      </div>
      <div className="w-full max-w-[360px]">
        <Button variant="primary" onClick={onRetry}>
          {t("Повторить")}
        </Button>
      </div>
    </div>
  );
}
