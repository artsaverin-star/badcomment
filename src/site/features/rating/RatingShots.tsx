import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { shotSrc } from "./media";
import { ratingStrings } from "./strings";

// The first 3 screenshots of an app in a row card (spec 11 §3.4 `RatingShots`). Server.
//
//   <RatingShots paths={app.shots} href={appHref} app={app.short} locale={L} />
//
// One link to the app page's gallery (`#screenshots`) holding 3 <img>: a sibling of the card's
// stretched title link, above its overlay (rating.css), out of the tab order and hidden from
// assistive tech — the title is the row's only tab stop and its name (RR9). The alts stay: they
// are the image-search text («Hevy: скриншот 1 из 10»). Never scrolls. ≥ 600 px of list width:
// 3 × 102×221 in the card's right column; narrower: 3 equal columns under the head.

/** Displayed row shot at ≥ 600 px (the 440 request is its 2×); narrower rows scale it by width. */
const ROW_W = 102;
const ROW_H = 221;

export function RatingShots({
  paths,
  href,
  app,
  locale,
  eager = false,
}: {
  /** Every screenshot of the app (the count goes into the alt); the first 3 are shown. */
  paths: readonly string[];
  /** The app page (routes.ratingApp); the strip links to its #screenshots. */
  href: string;
  /** The short display name (alt text). */
  app: string;
  locale: Locale;
  eager?: boolean;
}) {
  if (paths.length === 0) return null;
  const s = ratingStrings[locale];
  return (
    <Link className="ia-rt-shots" href={`${href}#screenshots`} prefetch={false} tabIndex={-1} aria-hidden="true">
      {paths.slice(0, 3).map((path, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- D15: CDN-sized <img>, no next/image
        <img
          // A fixed list: the index keys it and keeps the long path out of the RSC payload.
          key={i}
          className="ia-rt-shot"
          src={shotSrc(path, "row")}
          width={ROW_W}
          height={ROW_H}
          alt={format(s.shotAlt, { app, n: i + 1, count: paths.length })}
          loading={eager ? undefined : "lazy"}
          decoding="async"
        />
      ))}
    </Link>
  );
}
