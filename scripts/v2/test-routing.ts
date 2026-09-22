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
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { decideRoute, type RoutingDecision, type RewriteDecision, type RedirectDecision } from "../../src/site/routing/decide";
import { negotiateLocale, parseAcceptLanguage } from "../../src/site/i18n/locales";
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
    expectRedirect(decide("/segment/x?q=1", { cookies: { locale: "de" } }), 307, "/de/segment/x?q=1");
    expectRedirect(decide("/offer", { acceptLanguage: "en-US" }), 307, "/en/offer");
    expectRedirect(decide("/library?checkout=abc", { acceptLanguage: "ru" }), 307, "/ru/library?checkout=abc");
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
    expectRewrite(decide("/de/privacy"), "new", "/site/de/privacy");
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
