// Search-traffic safety audit for the site-v2 routing (docs/site-v2/ARCHITECTURE.md §1, §3).
//
// For every URL search engines and external clients know about, simulate what the NEW
// deployment answers — with the real pure routing function (src/site/routing/decide.ts), the
// real proxy matcher (src/proxy.ts `config`) and Next's own trailing-slash redirect — and check
// that the target actually exists:
//   new      → a page under src/app/(site)/site/[lang]/** (never the [...missing] catch-all);
//              /segment/<slug> and /ideas/<id> also need the launch manifest AND content/v2 JSON
//   inplace  → a page under src/app/(old)/** (+ cheap data checks for dynamic params)
//   archive  → /<L>/old/** (noindex): an indexed URL must never end up here
//   untouched→ proxy matcher skips it (files, /api, feed/llms/sitemap routes)
// App-level redirects of old pages (catalog, categories, premium, segment/[slug]/v2,
// ideas/[slug]) are modelled from their source so the chain is followed end to end.
//
// URL sources (all de-duplicated, each URL remembers where it came from):
//   prod     robots.txt → Sitemap: → sitemap(s) (index children followed), <loc> + hreflang,
//            and the absolute inapp.pro URLs inside /feed.xml, /llms.txt, /llms-full*.txt
//   code     src/app/sitemap.ts, src/app/robots.ts, and the feed/llms route handlers of HEAD
//   contract external entry points that must keep working (DECISIONS §7: App Store support URL,
//            links shipped in the iOS app, IndexNow list, YooKassa return, OAuth consent)
//
// Usage (read-only; no dev server needed):
//   node --import tsx scripts/v2/audit/seo-routes.ts                    # prod + code + contract
//   node --import tsx scripts/v2/audit/seo-routes.ts --source code      # offline (CI without network)
//   node --import tsx scripts/v2/audit/seo-routes.ts --strict           # also fail on noindex/no canonical
//   node --import tsx scripts/v2/audit/seo-routes.ts --json /tmp/seo.json
//   node --import tsx scripts/v2/audit/seo-routes.ts --live http://127.0.0.1:3000 --live-only new
//        (after `next build && next start`: fetch every URL, compare status/robots/canonical)
//
// Exit code: 1 when any known URL 404s, lands in the noindexed archive, or needs more than
// --max-hops redirects (default 1); with --strict also when a previously indexed URL is now
// served by a new page that is noindex or has no self-canonical. 2 on usage/IO errors.

import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { decideRoute, type RoutingDecision } from "../../../src/site/routing/decide";
import { isLaunchCategory, isLaunchIdea, LAUNCH_CATEGORIES, LAUNCH_IDEAS } from "../../../src/site/manifest.generated";
import { LOCALES } from "../../../src/site/i18n/locales";

// Next's server modules (pulled in by next/experimental/testing/server and by route handlers)
// expect the global that Next's node environment installs; outside `next` it is missing.
(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage;
type MatchFn = (o: { config: unknown; url: string }) => boolean;
let unstable_doesMiddlewareMatch: MatchFn;
let proxyConfig: unknown;
async function loadProxy() {
  unstable_doesMiddlewareMatch = (await import("next/experimental/testing/server")).unstable_doesMiddlewareMatch as MatchFn;
  proxyConfig = (await import("../../../src/proxy")).config;
}

// ───────────────────────────── args ─────────────────────────────

// Repo root = three levels above this file (works for the CJS output tsx produces here).
const ROOT = resolve(dirname(process.argv[1] ?? "."), "../../..") + sep;
const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(n);
const opt = (n: string, d?: string) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const opts = (n: string) => argv.flatMap((a, i) => (a === n && argv[i + 1] ? [argv[i + 1]] : []));

const SOURCE = opt("--source", "both") as "prod" | "code" | "both";
const ORIGIN = opt("--origin", "https://inapp.pro")!.replace(/\/$/, "");
const HOST = new URL(ORIGIN).host;
const MAX_HOPS = Number(opt("--max-hops", "1"));
const STRICT = flag("--strict");
const JSON_OUT = opt("--json");
const LIVE = opt("--live");
const LIVE_ONLY = opt("--live-only"); // new | inplace | archive | untouched | all
const LIVE_LIMIT = Number(opt("--live-limit", "100000"));
const LIVE_CONCURRENCY = Number(opt("--live-concurrency", "4"));
const EXTRA_SITEMAPS = opts("--sitemap");
const VERBOSE = flag("--verbose");

// ───────────────────────────── helpers ─────────────────────────────

async function fetchText(url: string): Promise<string> {
  if (!/^https?:/.test(url)) return readFileSync(url, "utf8");
  const res = await fetch(url, { headers: { "user-agent": "inapp-seo-audit/1 (+scripts/v2/audit/seo-routes.ts)" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

const decodeXml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

function absUrlsIn(text: string): string[] {
  const re = new RegExp(`https?://${HOST.replace(/\./g, "\\.")}[^\\s"'<>)\\]\`,]*`, "g");
  return [...text.matchAll(re)].map((m) => m[0].replace(/[.;:]+$/, ""));
}

type Src = string; // "prod:sitemap", "code:feed", "contract", …
const urls = new Map<string, Set<Src>>();
function addUrl(u: string, src: Src) {
  let url: URL;
  try {
    url = new URL(u, ORIGIN);
  } catch {
    return;
  }
  if (url.host !== HOST) return;
  const key = url.pathname + url.search; // hash is client-only
  if (!urls.has(key)) urls.set(key, new Set());
  urls.get(key)!.add(src);
}

// ───────────────────────────── URL sources ─────────────────────────────

const robotsReport: { source: string; text: string }[] = [];
const sourceErrors: string[] = [];

async function collectSitemap(url: string, src: Src, depth = 0) {
  const xml = await fetchText(url);
  if (/<sitemapindex/i.test(xml)) {
    if (depth > 3) throw new Error(`sitemap index nesting too deep at ${url}`);
    for (const m of xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/gi)) await collectSitemap(decodeXml(m[1].trim()), src, depth + 1);
    return;
  }
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) addUrl(decodeXml(m[1].trim()), `${src}`);
  for (const m of xml.matchAll(/<xhtml:link[^>]*href="([^"]+)"/gi)) addUrl(decodeXml(m[1]), `${src}:hreflang`);
}

async function collectProd() {
  try {
    const robots = await fetchText(`${ORIGIN}/robots.txt`);
    robotsReport.push({ source: "prod", text: robots });
    const maps = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    for (const m of maps.length ? maps : [`${ORIGIN}/sitemap.xml`]) await collectSitemap(m, "prod:sitemap");
  } catch (e) {
    sourceErrors.push(`prod sitemap: ${(e as Error).message}`);
  }
  for (const f of ["/feed.xml", "/llms.txt", "/llms-full.txt", "/llms-full.ru.txt"]) {
    try {
      for (const u of absUrlsIn(await fetchText(ORIGIN + f))) addUrl(u, `prod:${f.slice(1)}`);
    } catch (e) {
      sourceErrors.push(`prod ${f}: ${(e as Error).message}`);
    }
  }
}

async function collectCode() {
  try {
    const mod = await import("../../../src/app/sitemap");
    const entries = await mod.default();
    for (const e of entries) {
      addUrl(e.url, "code:sitemap");
      for (const href of Object.values(e.alternates?.languages ?? {})) if (typeof href === "string") addUrl(href, "code:sitemap:hreflang");
    }
  } catch (e) {
    sourceErrors.push(`code sitemap: ${(e as Error).message}`);
  }
  try {
    const mod = await import("../../../src/app/robots");
    const r = mod.default();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const lines: string[] = [];
    for (const rule of rules) {
      for (const ua of [rule.userAgent].flat()) lines.push(`User-Agent: ${ua}`);
      for (const a of [rule.allow ?? []].flat()) lines.push(`Allow: ${a}`);
      for (const d of [rule.disallow ?? []].flat()) lines.push(`Disallow: ${d}`);
      lines.push("");
    }
    for (const s of [r.sitemap ?? []].flat()) lines.push(`Sitemap: ${s}`);
    robotsReport.push({ source: "code", text: lines.join("\n") });
  } catch (e) {
    sourceErrors.push(`code robots: ${(e as Error).message}`);
  }
  const routes: [string, string][] = [
    ["feed.xml", "../../../src/app/feed.xml/route"],
    ["llms.txt", "../../../src/app/llms.txt/route"],
    ["llms-full.txt", "../../../src/app/llms-full.txt/route"],
    ["llms-full.ru.txt", "../../../src/app/llms-full.ru.txt/route"],
  ];
  for (const [name, spec] of routes) {
    try {
      const mod = await import(spec);
      const res: Response = await mod.GET();
      for (const u of absUrlsIn(await res.text())) addUrl(u, `code:${name}`);
    } catch (e) {
      sourceErrors.push(`code ${name}: ${(e as Error).message}`);
    }
  }
}

/** Entry points outside our sitemap that must keep working (DECISIONS §7, spec 07 §6). */
function collectContract() {
  const c = (p: string, why: string) => addUrl(p, `contract:${why}`);
  c("/en/contacts", "app-store-support-url");
  for (const l of ["ru", "en"]) {
    c(`/${l}/offer`, "ios-app-terms");
    c(`/${l}/contacts`, "ios-app-support");
    c(`/${l}/offer/payment`, "checkout-offer-link");
    c(`/${l}/catalog`, "indexnow-list");
    c(`/${l}/categories`, "legacy-stub");
    c(`/${l}/premium`, "legacy-stub");
    c(`/${l}/tokens`, "ci-smoke");
    c(`/${l}/mcp`, "ci-smoke");
    c(`/${l}/library?checkout=00000000-0000-0000-0000-000000000000`, "yookassa-return");
    c(`/${l}/segment/habit-tracking/v2`, "legacy-v2-stub");
    c(`/${l}/segment/sobriety/v2`, "legacy-v2-stub");
    c(`/${l}/ideas/habit-tracking-1`, "idea-id-launch");
  }
  // Bare paths shipped in the iOS app (no locale: negotiated per request).
  c("/offer", "ios-app-bare");
  c("/contacts", "ios-app-bare");
  c("/segment/habit-tracking", "ios-app-bare");
  c("/segment/sobriety", "ios-app-bare");
  c("/rating/habit-tracking", "ios-app-bare");
  c("/library?checkout=00000000-0000-0000-0000-000000000000", "yookassa-return-bare");
}

// ───────────────────────────── route table (src/app) ─────────────────────────────

type RouteFile = { file: string; group: "old" | "site" | "root"; segs: string[]; kind: "page" | "route" };

function walkRoutes(): RouteFile[] {
  const appDir = join(ROOT, "src/app");
  const out: RouteFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name.startsWith("_")) continue; // private folders are not routes
        walk(full);
        continue;
      }
      const m = /^(page|route)\.(tsx?|jsx?)$/.exec(name);
      if (!m) continue;
      const relDir = relative(appDir, dir);
      const parts = relDir ? relDir.split(sep) : [];
      const group = parts[0] === "(old)" ? "old" : parts[0] === "(site)" ? "site" : "root";
      const segs = parts.filter((p) => !(p.startsWith("(") && p.endsWith(")")) && !p.startsWith("@"));
      out.push({ file: relative(ROOT, full), group, segs, kind: m[1] as "page" | "route" });
    }
  };
  walk(appDir);
  return out;
}

const ROUTES = walkRoutes();

/** Next-like precedence: static < [x] < [...x] < [[...x]] per segment. */
function matchRoute(pathname: string): { route: RouteFile; params: Record<string, string | string[]> } | null {
  let segs: string[];
  try {
    segs = pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  let best: { route: RouteFile; params: Record<string, string | string[]>; score: number[] } | null = null;
  for (const r of ROUTES) {
    const params: Record<string, string | string[]> = {};
    const score: number[] = [];
    let ok = true;
    let i = 0;
    for (let k = 0; k < r.segs.length; k++) {
      const p = r.segs[k];
      let m: RegExpExecArray | null;
      if ((m = /^\[\[\.\.\.(.+)\]\]$/.exec(p))) {
        params[m[1]] = segs.slice(i);
        i = segs.length;
        score.push(3);
      } else if ((m = /^\[\.\.\.(.+)\]$/.exec(p))) {
        if (i >= segs.length) {
          ok = false;
          break;
        }
        params[m[1]] = segs.slice(i);
        i = segs.length;
        score.push(2);
      } else if ((m = /^\[(.+)\]$/.exec(p))) {
        if (i >= segs.length) {
          ok = false;
          break;
        }
        params[m[1]] = segs[i++];
        score.push(1);
      } else {
        if (segs[i] !== p) {
          ok = false;
          break;
        }
        i++;
        score.push(0);
      }
    }
    if (!ok || i !== segs.length) continue;
    const better =
      !best ||
      (() => {
        for (let k = 0; k < Math.max(score.length, best.score.length); k++) {
          const a = score[k] ?? -1;
          const b = best.score[k] ?? -1;
          if (a !== b) return a < b;
        }
        return false;
      })();
    if (better) best = { route: r, params, score };
  }
  return best && { route: best.route, params: best.params };
}

// ───────────────────────────── data checks ─────────────────────────────

const appSlugs = JSON.parse(readFileSync(join(ROOT, "src/data/app-slugs.json"), "utf8")) as Record<string, string>;
const activeCats = new Set(JSON.parse(readFileSync(join(ROOT, "src/data/active-categories.json"), "utf8")) as string[]);
const reviewsIndex = JSON.parse(readFileSync(join(ROOT, "src/data/reviewsIndex.json"), "utf8")) as Record<string, { apps: { id: string }[] }>;
const ratingSlugs = new Set(
  readdirSync(join(ROOT, "src/data/peoplesRating"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, "")),
);
let getIdeaCategory: ((id: string) => string | null) | null = null;

async function loadIdeaLookup() {
  try {
    const mod = await import("../../../src/lib/ideas");
    getIdeaCategory = (id: string) => mod.getIdea(id)?.category ?? null;
    // --old-ideas: every id of the old idea catalogue (old /ideas/<id> 308-redirected to its topic).
    if (flag("--old-ideas")) for (const i of mod.listIdeas()) for (const l of ["ru", "en"]) addUrl(`/${l}/ideas/${i.slug}`, "old:idea-ids");
  } catch (e) {
    sourceErrors.push(`src/lib/ideas (old idea redirects not followed): ${(e as Error).message}`);
  }
}

const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const P = (...parts: string[]) => join("src/app", ...parts);

/** null = ok; string = why the page would call notFound(). */
function dataCheck(route: RouteFile, params: Record<string, string | string[]>, lang: string | null): string | null {
  const f = route.file;
  const one = (k: string) => (Array.isArray(params[k]) ? (params[k] as string[]).join("/") : (params[k] as string));
  if (route.group === "site") {
    if (f.includes("[...missing]")) return "new-site catch-all [...missing] → notFound()";
    if (f === P("(site)/site/[lang]/segment/[slug]/page.tsx")) {
      const s = one("slug");
      if (!isLaunchCategory(s)) return `segment "${s}" not in LAUNCH_CATEGORIES`;
      if (!existsSync(join(ROOT, "content/v2", lang!, "research", `${s}.json`))) return `content/v2/${lang}/research/${s}.json missing`;
    }
    if (f === P("(site)/site/[lang]/ideas/[id]/page.tsx")) {
      const id = one("id");
      if (!isLaunchIdea(id)) return `idea "${id}" not in LAUNCH_IDEAS`;
      if (!existsSync(join(ROOT, "content/v2", lang!, "ideas", `${id}.json`))) return `content/v2/${lang}/ideas/${id}.json missing`;
    }
    return null;
  }
  if (route.group === "old") {
    if (f === P("(old)/[slug]/page.tsx") && !(one("slug") in appSlugs)) return `app slug "${one("slug")}" not in src/data/app-slugs.json`;
    if (f === P("(old)/segment/[slug]/page.tsx") && activeCats.size && !activeCats.has(one("slug"))) return `segment "${one("slug")}" not in active-categories.json`;
    if (f === P("(old)/reviews/[slug]/page.tsx") && !reviewsIndex[one("slug")]) return `reviews niche "${one("slug")}" not in reviewsIndex.json`;
    if (f === P("(old)/reviews/[slug]/[id]/page.tsx")) {
      const n = reviewsIndex[one("slug")];
      if (!n || !n.apps.some((a) => a.id === one("id"))) return `reviews app "${one("slug")}/${one("id")}" not in reviewsIndex.json`;
    }
    if (f === P("(old)/rating/[slug]/page.tsx") && !ratingSlugs.has(one("slug"))) return `rating "${one("slug")}" not in src/data/peoplesRating`;
  }
  return null;
}

/** Unconditional redirects of old pages, modelled from their source (status, internal target). */
function appRedirect(route: RouteFile, params: Record<string, string | string[]>): { status: 307 | 308; internal: string; modeAware: boolean } | null {
  const f = route.file;
  const src = () => read(f);
  const modeAware = () => /getOldSiteMode\s*\(/.test(src()) || /\bpublicHref\s*\(/.test(src());
  if (f === P("(old)/catalog/page.tsx") || f === P("(old)/categories/page.tsx")) return { status: 307, internal: "/", modeAware: modeAware() };
  if (f === P("(old)/premium/page.tsx")) return { status: 307, internal: "/tokens", modeAware: modeAware() };
  if (f === P("(old)/segment/[slug]/v2/page.tsx")) return { status: 307, internal: `/segment/${params.slug}`, modeAware: modeAware() };
  if (f === P("(old)/ideas/[slug]/page.tsx") && getIdeaCategory) {
    const cat = getIdeaCategory(String(params.slug));
    if (!cat) return null; // notFound() — reported by the 404 path below
    return { status: 308, internal: `/segment/${cat}`, modeAware: modeAware() };
  }
  return null;
}

// ───────────────────────────── new-page SEO (static source check) ─────────────────────────────

type PageSeo = { noindex: boolean; canonical: boolean; hreflang: boolean };
const seoCache = new Map<string, PageSeo>();
function newPageSeo(file: string): PageSeo {
  if (seoCache.has(file)) return seoCache.get(file)!;
  const layout = read(P("(site)/site/[lang]/layout.tsx"));
  const page = read(file);
  const both = page + "\n" + layout;
  const seo: PageSeo = {
    noindex: /index\s*:\s*false/.test(page) || /noindex/.test(page),
    canonical: /canonical\s*:/.test(both) || /alternates\s*:/.test(both) || /\bbuildAlternates\b|\bpageMetadata\b|\bseoMetadata\b/.test(both),
    hreflang: /languages\s*:/.test(both) || /\bbuildAlternates\b|\bpageMetadata\b|\bseoMetadata\b/.test(both),
  };
  seoCache.set(file, seo);
  return seo;
}

// ───────────────────────────── simulation ─────────────────────────────

type Persona = { name: string; cookie: string | null; acceptLanguage: string | null };
const GUEST: Persona = { name: "guest(bot, no cookie, no Accept-Language)", cookie: null, acceptLanguage: null };
const BARE_PERSONAS: Persona[] = [
  GUEST,
  { name: "YandexBot(ru)", cookie: null, acceptLanguage: "ru, uk;q=0.8, be;q=0.8, en;q=0.7, *;q=0.01" },
  { name: "browser de", cookie: null, acceptLanguage: "de-DE,de;q=0.9,en;q=0.8" },
  { name: "cookie ja", cookie: "ja", acceptLanguage: null },
];

type Hop = { from: string; status: number; to: string; by: "next-trailing-slash" | "proxy" | "old-page" };
type Final =
  | { cls: "new" | "inplace" | "archive"; publicPath: string; internal: string; file: string; locale: string }
  | { cls: "untouched"; publicPath: string; file: string }
  | { cls: "new-404" | "old-404" | "untouched-404" | "loop"; publicPath: string; internal?: string; file?: string; reason: string };
type Sim = { url: string; persona: string; hops: Hop[]; final: Final };

function simulate(start: string, persona: Persona): Sim {
  const hops: Hop[] = [];
  let cur = start;
  let cookie = persona.cookie;
  for (let n = 0; n < 7; n++) {
    const u = new URL(cur, ORIGIN);
    const pathname = u.pathname;
    const search = u.search;
    // Next's built-in trailing-slash redirect (trailingSlash: false) runs before the proxy.
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const to = pathname.replace(/\/+$/, "") + search;
      hops.push({ from: cur, status: 308, to, by: "next-trailing-slash" });
      cur = to;
      continue;
    }
    const matched = unstable_doesMiddlewareMatch({ config: proxyConfig, url: pathname });
    if (!matched) {
      const m = matchRoute(pathname);
      if (m) return { url: start, persona: persona.name, hops, final: { cls: "untouched", publicPath: pathname, file: m.route.file } };
      if (existsSync(join(ROOT, "public", decodeURIComponent(pathname)))) return { url: start, persona: persona.name, hops, final: { cls: "untouched", publicPath: pathname, file: `public${pathname}` } };
      return { url: start, persona: persona.name, hops, final: { cls: "untouched-404", publicPath: pathname, reason: "proxy skips it and no public file / route matches" } };
    }
    const d: RoutingDecision = decideRoute({ pathname, search, cookies: { locale: cookie }, acceptLanguage: persona.acceptLanguage });
    if (d.type === "redirect") {
      hops.push({ from: cur, status: d.status, to: d.location, by: "proxy" });
      cur = d.location;
      continue;
    }
    // Rewrites may set the locale cookie; a crawler would not keep it, a browser would.
    if (persona.cookie !== null) for (const c of d.cookies) if (c.name === "locale") cookie = c.value;
    const m = matchRoute(d.pathname);
    const cls = d.site === "new" ? "new" : d.site === "old" ? "archive" : "inplace";
    const want = d.site === "new" ? "site" : "old";
    if (!m) {
      return { url: start, persona: persona.name, hops, final: { cls: d.site === "new" ? "new-404" : "old-404", publicPath: pathname, internal: d.pathname, reason: "no route matches the internal path" } };
    }
    if (m.route.group !== want) {
      return {
        url: start,
        persona: persona.name,
        hops,
        final: { cls: d.site === "new" ? "new-404" : "old-404", publicPath: pathname, internal: d.pathname, file: m.route.file, reason: `rewrite for site=${d.site} matched a ${m.route.group} route` },
      };
    }
    const lang = d.site === "new" ? (m.params.lang as string) : d.locale;
    const bad = dataCheck(m.route, m.params, lang);
    if (bad) return { url: start, persona: persona.name, hops, final: { cls: d.site === "new" ? "new-404" : "old-404", publicPath: pathname, internal: d.pathname, file: m.route.file, reason: bad } };
    if (d.site !== "new") {
      const r = appRedirect(m.route, m.params);
      if (r) {
        const l = d.locale;
        const to = d.site === "inplace" && r.modeAware ? `/${l}${r.internal === "/" ? "" : r.internal}` : `/${l}/old${r.internal === "/" ? "" : r.internal}`;
        hops.push({ from: cur, status: r.status, to, by: "old-page" });
        cur = to;
        continue;
      }
    }
    return { url: start, persona: persona.name, hops, final: { cls, publicPath: pathname, internal: d.pathname, file: m.route.file, locale: d.locale } };
  }
  return { url: start, persona: persona.name, hops, final: { cls: "loop", publicPath: cur, reason: "more than 6 hops" } };
}

// ───────────────────────────── robots.txt ─────────────────────────────

function robotsBlocks(robots: string, path: string): string | null {
  // Minimal group parser for User-agent: * and Googlebot/YandexBot; longest-match wins, Allow on tie.
  const groups: { agents: string[]; rules: { allow: boolean; p: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2].trim();
    if (k === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (k === "allow" || k === "disallow") && v) cur.rules.push({ allow: k === "allow", p: v });
    }
  }
  for (const agent of ["googlebot", "yandexbot", "*"]) {
    const g = groups.find((x) => x.agents.includes(agent)) ?? groups.find((x) => x.agents.includes("*"));
    if (!g) continue;
    let best: { allow: boolean; p: string } | null = null;
    for (const r of g.rules) {
      const re = new RegExp("^" + r.p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
      if (re.test(path) && (!best || r.p.length > best.p.length || (r.p.length === best.p.length && r.allow))) best = r;
    }
    if (best && !best.allow) return `${agent}: Disallow ${best.p}`;
  }
  return null;
}

// ───────────────────────────── live check (optional) ─────────────────────────────

type Live = { url: string; chain: string[]; status: number; xRobots: string | null; metaRobots: string | null; canonical: string | null; error?: string };

async function liveCheck(path: string): Promise<Live> {
  const chain: string[] = [];
  let url = LIVE!.replace(/\/$/, "") + path;
  try {
    for (let n = 0; n < 6; n++) {
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) inapp-seo-audit" }, signal: AbortSignal.timeout(30000) });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        chain.push(`${res.status} ${new URL(res.headers.get("location")!, url).pathname}`);
        url = new URL(res.headers.get("location")!, url).toString();
        await res.arrayBuffer().catch(() => null);
        continue;
      }
      const html = res.headers.get("content-type")?.includes("html") ? await res.text() : "";
      const meta = /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i.exec(html)?.[1] ?? null;
      const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i.exec(html)?.[1] ?? null;
      return { url: path, chain, status: res.status, xRobots: res.headers.get("x-robots-tag"), metaRobots: meta, canonical };
    }
    return { url: path, chain, status: 0, xRobots: null, metaRobots: null, canonical: null, error: "too many redirects" };
  } catch (e) {
    return { url: path, chain, status: 0, xRobots: null, metaRobots: null, canonical: null, error: (e as Error).message };
  }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

// ───────────────────────────── main ─────────────────────────────

async function main() {
  await loadProxy();
  if (SOURCE === "prod" || SOURCE === "both") await collectProd();
  for (const s of EXTRA_SITEMAPS) await collectSitemap(s, "extra:sitemap").catch((e) => sourceErrors.push(`extra sitemap ${s}: ${(e as Error).message}`));
  if (SOURCE === "code" || SOURCE === "both") await collectCode();
  collectContract();
  await loadIdeaLookup();
  // The old site's own navigation now points into /<L>/old/… (src/lib/oldHref.ts): every page the
  // sitemap knows and every header/footer entry must also resolve inside the archive.
  if (!flag("--no-archive-mirror")) {
    for (const [u, src] of [...urls]) {
      const m = /^\/(ru|en)(\/.*)?$/.exec(u.split("?")[0]);
      if (m && [...src].some((x) => /:sitemap/.test(x)) && !u.startsWith(`/${m[1]}/old`)) addUrl(`/${m[1]}/old${(m[2] ?? "").replace(/\/$/, "")}`, "archive-mirror");
    }
    for (const f of ["src/components/Header.tsx", "src/components/Footer.tsx"]) {
      for (const m of read(f).matchAll(/path:\s*"(\/[^"]*)"/g)) for (const l of ["ru", "en"]) addUrl(`/${l}/old${m[1] === "/" ? "" : m[1]}`, "archive-nav");
    }
  }

  const all = [...urls.keys()].sort();
  const sims: (Sim & { sources: string[]; extra: Sim[] })[] = [];
  for (const u of all) {
    const bare = !LOCALES.some((l) => u === `/${l}` || u.startsWith(`/${l}/`) || u.startsWith(`/${l}?`));
    const main = simulate(u, GUEST);
    const extra = bare ? BARE_PERSONAS.slice(1).map((p) => simulate(u, p)) : [];
    sims.push({ ...main, sources: [...urls.get(u)!].sort(), extra });
  }

  const indexedSrc = (s: string[]) => s.some((x) => /^(prod|code):sitemap/.test(x));
  const byClass = new Map<string, number>();
  const byClassRedirected = new Map<string, number>();
  const problems: { sev: "blocker" | "major" | "minor"; url: string; what: string; sources: string[] }[] = [];

  for (const s of sims) {
    const k = s.final.cls;
    byClass.set(k, (byClass.get(k) ?? 0) + 1);
    if (s.hops.length) byClassRedirected.set(k, (byClassRedirected.get(k) ?? 0) + 1);
    const indexed = indexedSrc(s.sources);
    const chain = s.hops.map((h) => `${h.status}[${h.by}] ${h.to}`).join(" → ");
    const f = s.final;
    if (f.cls === "new-404" || f.cls === "old-404" || f.cls === "untouched-404" || f.cls === "loop")
      problems.push({ sev: indexed ? "blocker" : "major", url: s.url, what: `${f.cls}: ${f.reason}${"internal" in f && f.internal ? ` (internal ${f.internal})` : ""}${chain ? ` via ${chain}` : ""}`, sources: s.sources });
    if (f.cls === "archive" && s.hops.length)
      problems.push({ sev: indexed ? "blocker" : "major", url: s.url, what: `redirects into the noindexed archive: ${chain}`, sources: s.sources });
    if (s.hops.length > MAX_HOPS) problems.push({ sev: "minor", url: s.url, what: `${s.hops.length}-hop chain (${GUEST.name}): ${chain}`, sources: s.sources });
    if (s.hops.length && s.sources.some((x) => x.startsWith("code:sitemap")))
      problems.push({ sev: "minor", url: s.url, what: `code sitemap lists a redirecting URL (${chain}); list the final URL`, sources: s.sources });
    for (const e of s.extra) {
      if (e.hops.length > MAX_HOPS) problems.push({ sev: "minor", url: s.url, what: `${e.hops.length}-hop chain for ${e.persona}: ${e.hops.map((h) => `${h.status} ${h.to}`).join(" → ")}`, sources: s.sources });
      if (e.final.cls.endsWith("404")) problems.push({ sev: "major", url: s.url, what: `${e.final.cls} for ${e.persona}`, sources: s.sources });
    }
    if (f.cls === "new" && indexed) {
      const seo = newPageSeo(f.file);
      const was = s.sources.some((x) => x.startsWith("prod:sitemap")) ? "indexed today (self-canonical on the old site)" : "listed in the code sitemap";
      if (seo.noindex) problems.push({ sev: STRICT ? "blocker" : "major", url: s.url, what: `${was}, but NEW page ${f.file} is noindex`, sources: s.sources });
      if (!seo.canonical) problems.push({ sev: STRICT ? "blocker" : "major", url: s.url, what: `${was}, but NEW page ${f.file} emits no canonical/hreflang (canonical changes)`, sources: s.sources });
    }
  }

  // Old-site navigation (src/lib/oldHref.ts) is what in-place pages render as links. A link from an
  // indexed in-place page to another in-place page must not go through the noindexed archive copy.
  try {
    const { oldHref } = await import("../../../src/lib/oldHref");
    const intoArchive: string[] = [];
    for (const s of sims) {
      if (!indexedSrc(s.sources) || s.final.cls !== "inplace" || s.hops.length) continue;
      const m = /^\/(ru|en)(\/.*)?$/.exec(s.url.split("?")[0]);
      if (!m) continue;
      const link = oldHref(m[1], m[2] ?? "/");
      const d = simulate(link, GUEST);
      if (d.final.cls === "archive") intoArchive.push(`${s.url} ← linked as ${link}`);
    }
    let lpPrefix = 0;
    const walk = (d: string) => {
      for (const name of readdirSync(join(ROOT, d))) {
        const rel = join(d, name);
        if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(name)) lpPrefix += (read(rel).match(/\boldLp\(|\boldHref\(/g) ?? []).length;
      }
    };
    for (const dir of ["src/app/(old)", "src/components"]) walk(dir);
    if (intoArchive.length)
      problems.push({
        sev: "major",
        url: intoArchive[0].split(" ")[0],
        what: `old-site links from indexed in-place pages go to the noindexed archive copy: ${intoArchive.length} of the in-place sitemap URLs are linked as /<L>/old/… (oldHref/oldLp call sites in old code: ${lpPrefix}); e.g. ${intoArchive.slice(0, 3).join("; ")}`,
        sources: ["src/lib/oldHref.ts"],
      });
  } catch (e) {
    sourceErrors.push(`oldHref check: ${(e as Error).message}`);
  }

  // robots.txt: sitemap URLs must be crawlable, /<L>/old must NOT be disallowed (noindex must be visible).
  for (const r of robotsReport) {
    for (const s of sims) {
      if (!indexedSrc(s.sources)) continue;
      const hit = robotsBlocks(r.text, new URL(s.url, ORIGIN).pathname);
      if (hit) problems.push({ sev: "blocker", url: s.url, what: `robots.txt (${r.source}) blocks it: ${hit}`, sources: s.sources });
    }
    for (const p of ["/ru/old", "/en/old/segment/habit-tracking"]) {
      const hit = robotsBlocks(r.text, p);
      if (hit) problems.push({ sev: "major", url: p, what: `robots.txt (${r.source}) blocks the archive, so crawlers never see its noindex: ${hit}`, sources: ["robots"] });
    }
    if (!/^\s*sitemap:/im.test(r.text)) problems.push({ sev: "minor", url: "/robots.txt", what: `robots.txt (${r.source}) has no Sitemap: line`, sources: ["robots"] });
  }

  // Sitemap coverage of the new site (informational): launch topics/ideas in all 5 locales.
  const codeMap = new Set(sims.filter((s) => s.sources.includes("code:sitemap") || s.sources.includes("code:sitemap:hreflang")).map((s) => s.url));
  const coverage = { topics: { expected: 0, listed: 0 }, ideas: { expected: 0, listed: 0 }, homes: { expected: 0, listed: 0 } };
  if (SOURCE !== "prod") {
    for (const l of LOCALES) {
      coverage.homes.expected++;
      if (codeMap.has(`/${l}`)) coverage.homes.listed++;
      for (const c of LAUNCH_CATEGORIES) {
        coverage.topics.expected++;
        if (codeMap.has(`/${l}/segment/${c}`)) coverage.topics.listed++;
      }
      for (const i of LAUNCH_IDEAS) {
        coverage.ideas.expected++;
        if (codeMap.has(`/${l}/ideas/${i}`)) coverage.ideas.listed++;
      }
    }
  }
  // Indexed today but dropped from the code sitemap (still resolving is fine; 404 is caught above).
  const dropped = sims.filter((s) => s.sources.includes("prod:sitemap") && SOURCE === "both" && !s.sources.some((x) => x.startsWith("code:sitemap")));

  // Live pass.
  let live: Live[] = [];
  if (LIVE) {
    const eligible = sims.filter((s) => !LIVE_ONLY || LIVE_ONLY === "all" || s.final.cls === LIVE_ONLY);
    // --live-limit takes an evenly spaced sample so every section is represented.
    const step = eligible.length > LIVE_LIMIT ? eligible.length / LIVE_LIMIT : 1;
    const pick = eligible.length > LIVE_LIMIT ? Array.from({ length: LIVE_LIMIT }, (_, i) => eligible[Math.floor(i * step)]) : eligible;
    live = await pool(pick.map((s) => s.url), LIVE_CONCURRENCY, liveCheck);
    for (const l of live) {
      const sim = sims.find((s) => s.url === l.url)!;
      const expectPath = sim.final.publicPath;
      const expected = ORIGIN + (expectPath === "/" ? "" : expectPath);
      if (l.error || l.status !== 200) problems.push({ sev: "blocker", url: l.url, what: `live: ${l.error ?? `HTTP ${l.status}`} ${l.chain.join(" → ")}`, sources: sim.sources });
      else if (indexedSrc(sim.sources) && sim.final.cls !== "archive") {
        if (/noindex/i.test(`${l.xRobots ?? ""} ${l.metaRobots ?? ""}`)) problems.push({ sev: "blocker", url: l.url, what: `live: noindex (${l.xRobots ?? ""} ${l.metaRobots ?? ""})`, sources: sim.sources });
        if (l.canonical !== expected) problems.push({ sev: "major", url: l.url, what: `live: canonical ${l.canonical ?? "(none)"} ≠ ${expected}`, sources: sim.sources });
      }
    }
  }

  // ───── report ─────
  const out: string[] = [];
  out.push(`# site-v2 search-traffic audit (${new Date().toISOString()})`);
  out.push(`sources: ${SOURCE}${LIVE ? `, live ${LIVE}` : ""}; unique URLs: ${sims.length}`);
  const srcCount = new Map<string, number>();
  for (const s of sims) for (const x of s.sources) srcCount.set(x, (srcCount.get(x) ?? 0) + 1);
  out.push("by source: " + [...srcCount].sort().map(([k, v]) => `${k}=${v}`).join(", "));
  if (sourceErrors.length) out.push("source errors:\n  " + sourceErrors.join("\n  "));
  out.push("");
  out.push(`## final class (${GUEST.name})  [of which reached via redirect]`);
  for (const [k, v] of [...byClass].sort()) out.push(`  ${k.padEnd(14)} ${String(v).padStart(5)}   [${byClassRedirected.get(k) ?? 0}]`);
  const indexedSims = sims.filter((s) => indexedSrc(s.sources));
  const idxClass = new Map<string, number>();
  for (const s of indexedSims) idxClass.set(s.final.cls + (s.hops.length ? "(via redirect)" : ""), (idxClass.get(s.final.cls + (s.hops.length ? "(via redirect)" : "")) ?? 0) + 1);
  out.push(`## sitemap URLs only (${indexedSims.length})`);
  for (const [k, v] of [...idxClass].sort()) out.push(`  ${k.padEnd(28)} ${String(v).padStart(5)}`);
  const perSection = new Map<string, Map<string, number>>();
  for (const s of indexedSims) {
    const segs = s.url.split("?")[0].split("/").filter(Boolean);
    const sec = segs.length <= 1 ? "(home)" : ["segment", "ideas", "reviews", "rating", "best", "build"].includes(segs[1]) ? segs[1] + (segs.length > 2 ? "/*" : "") : segs.length === 2 ? "(top-level page or app slug)" : segs[1];
    const m = perSection.get(sec) ?? new Map();
    m.set(s.final.cls, (m.get(s.final.cls) ?? 0) + 1);
    perSection.set(sec, m);
  }
  out.push("## sitemap URLs by section → class");
  for (const [sec, m] of [...perSection].sort()) out.push(`  ${sec.padEnd(30)} ${[...m].map(([k, v]) => `${k}=${v}`).join(" ")}`);
  if (SOURCE !== "prod") {
    out.push("## new-site coverage in the code sitemap (informational)");
    out.push(`  homes ${coverage.homes.listed}/${coverage.homes.expected}, launch topics ${coverage.topics.listed}/${coverage.topics.expected}, launch ideas ${coverage.ideas.listed}/${coverage.ideas.expected}`);
  }
  if (dropped.length) out.push(`## in the production sitemap but not in the code sitemap: ${dropped.length}` + (VERBOSE ? "\n  " + dropped.map((d) => d.url).join("\n  ") : " (--verbose lists them)"));
  const chains = sims.filter((s) => s.hops.length);
  out.push(`## redirects (${chains.length} URLs start with a redirect)`);
  const chainKinds = new Map<string, string[]>();
  for (const s of chains) {
    const kind = s.hops.map((h) => `${h.status}[${h.by}]`).join("→") + ` ⇒ ${s.final.cls}`;
    chainKinds.set(kind, [...(chainKinds.get(kind) ?? []), s.url]);
  }
  for (const [k, v] of chainKinds) out.push(`  ${String(v.length).padStart(5)}  ${k}   e.g. ${v.slice(0, 3).join(", ")}`);
  out.push("");
  const sevOrder = { blocker: 0, major: 1, minor: 2 } as const;
  problems.sort((a, b) => sevOrder[a.sev] - sevOrder[b.sev] || a.what.localeCompare(b.what) || a.url.localeCompare(b.url));
  out.push(`## problems (${problems.length}): blocker=${problems.filter((p) => p.sev === "blocker").length} major=${problems.filter((p) => p.sev === "major").length} minor=${problems.filter((p) => p.sev === "minor").length}`);
  // Group identical messages (modulo the URL) to keep the output readable.
  const grouped = new Map<string, typeof problems>();
  for (const p of problems) {
    const key = `${p.sev}|${p.what.replace(/\/(ru|en|de|fr|ja)\//g, "/<L>/").replace(/segment\/[a-z0-9-]+|ideas\/[a-z0-9-]+/g, (m) => m.split("/")[0] + "/*")}`;
    grouped.set(key, [...(grouped.get(key) ?? []), p]);
  }
  for (const [, ps] of grouped) {
    const p = ps[0];
    out.push(`  [${p.sev}] ×${ps.length} ${p.what}`);
    out.push(`      e.g. ${ps.slice(0, VERBOSE ? ps.length : 4).map((x) => `${x.url} (${x.sources.join("+")})`).join("\n           ")}${!VERBOSE && ps.length > 4 ? `\n           … ${ps.length - 4} more (--verbose)` : ""}`);
  }
  if (live.length) {
    out.push(`## live (${live.length} fetched from ${LIVE})`);
    const canon = new Map<string, number>();
    for (const l of live) {
      const expected = ORIGIN + (l.url === "/" ? "" : l.url.split("?")[0].replace(/\/$/, ""));
      const k = l.error ? `error` : `${l.status} canonical=${l.canonical === expected ? "self" : l.canonical ? "other" : "none"} robots=${/noindex/i.test(`${l.xRobots} ${l.metaRobots}`) ? "noindex" : "index"}`;
      canon.set(k, (canon.get(k) ?? 0) + 1);
    }
    for (const [k, v] of canon) out.push(`  ${String(v).padStart(5)}  ${k}`);
    if (VERBOSE) for (const l of live) out.push(`    ${l.url}  ${l.status} ${l.chain.join(" → ")} canonical=${l.canonical} xr=${l.xRobots} meta=${l.metaRobots}`);
  }
  console.log(out.join("\n"));

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), source: SOURCE, sims, problems, coverage, live, sourceErrors }, null, 1));
    console.log(`\nJSON: ${JSON_OUT}`);
  }
  const failing = problems.filter((p) => p.sev === "blocker" || (p.sev === "major" && /404|archive|loop/.test(p.what)) || (p.sev === "minor" && /hop chain/.test(p.what) && !/for /.test(p.what)));
  process.exit(failing.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
