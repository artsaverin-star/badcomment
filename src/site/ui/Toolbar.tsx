"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { canGoBackInApp } from "../shell/navigation";
import { cx } from "./cx";

// Detail toolbar (spec 05 §3.6 J): a sticky, transparent bar with frosted "glass" pills —
// leading «Назад», optional centered title, trailing group of icon buttons (bookmark,
// contents, ⋯). Reader chrome is tinted ink, not accent.
//
//   <DetailToolbar
//     leading={<BackButton fallbackHref={routes.research(L)} label={t("Назад")} />}
//     title={t("Идея")}
//     trailing={<ToolbarPill icons>
//       <IconButton label={t("Сохранить")} pressed={saved} onClick={toggle}>
//         {saved ? <BookmarkFilledIcon size={17} /> : <BookmarkIcon size={17} />}
//       </IconButton>
//       <Menu label={t("Ещё")} items={…} />
//     </ToolbarPill>}
//   />

export function DetailToolbar({
  leading,
  title,
  trailing,
  className,
}: {
  leading?: ReactNode;
  title?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ia-toolbar", className)}>
      <div className="flex items-center">{leading}</div>
      {title ? <div className="ia-toolbar__title">{title}</div> : null}
      <div className="flex items-center gap-2">{trailing}</div>
    </div>
  );
}

/** A frosted glass capsule. `icons` = tight padding for a group of 38×44 icon buttons. */
export function ToolbarPill({
  icons,
  className,
  children,
}: {
  icons?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("ia-glass-pill", icons && "ia-glass-pill--icons", className)}>{children}</div>;
}

/**
 * Icon-only button with a required accessible name.
 *   default  38×44 (inside a ToolbarPill)
 *   circle   46×46 surface circle with hairline (Saved gear)
 *   plain    44×44 transparent
 * `pressed` renders aria-pressed (bookmark toggle). The color stays the reader chrome's ink
 * (ClarityReader.swift:805: `bookmark` ↔ `bookmark.fill`) — pass <BookmarkFilledIcon/> when
 * pressed instead of relying on a tint.
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    variant?: "default" | "circle" | "plain";
    pressed?: boolean;
    children: ReactNode;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">
>(function IconButton({ label, variant = "default", pressed, className, children, type, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      className={cx("ia-icon-btn", variant !== "default" && `ia-icon-btn--${variant}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
});

/**
 * «Назад» (spec 01 §1.3): history back when the previous entry is a page of this site,
 * otherwise a link to the section root (`fallbackHref`). Text only, no chevron.
 */
export function BackButton({ label, fallbackHref, className }: { label: string; fallbackHref: string; className?: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      className={cx("ia-glass-pill", className)}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (canGoBackInApp()) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {label}
    </Link>
  );
}
