import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { LockFilledIcon, LockIcon } from "./icons";

// Badges, chips and locks (spec 05 §3.6 F, G).

/** Capsule badge: «Бесплатный разбор» (accent-soft, ink 12/600). */
export function Badge({
  children,
  tone = "default",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "neutral";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("ia-badge", tone !== "default" && `ia-badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Filter chip (Saved «Всё · Разборы · Идеи · Заметки»): selected = accent on accent-soft.
 * Put chips in <ChipRow> (horizontal scroll, no scrollbar). `surface` = the category pill look.
 */
export function Chip({
  selected,
  surface,
  className,
  children,
  ...rest
}: { selected?: boolean; surface?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={surface ? undefined : !!selected}
      className={cx("ia-chip", surface && "ia-chip--surface", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cx("ia-chips", className)}>
      {children}
    </div>
  );
}

/** «inApp PLUS» eyebrow: 12/700, tracking .8, accent. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("ia-eyebrow", className)}>{children}</span>;
}

/**
 * Lock indicators.
 *   inline  outline lock 15 secondary beside a locked research title (label = «Полный разбор в Plus»)
 *   disc    filled accent lock in a ~45 px surface circle over locked idea art (label = «Идея в Plus»);
 *           position it yourself (spec: 16 px from the art's bottom-right corner).
 * Pass the translated `label`; the glyph itself is hidden from assistive tech.
 */
export function LockBadge({
  variant = "inline",
  label,
  className,
}: {
  variant?: "inline" | "disc";
  label?: string;
  className?: string;
}) {
  if (variant === "disc") {
    return (
      <span className={cx("ia-lock-disc", className)} role={label ? "img" : undefined} aria-label={label}>
        <LockFilledIcon size={17} />
      </span>
    );
  }
  return (
    <span className={cx("ia-lock-inline", className)} role={label ? "img" : undefined} aria-label={label}>
      <LockIcon size={15} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
