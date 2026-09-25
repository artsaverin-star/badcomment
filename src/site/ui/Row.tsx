import type { ReactNode } from "react";
import { Card } from "./Card";
import { cx } from "./cx";

// ClarityRow (ClarityStyle.swift:148-162): a 48 × 48 accent-soft tile with the glyph in ink,
// then the title (headline) and an optional subtitle (subheadline secondary), 6 apart.
// Links between pages are RowCards: the whole clarityCard is one link, no chevron, no «→»
// (ClarityRatings.swift:219-221, 278-280, 384-386). Server- and client-safe.
//
//   <li><RowCard href={…} glyph={<SourceIcon {...ROW_GLYPH} />} title={t("Изучить весь разбор")}
//                subtitle={t("Задачи людей, сильные стороны продуктов и нерешённые проблемы")} /></li>
//
// `trailing` sits on the title line (e.g. <LockBadge variant="inline">); `children` go under the
// subtitle (e.g. <Badge className="ia-row__badge">). With `titleAs="h3"` the wrappers are
// <div>s (a heading is not phrasing content); otherwise <span>s, so a Row also fits in a button.

/** lucide at 24 / stroke 1.9 optically matches the app's SF 21 medium row glyph. */
export const ROW_GLYPH = { size: 24, strokeWidth: 1.9, "aria-hidden": true } as const;

export type RowProps = {
  glyph: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  titleAs?: "span" | "h3";
  /** `lang` of the title when it differs from the page (data-locale names). */
  titleLang?: string;
  trailing?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Row({ glyph, title, subtitle, titleAs = "span", titleLang, trailing, children, className }: RowProps) {
  const Box = titleAs === "h3" ? "div" : "span";
  const Title = titleAs;
  return (
    <Box className={cx("ia-row", className)}>
      <span className="ia-row__tile" aria-hidden="true">
        {glyph}
      </span>
      <Box className="ia-row__text">
        <Box className="ia-row__titleline">
          <Title className="ia-row__title" lang={titleLang}>
            {title}
          </Title>
          {trailing}
        </Box>
        {subtitle ? <span className="ia-row__subtitle">{subtitle}</span> : null}
        {children}
      </Box>
    </Box>
  );
}

/**
 * A Row in a clarityCard that is one link (`<Card variant="utility" href className="ia-row-card">`).
 * Flat: no press scale (`.buttonStyle(.plain)` only dims the label), never `interactive`.
 */
export function RowCard({
  href,
  prefetch,
  className,
  ...row
}: RowProps & {
  href: string;
  prefetch?: boolean;
}) {
  return (
    <Card variant="utility" href={href} prefetch={prefetch} className={cx("ia-row-card", className)}>
      <Row {...row} />
    </Card>
  );
}
