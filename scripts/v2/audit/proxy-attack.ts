// Adversarial checks for the site-v2 proxy (src/proxy.ts + src/site/routing/decide.ts).
// Read-only: calls decideRoute()/proxy() directly, never starts a server.
// Run: node --import tsx scripts/v2/audit/proxy-attack.ts
//
// Prints one line per probe and a list of invariant violations at the end (exit 1 if any).

import "./als-shim";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { decideRoute, PROXY_REQUEST_HEADERS, type RoutingDecision } from "../../../src/site/routing/decide";
import { LOCALES } from "../../../src/site/i18n/locales";
import { isSafeReturnPath } from "../../../src/site/routing";
import { proxy, config } from "../../../src/proxy";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ORIGIN = "https://inapp.pro";
const violations: string[] = [];
const notes: string[] = [];
const fail = (msg: string) => violations.push(msg);

// Production runs the matcher on the raw pathname OR the decoded one
// (next/dist/server/lib/router-utils/resolve-routes.js, route.name === "middleware").
function proxyRuns(rawPathname: string): boolean {
  let decoded = rawPathname;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {}
  const m = (p: string) => unstable_doesMiddlewareMatch({ config, url: p });
  return m(rawPathname) || m(decoded);
}

// What Next's URL parser (WHATWG) hands to the proxy for a raw request target.
function parse(raw: string): { pathname: string; search: string; nextNormalizes308: boolean } {
  const noQuery = raw.split("?", 1)[0];
  const u = new URL(raw, ORIGIN);
  return { pathname: u.pathname, search: u.search, nextNormalizes308: /(\\|\/\/)/.test(noQuery) };
}

function describe(d: RoutingDecision): string {
  if (d.type === "redirect") return `${d.status} → ${d.location}`;
  return `rewrite[${d.site}] ${d.pathname}${d.search} hdr=${JSON.stringify(d.requestHeaders)} res=${JSON.stringify(d.responseHeaders)} cookies=${d.cookies.map((c) => `${c.name}=${c.value}`).join(",")}`;
}

function checkDecision(label: string, input: { pathname: string; search: string }, d: RoutingDecision) {
  const search = input.search === "?" ? "" : input.search;
  if (d.type === "redirect") {
    const loc = d.location;
    if (!/^\/(ru|en|de|fr|ja)(\/|\?|$)/.test(loc)) fail(`${label}: redirect not locale-prefixed: ${loc}`);
    if (/^\/[\\/]/.test(loc)) fail(`${label}: protocol-relative redirect ${loc}`);
    if (/[\r\n\t]/.test(loc)) fail(`${label}: control char in Location ${JSON.stringify(loc)}`);
    if (new URL(loc, ORIGIN).origin !== ORIGIN) fail(`${label}: redirect leaves origin: ${loc}`);
    if (search && !loc.endsWith(search)) fail(`${label}: query dropped on redirect (${search}) → ${loc}`);
    return;
  }
  const publicPath = input.pathname;
  const underOld = /^\/(ru|en|de|fr|ja)\/old(\/|$)/.test(publicPath);
  if (d.search !== search) fail(`${label}: query changed on rewrite ${search} → ${d.search}`);
  if (new URL(d.pathname, ORIGIN).origin !== ORIGIN) fail(`${label}: rewrite leaves origin ${d.pathname}`);
  if (d.site === "new" && !d.pathname.startsWith(`/site/${d.locale}`)) fail(`${label}: new rewrite outside /site/<L>: ${d.pathname}`);
  if (d.site !== "new") {
    const first = d.pathname.split("/")[1] ?? "";
    let firstDecoded = first;
    try {
      firstDecoded = decodeURIComponent(first);
    } catch {}
    if (first === "site") fail(`${label}: OLD rewrite reaches internal /site tree: ${d.pathname}`);
    // Percent-encoded "site": Next matches dynamic routes on the RAW pathname, so /%73ite/[lang]/…
    // does not resolve to the internal tree (all of it sits under the dynamic [lang] segment).
    else if (firstDecoded === "site") notes.push(`${label}: OLD rewrite to percent-encoded /site (${d.pathname}) — no route match expected`);
    if (["api", "_next"].includes(firstDecoded)) notes.push(`${label}: OLD rewrite targets /${firstDecoded}/… (${d.pathname})`);
  }
  const robots = d.responseHeaders["X-Robots-Tag"];
  if (underOld && !robots) fail(`${label}: /<L>/old response without X-Robots-Tag`);
  if (!underOld && robots && d.site !== "new") fail(`${label}: X-Robots-Tag outside /old`);
  for (const c of d.cookies) {
    if (!(LOCALES as readonly string[]).includes(c.value)) fail(`${label}: cookie value ${c.value}`);
    if (underOld) fail(`${label}: cookie written under /old`);
  }
  const np = d.requestHeaders["x-ia-new-path"];
  if (np !== undefined && (!np.startsWith("/") || np.startsWith("//") || /[\\\t\r\n]/.test(np))) fail(`${label}: unsafe x-ia-new-path ${np}`);
}

const RAW_TARGETS = [
  // open redirects
  "//evil.com",
  "//evil.com/ru",
  "/\\evil.com",
  "/%2F%2Fevil.com",
  "/%2F%2Fevil",
  "/%5Cevil",
  "/%5C%5Cevil",
  "/%09/evil",
  "/%0D%0ALocation:%20https://evil",
  "/ru/research/%2F%2Fevil",
  "/old/%2F%2Fevil",
  "/old/ru/%5Cevil",
  "/de/old/%2F%2Fevil",
  "/de/%2F%2Fevil",
  "/ru/old/%2F%2Fevil",
  "/https:%2F%2Fevil.com",
  "/@evil",
  // locale case, slashes, dots
  "/RU",
  "/Ru/segment",
  "/EN/old",
  "/ru/OLD/x",
  "/ru/Segment/habit-tracking",
  "/ru/SITE/ru/saved",
  "/ru/",
  "/ru/segment/",
  "/ru//segment",
  "/ru/./segment",
  "/ru/old/../site/ru/saved",
  "/ru/old/%2e%2e/site/ru/saved",
  "/ru/old/%2e%2e/%2e%2e/site/ru/saved",
  "/ru/%73ite/ru/saved",
  "/ru/old/%73ite/ru/saved",
  "/ru/old/si%74e",
  "/ru/segment/habit%2Dtracking",
  "/ru/segment/habit-tracking/v2",
  "/ru/ideas/interior-design-1/x",
  "/ru/(site)/site/ru/saved",
  "/ru/old/(old)/segment/x",
  "/ru/ru",
  "/ru/en/segment",
  "/ru/old/old",
  "/ru/old/ru/old",
  // internal / reserved
  "/site",
  "/site/ru/saved",
  "/ru/site",
  "/ru/old/site",
  "/ru/api/me",
  "/ru/old/api/me",
  "/ru/old/api/pay/yookassa",
  "/ru/_next/image?url=%2Fbadges%2Fapp-store.svg&w=64&q=75",
  "/ru/old/_next/image?url=%2Fx&w=64&q=75",
  "/ru/icon",
  "/ru/old/opengraph-image",
  // queries on every redirect
  "/?utm_source=a&x=%2F%2Fevil",
  "/segment/x?q=1&q=2",
  "/library?checkout=00000000-0000-0000-0000-000000000000",
  "/ru/search?q=%3Cscript%3E",
  "/ru/research/habit-tracking?a=1",
  "/fr/segment/qr-scanner?z=1",
  "/ja/old/segment/y?z=1",
  "/old?x=1",
  "/old/fr/x?y=1",
  "/en/library?checkout=abc&_rsc=1a2b",
  // statics
  "/.well-known/oauth-authorization-server",
  "/ru/.well-known/x",
  "/ru/badges/app-store.svg",
  "/api/me",
  "/API/me",
  "/apis",
  "/_next/data/build/ru.json",
  "/opengraph-image-anything",
  "/twitter-imagex/ru",
  // long
  `/ru/${"a/".repeat(2000)}x`,
  `/${"x".repeat(8000)}`,
];

console.log("── decideRoute over raw request targets ──");
for (const raw of RAW_TARGETS) {
  const p = parse(raw);
  const runs = proxyRuns(p.pathname);
  const label = raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
  if (p.nextNormalizes308) {
    console.log(`${label}\n    Next 308 (repeated slash/backslash) before the proxy`);
    continue;
  }
  if (!runs) {
    console.log(`${label}\n    proxy skipped (matcher) → Next routes ${p.pathname} directly`);
    continue;
  }
  for (const cookie of [null, "ru", "de"]) {
    const d = decideRoute({ pathname: p.pathname, search: p.search, cookies: { locale: cookie }, acceptLanguage: "de-DE,de;q=0.9" });
    checkDecision(`${label} [cookie=${cookie}]`, p, d);
    if (cookie === null) console.log(`${label}\n    ${describe(d).slice(0, 400)}`);
  }
}

console.log("\n── proxy(): header spoofing, host spoofing, cookie flags ──");
const SPOOF = {
  "x-locale": "ja",
  "x-ia-site": "spoofed-site",
  "x-ia-public-path": "//evil.com",
  "x-ia-new-path": "https://evil.com",
  "x-ia-soon": "spoofed-soon",
  host: "evil.com",
  "x-forwarded-host": "evil.com",
  "x-forwarded-proto": "http",
};
for (const url of ["/ru", "/ru/saved", "/ru/old/segment/habit-tracking", "/ru/segment/qr-scanner", "/ru/mcp", "/segment/x?q=1", "/ru/research?q=1", "/ru/old/site/x"]) {
  const req = new NextRequest(new URL(url, ORIGIN), { headers: { ...SPOOF, "accept-language": "ru" } });
  const res = proxy(req);
  const loc = res.headers.get("location");
  const override = (res.headers.get("x-middleware-override-headers") ?? "").split(",");
  const got: Record<string, string | null> = {};
  for (const h of PROXY_REQUEST_HEADERS) got[h] = override.includes(h) ? res.headers.get(`x-middleware-request-${h}`) : "(deleted)";
  console.log(`${url}\n    status=${res.status} location=${loc} rewrite=${res.headers.get("x-middleware-rewrite")} set-cookie=${res.headers.get("set-cookie")} robots=${res.headers.get("x-robots-tag")}\n    forwarded x-ia-*: ${JSON.stringify(got)}`);
  if (loc && new URL(loc).host !== "inapp.pro") fail(`${url}: Location host follows spoofed Host/X-Forwarded-Host: ${loc}`);
  for (const [h, v] of Object.entries(got)) {
    if (v !== "(deleted)" && v === SPOOF[h as keyof typeof SPOOF]) fail(`${url}: spoofed ${h} forwarded unchanged`);
  }
  const sc = res.headers.get("set-cookie");
  if (sc && !/SameSite=lax/i.test(sc)) fail(`${url}: locale cookie without SameSite`);
  if (sc && /HttpOnly/i.test(sc)) notes.push(`${url}: locale cookie is HttpOnly`);
  if (sc && !/Secure/i.test(sc)) notes.push(`${url}: locale cookie lacks Secure (same as the old proxy)`);
}

console.log("\n── isSafeReturnPath vs. the URL parser ──");
for (const p of ["/ru/segment", "//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", " /\t/evil.com", "/%2F%2Fevil.com", "/%5Cevil.com", "/ru/\\x"]) {
  const safe = isSafeReturnPath(p);
  const resolved = new URL(p, ORIGIN);
  console.log(`${JSON.stringify(p).padEnd(22)} isSafeReturnPath=${safe}  new URL(p, origin) → ${resolved.href}`);
  if (safe && resolved.origin !== ORIGIN) fail(`isSafeReturnPath(${JSON.stringify(p)}) = true but it resolves to ${resolved.origin}`);
}

console.log("\n── NEW rewrites that have no page (would fall into [...missing] → 404) ──");
// Resolves an internal /site/<L>/… path against src/app/(site)/site/[lang]/** the way the App
// Router does for static + single dynamic segments, ignoring the [...missing] catch-all.
const SITE_ROOT = join(process.cwd(), "src/app/(site)/site/[lang]");
function hasPage(dir: string, segs: string[]): boolean {
  if (!segs.length) return existsSync(join(dir, "page.tsx"));
  const [head, ...rest] = segs;
  if (existsSync(join(dir, head)) && hasPage(join(dir, head), rest)) return true;
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((d) => /^\[[^.].*\]$/.test(d) && hasPage(join(dir, d), rest));
}
const PUBLIC_NEW_URLS = [
  "/ru", "/en/segment", "/ru/segment/habit-tracking", "/ru/ideas", "/ru/ideas/habit-tracking-1",
  "/ru/saved", "/ru/settings", "/ru/settings/about", "/ru/plus", "/ru/welcome", "/ru/login",
  "/ru/library?checkout=x", "/en/contacts", "/ru/offer", "/ru/offer/payment", "/en/offer/payment", "/de/privacy",
];
for (const url of PUBLIC_NEW_URLS) {
  const u = new URL(url, ORIGIN);
  const d = decideRoute({ pathname: u.pathname, search: u.search });
  if (d.type !== "rewrite" || d.site !== "new") continue;
  const segs = d.pathname.split("/").filter(Boolean).slice(2); // drop "site", "<L>"
  const ok = hasPage(SITE_ROOT, segs);
  console.log(`${url.padEnd(28)} → ${d.pathname.padEnd(28)} ${ok ? "page ok" : "NO PAGE"}`);
  if (!ok) fail(`${url}: routed to the new site but src/app/(site)/site/[lang]/${segs.join("/")}/page.tsx does not exist`);
}

console.log("\n── notes ──");
for (const n of [...new Set(notes)]) console.log(`  · ${n}`);
console.log("\n── violations ──");
if (!violations.length) console.log("  none");
for (const v of violations) console.log(`  ✗ ${v}`);
process.exitCode = violations.length ? 1 : 0;
