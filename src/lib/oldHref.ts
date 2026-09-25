// Client-safe URL helpers for the PREVIOUS ("old") site. No next/headers here:
// server pages, client components and scripts all import this file.
//
// Public URL shape (docs/site-v2/ARCHITECTURE.md §1, §3):
//   /<ru|en>/old/<path>  old page, noindex. The proxy rewrites it to the internal /<path>.
//   /<ru|en>/<path>      the same old page served IN PLACE when the new site has no
//                        equivalent (per-app pages, old topics, /tokens, /build/**, …),
//                        or the NEW site when it owns the URL (since 2026-09-24 also the
//                        whole /rating/**, /reviews/**, /mcp/** sections).
//
// Links in old code point at the URL that is canonical for the content (owner decision,
// audit A4 option A): a page served IN PLACE is linked at its original public URL, so the
// in-place pages keep their internal links and stay indexed; a page whose public URL the
// NEW site took over is linked as its /<L>/old/… copy, so the old site never links into the
// new one. oldHref() asks the proxy's own decision (src/site/routing/decide.ts — pure, tiny)
// which case a path is, so every link, redirect and client navigation in old code goes
// through oldHref() (or oldNavHref() for redirects). Never build "/<L>/…" or "/<L>/old/…"
// by hand: scripts/check-old-links.mjs rejects locale literals, `${lp}` templates and
// oldLp() prefixes, because they cannot see the path.
// Canonicals, hreflang, og:url, JSON-LD, sitemap, feed, llms, emails, OAuth, webhooks
// and MCP absolute URLs keep the original public URLs and do NOT use these helpers.

import { decideRoute, NEW_SECTIONS } from "@/site/routing/decide";

export const OLD_SEGMENT = "old";

/** The old site speaks only ru and en. */
export type OldLocale = "ru" | "en";

/** A locale string (`"ru" | "en" | …`) or the `ru` boolean that old code passes around. */
export type LocaleLike = string | boolean | null | undefined;

/** Mirrors the old convention `const ru = locale !== "en"`: only "en" / false is English. */
export function oldLocale(l: LocaleLike): OldLocale {
  return l === "en" || l === false ? "en" : "ru";
}

/**
 * The archive prefix "/ru/old" | "/en/old". Only for code that needs the prefix itself (the
 * helpers below, tests). Never build links from it — use oldHref(), which sees the path.
 */
export function oldLp(l: LocaleLike): string {
  return `/${oldLocale(l)}/${OLD_SEGMENT}`;
}

/** Splits "/x?q#h" into the pathname and the "?…#…" suffix; "", "?q", "x" and "/?q" all work. */
function splitPath(path: string): { pathname: string; suffix: string } {
  let p = path || "/";
  if (p.startsWith("/?") || p.startsWith("/#")) p = p.slice(1);
  if (p[0] !== "/" && p[0] !== "?" && p[0] !== "#") p = `/${p}`;
  const cut = p.search(/[?#]/);
  return cut === -1 ? { pathname: p, suffix: "" } : { pathname: p.slice(0, cut), suffix: p.slice(cut) };
}

/** True when the proxy serves `/<L><pathname>` as an old page at that URL (not the new site, no redirect). */
export function isServedInPlace(l: LocaleLike, pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  const d = decideRoute({ pathname: `/${oldLocale(l)}${pathname}` });
  return d.type === "rewrite" && d.site === "inplace";
}

/**
 * True for a path inside the web-only sections the new site took over whole (/rating/**,
 * /reviews/**, /mcp/**; NEW_SECTIONS in decide.ts). Old pages link them at the public URL:
 * they open in the new design from anywhere, the old copies stay reachable only by typing
 * /<L>/old/… (owner, 2026-09-24: «чтобы всё открывалось сразу в новом дизайне»).
 */
export function isMovedSection(pathname: string): boolean {
  return NEW_SECTIONS.has(pathname.split("/")[1] ?? "");
}

/**
 * Public URL of an old page, as a link from old code:
 *   oldHref("ru", "/tokens")        → "/ru/tokens"             (served in place: its own URL)
 *   oldHref("ru", "/segment/qr-scanner") → "/ru/segment/qr-scanner" (old topic, in place)
 *   oldHref("ru", "/reviews/x/1")   → "/ru/reviews/x/1"        (moved section: the new design)
 *   oldHref("ru", "/segment/habit-tracking") → "/ru/old/segment/habit-tracking" (new site owns it)
 *   oldHref("en", "/"), oldHref("en", "/ideas?cat=x") → "/en/old", "/en/old/ideas?cat=x"
 * `path` is the internal old path ("/", "/ideas?cat=x", "segment/x", "?q=1" all work).
 */
export function oldHref(l: LocaleLike, path: string = "/"): string {
  const base = oldLp(l);
  const { pathname, suffix } = splitPath(path);
  if (pathname === "/") return base + suffix;
  if (isServedInPlace(l, pathname) || isMovedSection(pathname)) return `/${oldLocale(l)}${pathname}${suffix}`;
  return base + pathname + suffix;
}

/**
 * Redirect target for an old page (catalog/categories/premium/v2 stubs, access gates, …).
 * `mode` is x-ia-site of the current request (getOldSiteMode() in src/lib/oldSite.server.ts):
 *   "old"  (inside the archive)   → oldHref(): stays in /<L>/old unless the target is in place;
 *   else   (served in place)      → the public URL, so a visitor who arrived at an indexed
 *                                   URL is never sent into the noindexed archive (the new
 *                                   site serves it when it owns the path).
 */
export function oldNavHref(mode: string | null | undefined, l: LocaleLike, path: string = "/"): string {
  if (mode === "old") return oldHref(l, path);
  const { pathname, suffix } = splitPath(path);
  return publicHref(l, pathname) + suffix;
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
 *   /ru/old/x → /en/old/x;  in-place /ru/reviews/x → /en/reviews/x;  internal "/x" → oldHref("en", "/x").
 * Query and hash are not carried over (same as before the move).
 */
export function switchOldLocale(pathname: string | null | undefined, next: LocaleLike): string {
  const { locale, old, rest } = splitOldPath(pathname);
  if (locale && !old) return `/${oldLocale(next)}${rest === "/" ? "" : rest}`;
  if (old) return rest === "/" ? oldLp(next) : `${oldLp(next)}${rest}`;
  return oldHref(next, rest);
}

/**
 * A public URL OUTSIDE /old: publicHref("ru") → "/ru", publicHref("en", "/segment") → "/en/segment".
 * The proxy serves it from the NEW site when the new site owns the path, else the old page in place.
 * Only for deliberate exits from the old site (header logo, OldSiteBanner) and, through
 * oldNavHref(), for redirects issued by in-place pages. Links to NEW pages cross root layouts,
 * so render them as plain <a>, not <Link>.
 */
export function publicHref(l: LocaleLike, path: string = "/"): string {
  const p = !path || path === "/" ? "" : path[0] === "/" ? path : `/${path}`;
  return `/${oldLocale(l)}${p}`;
}
