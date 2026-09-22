import type { CSSProperties } from "react";
import { cx } from "./cx";

// Loading placeholders. Static under prefers-reduced-motion.

export function Skeleton({
  width,
  height = 16,
  radius,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx("ia-skeleton", className)}
      style={{ width: width ?? "100%", height, borderRadius: radius, ...style }}
    />
  );
}

/** A few text lines, the last one shorter. */
export function SkeletonText({ lines = 3, lineHeight = 18, className }: { lines?: number; lineHeight?: number; className?: string }) {
  return (
    <span className={cx("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={lineHeight - 4} width={i === lines - 1 && lines > 1 ? "62%" : "100%"} />
      ))}
    </span>
  );
}

/** Placeholder of a research / idea card (art 3:2 + text). */
export function SkeletonCard({ variant = "research" }: { variant?: "research" | "idea" }) {
  return (
    <div
      aria-hidden="true"
      className={cx("ia-card", variant === "research" ? "ia-card--research" : "ia-card--idea")}
    >
      <Skeleton height="auto" radius={0} style={{ aspectRatio: "3 / 2" }} />
      <div className="flex flex-col gap-3" style={{ padding: variant === "research" ? 22 : 20 }}>
        <Skeleton height={24} width="70%" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}
