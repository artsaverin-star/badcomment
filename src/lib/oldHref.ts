// Client-safe URL helpers for the PREVIOUS ("old") site. No next/headers here:
// server pages, client components and scripts all import this file.
//
// Public URL shape (docs/site-v2/ARCHITECTURE.md §1, §3):
//   /<ru|en>/old/<path>  old page, noindex. The proxy rewrites it to the internal /<path>.
//   /<ru|en>/<path>      the same old page served IN PLACE when the new site has no
//                        equivalent (per-app pages, /reviews/**, /rating/**, /mcp, …),
//                        or the NEW site when it owns the URL.
//
// Navigation inside the old site always stays under /<L>/old/… (DECISIONS §8), so every
// link, redirect and client navigation in old code goes through oldHref()/oldLp().
// Canonicals, hreflang, og:url, JSON-LD, sitemap, feed, llms, emails, OAuth, webhooks
// and MCP absolute URLs keep the original public URLs and do NOT use these helpers.
// scripts/check-old-links.mjs guards this.

export const OLD_SEGMENT = "old";

/** The old site speaks only ru and en. */
export type OldLocale = "ru" | "en";

/** A locale string (`"ru" | "en" | …`) or the `ru` boolean that old code passes around. */
export type LocaleLike = string | boolean | null | undefined;

/** Mirrors the old convention `const ru = locale !== "en"`: only "en" / false is English. */
export function oldLocale(l: LocaleLike): OldLocale {
  return l === "en" || l === false ? "en" : "ru";
}

/** Old-site locale prefix: "/ru/old" | "/en/old". Replaces the old `ru ? "/ru" : "/en"`. */
export function oldLp(l: LocaleLike): string {
  return `/${oldLocale(l)}/${OLD_SEGMENT}`;
}

/**
 * Public URL of an old page: oldHref("ru", "/segment/x") → "/ru/old/segment/x".
 * `path` is the internal old path ("/", "/ideas?cat=x", "segment/x", "?q=1" all work).
 */
export function oldHref(l: LocaleLike, path: string = "/"): string {
  const base = oldLp(l);
  let p = path || "/";
  if (p.startsWith("/?") || p.startsWith("/#")) p = p.slice(1);
  if (p === "/") return base;
  if (p[0] === "?" || p[0] === "#") return base + p;
  return base + (p[0] === "/" ? p : `/${p}`);
}

export type OldPathParts = {
  /** Locale prefix of the public URL, or null for an internal path (SSR sees "/x"). */
  locale: OldLocale | null;
  /** True for the /<L>/old/… form. */
  old: boolean;
  /** Internal old path, always starting with "/". */
  rest: string;
};

/**
 * Splits any pathname an old component can see:
 *   "/ru/old/build" → { locale: "ru", old: true,  rest: "/build" }   (client, old site)
 *   "/ru/build"     → { locale: "ru", old: false, rest: "/build" }   (client, in place)
 *   "/build"        → { locale: null, old: false, rest: "/build" }   (SSR: rewritten internal path)
 */
export function splitOldPath(pathname: string | null | undefined): OldPathParts {
  const p = pathname || "/";
  const m = /^\/(ru|en)(?=\/|$)/.exec(p);
  if (!m) return { locale: null, old: false, rest: p };
  const locale = m[1] as OldLocale;
  const tail = p.slice(m[0].length) || "/";
  const o = /^\/old(?=\/|$)/.exec(tail);
  if (o) return { locale, old: true, rest: tail.slice(o[0].length) || "/" };
  return { locale, old: false, rest: tail };
}

/** The old internal path of any pathname form (for active-state matching). */
export function oldRestPath(pathname: string | null | undefined): string {
  return splitOldPath(pathname).rest;
}

/** True when the browser is inside the hidden old site (/<L>/old/…). */
export function isOldPublicPath(pathname: string | null | undefined): boolean {
  return splitOldPath(pathname).old;
}

/**
 * The same old page in another locale, for the language switchers:
 *   /ru/old/x → /en/old/x;  in-place /ru/reviews/x → /en/reviews/x;  internal "/x" → /en/old/x.
 * Query and hash are not carried over (same as before the move).
 */
export function switchOldLocale(pathname: string | null | undefined, next: LocaleLike): string {
  const { locale, old, rest } = splitOldPath(pathname);
  if (locale && !old) return `/${oldLocale(next)}${rest === "/" ? "" : rest}`;
  return oldHref(next, rest);
}

/**
 * A public URL OUTSIDE /old: publicHref("ru") → "/ru", publicHref("en", "/segment") → "/en/segment".
 * The proxy serves it from the NEW site when the new site owns the path, else the old page in place.
 * Only for deliberate exits from the old site (header logo, OldSiteBanner) and for permanent
 * redirects issued by in-place pages. Links to NEW pages cross root layouts, so render them as
 * plain <a>, not <Link>.
 */
export function publicHref(l: LocaleLike, path: string = "/"): string {
  const p = !path || path === "/" ? "" : path[0] === "/" ? path : `/${path}`;
  return `/${oldLocale(l)}${p}`;
}
