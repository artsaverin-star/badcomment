# Site v2 — architecture (binding)

Read order for implementers: `DECISIONS.md` (owner decisions, wins over everything) → this file →
the specs in `spec/` (01–08, then the errata/answers in `09-critic-gaps.md`). Where a spec's URL
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
| `/<L>/saved` (`?filter=&q=`) | NEW (tab «Сохранённое») | |
| `/<L>/settings`, `/<L>/settings/about` | NEW | |
| `/<L>/plus` | NEW paywall page | |
| `/<L>/welcome` | NEW onboarding replay | |
| `/<L>/login` | NEW sign-in page (the dialog is also openable anywhere) | `?app=1`: the iOS app's sign-in sheet (APP-ACCOUNTS.md) — no chrome, always continues to `/<L>/app-auth` |
| `/<L>/app-auth` (`?from=email`) | NEW iOS app hand-off: one-time code → 307 `inapp://auth?code=…` (`?from=email`: a screen that opens the app) | noindex (`X-Robots-Tag`), never cached |
| `/<L>/library` (`?checkout=`) | NEW payment-return page (YooKassa return URL is `/library?checkout=`) | |
| `/<L>/contacts`, `/<L>/offer`, `/<L>/privacy` | NEW | `/en/contacts` = App Store support URL; the shipped app links `/{ru,en}/offer` and `/{ru,en}/contacts` |
| `/<L>/old` and `/<L>/old/<rest>` | OLD (internal `/<rest>`) | L ∉ ru/en → 307 `/en/old/<rest>`; response header `X-Robots-Tag: noindex, follow` |
| `/old[/<rest>]`, `/old/<ru|en>/<rest>` | proxy 307 → `/<ru|en>/old/<rest>` | convenience |
| `/<L>/<anything else>` | OLD in place (internal `/<rest>`): per-app pages `/<L>/<app-slug>`, `/reviews/**`, `/rating/**`, `/mcp/**`, `/tokens`, `/build/**`, `/cards`, `/catalog`, `/categories`, `/best/**`, `/apps`, `/most-wanted`, `/premium`, `/admin`, … | L ∉ ru/en → 307 `/en/<rest>` |
| `/<bare path>` (no locale) | proxy 307 → `/<negotiated>/<path>` (then re-evaluated) | |
| `/api/**`, `/_next/**`, files with an extension, `/icon`, `/apple-icon`, `/opengraph-image`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms*.txt`, `/.well-known/**` | untouched (proxy matcher excludes them) | |

`NEW_TOP` (first segment after the locale owned by the new site): `"" | segment* | research | search
| ideas* | saved | settings | plus | welcome | login | library | contacts | offer | privacy | site | app-auth`
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
src/app/api/site/**                  # NEW APIs for the new site (saved/notes sync, search, …)
src/app/{sitemap.ts,robots.ts,icon.tsx,apple-icon.tsx,opengraph-image.tsx,feed.xml,llms*.txt}
                                     # stay at the root (shared)
src/site/                            # ALL new-site code; never import src/components/** here
  config.ts                          # APP_STORE_APP_ID, APP_STORE_URL ("" while in review), SITE_URL, …
  routing.ts                         # href helpers: href(L, "segment", slug) etc. — public URLs only
  access.ts                          # getViewer(): {loggedIn, plus, user, canReadResearch, canReadIdea}
  i18n/                              # locale list, negotiation, t(), plurals, ui.json loader
  styles/                            # tokens.css (--ia-*), site.css (Tailwind v4 entry + @theme bridge)
  ui/                                # primitives: Button, Card, Heading, Search, Badge, Sheet/Dialog,
                                     #   Icons (lucide-react), Toolbar pills, AppStoreBadge + popup, …
  shell/                             # TopNav (desktop), FloatingTabBar (mobile), Footer, OpenInApp banner
  content/                           # server-only loaders for content/v2 (+ types)
  sitedata/                          # server-only adapters to OLD site data (apps, icons, ratings,
                                     #   market players) — read-only reuse of src/lib/** loaders
  features/<feature>/                # research, ideas, library (saved+notes+export), settings, plus,
                                     #   auth, landing, welcome, legal — each feature owns its folder,
                                     #   including its own web-only strings file (see §6)
content/v2/<L>/...                   # generated app content (spec 04 §7.2/§7.3), read with fs at runtime
public/media/{ideas,research,welcome}/*.webp   # generated from the app asset catalog (spec 04 §6)
scripts/v2/                          # import-app-content.ts, export-images.*, checks
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
   (old-only route) and `/<L>/old/…` when the new site owns the public URL (AUDIT-PHASE-A A4). Originally: a helper `src/lib/oldHref.ts`
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
   `/ru/old`).

## 6. i18n

- App UI strings: `content/v2/<L>/ui.json` (keys = the Russian source string, spec 04 §7.3). `t(ru)`
  returns the translation for the locale; fallback own → base → en; ru = identity.
- Web-only strings (landing, sign-in, payments, App Store popup, web wording deltas from spec 09
  G11): each feature keeps `src/site/features/<f>/strings.ts` exporting
  `{ ru: {...}, en: {...}, de: {...}, fr: {...}, ja: {...} }` keyed by stable ids. All 5 locales
  must be filled (write ru/en yourself; translate de/fr/ja carefully, informal «ты»-equivalent tone
  like the app: du / tu / casual Japanese as the app's ui.<L>.json does).

## 7. Design

Spec 05 is the source (tokens §6 with `--ia-*` names; components §3.6; motion §5). Defaults
chosen for the web (the app is iPhone-only): mobile < 1024px uses the floating capsule tab bar
at the bottom on tab roots and «Назад» pills on inner pages; ≥ 1024px uses a sticky top bar
(logo, 3 tabs, App Store badge, account). Catalogs: 1 column < 760px, 2 columns ≥ 760px,
3 columns ≥ 1280px (max 1200px). Articles: 640px reading column; TOC as a sheet on mobile and a
sticky sidebar ≥ 1200px. Default theme light. Icons: `lucide-react`. Fonts: Georgia stack for
reading (fallback `"PT Serif", "Noto Serif", serif`; Japanese `"Hiragino Mincho ProN", "Yu Mincho",
serif`), system sans for UI, Onest (self-hosted from the app bundle) for landing/paywall headlines.
Promote the App Store everywhere (DECISIONS §12–13).

## 8. Verification gates (every agent, before reporting done)

- `npx tsc --noEmit` passes for the whole repo; `npx eslint <your files>` clean.
- Only the integrator runs `next build`. Never start your own `next dev`: two dev servers in one
  project directory collide. When a prompt says a shared dev server is running, use it (curl /
  the browser) — it hot-reloads your edits.
