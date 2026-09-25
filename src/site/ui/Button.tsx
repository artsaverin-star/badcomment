import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

// Buttons (spec 05 §3.6 H). Works in server and client components.
//   primary   full-width capsule on --ia-action (ClarityButton: «Открыть все материалы», «Повторить»)
//   welcome   content-hugging Onest capsule (onboarding «Дальше», paywall CTA, landing)
//   rect      radius-14 CTA (Plus card «Открыть Plus», empty state «Открыть разборы»)
//   secondary surface pill with accent label («Готово» in Settings)
//   text      accent text button («Показать всё», «Сбросить поиск»); + ia-btn--flush (no side
//             padding, leading-aligned) / ia-btn--body (17/22 medium, «Показать остальные»)
//   ink       full-width ink capsule with a paper label, min-height 54 («Открыть в App Store»,
//             ClarityRatings.swift:271-277)
// With `href` it renders a link (next/link for internal paths, <a> when `external`).

export type ButtonVariant = "primary" | "welcome" | "rect" | "secondary" | "text" | "ink";

type Common = {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  /** Stretch to the container width (primary is always full width). */
  block?: boolean;
  /** Trailing glyph (e.g. <ArrowRightIcon size={16} />). */
  icon?: ReactNode;
  leadingIcon?: ReactNode;
  /** Shows a spinner and disables the control. */
  busy?: boolean;
  className?: string;
  children?: ReactNode;
};

export type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
export type LinkButtonProps = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    /** Render a plain <a> (other origin, old site, file download, language switch). */
    external?: boolean;
    prefetch?: boolean;
  };

export function buttonClass({
  variant = "primary",
  size = "md",
  block,
  className,
}: Pick<Common, "variant" | "size" | "block" | "className">): string {
  return cx("ia-btn", `ia-btn--${variant}`, size === "sm" && "ia-btn--sm", block && "ia-btn--block", className);
}

function Inner({ leadingIcon, icon, busy, children }: Pick<Common, "leadingIcon" | "icon" | "busy" | "children">) {
  return (
    <>
      {busy ? <span className="ia-spinner" aria-hidden="true" /> : leadingIcon}
      {children}
      {!busy && icon}
    </>
  );
}

export function Button(props: ButtonProps | LinkButtonProps) {
  if (props.href !== undefined) {
    const { variant, size, block, icon, leadingIcon, busy, className, children, href, external, prefetch, ...rest } =
      props as LinkButtonProps;
    const cls = buttonClass({ variant, size, block, className });
    const inner = <Inner {...{ leadingIcon, icon, busy, children }} />;
    if (external) {
      return (
        <a href={href} className={cls} aria-disabled={busy || undefined} {...rest}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={prefetch} className={cls} aria-disabled={busy || undefined} {...rest}>
        {inner}
      </Link>
    );
  }
  const { variant, size, block, icon, leadingIcon, busy, className, children, type, disabled, ...rest } =
    props as ButtonProps;
  return (
    <button
      type={type ?? "button"}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      <Inner {...{ leadingIcon, icon, busy, children }} />
    </button>
  );
}
