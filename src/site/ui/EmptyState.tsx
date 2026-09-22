import type { ReactNode } from "react";
import { cx } from "./cx";

// Empty state (spec 05 §3.6 O, Saved «Пока нет сохранённого»): surface card r24, icon tile
// 64×72 accent-soft with an accent glyph, title 22/600, body 17/26 secondary, optional action.

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
      {action ? <div className="w-full">{action}</div> : null}
    </div>
  );
}

/**
 * The app's loading/error illustration (ClarityArt): two tilted plates behind a white "paper"
 * with text lines, gently floating. Drawn in CSS (spec 09 C4 — not the ClarityResearch PNG).
 */
export function ClarityArt({ size = 150, icon }: { size?: number; icon?: ReactNode }) {
  return (
    <div className="ia-art" style={{ ["--ia-art-size" as string]: `${size}px` }} aria-hidden="true">
      <span className="ia-art__plate ia-art__plate--back" />
      <span className="ia-art__plate ia-art__plate--mid" />
      <span className="ia-art__paper">
        <span className="flex" style={{ height: "28%" }}>
          {icon}
        </span>
        <span className="ia-art__line" />
        <span className="ia-art__line" />
        <span className="ia-art__line" />
      </span>
    </div>
  );
}
