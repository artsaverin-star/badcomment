import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { AppIcon } from "@/site/ui/AppIcon";
import { shotSrc } from "./media";
import { ShotScroller } from "./ShotScroller";
import { ratingStrings } from "./strings";

// The screenshot stage on top of a leader card (spec 11 §3.4, §3.6 «Leader»). Server.
//
//   <RatingStage paths={app.shots} href={appHref} app={app.short} icon={app.icon} locale={L} eager />
//
// Up to 10 shots on --ia-soft in a ShotScroller track (a labelled, focusable region; decorative
// arrows for the mouse). Each shot links to the app page's gallery and is out of the tab order
// (the region scrolls with the arrow keys; RR9). 260 tall at ≥ 600 px of list width, 228 below.
// `eager` (leader №1) loads the first 3 shots at once; the rest are lazy.
// No shots (8 niches have a top-3 app without any): the «art» stage instead — the app's icon on
// the two tilted ClarityArt plates, without the float.

/** Displayed stage shot at ≥ 600 px (the 520 request is its 2×). */
const STAGE_W = 120;
const STAGE_H = 260;
const MAX_SHOTS = 10;

export function RatingStage({
  paths,
  href,
  app,
  icon,
  locale,
  eager = false,
}: {
  paths: readonly string[];
  /** The app page; each shot links to its #screenshots. */
  href: string;
  /** The short display name (alt text, region label). */
  app: string;
  /** The app icon for the no-shots art. */
  icon: string | null;
  locale: Locale;
  eager?: boolean;
}) {
  if (paths.length === 0) {
    return (
      <div className="ia-rt-stage ia-rt-stage--art" aria-hidden="true">
        <AppIcon path={icon} size={96} eager={eager} className="ia-rt-stage__icon" />
      </div>
    );
  }
  const s = ratingStrings[locale];
  const shown = paths.slice(0, MAX_SHOTS);
  return (
    <ShotScroller className="ia-rt-stage" trackClassName="ia-rt-stage__track" label={format(s.shotsLabel, { app })}>
      {shown.map((path, i) => (
        // A fixed list: the index keys it and keeps the long path out of the RSC payload.
        <Link key={i} className="ia-rt-stage__shot" href={`${href}#screenshots`} prefetch={false} tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element -- D15: CDN-sized <img>, no next/image */}
          <img
            className="ia-rt-shot"
            src={shotSrc(path, "stage")}
            width={STAGE_W}
            height={STAGE_H}
            alt={format(s.shotAlt, { app, n: i + 1, count: paths.length })}
            loading={eager && i < 3 ? undefined : "lazy"}
            decoding="async"
          />
        </Link>
      ))}
    </ShotScroller>
  );
}
