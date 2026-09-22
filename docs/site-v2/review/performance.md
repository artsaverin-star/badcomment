# Site v2 — performance review (key: `performance`)

Reviewed 2026-09-23 (00:00–00:20 MSK) against the shared dev server `http://localhost:3210` and the code on
branch `site-v2`. Report only: I edited no source files. The working tree changed while I reviewed it: the
landing, `next.config.ts` (00:13) and `deploy/` (00:14–00:15) were edited. The numbers below are from the last
pass (00:18).

**Limits of this review**
- **No production bundle numbers.** `.next/` holds a production build from 2026-09-22 23:03. At that time only the
  shell existed, so every route shows the same 165 KB gz. I did not run `next build`. Client JS per route is
  therefore **estimated**: I bundled each route's `"use client"` entry points with esbuild (minified,
  react/next external, lucide tree-shaken). Turbopack chunks will be somewhat larger.
- **Dev payloads include dev-only debug rows.** Expect production HTML and RSC to be 10–25 % smaller.
- **Plus-viewer payloads are computed, not measured** (I had no Plus session): I replayed the page code over
  `content/v2`.
- **DataFast script size is unknown:** `datafa.st` timed out from here.
- **Nothing in scope is unwritten:** every page listed in ARCHITECTURE §1 exists and returns 200.

## 1. Measurements

### 1.1 Documents (dev server, guest, warm)

HTML and RSC are in KB. Render time is the dev-server median of 6 requests.

| URL | HTML | HTML gz | RSC (`RSC: 1`) | dev render (median) |
|---|---:|---:|---:|---:|
| `/ru` (landing) | 317 | 48 | 170 | 117 ms |
| `/en` · `/ja` | 294 · 302 | 44 · 47 | 158 · 162 | |
| `/ru/segment` | 191 | 31 | 102 | 80 ms |
| `/ru/segment?q=фото` | | | | 60 ms |
| `/ru/segment/interior-design` (free, full article) | 258 | 47 | 142 | 98 ms |
| `/ru/segment/habit-tracking` (locked preview) | 109 | 20 | 67 | 58 ms |
| `/ru/ideas` (guest) | **387** | 29 | 77 | 86 ms |
| `/ru/ideas/interior-design-1` (free) | 93 | 20 | 49 | 41 ms |
| `/ru/ideas/habit-tracking-1` (locked) | 58 | 12 | 34 | |
| `/ru/saved` | 90 | 15 | 63 | 41 ms |
| `/ru/settings` · `/ru/plus` · `/ru/welcome` · `/ru/login` | 81 · 52 · 58 · 48 | 15 · 10 · 11 · 10 | 43 · 27 · 35 · 27 | |
| `/ru/contacts` · `/ru/offer` · `/ru/privacy` | 63 · 86 · 68 | 13 · 19 · 15 | 36 · 48 · 39 | 42 ms |

How the HTML splits between inline flight data (`self.__next_f`) and markup:

| Page | Flight | Markup |
|---|---:|---:|
| landing | 194 KB | 111 KB |
| article | 163 KB | 89 KB |
| ideas catalog | 88 KB | **295 KB** |

On the ideas catalog, 288 locked cards take about 975 B each (`<img srcset>`, an inline lock SVG and a hidden
hint span).

**Plus viewer on `/ru/ideas` (computed).** The page serializes 293 cards with copy (130 KB) and 293 search
haystacks (215 KB): **345 KB of client props, 77 KB gz** (en 218 KB, de 240 KB, ja 242 KB). The document then
carries them twice, in the flight data and in the rendered cards: about **0.8 MB raw** before compression.

### 1.2 Client JS

These are the app's own client modules, minified. The React 19 and Next 16 runtime (≈ 110–130 KB gz) comes on
top of every row.

| Group | min | gz | Largest inputs |
|---|---:|---:|---|
| **Global** (root layout: shell, sign-in host, paywall host, library sync, i18n) | **120 KB** | **34 KB** | `auth/strings.ts` 24.5 K, `plus/strings.ts` 19.1 K, `i18n/builtin.ts` 10.0 K, `SignInPanel` 8.1 K, `PlusOffer` 6.1 K, `library/sync` 5.0 K |
| Landing islands | 9 | 4 | Carousel, islands |
| Research catalog | 12 | 5 | search field |
| Research article | 61 | 18 | library components + strings + keys, ArticleChrome, Sheet (partly shared with global) |
| Ideas catalog | 38 | 12 | IdeasCatalog, ideas strings |
| Idea reader | 78 | 21 | `ExportSheet` 7.5 K, `manifest.generated` 6.2 K, library strings/keys |
| Saved | 68 | 19 | SavedScreen 9.1 K, library strings/keys |
| Settings · Welcome · Plus page | 37 · 31 · 55 | 10 · 9 · 15 | |

**Third-party scripts are the heaviest JS on every page:**

| Script | Transferred (gz) | Raw |
|---|---:|---:|
| gtag.js | **172 KB** | 512 KB |
| Metrika `tag.js` | **113 KB** | 258 KB, plus the webvisor module |

That is about 285 KB gz of third-party JS, against about 150 KB gz of our own runtime plus app code.

### 1.3 CSS (dev, unminified)

- **Global chunk: 68 KB (12 KB gz).**
  - `site.css` 54 K
  - `auth.css` 5.6 K and `plus.css` 7.7 K, pulled in on every page by the global hosts
  - the Onest `@font-face`
- **Per-route chunks:**

| Route | CSS raw | gz |
|---|---:|---:|
| landing | 33 KB | 6.3 KB |
| topic (research + ideas + library CSS) | 34 KB | 5.2 KB |
| idea | 20 KB | 3.3 KB |
| ideas catalog | 13 KB | 2.4 KB |
| research catalog | 15 KB | 2.8 KB |
| legal | 7 KB | 1.5 KB |
| saved | 7 KB | 1.7 KB |

- Tailwind is correctly scoped (`@import "tailwindcss" source(none)` + `@source` new-site only). Nothing from the
  old site leaks in. **CSS size is fine.**

### 1.4 Server and 2 GB box

- **Content loader** (`src/site/content/index.ts:57-115`):
  - Files are read with fs and cached in an LRU of promises (cap 2000 = the whole corpus, ≈ 15 MB heap
    according to the authors' measurement). The largest files are `search.json`, 0.5–0.85 MB per locale.
  - No mtime stat in production.
  - Pages share the cached promise, so metadata and page do not parse twice.
  - `getViewer` and `getT` are wrapped in React `cache()`: one DB round trip per request, and none for guests
    (`src/lib/access.ts:19-21`).
  - No static imports of `content/v2`.
  - `sitedata` caches per locale and slug.
  - **Verdict: OK.**
- **Every new page is dynamic.** The root layout reads `cookies()` and the session
  (`layout.tsx:44,64-67`), so nothing is prerendered or cached. See P5.
- **Dev render cost:** 40–120 ms warm. Production is typically 2–4× faster, about 15–50 ms of CPU per page.

## 2. Findings

Severity: blocker = must fix before shipping; major = real user or box impact; minor = cleanup or small win.
No blockers.

### P1 · major — Analytics libraries are preloaded at page start and outweigh the whole app

- **Where:** `src/app/(site)/site/[lang]/layout.tsx:136-145`. Three `<Script strategy="afterInteractive">`.
  Next emits a `<link rel="preload" as="script">` for each at the top of `<head>`: see the HTML of any page.
- **Source:** spec 06 §1 (old layout, `06-site-infra.md:71`: same counters and ordering). Only the
  queue-before-loader ordering is contractual (`scripts/test-monetization.ts:46-51`, which checks the OLD layout
  only).
- **Problem:**
  - The preloads compete with CSS, the LCP image and our own chunks on mobile.
  - gtag (172 KB gz) and Metrika with webvisor (113 KB gz + recorder) then run on the main thread during
    hydration: TBT and INP cost.
- **Fix:**
  1. **gtag and DataFast:** change `strategy="afterInteractive"` → `strategy="lazyOnload"`. The inline shims at
     `layout.tsx:77-90` already queue every `gtag()`/`ym()` call, so no event is lost.
  2. **Metrika:** keep `afterInteractive` (first hit timing), or also `lazyOnload`.
  3. **Owner decision:** whether the new site needs `webvisor:true` (`layout.tsx:81`). Turning it off
     (`webvisor:false`) removes the session recorder: its DOM snapshots and mutation observer weigh on every
     interaction, including 293-card filtering.

### P2 · major — Every page ships all 5 locales of the auth, paywall and shell strings, plus both dialogs' code

- **Where:**
  - `src/site/features/plus/AccountHosts.tsx:17-19`: SignInHost, PaywallHost and LibrarySync are mounted by the
    root layout.
  - `src/site/features/auth/SignInHost.tsx:11-12,29`: static `SignInPanel` and `useWebStrings(authStrings)`.
  - `src/site/features/plus/PaywallHost.tsx:10-11`: static `PlusOffer`, which uses `useWebStrings(plusStrings)`.
  - `src/site/i18n/client.tsx:82-85`: `useWebStrings(table)` returns `table[locale]`, so the whole 5-locale table
    is in the bundle.
  - `src/site/i18n/translate.ts:10,96-103`: `BUILTIN_UI` for all locales ships to the client through `useT`.
- **Source:** ARCHITECTURE §6 (per-feature `strings.ts` with 5 locales) does not require shipping them to the
  browser. Spec 03 §2.1: the paywall is a sheet opened on demand.
- **Problem:**
  - Of the ~120 KB (min) global client code, ≈ 47 KB is other locales' strings: auth 24.5 K, plus 19.1 K,
    builtin 10 K, shell/ui ~6 K.
  - ≈ 25–30 KB more is dialog UI that only runs after a click.
  - The dialogs also force `auth.css` + `plus.css` (13 KB) into the global CSS.
- **Fix:**
  1. **Pick strings on the server.** In `AccountHosts.tsx` (a server component) pass `s={authStrings[locale]}` to
     `SignInHost` and `s={plusStrings[locale]}` to `PaywallHost`, and thread them to `SignInPanel` / `PlusOffer`
     as props.
     - For the shell (ChromeFrame, TopNav, TabBar, HeaderParts, OpenInAppBanner, AppStore), extend
       `I18nProvider` with a `web` prop and a named hook:
       `<I18nProvider locale={lang} strings={…} web={{ shell: shellStrings[lang], ui: uiStrings[lang] }}>`,
       used as `useWeb("shell")`.
     - Remove `useWebStrings(table)` from client code.
  2. **Load the dialogs lazily:**
     `const SignInPanel = dynamic(() => import("./SignInPanel").then((m) => m.SignInPanel), { ssr: false })`,
     rendered only while `state !== null`.
     - Same for `PlusOffer` inside `PaywallHost` (`/plus` keeps its static import).
     - Move `loadPendingTelegram` and `peekResume`/`clearResume` into tiny non-UI modules so the hosts don't pull
       in the panels.
     - `auth.css` / `plus.css` then load with the chunk.
  3. **Keep `BUILTIN_UI` off the client.** Server `t.pick()` already applied the builtin fallback. Give `makeT`
     an option `{ builtin: false }` and call it that way from `useT` (`client.tsx:69-71`), or move the
     `BUILTIN_UI` lookup into `i18n/server.ts`.
- **Expected gain:** ≈ −70 KB min / −20 KB gz JS and −13 KB CSS on every page.

### P3 · major — Ideas catalog: large serialized props for Plus, 293 hydrated client cards, synchronous filtering per keystroke

- **Where:**
  - `src/app/(site)/site/[lang]/ideas/page.tsx:67-85,97-103`
  - `src/site/features/ideas/IdeasCatalog.tsx:52-59,117-143`
  - `src/site/features/ideas/IdeaCard.tsx:1,55-69`
- **Source:**
  - Spec 09 G10: an entitlement-scoped haystack, filtered on the client with the app algorithm;
    "Don't virtualise: DOM order must match the app order".
  - Spec 02 §2; `ClarityCatalogs.swift:171-174`.
- **Problem:**
  - **Plus viewer:** 345 KB of JSON props in ru (≈ 0.8 MB of HTML).
  - **Guest:** 44 KB of props, of which 36 KB are cover objects. Every idea cover is derivable from the slug: I
    checked all 293 × 5 locales. The pattern is `{src:"ideas/<slug>", widths:[480,800,1200], 1200×800,
    alt:""}`.
  - Every keystroke runs `filterIdeas` and re-renders up to 293 non-memoized `IdeaCard`s synchronously in the
    input's event: INP risk on mid-range Android.
  - `cards.map(...)` re-creates 293 objects on each filter pass.
- **Fix:**
  1. **Slim the props:**
     `CatalogCard = { slug: string; locked: true } | { slug; locked: false; title; description; categoryName }`.
     Build the image in `IdeaCard` from the slug:
     `const cover = { src: \`ideas/${slug}\`, widths: [480, 800, 1200], width: 1200, height: 800, alt: "" }`.
     Keep `cover` optional for future exceptions.
  2. **Don't send the haystacks with the page.** Serve them from a GET route on first focus or keystroke, e.g.
     `GET /api/site/ideas/haystack?locale=ru`:
     - entitlement-scoped exactly like today;
     - `Cache-Control: private, max-age=3600`;
     - `IdeasCatalog` keeps `?q=` server filtering for direct loads.
     - Needs the owner's OK: it is a wording deviation from spec 09 G10 ("ship … with the page"), with the same
       semantics.
     - If the owner declines, at least drop the fields already in the card from each haystack (title,
       description) and normalize them on the client.
  3. **Deferred filtering:** `const deferred = useDeferredValue(query)` and use `deferred` in the `useMemo` at
     `IdeasCatalog.tsx:52-59`.
     - Hoist `const withCategory = useMemo(() => cards.map((c) => ({ ...c, category: ideaCategorySlug(c.slug) })), [cards])`.
     - Export `IdeaCard` as `memo(IdeaCard)`.
  4. **Offscreen rendering** without virtualizing (the DOM stays intact, so spec 09 is respected), in `ideas.css`:
     `.ia-ideas__grid > li { content-visibility: auto; contain-intrinsic-size: auto 340px; }`.
     Use the same on `.ia-rs-grid > li` (35 research cards).
  5. **Guest markup:** render the hint once. Give all locked cards
     `aria-describedby="ideas-locked-hint"` pointing at a single hidden `<span id="ideas-locked-hint">` instead of
     288 copies (`IdeaCard.tsx:50-54`). This saves ~40 KB of HTML.

### P4 · major — Onest is the raw 193 KB TTF, not preloaded where it is the hero face, and its fallback is unadjusted on Android

- **Where:** `src/site/fonts.ts:7-23` (`src: "./fonts/Onest.ttf"`, `preload: false`); imported by
  `src/app/(site)/site/[lang]/layout.tsx:7,70`.
- **Source:**
  - `05-design-system.md:129`: "Convert to WOFF2, subset Latin + Latin-ext + Cyrillic".
  - `04-content-data-model.md:712`: the exact `pyftsubset` command.
  - `ClarityWelcomeTypography.swift:15-33`: Onest 900 headlines on landing, paywall and onboarding.
- **Problem:**
  - Served as TTF: 193 KB, ≈ 108 KB gzip, vs an estimated 50–70 KB as a subset WOFF2.
  - Not preloaded, so the landing H1 (Onest 900, 34–58 px, the likely LCP element) swaps late.
  - next/font's metric-adjusted fallback is `local(Arial)`. Android has no Arial, so it falls through to
    unadjusted Roboto 900 and the hero reflows on swap (CLS).
- **Fix:**
  1. Generate `src/site/fonts/Onest-var.woff2` with the spec command:
     `pyftsubset Onest.ttf --flavor=woff2 --layout-features='*' --unicodes='U+0000-024F,U+0400-04FF,U+2000-206F,U+20AC,U+20BD' --output-file=Onest-var.woff2`.
     Set `src: "./fonts/Onest-var.woff2"`. Keep `Onest-LICENSE.txt`.
  2. **Preload only where it is above the fold.** Remove the import from the root layout. Create the font in
     `src/site/fonts.ts` with `preload: true` and import it only in the landing (`LandingPage`), the Plus page and
     `WelcomeFlow`. next/font preloads per route that imports it.
     - Add `className={onest.variable}` on each page's root element.
     - In CSS on those roots, redefine the token (the `:root` value is already resolved):
       `.ld-root, .ia-plus, .ia-wel { --ia-font-display: var(--ia-font-onest), var(--ia-font-sans); }`.
     - The sign-in dialog title (`auth.css:42`) keeps working on those routes and falls back to system sans
       elsewhere. Alternatively, import the font inside the lazily loaded `SignInPanel` chunk (P2), which does
       not add a preload.
  3. **Android fallback:** set `adjustFontFallback: false` and declare the fallback yourself in `tokens.css`:
     `@font-face { font-family: "Onest Fallback"; src: local("Arial"), local("Roboto"), local("Helvetica Neue"); size-adjust: 106.1%; ascent-override: 91.42%; descent-override: 28.75%; line-gap-override: 0%; }`.
     Then use `--ia-font-display: var(--ia-font-onest), "Onest Fallback", var(--ia-font-sans)`. The values come
     from next/font's generated face.
- **Note:** nginx now gzips `font/ttf` (`deploy/nginx-badcomment.conf:48-49`). After the switch to WOFF2, drop
  `font/ttf font/otf` from `gzip_types`.

### P5 · major (capacity) — Every new page is SSR per request; nothing is cached for anonymous visitors or crawlers

- **Where:**
  - `layout.tsx:44,64-67`: `cookies()` + `getViewer()` in the root layout make every route dynamic.
  - `Cache-Control: no-cache, must-revalidate` on all documents.
  - The proxy adds `Set-Cookie: locale=…` when the cookie is absent: every bot hit.
- **Source:** `04-content-data-model.md:843`: public non-gated pages (landing, catalogues, free article and
  ideas) "can be statically generated".
- **Problem:**
  - About 1,700 new URLs (35 topics + 293 ideas × 5 locales + tabs and legal).
  - Every crawler or anonymous hit runs the full React render on the 2 GB, single-process box. Heaviest: the
    landing (317 KB HTML), `/ideas` (387 KB) and articles.
  - A crawl burst competes with the old site's large in-process data (spec 06 §7: 148 MB `src/data`).
- **Fix:** a short nginx micro-cache for anonymous HTML only. The guest HTML depends only on the URL, `ia_theme`
  and `ia_app_banner`.
  - Add to the live file:

```nginx
# http {} level (or top of the site file)
proxy_cache_path /var/cache/nginx/inapp levels=1:2 keys_zone=inapp_html:10m max_size=256m inactive=10m use_temp_path=off;
map $http_cookie $inapp_signed_in { default 0; "~*(^|;\s*)ia_session=" 1; }

# inside server {} — new-site document URLs only (no RSC, no query → search pages stay live)
location ~ ^/(ru|en|de|fr|ja)(/(segment|ideas)(/[a-z0-9-]+)?|/(contacts|offer|offer/payment|privacy))?/?$ {
    proxy_pass http://badcomment_next;
    proxy_cache inapp_html;
    proxy_cache_key "$host$uri|$cookie_ia_theme|$cookie_ia_app_banner";
    proxy_cache_bypass $inapp_signed_in $http_rsc $args;
    proxy_no_cache     $inapp_signed_in $http_rsc $args;
    proxy_ignore_headers Cache-Control Set-Cookie;   # the only Set-Cookie here is locale=<same as the URL>
    proxy_cache_valid 200 60s;
    proxy_cache_use_stale updating error timeout http_502 http_503;
    proxy_cache_lock on;
    add_header X-Cache $upstream_cache_status;
}
```

  - **Before enabling, check:**
    - `/<L>` for a signed-out visitor is the landing and for a signed-in one a 307. The `ia_session` bypass
      covers this.
    - `?auth=` and `?login=` notices use query strings, so they bypass.
    - The `as_buyer` cookie only matters when signed in.
  - **Longer term:** Next 16 Cache Components (`use cache` on the content-heavy subtrees such as ResearchArticle
    and the ideas grid) removes most of the per-request render cost even for signed-in users.

### P6 · major (perceived speed) — No `loading.tsx` anywhere, so no route is prefetched and every click waits in silence

- **Where:** `src/app/(site)/site/[lang]/**`. There is no `loading.tsx`: `find` found none.
- **Source:** `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`, the table "Prefetching static vs.
  dynamic routes": a dynamic page is "Prefetched: No, unless loading.js". The dev server confirms it: a prefetch
  request returns only the 309-byte route tree.
- **Problem:** tapping a topic, idea card or tab gives no feedback until the server finishes the whole render
  (hundreds of ms on mobile networks).
- **Fix:** add `loading.tsx` files built from the existing `Skeleton`, `SkeletonText` and `SkeletonCard`
  (`src/site/ui/Skeleton.tsx`):
  - `segment/[slug]`: toolbar, 3:2 art block, 6 text lines
  - `ideas/[id]`
  - `segment`, `ideas`, `saved`: heading and 3 skeleton cards
  - **Cost:** each visible `<Link>` then prefetches the layout down to the boundary, which renders the dynamic
    root layout on the server.
  - On the 293-card grid, set `prefetch={false}` on `IdeaCard` links (`IdeaCard.tsx:88`) and keep default
    prefetch on tabs, topic cards and "Назад".
  - These files are in the page owners' area.

### P7 · minor — «Сохранённое» serializes the whole catalogue index for a library that is usually empty

- **Where:** `src/app/(site)/site/[lang]/saved/page.tsx:55-64`: 35 topics + 293 ideas as
  `{category, thumb, title?}`. That is 34 KB of props in ru, sent on every visit.
- **Source:** spec 02 §6 (Saved lists only bookmarked items); spec 09 G10 (gating).
- **Fix:**
  - Ideas: `thumb` = `/media/ideas/<slug>-480.webp` and `category` = `ideaCategorySlug(slug)` are derivable.
    Send only `ideaTitles: Record<slug, string>` for readable ideas (5 for guests).
  - Topics: send `{ name, cover.src }`.
  - Resulting size: ≈ 5 KB for guests. Alternatively fetch the index after hydration, only when
    `library.total > 0`.

### P8 · minor — Research search re-renders the whole catalogue on the server per keystroke

- **Where:** `src/site/features/research/CatalogSearch.tsx:14,43-48,66`. Each keystroke (180 ms debounce) calls
  `router.replace(?q=)`, which runs the full page RSC: about 100 KB per round trip in dev.
- **Source:** spec 09 G10: a route handler `GET …/search/research?locale=&q=` → `{slugs}`, and "the client renders
  the matching cards from the public catalog data".
- **Fix:** either follow the spec, or keep the current approach with a 300 ms debounce.
  - **Spec approach:** render all 35 cards once, fetch `{slugs}` from `/api/site/search/research`, and toggle
    `hidden` on the `<li>`s in slug order.
  - Also update `?q=` with `history.replaceState` (the pattern `IdeasCatalog.tsx:62-68` already uses).

### P9 · minor — LCP image hints

- **Desktop landing hero:** the illustration `WelcomeReviews_v7` (≥ 1024 px, 420 px wide, above the fold) is
  `loading="lazy"` (`src/site/features/landing/parts.tsx:180` via `LandingPage.tsx:112`).
  - Meanwhile the 120 px paper thumb gets `fetchPriority="high"` plus a preload (`parts.tsx:142` → `:75-77`).
  - Fix: render the illustration as
    `<picture><source media="(min-width: 1024px)" srcSet={mediaSrcSet(art)} sizes="420px" /><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" width={800} height={800} className="ld-illo__art" /></picture>`.
    It stays eager: the preload scanner picks the source on desktop, and phones download nothing.
  - Pass `eager={false}` for the thumb, or keep eager without `fetchPriority`.
- **Article and idea hero images carry `decoding="async"`:** `ResearchArticle.tsx:58` (`bleed`),
  `IdeaArticle.tsx:33`, `ideas/[id]/page.tsx:105-115`. Drop `decoding` when `priority` is true.
- **Research catalogue** marks the first 3 covers `fetchPriority="high"`
  (`segment/page.tsx:94` → `CatalogCard.tsx:46-47`). On phones (1 column) only the first is visible. Fix:
  `fetchPriority={index === 0 ? "high" : undefined}` and `loading={index < 3 ? "eager" : "lazy"}`.
- **Welcome:** the first step image has no priority (`WelcomeFlow.tsx:55`). Add `fetchPriority="high"` for step 0.
- **Hero `sizes`** is `(min-width: 720px) 640px` in `ResearchArticle.tsx:52` but 680px in
  `MEDIA_SIZES_ARTICLE` (`content/media.ts:10`, spec 04 §6.3). No byte difference; unify on 680.

### P10 · minor — The App Store badge is preloaded on every page

- **Where:** `src/site/ui/AppStore.tsx:39`. The `<img>` has no `loading`, so React emits
  `<link rel="preload" as="image" href="/badges/app-store.svg">` (10.8 KB) in the head of every page.
- **Fix:** add an `eager?: boolean` prop and set `loading={eager ? undefined : "lazy"}`. Pass `eager` only from
  `TopNav` (`TopNav.tsx:31`).

### P11 · minor — Client bundles import server-sized modules

- `src/site/features/ideas/IdeaReader.tsx:7` imports `FREE_CATEGORY` from `manifest.generated` (6.2 K min).
  - Fix: pass `free={category === FREE_CATEGORY}` from the page, or export the constant from a 1-line module.
- `src/site/features/library/components.tsx:24` re-exports `LIBRARY_UI_KEYS` (4.4 K of key arrays) into the
  client graph.
  - Fix: servers import it from `./keys` only; delete the re-export.
- `IdeaReader.tsx:5,21`: `ExportSheet` (7.5 K) and `NoteSheet` are static but open on demand.
  - Fix: `dynamic(() => import("./ExportSheet").then((m) => m.ExportSheet))`, rendered only when
    `exportOpen`. Same in `ArticleChrome.tsx:159` for `NoteSheet`.

### P12 · minor — TOC rail scroll-spy runs on phones where the rail is hidden

- **Where:** `src/site/features/research/ArticleChrome.tsx:168-192`: a scroll + resize listener with
  `getBoundingClientRect` over every TOC entry per frame. The rail is `display:none` below 1200 px.
- **Fix:** at the top of the effect:
  `const mq = window.matchMedia("(min-width: 1200px)"); if (!mq.matches) return;`.
  Re-run on `mq` change, or use one `IntersectionObserver` with `rootMargin: "-30% 0px -70% 0px"` on the section
  headings.

### P13 · minor — Root-level `:has()` selectors

- **Where:** `src/site/styles/site.css:120-121` (`html:has(.ia-reading-page)`, `body:has(.ia-reading-page)`),
  `:124`, `:1245`, and the dead `.ia-frame:has(.ia-tabbar-dock)` at `:1089`. The dock is rendered outside
  `.ia-frame` (`ChromeFrame.tsx:62-71`), and `[data-tabbar]` already covers the case.
- **Problem:** root-subject `:has()` makes the engine re-check the whole document on DOM mutations, for example
  293-card filtering.
- **Fix:**
  - Delete the dead `.ia-frame:has(.ia-tabbar-dock)` selector at `:1089`.
  - Add `reading: boolean` to `chromeFor()` (true for `segment/<slug>` and `ideas/<id>`) and render
    `data-reading` on `.ia-frame` (`ChromeFrame.tsx:62`).
  - Replace `body:has(.ia-reading-page) .ia-topnav[data-scrolled]` (`:1245`) with
    `.ia-frame[data-reading] .ia-topnav[data-scrolled]`.
  - Keep the `html:has` / `body:has` canvas rules at `:120-124`: the overscroll colour needs them, and they are
    only two selectors.

### P14 · minor — Small server CPU and memory wins

- **`ui.json` is parsed and kept twice per locale.** Once in `src/site/content/index.ts:180-183` (`getUI`, used by
  the topic page and landing), once in `src/site/i18n/server.ts:28-30` (`loadUIPack`). Fix: make `getUI` return
  `loadUIPack(locale)` (or the reverse).
- **`TopicExtras.tsx:18-37`** builds `Intl.NumberFormat` / `Intl.PluralRules` per app row, and
  `Intl.DisplayNames` / `DateTimeFormat` per render. Fix: cache them per locale in module `Map`s.
- **`getLandingData`** (`src/site/features/landing/data.ts:56-117`) is a pure function of cached files. Fix:
  memoize per locale:
  `const memo = new Map<Locale, Promise<LandingData>>(); export const getLandingData = (l) => memo.get(l) ?? (memo.set(l, build(l)), memo.get(l)!);`
  (reset on mtime change in dev).
- **`paragraphs()`** (`content/text.ts:127-166`, `Intl.Segmenter` on long paragraphs) re-runs on every article
  render. Fix: cache results in a `WeakMap<object, string[]>` keyed by the section or observation object from the
  LRU.

### P15 · minor — Deploy and nginx (edited during this review; now mostly right)

- **Already good:**
  - `next.config.ts:33-38` gives `/media`, `/brand` and `/badges` a one-week cache. Verified on :3210:
    `Cache-Control: public, max-age=604800, stale-while-revalidate=86400`.
  - `deploy/nginx-badcomment.conf:63-77` serves `/_next/static` (immutable) and those folders from disk.
  - Upstream keep-alive and gzip for disk files are set.
  - `badcomment.service` now runs `next start` without an npm wrapper.
- **Remaining:**
  - **Media URLs are not versioned.** A replaced image stays stale for up to a week. Add `?v=<manifest.version>`
    in `mediaSrc`/`mediaSrcSet` (`content/media.ts:12-14`) and then use `max-age=31536000, immutable` for
    `/media`.
  - **Add `open_file_cache max=2000 inactive=60s;`** to the server block: 1,500+ WebP files served from disk.
  - **Node has no heap cap** on the 2 GB box. After deploy, check RSS (`systemctl status badcomment`). If it
    exceeds about 700 MB under a crawl, add `Environment=NODE_OPTIONS=--max-old-space-size=768` and
    `MemoryHigh=1200M` to the unit, so the kernel reclaims before the OOM killer picks nginx or sshd.

## 3. Core Web Vitals risks

- **CLS: low.**
  - Every `<img>` has `width`/`height`, and the art classes set `aspect-ratio: 3/2; height:auto`
    (`ideas.css:56-63`, `research.css:48,264`; lines as of 00:20).
  - The mobile "open in app" banner is decided on the server from the `ia_app_banner` cookie
    (`OpenInAppBanner.tsx:16-20`), so it causes no shift.
  - Chrome parts come from `chromeFor(pathname)` and match between SSR and the client. Verified in the HTML:
    - `/ru/welcome`: no chrome
    - `/ru/segment`: top nav + tab bar + banner
    - `/ru/segment/<slug>`: no tab bar
  - The landing sticky CTA (`landing.css:1701-1718`) and the tab bar are `position: fixed` and move with
    `translate`.
  - Remaining risks:
    - The Onest swap on Android (P4).
    - «Сохранённое» renders skeleton rows on the server and swaps to the list or empty state after hydration
      (`SavedScreen.tsx:130,170-171`). The footer shifts. The page is noindex; reserve `min-height: 60vh` on the
      list container to keep the footer stable.
- **LCP:**
  - Article and idea heroes are preloaded with `fetchPriority="high"`.
  - The landing is text-LCP on phones, which is affected by the Onest swap (P4 — preload), and
    illustration-LCP on desktop, where the image is lazy (P9).
- **INP:**
  - Ideas search for Plus (P3), analytics main-thread work (P1).
  - Glass `backdrop-filter` on the sticky and fixed chrome (`site.css:661-662,1241-1242`, `landing.css:1710-1711`) is
    fine on iOS but costly on low-end Android while scrolling. Optional: disable the blur on devices without it,
    e.g. `@media (prefers-reduced-transparency: reduce), (update: slow) { … backdrop-filter: none; background: var(--ia-paper); }`.
- **Sticky elements:**
  - `.ia-toolbar { top: 86px }` at ≥ 1024 hard-codes the top-nav height (`site.css:644`). If the nav height
    changes (badge size, font), the reading toolbar overlaps or gaps.
  - Fix: `--ia-topnav-h: 86px` on `:root`, used by both `.ia-topnav` (as `min-height`) and `.ia-toolbar`.

## 4. What is already right (no action)

- **Images:** WebP 480/800/1200 pre-encoded, averaging 11/22/41 KB. `srcset` + `sizes` are everywhere. Catalogue
  and article inline art is lazy. App Store icons use `100x100bb.jpg` at 48 px with lazy loading.
- **lucide-react:** named imports only, through `src/site/ui/icons.tsx`. The package has `sideEffects:false`, and
  Next optimizes it by default. Icons in server components render as SVG with no JS.
- **Server/client boundaries:** articles, catalogue cards, topic extras and the footer are server components.
  Client islands receive `children`: `CatalogSearch`, `Carousel`, `IdeaReader`.
- **Payment paywall data** passed on every page is 365 B.
- **Reading fonts are system fonts** (Georgia, Hiragino Mincho): no web-font cost on articles.
- **Proxy matcher** excludes `/api`, `/_next` and files with an extension. The proxy is dependency-light
  (`src/site/routing/decide.ts`).
