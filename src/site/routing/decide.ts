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
//   /<L>/segment/<launch slug>/v2  308 → /<L>/segment/<launch slug> (retired experiment URL)
//   /<L>/research[/…], /<L>/search 308 → /<L>/segment[/…] (query kept)
//   /<L>/ideas[/<launch id>]       NEW; other ids and /ideas/top → OLD in place
//   /<L>/{saved,settings,plus,welcome,login,library,contacts,offer,privacy,site}/…  NEW
//   /<L>/app-auth                  NEW, noindex (iOS app sign-in hand-off, docs/site-v2/APP-ACCOUNTS.md);
//                                  it and /<L>/login?app=1 get x-ia-app-flow: 1 (no analytics)
//   /<L>/old[/<rest>]              OLD (internal /<rest>), noindex; de/fr/ja → 307 /en/old/…
//   /old[/<rest>], /old/<ru|en>/…  307 → /<ru|en>/old/<rest>
//   /<L>/<anything else>           OLD in place (internal /<rest>); de/fr/ja → 307 /en/<rest>
//   /<bare path>                   307 → /<negotiated>/<path>, or straight to where that URL
//                                  redirects (one hop, e.g. /segment/<old topic> for de → /en/…)
// The locale cookie: NEW pages write <L>; in-place OLD pages write ru/en unless the cookie
// already holds de/fr/ja; /<L>/old/** and redirects never write it.
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
  // The iOS app's sign-in hand-off (mints a one-time code → inapp://auth?code=…); noindex.
  "app-auth",
]);

/** New-site pages that must never be indexed, whatever their own metadata says (e.g. a redirect). */
const NEW_TOP_NOINDEX: ReadonlySet<string> = new Set(["app-auth"]);

/**
 * Pages of the iOS app's sign-in sheet (docs/site-v2/APP-ACCOUNTS.md): /<L>/app-auth and
 * /<L>/login?app=1. They get the request header `x-ia-app-flow: 1`, and the root layout then
 * loads no analytics there (the app's privacy answers declare no web analytics).
 */
function isAppFlow(first: string, search: string): boolean {
  if (first === "app-auth") return true;
  return first === "login" && new URLSearchParams(search).get("app") === "1";
}

/** Request headers the proxy owns. Incoming copies are dropped before the proxy sets its own. */
export const PROXY_REQUEST_HEADERS = [
  "x-locale",
  "x-ia-site",
  "x-ia-public-path",
  "x-ia-new-path",
  "x-ia-soon",
  "x-ia-app-flow",
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
  if (a === "offer" && b === "payment") return `/${l}/offer/payment`;
  if (a !== "site" && !NEW_TOP_NOINDEX.has(a) && NEW_TOP_STATIC.has(a) && b === undefined) return `/${l}/${a}`;
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

/**
 * The cookie an in-place old page may write: ru/en like the old proxy did, but never over a
 * de/fr/ja choice. Those visitors only land on /en/<old page> because the old site has no
 * German/French/Japanese version (new topic pages link to per-app pages), and "/" must keep
 * sending them to their own locale.
 */
function inPlaceCookie(ctx: Ctx, l: OldLocale): CookieToSet[] {
  const c = ctx.cookieLocale;
  if (isLocale(c) && !isOldLocale(c)) return [];
  return localeCookie(ctx, l);
}

function rewriteNew(
  ctx: Ctx,
  l: Locale,
  tail: readonly string[],
  opts: { setCookie?: boolean; noindex?: boolean; appFlow?: boolean } = {},
): RewriteDecision {
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
      ...(opts.appFlow ? { "x-ia-app-flow": "1" } : {}),
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
    // new site); in-place pages write ru/en like the old proxy did, except over de/fr/ja.
    cookies: site === "inplace" ? inPlaceCookie(ctx, l) : [],
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
    // The old "/segment/<slug>/v2" experiment URL: its design became the topic page. A launch
    // topic's v2 has no page on the new site, so it goes straight to the topic (other topics
    // reach the old v2 stub in place, which redirects to the old topic page).
    if (b !== undefined && tail.length === 3 && tail[2] === "v2" && isLaunchCategory(b)) {
      return redirect(308, path(l, "segment", b), ctx.search);
    }
    if (b === undefined || isLaunchCategory(b)) return rewriteNew(ctx, l, tail);
    // A topic that is not in the launch edition keeps its previous analysis in place.
    return inPlace(ctx, l, tail, tail.length === 2);
  }

  if (a === "ideas") {
    if (b === undefined || (b !== "top" && isLaunchIdea(b))) return rewriteNew(ctx, l, tail);
    return inPlace(ctx, l, tail);
  }

  if (NEW_TOP_STATIC.has(a)) {
    return rewriteNew(ctx, l, tail, { noindex: NEW_TOP_NOINDEX.has(a), appFlow: isAppFlow(a, ctx.search) });
  }

  return inPlace(ctx, l, tail);
}

/**
 * Locale of the global 404 (src/app/global-not-found.tsx) for a URL no route matched.
 * `publicPath` is x-ia-public-path from the proxy: its locale wins (spec 09 §2.2), except that
 * a de/fr/ja `locale` cookie beats "en" — the old site has no de/fr/ja pages, so those visitors
 * were redirected to /en/… before the path turned out not to exist. Requests the proxy never
 * sees (paths with a dot, /api/…) have no public path: negotiated like "/".
 */
export function notFoundLocale(input: {
  publicPath?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const first = (input.publicPath ?? "").split("/").filter(Boolean)[0];
  if (isLocale(first)) {
    if (first === "en" && isLocale(input.cookie) && !isOldLocale(input.cookie)) return input.cookie;
    return first;
  }
  return negotiateLocale({ cookie: input.cookie, acceptLanguage: input.acceptLanguage });
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

  // Bare path: add the negotiated locale. When the localized URL would redirect again
  // (/segment/<old topic> for de/fr/ja → /en/…, aliases, …) go to that final target in one
  // hop. Always 307: the target depends on the visitor's cookie / Accept-Language.
  if (!isLocale(first)) {
    const l = negotiated();
    const next = decideLocalized(ctx, l, segs);
    return next.type === "redirect" ? { ...next, status: 307 } : redirect(307, path(l, ...segs), ctx.search);
  }

  return decideLocalized(ctx, first, segs.slice(1));
}
