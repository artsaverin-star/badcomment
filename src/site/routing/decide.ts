// The routing decision behind src/proxy.ts (docs/site-v2/ARCHITECTURE.md §1 + §3).
//
// Pure and dependency-light on purpose: no Next.js imports, so the proxy stays tiny and
// scripts/v2/test-routing.ts can exercise every rule with plain objects. The proxy only
// translates the returned decision into NextResponse.redirect / NextResponse.rewrite.
//
// Public URL map (summary; the table in ARCHITECTURE §1 is the source of truth):
//   /                              307 → /<negotiated>/segment
//   /<L>                           308 → /<L>/segment
//   /<L>/segment[/<launch slug>]   the research catalog / topic
//   /<L>/segment/<launch slug>/v2  308 → /<L>/segment/<launch slug> (retired experiment URL)
//   /<L>/research[/…], /<L>/search 308 → /<L>/segment[/…] (query kept)
//   /<L>/ideas[/<launch id>]       the ideas catalog / idea
//   /<L>/{saved,settings,plus,welcome,login,library,contacts,offer,privacy,site}/…  site pages
//   /<L>/app-auth                  noindex (iOS app sign-in hand-off, docs/site-v2/APP-ACCOUNTS.md);
//                                  it and /<L>/login?app=1 get x-ia-app-flow: 1 (no analytics)
//   /<L>/{pulse,rating,reviews,mcp}/…  site pages in all five locales
//   /<L>/admin[/posts]             the owner's admin (internal /admin, its own root layout), noindex
//   retired old site               301 → the closest page (legacyTarget below: old topics → their
//                                  rating, per-app pages → the app's rating card, /tokens → /plus, …)
//   /<L>/old[/<rest>], /old/…      301 → where /<L>/<rest> is now (the archive is gone)
//   /<L>/<anything else>           the site's 404 (rewrite /site/<L>/<rest>, the [...missing] page)
//   /<bare path>                   307 → /<negotiated>/<path>, or straight to where that URL
//                                  redirects (one hop, e.g. /tokens → /<L>/plus)
// The locale cookie: pages write <L>; redirects and 404s never write it.
// `site` is owned by the new site so no public URL can reach the internal /site/<L>/… tree
// through another rewrite: /<L>/site/… lands on the site's 404.
//
// The old site (src/app/(old), a second design served at the same URLs and archived under
// /<ru|en>/old) was retired on 2026-09-27 (owner: «удалим старую версию сайта и всё, что там
// есть»). Its URLs stay answered with permanent redirects so their search traffic and links
// carry over; nothing renders the old design any more.

import { isLaunchCategory, isLaunchIdea } from "../manifest.generated";
import {
  isLocale,
  isOldLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  negotiateLocale,
  type Locale,
} from "../i18n/locales";
import { LEGACY_APPS, LEGACY_RATING_TOPICS, LEGACY_TOPICS } from "./legacy.generated";

/** Internal folder of the new site: src/app/(site)/site/[lang]/… */
export const SITE_INTERNAL_PREFIX = "/site";
/** Public segment of the retired old-site archive (/<ru|en>/old/…): 301 to the live page. */
export const OLD_SEGMENT = "old";

/**
 * Service pages outside the site's design, served at their internal path with their own root
 * layout: the owner's admin (src/app/(admin)/admin). Never indexed.
 */
export const SERVICE_TOP: ReadonlySet<string> = new Set(["admin"]);

/** First segments after the locale that always belong to the site (besides "", segment*, ideas*). */
export const NEW_TOP_STATIC: ReadonlySet<string> = new Set([
  "pulse",
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
  // The web-only sections: the rating, the review archive, the MCP server page.
  "rating",
  "reviews",
  "mcp",
]);

/** Site pages that must never be indexed, whatever their own metadata says (e.g. a redirect). */
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
export const PROXY_REQUEST_HEADERS = ["x-locale", "x-ia-public-path", "x-ia-app-flow"] as const;

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
  /** 301: a retired old-site URL (permanent); 308: an alias; 307: depends on the visitor's locale. */
  status: 301 | 307 | 308;
  /** Path + query, always starting with "/". */
  location: string;
};

export type RewriteDecision = {
  type: "rewrite";
  /** site = a page of the site (or its 404); service = the admin, outside the site's design. */
  site: "site" | "service";
  locale: Locale;
  /** Internal pathname to render. */
  pathname: string;
  /** Query string carried over unchanged ("" or "?…"). */
  search: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  cookies: CookieToSet[];
  /** No page is known for the URL: the site's catch-all answers 404. */
  missing?: true;
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

function redirect(status: 301 | 307 | 308, pathname: string, search: string): RedirectDecision {
  return { type: "redirect", status, location: pathname + search };
}

// ---------------------------------------------------------------------------------------------
// The retired old site: every URL it served → the closest live page (301)
// ---------------------------------------------------------------------------------------------

/** An old topic's rating (/<L>/rating/<topic>), or the whole rating when the topic has none. */
function topicRating(l: Locale, topic: string): string {
  return LEGACY_RATING_TOPICS.has(topic) ? path(l, "rating", topic) : path(l, "rating");
}

/** The live page of an old topic: its breakdown (the 35 launch topics), else its rating. */
function topicHome(l: Locale, topic: string): string {
  return isLaunchCategory(topic) ? path(l, "segment", topic) : topicRating(l, topic);
}

/** The topic of an old idea id ("<topic>-<n>"), or null. */
function ideaTopic(id: string): string | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)-\d+$/.exec(id);
  return m && LEGACY_TOPICS.has(m[1]) ? m[1] : null;
}

const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Public path of the live page that replaces a URL of the retired old site, or null when the
 * URL was not an old-site page. `tail` = the segments after the locale. Launch topics, launch
 * ideas and the site's own sections never get here (decideLocalized serves them first).
 *
 *   /segment/<old topic>[/v2]         → /rating/<topic> (all 37 have a rating; astrology → /rating)
 *   /ideas/top                        → /ideas
 *   /ideas/<old id>                   → the idea's topic: /segment/<launch topic> or its rating
 *   /build                            → /ideas;  /build/<topic>[/<idea>] → the topic (as above)
 *   /best                             → /rating; /best/<topic> → /rating/<topic>
 *   /cards → /ideas · /most-wanted → /pulse · /apps → /rating · /catalog, /categories → /segment
 *   /tokens, /premium                 → /plus
 *   /<app slug>[/test]                → the app's card in the rating, else its topic's rating
 */
export function legacyTarget(l: Locale, tail: readonly string[]): string | null {
  const [a = "", b, c] = tail;
  const n = tail.length;
  switch (a) {
    case "segment":
      if (b && !isLaunchCategory(b) && LEGACY_TOPICS.has(b) && (n === 2 || (n === 3 && c === "v2"))) return topicRating(l, b);
      return null;
    case "ideas":
      if (n !== 2 || !b) return null;
      if (b === "top") return path(l, "ideas");
      return ideaTopic(b) ? topicHome(l, ideaTopic(b)!) : null;
    case "build":
      if (n === 1) return path(l, "ideas");
      return b && LEGACY_TOPICS.has(b) && n <= 3 ? topicHome(l, b) : null;
    case "best":
      if (n === 1) return path(l, "rating");
      return b && LEGACY_TOPICS.has(b) && n === 2 ? topicRating(l, b) : null;
    case "cards":
      return n === 1 ? path(l, "ideas") : null;
    case "most-wanted":
      return n === 1 ? path(l, "pulse") : null;
    case "apps":
      return n === 1 ? path(l, "rating") : null;
    case "catalog":
    case "categories":
      return n === 1 ? path(l, "segment") : null;
    case "tokens":
    case "premium":
      return n === 1 ? path(l, "plus") : null;
  }
  // The per-app landing pages (/<app slug>) and their experiment (/<app slug>/test).
  if ((n === 1 || (n === 2 && b === "test")) && hasOwn(LEGACY_APPS, a)) {
    const target = LEGACY_APPS[a];
    return target ? path(l, "rating", ...target.split("/")) : path(l, "rating");
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------------------------

type Ctx = {
  pathname: string;
  search: string;
  cookieLocale: string | null;
};

function localeCookie(ctx: Ctx, l: Locale): CookieToSet[] {
  if (ctx.cookieLocale === l) return [];
  return [{ name: LOCALE_COOKIE, value: l, path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" }];
}

function rewriteSite(
  ctx: Ctx,
  l: Locale,
  tail: readonly string[],
  opts: { noindex?: boolean; appFlow?: boolean; missing?: boolean } = {},
): RewriteDecision {
  return {
    type: "rewrite",
    site: "site",
    locale: l,
    pathname: path(SITE_INTERNAL_PREFIX.slice(1), l, ...tail),
    search: ctx.search,
    requestHeaders: {
      "x-locale": l,
      "x-ia-public-path": ctx.pathname,
      ...(opts.appFlow ? { "x-ia-app-flow": "1" } : {}),
    },
    responseHeaders: opts.noindex ? { "X-Robots-Tag": "noindex, follow" } : {},
    // A 404 does not change the visitor's language.
    cookies: opts.missing ? [] : localeCookie(ctx, l),
    ...(opts.missing ? { missing: true as const } : {}),
  };
}

/** The admin: its internal path (/admin/…), its own root layout, never indexed or cached. */
function rewriteService(ctx: Ctx, l: Locale, tail: readonly string[]): RewriteDecision {
  return {
    type: "rewrite",
    site: "service",
    locale: l,
    pathname: path(...tail),
    search: ctx.search,
    requestHeaders: { "x-locale": isOldLocale(l) ? l : "en", "x-ia-public-path": ctx.pathname },
    responseHeaders: { "X-Robots-Tag": "noindex, nofollow" },
    cookies: [],
  };
}

/**
 * /<L>/old[/<rest>] — the retired archive: 301 to where /<L>/<rest> is now (its redirect target,
 * or the page itself). A URL with no page there stays a 404 instead of redirecting to one.
 */
function decideOldArchive(ctx: Ctx, l: Locale, rest: readonly string[]): RoutingDecision {
  const live = decideLocalized(ctx, l, rest);
  if (live.type === "redirect") return { ...live, status: 301 };
  if (live.missing || live.site === "service") return rewriteSite(ctx, l, [OLD_SEGMENT, ...rest], { missing: true });
  return redirect(301, path(l, ...rest), ctx.search);
}

function decideLocalized(ctx: Ctx, l: Locale, tail: readonly string[]): RoutingDecision {
  const [a = "", b] = tail;

  if (a === "") return redirect(308, path(l, "segment"), ctx.search);
  if (a === OLD_SEGMENT) return decideOldArchive(ctx, l, tail.slice(1));

  // Aliases (old JSON-LD SearchAction target, earlier spec drafts).
  if (a === "research") return redirect(308, path(l, "segment", ...tail.slice(1)), ctx.search);
  if (a === "search") return redirect(308, path(l, "segment"), ctx.search);

  if (a === "segment") {
    // The old "/segment/<slug>/v2" experiment URL: its design became the topic page.
    if (b !== undefined && tail.length === 3 && tail[2] === "v2" && isLaunchCategory(b)) {
      return redirect(308, path(l, "segment", b), ctx.search);
    }
    if (b === undefined || isLaunchCategory(b)) return rewriteSite(ctx, l, tail);
  }

  if (a === "ideas" && (b === undefined || (b !== "top" && isLaunchIdea(b)))) return rewriteSite(ctx, l, tail);

  // The internal folder's name is reserved: /<L>/site/… never has a page (the site's 404).
  if (a === SITE_INTERNAL_PREFIX.slice(1)) return rewriteSite(ctx, l, tail, { missing: true });

  if (NEW_TOP_STATIC.has(a)) {
    return rewriteSite(ctx, l, tail, { noindex: NEW_TOP_NOINDEX.has(a), appFlow: isAppFlow(a, ctx.search) });
  }

  if (SERVICE_TOP.has(a)) return rewriteService(ctx, l, tail);

  const legacy = legacyTarget(l, tail);
  if (legacy) return redirect(301, legacy, ctx.search);

  // Nothing lives here: the site's catch-all ([...missing]) renders its 404 in the URL's locale.
  return rewriteSite(ctx, l, tail, { missing: true });
}

/**
 * Locale of the global 404 (src/app/global-not-found.tsx) for a URL no route matched.
 * `publicPath` is x-ia-public-path from the proxy: its locale wins (spec 09 §2.2). Requests the
 * proxy never sees (paths with a dot, /api/…) have no public path: negotiated like "/".
 */
export function notFoundLocale(input: {
  publicPath?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const first = (input.publicPath ?? "").split("/").filter(Boolean)[0];
  if (isLocale(first)) return first;
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

  // "/" → the negotiated research catalog in one hop.
  if (segs.length === 0) return redirect(307, path(negotiated(), "segment"), ctx.search);

  const [first, second] = segs;

  // The retired archive's convenience entry points: /old/<L>/<rest> (301, the locale is in the
  // URL) and /old[/<rest>] (307, the locale is the visitor's), straight to the live page.
  if (first === OLD_SEGMENT) {
    if (isLocale(second)) return decideOldArchive(ctx, second, segs.slice(2));
    const live = decideOldArchive(ctx, negotiated(), segs.slice(1));
    return live.type === "redirect" ? { ...live, status: 307 } : live;
  }

  // Bare path: add the negotiated locale. When the localized URL would redirect again
  // (a retired old-site URL, an alias, …) go to that final target in one hop. Always 307: the
  // target depends on the visitor's cookie / Accept-Language.
  if (!isLocale(first)) {
    const l = negotiated();
    const next = decideLocalized(ctx, l, segs);
    return next.type === "redirect" ? { ...next, status: 307 } : redirect(307, path(l, ...segs), ctx.search);
  }

  return decideLocalized(ctx, first, segs.slice(1));
}
