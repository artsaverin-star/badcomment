import type { ReactNode } from "react";
import { Card } from "./Card";
import { cx } from "./cx";
import { SearchIcon } from "./icons";

// ClarityRatingsEmpty (ClarityRatings.swift:474-483): a clarityCard with the magnifier
// (title2, secondary), a title2 bold line and a body secondary message, 12 apart. The title is
// a <p>: in Swift it is not a header. Server- and client-safe.
//   <EmptyCard title={t("Пока не нашли")} body={t("Попробуй название приложения или тему: …")} />
// `children` (web-only) follow the message, e.g. the «Повторить» button of a failed request.

export function EmptyCard({
  title,
  body,
  className,
  children,
}: {
  title: ReactNode;
  body?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cx("ia-empty-card", className)}>
      <SearchIcon size={24} strokeWidth={1.9} aria-hidden="true" />
      <p className="ia-empty-card__title">{title}</p>
      {body ? <p className="ia-empty-card__body">{body}</p> : null}
      {children}
    </Card>
  );
}
