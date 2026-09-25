import { iconSrc } from "../features/rating/media";
import { cx } from "./cx";

// An App Store icon (spec 11 §3.2; the rating only, D1 — the web may show store icons,
// DECISIONS.md §3). Server- and client-safe, no strings.
//
//   <AppIcon path={app.icon} size={56} />                      decorative: the name sits beside it
//   <AppIcon path={app.icon} size={96} eager alt={format(s.iconAlt, { app: short })} />
//
// A plain <img> (D15: no next/image) with a CDN-sized WebP (features/rating/media.ts), explicit
// width/height and native lazy loading. The squircle radius (22.37 %, the iOS maths AppMark
// uses) and the hairline ring live in site.css `.ia-app-icon`: a percentage keeps the shape when
// CSS resizes the box (the app hero draws 96 and shows 72 below 760). Without a path it is the
// same soft tile, empty.

export type AppIconSize = 24 | 28 | 33 | 40 | 44 | 52 | 56 | 64 | 72 | 80 | 96;

export function AppIcon({
  path,
  size,
  alt = "",
  eager = false,
  className,
}: {
  /** Compact mzstatic path (content/v2 rating data); null = no icon. */
  path: string | null;
  size: AppIconSize;
  /** Default "" (decorative: the name is printed next to it). */
  alt?: string;
  /** Default false → loading="lazy". */
  eager?: boolean;
  className?: string;
}) {
  if (!path) {
    return (
      <span className={cx("ia-app-icon", "ia-app-icon--empty", className)} aria-hidden="true" style={{ width: size, height: size }} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- D15: CDN-sized <img>, no next/image
    <img
      className={cx("ia-app-icon", className)}
      src={iconSrc(path, size)}
      width={size}
      height={size}
      alt={alt}
      loading={eager ? undefined : "lazy"}
      decoding="async"
    />
  );
}
