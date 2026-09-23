// Routing contract of the new site (docs/site-v2/ARCHITECTURE.md §1, §3).
// Run: npm run test:v2-routing   (= node --import tsx scripts/v2/test-routing.ts)
//
// 1. decideRoute() — the pure decision behind src/proxy.ts — for every rule in the URL map.
// 2. src/proxy.ts itself: the matcher (what the proxy never sees) and the NextResponse it
//    builds (redirect status/location, rewrite target, headers, cookies).
// 3. The new root layout keeps the analytics contract of the old one
//    (scripts/test-monetization.ts rules: send_page_view:false, defer:true, shims first).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import {
  decideRoute,
  notFoundLocale,
  PROXY_REQUEST_HEADERS,
  type RoutingDecision,
  type RewriteDecision,
  type RedirectDecision,
} from "../../src/site/routing/decide";
import { negotiateLocale, parseAcceptLanguage } from "../../src/site/i18n/locales";
import { isServedInPlace, oldHref, oldNavHref, switchOldLocale } from "../../src/lib/oldHref";
import { proxy, config } from "../../src/proxy";

type Input = Parameters<typeof decideRoute>[0];

function decide(url: string, extra: Omit<Input, "pathname" | "search"> = {}): RoutingDecision {
  const u = new URL(url, "https://inapp.pro");
  return decideRoute({ pathname: u.pathname, search: u.search, ...extra });
}

function expectRedirect(d: RoutingDecision, status: 307 | 308, location: string): RedirectDecision {
  assert.equal(d.type, "redirect", `expected a redirect, got ${JSON.stringify(d)}`);
  const r = d as RedirectDecision;
  assert.equal(r.status, status);
  assert.equal(r.location, location);
  return r;
}

function expectRewrite(d: RoutingDecision, site: RewriteDecision["site"], pathname: string): RewriteDecision {
  assert.equal(d.type, "rewrite", `expected a rewrite, got ${JSON.stringify(d)}`);
  const r = d as RewriteDecision;
  assert.equal(r.site, site);
  assert.equal(r.pathname, pathname);
  return r;
}

const cookieValue = (r: RewriteDecision, name = "locale") => r.cookies.find((c) => c.name === name)?.value;

describe("locale negotiation (spec 09 §2.2)", () => {
  test("cookie wins when it is one of the five", () => {
    assert.equal(negotiateLocale({ cookie: "fr", acceptLanguage: "ru-RU,ru;q=0.9" }), "fr");
    assert.equal(negotiateLocale({ cookie: "xx", acceptLanguage: "de-CH,de;q=0.9" }), "de");
  });
  test("Accept-Language: q-order, exact, base, default en", () => {
    assert.equal(negotiateLocale({ acceptLanguage: "ru-RU,ru;q=0.9,en;q=0.8" }), "ru");
    assert.equal(negotiateLocale({ acceptLanguage: "de-CH" }), "de");
    assert.equal(negotiateLocale({ acceptLanguage: "es-ES,es;q=0.9,ja;q=0.5" }), "ja");
    assert.equal(negotiateLocale({ acceptLanguage: "en;q=0.2,fr;q=0.8" }), "fr");
    assert.equal(negotiateLocale({ acceptLanguage: "ru;q=0,pt-BR" }), "en");
    assert.equal(negotiateLocale({ acceptLanguage: "" }), "en");
    assert.equal(negotiateLocale({}), "en");
    assert.deepEqual(parseAcceptLanguage("fr;q=0.5, *, de-DE;q=0.9, ja;q=0"), ["de-de", "fr"]);
  });
});

describe("root and bare paths", () => {
  test("/ → negotiated locale home", () => {
    expectRedirect(decide("/", { acceptLanguage: "ru-RU,ru;q=0.9" }), 307, "/ru");
    expectRedirect(decide("/", { acceptLanguage: "de-DE,de;q=0.9,en;q=0.8" }), 307, "/de");
    expectRedirect(decide("/", { acceptLanguage: "en-GB,en;q=0.9" }), 307, "/en");
    expectRedirect(decide("/", { acceptLanguage: "zh-CN" }), 307, "/en");
    expectRedirect(decide("/", { cookies: { locale: "ja" }, acceptLanguage: "ru" }), 307, "/ja");
    expectRedirect(decide("/?utm_source=x", { acceptLanguage: "fr" }), 307, "/fr?utm_source=x");
  });
  test("bare /segment/x → /<loc>/segment/x (query kept)", () => {
    expectRedirect(decide("/segment/x", { acceptLanguage: "ru" }), 307, "/ru/segment/x");
    expectRedirect(decide("/segment/interior-design?q=1", { cookies: { locale: "de" } }), 307, "/de/segment/interior-design?q=1");
    expectRedirect(decide("/offer", { acceptLanguage: "en-US" }), 307, "/en/offer");
    expectRedirect(decide("/library?checkout=abc", { acceptLanguage: "ru" }), 307, "/ru/library?checkout=abc");
  });
  test("bare links reach their final URL in ONE redirect (A16), always 307", () => {
    // de/fr/ja have no old pages: straight to the English one, not /de/… → /en/…
    expectRedirect(decide("/segment/x?q=1", { cookies: { locale: "de" } }), 307, "/en/segment/x?q=1");
    expectRedirect(decide("/segment/sobriety", { acceptLanguage: "de-DE,de;q=0.9,en;q=0.8" }), 307, "/en/segment/sobriety");
    expectRedirect(decide("/rating/habit-tracking", { cookies: { locale: "ja" } }), 307, "/en/rating/habit-tracking");
    expectRedirect(decide("/reviews/habit-tracking/1394150432", { acceptLanguage: "fr" }), 307, "/en/reviews/habit-tracking/1394150432");
    expectRedirect(decide("/ideas/top", { cookies: { locale: "fr" } }), 307, "/en/ideas/top");
    // aliases fold in too, but stay temporary: the target depends on the visitor
    expectRedirect(decide("/research/x", { acceptLanguage: "ru" }), 307, "/ru/segment/x");
    expectRedirect(decide("/search?q=a", { cookies: { locale: "ja" } }), 307, "/ja/segment?q=a");
    expectRedirect(decide("/segment/habit-tracking/v2", { acceptLanguage: "ru" }), 307, "/ru/segment/habit-tracking");
    // pages that exist in the negotiated locale keep the plain one-hop form
    expectRedirect(decide("/rating/habit-tracking", { acceptLanguage: "ru" }), 307, "/ru/rating/habit-tracking");
    expectRedirect(decide("/segment/habit-tracking", { cookies: { locale: "de" } }), 307, "/de/segment/habit-tracking");
    expectRedirect(decide("/spotify", { cookies: { locale: "de" } }), 307, "/en/spotify");
  });
  test("bare /site/… is locale-prefixed like any other path (never the internal tree)", () => {
    expectRedirect(decide("/site/ru/segment", { acceptLanguage: "en" }), 307, "/en/site/ru/segment");
  });
});

describe("new site", () => {
  test("/<L> home sets the locale cookie", () => {
    const r = expectRewrite(decide("/ru"), "new", "/site/ru");
    assert.equal(cookieValue(r), "ru");
    assert.equal(r.requestHeaders["x-ia-site"], "new");
    assert.equal(r.requestHeaders["x-ia-public-path"], "/ru");
    assert.equal(r.responseHeaders["X-Robots-Tag"], undefined);
  });
  test("locale cookie is not re-sent when it already matches", () => {
    const r = expectRewrite(decide("/de", { cookies: { locale: "de" } }), "new", "/site/de");
    assert.equal(r.cookies.length, 0);
  });
  test("research catalog and launch topics", () => {
    expectRewrite(decide("/ru/segment"), "new", "/site/ru/segment");
    assert.equal(expectRewrite(decide("/ru/segment?q=sleep"), "new", "/site/ru/segment").search, "?q=sleep");
    const r = expectRewrite(decide("/ru/segment/habit-tracking"), "new", "/site/ru/segment/habit-tracking");
    assert.equal(cookieValue(r), "ru");
    expectRewrite(decide("/ja/segment/interior-design"), "new", "/site/ja/segment/interior-design");
  });
  test("launch ideas", () => {
    expectRewrite(decide("/ru/ideas"), "new", "/site/ru/ideas");
    expectRewrite(decide("/ru/ideas/habit-tracking-1"), "new", "/site/ru/ideas/habit-tracking-1");
    expectRewrite(decide("/fr/ideas/interior-design-5"), "new", "/site/fr/ideas/interior-design-5");
  });
  test("tabs, settings, paywall, legal", () => {
    expectRewrite(decide("/ru/saved"), "new", "/site/ru/saved");
    expectRewrite(decide("/ja/settings"), "new", "/site/ja/settings");
    expectRewrite(decide("/ja/settings/about"), "new", "/site/ja/settings/about");
    expectRewrite(decide("/fr/plus"), "new", "/site/fr/plus");
    expectRewrite(decide("/de/welcome"), "new", "/site/de/welcome");
    expectRewrite(decide("/en/login"), "new", "/site/en/login");
    expectRewrite(decide("/en/contacts"), "new", "/site/en/contacts");
    expectRewrite(decide("/ru/offer"), "new", "/site/ru/offer");
    expectRewrite(decide("/en/offer/payment"), "new", "/site/en/offer/payment");
    assert.equal((decide("/ru/old/offer/payment") as RewriteDecision).requestHeaders["x-ia-new-path"], "/ru/offer/payment");
    expectRewrite(decide("/de/privacy"), "new", "/site/de/privacy");
  });
  test("/<L>/app-auth (iOS app sign-in hand-off) is new and noindex", () => {
    const r = expectRewrite(decide("/ja/app-auth"), "new", "/site/ja/app-auth");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, follow");
    assert.equal((decide("/ru/old/app-auth") as RewriteDecision).requestHeaders["x-ia-new-path"], "/ru");
  });
  test("the iOS app's sign-in sheet (/<L>/app-auth, /<L>/login?app=1) is marked x-ia-app-flow (no analytics)", () => {
    const flow = (url: string) => (decide(url) as RewriteDecision).requestHeaders["x-ia-app-flow"];
    assert.equal(flow("/ja/app-auth"), "1");
    assert.equal(flow("/ru/app-auth?from=email"), "1");
    assert.equal(flow("/ru/login?app=1&return_to=%2Fru%2Fapp-auth"), "1");
    assert.equal(flow("/de/login?auth=google_error&app=1"), "1");
    assert.equal(flow("/ru/login"), undefined);
    assert.equal(flow("/ru/login?app=0"), undefined);
    assert.equal(flow("/ru/login?return_to=%2Fru%3Fapp%3D1"), undefined);
    assert.equal(flow("/ru/segment?app=1"), undefined);
    assert.equal(flow("/ru/settings"), undefined);
    assert.ok(PROXY_REQUEST_HEADERS.includes("x-ia-app-flow"), "a client-sent copy is dropped by the proxy");
  });
  test("/library?checkout= (YooKassa return) is new and keeps the query", () => {
    const r = expectRewrite(decide("/en/library?checkout=5f1c-uuid"), "new", "/site/en/library");
    assert.equal(r.search, "?checkout=5f1c-uuid");
  });
  test("/<L>/site/… can never reach the internal tree — it is the new site's 404 path", () => {
    expectRewrite(decide("/ru/site/ru/segment/x"), "new", "/site/ru/site/ru/segment/x");
    const r = expectRewrite(decide("/ru/old/site/ru"), "new", "/site/ru/old/site/ru");
    assert.equal(r.cookies.length, 0, "/<L>/old/** never writes the cookie");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, follow");
  });
  test("incoming spoofed x-ia-* headers are not trusted (proxy drops them)", () => {
    const r = expectRewrite(decide("/ru/saved"), "new", "/site/ru/saved");
    assert.equal(r.requestHeaders["x-ia-soon"], undefined);
  });
});

describe("aliases", () => {
  test("/<L>/research[/<slug>] → 308 /<L>/segment[/<slug>]", () => {
    expectRedirect(decide("/ru/research/x"), 308, "/ru/segment/x");
    expectRedirect(decide("/en/research"), 308, "/en/segment");
    expectRedirect(decide("/de/research?q=a"), 308, "/de/segment?q=a");
  });
  test("/<L>/search?q= → 308 /<L>/segment?q=", () => {
    expectRedirect(decide("/ru/search?q=a"), 308, "/ru/segment?q=a");
    expectRedirect(decide("/en/search"), 308, "/en/segment");
  });
  test("/<L>/segment/<launch topic>/v2 → 308 the new topic page (A10)", () => {
    expectRedirect(decide("/ru/segment/habit-tracking/v2?x=1"), 308, "/ru/segment/habit-tracking?x=1");
    expectRedirect(decide("/de/segment/interior-design/v2"), 308, "/de/segment/interior-design");
    // other topics keep the old v2 stub in place (it redirects to the old topic page)
    expectRewrite(decide("/ru/segment/sobriety/v2"), "inplace", "/segment/sobriety/v2");
    // the archive keeps its own copy of the stub
    expectRewrite(decide("/ru/old/segment/habit-tracking/v2"), "old", "/segment/habit-tracking/v2");
    // anything deeper under a launch topic is the new site's 404
    expectRewrite(decide("/ru/segment/habit-tracking/v3"), "new", "/site/ru/segment/habit-tracking/v3");
  });
});

describe("old pages in place", () => {
  test("non-launch topic: in place + x-ia-soon", () => {
    const r = expectRewrite(decide("/ru/segment/qr-scanner"), "inplace", "/segment/qr-scanner");
    assert.equal(r.requestHeaders["x-ia-soon"], "1");
    assert.equal(r.requestHeaders["x-locale"], "ru");
    assert.equal(r.requestHeaders["x-ia-site"], "inplace");
    assert.equal(r.requestHeaders["x-ia-public-path"], "/ru/segment/qr-scanner");
    assert.equal(r.requestHeaders["x-ia-new-path"], "/ru");
    assert.equal(r.responseHeaders["X-Robots-Tag"], undefined, "in-place pages stay indexed");
    assert.equal(cookieValue(r), "ru");
  });
  test("non-launch topic in de/fr/ja → the English old page", () => {
    expectRedirect(decide("/de/segment/qr-scanner"), 307, "/en/segment/qr-scanner");
    expectRedirect(decide("/ja/rating/x?y=1"), 307, "/en/rating/x?y=1");
  });
  test("non-launch ideas and the old leaderboard", () => {
    const r = expectRewrite(decide("/ru/ideas/kids-learning-1"), "inplace", "/ideas/kids-learning-1");
    assert.equal(r.requestHeaders["x-ia-soon"], undefined);
    expectRewrite(decide("/ru/ideas/top"), "inplace", "/ideas/top");
    expectRedirect(decide("/fr/ideas/top"), 307, "/en/ideas/top");
  });
  test("old-only routes keep their URL", () => {
    for (const p of ["/ru/mcp", "/ru/tokens", "/ru/spotify", "/ru/reviews/x/y", "/ru/rating/x", "/en/mcp/connect", "/en/build/x/x-1"]) {
      const r = expectRewrite(decide(p), "inplace", p.slice(3));
      assert.equal(r.requestHeaders["x-ia-new-path"], `/${p.slice(1, 3)}`);
    }
    assert.equal(expectRewrite(decide("/en/mcp/connect?o=abc"), "inplace", "/mcp/connect").search, "?o=abc");
  });
  test("retired paths fall through to the old site (which 404s them)", () => {
    expectRewrite(decide("/ru/aso"), "inplace", "/aso");
    expectRewrite(decide("/ru/workspace/habit-tracking"), "inplace", "/workspace/habit-tracking");
  });
  test("in-place pages never overwrite a de/fr/ja locale cookie (A11)", () => {
    for (const l of ["de", "fr", "ja"]) {
      const r = expectRewrite(decide("/en/spotify", { cookies: { locale: l } }), "inplace", "/spotify");
      assert.equal(r.cookies.length, 0, `cookie ${l} must survive /en/spotify`);
      assert.equal(expectRewrite(decide("/en/segment/qr-scanner", { cookies: { locale: l } }), "inplace", "/segment/qr-scanner").cookies.length, 0);
    }
    assert.equal(cookieValue(expectRewrite(decide("/en/spotify", { cookies: { locale: "ru" } }), "inplace", "/spotify")), "en");
    assert.equal(cookieValue(expectRewrite(decide("/en/spotify"), "inplace", "/spotify")), "en");
    assert.equal(cookieValue(expectRewrite(decide("/ru/spotify", { cookies: { locale: "xx" } }), "inplace", "/spotify")), "ru");
    assert.equal(expectRewrite(decide("/ru/spotify", { cookies: { locale: "ru" } }), "inplace", "/spotify").cookies.length, 0);
    // new pages still write the locale of the URL
    assert.equal(cookieValue(expectRewrite(decide("/en/segment", { cookies: { locale: "de" } }), "new", "/site/en/segment")), "en");
  });
});

describe("hidden old site", () => {
  test("/ru/old → old home, noindex, no cookie", () => {
    const r = expectRewrite(decide("/ru/old", { cookies: { locale: "de" } }), "old", "/");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, follow");
    assert.equal(r.requestHeaders["x-locale"], "ru");
    assert.equal(r.requestHeaders["x-ia-site"], "old");
    assert.equal(r.requestHeaders["x-ia-new-path"], "/ru");
    assert.equal(r.cookies.length, 0);
  });
  test("/ru/old/segment/habit-tracking → old page with a link to its new equivalent", () => {
    const r = expectRewrite(decide("/ru/old/segment/habit-tracking"), "old", "/segment/habit-tracking");
    assert.equal(r.requestHeaders["x-ia-new-path"], "/ru/segment/habit-tracking");
    assert.equal(r.requestHeaders["x-ia-public-path"], "/ru/old/segment/habit-tracking");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, follow");
  });
  test("new equivalents of other archive pages", () => {
    const np = (url: string) => (decide(url) as RewriteDecision).requestHeaders["x-ia-new-path"];
    assert.equal(np("/en/old/ideas/habit-tracking-1"), "/en/ideas/habit-tracking-1");
    assert.equal(np("/en/old/ideas/kids-learning-1"), "/en");
    assert.equal(np("/ru/old/ideas"), "/ru/ideas");
    assert.equal(np("/ru/old/saved"), "/ru/saved");
    assert.equal(np("/ru/old/search"), "/ru/segment");
    assert.equal(np("/ru/old/segment/qr-scanner"), "/ru");
    assert.equal(np("/ru/old/reviews/x"), "/ru");
    assert.equal(np("/en/old/contacts"), "/en/contacts");
  });
  test("/<de|fr|ja>/old/x → /en/old/x", () => {
    expectRedirect(decide("/de/old/x"), 307, "/en/old/x");
    expectRedirect(decide("/ja/old"), 307, "/en/old");
    expectRedirect(decide("/fr/old/segment/y?z=1"), 307, "/en/old/segment/y?z=1");
  });
  test("/old convenience entries", () => {
    expectRedirect(decide("/old", { acceptLanguage: "ru" }), 307, "/ru/old");
    expectRedirect(decide("/old", { acceptLanguage: "de" }), 307, "/en/old");
    expectRedirect(decide("/old", { cookies: { locale: "ru" } }), 307, "/ru/old");
    expectRedirect(decide("/old/ru/mcp"), 307, "/ru/old/mcp");
    expectRedirect(decide("/old/en"), 307, "/en/old");
    expectRedirect(decide("/old/fr/x"), 307, "/en/old/x");
    expectRedirect(decide("/old/segment/x?q=1", { acceptLanguage: "ru" }), 307, "/ru/old/segment/x?q=1");
  });
});

describe("old-site links (src/lib/oldHref.ts, A4 option A)", () => {
  test("a page served in place is linked at its public URL", () => {
    assert.equal(oldHref("ru", "/reviews/habit-tracking/1394150432"), "/ru/reviews/habit-tracking/1394150432");
    assert.equal(oldHref("en", "/reviews"), "/en/reviews");
    assert.equal(oldHref(true, "/rating/habit-tracking"), "/ru/rating/habit-tracking");
    assert.equal(oldHref(false, "/rating"), "/en/rating");
    assert.equal(oldHref("ru", "/segment/qr-scanner"), "/ru/segment/qr-scanner", "old topic stays in place");
    assert.equal(oldHref("en", "/ideas/top"), "/en/ideas/top");
    assert.equal(oldHref("ru", "/ideas/food-delivery-5"), "/ru/ideas/food-delivery-5", "non-launch idea id");
    for (const p of ["/tokens", "/mcp", "/mcp/connect", "/build", "/build/x/x-1", "/apps", "/cards", "/admin", "/spotify", "/best/x", "/most-wanted"]) {
      assert.equal(oldHref("ru", p), `/ru${p}`, p);
    }
  });
  test("a page whose URL the new site took over is linked as its /<L>/old copy", () => {
    assert.equal(oldHref("ru", "/"), "/ru/old");
    assert.equal(oldHref("en"), "/en/old");
    assert.equal(oldHref("ru", "/segment/habit-tracking"), "/ru/old/segment/habit-tracking");
    assert.equal(oldHref("en", "/ideas/habit-tracking-1"), "/en/old/ideas/habit-tracking-1");
    for (const p of ["/ideas", "/saved", "/library", "/contacts", "/offer", "/offer/payment", "/settings", "/login", "/plus"]) {
      assert.equal(oldHref("ru", p), `/ru/old${p}`, p);
    }
    // aliases the proxy redirects never leave the archive either
    assert.equal(oldHref("ru", "/search"), "/ru/old/search");
    assert.equal(oldHref("ru", "/research/x"), "/ru/old/research/x");
  });
  test("query, hash and relative forms", () => {
    assert.equal(oldHref("ru", "/ideas?cat=x"), "/ru/old/ideas?cat=x");
    assert.equal(oldHref("ru", "?q=1"), "/ru/old?q=1");
    assert.equal(oldHref("ru", "/?q=1"), "/ru/old?q=1");
    assert.equal(oldHref("en", "#top"), "/en/old#top");
    assert.equal(oldHref("en", "reviews/x"), "/en/reviews/x");
    assert.equal(oldHref("en", "/reviews/x/1?q=a%20b#r"), "/en/reviews/x/1?q=a%20b#r");
    assert.equal(oldHref("ru", "/segment/habit-tracking#apps"), "/ru/old/segment/habit-tracking#apps");
  });
  test("de/fr/ja and unknown values read the old convention (only en is English)", () => {
    assert.equal(oldHref("de", "/reviews"), "/ru/reviews");
    assert.equal(oldHref(undefined, "/"), "/ru/old");
    assert.equal(isServedInPlace("en", "/"), false);
    assert.equal(isServedInPlace("en", "/rating"), true);
  });
  test("oldNavHref: redirects of old pages (A10)", () => {
    // served in place → the public URL (new home, in-place page or new topic)
    assert.equal(oldNavHref("inplace", "ru", "/"), "/ru");
    assert.equal(oldNavHref("inplace", "en", "/tokens"), "/en/tokens");
    assert.equal(oldNavHref("inplace", "ru", "/segment/sobriety"), "/ru/segment/sobriety");
    assert.equal(oldNavHref("inplace", "ru", "/segment/habit-tracking"), "/ru/segment/habit-tracking");
    assert.equal(oldNavHref(null, "en", "/mcp?x=1"), "/en/mcp?x=1");
    // inside the archive → oldHref (stays unless the target is served in place)
    assert.equal(oldNavHref("old", "ru", "/"), "/ru/old");
    assert.equal(oldNavHref("old", "ru", "/segment/habit-tracking"), "/ru/old/segment/habit-tracking");
    assert.equal(oldNavHref("old", "en", "/tokens"), "/en/tokens");
  });
  test("language switch keeps the page and its form", () => {
    assert.equal(switchOldLocale("/ru/old/segment/habit-tracking", "en"), "/en/old/segment/habit-tracking");
    assert.equal(switchOldLocale("/ru/old", "en"), "/en/old");
    assert.equal(switchOldLocale("/ru/reviews/x", "en"), "/en/reviews/x");
    assert.equal(switchOldLocale("/en", "ru"), "/ru");
    assert.equal(switchOldLocale("/reviews/x", "en"), "/en/reviews/x");
    assert.equal(switchOldLocale("/ideas", "ru"), "/ru/old/ideas");
  });
});

describe("global 404 (src/app/global-not-found.tsx, A12)", () => {
  test("enabled in next.config.ts and present", () => {
    const cfg = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");
    assert.match(cfg, /experimental\s*:\s*\{[^}]*globalNotFound\s*:\s*true/);
    const page = new URL("../../src/app/global-not-found.tsx", import.meta.url);
    assert.ok(existsSync(page), "src/app/global-not-found.tsx");
    const src = readFileSync(page, "utf8");
    assert.match(src, /<html lang=\{locale\}/, "a full document with the resolved lang");
    assert.match(src, /notFoundLocale\(/);
    assert.match(src, /@\/site\/styles\/site\.css/, "new design");
    for (const l of ["ru", "en", "de", "fr", "ja"]) assert.match(src, new RegExp(`\\n  ${l}: \\{`), `copy for ${l}`);
  });
  test("locale: the URL's, a de/fr/ja cookie over en, else negotiated", () => {
    assert.equal(notFoundLocale({ publicPath: "/ru/foo/bar/baz", cookie: "de" }), "ru");
    assert.equal(notFoundLocale({ publicPath: "/ru/old/x/y/z", acceptLanguage: "fr" }), "ru");
    assert.equal(notFoundLocale({ publicPath: "/en/foo/bar/baz" }), "en");
    assert.equal(notFoundLocale({ publicPath: "/en/foo/bar/baz", cookie: "ru" }), "en");
    assert.equal(notFoundLocale({ publicPath: "/en/foo/bar/baz", cookie: "de" }), "de");
    assert.equal(notFoundLocale({ publicPath: "/ja/site/x", cookie: "fr" }), "ja");
    assert.equal(notFoundLocale({ publicPath: null, acceptLanguage: "fr-FR,fr;q=0.9" }), "fr");
    assert.equal(notFoundLocale({ publicPath: "/foo.php", cookie: "ja", acceptLanguage: "ru" }), "ja");
    assert.equal(notFoundLocale({}), "en");
  });
});

describe("src/proxy.ts", () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

  test("matcher skips APIs, Next internals, metadata routes, .well-known and files", () => {
    for (const url of [
      "/api/me",
      "/api/auth/google/callback",
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/icon",
      "/apple-icon",
      "/opengraph-image",
      "/twitter-image",
      "/sitemap.xml",
      "/robots.txt",
      "/feed.xml",
      "/llms.txt",
      "/llms-full.ru.txt",
      "/.well-known/oauth-authorization-server",
      "/badges/app-store.svg",
      "/favicon.ico",
    ]) {
      assert.equal(matches(url), false, `proxy must not run for ${url}`);
    }
  });
  test("matcher runs for pages (including names that merely start with api/icon)", () => {
    for (const url of ["/", "/ru", "/ru/segment/x", "/old", "/segment/x", "/site/ru", "/icons", "/apis", "/ru/api-docs"]) {
      assert.equal(matches(url), true, `proxy must run for ${url}`);
    }
  });

  const req = (url: string, headers: Record<string, string> = {}) =>
    new NextRequest(new URL(url, "https://inapp.pro"), { headers });

  test("redirects carry status and query", () => {
    const res = proxy(req("/search-me?x=1", { "accept-language": "ru" }));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://inapp.pro/ru/search-me?x=1");
    const alias = proxy(req("/ru/search?q=a"));
    assert.equal(alias.status, 308);
    assert.equal(alias.headers.get("location"), "https://inapp.pro/ru/segment?q=a");
  });
  test("new rewrite: target, cookie, request headers (spoofed ones replaced)", () => {
    const res = proxy(req("/ru/library?checkout=abc", { "x-ia-soon": "1", "x-ia-site": "old" }));
    assert.equal(res.headers.get("x-middleware-rewrite"), "https://inapp.pro/site/ru/library?checkout=abc");
    assert.match(res.headers.get("set-cookie") ?? "", /locale=ru/);
    assert.equal(res.headers.get("x-middleware-request-x-ia-site"), "new");
    assert.equal(res.headers.get("x-middleware-request-x-ia-soon"), null);
  });
  test("bare link for a German visitor: one 307 to the English old page (A16)", () => {
    const res = proxy(req("/segment/sobriety?x=1", { "accept-language": "de-DE,de;q=0.9" }));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://inapp.pro/en/segment/sobriety?x=1");
  });
  test("in-place rewrite keeps a de locale cookie (A11)", () => {
    const res = proxy(req("/en/spotify", { cookie: "locale=de" }));
    assert.equal(res.headers.get("x-middleware-rewrite"), "https://inapp.pro/spotify");
    assert.equal(res.headers.get("set-cookie"), null);
    assert.match(proxy(req("/en/spotify", { cookie: "locale=ru" })).headers.get("set-cookie") ?? "", /locale=en/);
  });
  test("launch topic v2 → 308 (A10)", () => {
    const res = proxy(req("/ru/segment/habit-tracking/v2"));
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://inapp.pro/ru/segment/habit-tracking");
  });
  test("archive rewrite: noindex, headers for the old layout, no cookie", () => {
    const res = proxy(req("/ru/old/segment/habit-tracking"));
    assert.equal(res.headers.get("x-middleware-rewrite"), "https://inapp.pro/segment/habit-tracking");
    assert.equal(res.headers.get("x-robots-tag"), "noindex, follow");
    assert.equal(res.headers.get("x-middleware-request-x-ia-new-path"), "/ru/segment/habit-tracking");
    assert.equal(res.headers.get("x-middleware-request-x-locale"), "ru");
    assert.equal(res.headers.get("set-cookie"), null);
  });
});

describe("new root layout analytics contract", () => {
  const layout = readFileSync(new URL("../../src/app/(site)/site/[lang]/layout.tsx", import.meta.url), "utf8");
  test("same counters, manual page views, shims before loaders", () => {
    assert.match(layout, /110047715/);
    assert.match(layout, /G-G3J6K8VBD6/);
    assert.match(layout, /send_page_view\s*:\s*false/, "SPA page views must be owned by the page tracker");
    assert.match(layout, /defer:true/, "Yandex initial hit must not duplicate the page tracker");
    const googleLoader = layout.indexOf('<Script src="https://www.googletagmanager.com');
    assert.ok(googleLoader > 0);
    assert.ok(layout.indexOf('id="ym-metrika"') < googleLoader, "Google loading must not block Yandex initialization");
    assert.ok(layout.indexOf('id="ga-gtag"') < googleLoader, "gtag must queue events before the remote library loads");
    assert.match(layout, /site:\s*["']v2["']/, "events are tagged with site: v2");
  });
});
