# Shared design layer vs the iOS app (by code) — 2026-09-23

Scope: `src/site/styles/**`, `src/site/ui/**`, `src/site/shell/**` (not the layout, not features).
Source of truth: `app_04_inapp/Inapp/Studio/StudioStyle.swift`, `Inapp/Clarity/*.swift`
(paths below are relative to `Inapp/`). Web paths are relative to `badcomment-v2/`.
No screenshots were used. Values were checked by reading Swift and, for the web, by measuring computed
styles in headless Chrome against a static copy of the SSR markup (`/tmp/iatest`, text output only).

Legend: **fixed** = changed in this pass; **handoff** = the mismatch is in a feature file, so another
owner has to fix it (exact fix given).

## What already matched (no change)

- Palette light/dark (`tokens.css:13-87`) = `StudioStyle.swift:5-21` + `ClarityStyle.swift:11-17` +
  `ClarityReadingStyle.swift:6`: paper `#F5F5F7/#111214`, reading `#FCFCFD/#17181B`, surface
  `#FFFFFF/#1D1E22`, ink, secondary, accent `#3458DB/#94AAFF`, action `#3458DB` in both, sky
  `#EDF1FF/#262D45`, soft `#EBECF0/#28292F`, line `#DEDFE5/#383A42`, coral, green. Exact.
- Reading type (`tokens.css:117-146`): Georgia 30/34, 22/27 (+2), 19/27.6 (+6), 19/26.6 (+5),
  20/28.7 (+6), 20/29.7 (+7) = `ClarityReadingStyle.swift:12-19` with Georgia's 1.136 natural leading.
- ClarityHeading title/subtitle faces and sizes, gap 10 (`site.css` `.ia-heading*`) = `ClarityStyle.swift:114-127`.
- Search field height 56, radius 16, gap 12, glyph 18, no border/shadow; free badge 12/600, 7×12,
  capsule, sky, ink (measured 30 px tall = caption 16 + 14) = `ClarityCatalogs.swift:134-141`.
- Tab bar capsule paddings/gaps/shadow, item 50 / 13 / 17 / 23-wide glyph, rounded 15/600 label,
  selected sky pill + black 4 % shadow = `ClarityFloatingTabBar.swift:17-71` (measured: idle 49 px,
  selected 17+23+8+label+17, capsule padding 6).
- «Назад» glass pill 17/500, min 44, no chevron (measured 80×44) = `ClarityBackNavigation.swift:13-15`.
- Chips (Saved filters) 44 / 16 / 15-600, sky selected = `ClarityMy.swift:98-111`.
- Theme default light, `color-scheme`, `system` via media query; motion tokens and reduce-motion zeroing.

## Findings

| # | Sev | Web (file:line) | Swift / spec source | Problem → fix | Status |
|---|---|---|---|---|---|
| 1 | major | `site.css:408-446` `.ia-card--research` (was `inset 0 0 0 1px` in `box-shadow`) | `ClarityCatalogs.swift:147-148`, `ClarityIdeaCard.swift:62-64` (`.overlay { strokeBorder(line.opacity(0.65), 0.7) }`) | An inset box-shadow paints **under** the full-bleed cover `<img>`, so the card's hairline vanished around the whole artwork (top, left, right). SwiftUI draws the stroke as an overlay above the art. → stroke moved to `::after { position:absolute; inset:0; border-radius:inherit; box-shadow: inset 0 0 0 var(--ia-stroke-card) var(--ia-line-65); pointer-events:none }`; the card gets `position: relative`; hover shadows no longer repeat the inset. Same for `.ia-card--idea`. | fixed |
| 2 | major | `ideas.css:23-25` `.ia-idea-card` (feature) | `ClarityIdeaCard.swift:62-64` | Same bug as #1 on the idea card: the art (full width, r20) covers the inset line. → in `ideas.css` replace the inset part with `.ia-idea-card::after { content:""; position:absolute; inset:0; border-radius:inherit; box-shadow: inset 0 0 0 var(--ia-stroke-card) var(--ia-line-65); pointer-events:none; }` and keep `box-shadow: var(--ia-shadow-idea-card)` on the card (also drop the inset from the `:hover` shadow at `ideas.css:43-45`). The card already has `position: relative`. | handoff (ideas) |
| 3 | major | `site.css:192-223` `.ia-grid` gap 14 (mobile), `24px 20px` (md) | `ClarityCatalogs.swift:42` (research spacing 24), `:189` + `ClarityIdeaCard.swift:67` (ideas 14 + 6 bottom padding = 20) | Research cards were 14 apart on phones (app 24); idea cards 14 (app 20, the grid zeroes the card margin). → `.ia-grid { gap: 20px }`; a grid holding shared research cards (`:has(> * > .ia-card--research)`) gets 24; xl stays 28. New optional modifiers `.ia-grid--research` / `.ia-grid--ideas`. Measured: research grid 24/24 (390, 800), 28 (1280). | fixed |
| 4 | major | `shell/TabBar.tsx:24` (lucide outline `BookOpen`, `Lightbulb`, `Bookmark`) | `ClarityFloatingTabBar.swift:11-15` (`text.book.closed.fill`, `lightbulb.fill`, `bookmark.fill`, both idle and selected) | Tab glyphs were outline icons (and the research one an *open* book). → new filled glyphs in `ui/icons.tsx:60-83`: `ResearchFilledIcon` (closed book, text lines knocked out, pages band), `IdeasFilledIcon` (lucide Lightbulb `fill=currentColor`), `BookmarkFilledIcon` (lucide Bookmark filled); TabBar uses them at 19 px. | fixed |
| 5 | major | `ui/icons.tsx:12` `BookmarkFilledIcon` was lucide `BookmarkCheck` (outline + tick) | `ClarityReader.swift:805` (`bookmark` ↔ `bookmark.fill`) | The "saved" bookmark in every reader toolbar showed a check mark instead of a solid bookmark. → `BookmarkFilledIcon` now renders a solid bookmark (same export name/props). | fixed |
| 6 | major | `site.css` `.ia-icon-btn[aria-pressed="true"] { color: accent }` (removed, comment at `:713`) | `ClarityReader.swift:231,583` (`.tint(ClarityReadingStyle.ink)` on reader chrome), `:805` | Saved state turned the bookmark cobalt; the app keeps it ink and only swaps to the filled glyph. → rule removed; the state is carried by the glyph (#5). | fixed |
| 7 | major | `site.css:1181-1223` tab label hidden with `clip`, width jumped | `ClarityFloatingTabBar.swift:31,46-55` (spring 0.38/0.84 animates the HStack) | The selected label popped in (width jump) while only padding animated. → label is `inline-grid` `0fr → 1fr` + opacity, glyph–label gap `0 → 8`, all on `--ia-dur-tab/--ia-ease-tab`; the dock is `width: max-content` (without it `left:50%` capped the dock at half the viewport and clipped «Разборы» to 12 px at 390 px — found by measuring). Label stays the accessible name. Idle 49 px / selected 17+23+8+label+17 measured at 320, 390, 800. The pill still grows/shrinks in place rather than sliding (no matchedGeometry on the web). | fixed |
| 8 | minor | `site.css:314-335` `.ia-btn--primary` 58 px, `.ia-btn--welcome` 56 px tall | `ClarityStyle.swift:99` (minHeight 24 + 18×2 = 60), `ClarityWelcomeComponents.swift:34-35` (24 + 17×2 = 58) | → `min-height: var(--ia-btn-primary-h)` (60) and `var(--ia-btn-welcome-h)` (58), tokens `tokens.css:225-226`. Measured 60 / 58. | fixed |
| 9 | minor | `site.css:475` `.ia-search` padding `0 8px 0 18px` | `ClarityStyle.swift:143` (`.padding(.horizontal, 18)`) | → `padding: 0 18px`. Also `::-webkit-search-decoration` reset (Safari inset). | fixed |
| 10 | minor | `site.css:513-526` `.ia-search__clear` color secondary | `ClarityStyle.swift:139-144` (button inherits the row's `.foregroundStyle(ink)`; only the magnifier is secondary) | → `color: var(--ia-ink)`. | fixed |
| 11 | minor | `site.css:270` `.ia-heading--large { gap: 4px }`; `ui/Heading.tsx:38` `gap-4` | `ClarityMy.swift:87-88` (HStack spacing 12, VStack spacing 8) | → `gap: 8px`; trailing row `gap-3` (12). | fixed |
| 12 | minor | `site.css:1025` `.ia-empty__body` margin 8; `ui/EmptyState.tsx:32` action wrapper `w-full` | `ClarityMy.swift:116-124` (spacing 10; CTA has no `maxWidth`, hugs label) | → margin 10; action wrapper `.ia-empty__action { align-self: flex-start }`, so the Saved «Открыть разборы» button hugs its label even with `block` (measured 179 px). | fixed |
| 13 | minor | `site.css:583` `.ia-chip--surface` 44 tall, gap 6 | `ClarityCatalogs.swift:206-211` (padding 13×17 → 46, spacing 8) | → `padding: 13px 17px; gap: 8px` (46 measured). | fixed |
| 14 | minor | `site.css:790` `.ia-menu__item--danger` coral | `ClarityMy.swift:168` (`role: .destructive` in a `Menu` = system red) | → `color: var(--ia-error-system)` (`#FF3B30/#FF453A`). | fixed |
| 15 | minor | `site.css:939` `.ia-sheet__footer` `1px line-65` | `ClarityReader.swift:1004` (`Divider().overlay(rule)` = full line color, hairline) | → `border-top: var(--ia-hairline) solid var(--ia-line)`. | fixed |
| 16 | minor | `ui/Sheet.tsx:212` `SheetAction` forced 600 inline for every action | `ClarityReader.swift:925` (`.cancellationAction` «Отмена» regular), `:934` («Сохранить» semibold), `:222`, `:889` (confirmation) | → optional `emphasis?: "strong" \| "regular"` (default strong); classes `.ia-glass-pill--strong/--regular/--accent` replace the inline style. | fixed |
| 17 | minor | `library/components.tsx:192` (feature) | `ClarityReader.swift:925` | «Отмена» → `<SheetAction emphasis="regular" …>`. | handoff (library) |
| 18 | minor | `site.css:717` glass pill hover `background-color: ink-045` | — (web-only hover) | Hover replaced the glass fill with a 4.5 % tint, so «Назад»/«Готово» turned nearly transparent. → `background-image: linear-gradient(ink-045, ink-045)` over the glass. | fixed |
| 19 | minor | `site.css:850,881` small dialog | spec 05 §3.6 N | At ≥ 760 the generic sheet rule (same specificity, later) widened `variant="dialog"` (App Store notice, confirmations) to 684 px. → re-assert `width: min(420px, calc(100% - 32px))` inside the media block (measured 420). | fixed |
| 20 | minor | `tokens.css:214-218,329-334`; all 0.5 px literals in `site.css` | `ClarityStyle.swift:109` (0.5), `ClarityFloatingTabBar.swift:27` (0.5), `ClarityMy.swift:94` (0.5), `ClarityCatalogs.swift:148` / `ClarityIdeaCard.swift:63` (0.7) | Strokes were a mix of 0.5 px / 1 px literals. → tokens `--ia-hairline` (1 px at 1×, **0.5 px** at ≥ 2dppx) and `--ia-stroke-card` (1 px at 1×, **0.7 px** at ≥ 2dppx) used by utility card, research/idea cards, tab bar, gear, glass, menu, footer, top bar, app banner, account button. On an iPhone (3×) the web now draws the same device pixels as the app. (Spec 05 §3.5 kept 1 px for cards on Retina; Swift says 0.7.) | fixed |
| 21 | minor | `ui/EmptyState.tsx:45`, `site.css:1466-1530` ClarityArt | `ClarityStyle.swift:28-88` | The CSS drawing was approximate: equal plates without offsets, percentage (elliptical) radii, paper not tilted −3°, all lines `soft`, only the paper floated. → exact fractions of `size`: back plate .65×.73 r.11 sky −15° offset (−.05,.025); mid .62×.73 r.10 accent@17 % +12° offset (.05,−.01); paper .63×.73 r.09 padding .12, spacing .055, stroke line@80 % 0.7, shadow 9 % (.025/.12), −3°; glyph box .25 high, glyph .17; lines .31×.026 ink@75 %, .36×.02 and .25×.02 secondary@30 %; the whole group floats (3.4 s, −3 px, 1.2°). | fixed |
| 22 | minor | `shell/StatusViews.tsx:19,40-52` | `ClarityRoot.swift:36-41` | Error state: glyph was an alert/open book, heading centered, button capped at 360. App: `ClarityArt(role: .research)` → `text.alignleft`, heading leading-aligned (full width), full-width `ClarityButton`, spacing 24, padding 26. → `TextLinesIcon` (new export, lucide `TextAlignStart`) at 26 px in both views; ErrorView uses new `.ia-status` (gap 24, padding 26, column max 440 + 52 on desktop, heading stretched/left, title fixed at 30). | fixed |
| 23 | minor | `ui/icons.tsx:14` `ResearchIcon` = `BookOpen` | `ClarityReader.swift:546` («Читать разбор категории» = `text.book.closed`), `ClaritySettings.swift:49` | → `BookText` (closed book with text lines). Same export name. | fixed |
| 24 | minor | `site.css:120` | `ClarityReadingStyle.swift:6` (`.ignoresSafeArea()`) | Only `<body>` switched to reading paper; overscroll/rubber-band showed `#F5F5F7` above/below `#FCFCFD`. → `html:has(.ia-reading-page)` too. | fixed |
| 25 | minor | `site.css:244` `.ia-heading__subtitle` | `ClarityCatalogs.swift:78` (column 680) | On the 1200 px desktop grid the Georgia subtitle ran ~150 characters per line. → `max-width: var(--ia-w-catalog)`; `font-weight: 400` explicit. (Desktop taste, not parity.) | fixed |
| 26 | minor | `site.css:1596` reduce-motion block | UIKit spinner keeps spinning under Reduce Motion | The global reduce rule froze `.ia-spinner` into a static arc (reads as broken). → spinner exempt; `--ia-dur-press-welcome` also zeroed (`tokens.css:341`). | fixed |
| 27 | minor | `site.css:468` | `StudioStyle.swift:59-67` | With a mouse, the hover `translateY(-1px)` (higher specificity) cancelled the press scale .97. → `:active` re-asserted inside the hover block. | fixed |
| 28 | minor | `landing/LandingPage.tsx:158,348` (feature) | `ClarityCatalogs.swift:135-138` (badge text inherits ink; fill = sky) | «Бесплатный разбор» uses `<Badge tone="accent">` (cobalt text). → `<Badge>` (default tone = ink on sky). | handoff (landing) |
| 29 | minor | `research/research.css:516-520` `.ia-rs-text-link` (feature) | `ClarityContentAccess.swift:95-98` (`frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)`) | «Сначала прочитать бесплатный разбор» is centered; app is leading. → `align-self: flex-start; justify-content: flex-start` (keep `--body` variant as is). | handoff (research) |
| 30 | minor | `welcome/welcome.css:564-567` (feature) | `ClarityWelcomeComponents.swift:22-41` (no `maxWidth`: the capsule hugs its label, centered) | `.ia-wel-footer .ia-btn--welcome { width: 100% }` stretches the onboarding CTA to 440. → remove `width: 100%` (keep `max-width`). | handoff (welcome) |
| 31 | minor | `src/site/fonts.ts` (outside this scope) | spec 09 C21 | Serif fallback stack is `Georgia, "PT Serif", "Noto Serif", …` but PT Serif is not self-hosted; Android/Linux fall to Noto Serif. Acceptable; self-host PT Serif (OFL, Latin + Cyrillic) via `next/font/local` if closer metrics are wanted. | handoff (integrator) |
| 32 | note | `.ia-btn--secondary` (`site.css:354`) | `ClaritySettings.swift:187-190` (no stroke) | The app's surface pill has no stroke, but the landing places this variant on surface cards (`landing.css:1446-1453`), where it would disappear. Kept a hairline (`--ia-hairline`, line@65 %). Intentional. | kept |
| 33 | note | — | `ClarityStyle.swift:148-162` `ClarityRow` | Only used by the legacy stored-project screen (dropped per spec 09 C12); Settings rows are feature-owned. No shared primitive added. | n/a |

Not yet written / not reviewable here: nothing in the shared layer was missing. `shell/Footer.tsx`
and the new `shell/FooterPlusLink.tsx` were being edited by another agent during this pass; I did
not touch them.

## Changed files (before → after)

- `src/site/styles/tokens.css:214-226` new `--ia-hairline`, `--ia-stroke-card`, `--ia-btn-primary-h` (60),
  `--ia-btn-welcome-h` (58); `:329-334` Retina values 0.5 / 0.7; `:341` reduce-motion zeroes `--ia-dur-press-welcome`.
- `src/site/styles/site.css`: #1, #3, #7–#16, #18–#22, #24–#27 above (every value cites its Swift line in a comment).
- `src/site/ui/icons.tsx`: `ResearchIcon` → `BookText`; `BookmarkFilledIcon` → solid bookmark; new
  `IdeasFilledIcon`, `ResearchFilledIcon`, `TextLinesIcon` (another agent added Settings icons to the same file in parallel; kept).
- `src/site/ui/EmptyState.tsx`: `.ia-empty__action`; `ClarityArt` markup gets `.ia-art__glyph` (props unchanged).
- `src/site/ui/Heading.tsx:38` `gap-4` → `gap-3`.
- `src/site/ui/Sheet.tsx:212` `SheetAction` optional `emphasis`; classes instead of inline style.
- `src/site/ui/Toolbar.tsx:62` doc: pressed = ink + filled glyph.
- `src/site/shell/TabBar.tsx:24,54` filled glyphs; label wrapped in `.ia-tab__text`.
- `src/site/shell/StatusViews.tsx` ClarityArt glyph `text.alignleft`; ErrorView layout = app boot error.

No exported component, prop or existing class name was renamed or removed. New: classes
`ia-grid--research`, `ia-grid--ideas`, `ia-glass-pill--strong/--regular/--accent`, `ia-empty__action`,
`ia-tab__text`, `ia-art__glyph`, `ia-status`, `ia-status__heading`; exports `IdeasFilledIcon`,
`ResearchFilledIcon`, `TextLinesIcon`; prop `SheetAction.emphasis`.

## Verification

- `npx tsc --noEmit` — clean (whole repo). `npx eslint src/site/ui src/site/shell` — clean.
- Before the edits, `:3210` served `/ru/segment`, `/ru/ideas`, `/ru/saved`, `/ru/segment/interior-design`,
  `/ru/ideas/interior-design-1`, `/en`, `/de/ideas`, `/ru/settings`, `/ja/segment` → 200 (and a bogus
  path → 404), including after the TabBar/CSS edits (the SSR markup with the new tab glyphs was
  fetched and the compiled CSS contained the new rules). Later in the pass the shared server stopped
  answering (connection refused). Per the rules I did not restart it, so the final pages were not
  re-curled.
- Layout was checked with the headless Chrome shell against the saved SSR markup and the local
  CSS (text measurements only): tab bar 49 / 124.9 / 49 (ru) at 320–800 px; research card r28 +
  `::after` stroke; grid gaps 24/24/28; search 56 tall, padding 18/18; badge 30 tall; primary 60,
  welcome 58, rect 50, «Назад» 80×44, icon group 126×44, chip 46; empty-state CTA hugs (179 px);
  dialog 420 wide at 1280; ClarityArt paper .63×.73 at −3°, lines .31/.36/.25.
