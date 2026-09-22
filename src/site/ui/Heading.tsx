import type { ReactNode } from "react";
import { cx } from "./cx";

// Page header (spec 05 §3.6 A).
//   <Heading title="Разборы" subtitle="Что людям важно…" />       ClarityHeading: Georgia 30 + 19 secondary
//   <Heading variant="large" title="Сохранённое" subtitle="…" />  Saved: SF 34 bold, tracking −1, 15 secondary
// `trailing` sits on the right of the title row (e.g. the Saved gear button).

export function Heading({
  title,
  subtitle,
  variant = "serif",
  level = 1,
  trailing,
  id,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  variant?: "serif" | "large";
  level?: 1 | 2;
  trailing?: ReactNode;
  id?: string;
  className?: string;
}) {
  const H = level === 1 ? "h1" : "h2";
  const text = (
    <div className={cx("ia-heading", variant === "large" && "ia-heading--large", !trailing && className)}>
      <H className="ia-heading__title" id={id}>
        {title}
      </H>
      {subtitle ? <p className="ia-heading__subtitle">{subtitle}</p> : null}
    </div>
  );
  if (!trailing) return text;
  // Saved header row: HStack(alignment: .top, spacing: 12) (ClarityMy.swift:87).
  return (
    <div className={cx("flex items-start justify-between gap-3", className)}>
      {text}
      <div className="flex-none">{trailing}</div>
    </div>
  );
}

/** Section heading inside pages and articles: SF title2 22/600. */
export function SectionTitle({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cx("ia-section-title", className)}>
      {children}
    </h2>
  );
}

/** Sub-heading: SF headline 17/600. */
export function Subheading({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h3 id={id} className={cx("ia-subheading", className)}>
      {children}
    </h3>
  );
}
