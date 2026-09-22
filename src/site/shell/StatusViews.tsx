"use client";

import { useLocale, useT, useWeb } from "../i18n/client";
import { routes } from "../routing";
import { Button } from "../ui/Button";
import { ClarityArt } from "../ui/EmptyState";
import { ArrowRightIcon, TextLinesIcon } from "../ui/icons";
import type { ShellStrings } from "./strings";
import { FloatingTabBar } from "./TabBar";

// Full-page states of the new site, in the app's words (spec 09 G8, G13):
//   NotFoundView — «Материал недоступен» + a way back to «Разборы» (the tab bar stays visible)
//   ErrorView    — «Не удалось открыть материалы» / «Попробуй загрузить библиотеку ещё раз.» / «Повторить»
// Both draw ClarityArt(role: .research) — glyph `text.alignleft` at 0.17 × size.
// ErrorView is the app's boot error (ClarityRoot.swift:36-41): VStack spacing 24, padding 26,
// art 150 centered, ClarityHeading (leading-aligned), full-width ClarityButton «Повторить».

const ART = 150;
const artGlyph = <TextLinesIcon size={Math.round(ART * 0.17)} strokeWidth={2.2} />;

export function NotFoundView() {
  const locale = useLocale();
  const t = useT();
  const s = useWeb<ShellStrings>("shell");
  return (
    <div className="ia-page ia-page--catalog flex flex-col items-center gap-6 py-16 text-center">
      <ClarityArt size={ART} icon={artGlyph} />
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
    <div className="ia-status">
      <ClarityArt size={ART} icon={artGlyph} />
      {/* Announce the failure (title + hint), not the whole page with its button. */}
      <div className="ia-heading ia-status__heading" role="alert">
        <h1 className="ia-heading__title">{t("Не удалось открыть материалы")}</h1>
        <p className="ia-heading__subtitle">{t("Попробуй загрузить библиотеку ещё раз.")}</p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        {t("Повторить")}
      </Button>
    </div>
  );
}
