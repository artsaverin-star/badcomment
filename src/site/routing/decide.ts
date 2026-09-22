// The routing decision behind src/proxy.ts (docs/site-v2/ARCHITECTURE.md §1 + §3).
//
// Pure and dependency-light on purpose: no Next.js imports, so the proxy stays tiny and
// scripts/v2/test-routing.ts can exercise every rule with plain objects. The proxy only
// translates the returned decision into NextResponse.redirect / NextResponse.rewrite.
//
// Public URL map (summary; the table in ARCHITECTURE §1 is the source of truth):
//   /                              307 → /<negotiated>
//   /<L>                           NEW home                         (rewrite /site/<L>)
//   /<L>/segment[/<launch slug>]   NEW; other slugs → OLD in place (+ x-ia-soon), de/fr/ja → 307 /en/…
//   /<L>/research[/…], /<L>/search 308 → /<L>/segment[/…] (query kept)
//   /<L>/ideas[/<launch id>]       NEW; other ids and /ideas/top → OLD in place
//   /<L>/{saved,settings,plus,welcome,login,library,contacts,offer,privacy,site}/…  NEW
//   /<L>/old[/<rest>]              OLD (internal /<rest>), noindex; de/fr/ja → 307 /en/old/…
//   /old[/<rest>], /old/<ru|en>/…  307 → /<ru|en>/old/<rest>
//   /<L>/<anything else>           OLD in place (internal /<rest>); de/fr/ja → 307 /en/<rest>
//   /<bare path>                   307 → /<negotiated>/<path>, then evaluated again
// `site` is owned by the new site so no public URL can reach the internal /site/<L>/… tree
// through an old rewrite: /<L>/site/… and /<L>/old/site/… land on the new site's 404.

import { isLaunchCategory, isLaunchIdea } from "../manifest.generated";
import {
  isLocale,
  isOldLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  negotiateLocale,
  toOldLocale,
  type Locale,
  type OldLocale,
} from "../i18n/locales";

/** Internal folder of the new site: src/app/(site)/site/[lang]/… */
export const SITE_INTERNAL_PREFIX = "/site";
/** Public segment of the old site: /<ru|en>/old/… */
export const OLD_SEGMENT = "old";

/** First segments after the locale that always belong to the new site (besides "", segment*, ideas*). */
export const NEW_TOP_STATIC: ReadonlySet<string> = new Set([
  "saved",
  "settings",
  "plus",
  "welcome",
  "login",
  "library",
  "contacts",
  "offer",
  "privacy",
  "site",
]);

/** Request headers the proxy owns. Incoming copies are dropped before the proxy sets its own. */
export const PROXY_REQUEST_HEADERS = [
  "x-locale",
  "x-ia-site",
  "x-ia-public-path",
  "x-ia-new-path",
  "x-ia-soon",
] as const;

export type RoutingInput = {
  /** URL pathname as received (no query). */
  pathname: string;
  /** "" or "?a=b" (a leading "?" is added when missing). */
  search?: string;
  cookies?: { locale?: string | null };
  acceptLanguage?: string | null;
};

export type CookieToSet = {
  name: string;
  value: string;
  path: "/";
  maxAge: number;
  sameSite: "lax";
};

export type RedirectDecision = {
  type: "redirect";
  status: 307 | 308;
  /** Path + query, always starting with "/". */
  location: string;
};

export type RewriteDecision = {
  type: "rewrite";
  /** new = the new site; old = /<L>/old/…; inplace = an old page at its original URL. */
  site: "new" | "old" | "inplace";
  locale: Locale;
  /** Internal pathname to render. */
  pathname: string;
  /** Query string carried over unchanged ("" or "?…"). */
  search: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  cookies: CookieToSet[];
};

export type RoutingDecision = RedirectDecision | RewriteDecision;

function normalizeSearch(search: string | undefined): string {
  if (!search || search === "?") return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function path(...parts: string[]): string {
  const clean = parts.filter((p) => p !== "");
  return clean.length ? `/${clean.join("/")}` : "/";
}

function redirect(status: 307 | 308, pathname: string, search: string): RedirectDecision {
  return { type: "redirect", status, location: pathname + search };
}

/**
 * Public URL of the new-site page equivalent to an old internal path, or null.
 * `segs` are the old internal segments (e.g. ["segment", "habit-tracking"]).
 */
export function newSiteEquivalent(l: Locale, segs: readonly string[]): string | null {
  const [a = "", b, ...more] = segs;
  if (more.length) return null;
  if (a === "") return `/${l}`;
  if (a === "segment" || a === "research") {
    if (b === undefined) return `/${l}/segment`;
    return isLaunchCategory(b) ? `/${l}/segment/${b}` : null;
  }
  if (a === "search") return b === undefined ? `/${l}/segment` : null;
  if (a === "ideas") {
    if (b === undefined) return `/${l}/ideas`;
    return b !== "top" && isLaunchIdea(b) ? `/${l}/ideas/${b}` : null;
  }
  if (a === "settings" && b === "about") return `/${l}/settings/about`;
  if (a !== "site" && NEW_TOP_STATIC.has(a) && b === undefined) return `/${l}/${a}`;
  return null;
}

type Ctx = {
  pathname: string;
  search: string;
  cookieLocale: string | null;
};

function localeCookie(ctx: Ctx, l: Locale): CookieToSet[] {
  if (ctx.cookieLocale === l) return [];
  return [{ name: LOCALE_COOKIE, value: l, path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" }];
}

function rewriteNew(ctx: Ctx, l: Locale, tail: readonly string[], opts: { setCookie?: boolean; noindex?: boolean } = {}): RewriteDecision {
  const setCookie = opts.setCookie ?? true;
  return {
    type: "rewrite",
    site: "new",
    locale: l,
    pathname: path(SITE_INTERNAL_PREFIX.slice(1), l, ...tail),
    search: ctx.search,
    requestHeaders: {
      "x-locale": l,
      "x-ia-site": "new",
      "x-ia-public-path": ctx.pathname,
    },
    responseHeaders: opts.noindex ? { "X-Robots-Tag": "noindex, follow" } : {},
    cookies: setCookie ? localeCookie(ctx, l) : [],
  };
}

function rewriteOld(ctx: Ctx, l: OldLocale, rest: readonly string[], site: "old" | "inplace", soon: boolean): RewriteDecision {
  const requestHeaders: Record<string, string> = {
    "x-locale": l,
    "x-ia-site": site,
    "x-ia-public-path": ctx.pathname,
    "x-ia-new-path": newSiteEquivalent(l, rest) ?? `/${l}`,
  };
  if (soon) requestHeaders["x-ia-soon"] = "1";
  return {
    type: "rewrite",
    site,
    locale: l,
    pathname: path(...rest),
    search: ctx.search,
    requestHeaders,
    // The archive is hidden from search engines; in-place pages keep their indexing.
    responseHeaders: site === "old" ? { "X-Robots-Tag": "noindex, follow" } : {},
    // /<L>/old/** never writes the cookie (it would overwrite a de/fr/ja choice made on the
    // new site); in-place pages do, like the old proxy did.
    cookies: site === "inplace" ? localeCookie(ctx, l) : [],
  };
}

/** An old page served at its original URL; de/fr/ja have no old version → the English one. */
function inPlace(ctx: Ctx, l: Locale, tail: readonly string[], soon = false): RoutingDecision {
  if (!isOldLocale(l)) return redirect(307, path("en", ...tail), ctx.search);
  return rewriteOld(ctx, l, tail, "inplace", soon);
}

function decideOldArchive(ctx: Ctx, l: Locale, rest: readonly string[]): RoutingDecision {
  if (!isOldLocale(l)) return redirect(307, path("en", OLD_SEGMENT, ...rest), ctx.search);
  // Never let the old rewrite expose the new site's internal tree: /ru/old/site/… → new 404.
  if (rest[0] === SITE_INTERNAL_PREFIX.slice(1)) {
    return rewriteNew(ctx, l, [OLD_SEGMENT, ...rest], { setCookie: false, noindex: true });
  }
  return rewriteOld(ctx, l, rest, "old", false);
}

function decideLocalized(ctx: Ctx, l: Locale, tail: readonly string[]): RoutingDecision {
  const [a = "", b] = tail;

  if (a === "") return rewriteNew(ctx, l, []);
  if (a === OLD_SEGMENT) return decideOldArchive(ctx, l, tail.slice(1));

  // Aliases (old JSON-LD SearchAction target, earlier spec drafts).
  if (a === "research") return redirect(308, path(l, "segment", ...tail.slice(1)), ctx.search);
  if (a === "search") return redirect(308, path(l, "segment"), ctx.search);

  if (a === "segment") {
    if (b === undefined || isLaunchCategory(b)) return rewriteNew(ctx, l, tail);
    // A topic that is not in the launch edition keeps its previous analysis in place.
    return inPlace(ctx, l, tail, tail.length === 2);
  }

  if (a === "ideas") {
    if (b === undefined || (b !== "top" && isLaunchIdea(b))) return rewriteNew(ctx, l, tail);
    return inPlace(ctx, l, tail);
  }

  if (NEW_TOP_STATIC.has(a)) return rewriteNew(ctx, l, tail);

  return inPlace(ctx, l, tail);
}

/** The single routing decision for a public request. */
export function decideRoute(input: RoutingInput): RoutingDecision {
  const ctx: Ctx = {
    pathname: input.pathname || "/",
    search: normalizeSearch(input.search),
    cookieLocale: input.cookies?.locale ?? null,
  };
  const segs = ctx.pathname.split("/").filter(Boolean);
  const negotiated = () =>
    negotiateLocale({ cookie: ctx.cookieLocale, acceptLanguage: input.acceptLanguage });

  // "/" → the negotiated locale home.
  if (segs.length === 0) return redirect(307, path(negotiated()), ctx.search);

  const [first, second] = segs;

  // Convenience entry points into the archive: /old, /old/<rest>, /old/<ru|en>/<rest>.
  if (first === OLD_SEGMENT) {
    if (isOldLocale(second)) return redirect(307, path(second, OLD_SEGMENT, ...segs.slice(2)), ctx.search);
    if (isLocale(second)) return redirect(307, path("en", OLD_SEGMENT, ...segs.slice(2)), ctx.search);
    return redirect(307, path(toOldLocale(negotiated()), OLD_SEGMENT, ...segs.slice(1)), ctx.search);
  }

  // Bare path: add a locale, then the next request is evaluated again.
  if (!isLocale(first)) return redirect(307, path(negotiated(), ...segs), ctx.search);

  return decideLocalized(ctx, first, segs.slice(1));
}
