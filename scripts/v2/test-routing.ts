// Routing contract of the site (docs/site-v2/ARCHITECTURE.md §1, §3).
// Run: npm run test:v2-routing   (= node --import tsx scripts/v2/test-routing.ts)
//
// 1. decideRoute() — the pure decision behind src/proxy.ts — for every rule in the URL map,
//    including the retired old site: every URL it served answers 301 with a live page, and
//    every generated target (src/site/routing/legacy.generated.ts) still resolves in the rating.
// 2. src/proxy.ts itself: the matcher (what the proxy never sees) and the NextResponse it
//    builds (redirect status/location, rewrite target, headers, cookies).
// 3. The root layout's analytics contract (send_page_view:false, defer:true, shims first).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import {
  decideRoute,
  legacyTarget,
  notFoundLocale,
  PROXY_REQUEST_HEADERS,
  type RoutingDecision,
  type RewriteDecision,
  type RedirectDecision,
} from "../../src/site/routing/decide";
import { LOCALES, negotiateLocale, parseAcceptLanguage } from "../../src/site/i18n/locales";
import { LEGACY_APPS, LEGACY_RATING_TOPICS, LEGACY_TOPICS } from "../../src/site/routing/legacy.generated";
import { isLaunchCategory } from "../../src/site/manifest.generated";
import { proxy, config } from "../../src/proxy";

type Input = Parameters<typeof decideRoute>[0];

function decide(url: string, extra: Omit<Input, "pathname" | "search"> = {}): RoutingDecision {
  const u = new URL(url, "https://inapp.pro");
  return decideRoute({ pathname: u.pathname, search: u.search, ...extra });
}

function expectRedirect(d: RoutingDecision, status: 301 | 307 | 308, location: string): RedirectDecision {
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
  test("/ → negotiated research catalog in one redirect", () => {
    expectRedirect(decide("/", { acceptLanguage: "ru-RU,ru;q=0.9" }), 307, "/ru/segment");
    expectRedirect(decide("/", { acceptLanguage: "de-DE,de;q=0.9,en;q=0.8" }), 307, "/de/segment");
    expectRedirect(decide("/", { acceptLanguage: "en-GB,en;q=0.9" }), 307, "/en/segment");
    expectRedirect(decide("/", { acceptLanguage: "zh-CN" }), 307, "/en/segment");
    expectRedirect(decide("/", { cookies: { locale: "ja" }, acceptLanguage: "ru" }), 307, "/ja/segment");
    expectRedirect(decide("/?utm_source=x", { acceptLanguage: "fr" }), 307, "/fr/segment?utm_source=x");
  });
  test("bare /segment/x → /<loc>/segment/x (query kept)", () => {
    expectRedirect(decide("/segment/x", { acceptLanguage: "ru" }), 307, "/ru/segment/x");
    expectRedirect(decide("/segment/interior-design?q=1", { cookies: { locale: "de" } }), 307, "/de/segment/interior-design?q=1");
    expectRedirect(decide("/offer", { acceptLanguage: "en-US" }), 307, "/en/offer");
    expectRedirect(decide("/library?checkout=abc", { acceptLanguage: "ru" }), 307, "/ru/library?checkout=abc");
  });
  test("bare links reach their final URL in ONE redirect (A16), always 307", () => {
    // retired old-site URLs go straight to their live page, in the visitor's locale
    expectRedirect(decide("/segment/sobriety?q=1", { cookies: { locale: "de" } }), 307, "/de/rating/sobriety?q=1");
    expectRedirect(decide("/tokens", { acceptLanguage: "ru" }), 307, "/ru/plus");
    expectRedirect(decide("/ideas/top", { cookies: { locale: "fr" } }), 307, "/fr/ideas");
    expectRedirect(decide("/tinder", { cookies: { locale: "de" } }), 307, "/de/rating/dating-apps/tinder-dating-app-date-chat");
    // aliases fold in too, but stay temporary: the target depends on the visitor
    expectRedirect(decide("/research/x", { acceptLanguage: "ru" }), 307, "/ru/segment/x");
    expectRedirect(decide("/search?q=a", { cookies: { locale: "ja" } }), 307, "/ja/segment?q=a");
    expectRedirect(decide("/segment/habit-tracking/v2", { acceptLanguage: "ru" }), 307, "/ru/segment/habit-tracking");
    // pages that exist in the negotiated locale keep the plain one-hop form
    expectRedirect(decide("/rating/habit-tracking", { acceptLanguage: "ru" }), 307, "/ru/rating/habit-tracking");
    expectRedirect(decide("/rating/habit-tracking", { cookies: { locale: "ja" } }), 307, "/ja/rating/habit-tracking");
    expectRedirect(decide("/reviews/habit-tracking/1394150432", { acceptLanguage: "fr" }), 307, "/fr/reviews/habit-tracking/1394150432");
    expectRedirect(decide("/mcp", { cookies: { locale: "de" } }), 307, "/de/mcp");
    expectRedirect(decide("/segment/habit-tracking", { cookies: { locale: "de" } }), 307, "/de/segment/habit-tracking");
    expectRedirect(decide("/no-such-page", { cookies: { locale: "de" } }), 307, "/de/no-such-page");
  });
  test("bare /site/… is locale-prefixed like any other path (never the internal tree)", () => {
    expectRedirect(decide("/site/ru/segment", { acceptLanguage: "en" }), 307, "/en/site/ru/segment");
  });
});

describe("site pages", () => {
  test("/<L> permanently redirects to its research catalog and keeps the query", () => {
    for (const l of LOCALES) {
      expectRedirect(decide(`/${l}`), 308, `/${l}/segment`);
      expectRedirect(decide(`/${l}?q=sleep&utm_source=x`, { cookies: { locale: "ja" }, acceptLanguage: "fr" }), 308, `/${l}/segment?q=sleep&utm_source=x`);
    }
  });
  test("the research catalog sets the locale cookie", () => {
    const r = expectRewrite(decide("/ru/segment"), "site", "/site/ru/segment");
    assert.equal(cookieValue(r), "ru");
    assert.equal(r.requestHeaders["x-locale"], "ru");
    assert.equal(r.requestHeaders["x-ia-public-path"], "/ru/segment");
    assert.equal(r.responseHeaders["X-Robots-Tag"], undefined);
    assert.equal(r.missing, undefined);
  });
  test("locale cookie is not re-sent when it already matches", () => {
    const r = expectRewrite(decide("/de/segment", { cookies: { locale: "de" } }), "site", "/site/de/segment");
    assert.equal(r.cookies.length, 0);
  });
  test("research catalog and launch topics", () => {
    expectRewrite(decide("/ru/segment"), "site", "/site/ru/segment");
    assert.equal(expectRewrite(decide("/ru/segment?q=sleep"), "site", "/site/ru/segment").search, "?q=sleep");
    const r = expectRewrite(decide("/ru/segment/habit-tracking"), "site", "/site/ru/segment/habit-tracking");
    assert.equal(cookieValue(r), "ru");
    expectRewrite(decide("/ja/segment/interior-design"), "site", "/site/ja/segment/interior-design");
  });
  test("launch ideas", () => {
    expectRewrite(decide("/ru/ideas"), "site", "/site/ru/ideas");
    expectRewrite(decide("/ru/ideas/habit-tracking-1"), "site", "/site/ru/ideas/habit-tracking-1");
    expectRewrite(decide("/fr/ideas/interior-design-5"), "site", "/site/fr/ideas/interior-design-5");
  });
  test("tabs, settings, paywall, legal", () => {
    expectRewrite(decide("/ru/pulse"), "site", "/site/ru/pulse");
    expectRewrite(decide("/ru/saved"), "site", "/site/ru/saved");
    expectRewrite(decide("/ja/settings"), "site", "/site/ja/settings");
    expectRewrite(decide("/ja/settings/about"), "site", "/site/ja/settings/about");
    expectRewrite(decide("/fr/plus"), "site", "/site/fr/plus");
    expectRewrite(decide("/de/welcome"), "site", "/site/de/welcome");
    expectRewrite(decide("/en/login"), "site", "/site/en/login");
    expectRewrite(decide("/en/contacts"), "site", "/site/en/contacts");
    expectRewrite(decide("/ru/offer"), "site", "/site/ru/offer");
    expectRewrite(decide("/en/offer/payment"), "site", "/site/en/offer/payment");
    expectRewrite(decide("/de/privacy"), "site", "/site/de/privacy");
  });
  test("/<L>/app-auth (iOS app sign-in hand-off) is noindex", () => {
    const r = expectRewrite(decide("/ja/app-auth"), "site", "/site/ja/app-auth");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, follow");
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
  test("the web-only sections (rating, reviews, MCP) are site pages in all five locales", () => {
    for (const l of ["ru", "en", "de", "fr", "ja"]) {
      // rating/<niche>/tasks/<n> (task pages) is indexable or noindex by the page's <meta robots>
      // (spec 11 §6.1 isIndexableTask), never by the proxy: it routes it like any rating depth.
      for (const p of ["rating", "rating/habit-tracking", "rating/habit-tracking/streaks", "rating/habit-tracking/tasks/1", "reviews", "reviews/methodology", "reviews/dating-apps", "reviews/dating-apps/440185993", "mcp"]) {
        const r = expectRewrite(decide(`/${l}/${p}`), "site", `/site/${l}/${p}`);
        assert.equal(r.responseHeaders["X-Robots-Tag"], undefined, `/${l}/${p} is indexable`);
        assert.equal(cookieValue(r), l);
      }
    }
    // the OAuth sign-in bridge keeps its query (/api/mcp/oauth/authorize sends signed-out browsers here)
    assert.equal(expectRewrite(decide("/en/mcp/connect?o=abc"), "site", "/site/en/mcp/connect").search, "?o=abc");
    assert.equal(expectRewrite(decide("/ru/reviews/x/1?q=a"), "site", "/site/ru/reviews/x/1").search, "?q=a");
  });
  test("/library?checkout= (YooKassa return) keeps the query", () => {
    const r = expectRewrite(decide("/en/library?checkout=5f1c-uuid"), "site", "/site/en/library");
    assert.equal(r.search, "?checkout=5f1c-uuid");
  });
  test("/<L>/site/… can never reach the internal tree — it is the site's 404 path", () => {
    expectRewrite(decide("/ru/site/ru/segment/x"), "site", "/site/ru/site/ru/segment/x");
  });
  test("unknown URLs: the site's 404 in the URL's locale, no cookie", () => {
    for (const url of ["/ru/aso", "/ru/workspace/habit-tracking", "/de/foo/bar/baz", "/en/segment/no-such-topic/x", "/ru/ideas/no-such-idea", "/ru/ideas/kids-learning-1", "/en/test", "/en/exp/calm"]) {
      const d = decide(url, { cookies: { locale: "fr" } });
      assert.equal(d.type, "rewrite", url);
      const r = d as RewriteDecision;
      assert.equal(r.site, "site", url);
      assert.ok(r.pathname.startsWith(`/site/${url.split("/")[1]}/`), url);
      assert.equal(r.cookies.length, 0, `${url}: a 404 does not change the visitor's language`);
    }
    // a non-launch topic slug that is not an old topic is a 404 too (the topic page 404s it)
    expectRewrite(decide("/ru/segment/no-such-topic"), "site", "/site/ru/segment/no-such-topic");
  });
  test("the owner's admin: internal /admin, its own layout, never indexed", () => {
    const r = expectRewrite(decide("/ru/admin"), "service", "/admin");
    assert.equal(r.responseHeaders["X-Robots-Tag"], "noindex, nofollow");
    assert.equal(r.requestHeaders["x-locale"], "ru");
    assert.equal(r.cookies.length, 0);
    expectRewrite(decide("/en/admin/posts"), "service", "/admin/posts");
    assert.equal((decide("/de/admin") as RewriteDecision).requestHeaders["x-locale"], "en");
    expectRedirect(decide("/admin", { acceptLanguage: "ru" }), 307, "/ru/admin");
  });
  test("incoming spoofed proxy headers are dropped (the proxy owns them)", () => {
    for (const h of ["x-locale", "x-ia-public-path", "x-ia-app-flow"]) assert.ok((PROXY_REQUEST_HEADERS as readonly string[]).includes(h), h);
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
  test("/<L>/segment/<launch topic>/v2 → 308 the topic page (A10)", () => {
    expectRedirect(decide("/ru/segment/habit-tracking/v2?x=1"), 308, "/ru/segment/habit-tracking?x=1");
    expectRedirect(decide("/de/segment/interior-design/v2"), 308, "/de/segment/interior-design");
    // anything deeper under a launch topic is the site's 404
    expectRewrite(decide("/ru/segment/habit-tracking/v3"), "site", "/site/ru/segment/habit-tracking/v3");
  });
});

describe("retired old site: every URL answers 301 with its live page (owner, 2026-09-27)", () => {
  test("old topics → their rating (all five locales; astrology has none → the rating)", () => {
    expectRedirect(decide("/ru/segment/sobriety"), 301, "/ru/rating/sobriety");
    expectRedirect(decide("/en/segment/qr-scanner?utm_source=x"), 301, "/en/rating/qr-scanner?utm_source=x");
    expectRedirect(decide("/ja/segment/food-delivery"), 301, "/ja/rating/food-delivery");
    expectRedirect(decide("/ru/segment/sobriety/v2"), 301, "/ru/rating/sobriety");
    expectRedirect(decide("/en/segment/astrology"), 301, "/en/rating");
    expectRedirect(decide("/ru/best/sobriety"), 301, "/ru/rating/sobriety");
    expectRedirect(decide("/ru/best/habit-tracking"), 301, "/ru/rating/habit-tracking");
  });
  test("old ideas → their topic: the breakdown for launch topics, else the rating", () => {
    expectRedirect(decide("/ru/ideas/food-delivery-5"), 301, "/ru/rating/food-delivery");
    expectRedirect(decide("/en/ideas/top"), 301, "/en/ideas");
    expectRedirect(decide("/ru/build"), 301, "/ru/ideas");
    expectRedirect(decide("/ru/build/habit-tracking"), 301, "/ru/segment/habit-tracking");
    expectRedirect(decide("/en/build/sobriety/sobriety-2"), 301, "/en/rating/sobriety");
  });
  test("the old site's own sections", () => {
    expectRedirect(decide("/ru/cards"), 301, "/ru/ideas");
    expectRedirect(decide("/ru/most-wanted"), 301, "/ru/pulse");
    expectRedirect(decide("/en/apps"), 301, "/en/rating");
    expectRedirect(decide("/en/best"), 301, "/en/rating");
    expectRedirect(decide("/ru/catalog"), 301, "/ru/segment");
    expectRedirect(decide("/ru/categories"), 301, "/ru/segment");
    expectRedirect(decide("/ru/tokens"), 301, "/ru/plus");
    expectRedirect(decide("/ja/tokens?y=1"), 301, "/ja/plus?y=1");
    expectRedirect(decide("/en/premium"), 301, "/en/plus");
  });
  test("per-app pages → the app's card in the rating, else its topic's rating", () => {
    expectRedirect(decide("/ru/tinder"), 301, "/ru/rating/dating-apps/tinder-dating-app-date-chat");
    expectRedirect(decide("/en/strava/test"), 301, "/en/rating/run-tracking/strava-run-bike-walk");
    expectRedirect(decide("/fr/strava"), 301, "/fr/rating/run-tracking/strava-run-bike-walk");
    expectRedirect(decide("/ru/co-star-personalized-astrology"), 301, "/ru/rating");
    // an object key is not an app page
    expectRewrite(decide("/ru/constructor"), "site", "/site/ru/constructor");
    expectRewrite(decide("/ru/tinder/reviews"), "site", "/site/ru/tinder/reviews");
  });
  test("the archive /<L>/old/… → 301 the live page, or the site's 404", () => {
    expectRedirect(decide("/ru/old", { cookies: { locale: "de" } }), 301, "/ru/segment");
    expectRedirect(decide("/ru/old/segment/habit-tracking"), 301, "/ru/segment/habit-tracking");
    expectRedirect(decide("/en/old/segment/sobriety"), 301, "/en/rating/sobriety");
    expectRedirect(decide("/ru/old/rating/habit-tracking?x=1"), 301, "/ru/rating/habit-tracking?x=1");
    expectRedirect(decide("/en/old/reviews/dating-apps/440185993"), 301, "/en/reviews/dating-apps/440185993");
    expectRedirect(decide("/ru/old/tokens"), 301, "/ru/plus");
    expectRedirect(decide("/ru/old/tinder"), 301, "/ru/rating/dating-apps/tinder-dating-app-date-chat");
    expectRedirect(decide("/ru/old/search?q=a"), 301, "/ru/segment?q=a");
    expectRedirect(decide("/de/old/segment/sobriety"), 301, "/de/rating/sobriety");
    expectRedirect(decide("/ja/old"), 301, "/ja/segment");
    for (const url of ["/ru/old/aso", "/ru/old/workspace/habit-tracking", "/ru/old/admin", "/ru/old/site/ru"]) {
      const r = decide(url) as RewriteDecision;
      assert.equal(r.type, "rewrite", url);
      assert.equal(r.missing, true, `${url} is a 404, not a redirect`);
    }
  });
  test("/old convenience entries", () => {
    expectRedirect(decide("/old", { acceptLanguage: "ru" }), 307, "/ru/segment");
    expectRedirect(decide("/old", { acceptLanguage: "de" }), 307, "/de/segment");
    expectRedirect(decide("/old/segment/sobriety?q=1", { acceptLanguage: "ru" }), 307, "/ru/rating/sobriety?q=1");
    expectRedirect(decide("/old/ru/mcp"), 301, "/ru/mcp");
    expectRedirect(decide("/old/en"), 301, "/en/segment");
    expectRedirect(decide("/old/fr/tokens"), 301, "/fr/plus");
  });
  test("every retired URL of the old sitemap redirects to a page the site serves", () => {
    const retired = [
      ...Object.keys(LEGACY_APPS),
      ...[...LEGACY_TOPICS].filter((s) => !isLaunchCategory(s)).map((s) => `segment/${s}`),
      ...[...LEGACY_TOPICS].map((s) => `best/${s}`),
      "build",
      "ideas/top",
      "most-wanted",
      "cards",
      "apps",
    ];
    for (const l of ["ru", "en"]) {
      for (const p of retired) {
        const d = decide(`/${l}/${p}`);
        assert.equal(d.type, "redirect", `/${l}/${p}`);
        const target = (d as RedirectDecision).location;
        assert.equal((d as RedirectDecision).status, 301, `/${l}/${p}`);
        const live = decide(target);
        assert.equal(live.type, "rewrite", `${target} must not redirect again`);
        assert.ok(!(live as RewriteDecision).missing, `${target} must be a page`);
      }
    }
    assert.equal(legacyTarget("ru", ["segment", "habit-tracking"]), null, "launch topics are not legacy");
  });
});

// The generated targets point into the rating's live data: a rating import may move an app's slug
// (they follow the raw data order). Re-run scripts/v2/build-legacy-redirects.ts when this fails.
describe("legacy targets resolve in the rating data", () => {
  const loader = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const resolveFilename = loader._resolveFilename;
  const serverOnlyEmpty = path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js");
  loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
    return request === "server-only" ? serverOnlyEmpty : resolveFilename.call(this, request, ...rest);
  };
  /* eslint-disable @typescript-eslint/no-require-imports */
  const rating = require("../../src/site/sitedata/rating") as typeof import("../../src/site/sitedata/rating");
  /* eslint-enable @typescript-eslint/no-require-imports */
  test("every app target is a rated app, every topic target a rating page (ru and en data)", () => {
    for (const [slug, target] of Object.entries(LEGACY_APPS)) {
      if (!target) continue;
      const [niche, app] = target.split("/");
      assert.ok(rating.hasRatingNiche(niche), `${slug}: ${niche}`);
      if (app) for (const l of ["ru", "en"] as const) assert.ok(rating.getRatingApp(l, niche, app), `${slug} → ${l}/${target}`);
    }
    for (const topic of LEGACY_RATING_TOPICS) assert.ok(rating.hasRatingNiche(topic), topic);
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
    assert.match(src, /@\/site\/styles\/site\.css/, "site design");
    for (const l of ["ru", "en", "de", "fr", "ja"]) assert.match(src, new RegExp(`\\n  ${l}: \\{`), `copy for ${l}`);
  });
  test("locale: the URL's, else negotiated", () => {
    assert.equal(notFoundLocale({ publicPath: "/ru/foo/bar/baz", cookie: "de" }), "ru");
    assert.equal(notFoundLocale({ publicPath: "/en/foo/bar/baz", cookie: "de" }), "en");
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
      "/sitemap-rating-ru.xml",
      "/sitemap-rating-en.xml",
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
    const root = proxy(req("/?utm_source=x", { "accept-language": "ru" }));
    assert.equal(root.status, 307);
    assert.equal(root.headers.get("location"), "https://inapp.pro/ru/segment?utm_source=x");
    const home = proxy(req("/en?q=sleep&utm_source=x", { cookie: "locale=ru" }));
    assert.equal(home.status, 308);
    assert.equal(home.headers.get("location"), "https://inapp.pro/en/segment?q=sleep&utm_source=x");
    const res = proxy(req("/search-me?x=1", { "accept-language": "ru" }));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://inapp.pro/ru/search-me?x=1");
    const alias = proxy(req("/ru/search?q=a"));
    assert.equal(alias.status, 308);
    assert.equal(alias.headers.get("location"), "https://inapp.pro/ru/segment?q=a");
    const retired = proxy(req("/ru/tokens?utm_source=tg"));
    assert.equal(retired.status, 301);
    assert.equal(retired.headers.get("location"), "https://inapp.pro/ru/plus?utm_source=tg");
  });
  test("site rewrite: target, cookie, request headers (spoofed ones replaced)", () => {
    const res = proxy(req("/ru/library?checkout=abc", { "x-locale": "en", "x-ia-app-flow": "1" }));
    assert.equal(res.headers.get("x-middleware-rewrite"), "https://inapp.pro/site/ru/library?checkout=abc");
    assert.match(res.headers.get("set-cookie") ?? "", /locale=ru/);
    assert.equal(res.headers.get("x-middleware-request-x-locale"), "ru");
    assert.equal(res.headers.get("x-middleware-request-x-ia-app-flow"), null);
  });
  test("bare link for a German visitor: one 307 to the live page (A16)", () => {
    const res = proxy(req("/segment/sobriety?x=1", { "accept-language": "de-DE,de;q=0.9" }));
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://inapp.pro/de/rating/sobriety?x=1");
  });
  test("launch topic v2 → 308 (A10)", () => {
    const res = proxy(req("/ru/segment/habit-tracking/v2"));
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://inapp.pro/ru/segment/habit-tracking");
  });
  test("the archive answers 301 with the live page", () => {
    const res = proxy(req("/ru/old/segment/habit-tracking"));
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("location"), "https://inapp.pro/ru/segment/habit-tracking");
    assert.equal(res.headers.get("set-cookie"), null);
  });
  test("admin rewrite: internal path, noindex, no cookie", () => {
    const res = proxy(req("/ru/admin"));
    assert.equal(res.headers.get("x-middleware-rewrite"), "https://inapp.pro/admin");
    assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(res.headers.get("set-cookie"), null);
  });
});

describe("root layout analytics contract", () => {
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
