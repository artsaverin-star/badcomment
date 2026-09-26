# Site v2 — architecture (binding)

Read order for implementers: `DECISIONS.md` (owner decisions, wins over everything) → this file →
the specs in `spec/` (01–08, then the errata/answers in `09-critic-gaps.md`; the web-only sections
rating/reviews/MCP: `10-web-only-sections-clarity.md`; the rating since 2026-09-25:
`11-rating-rich.md`, which supersedes spec 10's rating parts). Where a spec's URL
proposal disagrees with this file (e.g. `/research`, `/old/<loc>`, `(new)/v2`), **this file wins**.

Repo: git worktree `/Users/artsaverin/projects/badcomment-v2`, branch `site-v2`. Next.js **16.2.6**
(App Router, Turbopack) — it is NOT the Next.js you remember: read the relevant page in
`node_modules/next/dist/docs/` before using an API. In particular: `params`/`searchParams` are
Promises, `cookies()`/`headers()` are async, middleware is called **proxy** (`src/proxy.ts`).

## 1. Public URL map

Locales of the new site: `ru, en, de, fr, ja` (display order in pickers exactly this).
Old site locales: `ru, en` only.

| Public URL | Served by | Notes |
|---|---|---|
| `/` | proxy 307 → `/<negotiated>` | negotiation: `locale` cookie → Accept-Language (exact, base, prefix) → `en` (spec 09 §2.2) |
| `/<L>` | NEW home | signed out → landing; signed in → 307 `/<L>/segment` |
| `/<L>/segment` (`?q=`) | NEW research catalog (tab «Разборы») | 35 launch topics + bottom list «Скоро в новом формате» (the other 37 old topics, ru/en only, links to their URLs) |
| `/<L>/segment/<slug>` | NEW if `slug ∈ LAUNCH_CATEGORIES`, else OLD in place (banner «Скоро обновление») | L ∈ de/fr/ja and not launch → 307 `/en/segment/<slug>` |
| `/<L>/research[/<slug>]`, `/<L>/search?q=` | proxy 308 → `/<L>/segment[/<slug>]`, `/<L>/segment?q=` | aliases |
| `/<L>/ideas` (`?q=&category=`) | NEW ideas catalog (tab «Идеи») | |
| `/<L>/ideas/<id>` | NEW if `id ∈ LAUNCH_IDEAS`, else OLD in place | `/<L>/ideas/top` → OLD |
| `/<L>/pulse` (`?category=&q=&page=`; retired `kind`, `view`, `scope`, `sort` are ignored) | NEW «Пульс» feed (tab «Пульс», `docs/site-v2/PULSE.md`) | indexable only without filters, page 1 |
| `/<L>/pulse/<category>--<slug>` | NEW need page | unknown id → 404; retired prototype ids (with `:` or `insight`, also `/<L>/pulse/insight/<…>`) → 307 `/<L>/pulse?category=<cat>` (or `/<L>/pulse`) |
| `/<L>/saved` (`?filter=&q=`) | NEW (tab «Сохранённое») | |
| `/<L>/settings`, `/<L>/settings/about` | NEW | |
| `/<L>/plus` | NEW paywall page | |
| `/<L>/welcome` | NEW onboarding replay | |
| `/<L>/login` | NEW sign-in page (the dialog is also openable anywhere) | `?app=1`: the iOS app's sign-in sheet (APP-ACCOUNTS.md) — no chrome, always continues to `/<L>/app-auth` |
| `/<L>/app-auth` (`?from=email`) | NEW iOS app hand-off: one-time code → 307 `inapp://auth?code=…` (`?from=email`: a screen that opens the app) | noindex (`X-Robots-Tag`), never cached |
| `/<L>/library` (`?checkout=`) | NEW payment-return page (YooKassa return URL is `/library?checkout=`) | |
| `/<L>/contacts`, `/<L>/offer`, `/<L>/privacy` | NEW | `/en/contacts` = App Store support URL; the shipped app links `/{ru,en}/offer` and `/{ru,en}/contacts` |
| `/<L>/rating[/<niche>[/<app>]]` | NEW (web-only section «Рейтинги», 2026-09-24; rich and free since 2026-09-25, spec 11) | all 5 locales; data ru/en — de/fr/ja print English data, canonical → `/en/…`; the lists keep their view state in the URL (`/rating?q=`, `/rating/<niche>?q=&sort=store\|ratings\|name`; canonical without it) so Back restores it like the app's @State; everything is public (no viewer read, no gate); app pages are listed in `/sitemap-rating-<ru\|en>.xml` |
| `/<L>/rating/<niche>/tasks/<n>` | NEW «Выбор по задаче» (scenario page, 2026-09-25) | `n` = 1-based index into the niche's scenarios (`/^[1-9]\d{0,2}$/`, 404 when out of range or unreadable); public; indexable only when `isIndexableTask` holds (gap text, ≥ 3 rated apps, an audience name, a title that fits without clamping; spec 11 §6.1) and then listed in `/sitemap-rating-<ru\|en>.xml`, otherwise `noindex, follow`; the static `tasks` segment wins over `[app]` (no app slug is `tasks`, the slug index guards it); en/de/fr/ja exist only for the 35 launch topics |
| `/<L>/reviews[/methodology \| /<niche>[/<app id>]]` | NEW (web-only section «Отзывы») | free sample `dating-apps`, the rest needs Plus (`viewer.canReadReviews`); data pages canonical ru/en, methodology in 5 locales |
| `/<L>/mcp`, `/<L>/mcp/connect?o=` | NEW (web-only section «MCP») | 5 locales; `connect` = sign-in bridge of the MCP OAuth flow, noindex |
| `/<L>/old` and `/<L>/old/<rest>` | OLD (internal `/<rest>`) | L ∉ ru/en → 307 `/en/old/<rest>`; response header `X-Robots-Tag: noindex, follow` |
| `/old[/<rest>]`, `/old/<ru|en>/<rest>` | proxy 307 → `/<ru|en>/old/<rest>` | convenience |
| `/<L>/<anything else>` | OLD in place (internal `/<rest>`): per-app pages `/<L>/<app-slug>`, `/tokens`, `/build/**`, `/cards`, `/catalog`, `/categories`, `/best/**`, `/apps`, `/most-wanted`, `/premium`, `/admin`, … | L ∉ ru/en → 307 `/en/<rest>` |
| `/<bare path>` (no locale) | proxy 307 → `/<negotiated>/<path>` (then re-evaluated) | |
| `/api/**`, `/_next/**`, files with an extension, `/icon`, `/apple-icon`, `/opengraph-image`, `/sitemap.xml`, `/sitemap-rating-{ru,en}.xml`, `/robots.txt`, `/feed.xml`, `/llms*.txt`, `/.well-known/**` | untouched (proxy matcher excludes them) | |

`NEW_TOP` (first segment after the locale owned by the new site): `"" | segment* | research | search
| ideas* | pulse | saved | settings | plus | welcome | login | library | contacts | offer | privacy | site
| app-auth | rating | reviews | mcp`
(`*` = only when the slug/id is in the manifest; `site` is included so that a public request can
never reach the new site's internal folder through the old rewrite — it simply 404s in the new
layout). Never create a new top-level segment named `notes` (it is an old app slug) or any other
key of `src/data/app-slugs.json`.

## 2. Internal layout (files)

```
src/proxy.ts                         # routing above (owned by the SHELL agent)
src/site/manifest.generated.ts       # LAUNCH_CATEGORIES (35, ordered), LAUNCH_IDEAS (293), FREE_*;
                                     #   isLaunchCategory/isLaunchIdea — tiny, imported by the proxy
src/app/(old)/**                     # every old page, moved with `git mv` (URLs unchanged). Its
                                     #   layout.tsx is the old root layout (old CSS, header, footer)
src/app/(site)/site/[lang]/**        # NEW site pages. Internal path /site/<L>/...; the proxy rewrites
                                     #   public /<L>/... here. `[lang]/layout.tsx` is the NEW ROOT
                                     #   LAYOUT (<html lang>, <body>, tokens CSS, analytics)
src/app/api/**                       # existing APIs, untouched unless noted
src/app/api/site/**                  # NEW APIs for the new site (saved/notes sync, search, …;
                                     #   rating-search: GET ?l=&q=&offset=&limit=40|all → {total, items}
                                     #   of the rating catalogue search, public fields only (with rank,
                                     #   storeAvg and the icon path), 400 on a bad locale/empty q/limit,
                                     #   q cut to 80, `max-age=300` + noindex;
                                     #   pulse: GET ?l=&category=&q=&page= → {version, page, pages,
                                     #   total, items} — the «Пульс» feed's next page for its
                                     #   auto-loading, slim card fields only, empty past the end,
                                     #   400 on a bad locale/page, `max-age=300` + noindex; PULSE.md)
src/app/{sitemap.ts,robots.ts,icon.tsx,apple-icon.tsx,opengraph-image.tsx,feed.xml,llms*.txt}
                                     # stay at the root (shared)
src/app/sitemap-rating-{ru,en}.xml/route.ts
                                     # the rating's image sitemaps (app + indexable task pages; spec 11
                                     #   §6.5), dotted folders like feed.xml so the proxy skips them;
                                     #   robots.txt lists them next to /sitemap.xml
src/site/                            # ALL new-site code; never import src/components/** here
  config.ts                          # APP_STORE_APP_ID, APP_STORE_URL ("" while in review), SITE_URL, …
  routing.ts                         # href helpers: href(L, "segment", slug) etc. — public URLs only
  access.ts                          # getViewer(): {loggedIn, plus, user, canReadResearch, canReadIdea}
  i18n/                              # locale list, negotiation, t(), plurals, ui.json loader
  styles/                            # tokens.css (--ia-*), site.css (Tailwind v4 entry + @theme bridge)
  ui/                                # primitives: Button, Card, Heading, Search, Badge, Sheet/Dialog,
                                     #   Icons (lucide-react), Toolbar pills, AppStoreBadge + popup, …
  shell/                             # TopNav (desktop), FloatingTabBar (mobile), Footer, OpenInApp banner
  content/                           # server-only loaders for content/v2 (+ types); rating.ts reads
                                     #   content/v2/<L>/rating (sync, mtime-checked LRU; types in
                                     #   rating-types.ts, the importer↔reader contract)
  sitedata/                          # server-only adapters to OLD site data (apps, icons, ratings,
                                     #   market players; rating.ts, reviews.ts, mcp.ts for the web-only
                                     #   sections) — read-only reuse of src/lib/** loaders. rating.ts is
                                     #   the rating READER over content/rating (de/fr/ja = en + overlay,
                                     #   usable() niches, the URL slug index over the raw app order,
                                     #   searchRatingApps with an LRU of 200 queries); it applies no text
                                     #   processing. rating-sitemap.ts builds the rating's sitemap
                                     #   entries and IndexNow URLs over the same reader (lastmod = the
                                     #   niche's updatedAt; IndexNow gets what the latest import changed,
                                     #   for 14 days). Without the rating files the section is empty
                                     #   (catalogue without niches, niche/app pages 404): the files are
                                     #   committed, so this only happens in a checkout that lost them
  features/<feature>/                # research, ideas, library (saved+notes+export), settings, plus,
                                     #   auth, landing, welcome, legal, rating, reviews, mcp — each
                                     #   feature owns its folder, including its own web-only strings
                                     #   file (see §6)
content/v2/<L>/...                   # generated app content (spec 04 §7.2/§7.3), read with fs at runtime
content/v2/{ru,en}/rating/{index,<niche>}.json  # rating data (spec 10 §8, spec 11 §8): numbers, raw app
content/v2/{de,fr,ja}/rating/overlay.json       #   order (= rank order), App Store icon and screenshots
                                     #   (compact mzstatic paths) and reviews read from
                                     #   src/data/peoplesRating, ru texts from the app's rich.ru
                                     #   (editorial overrides applied), en texts from peoplesRating en,
                                     #   scenarios from rich.ru/rich.en, quotes from rich.ru evidence +
                                     #   quote-translations.<L>, SEO head terms, intros and the few
                                     #   topic-name overrides from
                                     #   scripts/v2/data/rating-seo.json. Apps carry `short`, `icon`,
                                     #   `shots`, `reviewsRead`; niche files `seoName`, `intro`,
                                     #   `updatedAt`; the index `leaders` (ranks 1–4) and `generatedAt`.
                                     #   Texts are final (typography, trust wording, «readable»);
                                     #   de/fr/ja carry only their topic names and quote translations.
                                     #   All rating data is PUBLIC (spec 11 D2: the whole rating is free).
public/media/{ideas,research,welcome}/*.webp   # generated from the app asset catalog (spec 04 §6)
scripts/v2/                          # import-app-content.ts, export-images.*, checks. The rating step is
                                     #   opt-in: `npx tsx scripts/v2/import-app-content.ts --only=rating
                                     #   [--check]` (scripts/v2/import-rating.ts) writes only
                                     #   content/v2/<L>/rating/** (not the manifest); the full import
                                     #   does not run it. check-content.ts validates those files in CI.
```

Rules:
- New-site code lives only in `src/site/**`, `src/app/(site)/**`, `src/app/api/site/**`,
  `content/v2/**`, `public/media/**`, `scripts/v2/**`. Old code is touched only where §5 says.
- Never statically `import` content JSON from `content/v2` (it would bundle every locale) — read it
  with `fs` in `server-only` modules with a small LRU (spec 04 §7.5).
- Paid text never reaches a viewer without access: gate on the server before rendering/serializing
  (spec 04 §7.6, spec 09 G10). A locked idea card = `{slug, cover}` only.
- Old data libraries in `src/lib/**` may be imported read-only from `src/site/sitedata/**`.

## 3. Proxy contract (headers the proxy sets)

For requests it rewrites to OLD pages the proxy sets request headers (read by the old root layout):
- `x-locale`: `ru|en` (existing contract of old code)
- `x-ia-site`: `old` (under `/<L>/old/...`) or `inplace` (old page at its original URL)
- `x-ia-public-path`: the public path that was requested
- `x-ia-new-path`: public URL of the new-site equivalent if one exists, else `/<L>`
- `x-ia-soon`: `1` when an in-place page is `/segment/<slug>` for a non-launch topic

For NEW pages: rewrite to `/site/<L>/<rest>`; set the `locale` cookie (1 year) to `<L>`.
`/<L>/app-auth` and `/<L>/login?app=1` (the iOS app's sign-in sheet) also get `x-ia-app-flow: 1`:
the new root layout then loads no analytics libraries (APP-ACCOUNTS.md).
Old in-place pages also set the `locale` cookie (ru/en). `/<L>/old/**` never writes the cookie.
Responses under `/<L>/old/**` get `X-Robots-Tag: noindex, follow`.
RSC/prefetch requests go through the same logic (`NextResponse.rewrite` propagates RSC headers).

## 4. Access, auth, payments, persistence

- `plus = getAccess().unlimited` (admin ∨ lifetime ∨ friend ∨ premiumUntil>now; `as_buyer` honoured).
- Free layer (app rule): topic `interior-design`; ideas `interior-design-1…5`.
- Legacy per-item unlocks are honoured: `has("category"|"chapter", slug)` opens a topic and its
  ideas; `has("idea", id)` opens an idea.
- Auth reuses the existing endpoints (spec 06 §3.6). The new UI ships one sign-in dialog opened via
  a client helper `openSignIn({reason})` plus the `/<L>/login` page. Google/email need `return_to`
  = current public URL.
- Payments reuse `POST /api/pay/yookassa {kind:"lifetime", method, source:"v2_<surface>"}` exactly
  as today (price 990 ₽ from `ACCESS_PRICE_RUB`; prices frozen). Return lands on `/<L>/library`.
- Saved/notes: local-first in `localStorage` (keys in spec 09 §2.5) + account sync when signed in
  via `src/app/api/site/library` and additive Prisma models (`SiteSaved`, `SiteNote`). Merge once on
  sign-in. Wording: guests «сохранено в этом браузере», signed-in «сохранено в аккаунте».
- Theme cookie `ia_theme` = `light` (default) | `dark` | `system`.

## 5. Changes to OLD code (the only allowed ones)

1. Done: `git mv` of old pages/layout/CSS into `src/app/(old)/`; `scripts/test-monetization.ts`
   reads `src/app/(old)/layout.tsx`.
2. Navigation links inside old code: `oldHref()` returns the public URL when that URL is served in place
   (old-only route) and `/<L>/old/…` when the new site owns the public URL (AUDIT-PHASE-A A4). Exception
   since 2026-09-24: the moved web-only sections (`NEW_SECTIONS` in `src/site/routing/decide.ts`:
   `/rating/**`, `/reviews/**`, `/mcp/**`) are linked at their public URL from anywhere in old code, so
   they always open in the new design; their old copies stay reachable only by typing `/<L>/old/…`. Originally: a helper `src/lib/oldHref.ts`
   (`oldLp(locale) → "/ru/old" | "/en/old"`) replaces the `lp` constants and per-line locale
   templates, bare paths, client navigations and language switchers (spec 07 §5 M1–M6, M10 where
   it builds navigation links). **Do not change** metadata canonicals/hreflang/JSON-LD/sitemap/feed/
   llms/emails/OAuth/webhook/MCP absolute URLs (M7–M9): old content keeps its original canonical
   URLs so in-place pages stay indexed.
3. Old root layout renders `OldSiteBanner` from the proxy headers (§3): «Это прежняя версия сайта ·
   Перейти на новую» (link `x-ia-new-path`); for `x-ia-soon=1`: «Скоро обновление · пока прежняя
   версия разбора»; for other in-place pages a quiet «Этот раздел пока в прежнем дизайне · Новый
   inApp →». Old header logo → `x-ia-new-path`'s locale home (`/<L>`).
4. CI smoke tests in `.github/workflows/deploy.yml` keep working: `/ru/segment/{language-learning,
   workout-fitness,habit-tracking}` become NEW pages — the new topic page must contain
   `id="main-players"` and `/badges/app-store.svg` (it shows market players with store badges);
   add smoke checks for the new site (`/en`, `/en/contacts`, `/ru/segment/interior-design`,
   `/ru/old`). The web-only sections are checked by ids of server-rendered lists, never by styling
   classes: `id="rating-niches"` (`/ru/rating`, must not be noindex), `id="rating-apps"`
   (`/ru/rating/dating-apps`), `"total":` > 0 from `/api/site/rating-search`, `id="review-apps"`
   (`/en/reviews/dating-apps`, the open sample — other niches render a lock card for guests) and
   `list_niche_themes` (`/ru/mcp`, `/de/mcp`: the tool list stays server-rendered). The rich, free
   rating (spec 11 §9) adds: `id="group-health"` and `is1-ssl.mzstatic.com` artwork (`/ru/rating`);
   `id="rating-leaders"` (`/ru/rating/dating-apps` with its keyword H1 «Лучшие приложения для
   знакомств», `/ru/rating/habit-tracking` with mzstatic artwork); `id="screenshots"`,
   `"bestRating":100` and no `aggregateRating` (the Hevy app page);
   `id="rating-task-apps"` (a task page); `"icon":` in the search API; the sitemap files
   (`/sitemap-rating-ru.xml` and `/sitemap-rating-en.xml` answer 200 with `/rating/` URLs and
   `<image:loc>`, `robots.txt` lists them). Two checks read class names because those blocks have
   no id: `class="ia-quote` (quotes are public) and the absence of `ia-rs-lock-card` (no gate).
5. Archived rating pages `src/app/(old)/rating/**` (typed-in `/<ru|en>/old/rating/**`) set
   `robots: { index: false, follow: true }` in `generateMetadata` and have **no `alternates`**
   (spec 11 §6.5): a documented exception to item 2's "do not change metadata canonicals". The
   proxy sends `X-Robots-Tag: noindex` for them; together with their former meta `index, follow`
   and a canonical to the live URL, that risked carrying the noindex over to the live page. Their
   JSON-LD and body stay.
6. «Пульс» bridge (`docs/site-v2/PULSE.md`): `src/components/LegacyPulseLink.tsx` on the old topic
   pages served in place and `NicheDossier` — the category's needs with their pain score, linking
   into the new site through `publicHref` + `old-links: allow`. The review archive moved to the new
   site (item 2), so its hub and category pages carry the new-site block themselves (`PulseTop`,
   `CategoryPulse`); the archived copies under `/<ru|en>/old/reviews/**` have none.

## 6. i18n

- App UI strings: `content/v2/<L>/ui.json` (keys = the Russian source string, spec 04 §7.3). `t(ru)`
  returns the translation for the locale; fallback own → base → en; ru = identity.
- Web-only strings (landing, sign-in, payments, App Store popup, web wording deltas from spec 09
  G11): each feature keeps `src/site/features/<f>/strings.ts` exporting
  `{ ru: {...}, en: {...}, de: {...}, fr: {...}, ja: {...} }` keyed by stable ids. All 5 locales
  must be filled (write ru/en yourself; translate de/fr/ja carefully, informal «ты»-equivalent tone
  like the app: du / tu / casual Japanese as the app's ui.<L>.json does). Typography follows the app
  packs (French U+00A0 before `: ; ! ? »`, Japanese です・ます); `node
  docs/site-v2/review/lint-web-strings.mjs` checks it.
- Client components get app keys only from the server: the page wraps them in `<I18nProvider
  strings={t.pick(X_UI_KEYS)}>`, where `X_UI_KEYS` lives in a server-safe `features/<f>/keys.ts` (a
  "use client" module cannot export data). Add every new client file to the `COVER` map of
  `docs/site-v2/review/check-ui-keys.mjs`; the check must report 0 keys missing and 0 keys "not in
  the provider that wraps the file". Rating: `RATING_UI_KEYS`, reviews: `REVIEWS_UI_KEYS`, MCP:
  `MCP_UI_KEYS` (also the shared `features/plus/PlusCard.tsx` with caption "static"; Settings hands
  it `SETTINGS_CLIENT_KEYS`). Every rating page (catalogue, niche, app, task) wraps its client parts
  in `<I18nProvider locale strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingStrings[L] }}>`:
  app keys through `useT()`, the rating's web strings through `useWeb<RatingStrings>("rating")`
  (spec 11 RR8). The `COVER` prefix `src/site/features/rating/` covers new client files there;
  `src/site/ui/AppIcon.tsx` uses no `t()`.

## 7. Design

Spec 05 is the source (tokens §6 with `--ia-*` names; components §3.6; motion §5). Defaults
chosen for the web (the app is iPhone-only): mobile < 1024px uses the floating capsule tab bar
at the bottom on tab roots and «Назад» pills on inner pages; ≥ 1024px uses a sticky top bar
(logo, 4 tabs — Разборы, Пульс, Идеи, Сохранённое —, App Store badge, account). The web-only
sections «Рейтинги · Отзывы · MCP» are a quiet second level (`src/site/shell/SectionNav.tsx`,
`.ia-secnav*` in site.css): plain text links beside the logo, rounded 500 15/20 in secondary, the current section in ink 600, no background
or accent pill in any state (the tab capsule stays the only selected shape), 44 px hit height;
when the logo column is narrower than 380 px (container query) one «Ещё разделы ⌄» menu trigger
in the same quiet style replaces them; < 1024 a ☰ menu in the compact header lists the tabs («Пульс»
included) and the sections; the footer links them too. There is no «⋯» sections menu. Section
pages have no current tab; depth comes from the Back pill. «Пульс» (`docs/site-v2/PULSE.md`) is a
web tab in the capsule, not a section: site-only like the sections, but its block sits on topic
pages and on the review archive's hub and category pages (not on the rating, DECISIONS Q11).

The web-only sections themselves follow the app's Clarity screens (`docs/site-v2/spec/
10-web-only-sections-clarity.md`; reviews and MCP are built only from Clarity blocks; the rating
follows spec 11, next paragraph): one 680 px column (`ia-page ia-page--catalog
ia-page--stack`, gap 20 on lists, `ia-page--stack-24` on detail pages), fixed Georgia 30 H1
(`ia-heading--fixed`), flat `.ia-card--utility` cards and Settings/Saved grouped boxes (no shadow,
no press scale), monochrome (ink/secondary; accent only for interactive text, selected chips,
focus and the Plus band; ★ only as a text glyph), no eyebrows or stat tiles (counts go into one
13/18 « · » line), links between pages as `RowCard`s (48 px tile, title, subtitle, no chevron or
«→»), shared primitives in `src/site/ui` (`Row`/`RowCard`, `QuoteBlock`, `EmptyCard`,
`PickerSheet`, `categoryGlyph`, `Button variant="ink"`) and site.css (`.ia-section-head*`,
`.ia-footnote`, `.ia-stack*`, `.ia-pill*`, `.ia-sort-btn`, `.ia-menu-anchor--tick`,
`.ia-rt-method-card`). The review archive and MCP show no store artwork; «mismatch»
(green/amber/red) colours are gone everywhere.

The rating (`docs/site-v2/spec/11-rating-rich.md` RR1–RR9, 2026-09-25) keeps that language but is
visual, scannable and free. App Store icons (`src/site/ui/AppIcon.tsx`, `.ia-app-icon`) and
screenshots are hotlinked from `is1-ssl.mzstatic.com` in CDN-sized WebP (`features/rating/media.ts`):
plain `<img>` with `width`/`height` or an aspect-ratio box, lazy below the fold, one `preconnect`,
no `next/image`, and `RatingImageGuard` hides a broken shot. The catalogue is an `ia-page--grid` of
niche cards (a folder of the top-4 icons) in 10 groups with anchor chips. The niche page (680
column) has a keyword H1 (`Heading`, Georgia 30 → 40), a Top-5 card, visible sort chips, the top 3
as leader cards in research-card chrome (radius 28, shadow, 0.7 stroke) with a screenshot stage,
then flat `.ia-card--utility` rows with rank, icon, score meter, 3 screenshots and every text; the
method is a visible section, not a sheet. The app page (`ia-page--stack-24`) has an icon hero, a
facts strip and a gallery with a `<dialog>` viewer. All editorial text is in the server HTML (CSS
line-clamp only; nothing indexable is `hidden` or collapsed). Colour stays monochrome: the accent
marks only the leader rank badge, the inset bar, selected chips, links and focus; score meters are
ink on `--ia-soft`; ★ is a text glyph; no status colours and no new tokens. Each card's title link
stretches over the card (one tab stop per row; shot strips are sibling links above it). Nothing
under `/rating/**` reads the viewer: no lock card, Plus UI or price.

Tab catalogs (research, Pulse, ideas; not the web-only sections): 1 column < 760px, 2 columns ≥ 760px,
3 columns ≥ 1280px (max 1200px). Articles: 640px reading column; TOC as a sheet on mobile and a
sticky sidebar ≥ 1200px. Default theme light. Icons: `lucide-react`. Fonts: Georgia stack for
reading (fallback `"PT Serif", "Noto Serif", serif`; Japanese `"Hiragino Mincho ProN", "Yu Mincho",
serif`), system sans for UI, Onest (self-hosted from the app bundle) for landing/paywall headlines.
Promote the App Store everywhere (DECISIONS §12–13).

## 8. Verification gates (every agent, before reporting done)

- `npx tsc --noEmit` passes for the whole repo; `npx eslint <your files>` clean.
- When strings, client keys or generated content change: `node docs/site-v2/review/check-ui-keys.mjs`
  (0 missing, 0 not in their provider), `node docs/site-v2/review/lint-web-strings.mjs` (no new hits),
  `node --import tsx scripts/v2/check-content.ts` (includes content/v2/<L>/rating).
- When rating data or its pure helpers change: `node --import tsx scripts/v2/test-rating.ts` (short
  names, text points, niche groups, CDN URLs, SEO head terms, topic names, the reader, titles,
  descriptions, indexable tasks and their hreflang, JSON-LD rules, the rating sitemaps and IndexNow;
  CI runs it after check-content).
- Only the integrator runs `next build`. Never start your own `next dev`: two dev servers in one
  project directory collide. When a prompt says a shared dev server is running, use it (curl /
  the browser) — it hot-reloads your edits.
