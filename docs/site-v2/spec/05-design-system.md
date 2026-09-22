# 05 — Design system (web translation of the iOS "Clarity" shell)

Status: research spec, 2026-09-22. Source of truth: `/Users/artsaverin/projects/app_04_inapp/Inapp/` (live shell = `Inapp/Clarity/*`, palette = `Inapp/Studio/StudioStyle.swift`).
All paths below are relative to `/Users/artsaverin/projects/app_04_inapp/` unless absolute. Measurements are iOS points; **1 pt = 1 CSS px** (both are 1/160-inch logical units on iPhone), so values map 1:1.

Goal: the new inapp.pro must look like the app — light grey "paper", white rounded cards, a Georgia reading voice, SF-style UI text, one cobalt accent, and a floating capsule tab bar. It must NOT look like the old site (near-black, orange `#FF7A1A`, Inter 800), which stays under `/old`.

---

## 0. TL;DR for implementers

| Decision | Value | Source |
|---|---|---|
| Default theme | **Light** (not system). User can choose Светлая / Тёмная / Системная | `Inapp/Clarity/ClarityRoot.swift:31,85`, `Inapp/Clarity/ClaritySettings.swift:16,145-149` |
| Background | `#F5F5F7` / dark `#111214` | `Inapp/Studio/StudioStyle.swift:5` |
| Reading background (articles, idea reader, reading sheets) | `#FCFCFD` / dark `#17181B` | `Inapp/Clarity/ClarityReadingStyle.swift:6` |
| Cards & controls | `#FFFFFF` / dark `#1D1E22` | `StudioStyle.swift:6` |
| Text | ink `#191A20` / `#F2F2F5`; secondary `#666872` / `#AAADB8` | `StudioStyle.swift:7-8` |
| Accent (links, selected tab, icons) | `#3458DB` / dark `#94AAFF` | `StudioStyle.swift:9` |
| Primary button fill | `#3458DB` in **both** themes, white label | `StudioStyle.swift:10` |
| Selected-state tint (pills, badges) | `#EDF1FF` / dark `#262D45` | `StudioStyle.swift:12` |
| Hairlines | `#DEDFE5` / dark `#383A42`, usually at 55–70 % alpha | `StudioStyle.swift:21` |
| Reading/serif voice | **Georgia** regular (titles 30, card titles 22, body 19, lead/quote 20) | `ClarityReadingStyle.swift:12-19` |
| UI voice | System sans (SF Pro) at iOS text-style sizes | `ClarityReadingStyle.swift:13-14,17`, many call sites |
| Onboarding / paywall / landing display face | **Onest** variable (OFL, bundled) 900 for headlines | `Inapp/Clarity/ClarityWelcomeTypography.swift:5-47`, `Inapp/Resources/Fonts/Onest.ttf` |
| Column widths | catalogs 680, saved/settings 660, reader 640, welcome 440 | `ClarityCatalogs.swift:78,219`, `ClarityMy.swift:77`, `ClarityReader.swift:190`, `ClarityPaywall.swift:59` |
| Navigation | Floating capsule with 3 items (Разборы / Идеи / Сохранённое), only on root screens | `ClarityFloatingTabBar.swift`, `ClarityRoot.swift:73-81` |
| Reduce motion | Every animation is gated by Reduce Motion (+ app motion flag, foreground, VoiceOver/AX sizes for the rich ones) | §5 |

---

## 1. Color tokens

### 1.1 Core palette (live Clarity shell)

All colors are defined through `StudioStyle.adaptive(light, dark)` (`Inapp/Studio/StudioStyle.swift:23-28`) and re-exported by `ClarityStyle` (`Inapp/Clarity/ClarityStyle.swift:3-18`). Pixel sampling of the 2026-09-20 simulator screenshots matches these hex values exactly (e.g. `refresh-ideas-light.png`: bg `#F5F5F7`, search `#FFFFFF`, selected tab text `#3458DB` on `#EDF1FF`; `refresh-ideas-dark.png`: `#111214`, `#1D1E22`, `#94AAFF` on `#262D45`; reader `#FCFCFD` / `#17181B`).

| Web token | Semantic role | Light | Dark | Swift source | Where it is used |
|---|---|---|---|---|---|
| `--ia-paper` | App background (catalogs, Saved, Settings, onboarding, paywall, locked gate) | `#F5F5F7` | `#111214` | `StudioStyle.paper` `StudioStyle.swift:5`; `ClarityBackground` `ClarityStyle.swift:20-24` | every non-reading screen |
| `--ia-paper-reading` | Long-form reading background | `#FCFCFD` | `#17181B` | `ClarityReadingStyle.paper` `ClarityReadingStyle.swift:6` | research article, idea reader, problem reader, reading sheets, note editor, export sheet, TOC sheet (`ClarityReader.swift:192,220,569,703,887,922,1003`) |
| `--ia-surface` | Cards, search field, tab bar, grouped lists, pills, gear button | `#FFFFFF` | `#1D1E22` | `StudioStyle.surface` `:6`; `ClarityStyle.tabBarSurface` `ClarityStyle.swift:17` | cards, search `ClarityStyle.swift:144`, tab bar `ClarityFloatingTabBar.swift:26` |
| `--ia-ink` | Primary text & glyphs | `#191A20` | `#F2F2F5` | `StudioStyle.ink` `:7` | titles, body, reading text |
| `--ia-secondary` | Secondary text, idle icons, placeholders, idle tab icons | `#666872` | `#AAADB8` | `StudioStyle.secondary` `:8` | subtitles, meta, captions |
| `--ia-accent` | Interactive tint: selected tab/chip label, links, check marks, lock on paid idea, "inApp PLUS" eyebrow, "Готово" in Settings | `#3458DB` | `#94AAFF` | `StudioStyle.accent` `:9`; app-wide `.tint(ClarityStyle.accent)` `ClarityRoot.swift:84` | |
| `--ia-action` | Filled primary-button background | `#3458DB` | `#3458DB` (unchanged) | `StudioStyle.action` `:10` | `ClarityButton` `ClarityStyle.swift:100`, welcome button `ClarityWelcomeComponents.swift:37`, Plus CTA `ClaritySettings.swift:239`, empty-state CTA `ClarityMy.swift:123` |
| `--ia-on-action` | Label on action fill | `#FFFFFF` | `#FFFFFF` | `.foregroundStyle(.white)` `ClarityStyle.swift:100` | contrast 5.89:1 |
| `--ia-accent-soft` | Selected/soft tint ("sky"): selected tab pill, selected Saved filter, "Бесплатный разбор" badge, Plus card header band, idea "inset" block, numbered circles, empty-state icon tile, onboarding quote paper & ellipse | `#EDF1FF` | `#262D45` | `StudioStyle.sky` `:12` → `ClarityStyle.accentSoft/mint/lilac` `ClarityStyle.swift:12,14-15` | `ClarityFloatingTabBar.swift:60`, `ClarityMy.swift:105,115`, `ClarityCatalogs.swift:138`, `ClaritySettings.swift:219`, `ClarityReader.swift:605,645,1022` |
| `--ia-soft` | Neutral plate behind object art when an idea has no cover | `#EBECF0` | `#28292F` | `ClarityStyle.soft` `ClarityStyle.swift:11`; `ClarityIdeaCardArt.swift:32-34` | idea-art fallback, `ClarityArt` "peach" layer |
| `--ia-line` | Separators, article rules, card strokes, inline-quote rule | `#DEDFE5` | `#383A42` | `StudioStyle.line` `:21`; `ClarityReadingStyle.rule` `ClarityReadingStyle.swift:9` | see alpha table 1.2 |
| `--ia-danger` | Persistence/storage errors in Saved | `#C0443F` | `#F4928C` | `StudioStyle.coral` `:11` → `ClarityStyle.danger` `ClarityStyle.swift:13`; used `ClarityMy.swift:75` | |
| `--ia-error-system` | Purchase error text on paywall (iOS system red) | `#FF3B30` | `#FF453A` | `.foregroundStyle(.red)` `ClarityPaywall.swift:197` | paywall only |
| `--ia-success` | Defined but not visibly used by Clarity | `#26714E` | `#80C9A3` | `StudioStyle.green` `:20` → `ClarityWelcomeTheme.green` `ClarityWelcomeComponents.swift:9` | reserve |

Not used by Clarity (do not port): `StudioStyle.yellow #F1F1F4/#28292E` (`:13`, only legacy `categoryColor`), everything in `Inapp/DesignSystem/*` (see §7 discrepancies).

### 1.2 Alpha variants actually used

| Web token | Formula | Where | Source |
|---|---|---|---|
| `--ia-line-card` | line @ 55 % | stroke of `clarityCard` (empty states, locked gate card), Plus card stroke | `ClarityStyle.swift:109`, `ClaritySettings.swift:249` |
| `--ia-line-65` | line @ 65 % | research card & idea card strokes, row dividers in Saved & Settings | `ClarityCatalogs.swift:148`, `ClarityIdeaCard.swift:63`, `ClarityMy.swift:229`, `ClaritySettings.swift:293` |
| `--ia-line-70` | line @ 70 % | tab bar capsule stroke | `ClarityFloatingTabBar.swift:27` |
| `--ia-line-80` | line @ 80 % | `ClarityArt` paper stroke | `ClarityStyle.swift:76` |
| `--ia-line-75` | line @ 75 % | "tape" strip on onboarding quote paper | `ClarityWelcomeContentPreview.swift:105` |
| `--ia-ink-045` | ink @ 4.5 % | welcome back-button circle fill | `ClarityWelcomeComponents.swift:93` |
| `--ia-ink-16` | ink @ 16 % | inactive progress dot | `ClarityWelcomeComponents.swift:108` |
| `--ia-ink-055` | "primary" @ 5.5 % | selected plan row fill (paywall) | `ClarityPaywall.swift:122` |
| `--ia-ink-65` / `--ia-ink-15` | "primary" @ 65 % / 15 % | selected / idle plan row border | `ClarityPaywall.swift:124` |
| `--ia-accent-17` | accent @ 17 % | back layer of `ClarityArt` | `ClarityStyle.swift:60` |
| `--ia-accent-24` / `-13` / `-08` | accent @ 24/13/8 % | onboarding animated review cards (bars, shadow, stroke) | `ClarityWelcomeIllustration.swift:83,165-171` |

### 1.3 Contrast (computed, WCAG relative luminance)

| Pair | Light | Dark |
|---|---|---|
| ink / paper | 15.94 | 16.77 |
| ink / surface | 17.36 | 14.90 |
| secondary / paper | 5.09 | 8.37 |
| secondary / surface | 5.54 | 7.44 |
| secondary / paper-reading | 5.41 | 7.93 |
| accent / paper | 5.41 | 8.44 |
| accent / surface | 5.89 | 7.50 |
| accent / accent-soft | 5.23 | 6.12 |
| white / action | 5.89 | 5.89 |
| danger / paper | 4.66 | 8.33 |
| line / surface (non-text) | 1.33 | 1.47 |

All text pairs pass AA for body text. `--ia-line` is decorative only — never use it as the sole indicator of a control boundary on web (inputs sit on a contrasting surface instead, as in the app). The doc `Documentation/LibraryRefresh-2026-09-20/README.md:19` reports the same 5.54/7.44, 5.23/6.12 and 5.89 figures.

### 1.4 System-rendered surfaces (approximations — no Swift hex exists)

| Web token | Light | Dark | Basis |
|---|---|---|---|
| `--ia-glass` (toolbar pills "Назад", bookmark/TOC/⋯ group, sheet "Готово"/"Отмена"/"Сохранить") | `rgb(254 254 255 / .86)` + blur | `rgb(34 35 39 / .86)` + blur + hairline | iOS 26 Liquid Glass drawn by the system; sampled `#FEFEFF` / `#222327` in `LibraryRefresh-2026-09-20/Screenshots/refresh-reader-{light,dark}.png` |
| `--ia-scrim` (behind sheets/modals) | `rgb(0 0 0 / .20)` | `rgb(0 0 0 / .48)` | eyeballed from `refresh-paywall-light.png`, `plus-composition-light.png` top area; system value |
| `::selection` | accent @ 22 % | accent @ 30 % | iOS uses tint for selection; reading text is selectable (`.textSelection(.enabled)` `ClarityReader.swift:770,870`) |

### 1.5 Marketing / landing palette (App Store posters, not in-app)

From `Tools/render_storefront.swift` (composes the 2026-09-21 store screenshots). Use only on the unauthenticated landing, never inside the product UI.

| Token | Value | Source |
|---|---|---|
| `--ia-poster-ink` | `#171C2B` | `render_storefront.swift:12` |
| `--ia-poster-cobalt` | `linear-gradient(180deg, #204AF0, #557CF8)` — white headline | `:27,67` (01 "Найди идею для приложения") |
| `--ia-poster-yellow` | `linear-gradient(180deg, #F7C955, #FFF1CC)` | `:27` (02) |
| `--ia-poster-green` | `linear-gradient(180deg, #81D1AC, #E7F6E8)` | `:27` (03) |
| `--ia-poster-lilac` | `linear-gradient(180deg, #C1ABEF, #F0EAFB)` | `:27` (04) |
| `--ia-poster-sky` | `linear-gradient(180deg, #8FB6EF, #EBF3FE)` | `:27` (05) |
| decorative discs | white @ 8 % on cobalt, @ 22 % on the others; r ≈ 190–230 px on a 1320-wide canvas | `:62-66` |
| device frame | white 14 px border, radius 72 (+14), shadow black 20 % blur 48 y 24, tilt −3° / +3° | `:40-53,75` |
| App icon colors (sampled) | cobalt paper `#1C4DDB`, yellow paper star `#FCD424` with orange/red paper layers | `Inapp/Resources/Assets.xcassets/AppIcon.appiconset/icon-rating-paper-cobalt-1024.png` |

Poster headline copy (all 5 locales) lives at `render_storefront.swift:13-26` — reuse for landing section headings, e.g. ru "Найди идею\nдля приложения" / en "Find your next\napp idea"; captions "35 тем. Реальные отзывы. Новые возможности." / "35 topics. Real reviews. New possibilities.". Poster contrast: white on `#204AF0` 6.37:1 but white on `#557CF8` only 3.73:1 → keep white text in the upper (darker) part of the cobalt gradient, or darken the stop.

---

## 2. Typography

### 2.1 Families and web mapping

| Role family | iOS | Web stack | Hosting / license |
|---|---|---|---|
| **Reading serif** (catalog H1, article titles, card titles, body, lead, quotes) | `Font.custom("Georgia", size:relativeTo:)` regular only — never bold | `--ia-font-serif: Georgia, "Gelasio", "PT Serif", "Noto Serif", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;` | Georgia is a Microsoft/Monotype system font present on macOS, iOS, Windows — **cannot be self-hosted**; reference as local only. Fallbacks for Android/Linux/ChromeOS: **Gelasio** (OFL, designed metric-compatible with Georgia) then **PT Serif** (OFL, full Cyrillic). Japanese: Georgia has no kana → iOS falls back to Mincho (visible in `AppStore/Release-2026-09-21/screenshots/ja/03.png`); mirror with Hiragino Mincho / Yu Mincho / Noto Serif JP. Source comment: "Georgia supplies the same readable serif for Russian and English" `ClarityReadingStyle.swift:3-4`. |
| **UI sans** (section headings, buttons, meta, lists, tab labels, Saved/Settings titles) | SF Pro via `Font.system(.textStyle)` | `--ia-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif;` | System fonts only (SF Pro may not be self-hosted — Apple license restricts it to Apple platforms). Optional: self-host Inter (already in `/public/og-fonts` of this repo) as the non-Apple fallback for closer metrics — see open questions. |
| **Rounded** (tab-bar label only) | `.system(.subheadline, design: .rounded).weight(.semibold)` `ClarityFloatingTabBar.swift:48` | `--ia-font-rounded: ui-rounded, "SF Pro Rounded", var(--ia-font-sans);` | `ui-rounded` resolves to SF Pro Rounded in Safari; others fall back to sans. |
| **Plus-card serif** | `.system(.title2, design: .serif).weight(.semibold)` = New York `ClaritySettings.swift:223` | `--ia-font-serif-ui: ui-serif, "New York", var(--ia-font-serif);` | `ui-serif` = New York in Safari. Only one element uses it. |
| **Display** (onboarding & paywall headings/copy; landing hero) | Onest variable, registered at runtime `ClarityWelcomeTypography.swift:15-33`; weight via `wght` axis | `--ia-font-display: "Onest", var(--ia-font-sans);` | **Self-host** `Inapp/Resources/Fonts/Onest.ttf` (variable, `wght` 100–900 default 400, v2.001, family "Onest", PostScript `Onest-Regular`, 193 KB). License: SIL OFL 1.1, `Inapp/Resources/Fonts/Onest-LICENSE.txt` (Copyright 2021 The Onest Project Authors). Convert to WOFF2, subset Latin + Latin-ext + Cyrillic (no Japanese glyphs — ja falls back to `Hiragino Sans`/`Noto Sans JP`). Load with `next/font/local` (`weight: "100 900"`, `display: "swap"`). Also on Google Fonts as "Onest". |

Vertical metrics used for line-height math: Georgia hhea asc 1878 / desc 449 / gap 0 @ 2048 upm → natural line-height **1.136**; Onest 970 / 305 / 0 @ 1000 → **1.275**; SF uses Apple's text-style leading (body 17/22 etc.). SwiftUI `.lineSpacing(n)` adds `n` pt to the natural line height, so CSS `line-height = natural + n`.

### 2.2 Type roles (px = pt; line-height given as px and unitless)

Reading & catalog voice (Georgia, weight 400 everywhere):

| Role | Token prefix | Size | Line-height | Color | Source |
|---|---|---|---|---|---|
| Catalog page title ("Разборы", "Идеи"), article/idea title, note-editor title, locked-gate title | `--ia-type-title` | 30 | 34 (1.136) | ink | `ClarityReadingStyle.swift:12`; `ClarityStyle.swift:119`; `ClarityReader.swift:735,913` |
| Catalog subtitle ("Что людям важно в приложениях и чего им не хватает.") | `--ia-type-subtitle` | 19 | 26.6 (1.40) | secondary | `ClarityStyle.swift:122` (body + lineSpacing 5) |
| Article standfirst under title (lead) | `--ia-type-lead` | 20 | 28.7 (1.436) | secondary | `ClarityReadingStyle.swift:16`; `ClarityReader.swift:739` (lineSpacing 6) |
| Reading body paragraph | `--ia-type-body-serif` | 19 | 27.6 (1.452) | ink | `ClarityReadingStyle.swift:15`; `ClarityReader.swift:769` (lineSpacing 6) |
| First paragraph of a "lead" block (Главное) | `--ia-type-lead` (ink, not secondary) | 20 | 28.7 (1.436) | ink | `ClarityReader.swift:236,769` |
| Quote text | `--ia-type-quote` | 20 | 29.7 (1.486) | ink | `ClarityReadingStyle.swift:18`; `ClarityReader.swift:870` (lineSpacing 7) |
| Card title (research + idea cards, idea inset-block title) | `--ia-type-card-title` | 22 | 27 (1.227) | ink | `ClarityReadingStyle.swift:19`; `ClarityCatalogs.swift:117-118`; `ClarityIdeaCard.swift:37-38`; `ClarityReader.swift:637` |
| Idea card description | `--ia-type-subtitle` | 19 | 26.6 (1.40) | secondary | `ClarityIdeaCard.swift:41` |
| "Готовим следующие разборы" body | `--ia-type-subtitle` (ink) | 19 | 26.6 | ink | `ClarityCatalogs.swift:71-72` |

UI voice (system sans; iOS default "Large" content size):

| Role | iOS style | Size / LH | Weight | Letter-spacing (web approx.) | Source |
|---|---|---|---|---|---|
| Saved screen title "Сохранённое" | largeTitle | 34 / 41 | 700 | −1px (explicit `.tracking(-1)`) | `ClarityMy.swift:89` |
| Settings title "Настройки" | title2 | 22 / 28 | 700 | −0.26px | `ClaritySettings.swift:185` |
| Article section heading (h2: "Главное", section/observation titles, "Из отзывов") | title2 | 22 / 28 | 600 | −0.26px | `ClarityReadingStyle.swift:13`; `ClarityReader.swift:262,619,758` |
| Empty-state title "Пока нет сохранённого" | title2 | 22 / 28 | 600 | | `ClarityMy.swift:117` |
| Subheading (h3: audience titles, direction titles, "Готовим следующие разборы", export list title) | headline | 17 / 22 | 600 | −0.43px | `ClarityReadingStyle.swift:14`; `ClarityReader.swift:246,293`; `ClarityCatalogs.swift:69` |
| Button label (`ClarityButton`, row titles in `ClarityRow`, "Идея доступна в Plus") | headline | 17 / 22 | 600 | −0.43px | `ClarityStyle.swift:97,157`; `ClarityContentAccess.swift:85` |
| Saved group heading ("Разборы 1") | headline + subheadline count | 17/22 + 15/20 tabular | 600 / 400 secondary | | `ClarityMy.swift:222-223` |
| Research card summary | body | 17 / 26 (22 + 4 = 1.53) | 400 | −0.43px | `ClarityCatalogs.swift:129-132` |
| UI body (search input, settings rows, note textarea, info text) | body | 17 / 22 | 400 | −0.43px | `ClarityStyle.swift:137`; `ClaritySettings.swift:324`; `ClarityReader.swift:915` |
| Toolbar "Назад", saved row title | body | 17 / 22 | 500 | | `ClarityBackNavigation.swift:14`; `ClarityMy.swift:296` |
| Inline nav title ("Идея", "Наблюдение", "Содержание", "Моя заметка") | headline (system) | 17 / 22 | 600 | | `ClarityReader.swift:570,221,923` |
| Tab label (selected only) | subheadline, rounded | 15 / 20 | 600 | −0.23px | `ClarityFloatingTabBar.swift:48` (Dynamic Type capped at xxxLarge `:49`, min scale 0.8 `:51`) |
| Saved filter chip, "Все категории" pill label | subheadline | 15 / 20 | 600 / 500 | −0.23px | `ClarityMy.swift:103`; `ClarityCatalogs.swift:210` |
| Settings section label ("Оформление", "Приложение") | subheadline | 15 / 20 | 600, secondary | | `ClaritySettings.swift:289` |
| Secondary line (saved subtitle, "Найдено: N", disclaimers) | subheadline | 15 / 20 | 400, secondary | | `ClarityMy.swift:90`; `ClarityCatalogs.swift:49` |
| Caption / meta (idea-card category line, footnotes, "Сохранено на этом iPhone", note hint) | footnote | 13 / 18 | 400, secondary | −0.08px | `ClarityReadingStyle.swift:17`; `ClarityIdeaCard.swift:52-53`; `ClarityMy.swift:70` |
| Badge ("Бесплатный разбор") | caption | 12 / 16 | 600 | 0 | `ClarityCatalogs.swift:135-136` |
| Eyebrow "inApp PLUS" | caption | 12 / 16 | 700, accent | +0.8px (explicit) | `ClaritySettings.swift:205` |
| Saved row detail ("Разбор", category) | caption | 12 / 16 | 400, secondary | | `ClarityMy.swift:297` |

Display voice (Onest; onboarding, paywall, recommended for landing):

| Role | Size (Dynamic Type cap) | Weight | Line-height | Tracking | Color | Source |
|---|---|---|---|---|---|---|
| Welcome / paywall headline ("1,4 млн отзывов", "Полный доступ") | 38 (cap 48) | 900 | 44.5 (1.17): natural 48.45 − 4 | −0.75px (≈ −0.02em) | ink | `ClarityWelcomeTypography.swift:8-9,36-46` |
| Welcome description | 18 (cap 26) | 450 | 26 (1.44): natural 22.95 + 3 | 0 | secondary | `:10-11,49-58`; max width 360 `:13` |
| Title↔description gap | 10 | | | | | `:12` |
| Welcome button label | 17 (cap ×1.45 → 24.6) | 600 | natural | | white | `ClarityWelcomeComponents.swift:27` |
| Skip/Close, secondary link | 15 / 13 | 500 | | | secondary | `ClarityOnboarding.swift:126`; `ClarityWelcomeComponents.swift:65` |
| Paywall plan title / detail / price | 16 / 12 / 15 | 650 / 400 / 600 | | | ink / secondary / ink | `ClarityPaywall.swift:113-118` |
| Paywall legal links ("Восстановить · Условия · Приватность") | 12 | 550 | | | ink | `ClarityPaywall.swift:299` |
| Onboarding preview: category label | 10 | 550 | | | accent | `ClarityWelcomeContentPreview.swift:57,89` |
| Onboarding preview: card title | 18 | 900 | 1.275 | | ink | `:60,126` |
| Onboarding preview: excerpt | 14 | 400 | 20.9 (1.49) | | ink / secondary | `:75,129` |

Dynamic Type caps for the non-headline Onest roles: max = size × 1.45 if < 20, × 1.30 if < 28, × 1.15 otherwise (`ClarityWelcomeTypography.swift:68`).

### 2.3 Web scaling rules

- Define sizes in `rem` with `html { font-size: 100% }` so browser text-size settings play the Dynamic Type role; the numbers above are the 16 px-root values (e.g. 19 px = 1.1875 rem).
- Keep the caps: `font-size: min(2.375rem, 48px)`-style clamps for the display headline (`clamp(2.375rem, …, 3rem)`), description capped at 26 px.
- Desktop (proposal, not in app): catalog H1 and article title may grow to `clamp(1.875rem, 1.2rem + 1.6vw, 2.5rem)` (30 → 40 px) at ≥ 1024 px; **reading body stays 19 px** and lead/quote 20 px — the 640 px measure gives ~65–72 characters per line in Georgia.
- Georgia is used only at weight 400 in the app. Do not synthesize bold serif (`font-synthesis: none` on serif roles).
- Onest `font-variation-settings` is unnecessary on web — use `font-weight: 450 | 550 | 650 | 900` directly (variable font).
- Letter-spacing values for SF roles above approximate Apple's automatic tracking; they are optional on non-Apple fallbacks.

---

## 3. Layout, spacing, radii, shadows, components

### 3.1 Spacing scale (all values that occur in Clarity)

`4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 32` (plus one-offs 2, 3, 5, 7, 9, 11, 13, 15, 17, 27).

| Semantic token | Value | Source |
|---|---|---|
| `--ia-gutter-catalog` (page side padding: research, ideas, saved, settings) | 20 | `ClarityCatalogs.swift:77,218`; `ClarityMy.swift:77`; `ClaritySettings.swift:77` |
| `--ia-gutter-reader` (article, idea, sheets, locked gate, note) | 22 | `ClarityReader.swift:190,567,886,921`; `ClarityContentAccess.swift:112` |
| `--ia-gutter-welcome` (onboarding, paywall, footer) | 24 | `ClarityOnboarding.swift:84,134`; `ClarityPaywall.swift:58` |
| Catalog top padding / bottom | 24 / 24 (+ tab bar inset) | `ClarityCatalogs.swift:77` |
| Research list gap (heading → search → cards) | 24 | `ClarityCatalogs.swift:42` |
| Ideas list gap | 14 | `ClarityCatalogs.swift:189` |
| Saved stack gap / search→filters gap | 26 / 14 | `ClarityMy.swift:48,51` |
| Settings section gap / heading→group gap | 28 / 12 | `ClaritySettings.swift:42,283` |
| Article: top-level block gap | 32 (research & idea), 28 (problem & sheets) | `ClarityReader.swift:156,488,682,885` |
| Article: section internal gap (rule → h2 → content) | 20, rule has +4 below | `ClarityReader.swift:750-751` |
| Paragraph gap | 20 | `ClarityReader.swift:767` |
| Observation block gap / between observations | 18 / divider with 12 above & below | `ClarityReader.swift:260-261` |
| Idea article blocks gap | 24; in-article h2 gets +16 top | `ClarityReader.swift:609,621` |
| Hero title → lead | 18 | `ClarityReader.swift:725` |
| Heading → subtitle (catalog) | 10 | `ClarityStyle.swift:118` |
| Article bottom padding | 24 + 32 | `ClarityReader.swift:190` |

### 3.2 Container widths & breakpoints

App maxima (content column, excluding gutters): catalogs **680** (`ClarityCatalogs.swift:78,219`), Saved & Settings **660** (`ClarityMy.swift:77`, `ClaritySettings.swift:77,195`), reader & sheets **640** (`ClarityReader.swift:190,567,886`), welcome chrome **600** (`ClarityWelcomeComponents.swift:82`, `ClarityOnboarding.swift:135`), welcome/paywall content **440** (`ClarityOnboarding.swift:90`, `ClarityPaywall.swift:59`), welcome copy **360** (`ClarityWelcomeTypography.swift:13`), onboarding preview ≤ 420 and illustration ≤ 354 (`ClarityOnboarding.swift:52-53`).

Web breakpoints (proposal; app only has one column):

| Name | Viewport | Catalog (Разборы / Идеи) | Reader | Saved / Settings | Navigation |
|---|---|---|---|---|---|
| `xs` | < 480 | 1 column, gutters 20 | column = viewport − 44 | 1 column | bottom floating capsule |
| `sm` | 480–759 | 1 column, max 680 centered | max 640 | max 660 | bottom floating capsule |
| `md` | 760–1023 | **2-column card grid**, container max 1040, gap 24 (research) / 20 (ideas); heading + search span the grid, search max 680 | max 640 centered | max 660 | bottom floating capsule |
| `lg` | 1024–1279 | 2 columns, container max 1080 | 640 column; optional sticky TOC rail on the left at ≥ 1200 | max 660 | **top sticky capsule** (all labels visible) |
| `xl` | ≥ 1280 | **3 columns**, container max 1200, gap 28 | same | same | top sticky capsule |

Grid rules: cards keep their internal geometry (art 3:2, padding 22/20) and stretch to equal height per row (`align-items: stretch`, text block `flex: 1`). Order is identical to the app list (illustrated research first, then alphabetical — `ClarityCatalogs.swift:14-37`; free ideas first when not unlocked — `:175-182`).

### 3.3 Radii

SwiftUI uses `.continuous` (squircle) corners on the most visible shapes. Web default: plain `border-radius` with the same value; progressive enhancement `corner-shape: superellipse(…)` only after visual QA.

| Token | Value | Used by | Source |
|---|---|---|---|
| `--ia-radius-tag` | 4 | onboarding topic "paper tags" | `ClarityWelcomeIllustration.swift:116` |
| `--ia-radius-paper-sm` | 5–6 | onboarding article/quote papers, review mini-cards | `ClarityWelcomeContentPreview.swift:81,103`; `ClarityWelcomeIllustration.swift:170` |
| `--ia-radius-paper` | 9 | onboarding idea papers | `ClarityWelcomeContentPreview.swift:136` |
| `--ia-radius-preview` | 10 inner / 14 ring | theme preview tiles | `ClaritySettings.swift:172-174` |
| `--ia-radius-thumb` | 12 | Saved row thumbnails; idea "inset" block | `ClarityMy.swift:285,289`; `ClarityReader.swift:645` |
| `--ia-radius-button` | 14 | rectangular CTAs (Plus card "Открыть Plus", empty-state "Открыть разборы") | `ClaritySettings.swift:239`; `ClarityMy.swift:123` |
| `--ia-radius-field` | 16 | search field; `ClarityRow` icon tile | `ClarityStyle.swift:144,155` |
| `--ia-radius-group-sm` | 18 | Saved groups, restore group, paywall plan rows, empty icon tile | `ClarityMy.swift:115,225`; `ClaritySettings.swift:270`; `ClarityPaywall.swift:123` |
| `--ia-radius-card` | 20 | `clarityCard`, settings groups, artwork (`artworkShape`), AX category button | `ClarityStyle.swift:108`; `ClaritySettings.swift:123,142,285`; `ClarityReadingStyle.swift:10` |
| `--ia-radius-idea-card` | 24 | idea card, Plus card, empty-state card | `ClarityIdeaCard.swift:17`; `ClaritySettings.swift:248`; `ClarityMy.swift:125` |
| `--ia-radius-note` | 26 | note textarea | `ClarityReader.swift:916` |
| `--ia-radius-research-card` | 28 | research catalog card | `ClarityCatalogs.swift:147` |
| `--ia-radius-pill` | 999 | tab bar, tab pill, chips, badges, capsule buttons, "Готово" pill, search-less pills | many |
| `--ia-radius-sheet` | ≈ 38 top corners (mobile sheet), 28 (desktop modal) | system sheets | approximation of iOS 26 sheets (`refresh-note-editor-dark.png`) |

### 3.4 Shadows

Conversion used: SwiftUI `shadow(radius: r, y: dy)` ≈ CSS `0 dy (2r) color` (Gaussian radius → CSS blur). Shadows use black in both themes (they practically vanish on dark; the hairline strokes carry separation there).

| Token | CSS | Where | Source |
|---|---|---|---|
| `--ia-shadow-research-card` | `0 6px 32px rgb(0 0 0 / .055)` | research catalog card | `ClarityCatalogs.swift:149` |
| `--ia-shadow-idea-card` | `0 6px 28px rgb(0 0 0 / .05)` | idea card (+6 px bottom margin) | `ClarityIdeaCard.swift:65,67` |
| `--ia-shadow-tabbar` | `0 8px 36px rgb(0 0 0 / .12)` | floating tab capsule | `ClarityFloatingTabBar.swift:28` |
| `--ia-shadow-tab-pill` | `0 1px 6px rgb(0 0 0 / .04)` | selected tab pill | `ClarityFloatingTabBar.swift:62` |
| `--ia-shadow-glass` | `0 4px 24px rgb(0 0 0 / .08)` (approx.) | toolbar glass pills | system; screenshot |
| `--ia-shadow-paper` | `0 7px 20px rgb(0 0 0 / .085)`; entering `0 19px 42px rgb(0 0 0 / .14)` | onboarding papers | `ClarityWelcomeContentPreview.swift:195-196` |
| `--ia-shadow-illustration` | `0 9px 24px rgb(0 0 0 / .045)` | onboarding/landing hero illustration | `ClarityWelcomeIllustration.swift:57` |
| `--ia-shadow-tag` | `0 6px 16px rgb(0 0 0 / .075)` | floating topic tags | `ClarityWelcomeIllustration.swift:124` |
| `--ia-shadow-art` | `0 (size·.025) (size·.12) rgb(0 0 0 / .09)` | `ClarityArt` loading/error illustration | `ClarityStyle.swift:77` |
| `--ia-shadow-device` | `0 24px 48px rgb(0 0 0 / .20)` | landing device mockups | `render_storefront.swift:47` |

Flat (no shadow): search field, grouped lists (Saved/Settings), `clarityCard`, pills, chips, Plus card (stroke only).

### 3.5 Strokes

Hairline in the app is 0.5–0.7 pt. Web: `1px` solid with the alpha variants from §1.2; on `(min-resolution: 2dppx)` use `0.5px` for tab bar / gear / `clarityCard` (0.5 pt sources) and keep `1px` for the research & idea cards (0.7 pt sources, `ClarityCatalogs.swift:148`, `ClarityIdeaCard.swift:63`). Theme preview ring: 1 px line idle, **2 px accent** selected (`ClaritySettings.swift:174`). Paywall plan: 1 px ink@15 % idle, 1.5 px ink@65 % selected (`ClarityPaywall.swift:124`).

### 3.6 Component specs

#### A. Page header (catalogs) — `ClarityHeading`
- Title Georgia 30 ink (h1) + optional subtitle Georgia 19/26.6 secondary, gap 10, left aligned (`ClarityStyle.swift:114-127`).
- Copy: Разборы — "Разборы" / "Что людям важно в приложениях и чего им не хватает." (en "Breakdowns" / "What matters to people in apps and what they are missing."). Идеи — "Идеи" / Plus: "Что можно создать или улучшить." (en "What could be built or improved."), free: "5 идей бесплатно. Остальные — в Plus." (en "5 ideas for free. The rest with Plus.") (`ClarityCatalogs.swift:43,190`).
- Saved uses a **different** header: SF 34 bold tracking −1 + 15 secondary subtitle ("Материалы и личные заметки" / "Твоя библиотека"; en "Materials and personal notes" / "Your library"), plus a 46×46 circular gear button on the right (surface fill, 0.5 px line stroke, glyph 20) (`ClarityMy.swift:86-97`). Keep this asymmetry for parity.

#### B. Search field — `ClaritySearch`
- Height min 56, padding-inline 18, gap 12, radius 16, background surface, **no border, no shadow** (`ClarityStyle.swift:129-146`).
- Leading magnifier glyph 18 secondary; input 17 ink; placeholder secondary.
- Clear button appears when non-empty: filled x-circle 18, hit area 32×32, a11y "Очистить поиск" / "Clear search".
- Placeholders: research "Категория или потребность" ("Category or need"), ideas "Идея или потребность" ("Idea or need"), saved "Найти в сохранённом" ("Search Saved"), category sheet "Найти категорию" ("Search categories").
- Focus (web-only): `outline: 2px solid var(--ia-accent); outline-offset: 2px` on `:focus-visible` of the wrapper; `enterkeyhint="search"`; autocorrect off (`ClarityStyle.swift:137`).
- Result count line under it: "Найдено: N" ("Found: N"), 15 secondary (`ClarityCatalogs.swift:48-49`).

#### C. Research catalog card — `ClarityResearchCatalogCard`
- Container: surface, radius 28, stroke line@65 % 0.7, shadow `--ia-shadow-research-card`, overflow hidden (`ClarityCatalogs.swift:146-149`).
- Top: cover image, aspect **3:2**, full-bleed, no own radius (clipped by card) (`:100-104`). Assets are 1200×800 JPG (`ResearchInterior_cover`, `ResearchLaunch_*_cover`); serve AVIF/WebP at 680 and 1360 widths.
- Fallback (no cover): flat accent-soft plate (the gradient is mint→lilac but both equal `accentSoft`) with a 64 pt light SF glyph in accent (`:105-112`).
- Text block: padding 22, gap 10 (`:114,143`):
  - Title Georgia 22/27 ink; if locked, trailing outline **lock** glyph 15 secondary on the first baseline, a11y "Полный разбор в Plus" ("Full breakdown in Plus") (`:116-127`).
  - Summary SF 17 / 26 secondary (sans, not serif) (`:129-132`).
  - Free badge (only free category `interior-design`): "Бесплатный разбор" ("Free breakdown"), 12/600 ink, padding 7×12, capsule, background accent-soft, 5 px extra top gap (`:134-141`).
- Press: scale .97 + opacity .88 (`StudioPressStyle`, `:64`; `StudioStyle.swift:59-67`).
- Whole card is one link to the article.

#### D. Idea card — `ClarityIdeaCard`
- Container: surface, radius 24 (continuous), stroke line@65 % 0.7, shadow `--ia-shadow-idea-card`, 6 px bottom margin (`ClarityIdeaCard.swift:58-67`).
- Art: aspect **1.5**, radius **20 on all four corners** inside the 24-radius card → the art's bottom corners are visibly rounded against the card surface (`ClarityIdeaCardArt.swift:37,53`; visible in `refresh-ideas-light.png`). Priority `EditorialIdeaCover_<slug>` → `IdeaCover_<slug>` → fallback: soft plate + category object PNG (transparent, 600²) inset 14 % of height (`ClarityIdeaCardArt.swift:40-50`; mapping `Inapp/Resources/studio-art.json`).
- **Unlocked**: text block padding 20, gap 15: title Georgia 22/27 ink; description Georgia 19/26.6 secondary; category line footnote 13 secondary with +7 top (`ClarityIdeaCard.swift:35-56`).
- **Locked** (paid idea, not unlocked): **artwork only** — no title, no description, no category in DOM or a11y tree; bottom-right lock badge = filled lock glyph (17 semibold, accent) centered in a surface-colored circle (14 px padding → ≈ 45 px), inset 16 px from the art corner (`ClarityIdeaCard.swift:3,27-34`). a11y label "Идея в Plus" ("Idea in Plus"), hint "Подробности идеи доступны в Plus." (`:70-71`). Click opens the paywall.
- Press: plain (no scale); web: subtle opacity .85 on `:active`.
- Behaviour note: tapping an unlocked card opens the idea **as a sheet** (large detent, drag indicator, "Готово" leading) rather than pushing (`ClarityIdeaCard.swift:74-90`). Web: modal overlay route on desktop/mobile when navigated from a list; direct URL renders the full page.

#### E. Category picker pill (Идеи)
- Capsule, surface fill, padding 13×17, label SF 15/500 ink ("Все категории" / "All categories" or the chosen category) + filter glyph (three decreasing lines) 12/500, gap 8 (`ClarityCatalogs.swift:206-211`). Large-text variant becomes a 20-radius block with a caption "Выбрать категорию" (`:195-204`).
- Opens a sheet "Категория" ("Category") with a searchable list, rows 17 ink with 7 px extra vertical padding, trailing checkmark for the selected row, "Готово" confirm action, reading tint = ink (`:244-274`).

#### F. Filter chips (Saved) 
- Horizontal scroll row, gap 6, no scrollbar (`ClarityMy.swift:98-111`).
- Chip: capsule, padding-inline 16, min-height 44, label 15/600. Selected: accent label on accent-soft; idle: secondary label on transparent. Items "Всё · Разборы · Идеи · Заметки" ("All · Breakdowns · Ideas · Notes"). Use `aria-pressed` or a radiogroup.

#### G. Badges & lock indicators

| Variant | Visual | Source |
|---|---|---|
| Free badge | accent-soft capsule, ink 12/600, padding 7×12 | `ClarityCatalogs.swift:134-141` |
| Locked research (catalog) | outline lock 15 secondary next to title | `ClarityCatalogs.swift:121-127` |
| Locked idea (catalog) | filled lock in surface circle, accent, over art bottom-right | `ClarityIdeaCard.swift:27-34` |
| "Plus" eyebrow | "inApp PLUS", 12/700, tracking .8, accent; "Активен" with check-circle 12/500 on the right when unlocked | `ClaritySettings.swift:204-211` |
| Locked gate label | lock glyph + "Полный материал в Plus" / "Идея доступна в Plus" 17/600 | `ClarityContentAccess.swift:84-85` |
| Historic "🔒 Plus" chip (accent-soft capsule, accent text) | **not in current code** — seen only in `LibraryRefresh-2026-09-20/Screenshots/paid-idea-card-free-dark.png` | see §7 |

#### H. Buttons

| Variant | Geometry | Label | Source |
|---|---|---|---|
| Primary capsule `ClarityButton` (gate "Открыть все материалы", export "Сохранить в Файлы", retry "Повторить") | full width, capsule, padding 18×20 (→ ~60 px tall), gap 12, optional trailing glyph 16/600 | 17/600 white on action | `ClarityStyle.swift:90-103` |
| Welcome capsule (onboarding "Дальше ›", paywall CTA) | **hugs content** (centered), capsule, padding 17×27, min content height 24 (→ ~58 px), disabled opacity .6, busy spinner white | Onest 17/600 white on action; trailing chevron 13/600 | `ClarityWelcomeComponents.swift:15-42` |
| Rect CTA (Plus card, empty state) | radius 14, min-height 48–50, padding 14×18 / 0×20; Plus: label left + arrow right (space-between); empty: arrow leading | 17/600 white on action | `ClaritySettings.swift:231-240`; `ClarityMy.swift:121-124` |
| Ink capsule (legacy app screen only) | full width, capsule, min-height 54 | 17/600 paper on ink | `ClarityRatings.swift:274-275` |
| Surface pill "Готово" (Settings header) | capsule, padding-inline 16, min-height 44, surface fill | 17/600 accent | `ClaritySettings.swift:187-190` |
| Text button (accent) "Показать всё" / "Сбросить поиск" | min-height 44 | 15/600 accent | `ClarityMy.swift:133-134` |
| Text link rows at end of idea ("Читать разбор категории", "Записать свою мысль", "Скачать документ" + sub-line) | full width, min-height 44, leading SF glyph, gap 12 | 17/600 ink; sub-line 15 secondary | `ClarityReader.swift:543-564` |
| Icon circle – gear | 46×46 circle, surface, 0.5 px line stroke, glyph 20 | ink | `ClarityMy.swift:92-95` |
| Icon circle – welcome back | 44×44 circle, ink@4.5 %, chevron-left 15/500 | ink | `ClarityWelcomeComponents.swift:86-99` |
| Row overflow "⋯" | hit 44×48, glyph 17/500 secondary | | `ClarityMy.swift:159-163` |

Press feedback: `StudioPressStyle` scale .97 / opacity .88, spring 0.22 s (catalog cards, primary buttons) (`StudioStyle.swift:59-67`); welcome buttons scale .98 / opacity .9, ease-out 0.14 s (`ClarityWelcomeComponents.swift:117-125`). Both skip scaling under Reduce Motion.
Minimum hit target everywhere: 44 × 44 (`ClarityBackNavigation.swift:15`, `ClarityMy.swift:103`, `ClaritySettings.swift:189`, etc.).

#### I. Floating tab bar → web navigation — `ClarityFloatingTabBar`

App geometry (`ClarityFloatingTabBar.swift:17-71`, placement `ClarityRoot.swift:73-81`):
- Capsule container: surface fill, 0.5 px stroke line@70 %, shadow `--ia-shadow-tabbar`, padding 6, item gap 4. Outer margins: 16 inline, 10 top, 8 bottom (above safe area). Centered, width = content.
- Items (order fixed): Разборы (`text.book.closed.fill`), Идеи (`lightbulb.fill`), Сохранённое (`bookmark.fill`) — en "Breakdowns / Ideas / Saved", de "Analysen / Ideen / Gespeichert", fr "Décryptages / Idées / Enregistrés", ja "分析 / アイデア / 保存済み".
- Item: min-height 50 (56 at accessibility text sizes), padding-inline 17 selected / 13 idle, glyph 19/500 in a 23-wide box, gap 8.
- Selected: accent glyph + label (SF Rounded 15/600, single line, may shrink to 80 %) on an accent-soft capsule with `--ia-shadow-tab-pill`; the pill slides between items (matched geometry). Idle: **glyph only**, secondary color, label kept as accessible name.
- Visible **only on root screens** (catalogs, Saved); hidden on any pushed detail (article, idea, app, legacy card) (`ClarityRoot.swift:74`, `ClarityReader.swift:194`). Each tab keeps its own history (`ClarityRoot.swift:25`) → on web, remember last URL per section and restore it when switching tabs.
- Content scrolls **under** the capsule (no bar background band) — screenshots show cards passing behind it.

Web mapping:
- `< 1024 px` (touch-first): identical floating capsule, `position: fixed; bottom: calc(8px + env(safe-area-inset-bottom)); left: 50%; translate: -50% 0`. Pages reserve `padding-bottom: calc(50px + 12px + 18px + env(safe-area-inset-bottom))`. Hidden on detail routes. Use `<nav aria-label>` with `<a aria-current="page">`; idle items expose the label via `aria-label`/visually-hidden text.
- `≥ 1024 px`: same capsule component moved to a **sticky top bar** (top 12 px), centered over the content container, **labels shown on all three items** (idle label in secondary), selected pill identical. Left side of the bar: product mark (app icon 28 px, radius 22 %, + "inApp" 17/600); right side: account/settings entry (46 px gear circle style). Bar background transparent; add `backdrop-filter: blur(20px)` + paper @ 80 % only after the page scrolls (`[data-scrolled]`). On detail routes at desktop the capsule may stay visible (desktop users expect persistent nav) — see open questions.
- Keyboard: arrow keys not required (it is navigation, not tabs); focus ring 2 px accent around the item capsule.

#### J. Detail toolbar pills ("Назад" / bookmark / TOC / ⋯)

App: system navigation bar with iOS 26 glass buttons (`ClarityBackNavigation.swift:5-21`, `ClarityReader.swift:195-204,572-580,706-711`).
- Leading: text button **"Назад"** ("Back" / "Zurück" / "Retour" / "戻る"), 17/500, min-height 44, no chevron (intentional: "A labelled back action keeps navigation understandable without arrow icons" `ClarityBackNavigation.swift:4`). Rendered as a glass capsule ≈ 44 × 82 px.
- Center: inline title 17/600 — "Идея" for ideas, "Наблюдение" for problems, **empty** for research articles (`ClarityReader.swift:193,570,704`).
- Trailing: one glass capsule grouping icon buttons, each glyph 17/500 in a 38 × 44 box (`ClarityReader.swift:791-794`):
  - Research: bookmark (outline ↔ filled when saved; a11y "Сохранить"/"Убрать из сохранённого", value "Сохранено"/"Не сохранено"), TOC `list.bullet` (a11y "Содержание разбора"), ⋯ menu → "Заметка к разбору".
  - Idea: bookmark, ⋯ menu → "Записать мысль", "Скачать документ".
  - Problem: bookmark, note (`square.and.pencil`, "Заметка к наблюдению").
- Tint of reader chrome is **ink**, not accent (`ClarityReader.swift:231,583`).

Web mapping: sticky top bar (height 60, padding-top `env(safe-area-inset-top)`), transparent background; pills use `--ia-glass` + `backdrop-filter: blur(20px) saturate(1.6)` + `--ia-shadow-glass`, dark adds 0.5 px `rgb(255 255 255 / .08)` border. At ≥ 1024 align pills to the 640 reading column (bar inner max-width 684). "Назад" = history back when previous entry is in-app, else link to the section root. Menus → popover anchored under ⋯ (surface, radius 14, shadow tabbar, items 44 px with leading glyph). TOC: bottom sheet on mobile; on ≥ 1200 optionally a sticky left rail listing `depth 0` items in 17/600 and `depth 1` items in 17/400 indented 14 (`ClarityReader.swift:211-219`).

#### K. Grouped lists (Saved groups, Settings groups)
- Container: surface, radius 18 (Saved, restore) or 20 (Settings), no stroke, no shadow (`ClarityMy.swift:225`, `ClaritySettings.swift:285`).
- Group heading outside the box: Saved = 17/600 + count 15 tabular secondary, 2 px side inset (`ClarityMy.swift:219-227`); Settings = 15/600 secondary, 4 px side inset (`ClaritySettings.swift:288-291`).
- Dividers: 0.5 px line@65 %, inset-start 58 (Saved) / 56 (Settings) (`ClarityMy.swift:229`, `ClaritySettings.swift:293`).
- Saved row: padding 16, gap 12, leading 88×66 thumbnail radius 12 (idea art or research cover; SF glyph 19 accent in 26×28 if none; hidden at AX sizes), title 17/500, detail 12 secondary, optional note 15 secondary clamped to 2 lines (3 at AX); trailing ⋯ menu ("Добавить заметку"/"Редактировать заметку", "Убрать из сохранённого" destructive) (`ClarityMy.swift:147-171,271-305`). Footer "Сохранено на этом iPhone" 13 secondary centered (web copy must change — e.g. "Сохранено в вашем аккаунте"; content decision for another spec).
- Settings row: min-height 56, padding 17×16, gap 14, leading glyph 19 secondary in 24 box, title 17 ink, trailing chevron 12/600 secondary or `arrow.up.right` for external links (`ClaritySettings.swift:316-328`).

#### L. Settings-specific
- Header pinned: "Настройки" 22/700 + "Готово" surface pill; padding 16 top / 14 bottom / 20 inline, background paper (`ClaritySettings.swift:183-197`).
- Plus card: radius 24, surface, stroke line@55 %; top band accent-soft with eyebrow and illustration `WelcomeLibrary_v7` height 112 (padding 18/20/14); body padding 20: title New York 22/600 "Все разборы и идеи", 15 secondary description (+8), rect CTA (+20) "Открыть Plus" / "О моём Plus", caption 12 secondary centered (+10) (`ClaritySettings.swift:199-251`). Screenshot: `LibraryRefresh-2026-09-20/Screenshots/plus-composition-light.png`.
- Theme picker: three equal tiles inside a 20-radius surface group with 16 padding and 12 gap: preview 74 px tall (radius 10, 4 px padding, ring radius 14 — 2 px accent when selected, 1 px line otherwise), label 15/500, radio glyph 18 (filled check-circle accent / empty circle secondary) (`ClaritySettings.swift:128-181`). The preview **always shows fixed light/dark palettes** regardless of current theme; "Системная" is split half light/half dark (`:331-352`). Labels "Светлая · Тёмная · Системная" ("Light · Dark · System").
- Language list rows: 52 min-height, radio glyph 18 accent/secondary (`:101-126`).
- Version footer: "inApp · x.y" 13/500 + caption, secondary, centered.

#### M. Article components (reader)
- Background `--ia-paper-reading`; column 640; gutters 22; block gap 32 (`ClarityReader.swift:156,190-192`).
- **Hero**: h1 Georgia 30 ink → 18 gap → lead Georgia 20/28.7 secondary, selectable (`:719-743`).
- **Cover artwork** in research article: 3:2, radius 20, **bleeds 22 px into both gutters** (edge-to-edge of the 684 column on phones) (`:159-162`). Inline artworks (audiences, sections, observations): 3:2, radius 20, inside the column; observation art gets 8 px extra vertical space (`:242,256-258,276-277`; `ClarityResearchArtwork.swift:108-122`).
- **Section**: full-width 1 px rule (line) + 4 px, then h2 (SF 22/600), 20 gap, content (`:745-761`).
- **Paragraphs**: Georgia 19/27.6, gap 20; long paragraphs (> 430 chars) are re-flowed at sentence boundaries into ≤ 360-char chunks (`:45-62`) — do the same server-side.
- **Bullets**: 5 px ink dot, 10 px from top, gap 12, items 16 apart (`:777-789`).
- **Observation**: h2-size title (22/600), paragraphs interleaved with quotes, 18 gap, observations separated by a rule with 12 above/below (`:253-288`).
- **Inline quote** (article): 2 px left rule (line color), padding-left 18, padding-block 10 (+8 outer) (`:447-457`); idea-article quote: same with padding-block 8 (`:625-633`).
- **Quote block** internals: opening-quote glyph 13 secondary, 12 gap, text Georgia 20/29.7 ink, selectable (`:858-876`). Translations: `QuoteReading.text(original:translation:)` decides the displayed text.
- **Idea inset block** (idea articles, `kind == .idea`): accent-soft background, radius 12, padding 20, title Georgia 22 + body; a 3 px accent bar (radius 1) along the left edge, inset 20 px top/bottom; 4 px extra vertical margin (`:634-651`).
- **Embedded idea cards** inside research: standard idea card, 18 gap, 12 top padding (`:290-303`).
- **End-of-idea action list**: rule + 8, then link rows (see §3.6 H) (`:543-565`).
- "About" disclosures: `DisclosureGroup` label 15/500 → web `<details>` with 15/500 summary and a chevron (`:375-380,391-398`).

#### N. Sheets & modals
- iOS sheets: note editor, TOC, finding/audience reading sheets, export, category picker, settings, paywall, idea detail. They have their own inline nav bar: leading "Отмена"/"Готово", center 17/600 title, trailing "Сохранить"/"Готово" (confirmation). In iOS 26 these render as glass pills (`refresh-note-editor-dark.png`).
- Web: mobile → full-height bottom sheet (top radius ≈ 38, grab handle 36×5 capsule ink@20 %, scrim `--ia-scrim`, drag-to-dismiss optional); desktop ≥ 760 → centered modal, max-width 640 + 44 (reading sheets) / 660 (settings) / 440 + 48 (paywall), radius 28, max-height `min(90vh, 900px)`, internal scroll. Background = reading paper for reading sheets, paper for settings/paywall.
- Note editor: title Georgia 30; textarea SF 17, 9–24 lines, padding 20, radius 26, surface; hint 13 secondary "Заметка хранится на этом устройстве…" (web copy TBD); unsaved-changes confirm "Не сохранять изменения?" (`ClarityReader.swift:898-948`).
- Export sheet: hero "Весь контекст.\nИ твоя идея."; numbered list with 32 px accent-soft circles (15/700 accent digits); preview text Georgia 19; **sticky bottom action area** with top rule, reading-paper background, padding 14/22/10 (`ClarityReader.swift:976-1054`).

#### O. Empty, loading, error, locked states
- Saved empty: surface card radius 24, padding 24, gap 24: icon tile 64×72 radius 18 accent-soft with bookmark glyph 30/300 accent; title 22/600; body 17/26 secondary; rect CTA "Открыть разборы" (`ClarityMy.swift:112-127`; screenshot `refresh-empty-light.png`).
- Catalog empty: `clarityCard` with "Пока ничего не нашлось" 17/600 + "Попробуй название категории или более короткий запрос." 15 secondary (`ClarityCatalogs.swift:232-242`).
- `clarityCard` = padding 22, surface, radius 20, stroke line@55 % 0.5 (`ClarityStyle.swift:105-112`).
- Loading: `ClarityArt` 170 + spinner "Открываем материалы…"; error: `ClarityArt` 150 + heading "Не удалось открыть материалы" + primary capsule "Повторить" (`ClarityRoot.swift:36-44`). `ClarityArt` = two tilted rounded plates (−15° accent-soft/soft, +12° accent@17 %) behind a white "paper" (radius 9 % of size, line@80 % stroke, shadow) with an accent SF glyph and three capsule "text lines" (`ClarityStyle.swift:28-88`); gently floats (§5).
- Locked gate page: cover art → heading (research only) → `clarityCard` with lock label, 17 secondary body, primary capsule "Открыть все материалы", 15/500 link "Сначала прочитать бесплатный разбор"; below, "Моя заметка к материалу" link (`ClarityContentAccess.swift:68-122`). The full article is **not rendered** when locked (not blurred) — same on web: do not ship locked text in HTML.

#### P. Onboarding / paywall / landing pieces
- Progress dots: 5 capsules, height 5, idle width 5 ink@16 %, active width 18 ink, gap 6 (`ClarityWelcomeComponents.swift:101-115`).
- Chrome row: back circle (hidden on step 0) · centered dots · "Пропустить"/"Закрыть" 15/500 secondary; max-width 600, padding 24, top 4 (`ClarityOnboarding.swift:116-136`).
- Footer: disclosure (price line 15/600 + 12 secondary), welcome capsule button, reserved 44 px secondary row (13/500) even when empty; padding 10 top / 8 bottom / 24 inline; max-width 600 (`ClarityWelcomeComponents.swift:44-84`).
- Paywall plan rows: padding 14, radius 18, radio glyph 21, title/detail left, price right; selected fill ink@5.5 % + 1.5 px ink@65 % border (`ClarityPaywall.swift:107-130`). Plans "На год" / "Навсегда" ("Annual" / "Lifetime").
- Hero illustrations (transparent PNG 1254²): `WelcomeReviews_v7`, `WelcomeLibrary_v7`, `WelcomeResearch_v7`, `WelcomeProduct_v7` (`ClarityWelcomeIllustration.swift:54`, `ClarityPaywall.swift:159-177`); an accent-soft ellipse (66 × 65 % of the box, rotated −24°/+26°) sits behind them (`ClarityWelcomeIllustration.swift:45-52`).
- Preview "papers" (onboarding step 2–3, reusable on landing): article paper radius 6, padding 17, tilted −3°; quote paper accent-soft radius 5, padding 15, tilted +3°, a grey "tape" strip 48×13 rotated −8° on the top edge; idea papers radius 9, two side by side, 25 px vertical offset on the second (`ClarityWelcomeContentPreview.swift:45-147`). Screenshot: `onboarding-legibility-visual-linear-02.png`.
- Floating topic tags "Интерьер / Привычки / Личные финансы": accent-soft, radius 4, padding 10×12, Onest 12/600, white "tape" on the left edge (`ClarityWelcomeIllustration.swift:95-131`).

#### Q. Icons
SF Symbols cannot be used on the web (Apple license limits them to Apple-platform apps). Use one open set with outline + fill weights, e.g. **Phosphor** (MIT) or Lucide (ISC, no fills). Glyphs used by Clarity and a Phosphor mapping:

| SF Symbol | Use | Phosphor |
|---|---|---|
| `text.book.closed(.fill)` | Разборы tab; "Читать разбор категории" | `BookBookmark` / `Book` (fill for tab) |
| `lightbulb(.fill)` | Идеи tab | `Lightbulb` (fill) |
| `bookmark`, `bookmark.fill`, `bookmark.slash` | Сохранённое tab, save toggle, remove | `BookmarkSimple` regular/fill, `BookmarkSimple` + slash variant (`Bookmarks`?) — pick one |
| `magnifyingglass`, `xmark.circle.fill` | search, clear | `MagnifyingGlass`, `XCircle` fill |
| `line.3.horizontal.decrease` | category filter | `FunnelSimple` |
| `list.bullet` | TOC | `ListBullets` |
| `ellipsis` | overflow | `DotsThree` |
| `square.and.pencil` | note | `NotePencil` |
| `doc.text`, `arrow.down.doc`, `doc.on.doc`, `square.and.arrow.up` | export / copy / share | `FileText`, `FileArrowDown`, `Copy`, `Export` |
| `lock`, `lock.fill` | paywall locks | `Lock` regular/fill |
| `gearshape` | settings | `Gear` |
| `chevron.right`, `chevron.left`, `arrow.right`, `arrow.up.right` | rows, back, CTAs, external | `CaretRight`, `CaretLeft`, `ArrowRight`, `ArrowUpRight` |
| `checkmark`, `checkmark.circle.fill`, `circle`, `largecircle.fill.circle` | selection, radios | `Check`, `CheckCircle` fill, `Circle`, `RadioButton` fill |
| `quote.opening` | quote mark | `Quotes` |
| `arrow.clockwise`, `envelope`, `hand.raised`, `play.rectangle`, `creditcard`, `note.text`, `folder`, `app`, `rectangle.on.rectangle`, `rectangle.split.2x1`, `exclamationmark.circle`, `star.fill`, `sparkles`, `square.grid.2x2.fill`, `text.alignleft` | settings rows, legacy saved types, art | `ArrowClockwise`, `Envelope`, `HandPalm`, `PlayCircle`, `CreditCard`, `Note`, `Folder`, `AppWindow`, `Cards`, `Columns`, `WarningCircle`, `Star` fill, `Sparkle`, `SquaresFour` fill, `TextAlignLeft` |

Icon sizes follow the SF point sizes given per component (17–21 typical); stroke weight "regular" for 15–17 px glyphs, "fill" where the app uses `.fill`.

---

## 4. Dark mode specifics

1. **Default is light.** `@AppStorage("studio.appearance") = "light"`; choices light/dark/system; applied immediately and persisted (`ClarityRoot.swift:31,85`; `RootView.swift:6`; `ClaritySettings.swift:16,85`; `LibraryRefresh-2026-09-20/README.md:33`). Web: `<html data-theme="light|dark|system">`, default `light`; persist in a cookie (so SSR renders the right theme with no flash) + localStorage; `system` follows `prefers-color-scheme` live.
2. Put `data-theme` on `<html>` (derived tokens use `color-mix()` of base tokens and must recompute on the same element). Set `color-scheme: light | dark` so scrollbars, form controls and `light-dark()` follow.
3. **Action stays `#3458DB`** in dark (white text, 5.89:1) while accent text/icons become `#94AAFF`. Don't reuse `--ia-accent` as a button fill.
4. Two dark backgrounds: catalogs `#111214`, reading `#17181B` (slightly lighter); cards `#1D1E22`; soft plate `#28292F`; selected tint `#262D45` (navy, not grey).
5. Shadows keep their black alphas (effectively invisible); the 0.5–0.7 px strokes (`#383A42` at 55–70 %) become the main separator — visible on the idea/research cards in `refresh-ideas-dark.png` / `refresh-research-dark.png`. Don't drop strokes in dark.
6. Illustrations and covers are **not** dimmed or re-tinted in dark; bright art on `#1D1E22` cards is the intended look.
7. Glass pills: `#222327`-ish with a faint light hairline (`refresh-reader-dark.png`).
8. Onboarding & paywall follow the chosen theme — the earlier forced-light onboarding/paywall was removed (`LibraryRefresh-2026-09-20/README.md:7`).
9. Theme preview tiles in Settings are hard-coded to the two palettes and never follow the current theme (`ClaritySettings.swift:330-352`).
10. Paywall error red is the system red (`#FF3B30` / `#FF453A`), Saved storage errors use coral (`#C0443F` / `#F4928C`).
11. Legacy `AccentColor.colorset` (`#FF7A1A`, `Inapp/Resources/Assets.xcassets/AccentColor.colorset/Contents.json`) has no dark variant and is fully overridden by `.tint(ClarityStyle.accent)` (`ClarityRoot.swift:84`) — orange must not appear on the new site.

---

## 5. Motion

### 5.1 Gating (port 1:1)

| Gate | App | Web |
|---|---|---|
| Reduce Motion | every animation checks `accessibilityReduceMotion` (`ClarityFloatingTabBar.swift:31`, `StudioStyle.swift:65`, `ClarityStyle.swift:51`, `ClarityReader.swift:207`, `ClarityOnboarding.swift:17`, `ClarityPaywall.swift:22`, `ClarityWelcomeIllustration.swift:18-20`) | `@media (prefers-reduced-motion: reduce)` → no transforms/transitions except opacity ≤ 150 ms; ambient loops and autoplay off; content shown in final state |
| App motion flag | `@AppStorage("studio.motion") = true` (toggle removed from Settings UI, `LibraryRefresh-2026-09-20/README.md:54`) | not needed; optionally honour `?motion=0` for QA/screenshots |
| Foreground only | `scenePhase == .active` for ambient art/paywall (`ClarityStyle.swift:51`, `ClarityPaywall.swift:22`) | pause loops on `document.visibilityState === "hidden"` and when off-screen (IntersectionObserver) |
| VoiceOver / accessibility text sizes | rich onboarding/paywall motion disabled (`ClarityPaywall.swift:22`, `ClarityWelcomeIllustration.swift:18-20`, `ClarityWelcomeContentPreview.swift:22`) | disable rich motion when `prefers-reduced-motion` or root font-size ≥ 24 px; screen readers get static content |
| Carousel autoplay | pauses while the user scrolls/touches (`ClarityWelcomeCarousel.swift:17,59-66`) | pause on hover/focus/touch; provide prev/next and pause controls (WCAG 2.2.2) |

### 5.2 Motion tokens

SwiftUI springs converted to CSS `linear()` (damped-oscillator samples, settle to 0.2 %). Use with `transition-timing-function`.

| Token | Swift | Duration (web) | Easing | Used for |
|---|---|---|---|---|
| `--ia-motion-press` | `.spring(duration: 0.22)` | 220 ms | `cubic-bezier(.2,.8,.2,1)` | card/button press scale .97 + opacity .88 (`StudioStyle.swift:59-67`) |
| `--ia-motion-press-welcome` | `.easeOut(duration: 0.14)` | 140 ms | `ease-out` | welcome button scale .98, opacity .9 (`ClarityWelcomeComponents.swift:117-125`) |
| `--ia-motion-tab` | `.spring(response: 0.38, dampingFraction: 0.84)` | 490 ms | `linear(0, .055, .179, .328, .476, .608, .718, .805, .872, .921, .955, .978, .992, 1.001, 1.006, 1.007, 1.008, 1.007, 1.006, 1.005, 1.004, 1.003, 1)` | selected tab pill slide + label reveal (`ClarityFloatingTabBar.swift:31,61`) — animate pill via FLIP/View Transitions |
| `--ia-motion-scroll` | `.easeInOut(duration: 0.25)` | 250 ms | `ease-in-out` | TOC jump (`ClarityReader.swift:207`) → `scrollIntoView({behavior: reduce ? "auto" : "smooth"})` |
| `--ia-motion-step` | `.spring(response: 0.55, dampingFraction: 0.9)` | 510 ms | `linear(0, .03, .102, .197, .3, .403, .5, .588, .666, .732, .789, .835, .873, .904, .928, .947, .962, .973, .982, .988, .993, .996, 1)` | onboarding step change: enter x ±50 px + fade, exit x ∓35 px + fade (`ClarityOnboarding.swift:96-99,141`) |
| `--ia-motion-reveal` | `.spring(response: 0.72, dampingFraction: 0.58)` | 1130 ms | `linear(0, .084, .275, .5, .711, .881, 1, 1.071, 1.102, 1.105, 1.091, 1.068, 1.044, 1.023, 1.007, .996, .991, .989, .989, .991, .994, .996, 1)` | onboarding art reveal: from y +16, rotate −2°, opacity 0; headline from scale .72 (step 0) / .90 (`ClarityOnboarding.swift:65-67,75,112`) |
| `--ia-motion-text-reveal` | `.easeOut(duration: 0.45).delay(0.14)` | 450 ms + 140 ms delay | `ease-out` | copy block from y +12 (`ClarityOnboarding.swift:85-87`) |
| `--ia-motion-paper` | `.spring(response: 0.88, dampingFraction: 0.59, blendDuration: 0.12)` | 1380 ms | `linear(0, .083, .273, .496, .705, .873, .992, 1.063, 1.095, 1.1, 1.087, 1.066, 1.044, 1.024, 1.008, .998, .992, .99, .99, .992, .994, .996, 1)` | preview papers land: from scale .84, rotate ±14–18°, offset (±24–28, −48…+94), 3D tilt 24°; delays 120 / 290 ms; exit `ease-in` 340 ms (`ClarityWelcomeContentPreview.swift:154-229`) |
| `--ia-motion-illustration` | `.spring(response: 0.78, dampingFraction: 0.6)` | 1230 ms | `linear(0, .084, .274, .497, .704, .87, .987, 1.057, 1.089, 1.094, 1.082, 1.063, 1.042, 1.023, 1.009, .999, .993, .991, .991, .993, .995, .997, 1)` | hero illustration entrance from scale .72, y +52, rotate ∓10°; stages at 80 ms / +210 ms / +950 ms (`ClarityWelcomeIllustration.swift:21-23,133-155`) |
| `--ia-motion-carousel` | `.spring(response: 1.02, dampingFraction: 0.86)` | 1300 ms | `linear(0, .054, .175, .32, .464, .593, .701, .789, .856, .906, .942, .967, .983, .994, 1, 1.003, 1.005, 1.005, 1.005, 1.004, 1.003, 1.003, 1)` | auto-advance; interval 7 s (articles) / 6 s (ideas) (`ClarityWelcomeContentPreview.swift:27-35`, `ClarityWelcomeCarousel.swift:64`) |
| `--ia-motion-paywall-art` | springs (0.9, .55) → (1.05, .56) → (1.0, .57) at 80 / +190 / +140 ms | ≈ 1.2–1.4 s each | use `--ia-motion-illustration` | three library objects pop in from scale .60–.62 (`ClarityPaywall.swift:80-94,151-189`) |
| `--ia-motion-float` | `.easeInOut(duration: 3.4).repeatForever(autoreverses: true)` | 3.4 s alternate infinite | `ease-in-out` | `ClarityArt` bob: y −3 px, rotate 1.2° (`ClarityStyle.swift:81-85`) |
| `--ia-motion-ambient` | sine, period 12 s | 12 s infinite | sine (`@keyframes` with ease-in-out, alternate) | illustration drift: ±6 px y, ±2–3° rotation, scale ±1.2–2.2 %; artwork "breathing" scale 1.025→1.075, ±2 px (`ClarityWelcomeIllustration.swift:23,41-43`, `ClarityWelcomeContentPreview.swift:232-246`) |

No motion on: catalog appearance, sheet content, reader scroll (only the TOC jump), theme switch (instant). Haptics (`.sensoryFeedback(.selection)` on save `ClarityReader.swift:810`, `.success` on copy `:1042`) have no web equivalent — show a 1.5 s inline confirmation instead ("Скопировано" state already exists).

---

## 6. Ready-to-paste CSS

Namespaced with `--ia-` so it cannot collide with the old site's `@theme` tokens (`src/app/globals.css` defines `--text-*` etc.). Load this file only from the new route group's root layout; `/old` keeps `globals.css`.

```css
/* ==========================================================================
   inApp v2 — design tokens (source: Inapp/Studio/StudioStyle.swift,
   Inapp/Clarity/ClarityStyle.swift, ClarityReadingStyle.swift, …)
   Put data-theme on <html>: "light" (default) | "dark" | "system".
   ========================================================================== */

@font-face {
  font-family: "Onest";
  src: url("/fonts/onest-variable.woff2") format("woff2-variations"),
       url("/fonts/onest-variable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-024F, U+0400-04FF, U+2000-206F, U+20AC, U+2116, U+2212;
}

:root,
[data-theme="light"] {
  color-scheme: light;

  /* ---- Color: surfaces ---- */
  --ia-paper: #F5F5F7;
  --ia-paper-reading: #FCFCFD;
  --ia-surface: #FFFFFF;
  --ia-soft: #EBECF0;
  --ia-accent-soft: #EDF1FF;
  --ia-glass: rgb(254 254 255 / 0.86);
  --ia-glass-border: rgb(0 0 0 / 0.04);
  --ia-scrim: rgb(0 0 0 / 0.20);

  /* ---- Color: content ---- */
  --ia-ink: #191A20;
  --ia-secondary: #666872;
  --ia-accent: #3458DB;
  --ia-action: #3458DB;
  --ia-on-action: #FFFFFF;
  --ia-line: #DEDFE5;
  --ia-danger: #C0443F;
  --ia-error-system: #FF3B30;
  --ia-success: #26714E;
}

[data-theme="dark"] {
  color-scheme: dark;

  --ia-paper: #111214;
  --ia-paper-reading: #17181B;
  --ia-surface: #1D1E22;
  --ia-soft: #28292F;
  --ia-accent-soft: #262D45;
  --ia-glass: rgb(34 35 39 / 0.86);
  --ia-glass-border: rgb(255 255 255 / 0.08);
  --ia-scrim: rgb(0 0 0 / 0.48);

  --ia-ink: #F2F2F5;
  --ia-secondary: #AAADB8;
  --ia-accent: #94AAFF;
  --ia-action: #3458DB;          /* unchanged on purpose */
  --ia-on-action: #FFFFFF;
  --ia-line: #383A42;
  --ia-danger: #F4928C;
  --ia-error-system: #FF453A;
  --ia-success: #80C9A3;
}

@media (prefers-color-scheme: dark) {
  [data-theme="system"] {
    color-scheme: dark;
    --ia-paper: #111214;
    --ia-paper-reading: #17181B;
    --ia-surface: #1D1E22;
    --ia-soft: #28292F;
    --ia-accent-soft: #262D45;
    --ia-glass: rgb(34 35 39 / 0.86);
    --ia-glass-border: rgb(255 255 255 / 0.08);
    --ia-scrim: rgb(0 0 0 / 0.48);
    --ia-ink: #F2F2F5;
    --ia-secondary: #AAADB8;
    --ia-accent: #94AAFF;
    --ia-action: #3458DB;
    --ia-on-action: #FFFFFF;
    --ia-line: #383A42;
    --ia-danger: #F4928C;
    --ia-error-system: #FF453A;
    --ia-success: #80C9A3;
  }
}

/* Theme-independent + derived tokens (recomputed wherever data-theme is set) */
:root,
[data-theme] {
  /* derived colors */
  --ia-line-card: color-mix(in srgb, var(--ia-line) 55%, transparent);
  --ia-line-65:   color-mix(in srgb, var(--ia-line) 65%, transparent);
  --ia-line-70:   color-mix(in srgb, var(--ia-line) 70%, transparent);
  --ia-line-80:   color-mix(in srgb, var(--ia-line) 80%, transparent);
  --ia-ink-045:   color-mix(in srgb, var(--ia-ink) 4.5%, transparent);
  --ia-ink-055:   color-mix(in srgb, var(--ia-ink) 5.5%, transparent);
  --ia-ink-15:    color-mix(in srgb, var(--ia-ink) 15%, transparent);
  --ia-ink-16:    color-mix(in srgb, var(--ia-ink) 16%, transparent);
  --ia-ink-65:    color-mix(in srgb, var(--ia-ink) 65%, transparent);
  --ia-accent-17: color-mix(in srgb, var(--ia-accent) 17%, transparent);
  --ia-selection: color-mix(in srgb, var(--ia-accent) 24%, transparent);

  /* ---- Fonts ---- */
  --ia-font-serif: Georgia, "Gelasio", "PT Serif", "Noto Serif",
                   "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;
  --ia-font-serif-ui: ui-serif, "New York", var(--ia-font-serif);
  --ia-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
                  Roboto, "Helvetica Neue", Arial, "Hiragino Sans",
                  "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif;
  --ia-font-rounded: ui-rounded, "SF Pro Rounded", var(--ia-font-sans);
  --ia-font-display: "Onest", var(--ia-font-sans);

  /* ---- Type scale (size / line-height) ---- */
  /* Georgia 400 */
  --ia-fs-title: 1.875rem;        --ia-lh-title: 1.136;       /* 30/34 */
  --ia-fs-card-title: 1.375rem;   --ia-lh-card-title: 1.227;  /* 22/27 */
  --ia-fs-lead: 1.25rem;          --ia-lh-lead: 1.436;        /* 20/28.7 */
  --ia-fs-quote: 1.25rem;         --ia-lh-quote: 1.486;       /* 20/29.7 */
  --ia-fs-body-serif: 1.1875rem;  --ia-lh-body-serif: 1.452;  /* 19/27.6 */
  --ia-fs-subtitle: 1.1875rem;    --ia-lh-subtitle: 1.40;     /* 19/26.6 */
  /* System sans (iOS text styles) */
  --ia-fs-large-title: 2.125rem;  --ia-lh-large-title: 1.206; /* 34/41 */
  --ia-fs-title2: 1.375rem;       --ia-lh-title2: 1.273;      /* 22/28 */
  --ia-fs-headline: 1.0625rem;    --ia-lh-headline: 1.294;    /* 17/22 w600 */
  --ia-fs-body: 1.0625rem;        --ia-lh-body: 1.294;        /* 17/22 */
  --ia-lh-body-relaxed: 1.53;                                 /* 17/26 summaries */
  --ia-fs-subheadline: 0.9375rem; --ia-lh-subheadline: 1.333; /* 15/20 */
  --ia-fs-footnote: 0.8125rem;    --ia-lh-footnote: 1.385;    /* 13/18 */
  --ia-fs-caption: 0.75rem;       --ia-lh-caption: 1.333;     /* 12/16 */
  /* Onest display */
  --ia-fs-display: clamp(2.375rem, 1.9rem + 2vw, 3rem);       /* 38 → cap 48 */
  --ia-lh-display: 1.17;
  --ia-ls-display: -0.02em;                                   /* -0.75pt @38 */
  --ia-fs-display-copy: clamp(1.125rem, 1rem + 0.4vw, 1.625rem); /* 18 → cap 26 */
  --ia-lh-display-copy: 1.44;

  /* ---- Spacing ---- */
  --ia-space-1: 4px;  --ia-space-2: 6px;  --ia-space-3: 8px;  --ia-space-4: 10px;
  --ia-space-5: 12px; --ia-space-6: 14px; --ia-space-7: 16px; --ia-space-8: 18px;
  --ia-space-9: 20px; --ia-space-10: 22px; --ia-space-11: 24px; --ia-space-12: 28px;
  --ia-space-13: 32px;
  --ia-gutter-catalog: 20px;
  --ia-gutter-reader: 22px;
  --ia-gutter-welcome: 24px;
  --ia-gap-article: 32px;
  --ia-gap-section: 20px;
  --ia-gap-paragraph: 20px;

  /* ---- Widths ---- */
  --ia-w-catalog: 680px;
  --ia-w-library: 660px;
  --ia-w-reading: 640px;
  --ia-w-welcome-chrome: 600px;
  --ia-w-welcome: 440px;
  --ia-w-welcome-copy: 360px;
  --ia-w-grid-md: 1040px;
  --ia-w-grid-xl: 1200px;

  /* ---- Radii ---- */
  --ia-radius-tag: 4px;
  --ia-radius-paper-sm: 6px;
  --ia-radius-paper: 9px;
  --ia-radius-thumb: 12px;
  --ia-radius-button: 14px;
  --ia-radius-field: 16px;
  --ia-radius-group-sm: 18px;
  --ia-radius-card: 20px;
  --ia-radius-art: 20px;
  --ia-radius-idea-card: 24px;
  --ia-radius-note: 26px;
  --ia-radius-research-card: 28px;
  --ia-radius-modal: 28px;
  --ia-radius-sheet: 38px;
  --ia-radius-pill: 999px;

  /* ---- Shadows ---- */
  --ia-shadow-research-card: 0 6px 32px rgb(0 0 0 / 0.055);
  --ia-shadow-idea-card: 0 6px 28px rgb(0 0 0 / 0.05);
  --ia-shadow-tabbar: 0 8px 36px rgb(0 0 0 / 0.12);
  --ia-shadow-tab-pill: 0 1px 6px rgb(0 0 0 / 0.04);
  --ia-shadow-glass: 0 4px 24px rgb(0 0 0 / 0.08);
  --ia-shadow-paper: 0 7px 20px rgb(0 0 0 / 0.085);
  --ia-shadow-illustration: 0 9px 24px rgb(0 0 0 / 0.045);
  --ia-shadow-device: 0 24px 48px rgb(0 0 0 / 0.20);

  /* ---- Sizes ---- */
  --ia-hit: 44px;
  --ia-search-h: 56px;
  --ia-tab-item-h: 50px;
  --ia-toolbar-h: 60px;

  /* ---- Motion ---- */
  --ia-dur-press: 220ms;
  --ia-dur-press-welcome: 140ms;
  --ia-dur-tab: 490ms;
  --ia-dur-scroll: 250ms;
  --ia-dur-step: 510ms;
  --ia-dur-reveal: 1130ms;
  --ia-dur-text-reveal: 450ms;
  --ia-dur-paper: 1380ms;
  --ia-dur-float: 3.4s;
  --ia-dur-ambient: 12s;
  --ia-ease-press: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ia-ease-tab: linear(0, .055, .179, .328, .476, .608, .718, .805, .872, .921, .955,
                        .978, .992, 1.001, 1.006, 1.007, 1.008, 1.007, 1.006, 1.005,
                        1.004, 1.003, 1);
  --ia-ease-step: linear(0, .03, .102, .197, .3, .403, .5, .588, .666, .732, .789, .835,
                         .873, .904, .928, .947, .962, .973, .982, .988, .993, .996, 1);
  --ia-ease-reveal: linear(0, .084, .275, .5, .711, .881, 1, 1.071, 1.102, 1.105, 1.091,
                           1.068, 1.044, 1.023, 1.007, .996, .991, .989, .989, .991,
                           .994, .996, 1);

  /* ---- Z ---- */
  --ia-z-toolbar: 40;
  --ia-z-tabbar: 50;
  --ia-z-scrim: 90;
  --ia-z-sheet: 100;
}

@media (prefers-reduced-motion: reduce) {
  :root, [data-theme] {
    --ia-dur-press: 0ms; --ia-dur-tab: 0ms; --ia-dur-step: 0ms;
    --ia-dur-reveal: 0ms; --ia-dur-text-reveal: 0ms; --ia-dur-paper: 0ms;
    --ia-dur-scroll: 0ms;
  }
}

/* ---- Base ---- */
html { background: var(--ia-paper); }
body {
  margin: 0;
  background: var(--ia-paper);
  color: var(--ia-ink);
  font: 400 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: var(--ia-selection); }
:focus-visible { outline: 2px solid var(--ia-accent); outline-offset: 2px; }
.ia-reading-page { background: var(--ia-paper-reading); }
.ia-serif { font-family: var(--ia-font-serif); font-weight: 400; font-synthesis: none; }
```

`light-dark()` alternative (Chrome 123+, Safari 17.5+, Firefox 120+): declare each color once as `--ia-paper: light-dark(#F5F5F7, #111214)` and switch only `color-scheme` (`light` / `dark` / `light dark` for system). Equivalent; pick one approach, not both.

Tailwind v4 bridge (this repo uses `@tailwindcss/postcss` v4): in the new entry CSS

```css
@import "tailwindcss";
@import "./ia-tokens.css";
@theme inline {
  --color-ia-paper: var(--ia-paper);
  --color-ia-paper-reading: var(--ia-paper-reading);
  --color-ia-surface: var(--ia-surface);
  --color-ia-soft: var(--ia-soft);
  --color-ia-accent-soft: var(--ia-accent-soft);
  --color-ia-ink: var(--ia-ink);
  --color-ia-secondary: var(--ia-secondary);
  --color-ia-accent: var(--ia-accent);
  --color-ia-action: var(--ia-action);
  --color-ia-line: var(--ia-line);
  --color-ia-danger: var(--ia-danger);
  --font-ia-serif: var(--ia-font-serif);
  --font-ia-sans: var(--ia-font-sans);
  --font-ia-display: var(--ia-font-display);
  --radius-ia-card: var(--ia-radius-card);
  --radius-ia-idea: var(--ia-radius-idea-card);
  --radius-ia-research: var(--ia-radius-research-card);
  --shadow-ia-research: var(--ia-shadow-research-card);
  --shadow-ia-idea: var(--ia-shadow-idea-card);
  --shadow-ia-tabbar: var(--ia-shadow-tabbar);
}
```

### 6.1 Component CSS sketches

```css
/* Research card */
.ia-research-card { background: var(--ia-surface); border-radius: var(--ia-radius-research-card);
  box-shadow: var(--ia-shadow-research-card), inset 0 0 0 1px var(--ia-line-65); overflow: hidden;
  transition: transform var(--ia-dur-press) var(--ia-ease-press), opacity var(--ia-dur-press); }
.ia-research-card:active { transform: scale(.97); opacity: .88; }
.ia-research-card__art { aspect-ratio: 3 / 2; width: 100%; object-fit: cover; display: block; }
.ia-research-card__body { padding: 22px; display: flex; flex-direction: column; gap: 10px; }
.ia-research-card__title { font: 400 var(--ia-fs-card-title)/var(--ia-lh-card-title) var(--ia-font-serif); }
.ia-research-card__summary { font: 400 var(--ia-fs-body)/var(--ia-lh-body-relaxed) var(--ia-font-sans); color: var(--ia-secondary); }
.ia-badge-free { align-self: flex-start; margin-top: 5px; padding: 7px 12px; border-radius: var(--ia-radius-pill);
  background: var(--ia-accent-soft); color: var(--ia-ink); font: 600 var(--ia-fs-caption)/var(--ia-lh-caption) var(--ia-font-sans); }

/* Idea card */
.ia-idea-card { background: var(--ia-surface); border-radius: var(--ia-radius-idea-card); margin-bottom: 6px;
  box-shadow: var(--ia-shadow-idea-card), inset 0 0 0 1px var(--ia-line-65); overflow: hidden; }
.ia-idea-card__art { aspect-ratio: 3 / 2; border-radius: var(--ia-radius-art); overflow: hidden; background: var(--ia-soft); position: relative; }
.ia-idea-card__lock { position: absolute; right: 16px; bottom: 16px; width: 45px; height: 45px; border-radius: 50%;
  display: grid; place-items: center; background: var(--ia-surface); color: var(--ia-accent); }
.ia-idea-card__body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.ia-idea-card__desc { font: 400 var(--ia-fs-subtitle)/var(--ia-lh-subtitle) var(--ia-font-serif); color: var(--ia-secondary); }
.ia-idea-card__meta { padding-top: 7px; font: 400 var(--ia-fs-footnote)/var(--ia-lh-footnote) var(--ia-font-sans); color: var(--ia-secondary); }

/* Search */
.ia-search { display: flex; align-items: center; gap: 12px; min-height: var(--ia-search-h); padding: 0 18px;
  background: var(--ia-surface); border-radius: var(--ia-radius-field); color: var(--ia-ink); }
.ia-search input { all: unset; flex: 1; font: 400 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans); }
.ia-search input::placeholder { color: var(--ia-secondary); }
.ia-search:focus-within { outline: 2px solid var(--ia-accent); outline-offset: 2px; }

/* Floating tab bar */
.ia-tabbar { display: inline-flex; gap: 4px; padding: 6px; border-radius: var(--ia-radius-pill);
  background: var(--ia-surface); box-shadow: var(--ia-shadow-tabbar), inset 0 0 0 .5px var(--ia-line-70); }
.ia-tab { display: inline-flex; align-items: center; gap: 8px; min-height: var(--ia-tab-item-h); padding: 0 13px;
  border-radius: var(--ia-radius-pill); color: var(--ia-secondary);
  font: 600 var(--ia-fs-subheadline)/1 var(--ia-font-rounded); white-space: nowrap; }
.ia-tab[aria-current="page"] { padding: 0 17px; color: var(--ia-accent); background: var(--ia-accent-soft);
  box-shadow: var(--ia-shadow-tab-pill); }
@media (max-width: 1023px) {
  .ia-tabbar-dock { position: fixed; z-index: var(--ia-z-tabbar); left: 50%; translate: -50% 0;
    bottom: calc(8px + env(safe-area-inset-bottom)); }
  .ia-tab:not([aria-current="page"]) .ia-tab__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
}
@media (min-width: 1024px) {
  .ia-tabbar-dock { position: sticky; top: 12px; z-index: var(--ia-z-tabbar); }
}

/* Glass toolbar pill */
.ia-glass-pill { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; gap: 4px;
  border-radius: var(--ia-radius-pill); background: var(--ia-glass); color: var(--ia-ink);
  -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6);
  box-shadow: var(--ia-shadow-glass), inset 0 0 0 .5px var(--ia-glass-border);
  font: 500 var(--ia-fs-body)/1 var(--ia-font-sans); }
.ia-glass-pill--icons { padding: 0 6px; }
.ia-glass-pill--icons > button { width: 38px; height: 44px; }

/* Buttons */
.ia-btn-primary { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%;
  padding: 18px 20px; border-radius: var(--ia-radius-pill); background: var(--ia-action); color: var(--ia-on-action);
  font: 600 var(--ia-fs-headline)/var(--ia-lh-headline) var(--ia-font-sans); }
.ia-btn-welcome { display: inline-flex; gap: 10px; padding: 17px 27px; border-radius: var(--ia-radius-pill);
  background: var(--ia-action); color: var(--ia-on-action); font: 600 1.0625rem/1.4 var(--ia-font-display);
  transition: transform var(--ia-dur-press-welcome) ease-out, opacity var(--ia-dur-press-welcome) ease-out; }
.ia-btn-welcome:active { transform: scale(.98); opacity: .9; }
.ia-btn-welcome:disabled { opacity: .6; }

/* Reader */
.ia-article { max-width: calc(var(--ia-w-reading) + 2 * var(--ia-gutter-reader)); margin-inline: auto;
  padding: 24px var(--ia-gutter-reader) 56px; display: flex; flex-direction: column; gap: var(--ia-gap-article); }
.ia-article p { margin: 0; font: 400 var(--ia-fs-body-serif)/var(--ia-lh-body-serif) var(--ia-font-serif); }
.ia-article p + p { margin-top: var(--ia-gap-paragraph); }
.ia-article h2 { margin: 0; font: 600 var(--ia-fs-title2)/var(--ia-lh-title2) var(--ia-font-sans); letter-spacing: -0.012em; }
.ia-article h3 { margin: 0; font: 600 var(--ia-fs-headline)/var(--ia-lh-headline) var(--ia-font-sans); }
.ia-section { display: flex; flex-direction: column; gap: var(--ia-gap-section); border-top: 1px solid var(--ia-line); padding-top: 4px; }
.ia-cover-bleed { margin-inline: calc(-1 * var(--ia-gutter-reader)); border-radius: var(--ia-radius-art); aspect-ratio: 3/2; }
.ia-quote { padding: 10px 0 10px 18px; border-left: 2px solid var(--ia-line); margin: 8px 0; }
.ia-quote__text { font: 400 var(--ia-fs-quote)/var(--ia-lh-quote) var(--ia-font-serif); }
.ia-idea-inset { position: relative; padding: 20px; border-radius: var(--ia-radius-thumb); background: var(--ia-accent-soft); margin: 4px 0; }
.ia-idea-inset::before { content: ""; position: absolute; left: 0; top: 20px; bottom: 20px; width: 3px; border-radius: 1px; background: var(--ia-accent); }
```

### 6.2 Short component style guide (web)

| Rule | Detail |
|---|---|
| One accent | Cobalt is the only brand color in the product UI. Illustrations supply all other color. No orange, no gradients (except landing posters). |
| Two voices | Serif (Georgia) = content: titles, card titles, reading text, quotes, catalog subtitles. Sans = interface: section headings (h2/h3 inside articles are **sans**), buttons, meta, navigation, Saved/Settings titles. Display (Onest 900) = onboarding/paywall/landing only. |
| Paper vs surface | Page background is paper; interactive/grouped things sit on white surface cards. Reading pages switch to the brighter reading paper and lose cards: text runs on the page, separated by 1 px rules. |
| Cards | Research card r28 + shadow; idea card r24 + shadow + r20 art; utility cards r20 flat with stroke; grouped lists r18/r20 flat without stroke. |
| Density | Generous: 20–22 px gutters on mobile, 24–32 px between blocks, 44 px minimum targets. Don't tighten on desktop — widen the grid instead. |
| Reading column | 640 px max text measure at every breakpoint; cover art bleeds 22 px outside it. |
| Catalog grid | 1 col < 760, 2 cols 760–1279, 3 cols ≥ 1280; containers 680 → 1040/1080 → 1200. |
| Navigation | Mobile/tablet: floating bottom capsule on root pages only; detail pages get glass "Назад" + action pills at the top. Desktop: the same capsule sticky at the top. |
| States | Selected = accent text on accent-soft capsule. Pressed = scale .97/opacity .88. Focus (web-only) = 2 px accent outline, 2 px offset. Hover (web-only, `@media (hover: hover)`): cards raise shadow alpha by ~+0.03 and translate −1 px; pills/rows get `--ia-ink-045` fill. Disabled = opacity .6. |
| Locks | Never render paid text. Research: outline lock beside the title. Idea: artwork only + lock disc. |
| Copy | Keep Russian strings verbatim from Swift `L("…")` keys and pull other locales from `Inapp/Resources/ui.{en,de,fr,ja}.json` (`strings` map keyed by the Russian source). Device-specific phrases ("на этом iPhone") need web rewrites. |
| Images | Covers 3:2 JPG 1200×800 → AVIF/WebP 680/1360 w; idea covers 900×600 or 1200×800; objects & welcome art are transparent PNG (600² / 1254²) → WebP with alpha. Always `object-fit: cover`, alt text from `accessibilityLabel` strings (`ClarityResearchArtwork.swift:47-86`, `Inapp/Resources/launch-research-artwork.json`). |

---

## 7. Discrepancies & legacy to ignore (code wins)

| Topic | Docs / screenshots say | Code says (use this) |
|---|---|---|
| Overall look | `Documentation/Clarity/README.md:23`: "мятно-голубой фон с персиковым оттенком… чёрные кнопки" | Neutral palette since 2026-09-20: grey paper, white cards, cobalt buttons (`StudioStyle.swift:3-21`; confirmed by `Documentation/LibraryRefresh-2026-09-20/README.md:5-19`). Old mint gradient still visible in `Documentation/Clarity/Screenshots/*` (e.g. `clarity-research-contents.png`) — **outdated, do not copy**. |
| Locked idea card | `LibraryRefresh-2026-09-20/README.md:80` + `paid-idea-card-free-dark.png`: cover, title, category and a "🔒 Plus" chip visible | `ClarityIdeaCard.swift:3,27-35` (modified 2026-09-21): artwork only + lock disc; title/description/category not rendered. |
| Toolbar TOC sheet | old screenshot shows rows with ↓ arrows inside a card | `ClarityReader.swift:210-226`: plain list on reading paper, headline for top-level, body indented 14 for observations, no arrows. |
| Legacy dark theme | `Inapp/DesignSystem/Theme.swift:1-44` (bg `#0B0B0F`, orange `#FF7A1A`, SF Rounded, "Тема одна — тёмная"), `EditorialTheme.swift`, `ResearchTheme.swift`, `DesignSystem/FloatingTabBar.swift`, `Components.swift` | Not referenced by any `Inapp/Clarity/*` file (grep verified); only reachable from the DEBUG-only `LegacyRootView` (`Inapp/App/RootView.swift:77-95`) and old `Views/*`. Ignore entirely. |
| AccentColor asset | `AccentColor.colorset` = `#FF7A1A` | Overridden by `.tint(ClarityStyle.accent)` (`ClarityRoot.swift:84`). Ignore. |
| Store screenshot headline font | Posters look like Onest | They are **SF Pro Bold**, kern −3.5 % (`Tools/render_storefront.swift:34`). Onest 900 is the in-app onboarding/paywall face. |
| Onboarding sizes | `LibraryRefresh-2026-09-20/README.md:96`: 38 / 18, caps 48 / 26, Onest 450 | Matches code (`ClarityWelcomeTypography.swift:8-11,54`). |
| Dynamic Type | App scales all Georgia/SF roles with Dynamic Type | Web: rem units + browser zoom; no separate "AX" layouts required, but keep the stacked fallbacks (category pill → block, theme tiles → rows) at root font-size ≥ 24 px or width < 360 px. |

---

## 8. File index (what was read)

- Palette & primitives: `Inapp/Studio/StudioStyle.swift`, `Inapp/Clarity/ClarityStyle.swift`, `Inapp/Clarity/ClarityReadingStyle.swift`
- Navigation: `Inapp/Clarity/ClarityFloatingTabBar.swift`, `ClarityRoot.swift`, `ClarityBackNavigation.swift`
- Cards & catalogs: `ClarityIdeaCard.swift`, `ClarityIdeaCardArt.swift`, `ClarityCatalogs.swift`, `ClarityResearchArtwork.swift`
- Reader: `ClarityReader.swift`; gate: `ClarityContentAccess.swift`
- Saved & settings: `ClarityMy.swift`, `ClaritySettings.swift`
- Onboarding & paywall: `ClarityOnboarding.swift`, `ClarityWelcomeTypography.swift`, `ClarityWelcomeComponents.swift`, `ClarityWelcomeIllustration.swift`, `ClarityWelcomeContentPreview.swift`, `ClarityWelcomeCarousel.swift`, `ClarityWelcomeExamples.swift`, `ClarityPaywall.swift`
- Legacy (ignored): `Inapp/DesignSystem/{Theme,EditorialTheme,ResearchTheme,Components,FloatingTabBar}.swift`, `Inapp/App/RootView.swift`
- Assets: `Inapp/Resources/Fonts/Onest.ttf` + `Onest-LICENSE.txt`, `Inapp/Resources/Assets.xcassets` (only color set: `AccentColor`; 1021 image sets: 464 `IdeaCover_*`, 285 `EditorialIdeaCover_*`, 192 `ResearchLaunch_*`, 21 `Research{Interior,Habits,Finance}_*`, 39 `StudioObject_*`, `Welcome*_v7`), `Inapp/Resources/ui.{en,de,fr,ja}.json`
- Marketing: `Tools/render_storefront.swift`, `AppStore/Release-2026-09-21/screenshots/{ru,en,ja}/*.png`
- Screenshots viewed: `AppStore/Release-2026-09-21/screenshots/ru/01-05.png`, `en/01.png`, `ja/03.png`; `Documentation/LibraryRefresh-2026-09-20/Screenshots/refresh-{ideas-light,ideas-dark,reader-light,reader-dark,research-dark,paywall-light,empty-light,note-editor-dark}.png`, `plus-composition-light.png`, `paid-idea-card-free-dark.png`, `onboarding-legibility-visual-linear-{01,02,05-paywall}.png`; `Documentation/Clarity/Screenshots/clarity-research-contents.png` (outdated)
- Docs: `Documentation/Clarity/README.md`, `Documentation/LibraryRefresh-2026-09-20/README.md`, `Documentation/ReadingTypography-2026-09-14/README.md`, `Documentation/Localization/*` (no font guidance)
