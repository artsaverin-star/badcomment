# 09 — Completeness critic: contradictions, gaps, answered questions, owner questions

Status: addendum to specs 01–08, written 2026-09-22. Read-only research; no other file was changed.
Implementers read 01 → 09 in order. **Where this file contradicts 01–08, this file wins.** Every override cites the code that decides it.

Path abbreviations:

| Abbrev. | Absolute path |
|---|---|
| `APP/` | `/Users/artsaverin/projects/app_04_inapp/Inapp/` (live iOS app; UI = `APP/Clarity/*`) |
| `REL/` | `/Users/artsaverin/projects/app_04_inapp/AppStore/Release-2026-09-21/` |
| `PBX` | `/Users/artsaverin/projects/app_04_inapp/Inapp.xcodeproj/project.pbxproj` |
| `SITE/` | `/Users/artsaverin/projects/badcomment-v2/` (current site, branch `site-v2`) |

Status labels used in §5: **ANSWERED** = decided by app code or shipped data. **DEFAULT** = an engineering/design default set here; the architect may override it without the owner. **OWNER** = needs the product owner (§6).

---

## 0. TL;DR

1. **The iOS app has never been publicly released.** Version 1.0 build 3 is the first App Store version (WAITING_FOR_REVIEW), and `asc-versions.json` has one version (`REL/README.md:3-6`, `REL/asc-versions.json`). No public user has "legacy" saved data, and there are no public "earlier lifetime buyers". The legacy Saved sections, compare, projects and import can all be dropped (§1 C12–C13).
2. **The release binary links to exactly two inapp.pro paths:** `/{ru|en}/offer` and `/{ru|en}/contacts` (`APP/Strings/Strings.swift:270-273`, used at `APP/Clarity/ClaritySettings.swift:57,71` and `APP/Studio/StudioPrivacy.swift:26`). The `/ru/reviews`, `/ru/rating`, `/ru/segment`, `/idea-covers`, `/persona-covers` and `/build/*.webp` references are in dormant or DEBUG-only code, so 06 §0.8, §9.1 and §9.2 overstate them (C5). Keep `offer` and `contacts` at the site root, owned by the new site (C7).
3. **Research quotes:** 792 are visible per locale, with 0 duplicates. The "758" in 01 is a documentation number, not what the reader shows (C1).
4. **Settings «Конфиденциальность» opens an in-app sheet** (`StudioPrivacyView`), not the github.io URL. That sheet also uses the `ClarityResearch` illustration, which 04 and 08 call unused (C3, C4).
5. **The app is iPhone-only and portrait-only** (`PBX:345,356`). Nothing in the app defines a wide layout, so every desktop layout is new design (G1).
6. **Old site URL shape:** `/old/<ru|en>/<path>` (07), with two root layouts via route groups. The analytics snippet moves into a shared component, and the CI test changes in the same PR (C6, C8).
7. **One canonical route map** replaces the three that 01, 03 and 08 each proposed (§2.1). Don't use `/notes` as a route: it is an existing old-site app slug.
8. **New storage keys and cookies are namespaced:** `ia_theme` instead of the old `theme`, and `ia2:*` in localStorage (§2.5).
9. §5 covers all 77 open questions from specs 01–08, merged into 47 rows: each is answered by the code or given a default. Nine questions genuinely need the owner (§6 O1–O9), and there are two urgent pre-launch risks the owner should act on now (§6 O10).

---

## 1. Contradictions between specs, resolved against the code

| # | Topic | Conflicting statements | Code evidence | Binding resolution |
|---|---|---|---|---|
| C1 | Visible research quotes | 01 §0, §6.5, §6.13 and its summary: "792 refs → **758** visible after article-level de-duplication". 04 §3.5 and §9 #3: **792**, 0 duplicates | Dedupe key = `(app, quote)`, within the observation (`APP/Content/ResearchEditorial.swift:48-51`) and across the article (`APP/Clarity/ClarityResearchFlow.swift:72-78`). Recomputed over the shipped packs for ru/en/de/fr/ja: 792 refs, 0 unresolved, 0 within-observation duplicates, 0 cross-observation duplicates. `Documentation/Localization/README.md:116` says "792 … (после дедупликации внутри темы — 758)". 758 + 294 idea quotes = its 1 052 total, so 758 is research quotes that are not also idea quotes, not what a reader sees | **792 quote blocks per locale.** The build validator should assert 792 and 0 duplicates. |
| C2 | Onboarding exit goals | 04 §5.1: "`sample` and `research` open research(interior-design)". 01 §1.1: `sample` / `catalog` / `replay-close` | The root accepts `"sample", "research"` (`APP/Clarity/ClarityRoot.swift:49`), but onboarding only ever emits `sample`, `catalog` and `replay-close` (`APP/Clarity/ClarityOnboarding.swift:31,124,147`) | Implement three exits on the web: `sample`, `catalog`, `replay-close`. The `research` alias is dead. |
| C3 | Where «Конфиденциальность» leads | 02 §8.8: in-app privacy sheet. 04 §5.9 and 08 S13 list `https://artsaverin-star.github.io/legal/inapp/privacy.html` as the app's privacy link | Settings → `modal = .privacy` → `StudioPrivacyView()` (`APP/Clarity/ClaritySettings.swift:68,87`). The paywall «Приватность» opens the same sheet (`APP/Clarity/ClarityPaywall.swift:76,296`). `Links.privacy` (`APP/Strings/Strings.swift:275`) is defined but not referenced by any Clarity or reachable Studio view. It is the App Store listing's privacy URL; its source is `REL/legal/privacy.html`, a 5-language HTML page | In-app privacy = a sheet with iOS-specific text. **Web: a new page `/<loc>/privacy` with web-specific text** (owner, O6). The landing footer may additionally link the github.io policy as "iOS app privacy policy". |
| C4 | Asset `ClarityResearch` (`illustration-v1.png`) | 04 §6.1: "Clarity/Studio art … No (… `ClarityArt` is drawn in code)". 08 §6: "only `ClarityArt(role: .research)` loading placeholder uses one" | `ClarityArt` is vector (rounded rectangles and SF symbols; `APP/Clarity/ClarityStyle.swift:27-88`). The privacy sheet draws `StudioObject(art: .note, size: 105)` (`APP/Studio/StudioPrivacy.swift:13`), and `StudioArt.note` → asset `"ClarityResearch"` (`APP/Studio/StudioArtwork.swift:5-14`), 1254×1254 RGBA PNG | `ClarityResearch` **is used**, by the privacy sheet hero. Used raster total = 511 (04 said 510). The loading/error `ClarityArt` must be built in CSS/SVG, not from this PNG. |
| C5 | Which iOS → site links are live | 06 §0.8, §9.1, §9.2: `/ru/reviews/<cat>/<id>`, `/ru/rating/<cat>`, `/ru/segment/<slug>` are "live iOS app" links. `/persona-covers`, `/idea-covers` and `/build/*.webp` are used by the iOS app. 01, 02 and 04: dormant | `/ru/reviews` and `/ru/rating` exist only in `ClarityCompareView` (`APP/Clarity/ClarityCompareView.swift:136,140`), which is never instantiated (02 §4.1). `/ru/segment` appears only in Studio screens that Clarity never reaches (`APP/Studio/StudioDetails.swift:50,337`, `APP/Studio/StudioResearchReader.swift:302`). `/idea-covers` and `/build` appear only in `APP/Views/OpportunityViews.swift:73,154,414`, and remote images only in `APP/Views/*` and `APP/DesignSystem/EditorialTheme.swift:84-152`. Both are reachable only through the DEBUG-only `DebugScreenHost` (`APP/App/RootView.swift:35-86`) | **Hard constraint: only `/{ru,en}/offer` and `/{ru,en}/contacts`.** The others must keep resolving for search engines and old bookmarks through the `/old` redirects (07), but they are not parity constraints. `public/idea-covers`, `public/persona-covers` and `public/build` can stay where they are, which is harmless. |
| C6 | Old site URL shape | 06 §9.3: `/<locale>/old/<path>` ("proxy-native"). 07: `/old/<ru\|en>/<path>` | The owner's request says "по ссылке /old будет https://inapp.pro/ru", i.e. today's `/ru/...` becomes `/old/ru/...` | **`/old/<ru\|en>/<path>`** with the proxy design of 07 §4. Drop the 06 alternative. |
| C7 | `contacts` and `offer` | 07 §3 and §4.1 put `contacts` and `offer` in `OLD_TOP` (307 → `/old`). 02 §0.13, 06 §9.2 and 08 §0.7 keep them at the root | The shipped binary opens `https://inapp.pro/{ru\|en}/offer` and `/contacts` (`APP/Strings/Strings.swift:270-273`). The App Store support URL is `/<ru\|en>/contacts` (08 §2, `REL/metadata`) | **The new site owns `/<loc>/contacts` and `/<loc>/offer`** (in `NEW_TOP`). Never redirect them into the noindexed archive. Their content is O6. The old site's own «Оферта» and «Контакты» links can point to the new pages. |
| C8 | Root layout | 06 §2.4: keep `SITE/src/app/layout.tsx` because `SITE/scripts/test-monetization.ts:29-34` reads it. 07 §9 option A: move the old tree including `layout.tsx` into `(old)` with two root layouts | A single shared root layout leaks the old `globals.css`, `@saverin/tokens/css` and `<html data-theme>` into the new site. The old theme logic defaults to **dark** (`SITE/src/app/layout.tsx:52`); the new site defaults to light (`APP/Clarity/ClarityRoot.swift:31`). Separate root layouts force a full reload between the old and new sites, so CSS cannot persist across them | **Option A (07).** Move the YM/GA shims and loaders into a shared server component, e.g. `SITE/src/components/Analytics.tsx`, rendered by both root layouts. In the same PR, change `scripts/test-monetization.ts` to read that file instead of `src/app/layout.tsx`, keeping every assertion. |
| C9 | Theme persistence | 05 §4: persist the theme in a cookie. 06 §3.4: cookie `theme` = light/dark. 07 §8: they conflict | Old: `theme` cookie, anything but `light` renders dark (`SITE/src/app/layout.tsx:52`). New: `light\|dark\|system`, default `light` (`APP/Clarity/ClaritySettings.swift:16`) | New cookie **`ia_theme`** (`light\|dark\|system`, default `light`, 1 year, path `/`). The new site never reads or writes `theme`. |
| C10 | URL scheme of the new site | 01 §2: `/research`, `/ideas`, `/saved`, no locale. 03 §1.1 and §2.1: `/app/research…`, `/app/plus`. 08 §2: `/<loc>/research…` | The app has no deep links (01 §2.1). Locale must be in the URL (5 locales, `APP/Resources/locales.json`) | **§2.1 is the only route map.** |
| C11 | Onboarding on the web | 03 §1.1: show the flow the first time someone enters the app area. 08 §4: the landing replaces the pre-paywall story | App: onboarding blocks the whole app on every cold start until finished (`APP/Clarity/ClarityRoot.swift:32,45`) | Default in §2.6 (no forced interstitial; replay route). Owner confirms (O4). |
| C12 | Saved data models | 06 §6.3 proposes `SavedItem` kinds `research\|problem\|app\|card`, plus `Project`, `CompareItem` and `UserPrefs`. 02 §6: Clarity can create only research and idea bookmarks and notes | Clarity creates only `shelf.saved` (ideas), `notebook.saved` of kind `research`, and notes (`APP/Clarity/ClarityReader.swift:796-812,898-948`). Problems, apps, cards, projects and comparisons come only from pre-Clarity builds, and **no public build before 1.0 exists** (`REL/README.md:3-6`) | Keep **`Favorite` (ideas) + `SavedItem(kind="research")` + `Note(kind ∈ idea\|research)`** only. Drop `Project`, `CompareItem`, `UserPrefs`, and the kinds problem/app/card. Keep `kind` as a string for forward compatibility. |
| C13 | "Earlier lifetime buyers" | 03 §3.6: the pre-subscription app sold lifetime, so those buyers keep permanent Plus | The first App Store version is 1.0 (`REL/asc-versions.json`: one entry, 1.0). Build 2 was TestFlight only (`REL/README.md:4`) | Only TestFlight/sandbox testers can hold the old product. **This has no effect on the web.** |
| C14 | `/mcp`, `/admin`, `/tokens` | 06 §9.3: keep them in place. 07 §3: move them to `/old` | The app has no MCP, admin or pricing page (grep: no hits in `APP/Clarity`) | **07.** Move them to `/old/<loc>/…` and apply 07 §5.10 (OAuth bridge redirect, MCP tool texts) and §5.11 (CI smoke URLs). The MCP API (`/api/mcp`, `/.well-known/*`) does not move. |
| C15 | Mapping old category URLs to new pages | 07 §7.4: "All 72 old category slugs exist in the app bundle" | Only the 35 `LaunchEdition` slugs are ever listed or exposed (`APP/Content/LaunchEdition.swift:6-18`; catalog filter `APP/Clarity/ClarityCatalogs.swift:25`; ideas filter `:170`). The other 37 exist only in the ru packs, for legacy saved items | If O5 chooses the mapping, it applies to **35 slugs only**. The remaining 37 `/segment/*` and `/rating/*` go to `/old`. |
| C16 | Old `/ideas/<id>` URLs | 07 §4.4: "259 old idea slugs are not in the app bundle (851 − 592)" | The new site exposes 293 ideas. Of the old site's 851 idea slugs (`SITE/src/data/ideas.json`), exactly 293 are the launch ideas, and **the other 558 all belong to non-launch categories** (74 categories; recomputed) | `/<loc>/ideas/<slug>`: if the slug is one of the 293 → new page; otherwise **308 → `/old/<ru\|en>/ideas/<slug>`**, which already 308s to `/old/…/segment/<cat>` (`SITE/src/app/ideas/[slug]/page.tsx:13`). |
| C17 | How an idea opens | 01 §5.9 and 05 §3.6 D: a modal over the list and a page on direct URL. 02 §3.1: Saved rows *push* the idea | Cards open a sheet (`APP/Clarity/ClarityIdeaCard.swift:74-90`). Saved rows push a page in the Saved stack (`APP/Clarity/ClarityMy.swift:152`) | Web: a **modal (intercepting route) when opened from a card** in either catalog or inside a research article; a **full page** from Saved, from a direct URL, or after reload. |
| C18 | Note-editor title for ideas | 02 §5.2 and §11 #6: `idea.text.title` | `idea?.studioTitle` (`APP/Clarity/ClarityReader.swift:581`), and `studioTitle == text.title` (`APP/Studio/StudioStyle.swift:264-267`). Card title = article title for 293/293 in ru and en; `text.title` differs for 292/293 (recomputed) | **Web uses the card title.** It is display-only and nothing is persisted, so this is a safe bug fix. |
| C19 | Default locale | 04 Q1: maybe `ru` is the site default "as the current site does" | The current proxy chooses the `locale` cookie, then `Accept-Language` starting with `ru`, else **`en`** (`SITE/src/proxy.ts:14-19`). The app default is `en` (`APP/Resources/locales.json`) | No conflict: **default `en`**, negotiated per §2.2. |
| C20 | Quote-language claim in the landing FAQ | 08 S11 #2: "Quotes are shown in their original English" | `facts.json` has 2 Russian-original quotes. In `rich.en`, 5 Russian originals are rendered as English in `quote` (04 §2.2, §2.4) | Reword to «Большинство цитат — из англоязычных отзывов; на других языках показан перевод.» / "Most quotes come from English-language reviews; other languages show a translation." |
| C21 | Serif fallback | 05 §2.1: Georgia → Gelasio → PT Serif | Gelasio's Cyrillic coverage is unverified (05 says so itself) | **Default stack `Georgia, "PT Serif", serif`, with PT Serif self-hosted (OFL, Latin + Cyrillic).** Add Gelasio only after a glyph check. |

---

## 2. Binding cross-spec decisions (derived from §1)

### 2.1 Route map of the new site (replaces the proposals in 01 §2, 03 §1.1/§2.1, 08 §2)

Public URLs are locale-prefixed with `<loc>` ∈ `ru|en|de|fr|ja`. Internally they live under `src/app/(new)/v2/[locale]/…`, as in 07 §9 and §4; the proxy rewrites to them.

| Public URL | App equivalent (code) | Presentation | Render | Index |
|---|---|---|---|---|
| `/<loc>` | none (landing, 08) | page | static per locale | index |
| `/<loc>/research` (`?q=`) | tab 0 root `ClarityResearchCatalogView` (`APP/Clarity/ClarityRoot.swift:58-61`) | page, tab bar visible | dynamic (lock icons depend on access) | index |
| `/<loc>/research/<slug>` | `.research(slug)` → gate → article (`APP/Clarity/ClarityReader.swift:87-97`) | page | free slug: static; others: dynamic (full article or locked preview) | free: index. Locked preview: index by default (public name, summary and cover; §5 #13) |
| `/<loc>/ideas` (`?q=&category=`) | tab 1 root (`APP/Clarity/ClarityCatalogs.swift:159-230`) | page, tab bar visible | dynamic | index |
| `/<loc>/ideas/<slug>` | `ClarityIdeaView` (`APP/Clarity/ClarityReader.swift:460-473`) | modal when intercepted from a card; page otherwise (C17) | dynamic | free ideas: index. Locked ideas: `noindex` (no public title exists) |
| `/<loc>/saved` (`?filter=all\|research\|ideas\|notes&q=`) | tab 2 root `ClarityMyView` | page, tab bar visible | dynamic, client data | noindex |
| `/<loc>/settings` | Settings sheet (`APP/Clarity/ClarityMy.swift:81,92`) | modal over `/saved` from the gear; page on direct load | dynamic | noindex |
| `/<loc>/settings/about` | «О материалах» push (`APP/Clarity/ClaritySettings.swift:47-49,295-307`) | page inside the settings modal or standalone | static | noindex |
| `/<loc>/privacy` | `StudioPrivacyView` sheet (C3) | page | static | index |
| `/<loc>/plus` (`?source=`) | `ClarityPaywallView` sheet (03 §2.1) | modal when navigated; page on direct | dynamic | noindex |
| `/<loc>/welcome` | `ClarityOnboardingView` (replay) (§2.6) | full-screen page | static | noindex |
| `/<loc>/contacts`, `/<loc>/offer` | `Links.contact`, `Links.terms` | page | static | index |
| `/<loc>/library?checkout=<uuid>` | none (payment return, 06 §4.2) | page | dynamic | noindex. Only needed if the web sells (O1) |
| `/<loc>/search?q=` | none | 308 → `/<loc>/research?q=` | — | — (old JSON-LD `SearchAction` target, 07 §4.4) |

The following are client modals with no route of their own. Each one pushes a history entry so that the browser Back button closes the top modal:
- table of contents (01 §5.5)
- note editor (01 §5.7, 02 §5.2)
- export sheet (02 §7.2)
- category picker (02 §2.5)
- paywall opened from a locked card (03 §2.1)

### 2.2 Locale negotiation (web port of `AppLocale.restore`, `APP/Content/AppLocale.swift:109-128`)

1. An explicit locale in the URL always wins; never auto-redirect it (08 §2).
2. For bare paths, try the `locale` cookie if it is one of the 5.
3. Otherwise walk `Accept-Language` in q-order. For each tag: an exact match among the 5; then the base language (`de-CH` → `de`); then any available locale that starts with `base-`.
4. Otherwise use `en`.

The picker order in Settings is Русский, English, Deutsch, Français, 日本語. Names are not translated (`APP/Content/AppLocale.swift:36-46,76-88`).

The `locale` cookie is shared with `/old`. The old code maps any non-`en` value to Russian (07 §8), and `/old` never writes the cookie (07 §4.2).

### 2.3 Top-level segment ownership

- `NEW_TOP = {"", research, ideas, saved, settings, privacy, plus, welcome, contacts, offer, library, search}`.
- `OLD_TOP` = the 07 §4.1 list **minus** `contacts` and `offer`, i.e. `admin, apps, best, build, cards, catalog, categories, exp, mcp, most-wanted, premium, rating, reviews, segment, test, tokens`, plus the 1,516 keys of `SITE/src/data/app-slugs.json`.
- **Reserved, never use as a new top-level segment:** `notes`. It is an old app-landing slug (`SITE/src/data/app-slugs.json:642` `"notes": "ext-1110145109"`). Saved notes are `/<loc>/saved?filter=notes`. None of the other proposed names (`research, ideas, saved, settings, plus, welcome, privacy, library, search, contacts, offer`) collide with an app slug (checked).
- Special cases from 07 §4.2 remain: `/ideas/top` → old; `/library?checkout=` → old until the new `/library` confirms payments.
- Plus C16: `/<loc>/ideas/<non-launch-slug>` → 308 `/old/<ru|en>/ideas/<slug>`.
- `/<loc>/research/<non-launch-slug>` → 308 `/old/<ru|en>/segment/<slug>` if that slug is one of the old site's 72 active categories (`SITE/src/data/active-categories.json`), else a 404 (§4 G8).

### 2.4 Layout and chrome

- Two root layouts: `src/app/(old)/layout.tsx` (today's layout) and `src/app/(new)/layout.tsx` (C8). `api/`, `sitemap.ts`, `robots.ts`, `feed.xml`, `llms*.txt` stay at `src/app/` (07 §9).
- New root: `<html lang={locale} data-theme={ia_theme ?? "light"}>`, `color-scheme`, and the `--ia-*` tokens from 05 §6. No `globals.css` and no `@saverin/tokens/css`.
- Analytics: the same YM counter `110047715`, GA `G-G3J6K8VBD6` and DataFast id, through the shared `Analytics` component. Add a `site: "v2"` parameter to every event so dashboards can split old and new (§5 #40).

### 2.5 Cookies and browser storage for the new site

| Name | Kind | Values / shape | Mirrors app key |
|---|---|---|---|
| `locale` | cookie, 1 y (shared) | `ru\|en\|de\|fr\|ja` | `content.locale` |
| `ia_theme` | cookie, 1 y | `light` (default) `\|dark\|system` | `studio.appearance` (`APP/Clarity/ClarityRoot.swift:31`) |
| `ia2:saved.ideas` | localStorage | `string[]` of idea slugs, newest first (insert at 0) | `shelf.saved` (`APP/Store/Shelf.swift:46-54`) |
| `ia2:saved.research` | localStorage | `string[]` of category slugs, newest first | `inapp.studio.notebook.v1.saved` of kind research (`APP/Studio/StudioNotebook.swift:90-96`) |
| `ia2:notes` | localStorage | `Record<"idea:<slug>"\|"research:<slug>", string>`. An empty or whitespace note deletes the key | `…notebook.v1.notes` |
| `ia2:welcome` | localStorage | `{completed: boolean}` | `studio.preferences.v1.completed` |
| `ia2:tabs` | sessionStorage | `{research?: string, ideas?: string, saved?: string}` = last URL per tab | per-tab `NavigationStack` paths (`APP/Clarity/ClarityRoot.swift:25`) |

- Never read the old keys `favIdeas`, `favMigrated`, `feed:saved` or `inapp_*` (07 §8).
- If O3 = account sync, the server tables are C12's `Favorite`, `SavedItem(kind="research")` and `Note`.
- On sign-in, merge localStorage into the account once, like the old `favMigrated` pattern (06 §6.1).
- Favorites the user already has from the old site may hold any of 851 old slugs. The new Saved screen renders only the 293 launch slugs (§4 G12).

### 2.6 Front door and onboarding (default until O4 is answered)

| Situation | Default behaviour | Why |
|---|---|---|
| Anonymous visitor at `/<loc>` | The landing (08) | The user's request; crawlers need the landing |
| Signed-in visitor (valid `ia_session`) at `/<loc>` | 307 → `/<loc>/research` | 08 §2; common practice |
| Anonymous visitor who opens any app URL (e.g. from search, the landing or a shared link) | Show the page directly. **No forced onboarding interstitial** | A forced interstitial would hide the content search engines ranked and the link promised. The landing plays the role of onboarding pages 1–4 (08 §4) |
| «Знакомство с приложением» in Settings (`APP/Clarity/ClaritySettings.swift:51-55`) | Navigate to `/<loc>/welcome`: the 4 story pages + paywall page 5 in replay mode («Закрыть» instead of «Пропустить»). Every exit returns to the previous URL (`replay-close`, `APP/Clarity/ClarityOnboarding.swift:123-124,147`) | The replay reuses the landing's preview components (03 §1.4–1.8), so it costs little extra |
| Paywall moments | Exactly the app's: a locked idea card, «Открыть все материалы» on a locked preview, the Settings Plus card (03 §2.1) | Parity |

### 2.7 Access rule on the web

- `isPlus(access) := access.unlimited`, i.e. admin, `User.lifetime`, a friend, or `premiumUntil > now`. The `as_buyer` preview cookie is honoured (`SITE/src/lib/access.ts:29-34`; 06 §5.2).
- Free layer = the app's rule (`APP/Clarity/ClarityContentAccess.swift:5-19`).
- The existing web lifetime buyers keep full access. The offer they accepted promises «бессрочный доступ ко всем материалам сервиса» that «действует бессрочно» (`SITE/src/app/offer/page.tsx:38,46`).
- Per-item `Unlock` rows (a 290 ₽ deck or category) are O2.

---

## 3. Coverage matrix: every live source file vs. specs 01–08

"Reachable" means reachable in a Release build from `APP/App/RootView.swift → ClarityRootView`.

### 3.1 `APP/Clarity/` (29 files, 5,263 lines)

| File | Reachable? | Covered by | Gap filled here |
|---|---|---|---|
| `ClarityRoot.swift` | yes | 01 §1–2; 03 §1.1 | language switch keeps state (G3); `research` alias (C2) |
| `ClarityFloatingTabBar.swift` | yes | 01 §1.2; 05 §3.6 I | — |
| `ClarityBackNavigation.swift` | yes | 01 §1.3; 05 §3.6 J | a nested sheet has no close button after a push (G6) |
| `ClarityCatalogs.swift` | yes | 01 §3–4; 02 §2; 04 §3.3–3.4 | category picker details (G5) |
| `ClarityIdeaCard.swift` | yes | 01 §5.9; 02 §2.6–2.7; 05 §3.6 D | sheet-over-sheet stacking (G6) |
| `ClarityIdeaCardArt.swift` | yes | 02 §2.6; 04 §6.2 | — |
| `ClarityReader.swift` | yes (legacy chapter reader, finding/audience sheets, problem view: unreachable) | 01 §5–6, §10; 02 §3, §5, §7 | the free-sample push inside sheets (G7) |
| `ClarityResearchFlow.swift` | yes | 01 §6.3–6.5; 04 §3.5 | the 792 count (C1) |
| `ClarityResearchArtwork.swift` | yes | 01 §6.9; 04 §6.2 | — |
| `ClarityContentAccess.swift` | yes | 01 §5.1, §8; 02 §3.2; 03 §3 | G7 |
| `ClarityExportDocument.swift` | yes | 02 §7; 01 §6.12 | — |
| `ClarityMy.swift` | yes (legacy sections need legacy data) | 02 §6 | unknown-slug rows (G12) |
| `ClaritySettings.swift` | yes | 02 §8 | privacy target (C3); language switch (G3) |
| `ClarityDeveloperSettings.swift` | DEBUG only | 02 §8.10 | — |
| `ClarityPaywall.swift` | yes | 03 §2 | — |
| `ClarityOnboarding.swift` | yes | 03 §1 | web placement (§2.6) |
| `ClarityWelcomeComponents.swift`, `…Typography.swift`, `…Illustration.swift`, `…Carousel.swift`, `…ContentPreview.swift`, `…Examples.swift` | yes | 03 §1.2–1.8; 05 §2.2, §5; 08 §4 | — |
| `ClarityStyle.swift`, `ClarityReadingStyle.swift` | yes | 05 §1–3 | the `ClarityArt` vector is not an asset (C4) |
| `ClarityAppShelf.swift`, `ClarityLegacyCard.swift` | only with legacy data (none in public, C12) | 01 §10; 02 §6.9 | drop |
| `ClarityRatings.swift`, `ClarityCompareView.swift` | no (never instantiated; `.ratings` and `.scenario` redirect) | 01 §2.4; 02 §4 | drop |
| `ClarityHome.swift` | no (compatibility wrapper, `APP/Clarity/ClarityHome.swift:3-9`) | 01 §2.5 | drop |

### 3.2 Other reachable code

| File(s) | Covered by | Gap |
|---|---|---|
| `APP/App/InappApp.swift`: content loads first, then `purchases.start()` (`:30-44`); `PurchaseMetrics.start()` (`:17`) | 03 §2.1, §4.1 | — |
| `APP/App/RootView.swift`: Release → `ClarityRootView`; DEBUG `DebugScreenHost` and `LegacyRootView` | 01 §2.3; 05 §7 | C5 (legacy remote images are DEBUG-only) |
| `APP/Content/AppLocale.swift`, `Library.swift`, `LaunchEdition.swift`, `ResearchEditorial.swift`, `IdeaArticles.swift`, `EditorialContent.swift`, `QuoteReading.swift` | 04 §2–5; 01 §6 | G3 (reload keeps the UI) |
| `APP/Store/Purchases.swift`, `PurchaseAccess.swift`, `PurchaseMetrics.swift` | 03 §2–4 | — |
| `APP/Store/Shelf.swift` | 02 §5.4 | — |
| `APP/Strings/Strings.swift`: `Links` (`:268-276`), `purchaseUnverified` and `restoreNothing`; the other `t()` strings belong to legacy views | 02 §8.9; 04 §5.9 | C3 |
| `APP/Strings/UIStrings.swift` | 01 conventions; 04 §4.4 | — |
| `APP/Models/Idea.swift`, `ResearchDossier.swift`, `ResearchProduct.swift` | 04 §2 | — |
| `APP/Studio/StudioPrivacy.swift` (sheet), `StudioArtwork.swift` (`StudioArt`, `StudioObject`) | 02 §8.8 (text only) | full visual spec (G4) |
| `APP/Studio/StudioNotebook.swift`, `StudioPreferences.swift`, `StudioDomain.swift` (`matches`, workspace), `StudioEditorial.swift`, `StudioStyle.swift`, `StudioRuntime.swift` | 02 §5; 03 §1.1; 01 §4.2; 04 §2.12; 05 | — |
| `APP/Studio/StudioSources.swift` (`StudioSourceButton`) | used only by the dormant compare view | drop |
| `APP/Decks/DeckContent.swift` (`DeckEditorial.date`, «Сборник от»; `DeckShelf`, legacy) | 02 §8.7 | — |
| Build settings (`PBX`) | **none** | G1 |
| Release state (`REL/README.md`, `REL/asc-versions.json`) | 03 §2.6 and 08 §0 cover review status only | G2 |

---

## 4. Gaps filled (no spec covered these)

### G1. Platform envelope: iPhone only, portrait only

- `TARGETED_DEVICE_FAMILY = 1` (iPhone only) and `UISupportedInterfaceOrientations = UIInterfaceOrientationPortrait` (`PBX:345,356`).
- iOS deployment target 18.0 (`PBX:346`). `MARKETING_VERSION = 1.0`, build 3 (`PBX:351,334`).
- Display name `inApp` (`PBX:339`). `UIStatusBarStyleDarkContent` (`PBX:344`).
- Consequences for the web:
  - The content maxima in code (catalogs 680, Saved/Settings 660, reader 640, welcome 440) are never reached on a real device; the widest iPhone is about 440 pt. Any tablet or desktop layout (05 §3.2 grid, top navigation, TOC rail) is **new design**, not parity. This needs design sign-off (O9); the specs must not claim it comes from the app.
  - There is no landscape behaviour to copy.
- Web meta:
  - `<meta name="theme-color">`: `#F5F5F7` / `#111214` on paper screens, `#FCFCFD` / `#17181B` on reading screens, switched with `media="(prefers-color-scheme: …)"` when `ia_theme=system`.
  - `manifest.webmanifest`: name `inApp`, icons from `AppIcon.appiconset/icon-rating-paper-cobalt-1024.png` (08 §6).

### G2. The app has not shipped publicly yet

- 1.0 build 3 was submitted on 2026-09-21 and is WAITING_FOR_REVIEW. Build 2 was TestFlight only (`REL/README.md:3-6`). `REL/asc-versions.json` has a single version, `1.0`.
- `REL/review-notes.txt:3`: "No account or sign-in is required."
- Consequences:
  - No public user has legacy Saved data, old compare slugs or projects. Nothing needs importing, and the app has no export for it anyway (C12).
  - No public "earlier lifetime buyer" exists (C13).
  - Hard-coded inbound links from **public** binaries will come only from this 1.0 build, i.e. `offer` and `contacts` (C5, C7).
  - App Store badge, links and the Smart Banner stay behind a flag until approval (08 §0.3).

### G3. Changing the language keeps the user's place

- Tapping a language row sets `library.locale` (`APP/Clarity/ClaritySettings.swift:108`). The setter then (`APP/Content/Library.swift:70-78`):
  - stores `content.locale`;
  - updates `AppLocale.current` and `Strings.locale`;
  - reloads the packs asynchronously.
- `reload()` swaps the data in place and does **not** clear `ideas` on success (`APP/Content/Library.swift:162-184`), so the loading screen does not appear.
- `ClarityRootView` has **no** `.id(locale)`. The legacy root had one (`APP/App/RootView.swift:104`). The selected tab, all three navigation stacks and the open Settings sheet all survive the switch; every string and all content re-render in the new language.
- Search queries survive, and results re-filter in the new language.
- Bookmarks and notes are keyed by slug, so they survive.
- `StudioContent` (`studio.json`: `builtAt`, problems, buyer) is Russian-only and is not reloaded.
- **Web mapping:**
  - The language switch navigates to the **same path and query** under the new locale prefix (`/ru/research/habit-tracking?q=x` → `/de/research/habit-tracking?q=x`) and sets the `locale` cookie.
  - No confirmation step.
  - Settings is a route (`/<loc>/settings`), so after the switch it is still open in the new locale.
  - Client-only UI state is lost on navigation: open modals, scroll position. Keep the scroll position if cheap; this is not required.
- The app has no language switcher outside Settings. The web adds one only on the landing and in the footer (08). Don't add one to app pages; this is a parity choice that O9 may revisit.

### G4. Privacy sheet: visual spec (text is in 02 Appendix A, rows 240–255)

| Element | Value | Source |
|---|---|---|
| Container | Sheet with its own navigation; title «Конфиденциальность»; trailing «Готово» (confirmation) | `APP/Studio/StudioPrivacy.swift:9,32-33` |
| Column | Padding 20, gap 20, **max width 620**, background `paper` | `:11,30-31` |
| Hero card | Background `accentSoft` (`StudioStyle.mint` = sky, `APP/Studio/StudioStyle.swift:12-14`), radius 28, padding 22, gap 18. Contents: illustration `ClarityResearch` at 105×105; «Твои идеи\nостаются твоими.» in system largeTitle **bold**; «Как inApp хранит и использует данные.» in subheadline, secondary | `:12-19`; `StudioStyle.title(31)` → `.largeTitle` bold (`APP/Studio/StudioStyle.swift:30-33`); `StudioArt.note → "ClarityResearch"` (`APP/Studio/StudioArtwork.swift:5-14`) |
| Illustration motion | Sine wobble (rotation ±1.4°, y ±2.5 px) because the size is ≥ 100. Off under reduce-motion or when inactive | `APP/Studio/StudioArtwork.swift:57-71` |
| 6 sections | Each a `surface` card, radius 24, padding 20, gap 12: headline title plus body (secondary, line spacing 3) | `APP/Studio/StudioPrivacy.swift:37-41` |
| Link | «Связаться с разработчиком» → `Links.contact`, body semibold, min height 44 | `:26-27` |
| Footer | «Обновлено 21 сентября 2026 года», caption, secondary | `:28-29` |

- **Web:** `/<loc>/privacy` reuses this layout with **web-specific text** (O6). The iOS text describes Apple payments, RevenueCat and "deleting the app"; the web must describe the `ia_session` cookie, YM/GA/DataFast analytics, YooKassa, and account data.
- Keep a link to the iOS policy: `REL/legal/privacy.html`, published at the github.io URL.

### G5. Category picker details (supplements 02 §2.5)

- It is a `List` inside its own navigation stack. `.searchable(prompt: «Найти категорию»)` puts the search field in the navigation bar (`APP/Clarity/ClarityCatalogs.swift:254-265`).
- The search filters **only the niche rows** with `localizedStandardContains`. The first row «Все категории» is **always shown**, even while searching (`:250,256`).
- Rows are sorted with `localizedStandardCompare` (`:251`) and have 7 pt of extra vertical padding (`:272`). The selected row has a trailing checkmark in ink.
- Tapping a row sets the selection and closes the picker. «Готово» (confirmation) closes it without changing anything. Tint is ink; background is paper (`:262-265`).

### G6. Nested presentations: the app stacks sheets, the web should not

- An idea card presents **its own** sheet (`APP/Clarity/ClarityIdeaCard.swift:73-90`). Inside that sheet, «Читать разбор категории» pushes the research article **inside the sheet's stack** (`APP/Clarity/ClarityReader.swift:545-548` together with `APP/Clarity/ClarityIdeaCard.swift:77-79`).
- That pushed article's idea cards open **another sheet on top**. The pushed screen shows only «Назад» (`APP/Clarity/ClarityBackNavigation.swift:12-17`); the «Готово» close button exists only on the sheet's root idea (`APP/Clarity/ClarityIdeaCard.swift:80-85`), so on iOS you close by swiping down.
- **Web policy (DEFAULT):**
  1. **At most one content modal plus the paywall.** The paywall may sit on top of a content modal because it closes itself on success (`APP/Clarity/ClarityPaywall.swift:73-75`).
  2. An idea modal always shows a close control («Готово» top-leading, as in the app) and closes on Esc and on the backdrop.
  3. Inside an idea modal, «Читать разбор категории» **closes the modal and navigates the page** to `/<loc>/research/<category>`. This deviates from the app's in-sheet push, so research is never read inside a modal.
  4. Clicking another idea card inside a modal **replaces** the modal content by routing to the intercepted `/<loc>/ideas/<slug>`; browser Back returns to the previous idea.
  5. Clicking a locked card anywhere opens the paywall as the top layer.

### G7. The free-sample link pushes onto whichever stack is current

- «Сначала прочитать бесплатный разбор» is a `NavigationLink` whose destination is `ClarityDestination(.research("interior-design"))` (`APP/Clarity/ClarityContentAccess.swift:92-99`). It pushes onto the current stack: the Research tab, the Saved tab, or inside an idea/export sheet.
- **Web:** a plain link to `/<loc>/research/interior-design`. When it is clicked inside a modal, close the modal first (G6).

### G8. Unknown and non-launch slugs (404 policy)

In the app:
- `ClarityResearchView` and `ClarityIdeaView` show `ClarityMissingMaterial` when the slug is not in the library (`APP/Clarity/ClarityReader.swift:95,471,814-818`).
- The ru library also contains the 37 archive categories and 592 ideas, so a legacy ru bookmark can still open an archive article. The web must not expose those (C15).

| Request | Response |
|---|---|
| `/<loc>/research/<one of 35>` | page |
| `/<loc>/research/<one of the old site's 72 active categories, not in the 35>` | 308 → `/old/<ru\|en>/segment/<slug>` (`<ru\|en>` = `ru` if `loc = ru`, else `en`) |
| `/<loc>/ideas/<one of 293>` | page |
| `/<loc>/ideas/<any other old slug>` | 308 → `/old/<ru\|en>/ideas/<slug>` (C16) |
| Anything else under a `NEW_TOP` segment | HTTP 404. Page = «Материал недоступен» plus the web text variant (G11 #4) and a link «Разборы» → `/<loc>/research`. The shared tab bar is visible. This is the new site's `global-not-found` (07 §9) |

### G9. SEO and metadata for app pages (08 covers only the landing)

Titles follow the owner's convention "brand at the end" (08 §1). Every public page has a self-canonical without query parameters, `hreflang` for the 5 locales, and `x-default` → `/en/…`.

| Page | `<title>` | `description` | `og:image` | robots |
|---|---|---|---|---|
| `/<loc>/research` | `{L("Разборы")} — inApp` | `L("Что людям важно в приложениях и чего им не хватает.")` | 08 §5 composed OG | index |
| `/<loc>/research/<slug>` (free) | `{category name} — {L("Разбор")} — inApp` | article `summary` | `research/<cover>-1200.webp` | index |
| `/<loc>/research/<slug>` (locked) | same | article `summary`. Only public fields; the corpus sentence is hidden on the preview too (01 §5.1) | cover | index, follow (DEFAULT; O5 may change) |
| `/<loc>/ideas` | `{L("Идеи")} — inApp` | `L("Что можно создать или улучшить.")` | composed | index |
| `/<loc>/ideas/<free slug>` | `{card title} — inApp` | card description | `ideas/<slug>-1200.webp` | index |
| `/<loc>/ideas/<locked slug>` | `{L("Идея в Plus")} — inApp` | `L("Подробности идеи доступны в Plus.")` | idea cover (the artwork is public in the app) | **noindex, follow** |
| `/<loc>/privacy`, `/contacts`, `/offer` | page title — inApp | — | composed | index |
| `/saved`, `/settings*`, `/plus`, `/welcome`, `/library` | — | — | — | noindex |

- **Sitemap** (new site only, 07 §5.9):
  - per locale: the landing, `/research`, 35 × `/research/<slug>`, `/ideas`, 5 × `/ideas/interior-design-N`, `/privacy`;
  - plus `/ru|en/contacts` and `/ru|en/offer`.
  - That is 44 URLs × 5 locales + 4 = **224 URLs**, before O5.
- **JSON-LD:**
  - free research: `Article` (`headline`, `description`, `image`, `inLanguage`, `isAccessibleForFree: true`, `publisher` = the `Organization` from 08 §5);
  - locked previews: `WebPage` only. Do not use paywalled-content markup, because the body is deliberately not in the HTML.
- **`llms.txt`, `llms-full.txt`, `feed.xml` for the new site:**
  - They may list only public fields: topic names, summaries, the free article, the 5 free ideas.
  - The old `llms-full` includes full dossier text (06 §8). Keep it only under `/old` semantics, or regenerate it from public fields. Never include a locked article body.

### G10. Server contract for gated content (no spec defined the HTTP surface)

- **Rule:** the server decides `canRead(category)` and `canReadIdea(slug)` (`APP/Clarity/ClarityContentAccess.swift:9-19`) before serialising anything. Locked bodies never enter RSC payloads, props, JSON or search responses (01 §8, 03 §3.6, 04 §7.6).
- **Pages:**
  - Server components read `content/v2/<loc>/…` (04 §7).
  - `research/<c>.json` is read only when `canRead(c)`; `ideas/<slug>.json` only when `canReadIdea(slug)`.
  - Card copy for locked ideas is stripped before rendering. A locked card's props are `{slug, cover}` only.
- **Research search** (`/<loc>/research?q=`):
  - The haystack includes locked article bodies (01 §4.1), so matching must run **on the server**: a route handler `GET /api/v2/search/research?locale=&q=` → `{slugs: string[]}` in the order of 01 §4.3.
  - The client renders the matching cards from the public catalog data. Debounce input by about 150 ms; the app has no debounce, but the web makes a network call.
- **Ideas search** (`/<loc>/ideas?q=`):
  - Free users only ever match readable ideas (`APP/Clarity/ClarityCatalogs.swift:171-174`), so ship an **entitlement-scoped haystack** with the page (5 entries for free users, 293 for Plus) and filter on the client with the app algorithm (02 §1.3).
  - Drop the Russian `audience`/`buyer` field for non-ru locales (§5 #25).
- **Export:** a server action or route `GET /api/v2/export/<slug>?locale=` → `text/plain; charset=utf-8` with `Content-Disposition: attachment; filename*=UTF-8''<encoded>` (filename rule in 02 §7.4). Return 403 unless `canReadIdea`. The note is client or account data, so if notes are device-local (O3) the client appends part 3 (`L("3. МОЯ ЗАМЕТКА") + "\n" + note`) exactly as `APP/Clarity/ClarityExportDocument.swift:61-62` does.
- **Bookmarks and notes API** (only if O3 = sync): the endpoints in 06 §6.3, trimmed to C12's models. Favorites return **newest first** (`ORDER BY createdAt DESC`); the app inserts at index 0 (`APP/Store/Shelf.swift:50-51`). Notes are capped at 20 000 chars. An empty note deletes the row.
- **Rendering and performance:**
  - `/ideas` renders 293 cards (288 art-only for free users). Use `loading="lazy"` and `decoding="async"` on every card image after the first four, with the pre-sized 480/800/1200 WebP from 04 §6.3.
  - Don't virtualise: DOM order must match the app order for accessibility and for search engines.
  - `/research` has 35 covers, same treatment.

### G11. Web copy delta: device wording, in the app's informal «ты» voice

- **Voice:** app strings use the informal «ты» voice («Попробуй…», «Нажми закладку…», «Твоя библиотека»). The old site's auth modal and account menu use the formal «вы» («Войдите…», «Проверьте почту», 06 §3.3).
- **Every new or reused string on the new site must be in «ты».** The auth-modal copy has to be rewritten, not reused. de/fr use the informal forms too, matching `ui.de.json` and `ui.fr.json` ("du", "tu").

Replacement strings. There is no localized source yet, so de/fr/ja need translation. Pick column A or B after O3.

| # | App string (where) | A: browser-only storage | B: account sync |
|---|---|---|---|
| 1 | «Сохранено на этом iPhone» (Saved footer, `APP/Clarity/ClarityMy.swift:70`) | «Сохранено в этом браузере» / "Saved in this browser" | «Сохранено в твоём аккаунте» / "Saved to your account" |
| 2 | «Закладки и заметки хранятся на этом iPhone.» (Settings footer, `APP/Clarity/ClaritySettings.swift:75`) | «Закладки и заметки хранятся в этом браузере.» / "Bookmarks and notes are kept in this browser." | «Закладки и заметки хранятся в твоём аккаунте.» / "Bookmarks and notes are kept in your account." |
| 3 | «Заметка хранится на этом устройстве. Удаление материала из сохранённого не удаляет заметку.» (note editor, `APP/Clarity/ClarityReader.swift:919`) | «Заметка хранится в этом браузере. Удаление материала из сохранённого не удаляет заметку.» | «Заметка хранится в твоём аккаунте. Удаление материала из сохранённого не удаляет заметку.» |
| 4 | «Вернись в каталог и выбери другой материал. Сохранённые записи остаются на устройстве.» (missing material, `:816`) | «Вернись в каталог и выбери другой материал. Сохранённые записи остаются в этом браузере.» | «Вернись в каталог и выбери другой материал. Сохранённые записи остаются в аккаунте.» |
| 5 | «Твои записи» body (`APP/Clarity/ClaritySettings.swift:301`) | «Закладки и заметки хранятся в этом браузере. Удаление закладки не удаляет заметку. Синхронизации между устройствами нет.» | «Закладки и заметки хранятся в твоём аккаунте и доступны после входа на любом устройстве. Удаление закладки не удаляет заметку.» |
| 6 | «Чтение без интернета» block (`:299`) | Drop on the web | Drop on the web |
| 7 | «Сохранить в Файлы» / «Сохранить ещё раз» (export) | Reuse the existing key **«Скачать документ»** ("Download the document", in all 4 packs). After the click, show the existing «Документ сохранён». No new string needed | same |

Payment wording (Apple-specific in the app) depends on O1. With the existing YooKassa flow:
- «Покупка ожидает подтверждения Apple…» → reuse the old site's «Проверяем оплату…» (`SITE/src/components/PurchaseTracker.tsx:69-74`).
- «На этом Apple ID покупок не нашлось.» → «В этом аккаунте покупок не нашлось.»
- «Plus активен на этом устройстве.» → «Plus активен в этом аккаунте.»
- «Восстановить покупки» → «Войти, чтобы восстановить доступ» (it opens sign-in).
- «Управление подпиской» and «Проверь способ оплаты в App Store» are hidden unless a recurring web plan exists.

### G12. Saved rows for unknown slugs

- In the app, the idea row title is:
  - `canReadIdea ? (cardTitle ?? «Идея недоступна») : «Идея в Plus»` (`APP/Clarity/ClarityMy.swift:250`);
  - so a **free** user sees an unknown slug as «Идея в Plus», and a Plus user sees «Идея недоступна».
- Research rows fall back to «Разбор недоступен» (`:251`).
- **Web:**
  - Reuse `Favorite` but render only launch slugs (293).
  - Keep other rows in the DB so the old site still shows them.
  - Apply the app titles to launch slugs only.
  - An unknown research slug in `ia2:saved.research` renders «Разбор недоступен» with no thumbnail and opens the 404 page (G8).

### G13. Web-only failure states: reuse existing app strings (no new copy)

| State | Strings (all present in `ui.<lang>.json`) |
|---|---|
| Content fetch failed (server error) | «Не удалось открыть материалы» / «Попробуй загрузить библиотеку ещё раз.» / button «Повторить» (`APP/Clarity/ClarityRoot.swift:39-40`) |
| Slow load | «Открываем материалы…» (`:43`) |
| Bookmark or note API failed | «Не удалось сохранить изменения. Текст остаётся на экране — попробуй ещё раз.» (`APP/Studio/StudioNotebook.swift:140`). The note editor stays open, as in `APP/Clarity/ClarityReader.swift:929` |
| Price API failed | «Загружаем цену» → «Цена пока недоступна. Попробуй загрузить её снова.» + «Загрузить цену снова» (03 §2.3) |
| Clipboard or share rejected | «Не удалось подготовить файл. Попробуй ещё раз.» (`APP/Clarity/ClarityReader.swift:1047`) |
| Unknown slug | G8 |

### G14. Other small gaps

- **Carousel copy on the web app** (the `/welcome` replay): keep the app's «…» quote marks in every locale (`APP/Clarity/ClarityWelcomeContentPreview.swift:96`) and in the export (`APP/Clarity/ClarityExportDocument.swift`, 02 §7.3). Locale-specific marks are allowed only on the marketing landing (08 §S1).
- **Staff QA:** don't build a web copy of the DEBUG access menu. Admins are already Plus (`isAdmin`), and the existing `as_buyer` cookie (`SITE/src/app/api/dev/buyer-preview/route.ts`) previews the free layer. Reuse both.
- **Research TOC:** the web's sticky rail (05 §3.6 J) is an addition. On mobile use a bottom sheet with «Содержание» and «Готово» (01 §5.5).

---

## 5. Open questions from 01–08: answers

`#` numbers the question here; "Source" lists the question ids in the specs (01-Q1 = spec 01, question 1).

| # | Question (sources) | Answer | Status |
|---|---|---|---|
| 1 | Which locales and which default? (01-Q1, 02-Q7, 04-Q1, 06-Q6) | All 5 app locales `ru, en, de, fr, ja` (`APP/Resources/locales.json`), full parity. Default `en`, negotiated per §2.2. `/old` stays ru/en. Magic-link emails: send `en` for de/fr/ja until they are translated (`SITE/src/lib/mail.ts:51-52`) | ANSWERED (+ DEFAULT for email) |
| 2 | URL scheme and collisions (01-Q1, 07-Q2) | §2.1 and §2.3. Internal folder `(new)/v2/[locale]` (07). Avoid `notes` | DEFAULT |
| 3 | Can anonymous visitors read the catalog and the free layer? (01-Q2, 08-Q1) | Yes. The app needs no account for anything (`REL/review-notes.txt:3`). The whole free layer, bookmarks and notes work without sign-in. Sign-in is needed only to buy (existing pay route returns 401 «Нужно войти», `SITE/src/app/api/pay/yookassa/route.ts:20-21`) and, if O3, to sync | ANSWERED (parity) |
| 4 | Bookmarks and notes: device or account? (01-Q3, 02-Q1, 06-Q5) | Parity = device-local, so localStorage keys per §2.5 for everyone. Account sync is a product addition | OWNER → O3 |
| 5 | Plus on the web and cross-platform (01-Q4, 02-Q4, 03-Q2, 06-Q2, 08-Q2) | Cross-platform is impossible in v1: the app has no accounts and RevenueCat is anonymous with no custom attributes (03 §4.1), and the shipped binary cannot read a web entitlement. So web Plus and iOS Plus are **separate**, and the web must not promise "restore App Store purchases" (06 §5.2). Web Plus = `access.unlimited` (§2.7). Pricing, provider and plans → O1 | ANSWERED (separation) + OWNER O1 |
| 6 | Existing web buyers (03-Q3, 06-Q3) | Lifetime, friend, `premiumUntil` and admin users → Plus. Their offer promises perpetual access to all materials (`SITE/src/app/offer/page.tsx:38,46`). The anonymous free-card meter (`fc` cookie) has no app equivalent and is dropped on the new site (it stays on `/old`). Per-item `Unlock` rows → O2 | ANSWERED + OWNER O2 |
| 7 | Localized alt texts for 32 topics (01-Q5, 04-Q3) | Generate per locale from the deterministic templates (04 §2.10): cover = category name; audiences = `L`-style template; observation = template with the localized observation title. The catalog card image stays decorative (`alt=""`, `APP/Clarity/ClarityCatalogs.swift:104`) | DEFAULT |
| 8 | Two quotes missing de/fr/ja translations (01-Q6, 04-Q4) | Mirror the app (English fallback, no cross-language fallback, `APP/Content/QuoteReading.swift:13-25`). Fix upstream in the app repo; the import picks it up | DEFAULT |
| 9 | Build «Другие возможности» / «Другие идеи категории»? (01-Q7) | Yes: the code path exists (`APP/Clarity/ClarityReader.swift:169-174`) and is cheap. It renders nothing with the current data. The validator warns if either becomes non-empty (04 §7.4) | DEFAULT |
| 10 | Legacy screens and Saved sections (01-Q8, 02-Q2, 04-Q10) | Out of scope. No public user can own the data (G2, C12) and the app cannot export it | ANSWERED |
| 11 | Share or copy-link on articles (01-Q9) | None, for parity (`APP/Clarity/ClarityReader.swift:195-204`). Browser URLs are shareable anyway | DEFAULT |
| 12 | Build compare? (02-Q3) | No. It is never instantiated, and UI tests assert it is absent (02 §4.1) | ANSWERED |
| 13 | Paid text vs SEO (02-Q5, 03-Q6, 08-Q8) | Locked ideas expose only artwork, so no title or description anywhere → `noindex` (`APP/Clarity/ClarityIdeaCard.swift:3`). Locked research previews expose name, summary and cover exactly as in the app → index (DEFAULT). The landing's 4 paid-topic onboarding excerpts are shown to every app user in onboarding (`APP/Clarity/ClarityWelcomeExamples.swift:100-106`), so showing them publicly matches the app. Any richer SEO teaser for paid material → O5 | ANSWERED + DEFAULT + OWNER O5 |
| 14 | Default theme (02-Q6, 05-Q5) | Light, stored in the `ia_theme` cookie (C9) (`APP/Clarity/ClarityRoot.swift:31`) | ANSWERED |
| 15 | Keeping the URLs hard-coded in the app alive (02-Q8, 04-Q2) | Only `/{ru,en}/offer` and `/{ru,en}/contacts` are live (C5). They stay at the root, owned by the new site (C7). The others resolve through `/old` redirects | ANSWERED |
| 16 | Export on the web (02-Q9) | Primary button = existing «Скачать документ»; after the download, «Документ сохранён»; «Копировать» → `navigator.clipboard`; «Поделиться» only when `navigator.canShare({files:[file]})` is true, otherwise hidden. Filename and format as 02 §7.3–7.4; «» quote marks stay in every locale. Server generation per G10 | DEFAULT |
| 17 | Note-title bug (02-Q10) | Use the card title (C18) | DEFAULT |
| 18 | What «Знакомство с приложением» does (02-Q11) | `/<loc>/welcome` replay (§2.6) | DEFAULT, confirm in O4 |
| 19 | Idea reader: modal or page? (02-Q12, 05-Q6) | Modal from cards, page from Saved and direct URLs (C17, G6) | ANSWERED (parity) |
| 20 | Privacy and terms targets (02-Q13, 03-Q7, 07-Q3, 08-Q5) | Structure: `/<loc>/privacy` (new page), `/<loc>/offer` and `/<loc>/contacts` owned by the new site (C3, C7). Wording → O6 | ANSWERED (structure) + OWNER O6 |
| 21 | Where onboarding goes on the web; does buying need sign-in? (03-Q4) | Placement → §2.6 default + O4. Buying needs sign-in with the existing flow (#3) | DEFAULT + ANSWERED |
| 22 | Which ideas does onboarding show? (03-Q5) | The 5 free interior ideas: `ideaSlugs = freeIdeaIDs` (`APP/Clarity/ClarityWelcomeExamples.swift:6`). The UI tests expecting 10 cross-topic ideas are stale (03 §5) | ANSWERED |
| 23 | Corpus numbers: static or computed? (03-Q8) | 1 451 072 / 4 623 / 72 are static constants for the **72-category archive** (`APP/Models/ResearchProduct.swift:8-12`; they equal the sum over all 72 `rich.ru` dossiers). They cannot be derived from the 35 published topics (744 775 / 2 356; recomputed). Ship them in `manifest.corpus` (04 §7.3); per-topic numbers come from `rich` | ANSWERED |
| 24 | NBSP replacement and reflow (04-Q5) | Mirror the app at build time: NBSP → space, 430/360 sentence chunking (`APP/Clarity/ClarityReader.swift:45-62`) | DEFAULT |
| 25 | Russian audience/buyer text in non-ru idea search (04-Q6) | Drop it in non-ru locales. It is invisible and only ever matches Russian tokens | DEFAULT |
| 26 | Image hosting (04-Q7, 06-Q8) | Commit only the WebP derivatives (~37 MB, 04 §6.3) under `public/media/v2/…`; the sources stay in the app repo. Check free disk on `/opt/badcomment` before the first deploy (infra task) | DEFAULT |
| 27 | Content sync (04-Q8) | Manual `scripts/v2/import-app-content.ts` run against a pinned app commit. `manifest.source.gitCommit` and the sha256 hashes are committed; CI re-runs only the validator | DEFAULT |
| 28 | Show app names on quotes? (04-Q9) | No. `ClarityQuoteBlock` never renders `app` or `rating` (`APP/Clarity/ClarityReader.swift:858-876`) | ANSWERED |
| 29 | Desktop navigation, catalog grid, TOC rail (05-Q1, Q2, Q7) | Not defined by the app (G1). 05's proposals are the default | OWNER → O9 |
| 30 | Sans font, serif fallback, icon set (05-Q3, Q4, Q10) | System sans stack (no Inter); serif `Georgia, "PT Serif", serif` (C21); Phosphor (has filled variants) | DEFAULT |
| 31 | Landing look (05-Q8) | Onest 900 display face + poster gradients only as section accents (08 §4, S12) | DEFAULT |
| 32 | Device-specific copy (05-Q9) | G11 | DEFAULT per O3 |
| 33 | Old site URL shape (06-Q1) | `/old/<ru\|en>/…` (C6). App-slug pages and the review archive move under `/old` (07 §4.3); the SEO trade-off is O5 | ANSWERED + OWNER O5 |
| 34 | Free sample on the new site (06-Q4) | The app's rule: `interior-design` + ideas 1–5. MCP keeps `dating-apps`: it is a separate old-product surface pinned by `SITE/scripts/test-mcp.ts` | ANSWERED |
| 35 | 54-ФЗ receipts (06-Q7) | Nothing in the code: no `receipt` object is sent to YooKassa (06 §4.5) | OWNER → O6 |
| 36 | English `/contacts` (06-Q9) | Must be localized. It is the App Store support URL for every storefront (08 §2), and the iOS app sends every non-ru locale to `/en/contacts` (`APP/Strings/Strings.swift:270`). Today it renders Russian only (`SITE/src/app/contacts/page.tsx:21-24`) | ANSWERED (+ urgent, O10) |
| 37 | Telegram Stars (06-Q10) | — | OWNER → O1 |
| 38 | Old `/segment` and `/rating` URLs vs search traffic (07-Q1) | Only the 35 launch slugs can map (C15) | OWNER → O5 |
| 39 | Old routes into an `(old)` route group? (07-Q5) | Yes, option A with a shared analytics component and an updated test (C8) | DEFAULT |
| 40 | Share analytics counters? (07-Q6) | Share YM/GA/DataFast (same domain, one funnel) with a `site` parameter. New event names come from 03 §4.2 and 08 §7 | DEFAULT |
| 41 | MCP page on the new site? (07-Q7) | No: the app has no MCP surface. `/old/<loc>/mcp` stays canonical; the API is unchanged (C14) | ANSWERED |
| 42 | Archive banner on `/old` (07-Q8) | Yes (07 §6.1 copy); the old logo stays inside the archive | DEFAULT |
| 43 | Landing headline number (08-Q3) | — | OWNER → O7 |
| 44 | App Store go-live and the Russian storefront (08-Q4) | Flag until approval (G2) | OWNER → O8 |
| 45 | French noun (08-Q6) | «décryptage(s)» everywhere on the web. It is the UI term in `ui.fr.json`, and the landing must match the product it opens | DEFAULT |
| 46 | Update the de/fr/ja marketing URLs (08-Q7) | Yes, after the web ships those locales | DEFAULT (owner does it in App Store Connect, O8) |
| 47 | Web screenshots for landing S9 (08-Q9) | Capture after the build; launch with the phone column only if they aren't ready | DEFAULT |

---

## 6. Questions that genuinely need the product owner

Each question has a recommended default, so work can start before the answer arrives.

| # | Question | Why the code can't answer it | Recommended default | Blocks |
|---|---|---|---|---|
| **O1** | **Does the web sell Plus at launch, and how?** Plans (annual, lifetime or both); prices per currency (RUB now; USD/EUR?); provider (YooKassa is RUB-only; keep Telegram Stars at 500 ⭐?); one-year non-recurring vs recurring; what happens to the 990 ₽ promo pinned by CI (`SITE/scripts/test-monetization.ts:7`) | The app sells only through StoreKit ($39.99/yr, $79.99 lifetime, `REL/README.md:13-14`). The web has one 990 ₽ lifetime SKU (06 §4.1). App Store payments are unavailable in Russia (08 §S10), so for ru users the web is the only purchase path | Launch with the existing YooKassa lifetime SKU relabelled as Plus «Навсегда» (no server change, CI stays green). Add a one-year plan later via `premiumUntil` (06 §4.6). Keep Stars | `/plus`, the Settings Plus card, landing S10, FAQ 5/10, `/library` return |
| **O2** | People who bought a single category or deck on the old site (`Unlock` rows, 290 ₽): what do they get on the new site? | The app has no per-item unlocks (`APP/Clarity/ClarityContentAccess.swift:5-19`) | Nothing new; they keep their unlocks on `/old`. Optionally grant Plus as goodwill (a business call) | Access checks, support |
| **O3** | Do bookmarks and notes stay in the browser (app parity: «на этом устройстве») or sync to the account after sign-in? | The app is device-only by design (`APP/Clarity/ClaritySettings.swift:301`) | Browser storage for everyone; when signed in, sync + one-time merge (§2.5) | Copy G11 (A/B), API, Prisma models |
| **O4** | **Front door:** does `/<loc>` show the landing to everyone, or redirect signed-in users into the app? Does the web ever show the 4-page onboarding automatically, or only as a replay from Settings? (Your request: "лендинг … для неавторизованных или как обычно".) | The app has no landing; its onboarding blocks the whole app on first launch (`APP/Clarity/ClarityRoot.swift:32,45`) | §2.6: landing for anonymous visitors, 307 → `/<loc>/research` for signed-in users, no forced onboarding, «Знакомство с приложением» → `/<loc>/welcome` | Proxy, landing, Settings row |
| **O5** | **SEO strategy:** (a) should the old `/<loc>/segment/<slug>` and `/<loc>/rating/<slug>` URLs for the **35** launch topics redirect to the new research pages (keeping search traffic) or to `/old` as literally requested (about 2 000 URLs per locale get deindexed)? (b) index the 34 locked research previews (default yes)? (c) any public teaser text for paid ideas beyond artwork (breaks app parity)? | Business trade-off (07 §7.3) | (a) Map the 35 to new research pages, send the rest to `/old`. (b) Index. (c) No | Proxy legacy map, sitemap, robots |
| **O6** | **Legal texts:** the new `/offer`; web privacy policy; contacts copy in ru/en (and de/fr/ja?); refund, cancel and renewal wording on the paywall; 54-ФЗ receipts via YooKassa self-employed integration or manually in «Мой налог»; whether the self-employed details are shown in the footer | Legal and content, not code. The current offer describes the old 990 ₽ product and links to `/tokens` (`SITE/src/app/offer/page.tsx:37-39`) | Split the pages: `/<loc>/offer` = general **terms of use** for the service with no prices and no purchase links, because the iOS app links to it (O10). The payment offer moves to a web-only path linked from the checkout, e.g. `/<loc>/offer/payment`. Write a new web privacy page | `/offer`, `/contacts`, `/privacy`, paywall legal block |
| **O7** | Landing headline number: 744 775 reviews / 2 356 apps (the 35 published topics = store subtitle) or «1,4 млн» (the 72-category archive, onboarding page 1)? | Both are true of different sets (§5 #23) | 744 775 in the headline; the archive only in FAQ 2 (08 §3) | Landing S2, OG image |
| **O8** | App Store operations: keep the badge, link and Smart Banner behind a flag until approval; is the app available in the Russian storefront (`REL/asc-availability.json` has an empty territory list)? Update the de/fr/ja marketing URLs to `/de`, `/fr`, `/ja` after launch? | App Store Connect state, not code | Flag off until approval; treat the ru landing as web-first | Landing S1, S9, S12 |
| **O9** | **Desktop design sign-off:** a 2- or 3-column card grid at ≥ 760 / 1280 px and a sticky top navigation at ≥ 1024 px (05 §3.2, §3.6 I), or a strict single 680 px column with the bottom capsule everywhere? A TOC rail at ≥ 1200 px? A language switcher inside app pages? | The app is iPhone-only and portrait-only (G1), so there is nothing to be at parity with | 05's proposals (grid + top bar + TOC rail); no language switcher inside app pages | Layout of every root screen |
| **O10** | **Act now, independent of site-v2 (app is in review):** (1) `/en/contacts`, the App Store support URL, renders Russian only. Its copy also says the ideas come from «App Store и Google Play» and promises «реальный спрос», which contradicts the store copy (`SITE/src/app/contacts/page.tsx:21-24`). (2) The app's «Условия использования» row opens `/<ru\|en>/offer`, which describes buying through YooKassa or Telegram Stars and links to the `/tokens` pricing page (`SITE/src/app/offer/page.tsx:37-39`). An App Review reviewer may read that as steering to an external purchase (Guideline 3.1.1 outside the US storefront). This is a **risk, not a certainty** | Compliance judgement | (1) Ship a localized, neutral contacts page now. (2) Remove the pricing and purchase links from `/offer`, or split it as in O6, before the review completes | App Review outcome |

---

## 7. Errata for specs 01–08 (apply when reading them)

| Spec § | Says | Correct to |
|---|---|---|
| 01 §0 TL;DR, §6.5, §6.13, summary | 758 visible quotes | **792** (C1) |
| 01 §2.1–2.2; 03 §1.1, §2.1 (`/app/…`); 08 §2 | Various URL schemes | §2.1 of this file |
| 01 §5.9 | "research ↔ idea can nest" inside the sheet | True in the app; the web does not nest (G6) |
| 02 §0.13 and §8.9 | Keep all hard-coded `inapp.pro` URLs resolving | Hard requirement only for `offer` and `contacts` (C5) |
| 03 §1.1 web recommendation | Show onboarding on the first app visit; `/app/research…` | §2.6 default + O4; §2.1 routes |
| 03 §3.6 row 1 | Earlier public lifetime buyers exist | Testers only (C13) |
| 04 §1 (`studio-art.json` row), §6.1 (Clarity/Studio art = "No"), §0 (510 images) | `ClarityResearch` unused | Used by the privacy sheet; 511 images (C4) |
| 04 §5.1 | `"sample"` and `"research"` routes | Only `sample`, `catalog`, `replay-close` are emitted (C2) |
| 04 §5.9 | Privacy link `github.io` as an app link | Not linked in the app; in-app sheet (C3) |
| 05 §2.1, §6 CSS `--ia-font-serif` | Gelasio before PT Serif | `Georgia, "PT Serif", serif` (C21) |
| 05 §3.2, §3.6 I | Presented as a translation of the app | New design (G1), pending O9 |
| 06 §0.8, §9.1 (`/persona-covers`, `/idea-covers`, `/build/*.webp` "iOS app"), §9.2 (`/ru/reviews`, `/ru/rating`, `/ru/segment` "live iOS app") | Live iOS consumers | Not referenced by the release binary (C5) |
| 06 §2.4 (keep one root layout), §9.3 (`/<locale>/old/<path>`; keep `/mcp`, `/tokens`, `/admin` in place) | — | C8, C6, C14 |
| 06 §6.3 | `Project`, `CompareItem`, `UserPrefs`, `SavedItem` kinds app/card/problem | Trimmed (C12) |
| 07 §3 table and §4.1 `OLD_TOP` | `contacts`, `offer` → `/old` | `NEW_TOP` (C7) |
| 07 §4.4 | "259 old idea slugs not in the app bundle" | 558 old slugs have no new page; 308 → `/old/<ru\|en>/ideas/<slug>` (C16) |
| 07 §7.4 | "All 72 old category slugs exist in the app bundle" → map | Map only the 35 launch slugs (C15) |
| 08 §6 "Do NOT use" | `ClarityResearch` is used only by the `ClarityArt` placeholder | `ClarityArt` is vector; `ClarityResearch` is the privacy-sheet hero (C4) |
| 08 S11 FAQ #2 (all locales) | "Quotes are shown in their original English" | C20 wording |
| 08 S13 footer "Privacy" | github.io iOS policy | `/<loc>/privacy` (web policy); github.io as a secondary "iOS app" link (C3) |
