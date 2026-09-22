# 01 — App shell, navigation and the «Разборы» (research) side

Status: research spec for the site-v2 rebuild (full parity with the live iOS app "Clarity" shell).
Source of truth: `/Users/artsaverin/projects/app_04_inapp/Inapp/` (read on 2026-09-22). All `file:line` references are relative to that folder unless a full path is given.
Where code and documentation disagree, **the code wins**. Discrepancies are listed in §13.

Conventions in this document

- `L("…")` in Swift is the UI string lookup. **The key is the Russian string itself**. Translations live in `Resources/ui.<lang>.json` → `strings[<russian>]` (`Strings/UIStrings.swift:15-59`). There is no `ui.ru.json`: Russian renders the key as is. Other locales fall back **own locale → base language → English**, never Russian (`UIStrings.swift:31-36`).
- Locales that ship: `ru, en, ja, de, fr` (`Resources/locales.json`). The default for systems without a matching language is **`en`**. The picker order is ru, en, then the rest by native name (`Content/AppLocale.swift:36-55`).
- "pt" = SwiftUI point ≈ CSS px.
- Content locale fallback for data packs (articles, texts, dossiers): **own → base → en → ru** (`AppLocale.swift:62-72`). Quote translations use **own → base only** (`AppLocale.swift:94-97`, `Content/QuoteReading.swift:13`).
- **Web recommendation (strong):** import `ui.<lang>.json` as the web string catalog and key strings by the Russian source text. That way every string in this spec gets EN/DE/FR/JA for free and stays in sync with the app. §11 prints the translations so the tables can be checked.

---

## 0. TL;DR for the architect

1. The shell has **3 tabs**: «Разборы» (research catalog, the home screen), «Идеи» (ideas catalog) and «Сохранённое» (saved + settings). Each tab has its own navigation stack. A floating capsule tab bar shows **only when the current tab is at its root** (`Clarity/ClarityRoot.swift:57-81`).
2. The research side is **2 screens plus 3 modals**: catalog → article. The article has a bookmark, a table-of-contents sheet («Содержание»), a «…» menu with **one** item («Заметка к разбору» → note sheet) and idea cards that open the idea in a sheet. There is **no share** and **no separate quotes screen**: quotes are inline.
3. **35 topics** (`Content/LaunchEdition.swift:6-18`). With an empty search, they are listed in exactly that order. **Only `interior-design` is free.** Inside it, ideas `interior-design-1…5` are free and **6, 7, 8 are locked** (`Clarity/ClarityContentAccess.swift:6-7`).
4. An article is assembled from `research-editorial.<lang>.json` (prose and structure) plus `rich.<lang>.json` (dossier: quotes and corpus counts) plus `text.<lang>.json` (category names and ideas) plus artwork JSON. The assembly algorithm is in §6 and fits in about 60 lines of TS.
5. The rating, scenario and compare screens (`ClarityRatings.swift`, `ClarityCompareView.swift`) are **dead code in release**. `ClarityAppView` can only be reached from legacy saved-app bookmarks. Do not build these (§2.4).

---

## 1. App shell

### 1.1 Boot states (`Clarity/ClarityRoot.swift:34-83`)

Evaluated top to bottom. The first match wins.

| # | Condition | Screen | Elements (top → bottom) |
|---|---|---|---|
| 1 | Library load failed, or the extra-content pack failed (`library.failure != nil \|\| content.error != nil`) | Error | `ClarityArt(role: .research, size 150)` (decorative stacked-cards illustration, §1.5) · heading «Не удалось открыть материалы» / subtitle «Попробуй загрузить библиотеку ещё раз.» · primary button «Повторить» (reloads both). Padding 26, page background. `ClarityRoot.swift:36-41` |
| 2 | Ideas not yet loaded (`library.ideas.isEmpty`) | Loading | `ClarityArt(.research, 170)` + spinner with label «Открываем материалы…», centered, full screen. `ClarityRoot.swift:42-44` |
| 3 | Onboarding not completed, or a replay was requested from Settings | Onboarding (other spec) | On finish: goal `"sample"` → tab 0 with stack `[research("interior-design")]`, so the **free article opens immediately**. Goal `"catalog"` (after a purchase) → tab 0 with an empty stack. `"replay-close"` → nothing changes. `ClarityRoot.swift:45-55`, `ClarityOnboarding.swift:30-32,123-125,146-151` |
| 4 | Otherwise | Main TabView | See §1.2 |

Global modifiers: tint = accent; foreground = ink; color scheme from `@AppStorage("studio.appearance")`, **default `"light"`**, with values `light|dark|system` (`ClarityRoot.swift:31,84-85`). There is also a root-level paywall sheet, used only by the debug route (`ClarityRoot.swift:87`).

Web mapping: 1 → error page with a retry button. 2 → skeleton or loader. 3 → the onboarding flow (other spec). After onboarding, a non-paying user lands on `/research/interior-design`.

### 1.2 Tabs (`ClarityRoot.swift:57-71`, `ClarityFloatingTabBar.swift`)

| index | Title (RU / EN / DE / FR / JA) | Floating-bar icon (SF Symbol) | a11y id | Root view |
|---|---|---|---|---|
| 0 | «Разборы» / Breakdowns / Analysen / Décryptages / 分析 | `text.book.closed.fill` | `clarity-tab-research` | `ClarityResearchCatalogView` (§3) |
| 1 | «Идеи» / Ideas / Ideen / Idées / アイデア | `lightbulb.fill` | `clarity-tab-ideas` | `ClarityIdeasCatalogView` (other spec) |
| 2 | «Сохранённое» / Saved / Gespeichert / Enregistrés / 保存済み | `bookmark.fill` | `clarity-tab-saved` | `ClarityMyView` (other spec; Settings opens from here as a sheet) |

Behaviour:

- The selected tab is `@State tab = 0`. **Every cold start opens on «Разборы»**, and neither the tab nor the stacks are persisted (`ClarityRoot.swift:24-25`).
- **Each tab keeps its own stack** (`paths: [[ClarityRoute]]`, one array per tab). Switching tabs does not reset the other stacks, and root views keep their state: search queries, filters and scroll position (`ClarityRoot.swift:25,58-70`).
- The native tab bar is hidden everywhere (`.toolbar(.hidden, for: .tabBar)`). Only the custom floating bar is used.
- **The floating bar renders only when `paths[tab].isEmpty`**, i.e. on the three root screens (`ClarityRoot.swift:73-81`). On any pushed screen it is gone. Sheets are drawn over it.
- Tapping the already-selected tab does nothing: there is no pop-to-root or scroll-to-top. It cannot happen while the stack is non-empty anyway, because the bar is hidden then.

Floating bar visuals (`ClarityFloatingTabBar.swift:17-71`):

- Placement: bottom safe-area inset. Padding: horizontal 16, top 10, bottom 8. Centered and **content-width** (not full-width).
- Container: capsule. Fill = surface (`#FFFFFF` / dark `#1D1E22`). Border = line color at 70% opacity, 0.5 px. Shadow = black 12%, blur 18, y 8. Inner padding 6, gap 4 between items.
- Item: button with min height 50 (56 at accessibility text sizes). Icon is 19 pt medium in a 23 px wide box.
  - Selected: accent foreground (`#3458DB` / `#94AAFF`); capsule background accentSoft (`#EDF1FF` / `#262D45`) with a black 4% shadow (blur 3, y 1); horizontal padding 17; **icon + title** (rounded font, subheadline ≈15 pt semibold, 1 line, can shrink to 80%).
  - Unselected: secondary foreground (`#666872` / `#AAADB8`); **icon only**; horizontal padding 13.
  - The selection pill moves between items with a spring animation (response 0.38, damping 0.84). The animation is off when Reduce Motion is on or `studio.motion == false`.
- Accessibility: container id `clarity-floating-tab-bar`; each item has label = title and the `isSelected` trait when selected.

### 1.3 Pushed screens and "Назад" (`ClarityRoot.swift:119-135`, `ClarityBackNavigation.swift`)

Every route pushed onto a tab stack is wrapped in `ClarityDestination`:

- Inline nav bar is visible; the tab bar is hidden.
- The system back chevron is replaced by a **text button «Назад»** (Back / Zurück / Retour / 戻る). It sits top-leading, uses body-medium font, has min height 44 and a11y id `clarity-navigation-back`, and calls `dismiss()` (pop one level) (`ClarityBackNavigation.swift:8-20`).
- The iOS edge-swipe-back gesture is restored for these screens (`ClarityBackNavigation.swift:25-57`). **Web:** browser back and in-app «Назад» must be equivalent. «Назад» pops one level of the current tab's stack, i.e. `history.back()` when the previous entry is in-app; otherwise go to the tab root.

### 1.4 Modal presentations used by the shell and the research side

| Modal | Opened from | Presentation | Close control |
|---|---|---|---|
| Table of contents «Содержание» | article toolbar | sheet (NavigationStack + List) | «Готово» (confirmation, top-trailing) or drag down |
| Note editor «Моя заметка» | article «…» menu; locked-preview button | sheet | «Отмена» (leading) / «Сохранить» (trailing); interactive dismiss is blocked while there are unsaved changes |
| Idea reader | tapping an **unlocked** idea card anywhere (catalog or article) | sheet, `.large` detent, drag indicator visible, own NavigationStack | «Готово» top-**leading** (`ClarityIdeaCard.swift:74-90`) |
| Paywall | locked idea card; locked-preview CTA | sheet (`ClarityPaywallView`, other spec) | own controls; **closes itself automatically when access becomes unlocked** (`ClarityContentAccess.swift:63-65`) |
| Settings | «Сохранённое» gear | sheet (other spec) | own header |

### 1.5 Shared visual tokens and components (used by every screen below)

Palette (`Studio/StudioStyle.swift:5-21`, `Clarity/ClarityStyle.swift:3-18`, `Clarity/ClarityReadingStyle.swift:6`). Values are light / dark.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `paper` (page background) | `#F5F5F7` | `#111214` | catalogs, locked preview |
| `readingPaper` | `#FCFCFD` | `#17181B` | article, note sheet, TOC sheet |
| `surface` | `#FFFFFF` | `#1D1E22` | cards, search field, tab bar |
| `ink` | `#191A20` | `#F2F2F5` | text |
| `secondary` | `#666872` | `#AAADB8` | secondary text |
| `accent` | `#3458DB` | `#94AAFF` | selected tab, lock on idea cards |
| `action` | `#3458DB` | `#3458DB` | primary button fill (white text) |
| `accentSoft` (= `mint` = `lilac` = `sky`) | `#EDF1FF` | `#262D45` | free badge, selected pill, row icon tile |
| `soft` | `#EBECF0` | `#28292F` | idea-card fallback art background |
| `line` (= `rule`) | `#DEDFE5` | `#383A42` | dividers, borders, quote rule |
| `danger` (coral) | `#C0443F` | `#F4928C` | errors |

Typography (`ClarityReadingStyle.swift:12-19`). Georgia is the reading serif; everything else is the system sans (SF). Sizes follow Dynamic Type, so on web use rem.

| Style | Font | Size | Notes |
|---|---|---|---|
| `title` | Georgia | 30 | page and article titles |
| `lead` | Georgia | 20 | hero description, first paragraph of «Главное» |
| `body` | Georgia | 19 | article paragraphs; line spacing +6 (≈1.55 line-height) |
| `quote` | Georgia | 20 | quotes; line spacing +7 |
| `cardTitle` | Georgia | 22 | catalog card and idea card titles |
| `sectionTitle` | system title2 semibold | 22 | section **and** observation headings |
| `subheading` | system headline semibold | 17 | audience titles, direction titles |
| `caption` | system footnote | 13 | quote glyph, idea-card category |

Components:

- **`ClarityHeading`** (`ClarityStyle.swift:114-127`): title in Georgia 30 ink (header trait); optional subtitle in Georgia 19, secondary, line spacing 5; gap 10; left-aligned.
- **`ClaritySearch`** (`ClarityStyle.swift:129-146`): row with min height 56 and horizontal padding 18, on a surface background with radius 16. Contents: magnifier icon (18 pt, secondary), gap 12, text field (body; placeholder in secondary; autocorrect off; return key = "search", which only dismisses the keyboard). When text is non-empty, a clear button appears (`xmark.circle.fill`, 32×32, a11y label «Очистить поиск»).
- **`clarityCard()`** (`ClarityStyle.swift:105-112`): padding 22, full width, surface background, radius 20, border line at 55% / 0.5 px.
- **`ClarityButton`** (`ClarityStyle.swift:90-103`): full-width capsule, `action` fill, white headline text, vertical padding 18 and horizontal 20, optional trailing icon. Pressed state scales to 0.97 at 88% opacity.
- **`ClarityRow`** (`ClarityStyle.swift:148-162`): 48×48 icon tile (accentSoft, radius 16) plus title (headline) and optional subtitle (subheadline, secondary).
- **`ClarityArt`** (`ClarityStyle.swift:26-88`): decorative vector of three tilted rounded cards with an SF icon and fake text lines. It gently floats while motion is on. Used only on the boot and error screens.

---

## 2. Route map

### 2.1 `ClarityRoute` (`ClarityRoot.swift:3-7`) → destination (`ClarityRoot.swift:119-135`)

| Route case | Params | Renders | Reached from (release build) | Reachable in release? | Proposed web URL (non-binding) |
|---|---|---|---|---|---|
| `.research(category)` | category slug | `ClarityResearchView` (§5) | research catalog card (`ClarityCatalogs.swift:55`); onboarding finish "sample" (`ClarityRoot.swift:50`); locked-preview link «Сначала прочитать бесплатный разбор» (`ClarityContentAccess.swift:92-100`); idea reader «Читать разбор категории» (`ClarityReader.swift:545-548`); problem reader (`:697`); saved row of kind research (`ClarityMy.swift:152,256`); legacy card source link (`ClarityLegacyCard.swift:96-104`) | **Yes** | `/research/[category]` |
| `.idea(slug)` | idea slug | `ClarityIdeaView` (ideas spec) | Saved rows (idea kind, comparison, project → «Открыть исходную идею») (`ClarityMy.swift:211,256,329`); idea reader «Связанное решение» (`ClarityReader.swift:534`); legacy card (`ClarityLegacyCard.swift:20-21`). Note: **idea cards do not push this route; they open a sheet** (§5.9) | Yes | `/ideas/[slug]` |
| `.problem(id)` | problem id (`studio.json`) | `ClarityProblemView` (§10.1) | Saved rows of kind problem (legacy bookmarks only) (`ClarityMy.swift:173,256`) | Only with legacy data | `/saved/problems/[id]` (optional) |
| `.legacyCard(category, cardID)` | category, deck-card id | `ClarityLegacyCardView` (§10.2) | Saved «Карточки» group (legacy) (`ClarityMy.swift:189`) | Only with legacy data | skip on web |
| `.storedProject(id)` | idea slug | `ClarityStoredProjectView` (§10.3) | Saved «Проекты» group (legacy) (`ClarityMy.swift:201`) | Only with legacy data | skip on web |
| `.app(category, appID)` | category, App Store id | `ClarityAppView` (§2.4) | Saved «Приложения» group (legacy saved apps) (`ClarityMy.swift:177`) | Only with legacy data | skip on web |
| `.ratings(category)` | category | **redirects** to `ClarityResearchView(category)` | nothing pushes it in release | No | redirect → `/research/[category]` |
| `.scenario(category, _)` | category, scenario name | **redirects** to `ClarityResearchView(category)` | nothing pushes it in release | No | redirect → `/research/[category]` |

Deep links: **none**. The app has no URL scheme, universal links or `onOpenURL` (verified by grep). Web URLs are therefore new. Keep slugs identical to the app's (`category` = `LaunchEdition` slug; idea slug = `facts.json` slug).

### 2.2 Tab roots (not routes)

| Tab | Proposed URL | Content |
|---|---|---|
| 0 «Разборы» | `/research` (possibly also the logged-in home) | §3 |
| 1 «Идеи» | `/ideas` | ideas spec |
| 2 «Сохранённое» | `/saved` (Settings as `/saved/settings` or a modal) | saved spec |

### 2.3 Debug launch names (DEBUG builds only; `ClarityRoot.swift:90-116`, `Studio/StudioRuntime.swift:4-14`)

Launch argument `-clarityScreen <name>` (aliases `-studioScreen`, `-deckScreen`). Applied **once** per launch.

| name | Effect |
|---|---|
| `researches` | tab 0 (catalog) |
| `ratings`, `category`, `scenario`, `research`, `niche`, `overview` | tab 0 + push `.research(<UserDefaults "clarityCategory"> ?? "calendars-tasks")` |
| `app` | tab 0 + push `.app("calendars-tasks", <first rated app id>)` (RU data only) |
| `legacy-card` | tab 2 + push the first deck card of `calendars-tasks` |
| `idea` | tab 1 + push `.idea(<UserDefaults "clarityIdea"> ?? "habit-tracking-1")` |
| `ideas` | tab 1 |
| `saved`, `library` | tab 2 |
| `settings` | tab 2 + open Settings sheet |
| `onboarding` | replay onboarding |
| `paywall` | root paywall sheet |
| anything else (e.g. `home`) | no-op → catalog |

Other debug flags: `-studioShowOnboarding`, `-clarityWelcomeStep 0…4`, `-studio.appearance light|dark`, `-appLocale <code>` (`AppLocale.swift:112-115`). There is also a debug access preview (Settings → «Меню разработчика»: «Как в App Store» / «Бесплатно» / «Plus»; `Store/Purchases.swift:40-66`). **Web suggestion:** mirror it as a staff-only `?access=free|plus` override for QA.

### 2.4 Is `ClarityRatings.swift` reachable in release? **No (effectively).**

- `ClarityRatingsView` («Рейтинги»), `ClarityCategoryRatingView` («Рейтинг»), `ClarityScenarioView` («Выбор по задаче»), `ClarityRatingMethodView` («Об оценках»), `ClarityComparisonPicker` / `ClarityCompareView` («Сравнение») have **no call sites** (grep). The `.ratings` and `.scenario` routes resolve to the research article (`ClarityRoot.swift:124,126`).
- `ClarityAppView` (`ClarityRatings.swift:234-333`) is reachable only through Saved → «Приложения», which appears only when the device has legacy entries in `UserDefaults["inapp.clarity.saved-apps.v1"]` (`ClarityAppShelf.swift:18`). The only control that adds an entry is inside `ClarityAppView` itself, so new users can never get there. Also, the `rating` branch exists **only** in `rich.ru.json`, not in `rich.en.json`. In en/de/fr/ja the screen would show «Приложение недоступно». This matches `Documentation/Localization/README.md` ("ветка `rating` … экран, недостижимый в релизной сборке").
- **Recommendation:** do not build ratings, scenarios, compare or the app screen for the web. If the old site already has similar pages, leave them under `/old`.

### 2.5 Other dead code on this side (do not build)

`ClarityHomeView` (compat wrapper, `ClarityHome.swift`); `ClarityIllustratedResearchCover` (`ClarityResearchArtwork.swift:125-149`); `ResearchEditorial.Observation.otherQuotes` (`ResearchEditorial.swift:41-46`, never called); the whole legacy chapter reader in §6.11 (unreachable with the shipped data).

---

## 3. Screen: Research catalog (tab 0 root) — `Clarity/ClarityCatalogs.swift:3-157`

### 3.1 Layout (top → bottom)

The page is a vertical list with 24 px gaps. Padding: horizontal 20, top 24, bottom 24. Max width 680, centered. Background `paper`. **No nav bar.** Keyboard dismisses on scroll.

1. **`ClarityHeading`**: title «Разборы», subtitle «Что людям важно в приложениях и чего им не хватает.» (anchor id `research-top`). `ClarityCatalogs.swift:43-44`
2. **Search** (`ClaritySearch`) with placeholder «Категория или потребность». a11y id `clarity-research-search`. `:45-46`
3. **Result count**, only when `query` is non-empty (**untrimmed**: a query of spaces also shows it): «Найдено: %1$@», with the count formatted in the current locale. Subheadline, secondary. `:47-49`
4. **Empty state**, when the result list is empty: a `clarityCard` with «Пока ничего не нашлось» (headline) and «Попробуй название категории или более короткий запрос.» (subheadline, secondary). a11y id `clarity-catalog-empty`. `:51-53,232-242`
5. **Cards**, one per topic in `orderedResults` (§3.3). Each is a link to `.research(slug)`. a11y id `clarity-research-<slug>`. `:54-66`
6. **"Coming soon" block**, only when `query.isEmpty`: heading «Готовим следующие разборы» (`subheading` = system headline 17 semibold, header trait) and body «Велоспорт, йога и определение растений и животных.» (`body` = Georgia 19, line spacing 5), 12 px gap. Vertical padding 28. a11y id `clarity-research-coming-soon`. `:67-76`

Behaviour:

- Any change to `query` scrolls the list back to the top (`:81`).
- The tab bar floats over the bottom of the list.
- The query persists while the tab stays alive (switching tabs, pushing an article and coming back). It is lost on relaunch. **Web:** keep it in `?q=`.

### 3.2 Catalog card (`ClarityResearchCatalogCard`, `ClarityCatalogs.swift:89-157`)

- Card: surface background, **radius 28**, border line at 65% / 0.7 px, shadow black 5.5% (blur 16, y 6). The whole card is the tap target and uses the press style (scale 0.97).
- **Image**: the cover artwork at **3:2**, full card width, no own radius (the card clips it). Alt is hidden (decorative). If there is no artwork, the fallback is a linear gradient mint→lilac (both = accentSoft) with the SF icon from `categorySymbol(slug)` at 64 pt light in accent (`:106-112`; `Studio/StudioStyle.swift:45-57`). All 35 topics have artwork, so the fallback never shows today.
- **Body** (padding 22, 10 px gaps):
  - Row: title = category name (Georgia 22, line spacing 2). If locked, a trailing `lock` icon (subheadline, secondary; a11y label «Полный разбор в Plus»; id `clarity-research-lock-<slug>`). `:115-128`
  - Summary: `ClarityReading.nicheSummary(slug)` = the article's `summary` field (system body 17, line spacing 4, secondary). `:129-133`
  - If this is the free category (`interior-design`), a badge «Бесплатный разбор»: caption semibold, padding 12/7, accentSoft capsule, top margin 5, id `clarity-free-research-badge`. **The badge shows for Plus users too**, because it depends only on `isFree`. `:134-141`
- `locked = !(isUnlocked || slug == "interior-design")` (`:62`, `ClarityContentAccess.swift:17-19`). Locked cards **still navigate**: the article route shows the locked preview (§5.1).
- Accessibility: the card is combined into one element. Label = title, or «%1$@. Бесплатный разбор.» for the free topic. Hint = summary, or «%1$@ Полный разбор в Plus.» (with the summary as %1$@) when locked. `:151-155`

### 3.3 Ordering (`ClarityCatalogs.swift:14-37`)

- Base set: `library.niches` filtered to `LaunchEdition.contains(slug)` **and** matching the query (§4).
- **Empty query:** first, "illustrated" topics in **`LaunchEdition.categories` order**, where illustrated means an editorial article exists for the locale **and** cover artwork exists (`:7-13,16-18`). Then any remaining topics, sorted by name. With the shipped data all 35 are illustrated, so **the order is exactly §7**.
- **Non-empty query:** sort by relevance, then name. Details in §4.3.

---

## 4. Search on the research catalog (`ClarityCatalogs.swift:23-37`, `Studio/StudioDomain.swift:79-82`, `Content/ResearchEditorial.swift:85-95`)

### 4.1 Fields searched, per topic

`[niche.name] + article.searchText`, where `searchText` is, in order:

1. `summary`
2. `lead`
3. every audience's `title` and `body`
4. for every section: `section.title`, then every observation's `title` and `body`
5. every direction's `title` and `body`
6. `conclusion.title` and `conclusion.body` (if present)

**Not searched:** `section.intro`, quotes (original or translated), idea titles and texts, the corpus sentence, artwork alt texts.

Fallback when a topic has no editorial article (never happens with the shipped data): `niche.name` + `dossier.audience.segments[].job`.

Everything comes from the **current content locale** pack (§6.1).

### 4.2 Matching rule (`StudioContent.matches`)

- Split the query on whitespace into tokens. **A topic matches when every token is a substring of at least one field.** Different tokens may hit different fields.
- Substring test = Foundation `localizedStandardContains`: case-insensitive, diacritic-insensitive and locale-aware.
- Web equivalent: `normalize('NFD')`, strip `\p{M}`, `toLocaleLowerCase(locale)` on both sides, then `includes`. Diacritic-insensitivity means `ё` matches `е`, and also `й` matches `и` (the breve is a combining mark in NFD).
- An empty or whitespace-only query has zero tokens, so **everything matches**.
- There is no minimum length, no stemming, no fuzzy matching, no highlighting and no debounce (it filters on every keystroke).
- Paid article bodies are searchable by free users; the results reveal only title and summary. **Web:** if the search index lives on the server, return only slugs and scores, never matched body text, for locked topics.

### 4.3 Ranking when the query is non-empty

1. Relevance bucket: **0** if all tokens occur in `niche.name`; **1** if all tokens occur in the summary; **2** otherwise (`:29-33`).
2. Ties are broken by `name` in ascending order using `localizedStandardCompare`. Web: `Intl.Collator(locale, {numeric: true}).compare`.
3. Edge case: a whitespace-only query is "non-empty", so it gets **alphabetical order** instead of the editorial order, plus the «Найдено: 35» line, and the coming-soon block is hidden.

---

## 5. Screen: Research article (`.research(category)`) — `Clarity/ClarityReader.swift:87-445`

### 5.1 Access gate / locked preview (`ClarityContentAccess.swift:24-138`)

Resolution order (`ClarityReader.swift:87-97`):

1. `library.niche(category) == nil` → **Missing material** (§5.2). This covers unknown slugs, and archive categories in non-RU locales (those locales only load the 35 topics' ideas, so only 35 niches exist).
2. Otherwise → `ClarityCategoryContentGate`:
   - `allowed = isUnlocked || category == "interior-design"`.
   - Allowed → the full article (§5.3+).
   - Not allowed → the **locked preview**. The article body is *not built at all*: no blurred text.

**Locked preview layout** (`ClarityContentAccess.swift:68-122`): a scroll page with padding 22 and 24 px gaps, max width 640, background `paper`. Nav title «Разбор» (inline). Toolbar shows **only «Назад»** (no bookmark, TOC or menu). a11y id `clarity-content-locked`.

1. Cover artwork (3:2, radius 20), if available.
2. `ClarityHeading`: title = category name; subtitle = `summary`. The **corpus sentence is not shown** here. id `clarity-locked-title`.
3. `clarityCard` (16 px gaps) containing:
   - A label with a `lock` icon: «Полный материал в Plus» (headline).
   - «Все разборы и идеи — в одной подписке.» (body, secondary, line spacing 4).
   - `ClarityButton` «Открыть все материалы» → paywall sheet (id `clarity-content-paywall`).
   - A text link «Сначала прочитать бесплатный разбор» (subheadline medium, min height 44) → **pushes** `/research/interior-design` onto the current stack (id `clarity-content-free-sample`).
4. Outside the card: a button with a `square.and.pencil` icon, «Моя заметка к материалу» (body medium, min height 44) → note sheet (§5.7) for reference `research:<slug>`, with title = category name (id `clarity-locked-note`). **Free users can write notes on locked topics**, and saving a note also bookmarks the topic (§5.7).

When `purchases.isUnlocked` becomes true, the paywall sheet closes and the gate re-renders into the full article without navigating (`:63-65`).

### 5.2 Missing material (`ClarityReader.swift:814-818`)

A centered empty state with the icon `doc.text.magnifyingglass`, title «Материал недоступен» and description «Вернись в каталог и выбери другой материал. Сохранённые записи остаются на устройстве.» The nav bar has «Назад» only.

### 5.3 Toolbar (article allowed) — `ClarityReader.swift:193-204`

- Nav title is **empty**. The bar is visible and the tab bar hidden.
- Leading: «Назад».
- Trailing group, left to right (each icon is 17 pt medium in a 38×44 hit box, `:791-794`):
  1. **Bookmark** (`ClarityMaterialSave`, §5.6). Icon `bookmark` / `bookmark.fill`.
  2. **Contents**: `list.bullet` icon, a11y label «Содержание разбора», id `clarity-research-contents` → TOC sheet (§5.5).
  3. **«…» menu**: `ellipsis` icon, a11y label «Действия с разбором». **Exactly one item:** «Заметка к разбору» with icon `square.and.pencil` → note sheet (§5.7).
- **No share action, no "copy link" and no export** on the research article. Export exists only on ideas (and includes the research article, §6.12).

### 5.4 Layout top → bottom (editorial article; the only path with shipped data)

The container is a single scroll column with **32 px** gaps between blocks. Padding: horizontal 22, top 24, bottom 56. **Max width 640**, centered. Background `readingPaper`. Text `ink`. Tint (links, controls) = `ink`. Code: `ClarityReader.swift:153-192`.

| # | Block | Anchor id | Content and source | Code |
|---|---|---|---|---|
| 1 | **Hero** | — | Title = category name (`text.<lang>.categories[slug]`), Georgia 30, header trait, id `clarity-research-title`. Description = `summary + " " + corpusSentence` (§6.10), Georgia 20 (`lead`), secondary, line spacing 6, **selectable**, id `clarity-research-description`. Gap 18, vertical padding 4. | `:158`, `:719-743`, `:419-437` |
| 2 | **Cover image** | — | Cover artwork at 3:2, **radius 20**, **full-bleed** within the 640 column (negative horizontal margin −22, so it reaches the screen edge on phones; corners stay rounded). Alt = artwork label. id `clarity-research-art-<artId>`. | `:159-162` |
| 3 | **«Главное»** section | `introduction` | `ArticleSection(title: «Главное»)` + `ArticleText(article.lead, lead: true)`: the first reflowed paragraph is in `lead` (Georgia 20), the rest in `body`. Fallback text if `lead` is missing: «Полный текст этого разбора пока не добавлен.» | `:163`, `:234-238` |
| 4 | **«Какие задачи решают люди»** (only if `audiences` is non-empty) | `audience` | `ArticleSection` → audiences artwork (3:2, r20; not full-bleed) → for each audience (a divider **between** items): `title` (headline semibold 17) + `ArticleText(body)`, 9 px gap. | `:165`, `:240-251` |
| 5 | **One section per `article.sections[]`** | `theme-<section.id>` | `ArticleSection(title: section.title)`, id `clarity-research-theme-<id>`. Contents: `ArticleText(section.intro)` if non-empty → section artwork if any (only `interior-design` / `finish`) → observations (§5.4.1). | `:166-168`, `:253-288` |
| 6 | **«Другие возможности»** (only if unplaced directions remain) | `directions` | `ArticleSection` id `clarity-research-directions` → each remaining placement (§5.4.2). **Never renders with shipped data.** | `:169-171`, `:305-311` |
| 7 | **«Другие идеи категории»** (only if category ideas remain that no direction linked) | `ideas` | `ArticleSection` → idea cards (14 px gaps). **Never renders with shipped data.** | `:172-174`, `:405-417` |
| 8 | **Conclusion** (if `conclusion`) | `conclusion` | `ArticleSection(title: conclusion.title)`, id `clarity-research-conclusion` + `ArticleText(conclusion.body)` (id `clarity-research-conclusion-body`). All 35 topics have one. | `:175-180` |

`ArticleSection` (`:745-761`): 20 px gaps. A hairline divider (line color) with 4 px bottom margin, then the heading (`sectionTitle`: system 22 semibold, header trait), then the content.

`ArticleText` (`:763-775`): renders `ClarityReading.paragraphs(text)` (§6.7) as separate paragraphs with 20 px gaps, Georgia 19, line spacing 6, **selectable**, full width.

#### 5.4.1 Observation block (inside a section) — `ClarityReader.swift:259-286`

- Between observations: a hairline divider with 12 px vertical margin.
- Each observation is a column with **18 px** gaps and anchor `observation-<obs.id>`:
  1. Title (`sectionTitle`, the same style as the section heading, header trait), id `clarity-research-observation-<id>`.
  2. **Interleaved passages and quotes.** Let `P = observation.paragraphs` (split on blank lines, §6.7) and `Q = flow.quotes(for: observation)` (§6.5). For `i in 0..<max(P.count, Q.count)`:
     - if `P[i]` exists → `ArticleText(P[i])` (id `clarity-research-passage-<obsId>-<i>`);
     - if `Q[i]` exists → inline quote (§6.8);
     - if `i == 0` and observation artwork exists → artwork (3:2, r20, 8 px vertical margin). **The artwork comes after the first paragraph and the first quote.**
  3. The direction placements for this observation, in `article.directions` order (§5.4.2).

#### 5.4.2 Direction placement ("editorial idea") — `ClarityReader.swift:290-303`

A column with 18 px gaps and 12 px top padding:

- **If the placement has no ideas** → direction `title` (headline semibold). With shipped data this never happens: every direction has at least one idea.
- If `direction.body` is non-empty → `ArticleText(body)`. Only 42 of 225 directions have a body; for the rest, only cards show.
- For each idea (max 3 per direction; 61 directions have more than one) → an **idea card** (§5.9), id `clarity-research-idea-<slug>`.
- The direction title is **not shown** when there are ideas.

### 5.5 Table of contents sheet (`ClarityReader.swift:131-151, 205-226`)

- Sheet with a NavigationStack. Title «Содержание» (inline). A confirmation button «Готово» top-trailing closes it. The list background is `readingPaper`; tint is ink.
- Items (`contentsItems`, editorial path):
  1. «Главное» → `introduction`
  2. «Какие задачи решают люди» → `audience` (only if `audiences` is non-empty)
  3. For each section: `section.title` → `theme-<id>`, then each observation's `title` → `observation-<id>` at **depth 1**
  4. «Другие возможности» → `directions` (if remaining directions)
  5. «Другие идеи категории» → `ideas` (if remaining ideas)
  6. `conclusion.title` → `conclusion` (if present)
- Row: depth 0 uses the **headline** font; depth 1 uses **body** with a 14 px left indent; 11 px vertical padding; full-width button; id `clarity-research-jump-<id>`.
- Tap → remember the target and close the sheet. **After the sheet finishes dismissing**, scroll the article so the anchor is at the **top**, animated easeInOut 0.25 s (no animation under Reduce Motion).
- The typical TOC has 1 + 1 + (2–3 sections × (1 + 2–4 observations)) + 1 ≈ 14–16 rows.
- **Web:** `#introduction`, `#audience`, `#theme-<id>`, `#observation-<id>`, `#directions`, `#ideas`, `#conclusion` should be real fragment anchors (with `scroll-margin-top` equal to the sticky header height). Desktop may show the TOC as a sticky sidebar; mobile should use a bottom sheet.

### 5.6 Bookmark (`ClarityReader.swift:796-812`)

- Reference: `{kind: "research", slug: <category>}`. It toggles in `StudioNotebook.saved` (newest first, inserted at index 0). Storage key `inapp.studio.notebook.v1`, archive format `{version: 1, saved: [{kind, slug}], notes: {"research:<slug>": text}, decisions: {}}` (`Studio/StudioNotebook.swift:52-130`).
- Icon `bookmark` → `bookmark.fill`. A11y label «Сохранить» / «Убрать из сохранённого»; value «Не сохранено» / «Сохранено». id `clarity-save-research-<slug>`. Selection haptic on change.
- Disabled if the notebook archive failed to load (`persistenceError`).
- No toast or confirmation. The item appears in «Сохранённое» → «Разборы» with a thumbnail of the cover (other spec).
- It is only present on the unlocked article; the locked preview has no bookmark button.

### 5.7 Note sheet (`ClarityMaterialNote`, `ClarityReader.swift:898-948`)

- Sheet with a NavigationStack. Nav title «Моя заметка». Leading «Отмена», trailing «Сохранить» (semibold, id `clarity-note-save`). Tint ink.
- Body (scroll; padding 22/24; 22 px gaps; max width 640; `readingPaper`):
  1. The material title (category name) in Georgia 30.
  2. A multi-line text field with placeholder «Что хочется запомнить или проверить?» (9–24 visible lines, padding 20, surface background, **radius 26**), id `clarity-note-text`. Pre-filled with the existing note on first appearance.
  3. The persistence error text, if any (subheadline, secondary).
  4. Footnote: «Заметка хранится на этом устройстве. Удаление материала из сохранённого не удаляет заметку.»
- **Save:** write the note (whitespace-only text **deletes** the note), then **if the material isn't bookmarked, bookmark it** (this runs even when the note was emptied), then close. On a persistence error the sheet stays open.
- **Cancel:** if the text changed, a confirmation dialog «Не сохранять изменения?» offers «Не сохранять» (destructive; closes) and «Продолжить редактирование» (cancel). Otherwise the sheet closes. Swipe-to-dismiss is **disabled** while there are changes.
- Removing a bookmark never deletes the note. Notes on un-bookmarked materials show up under Saved → «Заметки».
- **Web note:** the copy «хранится на этом устройстве» is false if notes sync to an account (open question Q3).

### 5.8 Interactions summary for the article

| Interaction | Result |
|---|---|
| «Назад» / browser back | Pop to the previous screen in this tab (catalog, idea sheet stack, saved…). |
| Bookmark | Toggle saved (§5.6). |
| Contents | TOC sheet (§5.5). |
| «…» → «Заметка к разбору» | Note sheet (§5.7). |
| Tap an idea card (unlocked) | Idea reader **sheet** (§5.9). |
| Tap an idea card (locked) | Paywall sheet. |
| Text | Every paragraph, quote and the hero description are selectable and copyable. |
| Share / export / translate toggle / expand quotes / "show original" | **Do not exist.** |

### 5.9 Idea cards inside the article and the idea sheet (`Clarity/ClarityIdeaCard.swift`)

- A full-width card (the same component as the ideas catalog; details in the ideas spec). Surface background, **radius 24**, border line at 65% / 0.7, shadow black 5% (blur 14, y 6), 6 px bottom margin.
- Art (3:2) first. Then, **only when unlocked**: title (Georgia 22) = `idea-cards.<lang>.json[slug].title` ?? idea title; description (Georgia 19, secondary) = `…description` ?? `oneLiner`; category name (footnote, secondary). Padding 20.
- **Locked** (`!(isUnlocked || slug ∈ interior-design-1…5)`): **art only**, plus a `lock.fill` badge bottom-right (accent on a surface circle, padding 14, inset 16). No title or description in the DOM or accessibility tree; a11y label «Идея в Plus», hint «Подробности идеи доступны в Plus.» Tap → paywall sheet.
- Unlocked tap → a sheet with its own navigation stack: `ClarityIdeaView(slug)`, «Готово» top-**leading** closes it (id `<cardId>-close`), large detent with drag indicator. Inside the sheet, «Читать разбор категории» **pushes the research article inside the sheet stack** (with «Назад»), so research ↔ idea can nest.
- **Web:** open ideas from articles as a modal or drawer over the article (e.g. a Next.js intercepted route `/ideas/[slug]` over `/research/[category]`). Closing returns to the same scroll position. A direct hit on `/ideas/[slug]` renders the standalone page.

---

## 6. How an article is assembled (data → screen)

### 6.1 Data files (bundle, `Inapp/Resources/`)

| File | Loader | Locale chain | Fields used on the research side |
|---|---|---|---|
| `research-editorial.<lang>.json` `{version: 1, locale, editedAt, categories: {<slug>: Article}}` | `ResearchEditorial.article(slug, locale)` (`ResearchEditorial.swift:107-111`) | own → base → en → ru. The **first existing pack wins as a whole file**, not per category. ru has 72 categories; en/de/fr/ja have the 35. | `summary, lead, audiences[], sections[], directions[], conclusion` |
| `rich.<lang>.json` `{version, locale, dossiers: {<slug>: ResearchDossier}}` | `Library.reload` (`Content/Library.swift:41-56,162-193`) | own → base → en → ru. **Only `rich.ru.json` and `rich.en.json` exist**, so de/fr/ja read the English dossier. The RU pack gets exact-match editorial overrides applied at load, except inside quote subtrees (`Studio/StudioEditorial.swift:47-64`). | `corpusApps`, `corpusReviews`, `findings[].id`, `findings[].evidence[] {app, rating, quote, translation}` |
| `text.<lang>.json` `{categories: {slug: name}, ideas: {slug: IdeaText}}` | same | own → base → en → ru | category **name**; which ideas exist in the locale (en/de/fr/ja: 293 launch ideas; ru: 592) |
| `facts.json` | once | — | idea slug → category and `rank` (ordering of «Другие идеи категории») |
| `quote-translations.<lang>.json` `{version: 1, translations: {<original>: <translated>}}` | `QuoteReading` (`Content/QuoteReading.swift:13-25`) | **own → base only** | quote display text |
| `launch-research-artwork.json` + handcrafted table in `ClarityResearchArtwork.swift:47-86` | §6.9 | — | cover, audiences and observation images |
| `idea-cards.<lang>.json` | `ClarityIdeaCardCopy` | own → base → en → ru | idea card title and description |
| `editorial-reading.ru.json`, `research-idea-contexts.ru.json` | `EditorialContent.idea(slug)` | own → base → en → **ru** (only RU files exist, so every locale reads them) | `canonicalSlug` (idea de-duplication, §6.4) |

`Article` schema (`ResearchEditorial.swift:7-96`):

```
Article      { category, summary, lead, audiences: Audience[], sections: Section[], directions: Direction[], conclusion?: {title, body} }
Audience     { title, body, sourceFindingIDs: string[] }
Section      { id, title, intro, observations: Observation[] }
Observation  { id, title, body, sourceFindingIDs: string[], quoteRefs: {findingID, quoteIndex}[] }
Direction    { id, title, body, sourceFindingIDs: string[], observationID?: string, ideaSlugs: string[] }
```

Text fields use `\n\n` as the paragraph separator. `section.id` and `observation.id` are stable, locale-independent ids (e.g. `visualize`, `decision`) and double as anchors and artwork keys.

### 6.2 Assembly order (editorial path)

```
hero(name, summary + " " + corpusSentence?)
cover artwork
«Главное»: lead
if audiences: «Какие задачи решают люди»: audiencesArt?, audiences[]
for section in sections:
    section.title: intro?, sectionArt?,
    for obs in section.observations:
        obs.title
        interleave(obs.paragraphs, flow.quotes(obs), obsArt after index 0)
        for placement in flow.directions(obs): placement
if flow.remainingDirections: «Другие возможности»: placements
if flow.remainingIdeas:      «Другие идеи категории»: idea cards
if conclusion: conclusion.title: conclusion.body
```

### 6.3 Placing directions under observations (`Clarity/ClarityResearchFlow.swift:24-51`)

For each `direction` in `article.directions` order:

1. If `direction.observationID` names an observation in this article → assign it there.
2. Otherwise, pick the observation with the **largest overlap** between `direction.sourceFindingIDs` and `observation.sourceFindingIDs`. Observations are scanned in article order, and **ties keep the earlier observation** (strictly-greater comparison). Overlap 0 → **unassigned**.
3. Within an observation, directions keep article order.

With shipped data, all 225 directions in the 35 topics carry a valid `observationID`, so step 2 is only a fallback.

### 6.4 Ideas per placement and de-duplication (`ClarityResearchFlow.swift:53-70`; `ClarityReader.swift:7-17`)

- A single `seenIdeas` set is shared by the **whole article**. Walk the observations in article order (sections → observations); for each observation walk its assigned directions; then walk the unassigned directions.
- For each direction: `ideaSlugs` → resolve each slug to an idea that exists in the current locale's `text` pack (drop unknown ones) → `canonicalIdeas()` → drop any slug already in `seenIdeas`.
- A placement is **dropped** when it ends up with no ideas **and** an empty body.
- `canonicalIdeas(list)`: replace each idea by `EditorialContent.idea(slug).canonicalSlug` when that idea exists, **unless** the original is in the launch edition and the canonical one is not. De-duplicate while keeping order. Shipped mappings are `photo-editing-2 → ai-photo-restore-1` and `ai-avatars-headshots-5 → ai-photo-restore-1`; the first is blocked by the launch rule, so **no effect on the 35 topics**. Implementing it as identity is acceptable, but keep the hook.
- `remainingIdeas` = `canonicalIdeas(ideas in category sorted by facts.rank)` minus `seenIdeas`. **Empty for all 35 topics in all 5 locales** (verified): every idea in a topic is linked from some direction.

### 6.5 Quotes per observation (`ResearchEditorial.swift:33-50`; `ClarityResearchFlow.swift:72-79`)

- `selectedQuotes(obs)`: for each `quoteRef` in order → `dossier.findings.find(id == ref.findingID)?.evidence[ref.quoteIndex]`. Skip refs that do not resolve. De-duplicate by `app + "\u001F" + quote`.
- Across the article, walk the observations in order and **drop any quote (keyed by app + original quote) that already appeared in an earlier observation**. Each quote appears once per article.
- Totals across the 35 topics: 792 quote refs; **758 visible after article-level de-duplication** (matches `Documentation/Localization/README.md`). Usually 2–3 quotes per observation.

### 6.6 Interleaving

As in §5.4.1: paragraph *i*, then quote *i*. Extra quotes stack after the last paragraph, and extra paragraphs continue without quotes. The observation image goes right after paragraph 0 and quote 0. The rule in the code comment: "A quotation follows the complete authored passage" (`ResearchEditorial.swift:25-31`).

### 6.7 Paragraph splitting and reflow (`ClarityReader.swift:45-62`, `ResearchEditorial.swift:27-31`)

- `Observation.paragraphs`: split `body` on `"\n\n"`, trim, drop empty. **This split defines the interleaving slots.**
- Every text block (`ArticleText`) is then reflowed for display:
  1. Apply exact-match editorial overrides (RU only; **0 hits** in the editorial articles today, so this step can be skipped on web).
  2. Replace NBSP (U+00A0) with a space.
  3. Split on `"\n\n"`, trim, drop empty.
  4. Any paragraph **longer than 430 characters** is split at **sentence boundaries** into chunks: add sentences to `current`; if `current` is non-empty and `current.length + sentence.length > 360`, push `current` and start a new chunk. Sentences are never dropped.
- Web: use `Intl.Segmenter(locale, {granularity: 'sentence'})`. Lengths are in Swift `Character`s, i.e. grapheme clusters; `Intl.Segmenter('grapheme')` gives an exact match, while `.length` is close enough for Cyrillic and Latin.
- Tip: do the reflow at build time and ship pre-split paragraphs.

### 6.8 Quote display and translation (`ClarityReader.swift:447-458, 858-876`; `QuoteReading.swift`)

Visual (inline research quote):

- A 2 px vertical rule on the left (line color), 18 px left padding, 10 px vertical padding, then an extra 8 px vertical margin.
- Inside (12 px gap): the `quote.opening` glyph (“, footnote size, secondary, decorative), then the quote text in **Georgia 20**, line spacing 7, ink, **selectable** (id `clarity-quote-text`).
- **The app name and the star rating are NOT displayed**, even though the component receives them (`ClarityQuoteBlock` ignores `app` and `rating`). There are no quotation marks around the text, no "original" toggle and no attribution line. The editorial decision is to read without brand names (`Documentation/Clarity/README.md:90`).

Display text = the first non-blank of:

1. `quote-translations.<lang>.json` → `translations[original]`, looked up in the current locale's **own chain only** (e.g. `pt-BR` → `pt-BR`, `pt`);
2. the dossier evidence's `translation` field (from `rich.<lang>` with its normal fallback chain);
3. `original` (`quote`).

Per locale:

| Locale | Pack | What the reader sees |
|---|---|---|
| ru | `quote-translations.ru.json` (6,801 entries; covers all 792 article quotes) | Russian translation |
| en | none | `rich.en` `translation` (an English cleaned copy in 1,461 of 1,465 cases), else the English original |
| de / fr / ja | own pack (1,052 entries each) | translation. 2 of 792 article quotes are missing and fall back to the English text: `run-tracking` / `pause` (`run-tracking-finding-1` #1) and `flashcards` / `generation` (`flashcards-finding-4` #1). |

- **Never fall back to another language's translation** (e.g. never show the Russian translation in the German UI). Show the English original instead.
- The same resolution is used by quote blocks elsewhere (legacy readers, idea articles, export).

### 6.9 Artwork (`Clarity/ClarityResearchArtwork.swift`, `Resources/launch-research-artwork.json`)

- `article(for: slug)` = handcrafted table ?? launch JSON.
- An image is shown only if its asset exists. **A missing image reserves no space** (`:4-5,108-121`).
- All images are **1200×800 JPG** (3:2) in `Resources/Assets.xcassets/<assetName>.imageset/illustration.jpg`: 21 handcrafted plus 192 launch = 213 files. None are missing.

| Topic(s) | Cover | Audiences | Observations (keyed by `observation.id`) | Sections |
|---|---|---|---|---|
| `interior-design` | `ResearchInterior_cover` | `ResearchInterior_audiences` | `controlled-change`, `measure`, `dependencies`, `levels`, `saved-work`, `limits` → `ResearchInterior_<key>` | `finish` → `ResearchInterior_directions` (the only section image) |
| `habit-tracking` | `ResearchHabits_cover` | `ResearchHabits_audiences` | `quick-mark`, `sequence`, `pause-correction`, `social-choice` | — |
| `personal-finance` | `ResearchFinance_cover` | `ResearchFinance_audiences` | `manual`, `allowance`, `couple`, `archive` | — |
| other 32 | `ResearchLaunch_<slug>_cover` | `ResearchLaunch_<slug>_audiences` | 4 per topic, `ResearchLaunch_<slug>_<obsId>` (see JSON) | — |

- Placements: cover → hero (full-bleed) **and** catalog card **and** locked preview **and** the saved-row thumbnail (88×66, r12). Audiences → the top of «Какие задачи решают люди». Section → after the section intro. Observation → after paragraph 0 / quote 0.
- Alt text: handcrafted = localized strings (`L(...)`, all in `ui.<lang>.json`; §11.4). Launch = `accessibilityLabel` in the JSON, which is **Russian only** (patterns: cover = category name; audiences = «Разные задачи в категории «<name>».»; observation = «Иллюстрация к теме «<observation title>».»). **Web:** regenerate these three patterns from the localized name and titles per locale (open question Q5). The catalog card image is decorative (`alt=""`).

### 6.10 Hero description and corpus sentence (`ClarityReader.swift:419-444`)

`description = [summary, corpusSentence].filter(nonEmpty).join(" ")`. `summary` = `article.summary` (fallbacks for topics without an article in §11.2; not needed with shipped data).

`corpusSentence` exists only if `dossier.corpusApps > 0 && dossier.corpusReviews > 0`. Numbers are formatted in the **current locale** (ru: NBSP thousands separator, e.g. `18 442`). Template `L("Мы изучили %1$@ %2$@ о работе %3$@ %4$@.")`:

| Locale | Template | %2 (reviews word) | %4 (apps word) |
|---|---|---|---|
| ru | «Мы изучили %1$@ %2$@ о работе %3$@ %4$@.» | n%10==1 && n%100!=11 → «отзыв»; n%10∈2…4 && n%100∉12…14 → «отзыва»; else «отзывов» | n%10==1 && n%100!=11 → «приложения»; else «приложений» (genitive) |
| en | "We studied %1$@ %2$@ about how %3$@ %4$@ work." | review / reviews | app / apps |
| de | "Wir haben %1$@ %2$@ über die Arbeit von %3$@ %4$@ untersucht." | Rezension / Rezensionen | App / Apps |
| fr | "Nous avons étudié %1$@ %2$@ sur le fonctionnement de %3$@ %4$@." | avis / avis (fr: 0 and 1 → one) | app / apps |
| ja | "%3$@件の%4$@がどう使われているかについて、%1$@件の%2$@を調べました。" | レビュー | アプリ |

Plural forms for non-RU come from `ui.<lang>.json → plurals["отзыв"|"приложение"]` with CLDR categories (`Strings/UIStrings.swift:67-150`). Use `Intl.PluralRules`. Example (ru, interior-design): «Как выбрать изменения для своей комнаты, проверить размеры и довести понравившийся вариант до покупки или ремонта. Мы изучили 18 442 отзыва о работе 61 приложения.» Per-topic numbers are in §7.

### 6.11 Legacy (non-editorial) reader — **unreachable with shipped data; do not build**

The code path runs when `ResearchEditorial.article` is nil (`ClarityReader.swift:181-188, 313-417`). RU ships editorial articles for all 72 categories, and the other locales only create niches for the 35 topics, which all have articles, so this path never runs. For the record, its chapters are «Главное» (`thesis.governing` ?? `market.marketLead`), «Кто и зачем пользуется» (segment rows → sheet «Задача человека» with «Что нужно сделать» / «Чего не хватает» / «Возможность платного решения»), «Что ценят и что мешает» (finding rows with «Читать наблюдение и отзывы» → sheet «Наблюдение» with «Что ценят» / «Что мешает» / «Примеры из отзывов»), «Как решают задачу сейчас», «Возможности для платного продукта» (with disclosure «Цены, упомянутые в архиве»), «Как выбирают приложения» (disclosure «Отзывы об этом способе выбора») and «Идеи и улучшения». Strings are in §11.3.

### 6.12 The research part of the idea export document (reference only; UI in the ideas spec) — `Clarity/ClarityExportDocument.swift:7-63`

The plain-text export of an idea **embeds the full research article** in this order:

1. «inApp · Идея и разбор категории»
2. «1. РАЗБОР КАТЕГОРИИ»
3. category name
4. summary
5. lead
6. «КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ» + each audience as `title\nbody`
7. per section: `title`, `intro`, then per observation `title\nbody`, its quotes as `«<display text>»` (same flow de-duplication), and its placements as `direction.title\ndirection.body`
8. remaining directions
9. `conclusion.title\nbody`
10. «2. ИДЕЯ» …

Blocks are joined with a blank line; empty blocks are skipped. **The direction titles appear in the export even though the screen hides them.**

### 6.13 Verified content stats (35 topics)

101 sections · 272 observations · 105 audience cards (3 per topic) · 225 directions (42 with body text) · 35 conclusions · 293 ideas · 758 visible article quotes. No topic renders «Другие возможности» or «Другие идеи категории». No section intro is empty. There are 2–3 sections per topic (2 in `meal-prep-grocery`, `invoice-maker`, `teleprompter-captions` and `resume-builder`).

---

## 7. The 35 topics: catalog order and access

Order = `LaunchEdition.categories` (`Content/LaunchEdition.swift:6-18`) = the catalog order with an empty query. **Free: #1 only.** Everything else requires Plus (annual `com.artsaverin.inapp.annual` or lifetime `com.artsaverin.inapp.lifetime`; `Store/Purchases.swift:11-15`; see the paywall spec).

| # | slug | RU name | EN name | Access | Ideas | Sections / observations / directions | Corpus (apps / reviews) → RU sentence | Artwork |
|---|---|---|---|---|---|---|---|---|
| 1 | `interior-design` | Дизайн интерьера и планировка | Interior design and floor plans | **FREE** | 8 (1–5 free, 6–8 Plus) | 3 / 7 / 8 | 61 / 18442 → «Мы изучили 18 442 отзыва о работе 61 приложения.» | handcrafted `ResearchInterior_*` |
| 2 | `habit-tracking` | Привычки | Habits | Plus | 10 | 3 / 8 / 10 | 98 / 31299 → «Мы изучили 31 299 отзывов о работе 98 приложений.» | handcrafted `ResearchHabits_*` |
| 3 | `personal-finance` | Личные финансы | Personal finance | Plus | 10 | 3 / 8 / 10 | 99 / 32561 → «Мы изучили 32 561 отзыв о работе 99 приложений.» | handcrafted `ResearchFinance_*` |
| 4 | `calendars-tasks` | Календари и задачи | Calendars and tasks | Plus | 10 | 3 / 8 / 6 | 100 / 44363 → «Мы изучили 44 363 отзыва о работе 100 приложений.» | `ResearchLaunch_calendars-tasks_*` |
| 5 | `notes-pkm` | Заметки и база знаний | Notes and knowledge base | Plus | 10 | 3 / 9 / 8 | 91 / 27811 → «Мы изучили 27 811 отзывов о работе 91 приложения.» | `ResearchLaunch_notes-pkm_*` |
| 6 | `nutrition-calories` | Калории и питание | Calories and nutrition | Plus | 8 | 3 / 8 / 4 | 95 / 29852 → «Мы изучили 29 852 отзыва о работе 95 приложений.» | `ResearchLaunch_nutrition-calories_*` |
| 7 | `workout-fitness` | Тренировки и фитнес | Workouts and fitness | Plus | 8 | 3 / 8 / 3 | 91 / 35074 → «Мы изучили 35 074 отзыва о работе 91 приложения.» | `ResearchLaunch_workout-fitness_*` |
| 8 | `sleep-tracking` | Трекеры сна и будильники | Sleep trackers and alarms | Plus | 8 | 3 / 8 / 5 | 94 / 31731 → «Мы изучили 31 731 отзыв о работе 94 приложений.» | `ResearchLaunch_sleep-tracking_*` |
| 9 | `language-learning` | Изучение языков | Language learning | Plus | 10 | 3 / 8 / 8 | 100 / 39649 → «Мы изучили 39 649 отзывов о работе 100 приложений.» | `ResearchLaunch_language-learning_*` |
| 10 | `photo-editing` | Фоторедакторы | Photo editors | Plus | 10 | 3 / 8 / 6 | 100 / 45035 → «Мы изучили 45 035 отзывов о работе 100 приложений.» | `ResearchLaunch_photo-editing_*` |
| 11 | `travel-planning` | Планирование путешествий | Travel planning | Plus | 8 | 3 / 7 / 5 | 90 / 25175 → «Мы изучили 25 175 отзывов о работе 90 приложений.» | `ResearchLaunch_travel-planning_*` |
| 12 | `meal-prep-grocery` | Меню и списки покупок | Menus and shopping lists | Plus | 8 | 2 / 8 / 7 | 54 / 12689 → «Мы изучили 12 689 отзывов о работе 54 приложений.» | `ResearchLaunch_meal-prep-grocery_*` |
| 13 | `voice-recorder` | Запись и расшифровка речи | Recording and transcribing speech | Plus | 8 | 3 / 8 / 6 | 30 / 12545 → «Мы изучили 12 545 отзывов о работе 30 приложений.» | `ResearchLaunch_voice-recorder_*` |
| 14 | `focus-productivity` | Концентрация и продуктивность | Focus and productivity | Plus | 8 | 3 / 8 / 6 | 75 / 18140 → «Мы изучили 18 140 отзывов о работе 75 приложений.» | `ResearchLaunch_focus-productivity_*` |
| 15 | `plant-care` | Уход за растениями | Plant care | Plus | 8 | 3 / 7 / 5 | 64 / 14107 → «Мы изучили 14 107 отзывов о работе 64 приложений.» | `ResearchLaunch_plant-care_*` |
| 16 | `pet-care` | Уход за питомцами | Pet care | Plus | 8 | 3 / 8 / 8 | 27 / 6560 → «Мы изучили 6 560 отзывов о работе 27 приложений.» | `ResearchLaunch_pet-care_*` |
| 17 | `guitar-tuner-learn` | Гитара: тюнер и обучение | Guitar: tuner and learning | Plus | 8 | 3 / 7 / 4 | 61 / 17982 → «Мы изучили 17 982 отзыва о работе 61 приложения.» | `ResearchLaunch_guitar-tuner-learn_*` |
| 18 | `scanner-pdf` | Сканеры документов | Document scanners | Plus | 8 | 3 / 8 / 7 | 52 / 23488 → «Мы изучили 23 488 отзывов о работе 52 приложений.» | `ResearchLaunch_scanner-pdf_*` |
| 19 | `weather-apps` | Погода | Weather | Plus | 8 | 3 / 8 / 6 | 92 / 24792 → «Мы изучили 24 792 отзыва о работе 92 приложений.» | `ResearchLaunch_weather-apps_*` |
| 20 | `wardrobe-outfit` | Гардероб и образы | Wardrobe & outfits | Plus | 8 | 3 / 8 / 5 | 46 / 9748 → «Мы изучили 9 748 отзывов о работе 46 приложений.» | `ResearchLaunch_wardrobe-outfit_*` |
| 21 | `run-tracking` | Бег | Running | Plus | 8 | 3 / 8 / 6 | 50 / 18463 → «Мы изучили 18 463 отзыва о работе 50 приложений.» | `ResearchLaunch_run-tracking_*` |
| 22 | `hiking-trails` | Походы и маршруты | Hikes and routes | Plus | 8 | 3 / 7 / 6 | 26 / 8565 → «Мы изучили 8 565 отзывов о работе 26 приложений.» | `ResearchLaunch_hiking-trails_*` |
| 23 | `flashcards` | Учебные карточки | Study flashcards | Plus | 8 | 3 / 8 / 7 | 34 / 11059 → «Мы изучили 11 059 отзывов о работе 34 приложений.» | `ResearchLaunch_flashcards_*` |
| 24 | `journaling-mood` | Дневники и настроение | Journaling and mood | Plus | 8 | 3 / 8 / 7 | 95 / 29993 → «Мы изучили 29 993 отзыва о работе 95 приложений.» | `ResearchLaunch_journaling-mood_*` |
| 25 | `invoice-maker` | Счета для клиентов | Invoices for clients | Plus | 8 | 2 / 8 / 7 | 26 / 6720 → «Мы изучили 6 720 отзывов о работе 26 приложений.» | `ResearchLaunch_invoice-maker_*` |
| 26 | `meditation-mindfulness` | Медитация и осознанность | Meditation and mindfulness | Plus | 9 | 3 / 8 / 8 | 100 / 40024 → «Мы изучили 40 024 отзыва о работе 100 приложений.» | `ResearchLaunch_meditation-mindfulness_*` |
| 27 | `mind-mapping` | Карты мыслей | Mind maps | Plus | 8 | 3 / 7 / 7 | 10 / 2088 → «Мы изучили 2 088 отзывов о работе 10 приложений.» | `ResearchLaunch_mind-mapping_*` |
| 28 | `car-maintenance` | Обслуживание автомобиля | Car maintenance | Plus | 8 | 3 / 8 / 7 | 56 / 13395 → «Мы изучили 13 395 отзывов о работе 56 приложений.» | `ResearchLaunch_car-maintenance_*` |
| 29 | `ai-writing` | ИИ-помощники для текста | AI writing assistants | Plus | 8 | 3 / 8 / 5 | 91 / 21356 → «Мы изучили 21 356 отзывов о работе 91 приложения.» | `ResearchLaunch_ai-writing_*` |
| 30 | `teleprompter-captions` | Телесуфлёр и субтитры | Teleprompter and captions | Plus | 8 | 2 / 8 / 7 | 41 / 9895 → «Мы изучили 9 895 отзывов о работе 41 приложения.» | `ResearchLaunch_teleprompter-captions_*` |
| 31 | `password-manager` | Менеджеры паролей | Password managers | Plus | 8 | 3 / 7 / 7 | 95 / 22182 → «Мы изучили 22 182 отзыва о работе 95 приложений.» | `ResearchLaunch_password-manager_*` |
| 32 | `translator` | Переводчики | Translators | Plus | 8 | 3 / 8 / 6 | 38 / 13895 → «Мы изучили 13 895 отзывов о работе 38 приложений.» | `ResearchLaunch_translator_*` |
| 33 | `astronomy-stargazing` | Звёздное небо и астрономия | Night sky and astronomy | Plus | 8 | 3 / 7 / 6 | 53 / 15866 → «Мы изучили 15 866 отзывов о работе 53 приложений.» | `ResearchLaunch_astronomy-stargazing_*` |
| 34 | `resume-builder` | Конструкторы резюме | Resume builders | Plus | 8 | 2 / 7 / 6 | 26 / 4338 → «Мы изучили 4 338 отзывов о работе 26 приложений.» | `ResearchLaunch_resume-builder_*` |
| 35 | `music-streaming` | Прослушивание музыки | Listening to music | Plus | 8 | 3 / 8 / 6 | 95 / 25893 → «Мы изучили 25 893 отзыва о работе 95 приложений.» | `ResearchLaunch_music-streaming_*` |

Names in the other locales (`text.<lang>.json → categories`):

| slug | DE | FR | JA |
|---|---|---|---|
| `interior-design` | Inneneinrichtung und Grundrisse | Design d’intérieur et plans d’aménagement | インテリアデザインと間取り図 |
| `habit-tracking` | Gewohnheiten | Habitudes | 習慣 |
| `personal-finance` | Persönliche Finanzen | Finances personnelles | 家計管理 |
| `calendars-tasks` | Kalender und Aufgaben | Calendriers et tâches | カレンダーとタスク |
| `notes-pkm` | Notizen und Wissensdatenbank | Notes et base de connaissances | メモとナレッジベース |
| `nutrition-calories` | Kalorien und Ernährung | Calories et nutrition | カロリーと栄養 |
| `workout-fitness` | Training und Fitness | Entraînements et fitness | トレーニングとフィットネス |
| `sleep-tracking` | Schlaftracker und Wecker | Trackers de sommeil et réveils | 睡眠トラッカーとアラーム |
| `language-learning` | Sprachenlernen | Apprentissage des langues | 語学学習 |
| `photo-editing` | Fotoeditoren | Éditeurs photo | 写真編集アプリ |
| `travel-planning` | Reiseplanung | Planification de voyages | 旅行の計画 |
| `meal-prep-grocery` | Menüs und Einkaufslisten | Menus et listes de courses | 献立と買い物リスト |
| `voice-recorder` | Sprachaufnahme und Transkription | Enregistrement et transcription de la parole | 音声録音と文字起こし |
| `focus-productivity` | Konzentration und Produktivität | Concentration et productivité | 集中と生産性 |
| `plant-care` | Pflanzenpflege | Soin des plantes | 植物の世話 |
| `pet-care` | Haustierpflege | Soin des animaux | ペットの世話 |
| `guitar-tuner-learn` | Gitarre: Stimmgerät und Lernen | Guitare : accordeur et apprentissage | ギター：チューナーと練習 |
| `scanner-pdf` | Dokumentenscanner | Scanners de documents | ドキュメントスキャナー |
| `weather-apps` | Wetter | Météo | 天気 |
| `wardrobe-outfit` | Kleiderschrank und Outfits | Garde-robe et tenues | ワードローブとコーディネート |
| `run-tracking` | Laufen | Course à pied | ランニング |
| `hiking-trails` | Wanderungen und Routen | Randonnées et itinéraires | ハイキングとルート |
| `flashcards` | Lernkarten | Cartes mémoire pour apprendre | 暗記カード |
| `journaling-mood` | Tagebücher und Stimmung | Journal et humeur | 日記と気分 |
| `invoice-maker` | Rechnungen für Kunden | Factures pour les clients | 顧客への請求書 |
| `meditation-mindfulness` | Meditation und Achtsamkeit | Méditation et pleine conscience | 瞑想とマインドフルネス |
| `mind-mapping` | Mindmaps | Cartes mentales | マインドマップ |
| `car-maintenance` | Autowartung | Entretien de la voiture | 車のメンテナンス |
| `ai-writing` | KI-Schreibassistenten | Assistants d’écriture IA | 文章のAIアシスタント |
| `teleprompter-captions` | Teleprompter und Untertitel | Téléprompteur et sous-titres | テレプロンプターと字幕 |
| `password-manager` | Passwortmanager | Gestionnaires de mots de passe | パスワード管理アプリ |
| `translator` | Übersetzer | Traducteurs | 翻訳アプリ |
| `astronomy-stargazing` | Sternenhimmel und Astronomie | Ciel nocturne et astronomie | 星空と天文 |
| `resume-builder` | Lebenslauf-Baukästen | Créateurs de CV | 履歴書作成 |
| `music-streaming` | Musikhören | Écoute de la musique | 音楽を聴く |

Notes:

- The ordering does not depend on user preferences (onboarding interests are not used by the catalog) or on purchase state.
- The RU bundle contains 72 categories. The 37 archive categories are never listed; they can only be opened from legacy saved items in RU.

---

## 8. What is hidden behind Plus (research side)

| Element | Free user | Plus |
|---|---|---|
| Catalog list (35 cards: cover, title, summary) | visible; 34 cards show a lock icon | visible, no locks |
| «Бесплатный разбор» badge on `interior-design` | shown | **also shown** |
| Catalog search over full article text | works for all 35 | works |
| `interior-design` article | **full** (all blocks, bookmark, TOC, note) | full |
| Idea cards `interior-design-1…5` inside it | full card → idea sheet | full |
| Idea cards `interior-design-6/7/8` inside it | **art + lock only**; tap → paywall | full |
| The other 34 articles | locked preview (§5.1): cover, title, summary, CTA, free-sample link, note button. The article is not rendered. | full |
| Bookmarking a locked article | **not possible** from the article (no toolbar button) | yes |
| A note on a locked article | **possible** (and saving bookmarks the topic) | yes |
| Corpus sentence | hidden in the locked preview | shown |

Access logic (`ClarityContentAccess.swift:5-20`):

- `canRead(category) = isUnlocked || category == "interior-design"`
- `canReadIdea(slug) = isUnlocked || slug ∈ ["interior-design-1" … "interior-design-5"]`

The header comment says "Preferences, saved items and old export allowances never grant access to another category." **Web:** enforce this on the server. Do not send locked article bodies or locked idea titles and descriptions to the client (the iOS app deliberately keeps them out of the view and accessibility tree).

---

## 9. Persistence and identity (research side)

| Data | iOS storage | Key | Web mapping (suggestion) |
|---|---|---|---|
| Research, idea and problem bookmarks (non-idea) | `StudioNotebook.saved` | `UserDefaults["inapp.studio.notebook.v1"]` | per user (account), or localStorage for anonymous users |
| Idea bookmarks | `Shelf.saved` | `UserDefaults["shelf.saved"]` (string array, newest first) | same |
| Notes | `StudioNotebook.notes` | key `"<kind>:<slug>"`, e.g. `research:interior-design` | same |
| Saved apps (legacy) | `ClarityAppShelf` | `inapp.clarity.saved-apps.v1` | not needed |
| Appearance | `@AppStorage("studio.appearance")` | `light` (default) / `dark` / `system` | cookie or localStorage |
| Content language | `UserDefaults["content.locale"]` | e.g. `ru` | URL locale prefix and/or cookie |

There is no sync or cloud storage in the app. Copy that says «на этом устройстве / этом iPhone» appears in several places (see Q3).

---

## 10. Secondary screens reachable from the shell (legacy data only; brief)

### 10.1 `ClarityProblemView` (`.problem(id)`) — `ClarityReader.swift:658-715`

- Gated by the problem's category (the same locked preview; its description is «Наблюдение из разбора «» + category name + «».»).
- Nav title «Наблюдение». Toolbar: bookmark + note icon (`square.and.pencil`, a11y «Заметка к наблюдению»).
- Body:
  - Hero: `problem.displayTitle` / «Повторяющаяся тема в отзывах»
  - «Что происходит»: summary (lead)
  - «Что пишут люди»: «Фрагменты описывают опыт людей в разных приложениях.» + quote blocks separated by dividers, or «Исходные цитаты к этой теме не приложены.»
  - «Разобраться в контексте»: a row «Читать разбор категории» (subtitle = category name) → `.research`
- Data: `studio.json` problems (RU only).

### 10.2 `ClarityLegacyCardView` (`.legacyCard`) — `ClarityLegacyCard.swift`

- Nav title «Сохранённый материал». Bookmark toggles `DeckShelf`.
- States:
  - loading: «Открываем материал…»
  - missing: «Материал недоступен» / «Закладка сохранена. Можно открыть разбор этой категории.» + «Открыть разбор категории»
  - content: heading, labelled paragraphs, bullets, «Отзывы к материалу» quotes, footnote, «Твоя заметка к материалу» card, and a source row «Открыть идею» or «Открыть разбор категории» / «Полный материал»
- Recommendation: skip on web.

### 10.3 `ClarityStoredProjectView` (`.storedProject`) — `ClarityMy.swift:306-339`

- Title «Проект»: fields «Следующий шаг», «Кому это нужно», «Почему выберут продукт», «Что проверено», «Выбранные функции», «Твоя заметка» (editable, «Сохранить заметку»), «Задание», and a row «Открыть исходную идею» / «Разбор и отзывы».
- Recommendation: skip on web.

---

## 11. String tables (RU key → EN / DE / FR / JA from `ui.<lang>.json`)

### 11.1 Shell and research side (live)

| Where (file:line) | RU (key) | EN | DE | FR | JA |
|---|---|---|---|---|---|
| ClarityRoot:39 | Не удалось открыть материалы | Couldn’t open the materials | Materialien ließen sich nicht öffnen | Impossible d’ouvrir les contenus | 資料を開けませんでした |
| ClarityRoot:39 | Попробуй загрузить библиотеку ещё раз. | Try loading the library again. | Versuch, die Bibliothek noch einmal zu laden. | Essaie de recharger la bibliothèque. | ライブラリをもう一度読み込んでみてください。 |
| ClarityRoot:40 | Повторить | Try again | Erneut versuchen | Réessayer | 再試行 |
| ClarityRoot:43 | Открываем материалы… | Opening the materials… | Materialien werden geöffnet… | Ouverture des contenus… | 資料を開いています… |
| TabBar:12 | Разборы | Breakdowns | Analysen | Décryptages | 分析 |
| TabBar:13 | Идеи | Ideas | Ideen | Idées | アイデア |
| TabBar:14 | Сохранённое | Saved | Gespeichert | Enregistrés | 保存済み |
| BackNavigation:13 | Назад | Back | Zurück | Retour | 戻る |
| Catalogs:43 | Что людям важно в приложениях и чего им не хватает. | What matters to people in apps and what they are missing. | Was Menschen an Apps wichtig ist und was ihnen fehlt. | Ce qui compte pour les gens dans les apps et ce qui leur manque. | 人がアプリに何を求め、何が足りないと感じているか。 |
| Catalogs:45 | Категория или потребность | Category or need | Kategorie oder Bedarf | Catégorie ou besoin | カテゴリーやニーズ |
| Catalogs:48 | Найдено: %1$@ | Found: %1$@ | Gefunden: %1$@ | Résultats : %1$@ | 該当：%1$@ |
| Catalogs:69 | Готовим следующие разборы | Next breakdowns in progress | Nächste Analysen in Arbeit | Prochains décryptages en préparation | 次の分析を準備中 |
| Catalogs:71 | Велоспорт, йога и определение растений и животных. | Cycling, yoga and identifying plants and animals. | Radsport, Yoga und das Bestimmen von Pflanzen und Tieren. | Vélo, yoga et identification des plantes et des animaux. | サイクリング、ヨガ、植物と動物の判別。 |
| Catalogs:125 (a11y) | Полный разбор в Plus | Full breakdown in Plus | Vollständige Analyse in Plus | Décryptage complet dans Plus | 分析の全文はPlusで |
| Catalogs:135 | Бесплатный разбор | Free breakdown | Kostenlose Analyse | Décryptage gratuit | 無料の分析 |
| Catalogs:154 (a11y) | %1$@. Бесплатный разбор. | %1$@. Free breakdown. | %1$@. Kostenlose Analyse. | %1$@. Décryptage gratuit. | %1$@。無料の分析。 |
| Catalogs:155 (a11y) | %1$@ Полный разбор в Plus. | %1$@ The full breakdown is in Plus. | %1$@ Die vollständige Analyse gibt es in Plus. | %1$@ Le décryptage complet est dans Plus. | %1$@ 完全な分析はPlusで読めます。 |
| Catalogs:236 | Пока ничего не нашлось | Nothing found yet | Noch nichts gefunden | Rien trouvé pour l’instant | まだ何も見つかりません |
| Catalogs:237 | Попробуй название категории или более короткий запрос. | Try a category name or a shorter query. | Probier einen Kategorienamen oder eine kürzere Anfrage. | Essaie un nom de catégorie ou une requête plus courte. | カテゴリー名か、もっと短い言葉を試してください。 |
| Style:141 (a11y) | Очистить поиск | Clear search | Suche löschen | Effacer la recherche | 検索をクリア |
| Reader:70,133 | Главное | Key points | Das Wichtigste | L’essentiel | 要点 |
| Reader:134,241 | Какие задачи решают люди | The jobs people do | Welche Aufgaben Menschen lösen | Les tâches des gens | 人々の課題 |
| Reader:142,306 | Другие возможности | Other opportunities | Weitere Chancen | Autres opportunités | ほかの可能性 |
| Reader:145,173 | Другие идеи категории | Other ideas in this category | Weitere Ideen dieser Kategorie | Autres idées de cette catégorie | このカテゴリーのほかのアイデア |
| Reader:199 (a11y) | Содержание разбора | Breakdown contents | Inhalt der Analyse | Sommaire du décryptage | 分析の目次 |
| Reader:201 | Заметка к разбору | Note on the breakdown | Notiz zur Analyse | Note sur le décryptage | 分析へのメモ |
| Reader:202 (a11y) | Действия с разбором | Breakdown actions | Aktionen zur Analyse | Actions sur le décryptage | 分析の操作 |
| Reader:221 | Содержание | Contents | Inhalt | Sommaire | 目次 |
| Reader:223,890; Catalogs:264 | Готово | Done | Fertig | Terminé | 完了 |
| Reader:230; Access:117 | Разбор | Breakdown | Analyse | Décryptage | 分析 |
| Reader:236 | Полный текст этого разбора пока не добавлен. | The full text of this breakdown hasn’t been added yet. | Der vollständige Text dieser Analyse ist noch nicht ergänzt. | Le texte complet de ce décryptage n’a pas encore été ajouté. | この分析の全文はまだ追加されていません。 |
| Reader:435 | Мы изучили %1$@ %2$@ о работе %3$@ %4$@. | We studied %1$@ %2$@ about how %3$@ %4$@ work. | Wir haben %1$@ %2$@ über die Arbeit von %3$@ %4$@ untersucht. | Nous avons étudié %1$@ %2$@ sur le fonctionnement de %3$@ %4$@. | %3$@件の%4$@がどう使われているかについて、%1$@件の%2$@を調べました。 |
| Reader:441-443 | отзыв / отзыва / отзывов | review / reviews / reviews | Rezension / Rezensionen / Rezensionen | avis | レビュー |
| Reader:806 (a11y) | Сохранить | Save | Speichern | Enregistrer | 保存 |
| Reader:806 (a11y) | Убрать из сохранённого | Remove from Saved | Aus Gespeichert entfernen | Retirer des Enregistrés | 保存済みから解除 |
| Reader:807 (a11y) | Сохранено / Не сохранено | Saved / Not saved | Gespeichert / Nicht gespeichert | Enregistré / Non enregistré | 保存しました / 未保存 |
| Reader:816 | Материал недоступен | Material unavailable | Material nicht verfügbar | Contenu indisponible | 資料を表示できません |
| Reader:816 | Вернись в каталог и выбери другой материал. Сохранённые записи остаются на устройстве. | Go back to the catalog and pick another material. Saved entries stay on the device. | Geh zurück in den Katalog und wähl ein anderes Material. Gespeicherte Einträge bleiben auf dem Gerät. | Reviens au catalogue et choisis un autre contenu. Les entrées enregistrées restent sur l’appareil. | カタログに戻って別の資料を選んでください。保存した記録は端末に残ります。 |
| Reader:914 | Что хочется запомнить или проверить? | What do you want to remember or check? | Was willst du dir merken oder prüfen? | Que veux-tu retenir ou vérifier ? | 何を覚えておきたい、あるいは確かめたいですか？ |
| Reader:919 | Заметка хранится на этом устройстве. Удаление материала из сохранённого не удаляет заметку. | The note is kept on this device. Removing the material from Saved does not delete the note. | Die Notiz bleibt auf diesem Gerät. Das Entfernen des Materials aus Gespeichert löscht die Notiz nicht. | La note reste sur cet appareil. Retirer le contenu des Enregistrés ne supprime pas la note. | メモはこの端末に保存されます。資料を保存済みから外してもメモは消えません。 |
| Reader:923 | Моя заметка | My note | Meine Notiz | Ma note | 自分のメモ |
| Reader:925 | Отмена | Cancel | Abbrechen | Annuler | キャンセル |
| Reader:927 | Сохранить | Save | Speichern | Enregistrer | 保存 |
| Reader:943 | Не сохранять изменения? | Discard changes? | Änderungen verwerfen? | Abandonner les modifications ? | 変更を破棄しますか？ |
| Reader:944 | Не сохранять | Don’t save | Nicht speichern | Ne pas enregistrer | 保存しない |
| Reader:945 | Продолжить редактирование | Keep editing | Weiter bearbeiten | Continuer l’édition | 編集を続ける |
| Access:84 | Полный материал в Plus | Full material in Plus | Vollständiges Material in Plus | Contenu complet dans Plus | 資料の全文はPlusで |
| Access:86 | Все разборы и идеи — в одной подписке. | Every breakdown and idea — in one subscription. | Alle Analysen und Ideen — in einem Abo. | Tous les décryptages et toutes les idées — dans un seul abonnement. | すべての分析とアイデアを、一つのサブスクリプションで。 |
| Access:90 | Открыть все материалы | Unlock all materials | Alle Materialien freischalten | Ouvrir tous les contenus | すべての資料を開放する |
| Access:95 | Сначала прочитать бесплатный разбор | Read the free breakdown first | Zuerst die kostenlose Analyse lesen | Lire d’abord le décryptage gratuit | まず無料の分析を読む |
| Access:104 | Моя заметка к материалу | My note on the material | Meine Notiz zum Material | Ma note sur le contenu | 資料への自分のメモ |
| Access:84 (idea gate) | Идея доступна в Plus | The idea is available in Plus | Die Idee ist in Plus verfügbar | L’idée est disponible dans Plus | このアイデアはPlusで読めます |
| IdeaCard:70 (a11y) | Идея в Plus | Idea in Plus | Idee in Plus | Idée dans Plus | アイデアはPlusで |
| IdeaCard:71 (a11y) | Подробности идеи доступны в Plus. | The details of the idea are in Plus. | Die Details der Idee gibt es in Plus. | Les détails de l’idée sont dans Plus. | アイデアの詳細はPlusで読めます。 |
| IdeaCard:71 (a11y) | Открыть полную идею в отдельном окне. | Open the full idea in a separate window. | Die ganze Idee in einem eigenen Fenster öffnen. | Ouvrir l’idée complète dans une fenêtre séparée. | アイデアの全文を別の画面で開きます。 |
| IdeaCard:70 (a11y) | %1$@. %2$@ | %1$@. %2$@ | %1$@. %2$@ | %1$@. %2$@ | %1$@。%2$@ |
| Reader:546 (idea screen → research) | Читать разбор категории | Read the category breakdown | Kategorie-Analyse lesen | Lire le décryptage de la catégorie | カテゴリーの分析を読む |

### 11.2 `nicheSummary` fallbacks (used only when a topic has no editorial article; `ClarityReader.swift:18-31`)

| slug | RU | EN |
|---|---|---|
| habit-tracking | Напоминания, простая отметка и сохранение прогресса. | Reminders, a simple check-off and progress that sticks. |
| calendars-tasks | Личные дела, семейные планы и рабочее расписание. | Personal errands, family plans and a work schedule. |
| photo-editing | Что важно от первой правки до готовой фотографии. | What matters from the first edit to the finished photo. |
| personal-finance | Учёт трат, общий бюджет и сохранность истории. | Tracking spending, a shared budget and a history that survives. |
| focus-productivity | Рабочие сессии, таймеры и защита от отвлечений. | Work sessions, timers and protection from distractions. |
| sleep-tracking | Как люди наблюдают за сном и выбирают помощника. | How people track their sleep and choose a helper. |
| (other) | first sentence of the first segment's `job`, else «Потребности людей и опыт использования приложений.» | What people need and how apps work out for them. |

### 11.3 Legacy chapter reader (unreachable; for completeness)

| RU | EN |
|---|---|
| Кто и зачем пользуется | Who uses it and why |
| Что ценят и что мешает | What works and what doesn’t |
| Как решают задачу сейчас | How the job is solved today |
| Возможности для платного продукта | Opportunities for a paid product |
| Как выбирают приложения | How people choose apps |
| Идеи и улучшения | Ideas and improvements |
| Читать наблюдение и отзывы | Read the observation and the reviews |
| Предположения исследования. Их нужно проверить с выбранной аудиторией. | Assumptions from the research. They need testing with the audience you pick. |
| Что это значит для продукта | What this means for a product |
| Цены, упомянутые в архиве | Prices mentioned in the archive |
| Это суммы из сохранённых материалов. Актуальные цены нужно проверять в приложениях. | These amounts come from the saved materials. Current prices need checking in the apps themselves. |
| Отзывы об этом способе выбора | Reviews about this way of choosing |
| Варианты нового продукта или функций для существующего. Каждый — гипотеза, которую ещё предстоит проверить. | Options for a new product or features for an existing one. Each is a hypothesis still to be tested. |
| Наблюдение / Что люди ценят и с чем сталкиваются / Что ценят / Что мешает / Примеры из отзывов / Цитаты к этому наблюдению не приложены. | Observation / What people value and what they run into / What works / What doesn’t / Examples from reviews / No quotes are attached to this observation. |
| Задача человека / Что нужно сделать / Чего не хватает / Возможность платного решения | The person’s job / What needs doing / The gap / An opportunity for a paid solution |

### 11.4 Handcrafted artwork alt texts (`ClarityResearchArtwork.swift:47-86`; DE/FR/JA are in the ui packs under the same RU key)

| Asset | RU | EN |
|---|---|---|
| ResearchInterior_cover | Двое людей сравнивают образцы цвета в комнате, держа развёрнутый план будущего интерьера. | Two people compare color samples in a room, holding an unfolded plan of the future interior. |
| ResearchInterior_audiences | Образцы цвета, рулетка со шкафом и раскрытая книга проекта показывают три задачи планирования интерьера. | Color samples, a tape measure against a cabinet and an open project book show three jobs in planning an interior. |
| ResearchInterior_controlled-change | Женщина меняет штору; окно, диван и проход остаются на своих местах. | A woman changes a curtain; the window, sofa and walkway stay where they are. |
| ResearchInterior_measure | Люди проверяют рулеткой, помещается ли шкаф в нишу у плинтуса. | People use a tape measure to check whether a cabinet fits the alcove by the baseboard. |
| ResearchInterior_dependencies | Рука сдвигает перегородку, связанную нитями с соседними стенами плана. | A hand moves a partition tied by threads to the neighboring walls of the plan. |
| ResearchInterior_levels | Двое людей устанавливают последнюю ступень между лестницей и верхним этажом. | Two people set the last step between the staircase and the upper floor. |
| ResearchInterior_saved-work | Из раскрытой книги снова поднимается сохранённая комната; закладки отмечают предыдущие версии. | A saved room rises again out of an open book; bookmarks mark the earlier versions. |
| ResearchInterior_limits | Ластик стирает комнату с плана, но потраченный жетон остаётся в коробке. | An eraser wipes a room off the plan, but the spent token stays in the box. |
| ResearchInterior_directions (section `finish`) | Люди вместе уточняют детали комнаты, используя рамку, линейку и книгу проекта. | People work out the details of a room together, using a frame, a ruler and the project book. |
| ResearchHabits_cover | Женщина укладывает следующий камень в дорожку рядом с цветущим растением. | A woman lays the next stone in a path beside a flowering plant. |
| ResearchHabits_audiences | Вид сверху: трое людей читают, делают растяжку и поливают растение. | Seen from above: three people reading, stretching and watering a plant. |
| ResearchHabits_quick-mark | Женщина с сумкой у открытой двери держит перед собой руку с часами. | A woman with a bag at an open door holds out her wrist with a watch on it. |
| ResearchHabits_sequence | Утренние действия выстроены в дорожку, которая ведёт к выходу из дома. | Morning actions line up as a path that leads out of the house. |
| ResearchHabits_pause-correction | Человек отдыхает среди сохранённых дней: перерыв не уничтожает уже пройденный путь. | A person rests among the days already saved: a break does not wipe out the path behind them. |
| ResearchHabits_social-choice | Двое друзей передают друг другу лейку, ухаживая каждый за своей грядкой. | Two friends pass a watering can between them, each tending their own bed. |
| ResearchFinance_cover | Пара за столом раскладывает повседневные деньги по назначению. | A couple at a table sorts everyday money by what it is for. |
| ResearchFinance_audiences | Чек с блокнотом, конверты и модель дома показывают повседневные покупки и будущие траты. | A receipt with a notebook, envelopes and a model house show everyday purchases and future spending. |
| ResearchFinance_manual | Человек переносит покупку с чека в свой блокнот расходов. | A person copies a purchase from a receipt into their spending notebook. |
| ResearchFinance_allowance | Отдельные конверты сохраняют деньги на обязательства; рядом остаётся доступная часть бюджета. | Separate envelopes hold the money for commitments; the spendable part of the budget sits beside them. |
| ResearchFinance_couple | Двое сверяют общий бюджет, сохраняя личную часть денег у каждого. | Two people check a shared budget while each keeps a personal share of the money. |
| ResearchFinance_archive | История расходов бережно переходит из старой книги в новую. | A spending history moves carefully from an old book into a new one. |

---

## 12. Web adaptation notes (recommendations, not app facts)

1. **Tab bar on the web.** Mobile widths: reproduce the floating capsule, visible only on the three root pages. Desktop: a persistent top or side nav with the same three items is acceptable, since the "hide when pushed" rule exists because of phone space. Keep per-tab "last location" in `sessionStorage` so that clicking a tab returns to where the user was in that tab (parity with the separate stacks). Clicking the active tab while on its root could scroll to top (not in the app; harmless).
2. **Server rendering.** The catalog and the free article are SEO-friendly public pages. Locked articles should render the locked preview server-side with no body in the HTML.
3. **Idea sheet** → intercepted modal route; the TOC sheet → bottom sheet on mobile, sticky sidebar on desktop; the note sheet → modal dialog with the same Cancel/Save and discard confirmation.
4. **Build-time preprocessing** of `research-editorial.*.json` + `rich.*.json` into one per-locale article JSON: reflowed paragraphs, resolved and de-duplicated quotes with display text already chosen, and placements with resolved idea slugs. The client then renders dumb data, and the Swift algorithm lives in one TS build script.
5. **Images:** convert the 213 JPGs to AVIF/WebP at 1200×800 with `srcset`. The catalog cards and hero use the cover.

---

## 13. Code vs documentation discrepancies (the code is trusted)

| Doc claim | Code reality |
|---|---|
| `Documentation/Clarity/README.md:86`: «кнопка «Отзывы» открывает выбранные для конкретного вывода исходные фрагменты»; `:92` and `README.md:17`: «Кнопка «Примеры из отзывов» открывает исходные примеры… пояснение о подготовке статьи… в «О разборе»» | No such buttons and no «О разборе» block. Quotes render **inline** after each passage (`ClarityReader.swift:265-279`). «Примеры из отзывов» exists only in the unreachable legacy finding sheet (`:829`). Older screenshots (`Documentation/ReadingTypography-2026-09-14/Screenshots/reading-typography-quote-list.png`, a «Цитаты» sheet) are outdated. |
| `Documentation/Clarity/README.md:51`: `-clarityScreen home|…` | There is no `home` case; unknown names fall through to the catalog. The code also accepts `niche`, `overview`, `library`, `settings`, `onboarding` (`ClarityRoot.swift:94-113`). |
| `Documentation/Clarity/README.md:17`: onboarding "из трёх шагов … до трёх категорий" | The current onboarding is 4 story screens plus the paywall (`ClarityOnboarding.swift:18-25,29-35`). There is no category picking. |
| `README.md:9,13`: «72 разбора» | Discovery exposes **35** (`LaunchEdition`). 72 exist only in the RU data, reachable through legacy saved items. |
| `README.md:19`, `Documentation/Clarity/README.md:39`: «Чтение… бесплатно», "one purchase, lifetime" | Reading is **gated**: only `interior-design` plus 5 ideas are free. Products are annual + lifetime (`Purchases.swift:11-15`); the gate copy says «в одной подписке». |
| `README.md:37`: "Studio" reader with market, audience, ratings, app catalog | That describes the old Studio shell. Clarity's research reader has no ratings or app catalog, and `ClarityRatings.swift` is unreachable (§2.4). |
| `Documentation/Clarity/README.md:23`: mint/peach gradients | Replaced by the neutral palette (`LibraryRefresh-2026-09-20/README.md:7-19`), which the code confirms (`StudioStyle.swift:5-21`). |
| `ClarityResearchCatalogCard` has a gradient fallback "mint → lilac" | Both tokens now alias `accentSoft`, so the "gradient" is a flat `#EDF1FF`. Never shown today. |

---

## 14. Open questions

- **Q1 — URL scheme and locale prefix.** The current site uses `/ru/...`. Should the new app live at `/<locale>/research`… with the landing at `/<locale>`, or is `/research` the logged-in home? Collisions with existing `/ideas` and `/saved` routes need a decision (they move to `/old/...`?).
- **Q2 — Anonymous access.** Can an unauthenticated visitor read the free article and the catalog (the SEO case), or only the landing page? The app has no accounts at all.
- **Q3 — Persistence.** Bookmarks and notes are device-local in the app. On the web: account-synced or localStorage? If synced, the copy «Заметка хранится на этом устройстве…», «Сохранено на этом iPhone», «…остаются на устройстве» needs web variants.
- **Q4 — Plus on the web.** How does web access map to App Store entitlements (annual or lifetime)? Is there a shared account or a web purchase? That decides whether `isUnlocked` can be true for an iOS buyer on the web.
- **Q5 — Launch artwork alt texts** are Russian only in `launch-research-artwork.json`. Generate localized alts from the patterns in §6.9, or ship Russian as in the app?
- **Q6 — Two quotes** have no DE/FR/JA translation (`run-tracking/pause`, `flashcards/generation`) and fall back to English. Accept that (it matches the app), or translate for the web?
- **Q7 — «Другие возможности» and «Другие идеи категории»** never render with the current data. Implement anyway for future content (recommended, cheap), or drop?
- **Q8 — Legacy screens** (problem, legacy card, stored project, saved app, ratings): confirm they are out of scope for site-v2 (recommended), given web users have no legacy iOS data.
- **Q9 — Should the web add share or copy-link on articles?** The app deliberately has none. Adding it would be a parity deviation (for SEO, a share link to a locked topic would land on the locked preview).
