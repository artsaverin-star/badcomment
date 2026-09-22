import Link from "next/link";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

// Cards (spec 05 §3.6 C, D, O; §6.2 "Cards"):
//   utility   clarityCard — padding 22, radius 20, hairline, flat (empty/locked states, notices)
//   research  research catalog card — radius 28 + shadow, overflow hidden (art 3:2 on top)
//   idea      idea card — radius 24 + shadow, 6 px bottom margin
//   group     grouped list container — radius 20, no stroke/shadow (Settings); group-sm = 18 (Saved)
// `interactive` adds the app's press feedback (scale .97 / opacity .88) and a web hover lift.
// `href` makes the whole card one link (next/link; plain <a> when `external`).

export type CardVariant = "utility" | "research" | "idea" | "group" | "group-sm";

export function Card({
  as,
  href,
  external,
  prefetch,
  variant = "utility",
  interactive,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  href?: string;
  external?: boolean;
  prefetch?: boolean;
  variant?: CardVariant;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const cls = cx("ia-card", `ia-card--${variant}`, interactive && "ia-card--interactive", className);
  if (href !== undefined) {
    if (external) {
      return (
        <a href={href} className={cls} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={prefetch} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const Tag = as ?? "div";
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
