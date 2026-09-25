// Public URLs of the NEW site (ARCHITECTURE §1). Client-safe and pure.
// Never hand-build "/ru/…" strings in features — use these helpers so a route rename is one edit.
//
//   routes.topic("ru", "habit-tracking")        → "/ru/segment/habit-tracking"
//   routes.ideas("en", { q: "sleep" })           → "/en/ideas?q=sleep"
//   href("de", "settings", "about")              → "/de/settings/about"
//   switchLocaleHref("/ru/segment/x?q=a", "ja")  → "/ja/segment/x?q=a"
//
// Links between new pages: next/link. Links to the old site (/<L>/old/…) and language
// switches cross a root layout / reload the document: use a plain <a>.

import { isSafeLocalPath } from "@/lib/safeReturn";
import { isLocale, toOldLocale, type Locale } from "./i18n/locales";

type Query = Record<string, string | number | boolean | null | undefined>;

/** "?a=1&b=2" from defined, non-empty values ("" when nothing is left). */
export function queryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Generic builder: href(L, "segment", slug) → "/L/segment/slug" (segments are URL-encoded). */
export function href(locale: Locale, ...segments: Array<string | null | undefined>): string {
  const parts = segments.filter((s): s is string => !!s).map((s) => encodeURIComponent(s));
  return `/${locale}${parts.length ? `/${parts.join("/")}` : ""}`;
}

export type SavedFilter = "all" | "research" | "ideas" | "notes";

export const routes = {
  /** Landing (signed out) / → research catalog (signed in). */
  home: (l: Locale) => href(l),
  /** Tab «Разборы»: research catalog. */
  research: (l: Locale, q?: { q?: string }) => href(l, "segment") + queryString(q),
  /** A research article (35 launch topics). */
  topic: (l: Locale, slug: string) => href(l, "segment", slug),
  /** Tab «Идеи»: ideas catalog. */
  ideas: (l: Locale, q?: { q?: string; category?: string }) => href(l, "ideas") + queryString(q),
  /** An idea page (293 launch ideas). */
  idea: (l: Locale, id: string) => href(l, "ideas", id),
  /** Tab «Сохранённое». */
  saved: (l: Locale, q?: { filter?: SavedFilter; q?: string }) =>
    href(l, "saved") + queryString(q?.filter === "all" ? { ...q, filter: undefined } : q),
  settings: (l: Locale) => href(l, "settings"),
  settingsAbout: (l: Locale) => href(l, "settings", "about"),
  /** Paywall page; `source` = analytics surface (e.g. "idea_card", "settings"). */
  plus: (l: Locale, q?: { source?: string }) => href(l, "plus") + queryString(q),
  welcome: (l: Locale) => href(l, "welcome"),
  /** Sign-in page; `return_to` must be a public path of this site. */
  login: (l: Locale, q?: { returnTo?: string; reason?: string }) =>
    href(l, "login") + queryString({ return_to: q?.returnTo, reason: q?.reason }),
  /** Payment return page (YooKassa `?checkout=`). */
  library: (l: Locale, q?: { checkout?: string }) => href(l, "library") + queryString(q),
  contacts: (l: Locale) => href(l, "contacts"),
  offer: (l: Locale) => href(l, "offer"),
  privacy: (l: Locale) => href(l, "privacy"),
  /**
   * «Рейтинг» (web-only): niches → the apps of a niche → one app. The optional query is the
   * lists' view state (?q= search, ?sort= order; features/rating/viewState.ts).
   */
  rating: (l: Locale, q?: { q?: string }) => href(l, "rating") + queryString(q),
  ratingNiche: (l: Locale, niche: string, q?: { q?: string; sort?: string }) => href(l, "rating", niche) + queryString(q),
  ratingApp: (l: Locale, niche: string, app: string) => href(l, "rating", niche, app),
  /**
   * A niche's task page «Выбор по задаче» (ClarityScenarioView): `n` is the 1-based index of
   * the scenario in the niche's data. The static `tasks` segment wins over an app slug; the
   * rating reader never hands out the app slug "tasks" (sitedata/rating.ts slug index).
   */
  ratingTask: (l: Locale, niche: string, n: number) => href(l, "rating", niche, "tasks", String(n)),
  /** «Отзывы» (web-only): the review archive — categories → apps → every review of an app. */
  reviews: (l: Locale) => href(l, "reviews"),
  reviewsNiche: (l: Locale, niche: string) => href(l, "reviews", niche),
  reviewsApp: (l: Locale, niche: string, appId: string) => href(l, "reviews", niche, appId),
  reviewsMethodology: (l: Locale) => href(l, "reviews", "methodology"),
  /** «MCP» (web-only): the MCP server page. */
  mcp: (l: Locale) => href(l, "mcp"),
  /** The previous site (ru/en only; de/fr/ja read the English archive). Plain <a>. */
  oldSite: (l: Locale, path: string = "") => `/${toOldLocale(l)}/old${path && path !== "/" ? (path.startsWith("/") ? path : `/${path}`) : ""}`,
} as const;

/** Tabs of the app shell, in order. */
export const TABS = ["research", "ideas", "saved"] as const;
export type Tab = (typeof TABS)[number];

export const tabRoot = (l: Locale, tab: Tab): string =>
  tab === "research" ? routes.research(l) : tab === "ideas" ? routes.ideas(l) : routes.saved(l);

export type PublicPath = {
  locale: Locale | null;
  /** Segments after the locale. */
  segments: string[];
  /** "/<L>/…" (no query). */
  pathname: string;
};

/**
 * Normalizes any pathname a component can see to the public form:
 * the client sees "/ru/segment", SSR of a rewritten page may see "/site/ru/segment".
 */
export function parsePublicPath(pathname: string | null | undefined): PublicPath {
  let segs = (pathname || "/").split("/").filter(Boolean);
  if (segs[0] === "site" && isLocale(segs[1])) segs = segs.slice(1);
  const locale = isLocale(segs[0]) ? segs[0] : null;
  const segments = locale ? segs.slice(1) : segs;
  const pathnameOut = locale ? `/${locale}${segments.length ? `/${segments.join("/")}` : ""}` : `/${segs.join("/")}`;
  return { locale, segments, pathname: pathnameOut };
}

/** Which tab a public path belongs to (settings live under «Сохранённое»). */
export function tabOf(pathname: string | null | undefined): Tab | null {
  const [a] = parsePublicPath(pathname).segments;
  if (a === "segment") return "research";
  if (a === "ideas") return "ideas";
  if (a === "saved" || a === "settings") return "saved";
  return null;
}

/** The web-only sections (not app tabs), in navigation order: «Рейтинг», «Отзывы», «MCP». */
export const SECTIONS = ["rating", "reviews", "mcp"] as const;
export type Section = (typeof SECTIONS)[number];

/** Which web-only section a public path belongs to. */
export function sectionOf(pathname: string | null | undefined): Section | null {
  const [a] = parsePublicPath(pathname).segments;
  return (SECTIONS as readonly string[]).includes(a) ? (a as Section) : null;
}

/** True on the three tab roots, where the mobile floating tab bar is shown. */
export function isTabRoot(pathname: string | null | undefined): boolean {
  const { segments } = parsePublicPath(pathname);
  return segments.length === 1 && (segments[0] === "segment" || segments[0] === "ideas" || segments[0] === "saved");
}

/**
 * The same place in another language (spec 09 G3): same path and query under the new
 * locale prefix. Accepts "/ru/x?q=1", "/site/ru/x" or "/x" (then the locale is added).
 */
export function switchLocaleHref(pathWithQuery: string, next: Locale): string {
  const q = pathWithQuery.search(/[?#]/);
  const pathname = q === -1 ? pathWithQuery : pathWithQuery.slice(0, q);
  const rest = q === -1 ? "" : pathWithQuery.slice(q);
  const { segments } = parsePublicPath(pathname);
  return `/${next}${segments.length ? `/${segments.join("/")}` : ""}${rest}`;
}

/**
 * A return path (sign-in `return_to`) is safe only when it is a same-site path that cannot
 * become another origin: delegates to the shared validator the sign-in API routes use
 * (src/lib/safeReturn.ts — rejects "//x", "/\x", "/\t/x", encoded "//", dot segments, /api…).
 */
export function isSafeReturnPath(p: string | null | undefined): p is string {
  return isSafeLocalPath(p);
}
