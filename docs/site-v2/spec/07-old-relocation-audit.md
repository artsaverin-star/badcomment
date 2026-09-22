# 07 — Moving the current site under `/old`: URL audit, proxy, SEO, codemod

Status: research spec (read-only audit of branch `site-v2`, commit `7c0dbf4`, 2026-09-22).
Scope: `/Users/artsaverin/projects/badcomment-v2` — `src/app/**` (except `api`), `src/components/**`, `src/lib/**`, plus the shared API routes, CI and infra that produce **page** URLs.
Goal: today's `https://inapp.pro/<ru|en>/<path>` keeps working as `https://inapp.pro/old/<ru|en>/<path>`. Old page files keep their internal paths (`src/app/segment/[slug]` stays at internal `/segment/[slug]`). `src/proxy.ts` rewrites `/old/<loc>/<rest>` → `/<rest>` with `x-locale`. The NEW site owns `/<loc>/<rest>`, served from a separate internal folder. `/api/*` does not move.

Conventions in this doc
- `file:line` refers to the current code in this worktree.
- "Internal path" = the path after the proxy rewrite (what `src/app` routes see). "Public path" = what the browser shows.
- Helper names (`oldHref`, `oldUrl`, `oldLp`, `splitOldPath`, `oldAlternates`, `OLD_ROBOTS`, `OLD_PREFIX`) are the proposed API from §10. They do not exist yet.
- `NEW_BASE` (`/v2` below) is a placeholder for the new site's internal folder. The IA spec picks the final name. `NEW_TOP` is the set of top-level segments the new site owns. The IA spec fills it too.

---

## 0. TL;DR

1. **About 180 URL-producing sites in about 60 live files** would send users from the old site to the new one after the switch (counts in §5.0). About 66 of them come from **30 copies of one constant**, `const lp = ru ? "/ru" : "/en"`. Changing that constant to `oldLp(locale)` fixes those 66 sites at once. The rest are per-line edits: hard-coded `"/ru"`, inline `` `/${ru ? "ru" : "en"}/…` ``, bare `"/…"` paths, metadata and JSON-LD, redirects, and the locale switchers.
2. **Five places break outright, not just "link to the wrong site":**
   - `LangMenu`/`LangSwitch` path parsing (`LangMenu.tsx:60-62`, `LangSwitch.tsx:24-26`). On `/old/ru/x` they navigate to `/en/old/ru/x`.
   - The YooKassa `return_url` (`api/pay/yookassa/route.ts:58`, bare `/library?checkout=`). `library` becomes a new-site route, so payment confirmation would land on the new site.
   - The MCP OAuth bridge (`api/mcp/oauth/authorize/route.ts:101`, `/${locale}/mcp/connect`).
   - MCP tool texts (`lib/mcp/tools.ts:407,420`, `https://inapp.pro/ru/mcp`).
   - CI smoke tests (`.github/workflows/deploy.yml:118,131,137,149`).
3. **Root layout isolation is a prerequisite, not a URL issue.** `src/app/layout.tsx` and `template.tsx` currently wrap every route. That includes the old Header/Footer, `globals.css`, `@saverin/tokens/css`, analytics and JSON-LD, so they would wrap the new site too. Recommended fix: route groups `(old)` and `(new)` with two root layouts (§9).
4. **Proxy:** use an explicit **old-route denylist**. That is the 18 static old segments plus the 1,516 keys of `src/data/app-slugs.json`. Those paths get a 307 to `/old/<ru|en>/…`. Everything else under `/<loc>/…` goes to the new site, which also owns its own 404 (§4). Clash routes need sub-path rules: `ideas/top` → old; `library?checkout=` → old for payments started before launch.
5. **SEO:** send `X-Robots-Tag: noindex, follow` on every `/old` response, set a self canonical, and drop hreflang. Keep `/old` out of the sitemap and do **not** add it to `Disallow`. Serious open trade-off: old URLs that redirect to a noindexed `/old` fall out of the index. The alternative is mapping the 72 `/segment/<slug>` (and `/rating/<slug>`) URLs to the new research pages. All 72 old category slugs exist in the app bundle (§7.4).
6. **Codemod:** one client-safe helper (`src/lib/oldSite.ts`) with an `OLD_PREFIX` constant. Set to `""`, the helper returns exactly today's URLs, so the codemod can merge early with zero behavior change. The launch commit flips it to `"/old"` together with the proxy flag (§10).

---

## 1. Method

Greps run over `src/app` (excluding `src/app/api` unless stated), `src/components` and `src/lib`:

| Pattern family | Regex (examples) |
|---|---|
| Locale-prefix constants | `\blp\b`, `localePrefix`, `"/ru"`, `"/en"`, `ru ? "ru" : "en"` |
| Template URLs | `` /\$\{(ru\|locale\|lp)…\} ``, `` `/${…}` `` |
| JSX/objects | `href[=:]`, `fallback=`, `moreHref`, `backHref`, `reviewHref`, `hrefBack`, `hrefNiches`, `action=` |
| Navigation | `router.(push\|replace\|prefetch)`, `redirect(`, `permanentRedirect(`, `NextResponse.redirect`, `window.location`, `location.(href\|assign\|replace)`, `history.*State`, `window.open` |
| Metadata/SEO | `canonical`, `alternates`, `languages`, `openGraph`, `url:`, `mainEntityOfPage`, `item:`, `application/ld+json`, `robots:` |
| Absolute | `inapp\.pro` |
| Path matching | `usePathname`, `pathname`, `document.referrer` |
| Bare routes | every string literal starting with `"/` or `` `/ `` (excluding `/api`, `/_next`, static assets) |

96 files matched at least one pattern. Every file was then read at the matching lines. Dead code was found with an import scan (§5.12).

---

## 2. How routing works today (facts the relocation depends on)

| Fact | Evidence |
|---|---|
| Proxy handles `/ru/<p>` and `/en/<p>` by **rewriting** to `/<p>`. It sets request header `x-locale` and cookie `locale` (1 year, `path=/`). | `src/proxy.ts:25-34` |
| Any other path gets a **307** to `/<cookie or Accept-Language locale><path>`, query preserved (`nextUrl.clone()`). Default is `en`. | `src/proxy.ts:14-19,36-39` |
| The matcher skips `api`, `_next/static`, `_next/image`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon`, and any path containing a dot. So `sitemap.xml`, `robots.txt`, `feed.xml`, `llms*.txt`, `.well-known/*` and `public/*` never reach the proxy. | `src/proxy.ts:42-48` |
| Server locale is `x-locale` header, then `locale` cookie, then `en`. Old code treats any non-`en` value as `ru` (`const ru = locale !== "en"`). | `src/lib/i18n.server.ts:7-12` |
| `.well-known/oauth-*` are next.config rewrites onto `/api/mcp/oauth/meta/*`. | `next.config.ts:18-25` |
| Proxy runs on the Node.js runtime in Next 16.2.6, so importing JSON (e.g. `app-slugs.json`) into it is fine. | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:217-219` |
| `usePathname()` on the **client** returns the **browser** path: `/ru/x` today, `/old/ru/x` after the move. During **SSR** it returns the **rewritten internal** path (`/x`). Any pathname regex must handle all three forms. | `node_modules/next/dist/client/components/router-reducer/create-initial-router-state.js:30-32` (client canonical = `location`); `…/docs/…/use-pathname.md:39,104-108` |
| No custom `not-found.tsx` exists. `notFound()` renders Next's default 404 inside the root layout. | `find src/app -name 'not-found*'` → none |
| There is one root layout. It contains Header, Footer, PageTracker, FavSync, the brand JSON-LD, analytics (YM, GA, DataFast), `globals.css` and `@saverin/tokens/css`. `template.tsx` adds a fade wrapper. | `src/app/layout.tsx:1-151`, `src/app/template.tsx:1-8` |
| All old page files are dynamic (`force-dynamic`, `headers()`/`cookies()`), so the rewrite approach needs no `generateStaticParams` work. | e.g. `src/app/page.tsx:16`, `src/app/[slug]/page.tsx:15` |
| No app slug contains a dot (0 of 1,516), so the dot-exclusion in the matcher never hides an app page. No app slug equals a reserved segment name. | `src/data/app-slugs.json` (checked with node) |

---

## 3. Top-level route inventory and classification

Old top-level entries in `src/app/*`. "Class" values:
- **OLD-ONLY**: redirect `/<loc>/<seg>…` to `/old/<ru|en>/<seg>…`.
- **CLASH**: the new site owns the URL; there may be legacy sub-path rules.
- **POTENTIAL CLASH**: depends on names chosen in the IA spec.
- **SPECIAL**: not locale-routed.

| Entry (`src/app/…`) | Internal sub-routes | Public URLs today | Class | Proxy rule for `/<loc>/…` (new world) | Notes |
|---|---|---|---|---|---|
| `page.tsx` (home «Разборы» / "Breakdowns") | `/` | `/ru`, `/en` | **CLASH** (new home/landing) | new | Old home is reachable at `/old/<ru\|en>` |
| `[slug]` + `[slug]/test` | `/<app-slug>`, `/<app-slug>/test` | `/ru/<app-slug>` (≤862 indexed app landings) | **OLD-ONLY** (dynamic) | 307 → `/old/…` when `seg ∈ keys(app-slugs.json)` (1,516) | `resolve()` only renders known slugs (`[slug]/page.tsx:35-66`) |
| `admin` | `/admin`, `/admin/posts` | `/ru/admin` | OLD-ONLY | → `/old` | Linked from `AuthButton` |
| `apps` | `/apps` | `/ru/apps` | OLD-ONLY | → `/old` | In sitemap (`sitemap.ts:45`) |
| `best` | `/best/<slug>` | `/ru/best/<slug>` | OLD-ONLY | → `/old` | Not in sitemap |
| `build` | `/build`, `/build/<niche>`, `/build/<niche>/<idea>` | | OLD-ONLY | → `/old` | «Создание» ("Create") |
| `cards` | `/cards` | | OLD-ONLY | → `/old` | Swipe idea feed |
| `catalog` | `/catalog` (stub → `/`) | | OLD-ONLY / POTENTIAL CLASH | → `/old` unless the IA spec takes `catalog` | The iOS app has `ClarityCatalogs.swift` |
| `categories` | `/categories` (stub → `/<loc>`) | | OLD-ONLY / POTENTIAL CLASH | → `/old` unless the IA spec takes it | |
| `contacts` | `/contacts` | | **POTENTIAL CLASH** (legal) | Decision (Q3) | ЮKassa requires legal pages (`Footer.tsx:7-8`) |
| `exp` | `/exp/calm` | | OLD-ONLY | → `/old` | Experiment |
| `ideas` | `/ideas` (`?cat=`, `?sort=`), `/ideas/top`, `/ideas/<slug>` (308 → `/segment/<cat>`) | | **CLASH** | `/ideas` → new. `/ideas/top` → **old**. `/ideas/<id>` → new; the new site handles unknown ids (see §4.4) | 592/592 app idea IDs ⊂ 851 old idea slugs (same `<category>-<n>` format) |
| `library` | `/library` (`?checkout=`) | | **CLASH** | new, except `?checkout=` from payments started before launch → old (§4.3) | YooKassa return target |
| `mcp` | `/mcp`, `/mcp/connect?o=` | | OLD-ONLY (unless the new site ships an MCP page) | → `/old` | OAuth bridge + tool texts point here |
| `most-wanted` | `/most-wanted` | | OLD-ONLY | → `/old` | In sitemap |
| `offer` | `/offer` | | **POTENTIAL CLASH** (legal) | Decision (Q3) | |
| `premium` | `/premium` (stub → `/tokens`) | | OLD-ONLY / POTENTIAL CLASH | → `/old` | |
| `rating` | `/rating`, `/rating/<slug>`, `/rating/<slug>/<app>` | | OLD-ONLY (optional mapping to new research, Q1) | → `/old` | iOS README: "Старые маршруты рейтинга… перенаправляются в разбор категории" (old rating routes redirect to the category breakdown) (`app_04_inapp/Documentation/Clarity/README.md`) |
| `reviews` | `/reviews`, `/reviews/methodology`, `/reviews/<niche>`, `/reviews/<niche>/<appId>` (`?q=`) | | OLD-ONLY | → `/old` | 29 niches, 937 app pages in sitemap |
| `saved` | `/saved` | | **CLASH** | new | |
| `search` | `/search` | | **CLASH** | new (should accept `?q=`, see §5.8 layout JSON-LD) | |
| `segment` | `/segment/<slug>`, `/segment/<slug>/v2` (stub) | | OLD-ONLY (optional mapping to new research, Q1) | → `/old` | 72 slugs = the 72 app categories |
| `test` | `/test` | | OLD-ONLY | → `/old` | Internal |
| `tokens` | `/tokens` | | OLD-ONLY / POTENTIAL CLASH (new «Plus») | → `/old` | Lifetime 990 ₽ paywall |
| `api/**` | | `/api/*` | **SPECIAL**: shared, matcher-excluded | — | Never moves |
| `sitemap.ts`, `robots.ts` | `/sitemap.xml`, `/robots.txt` | | SPECIAL | — | Content must change (§7) |
| `feed.xml/route.ts`, `llms.txt/route.ts`, `llms-full.txt/route.ts`, `llms-full.ru.txt/route.ts` | | | SPECIAL | — | Content links must change (§5.9) |
| `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx` | `/icon`, `/apple-icon`, `/opengraph-image` | | SPECIAL: shared, matcher-excluded | — | The new site may add its own inside `(new)` |
| `layout.tsx`, `template.tsx`, `globals.css` | root chrome | | Must become **old-only chrome** (§9) | — | |
| `.well-known/*` (next.config) | | | SPECIAL | — | Unchanged |
| `public/` verification files | `googlefa96452ebeceb3ca.html`, `yandex_2271f30e41706179.html`, `BingSiteAuth.xml`, `b2e3a9978253227e1863da7863ffe80c.txt` (IndexNow key) | | SPECIAL | — | Keep |

Retired paths that must keep returning 404 (CI asserts it): `/<loc>/aso`, `/<loc>/workspace`, `/<loc>/workspace/habit-tracking` (`deploy.yml:134-140`). With the denylist proxy these are unknown segments, so they go to the new site's 404 and the check keeps passing.

---

## 4. Proxy design

### 4.1 Constants

```ts
const OLD = "old";
const OLD_LOCALES = ["ru", "en"] as const;
const NEW_LOCALES = ["ru", "en", "ja", "de", "fr"] as const; // app_04_inapp/Inapp/Resources/locales.json "available"
const NEW_DEFAULT = "en";                                     // same file, "default"
const NEW_BASE = "/v2";                                       // internal folder of the new site (placeholder)
const NEW_SITE_LIVE = true;                                   // false = pre-launch mode (see 4.5)
const LEGACY_STATUS = 307;                                    // → 308 after ~2–4 stable weeks (§7.3)

// Top-level segments owned by the NEW site (filled by the IA spec). "" = /<loc> home.
const NEW_TOP = new Set(["", "ideas", "saved", "library", "search" /*, "settings", "plus", "research", … */]);

// Old-only static segments (src/app/*), minus anything the IA spec claims.
const OLD_TOP = new Set([
  "admin", "apps", "best", "build", "cards", "catalog", "categories", "contacts", "exp",
  "mcp", "most-wanted", "offer", "premium", "rating", "reviews", "segment", "test", "tokens",
]);
// Old dynamic top level (src/app/[slug]) — 1,516 keys; import at build time so it never drifts.
import appSlugs from "@/data/app-slugs.json";
const OLD_APP_SLUGS = new Set(Object.keys(appSlugs));

const oldLoc = (l: string) => (l === "ru" ? "ru" : "en");     // old site only speaks ru/en
```

### 4.2 Pseudo-code

```ts
function isOldOnly(tail: string[], sp: URLSearchParams): boolean {
  const [a = "", b] = tail;
  if (NEW_TOP.has(a)) {
    if (a === "ideas" && b === "top") return true;                              // old leaderboard
    if (a === "library" && sp.has("checkout") && !NEW_LIBRARY_HANDLES_CHECKOUT) return true;
    return false;
  }
  return OLD_TOP.has(a) || OLD_APP_SLUGS.has(a);
}

function rewriteOld(req, rest: string, l: "ru" | "en") {
  const url = req.nextUrl.clone(); url.pathname = rest || "/";
  const h = new Headers(req.headers); h.set("x-locale", l); h.set("x-site", "old");
  const res = NextResponse.rewrite(url, { request: { headers: h } });
  if (NEW_SITE_LIVE) res.headers.set("X-Robots-Tag", "noindex, follow");       // §7.1
  // Do NOT set the `locale` cookie from /old (it would overwrite a ja/de/fr choice made on the new site).
  return res;
}

function rewriteNew(req, l: string, tail: string[]) {
  const url = req.nextUrl.clone(); url.pathname = `${NEW_BASE}/${l}${tail.length ? "/" + tail.join("/") : ""}`;
  const h = new Headers(req.headers); h.set("x-locale", l); h.set("x-site", "new");
  const res = NextResponse.rewrite(url, { request: { headers: h } });
  res.cookies.set("locale", l, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const segs = pathname.split("/").filter(Boolean);

  // A. The new site's internal folder is never public.
  if (segs[0] === NEW_BASE.slice(1)) return new NextResponse(null, { status: 404 });

  // B. Archive: /old…
  if (segs[0] === OLD) {
    const l = segs[1];
    if (l === "ru" || l === "en") {
      const rest = "/" + segs.slice(2).join("/");
      if (rest === NEW_BASE || rest.startsWith(NEW_BASE + "/")) return new NextResponse(null, { status: 404 });
      return rewriteOld(req, rest, l);                                          // /old/ru → "/" (old home)
    }
    if (l && (NEW_LOCALES as readonly string[]).includes(l))                     // /old/de/x → /old/en/x
      return NextResponse.redirect(new URL(`/old/en/${segs.slice(2).join("/")}${search}`, req.url), 308);
    // /old  or  /old/segment/x  → add a locale
    return NextResponse.redirect(new URL(`/old/${oldLoc(pickLocale(req))}${pathname.slice(4)}${search}`, req.url), 307);
  }

  // C. Locale-prefixed: /<loc>/…
  if (segs[0] && (NEW_LOCALES as readonly string[]).includes(segs[0])) {
    const l = segs[0], tail = segs.slice(1);
    if (!NEW_SITE_LIVE) return legacyBehaviour(req);                           // today's proxy, verbatim
    if (isOldOnly(tail, searchParams))
      return NextResponse.redirect(new URL(`/old/${oldLoc(l)}/${tail.join("/")}${search}`, req.url), LEGACY_STATUS);
    return rewriteNew(req, l, tail);                                            // unknown → new site's 404
  }

  // D. Bare path (no locale). One hop straight to the final place.
  const l = pickLocale(req);                                                    // cookie ∈ NEW_LOCALES → Accept-Language → "en"
  if (NEW_SITE_LIVE && isOldOnly(segs, searchParams))                           // /segment/x, /tokens, /library?checkout=…
    return NextResponse.redirect(new URL(`/old/${oldLoc(l)}${pathname}${search}`, req.url), LEGACY_STATUS);
  return NextResponse.redirect(new URL(`/${l}${pathname === "/" ? "" : pathname}${search}`, req.url), 307);
}
// matcher: unchanged (src/proxy.ts:47)
```

`pickLocale` must accept the five new locales from the cookie. Today it only accepts `ru`/`en` (`src/proxy.ts:14-19`).

### 4.3 Behaviour matrix (acceptance tests)

| Request | Result |
|---|---|
| `/` | 307 → `/<loc>` (unchanged behaviour; new home) |
| `/ru` | rewrite `/v2/ru` (new) |
| `/ru/ideas`, `/ru/ideas?cat=x&sort=new` | new (legacy `cat`/`sort` params should be mapped or ignored by the new site) |
| `/ru/ideas/kids-learning-1` | new (see 4.4 for ids the new site doesn't have) |
| `/ru/ideas/top` | 307 → `/old/ru/ideas/top` |
| `/ru/saved`, `/ru/search?q=calm`, `/ru/library` | new |
| `/ru/library?checkout=<uuid>` | new if the new library confirms payments; otherwise 307 → `/old/ru/library?checkout=<uuid>` |
| `/library?checkout=<uuid>` (in-flight pre-launch YooKassa return, `api/pay/yookassa/route.ts:58`) | 307 → `/old/<ru\|en>/library?checkout=<uuid>` |
| `/ru/segment/sobriety` | 307 → `/old/ru/segment/sobriety` |
| `/en/rating/workout-fitness/strava` | 307 → `/old/en/rating/workout-fitness/strava` |
| `/ru/reviews/dating-apps/123?q=ghost` | 307 → `/old/ru/reviews/dating-apps/123?q=ghost` |
| `/ru/build/x/x-1`, `/ru/cards`, `/ru/tokens`, `/ru/apps`, `/ru/most-wanted`, `/ru/best/x` | 307 → `/old/ru/…` |
| `/ru/7-cups-online-therapy-chat` (app slug) | 307 → `/old/ru/7-cups-online-therapy-chat` |
| `/ru/mcp/connect?o=…` | 307 → `/old/ru/mcp/connect?o=…` (the API is fixed to go direct, §5.10) |
| `/ru/aso`, `/ru/workspace` | new site 404 (CI expects 404) |
| `/de/segment/x` | 307 → `/old/en/segment/x` |
| `/segment/x`, `/tokens`, `/cards` (bare) | 307 → `/old/<ru\|en>/…` (single hop) |
| `/old` | 307 → `/old/<ru\|en>` |
| `/old/segment/x` | 307 → `/old/<ru\|en>/segment/x` |
| `/old/ru` | rewrite `/` (old home), `x-locale: ru`, `X-Robots-Tag: noindex, follow` |
| `/old/en/reviews/methodology` | rewrite `/reviews/methodology` |
| `/old/fr/x` | 308 → `/old/en/x` |
| `/old/ru/v2/…`, `/v2/ru` | 404 |
| `/api/*`, `/_next/*`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms*.txt`, `/icon`, `/apple-icon`, `/opengraph-image`, `/.well-known/*`, `/<file>.<ext>` | proxy not invoked (matcher) |

### 4.4 Responsibilities pushed to the new site (because of shared URL space)

- `/<loc>/ideas/<id>` for the 259 old idea slugs that are not in the app bundle (851 old − 592 new) should 308 to the new research page of the id's category (id prefix = category slug) or to `/old/<ru|en>/segment/<category>`.
- Browsers that visited `/ru/ideas/<slug>` before launch have a **cached 308** to `/segment/<cat>` (`ideas/[slug]/page.tsx:13` uses `permanentRedirect`). Until the browser cache expires, those users land on `/old/<loc>/segment/<cat>`. Nothing can be done server-side. Accept it.
- `/<loc>/search?q=…` should accept `q`. Old pages advertised it in the `SearchAction` JSON-LD (`layout.tsx:116`).
- `/<loc>/library?checkout=…`: either implement the same polling as `PurchaseTracker` (it uses the shared `/api/pay/status`) or leave the proxy safety net on.
- Components that read `usePathname()` in the new site see `/v2/<loc>/…` during SSR and `/<loc>/…` on the client (§2). They need their own strip helper to avoid hydration mismatches.

### 4.5 Rollout modes

| Mode | `OLD_PREFIX` (§10) | `NEW_SITE_LIVE` | Behaviour |
|---|---|---|---|
| 0. Today | n/a | n/a | — |
| 1. Codemod merged, archive preview | `""` | `false` | `/ru/x` exactly as today. `/old/ru/x` also serves the old site (via branch B), but its internal links still point to `/ru/x`. |
| 2. Launch | `"/old"` | `true` | Everything in §4.3 |
| 3. Hardening | `"/old"` | `true` | `LEGACY_STATUS` 307 → 308 and/or map categories to new pages (§7.4) |

---

## 5. Inventory of same-site URL producers in old code

### 5.0 Counts

| # | Mechanism | Live source sites | Files | Dead-code sites |
|---|---|---|---|---|
| M1 | `lp` constant `"/ru" \| "/en"` (fixes all dependants) | 30 definitions → 66 dependent lines (Header 13 links, Footer 11 links) | 30 | CardDeck, IdeaGrid (in the 30) |
| M2 | No-slash `lp`/`localePrefix`/inline `ru ? "ru" : "en"`/`${locale}` building hrefs | 13 | 10 | — |
| M3 | Bare `"/…"` hrefs, fallbacks, pushes | 11 | 9 | 6 (5 files) |
| M4 | Server `redirect()`/`permanentRedirect()` | 8 | 7 | — |
| M5 | `window.location` locale switch | 2 (+2 parse lines) | 2 | — |
| M6 | Pathname matching | 3 | 3 | — |
| M7 | `generateMetadata` canonical, hreflang, og:url, robots | 18 pages with alternates; 13 with `robots:index` | 19 incl. layout | — |
| M8 | JSON-LD URLs | 10 blocks | 9 | — |
| M9 | sitemap, feed, llms, IndexNow | 6 | 5 | — |
| M10 | API/lib producing page URLs | 10 | 8 | 1 (VK) |
| M11 | CI smoke tests | 4 | 1 | — |

About 180 live sites in total (M7 counted as about 45 field-level sites across 18 pages). **About 60 live files** touched, plus the helper, proxy, next.config and CI (§10.3).

### 5.1 M1 — `lp` slash constant (one-line fix per file)

Current form: `const lp = ru ? "/ru" : "/en";` (or `locale === "en" ? "/en" : "/ru"`).
Replacement for every row: `const lp = oldLp(locale);` (or `oldLp(ru)` where only `ru` is in scope). `oldLp` returns `"/old/ru" | "/old/en"`, or exactly `"/ru" | "/en"` while `OLD_PREFIX === ""`.
No dependent line needs editing. The dependants already use `` `${lp}/…` `` or `` `https://inapp.pro${lp}/…` ``, which stay correct.

| File:line (definition) | Dependent lines (what they produce) |
|---|---|
| `src/app/offer/page.tsx:12` | `:37` `<Link href={`${lp}/tokens`}>«Доступ»</Link>` ("Access"), `:64` `` `${lp}/contacts` `` «Контакты» ("Contacts") |
| `src/app/contacts/page.tsx:11` | `:36` `` `${lp}/offer` `` |
| `src/app/rating/page.tsx:148` | JSON-LD `:152` `` url: `https://inapp.pro${lp}/rating` ``, `:154` `` item: `https://inapp.pro${lp}` ``, `:155`, `:157` `` `https://inapp.pro${lp}/rating/${n.slug}` ``; Link `:180` `` `${lp}/rating/${n.slug}` `` |
| `src/app/rating/[slug]/[app]/page.tsx:48` | `:73` `` `${lp}/rating/${slug}` `` (back), `:166` same, `:170` `` `${lp}/reviews/${slug}/${a.id}` ``, `:174` `` `${lp}/segment/${slug}` `` |
| `src/app/segment/[slug]/page.tsx:205` | `:502` `` `${lp}/segment/${r.slug}` `` (related niches) |
| `src/app/mcp/page.tsx:48` | `:287` `` `${lp}/reviews/${example.slug}` ``, `:362` `` `${lp}/reviews` ``, `:365` `` `${lp}/rating` `` |
| `src/app/build/page.tsx:49` | `:154` `` `${lp}/build/${n.slug}` `` |
| `src/app/build/[slug]/page.tsx:33` | `:112` `` `${lp}/build/${slug}/${p.idea}` ``, `:136` `` `${lp}/build` `` |
| `src/app/build/[slug]/[idea]/page.tsx:46` | `:54` `` redirect(`${lp}/build/${slug}`) ``; `:81` `` href: `${lp}/rating/${slug}/${appSlugify(a.title)}` `` (→ `BuildWizard.tsx:345` Link); `:131` `hrefBack`, `:132` `hrefNiches` (→ `BuildWizard.tsx:119,123,124` `router.push`) |
| `src/app/ideas/top/page.tsx:40` | `:80` `<Link href={lp}>` (back to home) |
| `src/app/apps/page.tsx:37` | `:71` `` `${lp}/rating/${g.slug}` ``, `:76` `` `${lp}/rating/${g.slug}/${a.app}` `` |
| `src/app/tokens/page.tsx:16` | `:38` `` `${lp}/reviews/dating-apps` `` |
| `src/app/reviews/page.tsx:32` | JSON-LD `:51` `` url: `https://inapp.pro${lp}/reviews` ``; `:71` prop `lp={lp}` → `src/components/ReviewNicheCatalogue.tsx:45` `` `${lp}/reviews/${niche.slug}` `` |
| `src/app/reviews/methodology/page.tsx:43` | JSON-LD `:54` `mainEntityOfPage`, `:60` BackLink fallback `` `${lp}/reviews` ``, `:170` Link `` `${lp}/reviews` `` |
| `src/app/reviews/[slug]/page.tsx:47` | JSON-LD `:59` `url`, `:67` BackLink fallback `` `${lp}/reviews` `` |
| `src/app/reviews/[slug]/[id]/page.tsx:53` | `:59`, `:78` BackLink fallback `` `${lp}/reviews/${slug}` `` |
| `src/components/BuyButton.tsx:53` | `:188` `` `${lp}/offer` `` «Условия» ("Terms"), `:190` `` `${lp}/contacts` `` «Поддержка» ("Support"), `:54` analytics fallback `usePathname() \|\| lp` (not a link) |
| `src/components/CategoryChips.tsx:18` | `:24` `` `${lp}/ideas?${q}` `` (used by `:69`, `:86`) |
| `src/components/IdeaSortTabs.tsx:22` | `:29` `` `${lp}/ideas?${q}` `` (used by `:41` `router.push`) |
| `src/components/AuthButton.tsx:21` | `:110`/`:180` `/library` «Купленное» ("Purchased"), `:113`/`:190` `/saved`, `:116`/`:163` `/tokens`, `:120`/`:201` `/admin` |
| `src/components/NicheDossier.tsx:107` | `:196` `reviewHref` (→ `AppLinkedText.tsx:163`, `RatingToggleList.tsx:93`), `:206`, `:208` quote links (→ `Bubble` `:673`), `:297` `` `${lp}/reviews/${slug}` ``, `:595` `` `${lp}/segment/${n.slug}` `` |
| `src/components/ReviewAccessGate.tsx:17` | `:51` `` `${lp}/reviews/dating-apps` `` |
| `src/components/SavedIdeas.tsx:23` | `:55` `` `${lp}/ideas` `` «К идеям» ("To ideas") |
| `src/components/Landing.tsx:79` | `:83` `` `${lp}/segment/${c.slug}` `` (home niche tiles) |
| `src/components/NicheAppList.tsx:12` | `:38` `` `${lp}/reviews/${slug}/${app.id}` `` |
| `src/components/IdeaFeed.tsx:42` | `:318` `` `${lp}/segment/${curIdea.category}` `` |
| `src/components/Footer.tsx:11` | `:34` → 11 links: `/` «Разборы» ("Breakdowns"), `/build` «Создание» ("Create"), `/ideas` «Идеи» ("Ideas"), `/rating` «Рейтинг» ("Rating"), `/reviews` «Отзывы» ("Reviews"), `/mcp`, `/saved` «Избранное» ("Saved"), `/apps` «Все приложения» ("All apps"), `/tokens` «Доступ» ("Access"), `/offer` «Оферта» ("Terms"), `/contacts` «Контакты» ("Contacts") (`:16-26`) |
| `src/components/Header.tsx:62` | `:104` **logo** `<Link href={lp}>`; `:117` desktop nav and `:171` burger nav → 6 items each (`:15-39`: `/`, `/build`, `/ideas`, `/rating`, `/reviews`, `/mcp`) |
| `src/components/CardDeck.tsx:80` *(dead)* | `:333`, `:357` `` `${lp}/segment/${modal.category}` `` |
| `src/components/IdeaGrid.tsx:42` *(dead)* | `:179` `` `${lp}/segment/${cur.category}` `` |

### 5.2 M2 — URLs built from a no-slash locale (per-line edits)

Watch out: in some files the no-slash `lp` (`"ru" | "en"`) also feeds `inLanguage`, so its **value must not change**. See `src/app/page.tsx:80→90` and `src/app/[slug]/page.tsx:135→150`. Replace only the URL expressions.

| File:line | Current | Replacement |
|---|---|---|
| `src/app/[slug]/page.tsx:177` | `` href={`/${lp}/segment/${ctx.catSlug}`} `` | `href={oldHref(locale, `/segment/${ctx.catSlug}`)}` |
| `src/app/[slug]/page.tsx:228` | same | same |
| `src/app/best/[slug]/page.tsx:185` | `` href={`/${lp}/segment/${slug}`} `` (lp from `:90`) | `href={oldHref(locale, `/segment/${slug}`)}` |
| `src/app/rating/[slug]/page.tsx:153` | `` href={`/${ru ? "ru" : "en"}/rating/${slug}/${appSlugify(a.title)}`} `` | `oldHref(ru, `/rating/${slug}/${appSlugify(a.title)}`)` |
| `src/app/rating/[slug]/page.tsx:176` | `` `/${ru ? "ru" : "en"}/reviews/${slug}/${a.id}` `` | `oldHref(ru, `/reviews/${slug}/${a.id}`)` |
| `src/app/rating/[slug]/page.tsx:185` | `` `/${ru ? "ru" : "en"}/segment/${slug}` `` | `oldHref(ru, `/segment/${slug}`)` |
| `src/app/segment/[slug]/page.tsx:436` | `` `/${ru ? "ru" : "en"}/rating/${slug}` `` | `oldHref(ru, `/rating/${slug}`)` |
| `src/components/Leaderboard.tsx:42,49` | `const lp = ru ? "ru" : "en";` … `` href={`/${lp}/segment/${r.category}`} `` | delete `:42`; `href={oldHref(locale, `/segment/${r.category}`)}` |
| `src/components/IdeaSwipeDeck.tsx:185` | `` href={`/${ru ? "ru" : "en"}/segment/${c.category}`} `` | `oldHref(ru, `/segment/${c.category}`)` |
| `src/components/TestCards.tsx:481` | `` href={`/${ru ? "ru" : "en"}/segment/${open.categorySlug}`} `` «Открыть разбор ниши» ("Open the niche breakdown") | `oldHref(ru, `/segment/${open.categorySlug}`)` |
| `src/components/NicheDossier.tsx:447` | `` moreHref={`/${ru ? "ru" : "en"}/rating/${slug}`} `` «весь рейтинг» ("full rating") | `moreHref={oldHref(locale, `/rating/${slug}`)}` |
| `src/components/NicheMarketPlayers.tsx:14` | `` reviewHref: … ? `/${locale}/reviews/${slug}/${app.appStoreId}` : undefined `` «Наш разбор отзывов →» ("Our review analysis →") | `oldHref(locale, `/reviews/${slug}/${app.appStoreId}`)` |
| `src/components/LangMenu.tsx:80` | `` href={`/${locale}/search`} `` «Поиск» ("Search") | `href={oldHref(locale, "/search")}` |

### 5.3 M3 — Bare `"/…"` paths (today they rely on the proxy's cookie redirect; after the move they would reach the new site)

| File:line | Current | Replacement | Note |
|---|---|---|---|
| `src/app/library/page.tsx:31` | `<Link href="/">` «На главную» ("To home page") | `href={oldHref(locale, "/")}` | Page has no locale: add `const locale = await getLocale();` |
| `src/app/library/page.tsx:49` | `href="/tokens"` «В магазин →» ("To the store →") | `oldHref(locale, "/tokens")` | |
| `src/app/library/page.tsx:82` | `href={it.href}` (from `src/lib/library.ts:25` `` `/segment/${r.slug}` ``, `:28` `` `/ideas/${r.slug}` ``, `:32` `` `/${r.slug}` ``) | `href={oldHref(locale, it.href)}` | Keep `lib/library.ts` returning internal paths. `/ideas/<slug>` goes through the old `ideas/[slug]` redirect (fixed in M4). |
| `src/app/most-wanted/page.tsx:264` | `<Link href="/">inApp</Link>` | `oldHref(ru, "/")` | |
| `src/app/[slug]/test/page.tsx:155` | `` href={`/${slug}`} `` | `oldHref(locale, `/${slug}`)` | `locale` at `:84` |
| `src/app/rating/[slug]/page.tsx:101` | `<BackLink fallback="/rating">` | `fallback={oldHref(locale, "/rating")}` | `router.push(fallback)` in `BackLink.tsx:29` |
| `src/app/segment/[slug]/page.tsx:421` | `<BackLink fallback="/">` «Назад» ("Back") | `fallback={oldHref(ru, "/")}` | |
| `src/components/NicheDossier.tsx:100` | `backHref = "/"` (used `:271` BackLink fallback) | default `backHref?: string` and use `backHref ?? oldHref(locale, "/")` | Only caller `segment/[slug]/page.tsx:209` passes no `backHref` |
| `src/components/MobileSearch.tsx:60` | `onClick={() => router.push(h.slug)}` | `router.push(oldHref(locale, h.slug))` | `h.slug` comes from `/api/catalog-search` as bare `/segment/<slug>` or `/<app-slug>` (`api/catalog-search/route.ts:42,55`). Fix on the client; the API may be reused by the new site. Also drops today's extra redirect hop. |
| `src/components/HeaderSearch.tsx:51` *(dead)* | `router.push(h.slug)` | same as above | Not imported anywhere |
| `src/components/AppsList.tsx:19` *(dead)* | `` `/${a.slug}` `` | `oldHref(locale, `/${a.slug}`)` | Only reachable from `CatalogBrowser`, which is never rendered |
| `src/components/CatalogBrowser.tsx:108` *(dead)* | `` `/segment/${cat.slug}` `` | `oldHref(locale, …)` | Only a type import from `lib/catalogData.ts:10` |
| `src/components/CategoryIdeas.tsx:24` *(dead)* | `` `/ideas/${idea.slug}` `` | — | Not imported |
| `src/components/IdeasBrowser.tsx:65,163` *(dead)* | `` `/segment/${idea.category}` ``, `` `/ideas/${idea.slug}` `` | — | Not imported |

### 5.4 M4 — Server-side redirects in old pages

| File:line | Current | Replacement |
|---|---|---|
| `src/app/catalog/page.tsx:8` | `redirect("/");` | `redirect(oldHref(await getLocale(), "/"));` (stay in the archive) |
| `src/app/categories/page.tsx:11` | `redirect(locale !== "en" ? "/ru" : "/en");` | `redirect(oldHref(locale, "/"));` (keep 307, see comment `:7-9`) |
| `src/app/premium/page.tsx:7` | `redirect("/tokens");` | `redirect(oldHref(await getLocale(), "/tokens"));` |
| `src/app/segment/[slug]/v2/page.tsx:8` | `` redirect(`/segment/${slug}`); `` | `redirect(oldHref(await getLocale(), `/segment/${slug}`));` |
| `src/app/ideas/[slug]/page.tsx:13` | `` permanentRedirect(`/segment/${idea.category}`); `` | `permanentRedirect(oldHref(await getLocale(), `/segment/${idea.category}`));` |
| `src/app/mcp/connect/page.tsx:15` | `` redirect(`/${locale === "en" ? "en" : "ru"}/mcp`); `` | `redirect(oldHref(locale, "/mcp"));` |
| `src/app/mcp/connect/page.tsx:21` | same | same |
| `src/app/build/[slug]/[idea]/page.tsx:54` | `` redirect(`${lp}/build/${slug}`) `` | fixed by M1 (`:46`) |
| `src/app/mcp/connect/page.tsx:26` | `redirect(authorizeUrl)` → `/api/mcp/oauth/authorize?...` | unchanged (API) |

### 5.5 M5 — Client hard navigations

| File:line | Current | Replacement |
|---|---|---|
| `src/components/LangMenu.tsx:60-62` | `` const base = pathname.replace(/^\/(ru\|en)(?=\/\|$)/, "") \|\| "/"; window.location.href = `/${next}${base === "/" ? "" : base}`; `` | `const { rest } = splitOldPath(pathname); window.location.href = oldHref(next, rest);` Today on `/old/ru/x` it would go to `/en/old/ru/x`. |
| `src/components/LangSwitch.tsx:24-26` | same code | same fix |
| `src/components/LangMenu.tsx:59`, `LangSwitch.tsx:21` | `document.cookie = "locale=…; path=/"` | keep (shared language preference; values stay `ru`/`en`) |
| `src/components/AuthModal.tsx:139-140` | `` return_to=${encodeURIComponent(location.pathname + location.search)} `` → `/api/auth/google/start` | **no change**: carries `/old/…` automatically |
| `src/components/AuthModal.tsx:154-158` | email `return_to: location.pathname + location.search` | **no change** |
| `src/components/AuthModal.tsx:115` | copies `window.location.href` (webview hint) | **no change** |
| `src/components/BuyButton.tsx:102` | `window.location.assign(data.url)` (YooKassa external) | no change; see M10 for `return_url` |
| `src/app/mcp/connect/ConnectClient.tsx:30` | `location.assign(authorizeUrl)` (`/api/…`) | no change |
| `location.reload()` in `AuthButton.tsx:69,90`, `DossierGate.tsx:48`, `IdeaFeed.tsx:275`, `IdeasDeck.tsx:58`, `Leaderboard.tsx:85`, `TestCards.tsx:372`, `IdeaGrid.tsx:137` | — | no change |
| `src/components/PurchaseTracker.tsx:43` | `router.replace(pathname)` (strips `?checkout`) | no change: client pathname already includes `/old` |

### 5.6 M6 — Pathname matching

| File:line | Current | Replacement | Why |
|---|---|---|---|
| `src/components/Header.tsx:85` (feeds `activeKey` `:86-93`) | `` const path = pathname.replace(/^\/(ru\|en)(?=\/\|$)/, "") \|\| "/"; `` | `const path = splitOldPath(pathname).rest;` | On `/old/ru/build` the regex does not match, so no nav item is active |
| `src/components/Footer.tsx:14` | `if (pathname === "/cards") return null;` | `if (splitOldPath(pathname ?? "/").rest === "/cards") return null;` | Also fixes a pre-existing SSR/client mismatch (SSR sees `/cards`, the client sees `/ru/cards`) |
| `src/components/BackLink.tsx:27` *(optional)* | `internal = new URL(document.referrer).origin === location.origin` | `… && new URL(document.referrer).pathname.startsWith(OLD_PREFIX + "/")` | Otherwise «Назад» ("Back") on an old page pops history back to the new site |
| `src/components/PageTracker.tsx:11-20`, `src/lib/track.ts:63,69` | send `pathname` to `/api/track`, YM, GA | no code change; **analytics impact**: paths become `/old/…` (§8) |
| `src/components/AuthButton.tsx:26` | effect dependency only | no change |

### 5.7 M7 — Metadata (canonical, hreflang, og:url, robots)

Replacement pattern for every row:
```ts
alternates: oldAlternates(locale, "<internal path>"),   // canonical = oldUrl(); no `languages` once archived
openGraph: { …, url: oldUrl(locale, "<internal path>") },
robots: OLD_ROBOTS ?? { …existing value… },
```

| Page | `url` / canonical | hreflang `languages` | `openGraph` | `robots` | Internal path |
|---|---|---|---|---|---|
| `src/app/page.tsx` | `:21-22` `` `https://inapp.pro/${lp}` ``, `:33` | `:34` | `:36` (`url`) | `:38` index | `/` |
| `src/app/[slug]/page.tsx` | `:79-80`, `:88` | `:89` | `:91` | `:72` noindex (unknown slug, keep); `:93` index | `/${slug}` |
| `src/app/apps/page.tsx` | `:21,29` | `:29` | — | `:30` | `/apps` |
| `src/app/best/[slug]/page.tsx` | `:68-69`, `:79` | `:79` | `:80` | `:82` | `/best/${slug}` |
| `src/app/build/page.tsx` | `:19-20`, `:29` | `:30` | `:32` | `:34` | `/build` |
| `src/app/cards/page.tsx` | `:18-19`, `:28` | `:29` | `:31` | `:33` | `/cards` |
| `src/app/ideas/page.tsx` | `:27-32`, `:35` | `:35` (also `types` RSS → drop) | `:36` | `:38` | `/ideas` |
| `src/app/ideas/top/page.tsx` | `:19-24`, `:27` | `:27` | `:28` | `:30` | `/ideas/top` |
| `src/app/mcp/page.tsx` | `:27` **relative** `"/mcp"` | `:28` | `:30` (no url) | none → add | `/mcp` |
| `src/app/most-wanted/page.tsx` | `:40`, `:45` | `:45` | `:46` | `:48` | `/most-wanted` |
| `src/app/rating/page.tsx` | `:41`, `:45` | `:45` | `:46` | `:48` | `/rating` |
| `src/app/rating/[slug]/page.tsx` | `:46-47`, `:55` | `:55` | `:56` (image `ogImage(ru, slug)` unchanged) | `:58` | `/rating/${slug}` |
| `src/app/rating/[slug]/[app]/page.tsx` | `:23-28`, `:31` | `:31` | `:32` | `:34` | `/rating/${slug}/${app}` |
| `src/app/reviews/page.tsx` | `:21` **relative** `"/reviews"` | `:22` | `:24` | none → add | `/reviews` |
| `src/app/reviews/methodology/page.tsx` | `:19` **relative** | `:20-23` | `:26` | none → add | `/reviews/methodology` |
| `src/app/reviews/[slug]/page.tsx` | `:29` **relative** | `:30-33` | `:36` | none → add | `/reviews/${slug}` |
| `src/app/reviews/[slug]/[id]/page.tsx` | `:28` **relative** | `:29-32` | `:35` | none → add | `/reviews/${slug}/${id}` |
| `src/app/segment/[slug]/page.tsx` | `:121-122`, `:130` | `:131-134` | `:137` | `:139` | `/segment/${slug}` |
| `src/app/layout.tsx` (root/old layout) | `:35` `metadataBase` (keep) | — | — | add `robots: OLD_ROBOTS` | `:38-41` RSS alternate → drop from old layout |

Pages without metadata (they inherit the layout robots): `[slug]/test`, `admin/*`, `build/[slug]`, `build/[slug]/[idea]`, `catalog`, `categories`, `contacts`, `exp/calm`, `ideas/[slug]`, `library`, `mcp/connect`, `offer`, `premium`, `search`, `segment/[slug]/v2`, `tokens`. `saved/page.tsx:17` and `test/page.tsx:14` are already `noindex`.

`ogImage()` (`src/lib/og.ts:9-12`) is absolute `https://inapp.pro/api/og?...` → **unchanged**.

### 5.8 M8 — JSON-LD URLs

| File:line | Current | Replacement |
|---|---|---|
| `src/app/layout.tsx:88-122` | `Organization` + `WebSite` with `urlTemplate: https://inapp.pro/${locale}/search?q={search_term_string}` (`:116`) | **Remove from the old layout.** The brand entity and SearchAction belong to the new site. If kept: `urlTemplate: oldUrl(locale, "/search") + "?q={search_term_string}"` |
| `src/app/page.tsx:91` | `` url: `https://inapp.pro/${lp}` `` | `oldUrl(locale, "/")` (keep `inLanguage: lp` `:90`) |
| `src/app/page.tsx:96` | `` url: `https://inapp.pro/${lp}/segment/${c.slug}` `` | `oldUrl(locale, `/segment/${c.slug}`)` |
| `src/app/[slug]/page.tsx:157-159` | `` item: `https://inapp.pro/${lp}` ``, `` …/segment/${ctx.catSlug} ``, `` …/${slug} `` | `oldUrl(locale, "/")`, `oldUrl(locale, `/segment/${ctx.catSlug}`)`, `oldUrl(locale, `/${slug}`)` (keep `inLanguage` `:150`) |
| `src/app/most-wanted/page.tsx:155` (used `:166`, `:167`, `:178`) | `` const articleUrl = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted` `` | `oldUrl(ru, "/most-wanted")` |
| `src/app/most-wanted/page.tsx:177` | `` item: `https://inapp.pro/${ru ? "ru" : "en"}` `` | `oldUrl(ru, "/")` |
| `src/app/segment/[slug]/page.tsx:346-347` (used `:391`, `:400`, `:407`) | `` const localePrefix = …; const pageUrl = `https://inapp.pro/${localePrefix}/segment/${slug}` `` | `const pageUrl = oldUrl(ru, `/segment/${slug}`)` |
| `src/app/segment/[slug]/page.tsx:399` | `` item: `https://inapp.pro/${localePrefix}` `` | `oldUrl(ru, "/")` |
| `src/app/rating/page.tsx:152-157` | via `lp` | fixed by M1 |
| `src/app/reviews/page.tsx:51`, `reviews/[slug]/page.tsx:59`, `reviews/methodology/page.tsx:54` | via `lp` | fixed by M1 |
| `url: "https://inapp.pro"` in `org`/`author`/`publisher` (`segment:348`, `most-wanted:171-172`, `reviews:52`, `methodology:53`) and `@id` values (`page.tsx:92`, `[slug]:152`, `reviews:46,60`) | brand root / identifiers | leave |

### 5.9 M9 — Sitemap, feed, llms, robots, IndexNow

| File:line | Current | Proposal |
|---|---|---|
| `src/app/sitemap.ts:33-60` | Lists `/ru` + hreflang for home, `/mcp`, `/reviews` (+29 niches, +937 app pages), `/build`, `/ideas`, `/rating`, `/ideas/top`, `/most-wanted`, `/cards`, `/apps`, 72 `/segment/*`, ~72 `/rating/*`, ≤862 `/<app-slug>` | At launch: **new-site URLs only**. Remove every old path, and never list `/old`. Before launch: unchanged. |
| `src/app/robots.ts:32-37` | allow all, `sitemap: https://inapp.pro/sitemap.xml` | Keep. Do **not** disallow `/old` (crawlers must see noindex and follow redirects). Optional `Disallow: /v2/`. |
| `src/app/feed.xml/route.ts:25` | `` const link = `${BASE}/en/segment/${slug}` `` | New research URL for the slug if the new site has one, else `` `${BASE}/old/en/segment/${slug}` ``. Channel `<link>` `:38` stays `BASE`. |
| `src/lib/llms.ts:39` | `` `- [${cat.name}](${BASE}/en/segment/${slug})` `` | same rule as feed |
| `src/lib/llms.ts:70` | `` `Page: ${BASE}/${locale}/segment/${slug}` `` | same rule |
| `src/app/api/indexnow/route.ts:29-32` | pings `/{ru,en}`, `/build`, `/rating`, `/ideas/top`, `/most-wanted`, `/cards`, `/catalog` (a redirect stub), `/apps`, 72 segments, ratings, app slugs | At launch: one-off ping of the **legacy** URLs (so Bing and Yandex recrawl and see the redirects fast), then new-site URLs only. Triggered by `deploy.yml:109-112`. |

### 5.10 M10 — Shared API and lib code that produces page URLs

| File:line | Current | Result after the switch without changes | Required change |
|---|---|---|---|
| `src/app/api/pay/yookassa/route.ts:58` | `` returnUrl: `${origin}/library?checkout=${checkoutId}` `` | Bare `/library` goes to the new site's library | Accept a validated `returnPath` in the body (starts with `/`, not `//`, default `/library`). Old `BuyButton.tsx:94-97` sends `returnPath: oldHref(locale, "/library")`. Keep the proxy safety net for in-flight payments (§4.3). |
| `src/app/api/mcp/oauth/authorize/route.ts:101` | `` new URL(`/${locale}/mcp/connect?o=${packed}`, …) `` | 307 hop via the proxy (works, but indirect) | `` `/old/${locale === "en" ? "en" : "ru"}/mcp/connect?o=${packed}` `` (use `oldHref`) |
| `src/lib/mcp/tools.ts:407` | `…every MCP research tool: https://inapp.pro/ru/mcp` | 307 to `/old/ru/mcp` | `https://inapp.pro/old/ru/mcp` (or the new site's MCP page if one is built) |
| `src/lib/mcp/tools.ts:420` | `manageConnections: "https://inapp.pro/ru/mcp#connections"` | same | `https://inapp.pro/old/ru/mcp#connections` |
| `src/app/api/dev/buyer-preview/route.ts:22` | `new URL("/ru/segment/sobriety", req.url)` | hop | `"/old/ru/segment/sobriety"` |
| `src/app/api/auth/email/start/route.ts:19` & `…/email/verify/route.ts:11-12` | default return `"/cards"` | bare `/cards` → `/old/<loc>/cards` | Change the default to `"/"` (new). The old `AuthModal` always sends `return_to`. |
| `src/app/api/auth/email/verify/route.ts:16` | expired → `${origin}/?login=expired` | new landing | OK (nothing reads `login=`). Optional: go to `rt`. |
| `src/app/api/auth/google/callback/route.ts:17`, `…/google/start/route.ts:14` | failure → `/?auth=<reason>` | new landing | OK (nothing reads `auth=`). Optional: use the `g_oauth_return` cookie. |
| `src/app/api/auth/google/callback/route.ts:51-53` | success → `g_oauth_return` (from `return_to`) | stays on `/old/…` | none |
| `src/app/api/auth/vk/route.ts:14-20,62` *(UI never calls VK)* | `back = "/"` | new landing | none (dead) |

### 5.11 M11 — CI smoke tests (`.github/workflows/deploy.yml`)

| Line | Current | Change |
|---|---|---|
| `:118` | `https://inapp.pro/ru/mcp` (expects `list_niche_themes`) | `https://inapp.pro/old/ru/mcp` |
| `:131` | `https://inapp.pro/ru/tokens` (expects `990`) | `https://inapp.pro/old/ru/tokens` |
| `:137` | `https://inapp.pro/$locale/$path` for `aso`, `workspace`, `workspace/habit-tracking` → 404 | keep (new-site 404). Add `/old/$locale/$path` → 404. |
| `:149` | `https://inapp.pro/$locale/segment/$niche` (expects `id="main-players"`) | `https://inapp.pro/old/$locale/segment/$niche` |
| new | — | `curl -sI https://inapp.pro/ru/segment/sobriety` → `307`/`308`, `location: /old/ru/segment/sobriety`; `curl -sI https://inapp.pro/old/ru` → `x-robots-tag: noindex, follow` |

`deploy/nginx-badcomment.conf` proxies everything to `:3000` with no path rules → no change.

### 5.12 Verified non-issues (checked, no change)

- Static assets are root-absolute (`/idea-covers/…`, `/badges/…`, `/og-fonts/…`). No relative `src=` or `url()` exists, so they are not affected by the `/old/<loc>` depth.
- `fetch("/api/…")` everywhere is root-absolute.
- There is no `navigator.share` and no `<form action>` in old UI. `TestCards.tsx:480` `action=` is a React prop. The MCP consent `<form method="post">` is API HTML.
- External links: Telegram (`NicheDossier.tsx:135-136`, `ideas/page.tsx:245,247`, `AuthModal.tsx:201,308`), App Store (`MarketPlayersList.tsx:59-110`), Cursor deeplink (`mcp/InstallPicker.tsx:10-11,179`).
- `CardCarousel.tsx:394…682` "inapp.pro" is only a visual wordmark.
- Dead components (no importer): `AppNeeds`, `BoltIcon`, `CardDeck`, `CategoryIdeas`, `HeaderSearch`, `IdeaGrid`, `IdeasBrowser`, `InsightRow`, `NeedsGap`, `NichePatternList`, `PeopleIcon`, `RatingAuthBadge`, `ReviewCarousel`, `SectionDetails`, `SegmentAppList`, `SegmentSummary`, `SegmentTabs`, `SegmentThemeView`, `SettingsMenu`. Also effectively dead: `CatalogBrowser` (type-only import) and `AppsList` (used only by it).

---

## 6. What should point to the NEW site, and what must stay absolute

### 6.1 Intentional links from old to new (recommendations)

| Place | Recommendation | Reason |
|---|---|---|
| Header logo `Header.tsx:104` | **Stay old** (`/old/<loc>`) | Users need to navigate the archive |
| New element: archive banner in the old Header or layout | **New**: `/<loc>`. Proposed copy (new copy, not from source): RU «Это архивная версия inApp. Новая версия →», EN "This is the archived version of inApp. New version →" | The only deliberate bridge; lets link equity flow (`noindex, follow`) |
| Footer nav `Footer.tsx:16-26`, Header nav `Header.tsx:15-39` | old | Archive consistency |
| «Оферта»/«Контакты» ("Terms"/"Contacts"): `Footer.tsx:25-26`, `BuyButton.tsx:188,190`, `offer/page.tsx:37,64`, `contacts/page.tsx:36` | **old by default** (Q3) | The old offer text describes the old 990 ₽ lifetime product and «Доступ» ("Access"). Point to the new site only if the new site hosts the same legal entity and terms. |
| «Поиск» ("Search") `LangMenu.tsx:80` | old | Old search page exists |
| Auth failure fallbacks (`/?auth=…`, `/?login=expired`) | new landing (as-is) | New site is primary; nothing reads the params |
| Email/Google success return | whatever `return_to` says (auto) | Already path-preserving |
| YooKassa return | where checkout started (§5.10) | Payment confirmation UI (`PurchaseTracker`) |
| MCP tool texts, OAuth bridge | old `/old/ru/mcp` | The app has no MCP surface (no hits in `Inapp/Clarity`) |
| feed.xml, llms*.txt items | new research URLs when they exist | Discovery surfaces should feed the indexed site |
| sitemap, IndexNow | new only (plus a one-off legacy ping) | §7 |

### 6.2 Must stay absolute and unchanged

| Item | Where | Why |
|---|---|---|
| Magic-link URL `${appOrigin}/api/auth/email/verify?token=…&rt=…` | `api/auth/email/start/route.ts:30`, `lib/mail.ts:51-74`, `lib/googleAuth.ts:7-11` | Email clients need absolute URLs. `/api` does not move. |
| Google `redirect_uri` `${origin}/api/auth/google/callback` | `google/start/route.ts:23`, `google/callback/route.ts:35` | Registered in Google Console; must stay byte-identical |
| VK `redirect_uri` `${origin}/api/auth/vk` | `api/auth/vk/route.ts:23` | Registered with VK |
| YooKassa webhook `/api/pay/yookassa/webhook` | configured in the ЮKassa dashboard | Shared |
| YooKassa `return_url` | absolute `origin + path` (`api/pay/yookassa/route.ts:46,58`) | Provider requirement; only the **path** changes |
| MCP OAuth issuer, endpoints, `.well-known/*`, `resource_metadata` | `lib/mcp/oauth.ts:72-105`, `api/mcp/route.ts:74`, `next.config.ts:18-25` | Clients cache discovery documents |
| MCP endpoint `https://inapp.pro/api/mcp` | `mcp/InstallPicker.tsx:10-11` | Installed in users' editors |
| OG images `https://inapp.pro/api/og?…` | `lib/og.ts:10`, `layout.tsx:98-99` | Shared API |
| Telegram deep links `https://telegram.me/<bot>?start=…` | `NicheDossier.tsx:135-136`, `ideas/page.tsx:245,247` | External |
| Bot → site `${SITE}/api/internal/grant` | `bot/bot.mjs:26,84` | API only |
| IndexNow `keyLocation` `https://inapp.pro/<key>.txt` | `api/indexnow/route.ts:38` | Key file in `public/` |
| Search-engine verification files | `public/` | Must stay at root |

---

## 7. SEO for `/old`

### 7.1 Signals on `/old`

| Signal | Recommendation | Implementation |
|---|---|---|
| Indexing | `noindex, follow` on **every** `/old` response | Proxy `X-Robots-Tag` header (§4.2 `rewriteOld`). It covers pages that force `robots: index` in metadata. Also set `robots: OLD_ROBOTS` in metadata (§5.7) so the HTML is consistent. |
| Canonical | Self-referential `https://inapp.pro/old/<loc>/<path>` | `oldAlternates()`. Never canonicalize to a new-site page (different content; Google ignores or gets confused). Today's canonicals point to URLs that would become redirects. |
| hreflang | **Remove** from all old pages | Noindexed pages must not sit in hreflang clusters. Today's values point to `/ru/...` and `/en/...`, which will be new-site URLs, so they would inject non-reciprocal alternates into the new site's clusters. |
| Sitemap | Exclude `/old` completely | §5.9 |
| robots.txt | **Do not** `Disallow: /old` | A blocked URL cannot show its noindex or redirect. It would stay indexed as "blocked by robots.txt". |
| JSON-LD | Remove the site-wide `Organization`/`WebSite` from the old layout (§5.8). Page-level JSON-LD may stay with `/old` URLs (ignored under noindex). | |
| RSS `<link rel=alternate>` | Drop from the old layout (`layout.tsx:38-41`) | The feed belongs to the new site |

### 7.2 Legacy URL redirects

- Status: **307 at launch** (the owner already prefers 307 for unstable destinations, see `categories/page.tsx:7-9`), then **308** after 2–4 stable weeks. Browsers cache 308 forever.
- Always preserve the query string (`?q=`, `?cat=`, `?sort=`, `?checkout=`, `?o=`).
- One hop only. Bare legacy paths go straight to `/old/<loc>/…`, not via `/<loc>/…` (§4.2 D).

### 7.3 Expected index impact

Currently indexable per locale (from `sitemap.ts`): home, `/mcp`, `/reviews` + 29 niches + 937 app review pages, `/build`, `/ideas`, `/rating`, `/ideas/top`, `/most-wanted`, `/cards`, `/apps`, 72 `/segment/*`, ~72 `/rating/*`, up to 862 `/<app-slug>`. That is about **2,000 URLs per locale**. If they all redirect to a noindexed `/old`, search engines will drop them. That is the explicit cost of "keep the old site but hide it".

### 7.4 Mitigation option (decision Q1)

All 72 old category slugs (`src/data/active-categories.json`) exist in the app's `research-editorial.ru.json` `categories`. All 592 app idea IDs are also old idea slugs. So, once the new site has research and idea pages, these redirects are possible:
- `/<loc>/segment/<slug>` → new research page for `<slug>` (301/308)
- `/<loc>/rating/<slug>` → same research page (matches the iOS behaviour: "Старые маршруты рейтинга… перенаправляются в разбор категории", old rating routes redirect to the category breakdown)
- `/<loc>/ideas/<id>` → new idea page (already the case with the CLASH rule)
- everything else → `/old`

This keeps most search equity on the new site. It changes `isOldOnly` into a small "legacy map" in front of the denylist.

---

## 8. Shared state and side effects (same origin)

| Shared thing | Old usage | Risk / note |
|---|---|---|
| Session cookie, `/api/me` | `AuthButton.tsx:30-42` | One login for both sites (desired) |
| `locale` cookie (`path=/`) | written by proxy (`proxy.ts:32`), `LangMenu.tsx:59`, `LangSwitch.tsx:21`; read by `getLocale()` and `pickLocale()` | The new site uses `ja`/`de`/`fr`. Old code maps any non-`en` value to Russian (`ru = locale !== "en"`), but the proxy passes `x-locale`, so `/old` pages are unaffected. Do not write the cookie from `/old` (§4.2). |
| `theme` cookie | `layout.tsx:52` (`"light"` → light, anything else → dark), `LangMenu.tsx:36`, `ThemeSwitch` | If the new site stores `theme=system` (3-way picker per `LibraryRefresh-2026-09-20/README.md` «Тема с тремя превью», "theme with three previews"), the old site renders dark. Use a different cookie name or keep values compatible. |
| `g_oauth_state`, `g_oauth_return`, `el_rl` | auth APIs | Shared; fine |
| localStorage keys (`inapp_tg_login` `AuthButton.tsx:37`, `inapp_purchase:*` `PurchaseTracker.tsx:37`, `inapp_paywall_view:*` `track.ts:69`, saved-ideas storage via `persistSaved` in `IdeaFeed`/`IdeaGrid`/`TestCards`) | | The new site must namespace its keys to avoid reading old shapes |
| Analytics: YM 110047715, GA G-G3J6K8VBD6, DataFast (`layout.tsx:69-84,135-150`), `/api/track` PageView (`PageTracker.tsx`) | paths become `/old/...` | Update YM/GA goals and filters keyed on `/ru/...`. Decide whether the new site uses the same counters. `api/track/route.ts:20` `/admin` skip already never matches (paths are locale-prefixed). |
| Payments | `BuyButton` → `/api/pay/yookassa` → `return_url` → `/library?checkout` → `PurchaseTracker` → `/api/pay/status` | See §5.10 and the §4.3 safety net |
| MCP OAuth | `/api/mcp/oauth/authorize` → `/<loc>/mcp/connect` | §5.10 |

---

## 9. Root layout isolation (prerequisite)

Problem: `src/app/layout.tsx` wraps **all** routes, including the new site's internal folder. That brings old `Header`, `Footer`, `PageTracker`, `FavSync`, brand JSON-LD, YM/GA/DataFast, `globals.css`, `@saverin/tokens/css`, Inter fonts and `data-brand="saverin"`. `template.tsx` adds the `route-fade` wrapper. The new site uses a different palette (`LibraryRefresh-2026-09-20/README.md`, «Оформление», "Appearance").

| Option | How | Pros | Cons |
|---|---|---|---|
| **A (recommended)**: route groups, two root layouts | `git mv` every old route folder plus `page.tsx`, `layout.tsx`, `template.tsx`, `globals.css` into `src/app/(old)/`. The new site lives in `src/app/(new)/v2/[locale]/…` with its own `layout.tsx`. `api/`, `sitemap.ts`, `robots.ts`, `feed.xml/`, `llms*.txt/` stay at `src/app/`. Icons and OG can stay at root or be duplicated per group. | Full isolation of CSS, analytics and chrome. Internal URL paths are unchanged (groups do not appear in URLs), so the proxy rewrite targets stay the same. | About 30 renames. `layout.tsx:20-21,28-29` relative font paths `../../public/og-fonts/…` become `../../../public/…`. Needs `app/global-not-found.tsx` + `experimental.globalNotFound: true` for unmatched URLs (`…/docs/…/not-found.md:49-66`). Old ↔ new navigation becomes a full page load (`…/route-groups.md:30`). Check `next.config.ts:12-14` `outputFileTracingIncludes["/segment/*"]` still matches the moved route (look for `marketPlayers/*.json` in `.next/server/app/(old)/segment/[slug]/page.js.nft.json`). |
| B: one root layout that branches | The proxy sets `x-site`. `layout.tsx` renders the old chrome only when `x-site === "old"`. | No file moves (matches "files stay where they are" literally) | `globals.css`, tokens CSS, fonts and `template.tsx` still apply to the new site. Root `metadata` (`layout.tsx:34-42`) leaks into it. Fragile. |

Either way the new site must live under a **static** internal segment (`/v2`). A top-level `[locale]` folder would clash with the old `src/app/[slug]`, because Next forbids two differently named dynamic segments at the same level.

---

## 10. Codemod strategy

### 10.1 Helper (single new file, client-safe: no `next/headers`)

```ts
// src/lib/oldSite.ts
import type { Metadata } from "next";

export const SITE_ORIGIN = "https://inapp.pro";
/** "" = today's URLs byte-for-byte (merge early). "/old" = archive mode (launch commit). */
export const OLD_PREFIX: "" | "/old" = "";
export const OLD_ARCHIVED = OLD_PREFIX !== "";

type L = string | boolean;                                    // locale string, or `ru` boolean
const loc = (l: L): "ru" | "en" => (l === "en" || l === false ? "en" : "ru"); // mirrors `ru = locale !== "en"`

export const oldLp = (l: L) => `${OLD_PREFIX}/${loc(l)}`;     // replaces `ru ? "/ru" : "/en"`
export function oldHref(l: L, path = "/"): string {
  const p = !path || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${oldLp(l)}${p}`;
}
export const oldUrl = (l: L, path = "/") => `${SITE_ORIGIN}${oldHref(l, path)}`;

/** "/old/ru/x" | "/ru/x" | "/x" (SSR internal) → { locale, rest } */
export function splitOldPath(pathname: string): { locale: "ru" | "en" | null; rest: string } {
  let p = pathname || "/";
  if (OLD_PREFIX && (p === OLD_PREFIX || p.startsWith(OLD_PREFIX + "/"))) p = p.slice(OLD_PREFIX.length) || "/";
  const m = p.match(/^\/(ru|en)(?=\/|$)/);
  return m ? { locale: m[1] as "ru" | "en", rest: p.slice(m[0].length) || "/" } : { locale: null, rest: p };
}

export function oldAlternates(l: L, path: string): Metadata["alternates"] {
  return OLD_ARCHIVED
    ? { canonical: oldUrl(l, path) }
    : { canonical: oldUrl(l, path), languages: { ru: oldUrl("ru", path), en: oldUrl("en", path), "x-default": oldUrl("en", path) } };
}
export const OLD_ROBOTS: Metadata["robots"] | null = OLD_ARCHIVED ? { index: false, follow: true } : null;
```

With `OLD_PREFIX = ""`, `oldAlternates()` reproduces today's absolute canonicals. It also silently **fixes** the relative canonicals (§11.1), which is the only intended pre-launch change.

### 10.2 Rules (mechanical, reviewable)

| Rule | Pattern | Action |
|---|---|---|
| R1 | `const lp = ru ? "/ru" : "/en"` / `locale === "en" ? "/en" : "/ru"` | `const lp = oldLp(locale \| ru)` (30 files, §5.1) |
| R2 | `const lp = ru ? "ru" : "en"` / `localePrefix` feeding URLs | Replace **URL expressions** with `oldHref`/`oldUrl`. Keep `inLanguage`. (§5.2, §5.7, §5.8) |
| R3 | Inline `` `/${ru ? "ru" : "en"}/…` ``, `` `/${locale}/…` `` | `oldHref(ru \| locale, "/…")` |
| R4 | Bare `"/…"` in href, fallback, push, redirect | `oldHref(locale, "/…")`; add `getLocale()` where missing (`library`, `catalog`, `premium`, `segment/v2`, `ideas/[slug]`) |
| R5 | Metadata `alternates`/`openGraph.url`/`robots` | `oldAlternates()`, `oldUrl()`, `OLD_ROBOTS ?? …` |
| R6 | Pathname regex `^\/(ru\|en)` | `splitOldPath()` |
| R7 | Absolute `https://inapp.pro/(ru\|en)` in lib and API | `oldUrl()` or literal `/old/…` (§5.10) |

### 10.3 Files touched

Helper and infra (4): `src/lib/oldSite.ts` (new), `src/proxy.ts`, `next.config.ts` (only for option A: `experimental.globalNotFound`, tracing key check), `.github/workflows/deploy.yml`.

`src/app` (33):
`layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `[slug]/test/page.tsx`, `apps/page.tsx`, `best/[slug]/page.tsx`, `build/page.tsx`, `build/[slug]/page.tsx`, `build/[slug]/[idea]/page.tsx`, `cards/page.tsx`, `catalog/page.tsx`, `categories/page.tsx`, `contacts/page.tsx`, `ideas/page.tsx`, `ideas/[slug]/page.tsx`, `ideas/top/page.tsx`, `library/page.tsx`, `mcp/page.tsx`, `mcp/connect/page.tsx`, `most-wanted/page.tsx`, `offer/page.tsx`, `premium/page.tsx`, `rating/page.tsx`, `rating/[slug]/page.tsx`, `rating/[slug]/[app]/page.tsx`, `reviews/page.tsx`, `reviews/methodology/page.tsx`, `reviews/[slug]/page.tsx`, `reviews/[slug]/[id]/page.tsx`, `segment/[slug]/page.tsx`, `segment/[slug]/v2/page.tsx`, `tokens/page.tsx`, `sitemap.ts` (launch), `feed.xml/route.ts` (launch).

`src/components` (20 live): `Header.tsx`, `Footer.tsx`, `LangMenu.tsx`, `LangSwitch.tsx`, `AuthButton.tsx`, `BuyButton.tsx`, `BackLink.tsx` (optional), `CategoryChips.tsx`, `IdeaSortTabs.tsx`, `IdeaFeed.tsx`, `IdeaSwipeDeck.tsx`, `Landing.tsx`, `Leaderboard.tsx`, `MobileSearch.tsx`, `NicheAppList.tsx`, `NicheDossier.tsx`, `NicheMarketPlayers.tsx`, `ReviewAccessGate.tsx`, `SavedIdeas.tsx`, `TestCards.tsx`.
Dead, optional (7): `CardDeck.tsx`, `IdeaGrid.tsx`, `HeaderSearch.tsx`, `AppsList.tsx`, `CatalogBrowser.tsx`, `CategoryIdeas.tsx`, `IdeasBrowser.tsx`. Delete them or apply the same one-liners.
Not touched: `ReviewNicheCatalogue.tsx` (gets `lp` from `reviews/page.tsx`), `BuildWizard.tsx`, `AppLinkedText.tsx`, `RatingToggleList.tsx`, `MarketPlayersList.tsx` (all receive already-built hrefs).

`src/lib` (2): `llms.ts` (launch), `mcp/tools.ts`. `library.ts` unchanged (prefixed in the page).

Shared API (5, path unchanged, code changed): `api/pay/yookassa/route.ts` (+ `BuyButton` body), `api/mcp/oauth/authorize/route.ts`, `api/dev/buyer-preview/route.ts`, `api/indexnow/route.ts`, `api/auth/email/start/route.ts` + `…/verify/route.ts` (default return).

Option A additionally: `git mv` of the old tree into `src/app/(old)/` (pure renames) + `src/app/global-not-found.tsx`.

### 10.4 Verification gates

1. **Static gate** (CI): with `src/lib/oldSite.ts` and `src/app/api` excluded, this must return nothing:
   `rg -n --pcre2 '"/(ru|en)"|`/\$\{(lp|locale|localePrefix)\}|/\$\{ru \? "ru"|https://inapp\.pro/(ru|en)\b|https://inapp\.pro/\$\{(lp|locale|localePrefix)|replace\(/\^\\/\(ru\|en\)' src/app src/components src/lib`
2. **Behaviour-neutral merge** (mode 1, `OLD_PREFIX = ""`): SSR-render a sample of pages before and after the codemod and diff the HTML. The only allowed differences are the fixed relative canonicals (§11.1).
3. **Launch crawl** (mode 2): fetch `/old/ru` and `/old/en` and BFS over same-origin `href`s (depth 3, ~300 pages). Every same-origin href must start with `/old/`, `/api/`, `/_next/` or a static-file extension, or be the whitelisted archive-banner link. Separately click-test the client-only targets (`BackLink` fallbacks, `BuildWizard` pushes, `IdeaSortTabs` select, `MobileSearch`, `LangMenu`/`LangSwitch`), since those are not in the SSR HTML.
4. **Proxy unit tests:** the §4.3 matrix.
5. **Payments:** start checkout on `/old/ru/tokens` → `return_url` = `/old/ru/library?checkout=…` → `PurchaseTracker` confirms. Also replay a pre-launch-style `/library?checkout=…` → lands on `/old/<loc>/library`.
6. **MCP:** add the server in an MCP client while logged out → `/old/<loc>/mcp/connect?o=…` → sign in → consent → token.

---

## 11. Pre-existing issues found during the audit

1. **Relative canonicals.** `mcp/page.tsx:27` `"/mcp"`, `reviews/page.tsx:21` `"/reviews"`, `reviews/methodology/page.tsx:19`, `reviews/[slug]/page.tsx:29`, `reviews/[slug]/[id]/page.tsx:28`. They resolve via `metadataBase` (`layout.tsx:35`) to `https://inapp.pro/mcp` etc., which 307 to a locale. So today these canonicals point at redirects.
2. **Footer `/cards` hide.** `Footer.tsx:14` only matches during SSR (internal path). On the client the path is `/ru/cards`, which risks a hydration mismatch and the footer reappearing. The §5.6 fix resolves both.
3. **Admin page-view filter.** `api/track/route.ts:20` skips `/admin`, but real paths are `/ru/admin`, so admin views are logged.
4. **IndexNow pings a redirect stub.** `api/indexnow/route.ts:30` includes `/catalog` (redirect stub).
5. **Cached idea redirects.** `ideas/[slug]/page.tsx:13` uses a permanent redirect (browser-cached), which affects `/ru/ideas/<id>` after the new site takes over (§4.4).
6. **Search hop.** `MobileSearch.tsx:60` pushes bare slugs, so every search result costs a redirect hop and uses the cookie locale, not the page locale.
7. **Library page.** `library/page.tsx` ignores locale entirely: hard-coded Russian «Купленное» ("Purchased"), «Войдите, чтобы видеть открытые разборы.» ("Sign in to see unlocked breakdowns."), and bare links.
8. **Email return default.** `api/auth/email/start/route.ts:19` defaults to `/cards`.
9. **Dead code** (§5.12), including the unused VK flow `api/auth/vk/route.ts`.

---

## 12. Open questions (decisions needed)

- **Q1 (SEO):** Should legacy `/<loc>/segment/<slug>` and `/<loc>/rating/<slug>` 308 to the new research pages (keeping search equity, §7.4), or to `/old` as literally requested (about 2,000 URLs per locale deindexed over time)?
- **Q2 (IA):** What is the final `NEW_TOP` set, and which internal folder name replaces `/v2`? Specifically, does the new site claim `catalog`, `categories`, `premium`, `tokens`, `plus`, `research`, `settings`?
- **Q3 (legal):** Does the new site host its own «Оферта»/«Контакты» ("Terms"/"Contacts")? If yes, do old links keep pointing at the old legal pages (they describe the web lifetime 990 ₽ product), or move to the new ones?
- **Q4 (payments):** Will the new site sell on the web through the same YooKassa lifetime SKU and `/api/pay/*`? If yes, the new `/library` (or its equivalent) must handle `?checkout=`, and `returnPath` becomes mandatory.
- **Q5 (layout):** Is moving old route folders into an `(old)` route group acceptable (URL-neutral, recommended), or must files stay physically in place (option B)?
- **Q6 (analytics):** Should the new site share the YM/GA/DataFast counters with `/old`, and which dashboards and goals keyed on `/ru/...` need migrating?
- **Q7 (MCP):** Will the new site expose an MCP page? If not, `/old/<loc>/mcp` remains the canonical place for OAuth consent and connection management, and the MCP tool texts should say so.
- **Q8 (UX):** Should `/old` pages show the archive banner (§6.1), and should the old logo stay inside the archive (recommended) or lead to the new home?
