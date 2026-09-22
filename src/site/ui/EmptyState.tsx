import type { ReactNode } from "react";
import { cx } from "./cx";

// Empty state (spec 05 §3.6 O, Saved «Пока нет сохранённого»; ClarityMy.swift:112-127):
// surface card r24, padding 24, gap 24; icon tile 64×72 r18 accent-soft with an accent glyph
// (bookmark 30/300); title 22/600; body 17/26 secondary 10 below; the CTA hugs its label.

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ia-empty", className)}>
      {icon ? (
        <div className="ia-empty__tile" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div>
        <h2 className="ia-empty__title">{title}</h2>
        {body ? <p className="ia-empty__body">{body}</p> : null}
      </div>
      {action ? <div className="ia-empty__action">{action}</div> : null}
    </div>
  );
}

/**
 * The app's loading/error illustration (ClarityArt, ClarityStyle.swift:28-88), drawn in CSS
 * (spec 09 C4 — not the ClarityResearch PNG): a soft plate (−15°) and an accent @17 % plate
 * (+12°) behind a surface "paper" (−3°) with an accent glyph and three text capsules; the
 * whole group floats (y −3, 1.2°, 3.4 s) unless reduced motion. Geometry is in fractions of
 * `size`, exactly as in Swift. `icon` = the role's glyph at ≈ 0.17 × size (the app's boot and
 * error screens use role .research → `text.alignleft`, i.e. <TextLinesIcon />).
 */
export function ClarityArt({ size = 150, icon }: { size?: number; icon?: ReactNode }) {
  return (
    <div className="ia-art" style={{ ["--ia-art-size" as string]: `${size}px` }} aria-hidden="true">
      <span className="ia-art__plate ia-art__plate--back" />
      <span className="ia-art__plate ia-art__plate--mid" />
      <span className="ia-art__paper">
        <span className="ia-art__glyph">{icon}</span>
        <span className="ia-art__line" />
        <span className="ia-art__line" />
        <span className="ia-art__line" />
      </span>
    </div>
  );
}
