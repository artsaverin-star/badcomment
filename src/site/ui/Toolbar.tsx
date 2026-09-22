"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type RefObject } from "react";
import { canGoBackInApp } from "../shell/navigation";
import { cx } from "./cx";

// Detail toolbar (spec 05 §3.6 J): a sticky bar with frosted "glass" pills — leading
// «Назад», optional centered title, trailing group of icon buttons (bookmark, contents, ⋯).
// Reader chrome is tinted ink, not accent. Like the app's inline navigation bar
// (ClarityReader.swift:193-195, ClarityContentAccess.swift:117) it is transparent while
// nothing is under it and gets a frosted paper backdrop (`data-scrolled`) as soon as the page
// content scrolls beneath it — so a centered title always has a bar behind it.
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
//
// `revealTitle`: the title repeats the page heading (e.g. the topic name) — keep it hidden
// until the content scrolls under the bar, and out of the accessibility tree (the <h1> below
// already names the page). Long titles truncate between the two side groups.

/** True once page content has scrolled under the (stuck) sticky bar. */
function useStuck(ref: RefObject<HTMLElement | null>): boolean {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let stickyTop = 0;
    const measureTop = () => {
      stickyTop = Number.parseFloat(getComputedStyle(el).top) || 0;
    };
    const update = () => {
      frame = 0;
      setStuck(window.scrollY > 0 && el.getBoundingClientRect().top <= stickyTop + 1);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const onResize = () => {
      measureTop(); // the sticky offset changes at the desktop breakpoint (below the top bar)
      schedule();
    };
    measureTop();
    schedule(); // a reload or a hash link can open the page already scrolled
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref]);
  return stuck;
}

export function DetailToolbar({
  leading,
  title,
  trailing,
  revealTitle,
  className,
}: {
  leading?: ReactNode;
  title?: ReactNode;
  trailing?: ReactNode;
  /** Show the title only once content scrolls under the bar (and hide it from AT). */
  revealTitle?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stuck = useStuck(ref);
  return (
    <div
      ref={ref}
      className={cx("ia-toolbar", className)}
      data-scrolled={stuck || undefined}
      data-reveal-title={revealTitle && title ? true : undefined}
    >
      <div className="ia-toolbar__leading">{leading}</div>
      {title ? (
        <div className="ia-toolbar__title" aria-hidden={revealTitle || undefined}>
          {title}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="ia-toolbar__trailing">{trailing}</div>
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
