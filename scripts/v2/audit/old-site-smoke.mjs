#!/usr/bin/env node
// Old-site regression smoke for site v2 (docs/site-v2/ARCHITECTURE.md §1, §3, §5).
//
// Read-only HTTP checks of the contract the OLD site must keep after the relocation:
// the hidden archive under /<ru|en>/old, old-only routes served in place, OAuth / MCP /
// payment entry points, Apple-facing legal URLs and the YooKassa return URL that the new
// site takes over. Every check is a plain GET without following redirects.
//
// Usage:
//   node scripts/v2/audit/old-site-smoke.mjs [BASE_URL]      # default https://inapp.pro
//   node scripts/v2/audit/old-site-smoke.mjs --json [BASE]   # machine-readable result
// Exit code 1 when any "must" check fails ("should" checks only warn).
//
// Before launch, production still runs the old site, so the new-site checks fail there
// by design; point BASE_URL at a preview/staging deployment of branch site-v2.

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const BASE = (args.find((a) => !a.startsWith("--")) || "https://inapp.pro").replace(/\/+$/, "");

const legal = JSON.parse(readFileSync(new URL("../../../src/data/legal.json", import.meta.url), "utf8"));
const SUPPORT_EMAIL = legal.appDeveloper?.email || legal.email;
const CHECKOUT = "00000000-0000-4000-8000-000000000000";
const WEB_PRICE = /990\s*(?:&nbsp;| )?\s*₽|₽\s*990/;
const PLACEHOLDER = /TODO\s*·|placeholder/i;
const NOINDEX = /noindex/i;

/**
 * @typedef {{
 *   id: string, path: string, level?: "must" | "should", cookie?: string,
 *   status?: number | number[], location?: RegExp, notLocation?: RegExp,
 *   body?: RegExp[], notBody?: RegExp[], noindex?: boolean, noLocaleCookie?: boolean,
 * }} Check
 */

/** @type {Check[]} */
const CHECKS = [
  // Hidden archive: /<L>/old/…
  { id: "archive-home", path: "/ru/old", status: 200, noindex: true, noLocaleCookie: true, body: [/data-old-site-banner="old"/] },
  { id: "archive-tokens-en", path: "/en/old/tokens", status: 200, noindex: true, body: [/990/] },
  { id: "archive-segment", path: "/ru/old/segment/habit-tracking", status: 200, noindex: true, body: [/id="main-players"/] },
  { id: "archive-entry", path: "/old/en/mcp", status: 307, location: /\/en\/old\/mcp$/ },
  { id: "archive-offer-payment", path: "/ru/old/offer/payment", status: 200, body: [/Публичная оферта/] },

  // Old-only routes served in place (indexable, quiet banner).
  { id: "inplace-tokens", path: "/ru/tokens", status: 200, noindex: false, body: [/990/, /data-old-site-banner="inplace"/] },
  { id: "inplace-mcp", path: "/ru/mcp", status: 200, noindex: false, body: [/list_niche_themes/] },
  { id: "inplace-reviews", path: "/en/reviews", status: 200, noindex: false },
  { id: "inplace-non-launch-topic", path: "/ru/segment/ai-avatars-headshots", status: 200, body: [/id="main-players"/, /data-old-site-banner="inplace"/] },
  { id: "inplace-de-to-en", path: "/de/reviews", status: 307, location: /\/en\/reviews$/ },

  // MCP OAuth bridge + discovery.
  { id: "mcp-connect-no-o", level: "should", path: "/ru/mcp/connect", status: 307, location: /\/ru\/mcp$/, notLocation: /\/old\// },
  { id: "mcp-as-meta", path: "/.well-known/oauth-authorization-server", status: 200, body: [/"refresh_token"/] },
  { id: "mcp-pr-meta", path: "/.well-known/oauth-protected-resource/api/mcp", status: 200 },
  { id: "pay-status-guest", path: `/api/pay/status?checkout=${CHECKOUT}`, status: 401 },

  // YooKassa return URL (bare /library → /<L>/library, query kept) and the page behind it.
  { id: "pay-return-redirect", path: `/library?checkout=${CHECKOUT}`, status: 307, location: new RegExp(`/(ru|en|de|fr|ja)/library\\?checkout=${CHECKOUT}$`) },
  { id: "pay-return-page", path: `/ru/library?checkout=${CHECKOUT}`, status: 200, notBody: [PLACEHOLDER] },

  // Apple-facing legal URLs (App Store support URL = /en/contacts; the app opens /offer, /contacts).
  { id: "legal-en-contacts", path: "/en/contacts", status: 200, body: [new RegExp(SUPPORT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))], notBody: [PLACEHOLDER, WEB_PRICE] },
  { id: "legal-ru-contacts", path: "/ru/contacts", status: 200, notBody: [PLACEHOLDER, WEB_PRICE] },
  { id: "legal-en-offer", path: "/en/offer", status: 200, body: [/Terms of Use/], notBody: [PLACEHOLDER, WEB_PRICE] },
  { id: "legal-ru-offer", path: "/ru/offer", status: 200, body: [/Условия использования/], notBody: [PLACEHOLDER, WEB_PRICE] },
  { id: "legal-payment-offer", path: "/ru/offer/payment", status: 200, body: [/Публичная оферта/] },

  // CI smoke contract for launch topics (deploy.yml): market players on the NEW topic page.
  { id: "launch-topic-players", path: "/ru/segment/habit-tracking", status: 200, body: [/id="main-players"/] },

  // Legacy redirect stubs served in place should not drop visitors into the noindex archive.
  { id: "legacy-premium", level: "should", path: "/ru/premium", status: 307, notLocation: /\/old(\/|$)/ },
  { id: "legacy-catalog", level: "should", path: "/ru/catalog", status: 307, notLocation: /\/old(\/|$)/ },
  { id: "legacy-categories", level: "should", path: "/ru/categories", status: 307, notLocation: /\/old(\/|$)/ },
  { id: "legacy-segment-v2", level: "should", path: "/ru/segment/habit-tracking/v2", status: [307, 308], notLocation: /\/old(\/|$)/ },

  // In-place pages must not overwrite a de/fr/ja preference of the new site.
  { id: "cookie-keeps-de", level: "should", path: "/en/reviews", cookie: "locale=de", status: 200, noLocaleCookie: true },

  // Unmatched old URLs: branded 404 with a language, like production.
  { id: "old-404-branded", level: "should", path: "/ru/reviews/x/y/z", status: 404, body: [/<html[^>]*\blang="ru"/] },
];

async function run(check) {
  const headers = { "user-agent": "inapp-old-site-smoke/1", "accept-language": "ru" };
  if (check.cookie) headers.cookie = check.cookie;
  const res = await fetch(BASE + check.path, { redirect: "manual", headers });
  const body = res.status === 200 || res.status === 404 ? await res.text() : "";
  const location = res.headers.get("location") || "";
  const setCookie = res.headers.get("set-cookie") || "";
  const robots = res.headers.get("x-robots-tag") || "";
  const problems = [];
  const want = check.status === undefined ? null : [check.status].flat();
  if (want && !want.includes(res.status)) problems.push(`status ${res.status}, want ${want.join("|")}${location ? ` (→ ${location})` : ""}`);
  if (check.location && !check.location.test(location)) problems.push(`location "${location}" !~ ${check.location}`);
  if (check.notLocation && check.notLocation.test(location)) problems.push(`location "${location}" =~ ${check.notLocation}`);
  for (const re of check.body || []) if (!re.test(body)) problems.push(`body lacks ${re}`);
  for (const re of check.notBody || []) if (re.test(body)) problems.push(`body has ${re}`);
  if (check.noindex === true && !NOINDEX.test(robots)) problems.push("missing X-Robots-Tag noindex");
  if (check.noindex === false && NOINDEX.test(robots)) problems.push(`unexpected X-Robots-Tag "${robots}"`);
  if (check.noLocaleCookie && /(^|[,\s])locale=/.test(setCookie)) problems.push(`sets cookie "${setCookie.split(";")[0]}"`);
  return { id: check.id, path: check.path, level: check.level || "must", ok: problems.length === 0, problems };
}

const results = [];
for (const check of CHECKS) {
  try {
    results.push(await run(check));
  } catch (error) {
    results.push({ id: check.id, path: check.path, level: check.level || "must", ok: false, problems: [String(error)] });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ base: BASE, results }, null, 2));
} else {
  console.log(`old-site smoke against ${BASE}`);
  for (const r of results) {
    const tag = r.ok ? "PASS" : r.level === "must" ? "FAIL" : "WARN";
    console.log(`${tag}  ${r.id.padEnd(26)} ${r.path}${r.ok ? "" : `\n      ${r.problems.join("\n      ")}`}`);
  }
}
const failed = results.filter((r) => !r.ok && r.level === "must").length;
const warned = results.filter((r) => !r.ok && r.level !== "must").length;
if (!JSON_OUT) console.log(`\n${results.length - failed - warned} pass, ${failed} fail, ${warned} warn`);
process.exit(failed ? 1 : 0);
