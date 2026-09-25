// App Store artwork of the rating (spec 11 §3.1, D1, D15): icons and screenshots hotlinked from
// Apple's CDN in CDN-sized WebP, as plain <img> tags in the server HTML. Pure and client-safe.
//
// The data stores compact paths (content/v2/<L>/rating, spec §8.1): the part of an mzstatic URL
// between `https://is1-ssl.mzstatic.com/image/thumb/` and the last `/`, e.g.
//   Purple211/v4/e5/5e/07/e55e071a-…/AppIcon-0-0-1x_U007emarketing-0-7-0-sRGB-85-220.png
// Any size variant is that path plus `/<w>x<h>bb.<ext>` (verified 2026-09-25; `.avif` → 400).
//
//   iconSrc(path, 56)          …/128x128bb.webp    one src at ~2× the displayed size, no srcset
//   shotSrc(path, "row")       …/9999x440bb.webp   height-bound: 203×440 for an iPhone shot
//   iconLd(path) / shotLd(p)   512 px JPEG / 600 px wide JPEG for JSON-LD and image sitemaps

/** Every rating page calls preconnect(MZ_ORIGIN) (react-dom) at the top of its render. */
export const MZ_ORIGIN = "https://is1-ssl.mzstatic.com";

const BASE = `${MZ_ORIGIN}/image/thumb/`;

/** Displayed icon px → requested square: ≤ 40 → 80, ≤ 64 → 128, else 192 (3 URLs per icon: CDN hit rate). */
export function iconSrc(path: string, cssPx: number): string {
  const s = cssPx <= 40 ? 80 : cssPx <= 64 ? 128 : 192;
  return `${BASE}${path}/${s}x${s}bb.webp`;
}

/** Requested screenshot heights (2× the displayed box) per place. */
export const SHOT_H = { row: 440, stage: 520, gallery: 720, viewer: 1400 } as const;

export type ShotKind = keyof typeof SHOT_H;

export function shotSrc(path: string, kind: ShotKind): string {
  return `${BASE}${path}/9999x${SHOT_H[kind]}bb.webp`;
}

/** The 512 px JPEG icon (JSON-LD `image`, image sitemap). */
export function iconLd(path: string): string {
  return `${BASE}${path}/512x512bb.jpg`;
}

/** A 600 px wide JPEG screenshot (JSON-LD `screenshot`, image sitemap). */
export function shotLd(path: string): string {
  return `${BASE}${path}/600x0w.jpg`;
}

/** Displayed shot box: width = round(h × 6 / 13) — every sampled shot is iPhone portrait. */
export const SHOT_RATIO = 6 / 13;
