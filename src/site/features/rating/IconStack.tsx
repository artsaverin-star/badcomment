import type { CSSProperties } from "react";
import { AppIcon } from "@/site/ui/AppIcon";

// Up to 4 overlapping app icons (spec 11 §3.5): the apps of a task row. Server- and
// client-safe. Decorative (aria-hidden): the names are printed next to it. Each icon after the
// first overlaps the previous by 28 % and is cut out of it by a 2 px surface ring (rating.css).
//
//   <IconStack icons={task.apps.map((a) => a.icon)} size={28} />

export function IconStack({ icons, size = 28 }: { icons: readonly (string | null)[]; size?: 24 | 28 }) {
  if (icons.length === 0) return null;
  return (
    <span className="ia-rt-stack" aria-hidden="true" style={{ "--s": `${size}px` } as CSSProperties}>
      {icons.slice(0, 4).map((path, i) => (
        <AppIcon key={i} path={path} size={size} />
      ))}
    </span>
  );
}
