#!/usr/bin/env node
/**
 * Post-deploy smoke suite for the new inapp.pro (site v2).
 * Contract: docs/site-v2/ARCHITECTURE.md §1 (URL map), §3 (proxy headers/cookies), §5.4 (CI
 * smoke parity), DECISIONS.md "Legal pages" (Apple-facing pages), spec 04 §7.6 (leak rules).
 *
 *   node scripts/v2/smoke.mjs [baseUrl=http://localhost:3210] [options]
 *
 * Dependency-free: Node 20+, global fetch, node:fs / node:path / node:url only.
 * Every request is a fresh guest (no cookie jar) with redirect: "manual".
 * Exit code: 0 = all checks passed (SKIPs allowed), 1 = at least one FAIL, 2 = bad usage.
 * Groups, options and the leak-check method: scripts/v2/smoke.README.md.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ───────────────────────────── configuration ─────────────────────────────

const LOCALES = ["ru", "en", "de", "fr", "ja"];
const OLD_LOCALES = ["ru", "en"];
const GROUPS = ["routes", "redirects", "old", "api", "markers", "apple", "leak"];
const UA = "inapp-smoke/1 (scripts/v2/smoke.mjs)";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// Leak matcher tuning (see README "Leak check").
const GRAM = 10; // hash-index window, in canonical chars (shorter probes use indexOf)
const MIN_LEN = 10; // shorter paid texts are not checked (too likely to occur by chance)
const MIN_LEN_CJK = 5; // Japanese is denser: 5 characters already carry meaning
const PROBE = 24; // long needles → aligned probes; any excerpt >= 2*PROBE-1 chars is always found
const PROBE_CJK = 12;
const MAX_POSITIONS = 64; // positions kept per gram hash before falling back to indexOf

const HELP = `Usage: node scripts/v2/smoke.mjs [baseUrl] [options]

  baseUrl                 default http://localhost:3210
  --only g1,g2            run only these groups (${GROUPS.join(", ")})
  --skip g1,g2            skip these groups
  --locales ru,en         locales for per-locale checks (default: all five)
  --no-leak               same as --skip leak
  --content DIR           content/v2 directory for the leak check
                          (default: <repo>/content/v2 next to this script)
  --ideas id1,id2,...     locked idea pages for the leak check (default: 10 picked from the manifest)
  --concurrency N         parallel requests (default 4)
  --timeout MS            per-request timeout (default 60000)
  --retries N             retries on network errors and 500/502/503/504 (default 2)
  --wait S                wait up to S seconds for the server to answer first (default 30)
  --all                   print every check, not only failures
  --json FILE             also write all results as JSON
  --self-test             offline tests of the parsers and the leak matcher, then exit
  -h, --help              this help`;

function parseArgs(argv) {
  const o = {
    base: "http://localhost:3210",
    only: null,
    skip: new Set(),
    locales: LOCALES,
    content: null,
    ideas: null,
    concurrency: 4,
    timeout: 60_000,
    retries: 2,
    all: false,
    json: null,
    wait: 30,
    selfTest: false,
  };
  const list = (v) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.startsWith("--") ? a.indexOf("=") : -1;
    const key = eq > 0 ? a.slice(0, eq) : a;
    const val = () => {
      if (eq > 0) return a.slice(eq + 1);
      const v = argv[++i];
      if (v === undefined) usage(`${key} needs a value`);
      return v;
    };
    switch (key) {
      case "-h":
      case "--help":
        console.log(HELP);
        process.exit(0);
        break;
      case "--only":
        o.only = new Set(list(val()));
        break;
      case "--skip":
        for (const g of list(val())) o.skip.add(g);
        break;
      case "--no-leak":
        o.skip.add("leak");
        break;
      case "--locales":
        o.locales = list(val());
        break;
      case "--content":
        o.content = path.resolve(val());
        break;
      case "--ideas":
        o.ideas = list(val());
        break;
      case "--concurrency":
        o.concurrency = Math.max(1, Number.parseInt(val(), 10) || 1);
        break;
      case "--timeout":
        o.timeout = Math.max(1000, Number.parseInt(val(), 10) || 60_000);
        break;
      case "--retries":
        o.retries = Math.max(0, Number.parseInt(val(), 10) || 0);
        break;
      case "--all":
        o.all = true;
        break;
      case "--wait":
        o.wait = Math.max(0, Number.parseInt(val(), 10) || 0);
        break;
      case "--self-test":
        o.selfTest = true;
        break;
      case "--json":
        o.json = path.resolve(val());
        break;
      default:
        if (a.startsWith("-")) usage(`unknown option ${a}`);
        o.base = a;
    }
  }
  try {
    const u = new URL(o.base);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("not http(s)");
    o.base = u.origin + u.pathname.replace(/\/+$/, "");
  } catch {
    usage(`baseUrl must be an http(s) URL, got ${o.base}`);
  }
  for (const g of [...(o.only ?? []), ...o.skip]) if (!GROUPS.includes(g)) usage(`unknown group ${g}`);
  for (const l of o.locales) if (!LOCALES.includes(l)) usage(`unknown locale ${l}`);
  return o;
}

function usage(msg) {
  console.error(`smoke: ${msg}\n\n${HELP}`);
  process.exit(2);
}

const opts = parseArgs(process.argv.slice(2));
const BASE = opts.base;
const BASE_ORIGIN = new URL(BASE).origin;
const enabled = (g) => !opts.selfTest && (!opts.only || opts.only.has(g)) && !opts.skip.has(g);
const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const color = (code) => (s) => (TTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const red = color("31");
const green = color("32");
const yellow = color("33");
const dim = color("2");
const bold = color("1");

// ───────────────────────────── HTTP ─────────────────────────────

const RETRY_STATUS = new Set([500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();
let requestCount = 0;

/** "fetch failed" alone says nothing: dig out ECONNREFUSED / ETIMEDOUT / TimeoutError. */
function errorCause(err) {
  const c = err?.cause;
  return c?.code || c?.errors?.[0]?.code || c?.message || (err?.name && err.name !== "TypeError" ? err.name : "") || "";
}

/** Path (+query) of a Location header when it points at the base origin; the full URL otherwise. */
function locationPath(location) {
  if (!location) return null;
  try {
    const u = new URL(location, BASE + "/");
    return u.origin === BASE_ORIGIN ? u.pathname + u.search : u.href;
  } catch {
    return location;
  }
}

/**
 * One request, never following redirects. Retries network errors and 500/502/503/504 (a server
 * restarting after a deploy, a dev server recompiling). GETs are memoized per URL + headers.
 */
function http(p, { method = "GET", headers = {}, body } = {}) {
  const url = BASE + p;
  const key = method === "GET" ? `${url}\n${JSON.stringify(Object.entries(headers).sort())}` : null;
  if (key && cache.has(key)) return cache.get(key);
  const run = (async () => {
    let last;
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      if (attempt) await sleep(1500 * attempt);
      const t0 = performance.now();
      try {
        requestCount++;
        const res = await fetch(url, {
          method,
          headers: { "user-agent": UA, ...headers },
          body,
          redirect: "manual",
          signal: AbortSignal.timeout(opts.timeout),
        });
        const buf = Buffer.from(await res.arrayBuffer());
        last = {
          url,
          path: p,
          status: res.status,
          headers: res.headers,
          location: locationPath(res.headers.get("location")),
          setCookie: typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") ?? ""],
          buf,
          text: buf.toString("utf8"),
          ms: Math.round(performance.now() - t0),
          attempts: attempt + 1,
          error: null,
        };
        if (!RETRY_STATUS.has(res.status)) return last;
      } catch (err) {
        const cause = errorCause(err);
        last = {
          url,
          path: p,
          status: 0,
          headers: new Headers(),
          location: null,
          setCookie: [],
          buf: Buffer.alloc(0),
          text: "",
          ms: Math.round(performance.now() - t0),
          attempts: attempt + 1,
          error: `${err?.message ?? err}${cause ? ` (${cause})` : ""}`,
        };
      }
    }
    return last;
  })();
  if (key) cache.set(key, run);
  return run;
}

const statusLine = (r) => (r.error ? `ERR ${r.error}` : `${r.status}${r.location ? ` → ${r.location}` : ""}`);
const header = (r, name) => r.headers.get(name) ?? "";
const localeCookieOf = (r) => {
  for (const c of r.setCookie) {
    const m = /(?:^|[;,]\s*)locale=([^;,\s]*)/.exec(c);
    if (m) return m[1];
  }
  return null;
};

// ───────────────────────────── checks registry ─────────────────────────────

/** @type {{group:string,name:string,run:()=>Promise<object>}[]} */
const checks = [];
const add = (group, name, run) => {
  if (enabled(group)) checks.push({ group, name, run });
};

/** Status (+ Location) expectation → failures. */
function expectStatus(r, status, location) {
  const fails = [];
  if (r.error) return [`request failed: ${r.error}`];
  if (r.status !== status) fails.push(`status ${r.status}, expected ${status}`);
  if (location !== undefined && r.location !== location) fails.push(`Location ${r.location ?? "(none)"}, expected ${location}`);
  return fails;
}

/** A NEW-site page served to a guest: 200 HTML, <html lang=L>, new root layout, locale cookie. */
function expectNewPage(r, L) {
  const fails = expectStatus(r, 200);
  if (fails.length) return fails;
  const ct = header(r, "content-type");
  if (!ct.includes("text/html")) fails.push(`content-type ${ct || "(none)"}, expected text/html`);
  const lang = /<html\b[^>]*\blang="([^"]*)"/i.exec(r.text)?.[1];
  if (lang !== L) fails.push(`<html lang="${lang ?? "?"}">, expected "${L}"`);
  if (r.text.includes("data-old-site-banner")) fails.push("rendered by the OLD root layout (data-old-site-banner present)");
  const cookie = localeCookieOf(r);
  if (cookie !== L) fails.push(`Set-Cookie locale=${cookie ?? "(none)"}, expected ${L} (ARCHITECTURE §3)`);
  return fails;
}

// ── routes: every new route of ARCHITECTURE §1, all five locales ──

const NEW_ROUTES = [
  { p: "" },
  { p: "segment" },
  { p: "segment/interior-design" },
  { p: "segment/habit-tracking" },
  { p: "ideas" },
  { p: "ideas/interior-design-1" },
  { p: "ideas/habit-tracking-1" },
  { p: "saved" },
  { p: "settings" },
  { p: "settings/about" },
  { p: "plus" },
  { p: "welcome" },
  { p: "login" },
  // Payment return page; without ?checkout the old "library" meaning is gone → Saved (spec 09 §2.1).
  { p: "library", status: 307, location: (L) => `/${L}/saved` },
  { p: `library?checkout=${ZERO_UUID}` },
  { p: "contacts" },
  { p: "offer" },
  { p: "offer/payment" },
  { p: "privacy" },
];

for (const L of opts.locales) {
  for (const route of NEW_ROUTES) {
    const p = `/${L}${route.p ? `/${route.p}` : ""}`;
    add("routes", `GET ${p}`, async () => {
      const r = await http(p);
      if (route.status) {
        const loc = route.location(L);
        return { expected: `${route.status} → ${loc}`, actual: statusLine(r), fails: expectStatus(r, route.status, loc) };
      }
      return { expected: `200 new site, lang=${L}`, actual: `${statusLine(r)} ${r.ms}ms`, fails: expectNewPage(r, L) };
    });
  }
}

// ── redirects: negotiation, aliases, de/fr/ja → en for old pages, archive entry points ──

const REDIRECTS = [
  // "/" → negotiated locale: cookie → Accept-Language (exact, base, q-order) → en (spec 09 §2.2)
  { p: "/", h: { "accept-language": "*" }, s: 307, to: "/en", why: "no preference → en" },
  { p: "/", h: { "accept-language": "ru-RU,ru;q=0.9,en;q=0.8" }, s: 307, to: "/ru" },
  { p: "/", h: { "accept-language": "de-AT,de;q=0.9" }, s: 307, to: "/de", why: "base language" },
  { p: "/", h: { "accept-language": "fr-CA" }, s: 307, to: "/fr" },
  { p: "/", h: { "accept-language": "ja-JP,ja;q=0.9" }, s: 307, to: "/ja" },
  { p: "/", h: { "accept-language": "zh-CN,zh;q=0.9" }, s: 307, to: "/en", why: "unsupported → en" },
  { p: "/", h: { "accept-language": "ru;q=0.5,de;q=0.9" }, s: 307, to: "/de", why: "q-order" },
  { p: "/", h: { cookie: "locale=ja", "accept-language": "ru" }, s: 307, to: "/ja", why: "cookie wins" },
  { p: "/?utm_source=smoke", h: { "accept-language": "en" }, s: 307, to: "/en?utm_source=smoke", why: "query kept" },
  // bare paths get the negotiated locale, straight to the final target (one hop)
  { p: "/segment/habit-tracking", h: { "accept-language": "de" }, s: 307, to: "/de/segment/habit-tracking" },
  { p: "/segment/qr-scanner", h: { "accept-language": "de" }, s: 307, to: "/en/segment/qr-scanner", why: "old topic, one hop" },
  { p: "/ideas/habit-tracking-1", h: { cookie: "locale=fr" }, s: 307, to: "/fr/ideas/habit-tracking-1" },
  // archive entry points
  { p: "/old", h: { "accept-language": "ru" }, s: 307, to: "/ru/old" },
  { p: "/old", h: { "accept-language": "de" }, s: 307, to: "/en/old", why: "old site is ru/en only" },
  { p: "/old/en/segment", s: 307, to: "/en/old/segment" },
  { p: "/old/de/segment", s: 307, to: "/en/old/segment" },
  // the new site's internal tree is never reachable from a public URL
  { p: "/en/site/en/segment", s: 404 },
  { p: "/ru/old/site/ru", s: 404 },
];
for (const L of opts.locales) {
  REDIRECTS.push(
    { p: `/${L}/research`, s: 308, to: `/${L}/segment` },
    { p: `/${L}/research/habit-tracking`, s: 308, to: `/${L}/segment/habit-tracking` },
    { p: `/${L}/search?q=habit`, s: 308, to: `/${L}/segment?q=habit` },
    { p: `/${L}/segment/habit-tracking/v2`, s: 308, to: `/${L}/segment/habit-tracking` },
  );
  if (!OLD_LOCALES.includes(L)) {
    REDIRECTS.push(
      { p: `/${L}/segment/qr-scanner`, s: 307, to: `/en/segment/qr-scanner`, why: "non-launch topic" },
      { p: `/${L}/ideas/top`, s: 307, to: `/en/ideas/top` },
      { p: `/${L}/mcp`, s: 307, to: `/en/mcp` },
      { p: `/${L}/old`, s: 307, to: `/en/old` },
    );
  }
}
for (const rd of REDIRECTS) {
  const hdrs = rd.h ?? {};
  const label = Object.entries(hdrs).map(([k, v]) => `${k === "accept-language" ? "AL" : k}: ${v}`).join("; ");
  add("redirects", `GET ${rd.p}${label ? ` [${label}]` : ""}${rd.why ? ` (${rd.why})` : ""}`, async () => {
    const r = await http(rd.p, { headers: hdrs });
    return {
      expected: rd.to ? `${rd.s} → ${rd.to}` : String(rd.s),
      actual: statusLine(r),
      fails: expectStatus(r, rd.s, rd.to),
    };
  });
}

// ── old: the archive, in-place old pages, CI parity (.github/workflows/deploy.yml) ──

function expectOld(r, { noindex, banner, contains = [], cookie }) {
  const fails = expectStatus(r, 200);
  if (fails.length) return fails;
  const robots = header(r, "x-robots-tag");
  if (noindex === true && !/noindex/i.test(robots)) fails.push(`X-Robots-Tag "${robots || "(none)"}", expected noindex`);
  if (noindex === false && /noindex/i.test(robots)) fails.push(`X-Robots-Tag "${robots}" on an in-place page (must stay indexable)`);
  if (banner && !r.text.includes(`data-old-site-banner="${banner}"`)) fails.push(`no data-old-site-banner="${banner}"`);
  for (const s of contains) if (!r.text.includes(s)) fails.push(`body lacks ${JSON.stringify(s)}`);
  if (cookie === false && localeCookieOf(r) !== null) fails.push(`Set-Cookie locale=${localeCookieOf(r)} (the archive must not write it)`);
  return fails;
}
const OLD_PAGES = [
  { p: "/ru/old", noindex: true, banner: "old", cookie: false },
  { p: "/en/old", noindex: true, banner: "old", cookie: false },
  { p: "/ru/old/segment/habit-tracking", noindex: true, banner: "old", cookie: false },
  { p: "/ru/segment/qr-scanner", noindex: false, banner: "inplace", contains: ["Скоро обновление"], why: "soon banner" },
  { p: "/en/segment/qr-scanner", noindex: false, banner: "inplace", contains: ["Update coming soon"], why: "soon banner" },
  { p: "/ru/mcp", contains: ["list_niche_themes"] },
  { p: "/ru/tokens", contains: ["990"] },
];
for (const o of OLD_PAGES) {
  const what = [o.noindex ? "noindex" : null, o.banner ? `banner=${o.banner}` : null, ...(o.contains ?? []).map((s) => `"${s}"`)].filter(Boolean);
  add("old", `GET ${o.p}${o.why ? ` (${o.why})` : ""}`, async () => {
    const r = await http(o.p);
    return { expected: `200 ${what.join(", ")}`.trim(), actual: statusLine(r), fails: expectOld(r, o) };
  });
}
// Retired experiments stay 404 in both locales, in place and inside /old (CI parity).
for (const L of OLD_LOCALES) {
  for (const rest of ["aso", "workspace", "workspace/habit-tracking"]) {
    for (const prefix of [`/${L}`, `/${L}/old`]) {
      const p = `${prefix}/${rest}`;
      add("old", `GET ${p} (retired)`, async () => {
        const r = await http(p);
        return { expected: "404", actual: statusLine(r), fails: expectStatus(r, 404) };
      });
    }
  }
}

// ── api ──

add("api", "GET /api/me (guest)", async () => {
  const r = await http("/api/me");
  const fails = expectStatus(r, 200);
  let actual = statusLine(r);
  if (!fails.length) {
    try {
      const j = JSON.parse(r.text);
      actual += ` user=${JSON.stringify(j.user)} plus=${JSON.stringify(j.plus)}`;
      if (j.user !== null) fails.push("user is not null for a guest");
      if (j.plus !== false) fails.push("plus is not false for a guest");
    } catch {
      fails.push(`not JSON: ${r.text.slice(0, 80)}`);
    }
  }
  return { expected: '200 JSON {"user":null,"plus":false}', actual, fails };
});
add("api", "GET /.well-known/oauth-authorization-server", async () => {
  const r = await http("/.well-known/oauth-authorization-server");
  const fails = expectStatus(r, 200);
  if (!fails.length) {
    try {
      JSON.parse(r.text);
    } catch {
      fails.push("not JSON");
    }
    if (!r.text.includes('"refresh_token"')) fails.push('lacks "refresh_token"');
  }
  return { expected: '200 JSON with "refresh_token"', actual: statusLine(r), fails };
});
add("api", "POST /api/mcp initialize (no token)", async () => {
  const r = await http("/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "1" } },
    }),
  });
  const fails = expectStatus(r, 401);
  if (!r.error && !r.text.includes("authorization_required")) fails.push("body lacks authorization_required");
  return { expected: "401 authorization_required", actual: statusLine(r), fails };
});
add("api", "GET /api/pay/status (guest)", async () => {
  const r = await http(`/api/pay/status?checkout=${ZERO_UUID}`);
  return { expected: "401", actual: statusLine(r), fails: expectStatus(r, 401) };
});

// ── markers: CI smoke parity + Apple-facing page identity ──

const PLAYER_TOPICS = [
  ["language-learning", "new"],
  ["workout-fitness", "new"],
  ["habit-tracking", "new"],
  ["ai-avatars-headshots", "old in place"],
  ["cosmetics-ingredient-checker", "old in place"],
];
for (const L of OLD_LOCALES.filter((l) => opts.locales.includes(l))) {
  for (const [slug, kind] of PLAYER_TOPICS) {
    const p = `/${L}/segment/${slug}`;
    add("markers", `GET ${p} market players (${kind})`, async () => {
      const r = await http(p);
      const fails = expectStatus(r, 200);
      if (!fails.length) {
        if (!r.text.includes('id="main-players"')) fails.push('lacks id="main-players"');
        if (!r.text.includes("/badges/app-store.svg")) fails.push("lacks /badges/app-store.svg");
      }
      return { expected: '200 id="main-players" + /badges/app-store.svg', actual: statusLine(r), fails };
    });
  }
}
for (const [p, marker] of [
  ["/en/offer", "Terms of Use"],
  ["/en/contacts", "inApp Support"],
]) {
  add("markers", `GET ${p} contains "${marker}"`, async () => {
    const r = await http(p);
    const fails = expectStatus(r, 200);
    if (!fails.length && !decodeEntities(r.text).includes(marker)) fails.push(`lacks "${marker}"`);
    return { expected: `200 "${marker}"`, actual: statusLine(r), fails };
  });
}

// ── apple: no web prices / web payment methods on Apple-facing pages ──

const FORBIDDEN = [
  // "990" but not RSC row ids / references ("$990", "$L990", "990:") or longer numbers
  ["990", /(?<![\w$@.])990(?![\w:])/g],
  ["₽", /₽/g],
  ["ЮKassa", /ЮKassa/gi],
  ["YooKassa", /YooKassa/gi],
  ["Telegram Stars", /Telegram\s+Stars/gi],
  ["/tokens", /\/tokens(?![\w.-])/g],
  ["offer/payment", /offer\/payment/g],
];
for (const p of ["/en", "/en/offer", "/en/contacts", "/ru/offer", "/ru/contacts"]) {
  add("apple", `GET ${p} forbidden strings`, async () => {
    const r = await http(p);
    const fails = expectStatus(r, 200);
    const expected = `200, none of ${FORBIDDEN.map(([n]) => n).join(" | ")}`;
    if (fails.length) return { expected, actual: statusLine(r), fails };
    const page = parseHtml(r.text);
    const views = [
      { view: "visible text", text: page.text },
      { view: "attributes", text: page.attrs.join("\n") },
      { view: "scripts", text: page.scripts.join("\n") },
      ...flightParts(parseFlight(page.flight), "flight").map((f) => ({ view: f.debug ? "flight (dev debug info)" : "flight (RSC payload)", text: f.raw, row: f.row })),
    ];
    const found = [];
    const details = [];
    for (const [name, re] of FORBIDDEN) {
      const where = new Map();
      for (const v of views) {
        for (const m of v.text.matchAll(re)) {
          where.set(v.view, (where.get(v.view) ?? 0) + 1);
          if (details.length < 12) {
            const ctx = v.text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50).replace(/\s+/g, " ");
            details.push(`${name} in ${v.view}${v.row ? ` row ${v.row}` : ""}: …${ctx}…`);
          }
        }
      }
      if (where.size) found.push(`${name} ×${[...where.values()].reduce((a, b) => a + b, 0)} (${[...where.keys()].join(", ")})`);
    }
    for (const f of found) fails.push(`forbidden ${f}`);
    return { expected, actual: found.length ? found.join("; ") : "clean", fails, details };
  });
}

// ───────────────────────────── leak check machinery ─────────────────────────────

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0", shy: "\u00AD", laquo: "\u00AB",
  raquo: "\u00BB", ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019", bdquo: "\u201E",
  sbquo: "\u201A", ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", thinsp: "\u2009", ensp: "\u2002",
  emsp: "\u2003", middot: "\u00B7", times: "\u00D7", copy: "\u00A9", reg: "\u00AE", trade: "\u2122",
  euro: "\u20AC", deg: "\u00B0", bull: "\u2022", zwj: "\u200D", zwnj: "\u200C",
};
function decodeEntities(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    return NAMED_ENTITIES[e] ?? NAMED_ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Canonical text for matching: NFC, lower case, invisible characters dropped, quote/dash/ellipsis
 * variants unified and ALL whitespace removed (NBSP→space, the 430/360 reflow into <p> chunks,
 * tag boundaries and "<!-- -->" text separators then no longer matter). Applied to both sides.
 */
function canon(s) {
  return s
    .normalize("NFC")
    .toLowerCase()
    // soft hyphen, combining grapheme joiner, bidi marks, zero-width chars, word joiner, BOM
    .replace(/[\u00AD\u034F\u061C\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    // quotes: « » „ “ ” ‟ ″ " ' ‘ ’ ‚ ‛ ′ ‹ › 「 」 『 』
    .replace(/[\u00AB\u00BB\u201E\u201C\u201D\u201F\u2033"'\u2018\u2019\u201A\u201B\u2032\u2039\u203A\u300C\u300D\u300E\u300F]/g, '"')
    // dashes: ‐ ‑ ‒ – — ― −
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, "");
}

// Rolling polynomial hash over GRAM-char windows (exact verification on every hit).
const MOD = 2147483647;
const HB = 65599;
const HIGH = (() => {
  let p = 1;
  for (let i = 0; i < GRAM - 1; i++) p = (p * HB) % MOD;
  return p;
})();
function gramHash(s, start = 0) {
  let h = 0;
  for (let i = start; i < start + GRAM; i++) h = (h * HB + s.charCodeAt(i)) % MOD;
  return h;
}

/** Positions of every GRAM-length window of a string, keyed by hash. */
class GramIndex {
  constructor(s) {
    this.s = s;
    this.map = new Map();
    if (s.length < GRAM) return;
    let h = gramHash(s, 0);
    for (let i = 0; ; i++) {
      const cur = this.map.get(h);
      if (cur === undefined) this.map.set(h, i);
      else if (typeof cur === "number") this.map.set(h, [cur, i]);
      else if (cur.length < MAX_POSITIONS) cur.push(i);
      else cur.overflow = true;
      const j = i + GRAM;
      if (j >= s.length) break;
      h = (h - ((s.charCodeAt(i) * HIGH) % MOD) + MOD) % MOD;
      h = (h * HB + s.charCodeAt(j)) % MOD;
    }
  }
  /** Exact start positions of `needle` (h = hash of its first GRAM chars), up to limit. */
  find(needle, h, limit = 1) {
    if (needle.length < GRAM) return this.scan(needle, limit);
    const cur = this.map.get(h);
    if (cur === undefined) return [];
    const out = [];
    const list = typeof cur === "number" ? [cur] : cur;
    for (const p of list) {
      if (this.s.startsWith(needle, p)) {
        out.push(p);
        if (out.length >= limit) return out;
      }
    }
    if (typeof cur !== "number" && cur.overflow && out.length === 0) return this.scan(needle, limit);
    return out;
  }
  scan(needle, limit) {
    const out = [];
    let p = this.s.indexOf(needle);
    while (p !== -1 && out.length < limit) {
      out.push(p);
      p = this.s.indexOf(needle, p + 1);
    }
    return out;
  }
}

const CJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/g;
const isCjk = (c) => (c.match(CJK)?.length ?? 0) * 3 >= c.length;
const minLen = (c) => (isCjk(c) ? MIN_LEN_CJK : MIN_LEN);

/** Aligned probes: short needles are one probe; long ones every PROBE chars plus the tail. */
function probesOf(c) {
  if (!c || c.length < minLen(c)) return [];
  const size = isCjk(c) ? PROBE_CJK : PROBE;
  const mk = (s) => ({ s, h: s.length >= GRAM ? gramHash(s) : -1 });
  if (c.length <= size) return [mk(c)];
  const out = [];
  for (let i = 0; i + size <= c.length; i += size) out.push(c.slice(i, i + size));
  if (c.length % size) out.push(c.slice(c.length - size));
  return out.map(mk);
}

/** String leaves of a JSON value (RSC references "$…" dropped, "$$" unescaped). */
function leaves(v, out = [], withKeys = false) {
  if (typeof v === "string") {
    if (!v.startsWith("$")) out.push(v);
    else if (v.startsWith("$$")) out.push(v.slice(1));
  } else if (Array.isArray(v)) {
    for (const x of v) leaves(x, out, withKeys);
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (withKeys) out.push(k);
      leaves(x, out, withKeys);
    }
  }
  return out;
}

const SKIP_ATTRS = new Set([
  "class", "style", "d", "srcset", "sizes", "viewbox", "points", "transform", "xmlns", "xmlns:xlink",
  "integrity", "nonce", "precedence", "data-precedence", "width", "height", "fill", "stroke",
  "stroke-width", "stroke-linecap", "stroke-linejoin", "cx", "cy", "r", "x", "y", "x1", "x2", "y1", "y2",
]);

/** HTML → visible text, attribute values, non-flight scripts, and the inline RSC (flight) bytes. */
function parseHtml(html) {
  const scripts = [];
  const flight = [];
  let body = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_, attrs, content) => {
    const push = /^\s*self\.__next_f\.push\(([\s\S]*)\)\s*;?\s*$/.exec(content);
    if (push) {
      try {
        const arr = JSON.parse(push[1]);
        if (arr[0] === 1 && typeof arr[1] === "string") flight.push(Buffer.from(arr[1], "utf8"));
        else if (arr[0] === 3 && typeof arr[1] === "string") flight.push(Buffer.from(arr[1], "base64"));
        return " ";
      } catch {
        /* not a flight chunk after all: keep as a script */
      }
    }
    if (/^\s*\(self\.__next_f\s*=/.test(content)) return " ";
    let text = content;
    if (/type\s*=\s*["']?application\/(ld\+)?json/i.test(attrs)) {
      try {
        text = leaves(JSON.parse(content)).join("\n");
      } catch {
        /* raw */
      }
    }
    if (text.trim()) scripts.push(text);
    return " ";
  });
  body = body.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ").replace(/<!--[\s\S]*?-->/g, "");
  const attrs = [];
  const text = body.replace(/<[^>]*>/g, (tag) => {
    for (const m of tag.matchAll(/([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (SKIP_ATTRS.has(m[1].toLowerCase())) continue;
      const v = m[2] ?? m[3] ?? "";
      if (v) attrs.push(decodeEntities(v));
    }
    return " ";
  });
  return { text: decodeEntities(text), attrs, scripts, flight: Buffer.concat(flight) };
}

const BINARY_TAGS = new Set([..."TAOoUSsLlGgMmVb"].map((c) => c.charCodeAt(0)));
const hexVal = (b) => (b >= 48 && b <= 57 ? b - 48 : b >= 97 && b <= 102 ? b - 87 : b >= 65 && b <= 70 ? b - 55 : -1);

/** React Flight stream → rows {id, tag, raw, leaves}. Handles length-prefixed T/binary rows. */
function parseFlight(buf) {
  const rows = [];
  let i = 0;
  const n = buf.length;
  while (i < n) {
    if (buf[i] === 0x0a) {
      i++;
      continue;
    }
    const colon = buf.indexOf(0x3a, i);
    if (colon < 0) break;
    const id = buf.toString("latin1", i, colon);
    if (!/^[0-9a-f]{1,10}$/i.test(id)) {
      const nl = buf.indexOf(0x0a, i);
      if (nl < 0) break;
      i = nl + 1;
      continue;
    }
    let j = colon + 1;
    const tag = buf[j];
    if (BINARY_TAGS.has(tag)) {
      let k = j + 1;
      let len = 0;
      let digits = 0;
      while (k < n && hexVal(buf[k]) >= 0) {
        len = len * 16 + hexVal(buf[k]);
        k++;
        digits++;
      }
      if (digits && buf[k] === 0x2c) {
        const start = k + 1;
        const end = Math.min(n, start + len);
        const t = String.fromCharCode(tag);
        const text = t === "T" ? buf.toString("utf8", start, end) : "";
        rows.push({ id, tag: t, raw: text, leaves: text });
        i = end;
        continue;
      }
    }
    let t = "";
    if ((tag >= 65 && tag <= 90) || tag === 35 || tag === 114 || tag === 120) {
      t = String.fromCharCode(tag);
      j++;
    }
    const nl = buf.indexOf(0x0a, j);
    const end = nl < 0 ? n : nl;
    const raw = buf.toString("utf8", j, end);
    let value;
    let parsed = true;
    try {
      value = JSON.parse(raw);
    } catch {
      try {
        value = JSON.parse(raw.replace(/^[A-Za-z]+/, ""));
      } catch {
        parsed = false;
      }
    }
    rows.push({ id, tag: t, raw, leaves: parsed ? leaves(value).join("") : raw });
    i = end + 1;
  }
  return rows;
}

/**
 * Flight rows → haystack parts. Import/hint rows are skipped. Rows that are React dev debug info
 * (D rows, the component-info objects they reference) are flagged: they exist only in `next dev`
 * payloads, but paid text there still means paid data was loaded and passed down for a guest.
 */
function flightParts(rows, prefix) {
  const debugIds = new Set();
  for (const r of rows) if (r.tag === "D") for (const m of r.raw.matchAll(/"\$([0-9a-f]+)"/g)) debugIds.add(m[1]);
  return rows
    .filter((r) => r.tag !== "I" && r.tag !== "H")
    .map((r) => ({
      view: prefix,
      row: `${r.id}${r.tag ? `:${r.tag}` : ""}`,
      debug: r.tag === "D" || r.tag === "W" || debugIds.has(r.id) || /^\{"name":"[^"]*","env":/.test(r.raw),
      raw: r.raw,
      text: r.leaves,
    }));
}

/** Canonical haystack of a page (HTML views + inline flight [+ RSC payload]) with its segments. */
function buildHaystack(parts) {
  const segs = [];
  const chunks = [];
  let pos = 0;
  for (const p of parts) {
    const c = canon(p.text);
    if (!c) continue;
    segs.push({ start: pos, end: pos + c.length, view: p.view, row: p.row, debug: !!p.debug });
    chunks.push(c);
    pos += c.length + 1;
  }
  const s = chunks.join("\u0001");
  return { s, segs, index: new GramIndex(s) };
}
function segAt(hay, pos) {
  let lo = 0;
  let hi = hay.segs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const sg = hay.segs[mid];
    if (pos < sg.start) hi = mid - 1;
    else if (pos >= sg.end) lo = mid + 1;
    else return sg;
  }
  return null;
}
/** Where (which views) a needle occurs; null when none of its probes is present. */
function locate(hay, probes, limit = 32) {
  let hit = null;
  for (const p of probes) {
    const positions = hay.index.find(p.s, p.h, limit);
    if (!positions.length) continue;
    hit ??= { views: new Set(), rows: new Set(), debugOnly: true };
    for (const x of positions) {
      const sg = segAt(hay, x);
      if (!sg) continue;
      hit.views.add(sg.debug ? `${sg.view} (dev debug info)` : sg.view);
      if (sg.row) hit.rows.add(`${sg.view}#${sg.row}`);
      if (!sg.debug) hit.debugOnly = false;
    }
    if (!hit.debugOnly) break;
  }
  return hit;
}

// ───────────────────────────── leak check: content ─────────────────────────────

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const pushAll = (arr, items) => {
  for (const x of items) arr.push(x);
};
const splitParas = (s) => (typeof s === "string" ? s.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : []);

/**
 * Loads content/v2 and builds:
 *  - needles: every PAID text (cards.json paid entries, research/<c>.json of paid topics,
 *    ideas/<slug>.json of paid ideas), deduplicated across locales;
 *  - a public corpus (catalog, onboarding, ui, the free topic, the free ideas and their cards)
 *    so that paid-looking text that is also published on purpose is never reported;
 *  - positive controls (free texts that MUST be visible) for the detector self-test.
 */
function loadLeakContent(dir) {
  const manifest = readJson(path.join(dir, "manifest.json"));
  const freeCategory = manifest.free?.category ?? "interior-design";
  const freeIdeas = new Set(manifest.free?.ideas ?? []);
  const publicTexts = [];
  const byCanon = new Map();
  const perLocale = {};
  let skippedShort = 0;

  const needle = (kind, L, ref, text) => {
    for (const para of splitParas(text)) {
      const c = canon(para);
      if (c.length < minLen(c)) {
        skippedShort++;
        continue;
      }
      const prev = byCanon.get(c);
      if (prev) {
        prev.refs.push(`${L}/${ref}`);
        continue;
      }
      byCanon.set(c, { kind, refs: [`${L}/${ref}`], text: para, canon: c });
    }
  };

  for (const L of opts.locales) {
    const ld = path.join(dir, L);
    const cards = readJson(path.join(ld, "cards.json")).ideas ?? {};
    const controls = { research: [], idea: [] };
    perLocale[L] = { cards, controls };

    for (const f of ["catalog.json", "onboarding.json"]) pushAll(publicTexts, leaves(readJson(path.join(ld, f))));
    pushAll(publicTexts, leaves(readJson(path.join(ld, "ui.json")), [], true));

    for (const [slug, card] of Object.entries(cards)) {
      if (freeIdeas.has(slug)) {
        publicTexts.push(card.title ?? "", card.description ?? "");
        continue;
      }
      needle("card-title", L, `cards.json#${slug}.title`, card.title);
      needle("card-desc", L, `cards.json#${slug}.description`, card.description);
    }

    const rdir = path.join(ld, "research");
    for (const f of readdirSync(rdir).filter((x) => x.endsWith(".json")).sort()) {
      const r = readJson(path.join(rdir, f));
      const slug = r.category ?? f.replace(/\.json$/, "");
      const isFree = slug === freeCategory || r.free === true;
      if (isFree) {
        pushAll(publicTexts, leaves(r));
        controls.research.push(r.lead, ...(r.sections ?? []).flatMap((s) => (s.observations ?? []).flatMap((o) => o.passages ?? [])));
        continue;
      }
      // Public per locked topic: name, summary, cover (spec 04 §5.6).
      publicTexts.push(r.name ?? "", r.summary ?? "", r.cover?.alt ?? "");
      const ref = `research/${f}`;
      needle("research-para", L, `${ref}#lead`, r.lead);
      (r.audiences ?? []).forEach((a, i) => {
        needle("research-heading", L, `${ref}#audiences[${i}].title`, a.title);
        needle("research-para", L, `${ref}#audiences[${i}].body`, a.body);
      });
      const placement = (pl, at) => {
        needle("research-heading", L, `${ref}#${at}.title`, pl.title);
        needle("research-para", L, `${ref}#${at}.body`, pl.body);
      };
      (r.sections ?? []).forEach((s, i) => {
        needle("research-heading", L, `${ref}#sections[${i}].title`, s.title);
        needle("research-para", L, `${ref}#sections[${i}].intro`, s.intro);
        (s.observations ?? []).forEach((o, j) => {
          const at = `sections[${i}].observations[${j}]`;
          needle("research-heading", L, `${ref}#${at}.title`, o.title);
          (o.passages ?? []).forEach((p, k) => needle("research-para", L, `${ref}#${at}.passages[${k}]`, p));
          (o.quotes ?? []).forEach((q, k) => needle("research-quote", L, `${ref}#${at}.quotes[${k}]`, q.text));
          (o.placements ?? []).forEach((pl, k) => placement(pl, `${at}.placements[${k}]`));
        });
      });
      (r.remainingDirections ?? []).forEach((pl, k) => placement(pl, `remainingDirections[${k}]`));
      if (r.conclusion) {
        needle("research-heading", L, `${ref}#conclusion.title`, r.conclusion.title);
        needle("research-para", L, `${ref}#conclusion.body`, r.conclusion.body);
      }
    }

    const idir = path.join(ld, "ideas");
    for (const f of readdirSync(idir).filter((x) => x.endsWith(".json")).sort()) {
      const idea = readJson(path.join(idir, f));
      const slug = idea.slug ?? f.replace(/\.json$/, "");
      if (freeIdeas.has(slug)) {
        pushAll(publicTexts, leaves(idea));
        if (slug === [...freeIdeas][0]) controls.idea.push(idea.title, idea.description);
        continue;
      }
      publicTexts.push(idea.categoryName ?? "");
      const ref = `ideas/${f}`;
      needle("idea-body", L, `${ref}#title`, idea.title);
      needle("idea-body", L, `${ref}#description`, idea.description);
      (idea.blocks ?? []).forEach((b, i) => {
        if (b.kind === "quote") needle("idea-quote", L, `${ref}#blocks[${i}]`, b.quote?.text);
        else if (b.kind === "idea") {
          needle("idea-body", L, `${ref}#blocks[${i}].title`, b.title);
          needle("idea-body", L, `${ref}#blocks[${i}].text`, b.text);
        } else needle("idea-body", L, `${ref}#blocks[${i}]`, b.text);
      });
    }
  }

  // Drop every probe that is also public; a needle with no private probe left is not a secret.
  const pub = new GramIndex(publicTexts.map(canon).join("\u0001"));
  const needles = [];
  let publicExcluded = 0;
  let probeCount = 0;
  for (const n of byCanon.values()) {
    const probes = probesOf(n.canon).filter((p) => pub.find(p.s, p.h).length === 0);
    if (!probes.length) {
      publicExcluded++;
      continue;
    }
    n.probes = probes;
    probeCount += probes.length;
    needles.push(n);
  }
  for (const L of opts.locales) {
    const c = perLocale[L].controls;
    const mk = (texts) =>
      texts
        .flatMap(splitParas)
        .map((t) => ({ text: t, probes: probesOf(canon(t)) }))
        .filter((x) => x.probes.length);
    c.research = mk(c.research);
    c.idea = mk(c.idea);
  }

  // Locked idea pages: fixed edge cases first, then evenly spaced over the paid list.
  const all = Array.isArray(manifest.ideas) ? manifest.ideas : [];
  const paid = all.filter((id) => !freeIdeas.has(id));
  let lockedIdeas = opts.ideas;
  if (!lockedIdeas) {
    const pick = ["habit-tracking-1", `${freeCategory}-6`, `${freeCategory}-8`].filter((id) => paid.includes(id));
    const rest = paid.filter((id) => !pick.includes(id));
    const need = 10 - pick.length;
    for (let k = 0; k < need && rest.length; k++) pick.push(rest[Math.floor(((k + 0.5) * rest.length) / need)]);
    lockedIdeas = [...new Set(pick)];
  }
  const kinds = {};
  for (const n of needles) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  return { manifest, freeCategory, freeIdeas, needles, perLocale, lockedIdeas, stats: { needles: needles.length, probes: probeCount, publicExcluded, skippedShort, kinds } };
}

function resolveContentDir() {
  if (opts.content) return existsSync(path.join(opts.content, "manifest.json")) ? opts.content : null;
  const guess = path.resolve(SCRIPT_DIR, "../../content/v2");
  return existsSync(path.join(guess, "manifest.json")) ? guess : null;
}

let leakContent = null;
let leakLoadError = null;
let contentDir = null;
if (enabled("leak")) {
  contentDir = resolveContentDir();
  if (contentDir) {
    try {
      leakContent = loadLeakContent(contentDir);
    } catch (err) {
      leakLoadError = `cannot load ${contentDir}: ${err.message}`;
    }
  }
}

/** Query that matches paid text but can never contain a whole probe when echoed back. */
function shortQuery(text, L, maxCanon) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (L === "ja") return t.slice(0, Math.min(8, Math.max(2, Math.floor(t.length * 0.6))));
  const words = t.split(" ");
  let q = "";
  for (const w of words) {
    const next = q ? `${q} ${w}` : w;
    if (canon(next).length > maxCanon && q) break;
    q = next;
    if (canon(q).length >= maxCanon * 0.6) break;
  }
  return q;
}

function describeHit(n, hit) {
  const snippet = n.text.replace(/\s+/g, " ");
  const views = [...hit.views].join(", ");
  const rows = [...hit.rows].slice(0, 3).join(", ");
  return `[${n.kind}] ${n.refs[0]}${n.refs.length > 1 ? ` (+${n.refs.length - 1})` : ""}: "${snippet.length > 90 ? `${snippet.slice(0, 90)}…` : snippet}" → in ${views}${rows ? ` [${rows}]` : ""}`;
}

async function fetchPageParts(p, { rsc = true } = {}) {
  const html = await http(p); // same cache key as the routes group: fetched once
  const r = rsc ? await http(p, { headers: { rsc: "1" } }) : null;
  const parts = [];
  if (html.status === 200) {
    const page = parseHtml(html.text);
    parts.push({ view: "html:text", text: page.text });
    parts.push({ view: "html:attr", text: page.attrs.join("\u0001") });
    parts.push({ view: "html:script", text: page.scripts.join("\u0001") });
    for (const f of flightParts(parseFlight(page.flight), "html:flight")) parts.push(f);
  }
  if (r && r.status === 200) for (const f of flightParts(parseFlight(r.buf), "rsc")) parts.push(f);
  return { html, rsc: r, parts };
}

function scanLeaks(parts) {
  const hay = buildHaystack(parts);
  const hits = [];
  for (const n of leakContent.needles) {
    const hit = locate(hay, n.probes);
    if (hit) hits.push({ n, hit });
  }
  return { hay, hits };
}

function leakVerdict(hits, extra = {}) {
  const fails = [];
  const details = [];
  if (hits.length) {
    const byKind = {};
    for (const { n } of hits) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;
    const debugOnly = hits.every(({ hit }) => hit.debugOnly);
    fails.push(`${hits.length} paid text(s) exposed to a guest${debugOnly ? " (only in dev debug info)" : ""}: ${Object.entries(byKind).map(([k, v]) => `${k}×${v}`).join(", ")}`);
    for (const { n, hit } of hits.slice(0, 6)) details.push(describeHit(n, hit));
    if (hits.length > 6) details.push(`… and ${hits.length - 6} more`);
  }
  return { fails, details, ...extra };
}

// ── leak group ──

if (enabled("leak")) {
  if (!leakContent) {
    add("leak", "paid-content leak check", async () => ({
      skip: leakLoadError ?? "content/v2 not found (run inside the repo or pass --content DIR)",
      expected: "no paid text in guest HTML/RSC",
      actual: "skipped",
      fails: [],
    }));
  } else {
    const { perLocale, lockedIdeas, freeCategory } = leakContent;
    const freeIdea = [...leakContent.freeIdeas][0] ?? `${freeCategory}-1`;
    for (const L of opts.locales) {
      const cards = perLocale[L].cards;
      const sampleIdea = lockedIdeas[0];
      const q1 = shortQuery(cards[sampleIdea]?.title, L, 20);
      let lead = "";
      try {
        lead = readJson(path.join(contentDir, L, "research", "habit-tracking.json")).lead ?? "";
      } catch {
        /* no sample */
      }
      const q2 = shortQuery(lead, L, 20);
      const targets = [
        { what: "research catalog", p: `/${L}/segment` },
        { what: "ideas catalog", p: `/${L}/ideas` },
        { what: "locked article", p: `/${L}/segment/habit-tracking` },
        { what: `free article (locked cards ${freeCategory}-6…8)`, p: `/${L}/segment/${freeCategory}`, control: "research" },
        { what: "free idea page", p: `/${L}/ideas/${freeIdea}`, control: "idea" },
        { what: "landing (guest home)", p: `/${L}` },
        ...(q1 ? [{ what: "idea search, locked title", p: `/${L}/ideas?q=${encodeURIComponent(q1)}`, show: `/${L}/ideas?q=${q1}` }] : []),
        ...(q2 ? [{ what: "research search, locked body", p: `/${L}/segment?q=${encodeURIComponent(q2)}`, show: `/${L}/segment?q=${q2}` }] : []),
        ...lockedIdeas.map((id) => ({ what: `locked idea ${id}`, p: `/${L}/ideas/${id}` })),
      ];
      for (const t of targets) {
        add("leak", `${t.show ?? t.p} (${t.what})`, async () => {
          const { html, rsc, parts } = await fetchPageParts(t.p);
          const expected = "200 HTML+RSC, no paid text";
          const fails = [];
          if (html.status !== 200) fails.push(`HTML ${statusLine(html)} — cannot verify`);
          if (rsc && rsc.status !== 200) fails.push(`RSC ${statusLine(rsc)} — cannot verify`);
          else if (rsc && !/text\/x-component/.test(header(rsc, "content-type"))) fails.push(`RSC content-type ${header(rsc, "content-type") || "(none)"}`);
          const { hits } = scanLeaks(parts);
          const v = leakVerdict(hits);
          fails.push(...v.fails);
          const details = [...v.details];
          // Positive control: the detector must SEE the free text on the free pages, both in the
          // HTML text and in the RSC payload (separate haystacks, so one view cannot mask the other).
          if (t.control && html.status === 200) {
            const ctl = perLocale[L].controls[t.control];
            const seen = (view) => {
              const hay = buildHaystack(parts.filter((x) => x.view === view && !x.debug));
              return ctl.filter((c) => locate(hay, c.probes, 1)).length;
            };
            const inHtml = seen("html:text");
            const inRsc = seen("rsc");
            const need = Math.ceil(ctl.length * 0.9);
            details.push(`self-test: ${inHtml}/${ctl.length} free texts found in HTML text, ${inRsc}/${ctl.length} in RSC`);
            if (!ctl.length) fails.push("self-test: no free control texts loaded");
            else {
              if (inHtml < need) fails.push(`self-test: only ${inHtml}/${ctl.length} free texts visible in HTML (detector or page broken)`);
              if (rsc?.status === 200 && inRsc < need) fails.push(`self-test: only ${inRsc}/${ctl.length} free texts found in RSC (detector or page broken)`);
            }
          }
          const size = `${(html.buf.length / 1024).toFixed(0)}+${rsc ? (rsc.buf.length / 1024).toFixed(0) : 0} KB`;
          return {
            expected,
            actual: `${html.status || "ERR"}/${rsc?.status || "ERR"} ${size}, ${hits.length ? red(`${hits.length} leaked`) : "0 leaked"}`,
            fails,
            details,
          };
        });
      }
      // The export API is gated before any read (401 guest) and must not leak either.
      const exportId = lockedIdeas[0];
      add("leak", `POST /api/site/export/${exportId} (${L}, guest)`, async () => {
        const r = await http(`/api/site/export/${exportId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lang: L }),
        });
        const fails = expectStatus(r, 401);
        const { hits } = scanLeaks([{ view: "body", text: r.text }]);
        const v = leakVerdict(hits);
        return { expected: "401, no paid text", actual: statusLine(r), fails: [...fails, ...v.fails], details: v.details };
      });
    }
  }
}

// ───────────────────────────── runner & report ─────────────────────────────

async function pool(items, n, fn) {
  let next = 0;
  let done = 0;
  const out = new Array(items.length);
  const progress = () => {
    if (process.stderr.isTTY) process.stderr.write(`\r${dim(`[${done}/${items.length}] ${requestCount} requests`)}   `);
  };
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        done++;
        progress();
      }
    }),
  );
  if (process.stderr.isTTY) process.stderr.write("\r\x1b[K");
  return out;
}

const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, "");
const width = (s) => {
  let w = 0;
  for (const ch of stripAnsi(s)) w += WIDE.test(ch) ? 2 : 1;
  return w;
};
function clip(s, max) {
  s = String(s);
  if (width(s) <= max) return s;
  const plain = stripAnsi(s);
  let out = "";
  let w = 0;
  for (const ch of plain) {
    const cw = WIDE.test(ch) ? 2 : 1;
    if (w + cw > max - 1) break;
    out += ch;
    w += cw;
  }
  return `${out}…`;
}
const pad = (s, n) => s + " ".repeat(Math.max(0, n - width(s)));
function printTable(rows, cols) {
  const widths = cols.map((c) => Math.min(c.max ?? 200, Math.max(width(c.title), ...rows.map((r) => width(clip(r[c.key] ?? "", c.max ?? 200))))));
  const line = (cells) => cells.map((cell, i) => pad(cell, widths[i])).join("  ").trimEnd();
  console.log(bold(line(cols.map((c) => c.title))));
  console.log(dim(line(widths.map((w) => "─".repeat(w)))));
  for (const r of rows) console.log(line(cols.map((c) => clip(r[c.key] ?? "", c.max ?? 200))));
}

async function main() {
  const started = new Date();
  console.log(bold(`inApp site v2 smoke — ${BASE}`));
  console.log(dim(`${started.toISOString()} · node ${process.version} · locales ${opts.locales.join(",")} · groups ${GROUPS.filter(enabled).join(",")}`));
  if (enabled("leak")) {
    if (leakContent) {
      const s = leakContent.stats;
      console.log(
        dim(
          `leak check: ${contentDir} · ${s.needles} paid texts (${Object.entries(s.kinds).map(([k, v]) => `${k} ${v}`).join(", ")}) · ${s.probes} probes · ${s.publicExcluded} also public · ${s.skippedShort} too short (<${MIN_LEN} chars, <${MIN_LEN_CJK} CJK)`,
        ),
      );
      console.log(dim(`locked idea pages: ${leakContent.lockedIdeas.join(", ")}`));
    } else console.log(yellow(`leak check skipped: ${leakLoadError ?? "content/v2 not found (pass --content DIR)"}`));
  }
  console.log("");

  const results = await pool(checks, opts.concurrency, async (c) => {
    try {
      const r = await c.run();
      const status = r.skip ? "SKIP" : r.fails.length ? "FAIL" : "PASS";
      return { group: c.group, name: c.name, status, expected: r.expected ?? "", actual: r.skip ?? r.actual ?? "", fails: r.fails ?? [], details: r.details ?? [] };
    } catch (err) {
      return { group: c.group, name: c.name, status: "FAIL", expected: "", actual: "check crashed", fails: [`check crashed: ${err?.stack ?? err}`], details: [] };
    }
  });

  // Summary per group.
  const summary = GROUPS.filter(enabled).map((g) => {
    const rs = results.filter((r) => r.group === g);
    const n = (s) => rs.filter((r) => r.status === s).length;
    return { group: g, total: String(rs.length), pass: String(n("PASS")), fail: n("FAIL") ? red(String(n("FAIL"))) : "0", skip: String(n("SKIP")) };
  });
  printTable(summary, [
    { key: "group", title: "GROUP" },
    { key: "total", title: "CHECKS" },
    { key: "pass", title: "PASS" },
    { key: "fail", title: "FAIL" },
    { key: "skip", title: "SKIP" },
  ]);
  console.log("");

  const shown = opts.all ? results : results.filter((r) => r.status !== "PASS");
  if (shown.length) {
    console.log(bold(opts.all ? `ALL CHECKS (${results.length})` : `FAILURES AND SKIPS (${shown.length})`));
    const tag = (s) => (s === "PASS" ? green(s) : s === "FAIL" ? red(s) : yellow(s));
    printTable(
      shown.map((r, i) => ({ ...r, n: String(i + 1), st: tag(r.status), why: r.status === "PASS" ? r.actual : r.fails[0] ?? r.actual })),
      [
        { key: "n", title: "#" },
        { key: "st", title: "RESULT" },
        { key: "group", title: "GROUP" },
        { key: "name", title: "CHECK", max: 70 },
        { key: "expected", title: "EXPECTED", max: 44 },
        { key: "why", title: "ACTUAL / REASON", max: 90 },
      ],
    );
    const failed = shown.filter((r) => r.status === "FAIL");
    if (failed.length) {
      console.log("");
      console.log(bold("DETAILS"));
      shown.forEach((r, i) => {
        if (r.status !== "FAIL") return;
        console.log(`${red(`#${i + 1}`)} ${r.group} · ${r.name} — ${r.actual}`);
        for (const f of r.fails) console.log(`    ✗ ${f}`);
        for (const d of r.details) console.log(dim(`      ${d}`));
      });
    }
    console.log("");
  }

  const failCount = results.filter((r) => r.status === "FAIL").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;
  const passCount = results.length - failCount - skipCount;
  const secs = ((Date.now() - started.getTime()) / 1000).toFixed(1);
  const skipped = skipCount ? `, ${skipCount} skipped` : "";
  const verdict = failCount
    ? red(`FAIL — ${failCount} of ${results.length} checks failed (${passCount} passed${skipped})`)
    : green(`OK — ${passCount} checks passed${skipped}`);
  console.log(`${bold(verdict)} ${dim(`(${requestCount} requests, ${secs}s)`)}`);

  if (opts.json) {
    const plain = results.map((r) => ({ ...r, actual: stripAnsi(r.actual) }));
    writeFileSync(opts.json, JSON.stringify({ base: BASE, startedAt: started.toISOString(), seconds: Number(secs), failed: failCount, results: plain }, null, 2));
    console.log(dim(`JSON written to ${opts.json}`));
  }
  process.exitCode = failCount ? 1 : 0;
}

/** Waits until the server answers anything over HTTP (after a deploy it may still be starting). */
async function waitForServer() {
  const deadline = Date.now() + opts.wait * 1000;
  let last = "";
  for (;;) {
    try {
      const res = await fetch(`${BASE}/robots.txt`, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { "user-agent": UA } });
      await res.arrayBuffer();
      if (!RETRY_STATUS.has(res.status)) return null;
      last = `HTTP ${res.status}`;
    } catch (err) {
      const cause = errorCause(err);
      last = `${err?.message ?? err}${cause ? ` (${cause})` : ""}`;
    }
    if (Date.now() >= deadline) return last;
    await sleep(2000);
  }
}

/** Offline tests of the parsers and the leak matcher (no server needed): --self-test. */
function selfTest() {
  let passed = 0;
  const failed = [];
  const t = (name, cond, info = "") => {
    if (cond) passed++;
    else failed.push(`${name}${info ? ` — ${info}` : ""}`);
  };

  // canonical form + entities
  t("canon: NBSP, quotes, dashes, ellipsis, newlines", canon("Привет,\u00A0мир — «тест»…\n\nДа") === canon('привет, мир - "тест"...да'));
  t("canon: soft hyphen / zero-width removed", canon("при\u00ADло\u200Bжение") === "приложение");
  t("decodeEntities", decodeEntities("&amp;&#x27;&#39;&quot;&nbsp;&laquo;x&raquo;&unknown;") === "&''\"\u00A0«x»&unknown;");

  // GramIndex must agree with indexOf, including overflowing position lists
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const alphabet = "абвгдеab cd";
  let text = "";
  for (let i = 0; i < 20000; i++) text += alphabet[Math.floor(rnd() * alphabet.length)];
  text += "x".repeat(2000) + "needle-after-overflow";
  const c = canon(text);
  const idx = new GramIndex(c);
  let mismatches = 0;
  for (let k = 0; k < 2000; k++) {
    const start = Math.floor(rnd() * (c.length - 45));
    const sub = c.slice(start, start + GRAM + Math.floor(rnd() * 30));
    if (idx.find(sub, gramHash(sub)).length === 0) mismatches++;
  }
  for (let k = 0; k < 500; k++) {
    const fake = Array.from({ length: 16 }, () => "абвгдеabcd"[Math.floor(rnd() * 10)]).join("");
    if (c.includes(fake) !== idx.find(fake, gramHash(fake)).length > 0) mismatches++;
  }
  t("GramIndex agrees with indexOf", mismatches === 0, `${mismatches} mismatches`);
  const ov = `${"x".repeat(GRAM)}needle`;
  t("GramIndex falls back to indexOf on an overflowing gram", idx.find(ov, gramHash(ov))[0] === c.indexOf(ov));

  // React Flight rows
  const tText = "Платный абзац №1 — ünïcödé 日本語テキスト";
  const stream =
    `0:{"P":null,"c":["","ru"]}\n1:I["x.js",[],"default"]\n2:T${Buffer.byteLength(tText).toString(16)},${tText}` +
    `3:["$","p",null,{"children":"$2"},"$4",null,1]\n4:{"name":"Comp","env":"Server","key":null,"props":{"x":"debug"}}\n` +
    `3:D"$4"\n5:"$$5 literal"\n6:HL["/a.css","style"]\n`;
  const rows = parseFlight(Buffer.from(stream));
  t("parseFlight: rows", rows.map((r) => r.id + r.tag).join(",") === "0,1I,2T,3,4,3D,5,6H", rows.map((r) => r.id + r.tag).join(","));
  t("parseFlight: T row by UTF-8 byte length", rows.find((r) => r.tag === "T")?.raw === tText);
  t("parseFlight: $$ unescaped, references dropped", rows.find((r) => r.id === "5")?.leaves === "$5 literal");
  const fparts = flightParts(rows, "rsc");
  t("flightParts: component info is debug", fparts.find((p) => p.row === "4")?.debug === true);
  t("flightParts: D row is debug", fparts.find((p) => p.row === "3:D")?.debug === true);
  t("flightParts: data row is not debug", fparts.find((p) => p.row === "3")?.debug === false);
  t("flightParts: import and hint rows skipped", !fparts.some((p) => p.row === "1:I" || p.row === "6:H"));

  // HTML: visible text, attributes, JSON-LD, inline flight reassembly
  const push = (s) => `<script>self.__next_f.push(${JSON.stringify([1, s]).replace(/</g, "\\u003c")})</script>`;
  const html =
    `<!DOCTYPE html><html lang="ru"><head><title>Заголовок</title><meta name="description" content="Мета &quot;описание&quot;"/>` +
    `<script type="application/ld+json">{"@type":"Article","headline":"JSON-LD \\u003cзаголовок"}</script></head>` +
    `<body><p>Первая&nbsp;часть<!-- -->, вторая &#x27;часть&#x27;</p><img alt="Альт текст"/>` +
    `<script>(self.__next_f=self.__next_f||[]).push([0])</script>${push(stream.slice(0, 30))}${push(stream.slice(30))}</body></html>`;
  const page = parseHtml(html);
  t("parseHtml: visible text", canon(page.text).includes(canon("Первая часть, вторая 'часть'")) && canon(page.text).includes("заголовок"));
  t("parseHtml: attribute values decoded", page.attrs.includes('Мета "описание"') && page.attrs.includes("Альт текст"));
  t("parseHtml: JSON-LD leaves", page.scripts.some((s) => s.includes("JSON-LD <заголовок")));
  t("parseHtml: inline flight reassembled byte-exact", page.flight.equals(Buffer.from(stream)));
  t("parseHtml: flight not in visible text", !page.text.includes("__next_f") && !page.text.includes("Платный"));

  // end-to-end detection
  const secret =
    "Человек выполнил часть привычек, но итог дня выглядит почти так же, как полный пропуск. Такая обратная связь скрывает сделанное. В другом отзыве просят паузу на время болезни или отпуска.";
  const probes = probesOf(canon(secret));
  const reflowed = `<p>${secret.slice(0, 90).replace(/ /g, "&nbsp;")}</p><p>${secret.slice(90).replace(/'/g, "&#x27;")}</p>`;
  t("detect: reflowed paragraph with NBSP", !!locate(buildHaystack([{ view: "html:text", text: parseHtml(reflowed).text }]), probes));
  const teaser = `<meta name="description" content="${secret.slice(0, 80)}…">`;
  t("detect: 80-char teaser in an attribute", !!locate(buildHaystack([{ view: "html:attr", text: parseHtml(teaser).attrs.join("\u0001") }]), probes));
  const middle = `<p>…${secret.slice(60, 140)}…</p>`;
  t("detect: 80-char excerpt from the middle", !!locate(buildHaystack([{ view: "html:text", text: parseHtml(middle).text }]), probes));
  t("detect: no hit on a locked preview", !locate(buildHaystack([{ view: "html:text", text: "Идея доступна в Plus. Полный материал в Plus." }]), probes));
  const dbg = parseFlight(Buffer.from(`0:["$","div",null,{}]\n4:{"name":"C","env":"Server","props":{"t":${JSON.stringify(secret)}}}\n0:D"$4"\n`));
  const dhit = locate(buildHaystack(flightParts(dbg, "rsc")), probes);
  t("detect: dev-debug-only hit is flagged", !!dhit && dhit.debugOnly === true);
  const trows = parseFlight(Buffer.from(`1:T${Buffer.byteLength(secret).toString(16)},${secret}2:["$","p",null,{"children":"$1"}]\n`));
  const thit = locate(buildHaystack(flightParts(trows, "rsc")), probes);
  t("detect: long text in a T row", !!thit && !thit.debugOnly);
  const esc = parseFlight(Buffer.from(`1:["$","p",null,{"children":${JSON.stringify(secret.slice(0, 120)).replace(/о/g, "\\u043e")}}]\n`));
  t("detect: JSON \\u-escaped text in a data row", !!locate(buildHaystack(flightParts(esc, "rsc")), probes));
  const minExcerpt = secret.slice(70, 70 + 2 * PROBE + 6); // ≥ 2*PROBE-1 canonical chars
  t("detect: shortest guaranteed excerpt (Latin/Cyrillic)", !!locate(buildHaystack([{ view: "t", text: `<p>…${minExcerpt}…</p>` }]), probes));
  const jaSecret = "朝、人は時間どおりに出かけようと支度し、夜にはその日に何ができたかを思い出そうとする。一週間後には、どの日が抜けたのかを見返す。";
  const jaProbes = probesOf(canon(jaSecret));
  t("detect: 24-char Japanese excerpt", !!locate(buildHaystack([{ view: "t", text: `<p>…${jaSecret.slice(9, 33)}…</p>` }]), jaProbes));
  t("detect: no hit on unrelated Japanese text", !locate(buildHaystack([{ view: "t", text: "このアイデアはPlusで読めます。まずは無料の分析を読んでみよう。" }]), jaProbes));
  const jaTitle = probesOf(canon("投薬の記録"));
  t("detect: 5-char Japanese title as a whole", jaTitle.length === 1 && !!locate(buildHaystack([{ view: "t", text: "<h2>投薬の記録</h2>" }]), jaTitle));
  t("detect: 4-char Japanese prefix is not a hit", !locate(buildHaystack([{ view: "t", text: "<h2>投薬の記</h2>" }]), jaTitle));
  const short = probesOf(canon("Продолжить после пропуска"));
  t("detect: short title as a whole", !!locate(buildHaystack([{ view: "t", text: "<x>Продолжить после\u00A0пропуска</x>" }]), short));
  t("detect: prefix of a short title is not a hit", !locate(buildHaystack([{ view: "t", text: "Продолжить после" }]), short));

  // forbidden "990" must ignore RSC references / row ids
  const re990 = FORBIDDEN[0][1];
  const n990 = (s) => [...s.matchAll(re990)].length;
  t("990: references, ids, longer numbers ignored", n990('"$990" "$L990" "$@990" 1990 0.990 9900 a990') === 0 && n990("990:[1]") === 0, String(n990('"$990" "$L990" "$@990" 1990 0.990 9900 a990')));
  t("990: prices matched", n990("990 ₽") === 1 && n990("₽990") === 1 && n990('{"priceRub":990,') === 1 && n990("за 990.") === 1);

  // search echo: the query is a strict prefix, so it can never contain a whole paid needle
  for (const [L, s] of [
    ["ru", "Продолжить после пропуска"],
    ["de", "Gewohnheitsverfolgungsanwendungen für Menschen mit wenig Zeit"],
    ["en", "Pick up where you left off after a missed day"],
    ["ja", "スキップ後も続けられる習慣トラッカー"],
  ]) {
    const q = canon(shortQuery(s, L, 20));
    t(`shortQuery ${L}: strict prefix`, q.length >= 2 && canon(s).startsWith(q) && q.length < canon(s).length, q);
  }

  console.log(`self-test: ${passed} passed, ${failed.length} failed`);
  for (const f of failed) console.log(red(`  ✗ ${f}`));
  process.exitCode = failed.length ? 1 : 0;
}

if (opts.selfTest) selfTest();
else {
  const down = opts.wait > 0 ? await waitForServer() : null;
  if (down) {
    console.log(red(bold(`FAIL — ${BASE} is not answering after ${opts.wait}s: ${down}`)));
    process.exitCode = 1;
  } else await main();
}
