# Review: ideas catalog, idea reader and export — parity with the iOS app (by code)

Reviewer key: `ideas-parity` · 2026-09-23 · report only. No source files were edited.

**Scope (web).** `src/site/features/ideas/**` (IdeasCatalog, IdeaCard, IdeaReader, IdeaArticle, ExportSheet, document.ts, export.server.ts, ideas.css, strings/keys/seo/AppPromo), `src/app/(site)/site/[lang]/ideas/{page,[id]/page}.tsx`, `src/app/api/site/export/[id]/route.ts`. I also looked at the shared pieces they render: `src/site/ui/*`, `src/site/styles/{tokens,site}.css`, `src/site/content/{search,text}.ts`, and `features/library/components.tsx` (BookmarkButton, NoteSheet).
**Compared against.** `Clarity/ClarityCatalogs.swift` (ideas part, `:159-274`), `ClarityIdeaCard.swift`, `ClarityIdeaCardArt.swift`, `ClarityReader.swift` (idea parts `:1-62, 460-656, 719-1055`), `ClarityExportDocument.swift`, `ClarityContentAccess.swift`, `ClarityResearchFlow.swift`, `Content/{IdeaArticles,EditorialContent,QuoteReading,ResearchEditorial}.swift`. Specs: 02 §1–§3 and §7, 05 §2–§3.6, 09 (C17, C18, G5, G6, G10, §5 #16/#24/#28).
Swift paths are relative to `/Users/artsaverin/projects/app_04_inapp/Inapp/`. Web paths are relative to the worktree root. Line numbers are from 2026-09-23 ~00:10. `site.css` and `tokens.css` were being edited by others during the review. The ideas files did not change between my reads (last write 23:57).

**Checked on the shared dev server (:3210).** Guest requests to `/ru/ideas`, `/ru/ideas/interior-design-1` (free) and `/ru/ideas/photo-editing-1` (locked), and `POST /api/site/export/{interior-design-1, photo-editing-1}`. One transient 500 happened while another agent was saving `src/site/i18n/server.ts`. A retry returned 200.

**Not written yet:** the idea modal. There is no intercepting `@modal` route under `src/app/(site)/site/[lang]/`, and `ideas/[id]/page.tsx:18` says so. See M1. Everything else in scope exists.

---

## Summary table

| # | Sev | What | Web | Source of truth |
|---|---|---|---|---|
| M1 | major | A card opens a full page, not the idea sheet (**modal route not written yet**) | `IdeaCard.tsx:88`; `ideas/[id]/page.tsx:18`; no `[lang]/@modal` | `ClarityIdeaCard.swift:74-90`; spec 02 §2.7, §3.1; 09 C17, G6 |
| M2 | major | The reader puts the cover artwork above the title | `IdeaArticle.tsx:23-34` | `ClarityReader.swift:488-492`; spec 02 §3.4 |
| M3 | major | The reader shows a category chip under the lead | `IdeaArticle.tsx:38-44`, `ideas.css:275-292` | `ClarityReader.swift:719-743`; spec 02 §3.4 ("no category label and no metadata") |
| M4 | major | Quotes show «Отзыв о приложении X» and stars | `IdeaArticle.tsx:100-118`, `ideas.css:333-349` | `ClarityReader.swift:858-876`; spec 02 §1.3; spec 09 §5 #28 (ANSWERED: no) |
| m1 | minor | NBSPs are removed from the hero title, lead, headings and inset titles | `IdeaArticle.tsx:36-37,76,83` | `ClarityReader.swift:619,637,735,739` vs `:45-47` |
| m2 | minor | Footer rows: no 12 px gap, 8 px instead of 20 px under the rule, accent icons, sub-line gap 3 | `ideas.css:379-413` | `ClarityReader.swift:543-565,583` |
| m3 | minor | Locked gate: accent lock icon, centred accent link, accent note button | `ideas.css:440-442,449-456,463-474` | `ClarityContentAccess.swift:84-108,116` |
| m4 | minor | The card hairline is painted under the artwork | `ideas.css:23-26,43-46` | `ClarityIdeaCard.swift:62-64` |
| m5 | minor | 10 px extra above the list; page top 24, not 20 (the 14 → 20 card gap was fixed in `site.css` during the review) | `ideas.css:165-167`; `site.css:151` | `ClarityCatalogs.swift:189,218`; `ClarityIdeaCard.swift:67` |
| m6 | minor | Locked art is stretched and cropped in mixed grid rows | `ideas.css:94-105` | `ClarityIdeaCardArt.swift:37`; `ClarityIdeaCard.swift:23-24` |
| m7 | minor | Search and category pill share one row at ≥ 760 px | `ideas.css:123-131` | `ClarityCatalogs.swift:192-213` |
| m8 | minor | Empty-state gap is 6, not 8 | `ideas.css:173` | `ClarityCatalogs.swift:235` |
| m9 | minor | Picker rows are 44 px with full-width dividers (app ≈ 58 px, 20 px inset) | `ideas.css:203-220` | `ClarityCatalogs.swift:255-273` |
| m10 | minor | Unlocked card: no a11y hint; the accessible name also includes the category | `IdeasCatalog.tsx:131-140`; `IdeaCard.tsx:88-96` | `ClarityIdeaCard.swift:70-71` |
| m11 | minor | The IdeaCard contract makes the category line optional (research omits it) | `IdeaCard.tsx:29-30,93`; `features/research/ResearchArticle.tsx:116-123` | `ClarityIdeaCard.swift:46-54` |
| m12 | minor | Export sheet spacing and hero typography | `ExportSheet.tsx:198-219`; `ideas.css:478-546` | `ClarityReader.swift:725,739,885-886,979-997,1019-1028` |
| m13 | minor | Export action bar: accent 36 px centred text buttons, gap 6, grey «Документ сохранён» | `ExportSheet.tsx:152-185`; `ideas.css:567-586` | `ClarityReader.swift:1029-1054` |
| m14 | minor | Export sends the private note to the server | `ExportSheet.tsx:67-72`; `route.ts:38-43` | spec 09 G10; `ClarityExportDocument.swift:61-62` |
| m15 | minor | Export: 20 of 1 465 files lose one trailing space | `document.ts:77` | `ClarityExportDocument.swift:27`; `ResearchEditorial.swift:21` |
| m16 | minor | Export item «1 Разбор категории — Полный текст…» is shown even when the file has only the summary (web-only case) | `export.server.ts:35-45`; `ExportSheet.tsx:146-150` | `ClarityReader.swift:985-988` |
| m17 | minor | Quote glyph is lucide `Quote` in outline, not a filled opening mark | `IdeaArticle.tsx:98` | `ClarityReader.swift:865-867` |
| m18 | minor | German search: «strasse» does not find «Straße» (cross-ref, shared lib) | `src/site/content/text.ts:279-286` | `Studio/StudioDomain.swift:79-82` (`localizedStandardContains`) |
| m19 | minor | Reader bookmark: toast on every toggle, check-mark icon (cross-ref, library/ui) | `features/library/components.tsx:42,45`; `src/site/ui/icons.tsx:12` | `ClarityReader.swift:796-812` |

**No blockers.** The paid-content gate holds. Export text matches the app byte for byte, except m15. Details are in "Verified" at the end.

---

## Major

### M1 — A card opens a full page, not the idea sheet (modal not written yet)
- **Web:** `src/site/features/ideas/IdeaCard.tsx:88` renders a `<Link href="/<L>/ideas/<slug>">`. Clicking it replaces the list with a page whose toolbar has «Назад» (`IdeaReader.tsx:52`). There is no `@modal` slot anywhere under `src/app/(site)/site/[lang]/`, and `ideas/[id]/page.tsx:18` says "the web has no intercepting modal yet".
- **App:** tapping an unlocked card presents `ClarityIdeaView` in its own `NavigationStack` as a sheet. It uses `.presentationDetents([.large])` and a drag indicator, and has a leading «Готово» (`ClarityIdeaCard.swift:74-90`). Spec 09 C17 (ANSWERED, parity): open a **modal from cards** (catalog and research article) and a **page** from Saved, a direct URL or a reload. G6 sets the rules for nesting.
- **Fix:**
  1. Add the parallel slot `src/app/(site)/site/[lang]/@modal/(.)ideas/[id]/page.tsx` and `@modal/default.tsx` (`return null`). Render `{modal}` in `[lang]/layout.tsx`.
  2. The intercepted page must run the **same server gate** as `ideas/[id]/page.tsx:79` (`viewer.canReadIdea(id) ? getIdea(...)`). A locked id never reaches it, because locked cards open the paywall.
  3. Render `<Sheet open paper="reading" full title={t("Идея")} leading={<SheetAction onClick={() => router.back()}>{t("Готово")}</SheetAction>} trailing={<ToolbarPill icons><BookmarkButton …/><Menu …/></ToolbarPill>}>` around `<IdeaArticle>` and the footer rows. Esc and a backdrop click go to `router.back()`.
  4. G6.3: «Читать разбор категории» closes the modal and then navigates the page. G6.4: another idea card inside the modal replaces the modal content.
  5. Once this exists, give unlocked cards the hint «Открыть полную идею в отдельном окне.» (m10).
  6. **Check the interception behind the proxy.** Public `/ru/ideas/x` is rewritten to `/site/ru/ideas/x`, and `Next-Url` carries the public path, so interception may not match. If it does not, build it on the client instead: on a plain left-click (no modifier keys) `IdeaCard` calls `preventDefault()`, then `history.pushState(routes.idea(...))` and opens the Sheet. The Sheet loads the gated reader from a server action or an RSC route.

### M2 — The reader puts the cover artwork above the title
- **Web:** `src/site/features/ideas/IdeaArticle.tsx:23-34` renders `<img className="ia-idea__cover">` (3:2, r20, `fetchPriority="high"`) before the hero. On a phone that is about 230–430 px of art before the title.
- **App:** `ClarityIdeaContentView` starts with `ClarityArticleHero(title:subtitle:)` and then `ClarityIdeaArticleBody` (`ClarityReader.swift:488-492`). The unlocked reader has no artwork. Spec 02 §3.4 gives the order: Hero → blocks → footer. Artwork appears only in the **locked** gate (`ClarityContentAccess.swift:71-73`), and the web already does that correctly (`LockedIdea`).
- **Fix:** delete lines 23-34 of `IdeaArticle.tsx`. Keep the cover only for `og:image` and JSON-LD (`ideas/[id]/page.tsx:33,133`). `.ia-idea__cover` stays in use for the locked gate art.

### M3 — The reader shows a category chip under the lead
- **Web:** `IdeaArticle.tsx:38-44` adds an accent-soft pill link with the category name (`ideas.css:275-292`).
- **App:** `ClarityArticleHero` has only the title (Georgia 30) and the description (Georgia 20 secondary), 18 apart (`ClarityReader.swift:719-743`). Spec 02 §3.4: "There is no 'Из отзывов' section, no category label and no metadata in the article layout."
- **Fix:** remove the `<Link className="ia-idea__category">` and its CSS. The footer row «Читать разбор категории» (`IdeaReader.tsx:70-75`) already links to the topic. After this, `ideasStrings.*.categoryLabel` is unused and can be dropped.

### M4 — Quotes show the app name and stars
- **Web:** `IdeaArticle.tsx:100-118` renders a `<figcaption>` with «Отзыв о приложении {app}» and five 12 px stars in accent (`ideas.css:333-349`).
- **App:** `ClarityQuoteBlock` receives `app` and `rating` but renders only the `quote.opening` glyph and the text (`ClarityReader.swift:858-876`). Spec 02 §1.3: "App name and rating are NOT displayed". Spec 09 §5 #28 is **ANSWERED: No**. DECISIONS §3 ("site-only richness") covers the extra **topic-page** blocks, not quote captions. The research reviewer reports the same issue as research M1.
- **Fix:** delete the `figcaption` branch (lines 100-118) and `.ia-idea__quote-caption` / `.ia-idea__stars` CSS. Also drop `quoteSource` and `quoteRating` from `strings.ts`. If the owner overrules #28, colour the stars `var(--ia-secondary)`, not accent.

---

## Minor

### m1 — NBSPs are removed where the app keeps them
- **Web:** `IdeaArticle.tsx:36-37,76,83` wrap the hero title, the lead, `heading` blocks and inset titles in `applyNbspPolicy()`. That turns NBSP into a space.
- **App:** only `ClarityArticleText` (paragraphs) replaces NBSP (`ClarityReader.swift:45-47,769`). `Text(title)`, `Text(subtitle)`, heading and inset titles render the raw string (`:619,637,735,739`). The data affects **fr only**: 6 titles and 6 descriptions. Examples: `calendars-tasks-2` «Qu’est-ce qui tiendra entre les rendez-vous ?», `calendars-tasks-5`, `interior-design-3`. On the web the «?» can wrap onto its own line.
- **Fix:** render `{idea.title}`, `{idea.description}`, `{block.text}` (heading) and `{block.title}` without `applyNbspPolicy`. Paragraphs keep going through `paragraphs()`.

### m2 — Footer action rows (spacing, tint)
- **Web (`ideas.css:379-413`):**
  - Rows have no gap, and there is `padding-top: 8px` under the rule.
  - Icons are `color: var(--ia-accent)`.
  - The export row has the same 11 px padding as the others.
  - The label/sub-line gap is 3 px.
- **App (`ClarityReader.swift:543-565`):**
  - `VStack(spacing: 12)`. `Divider().padding(.bottom, 8)` plus the 12 gap puts the first row 20 below the rule.
  - The reader tint is ink (`:583`), and the rows use `.buttonStyle(.plain)`, so icons are ink.
  - The export row adds `.padding(.vertical, 12)`. Its label/sub-line `VStack(spacing: 6)`. The icon has `.padding(.top, 3)`.
- **Fix:**
  ```css
  .ia-idea__actions { gap: 12px; padding-top: 20px; }
  .ia-idea__action svg { color: currentColor; }
  .ia-idea__action:last-child { padding-block: 12px; }
  .ia-idea__action:last-child svg { margin-top: 3px; }
  .ia-idea__action-text { gap: 6px; }
  ```

### m3 — Locked gate colours and alignment
- **Web (`ideas.css`):**
  - `.ia-idea-gate__label svg` is accent (`:440-442`).
  - `.ia-idea-gate__link` is accent and **centred** (`:449-456`). It is a block flex item, so `justify-content: center` centres the text.
  - `.ia-idea-gate__note` is accent (`:463-474`).
- **App (`ClarityContentAccess.swift`):** the whole preview has `.foregroundStyle(ClarityStyle.ink)` (`:116`).
  - `Label(…, systemImage: "lock")` has no own colour, so it is ink (`:84-85`).
  - The free-sample link is `.subheadline.weight(.medium)`, leading-aligned, `.buttonStyle(.plain)`, so ink (`:95-98`).
  - «Моя заметка к материалу» is `.body.weight(.medium)`, plain, so ink (`:104-107`).
- **Fix:**
  ```css
  .ia-idea-gate__label svg { color: currentColor; }
  .ia-idea-gate__link { justify-content: flex-start; color: var(--ia-ink); }
  .ia-idea-gate__note { color: var(--ia-ink); }
  ```

### m4 — The card hairline is painted under the artwork
- **Web:** the border is `inset 0 0 0 1px var(--ia-line-65)` inside `box-shadow` (`ideas.css:23-26`, hover `:43-46`). Inset shadows are painted below in-flow children, so the full-bleed `<img>` hides the stroke along the whole art area. A locked card is all art, so it effectively has no stroke.
- **App:** `.overlay { shape.strokeBorder(line.opacity(0.65), lineWidth: 0.7) }` is drawn **above** the content (`ClarityIdeaCard.swift:62-64`).
- **Fix:** during this review (~00:10) the shared `site.css` already moved the `.ia-card--idea/--research` stroke to `::after` using the new `--ia-stroke-card` token (1px, or 0.7px at 2dppx; `site.css:417-437`). `.ia-idea-card` in `ideas.css`, which is the class `IdeaCard` actually renders, still uses the old inset shadow. Make the same change:
  ```css
  .ia-idea-card { box-shadow: var(--ia-shadow-idea-card); }
  .ia-idea-card::after { content: ""; position: absolute; inset: 0; border-radius: inherit;
    box-shadow: inset 0 0 0 var(--ia-stroke-card) var(--ia-line-65); pointer-events: none; }
  @media (hover: hover) { .ia-idea-card:hover { box-shadow: 0 8px 32px rgb(0 0 0 / 0.08); } }
  ```

### m5 — Vertical rhythm of the ideas list
- **Web:**
  - `.ia-ideas__grid { margin: 10px 0 0 }` (`ideas.css:165-167`) puts the first card 24 px below the pill (14 flex gap + 10).
  - `.ia-page` has `padding-top: 24px` (`site.css:151`, used by `ideas/page.tsx:91`).
  - The card-to-card gap was 14 px on phones when I started. During the review `site.css` changed `.ia-grid` to `gap: 20px` (`site.css:192-197`), so that part now matches.
- **App:**
  - `LazyVStack(spacing: 14)` (`ClarityCatalogs.swift:189`) plus the card's `.padding(.bottom, 6)` (`ClarityIdeaCard.swift:67`) gives 20 between cards.
  - The pill is 14 above the first card.
  - The ideas screen uses `.padding(20)`, so top 20 (`ClarityCatalogs.swift:218`). The research screen uses 24.
- **Fix:** `.ia-ideas__grid { margin: 0; }`. Add `pt-5` (20 px) to the wrapper in `ideas/page.tsx:91`. Optionally, add the explicit `ia-grid--ideas` class to the `<ul>` at `IdeasCatalog.tsx:117`.

### m6 — Locked art is stretched and cropped in mixed grid rows
- **Web:** `.ia-ideas-grid .ia-idea-card--locked .ia-idea-card__art { flex: 1; min-height: 0 }` (`ideas.css:102-105`) makes locked art fill the row height, with `object-fit: cover`. Example for a free user at ≥ 1280 px: row 2 holds `interior-design-4`, `interior-design-5` (tall, with text) and `photo-editing-1` (locked). The locked art goes from 3:2 to about 3:4, and the sides of the illustration are cut off. Rows mixing locked and unlocked cards appear for free users and with any category filter.
- **App:** art is always `aspectRatio(1.5, .fit)` (`ClarityIdeaCardArt.swift:37`). The locked card's height is the art's height (`ClarityIdeaCard.swift:23-35`).
- **Fix:** delete the rule at `:102-105`. Add `.ia-ideas-grid .ia-idea-card--locked { flex: none; align-self: flex-start; }` so locked cards keep 3:2 and the row simply ends unevenly.

### m7 — Search and category pill in one row at ≥ 760 px
- **Web:** at ≥ 760 px, `.ia-ideas__controls` becomes a row with the search at `flex: 0 1 560px` and the pill to its right (`ideas.css:123-131`).
- **App:** the pill sits **below** the search, in the same 14-gap column (`ClarityCatalogs.swift:192-213`). Spec 02 §2.6 gives the order: search, then pill. Spec 05 §3.2 md: "heading + search span the grid, search max 680".
- **Fix:** drop the media query and keep `flex-direction: column; align-items: flex-start`. Cap the search with `.ia-ideas__controls .ia-search { max-width: 680px; }`.

### m8 — Empty-state gap
- `.ia-ideas__empty { gap: 6px }` (`ideas.css:173`) should be `gap: 8px`, as in `VStack(spacing: 8)` (`ClarityCatalogs.swift:235`).

### m9 — Category picker row geometry
- **Web:** `.ia-picker__row { min-height: 44px; padding: 11px 18px }`, with dividers across the full row width (`ideas.css:203-220`).
- **App:** a system `List` row (44 pt minimum) plus `.padding(.vertical, 7)` (`ClarityCatalogs.swift:272`) comes to about 58 pt. Separators are inset about 20 pt from the leading edge.
- **Fix:**
  ```css
  .ia-picker__row { padding: 18px 20px; }
  .ia-picker__list > li + li .ia-picker__row {
    box-shadow: none;
    background: linear-gradient(var(--ia-line-65), var(--ia-line-65)) 20px 0 / calc(100% - 20px) 1px no-repeat;
  }
  ```
  Keep the hover background as a second layer. The picker's own search field is the Clarity search, not a nav-bar search. That is acceptable.

### m10 — Unlocked card accessibility
- **Web:**
  - `IdeasCatalog.tsx:131-140` passes no `hint` to unlocked cards.
  - The `<Link>` accessible name is title + description + category, because all three are text spans (`IdeaCard.tsx:88-96`).
- **App:** the label is `L("%1$@. %2$@", title, description)`. The hint is «Открыть полную идею в отдельном окне.» (`ClarityIdeaCard.swift:70-71`). Locked cards already match.
- **Fix:** set `aria-label={t("%1$@. %2$@", [title, description])}` on the Link, and add that key to `IDEA_CARD_UI_KEYS`. Pass `hint={t("Открыть полную идею в отдельном окне.")}` once M1 exists. The key is already in `IDEA_CARD_UI_KEYS`. Until then the hint would be wrong, because it says "separate window".

### m11 — The category line must always show
- **Web:** `IdeaCard.tsx:29-30` makes `categoryName` optional ("omitted inside the idea's own category article"). `features/research/ResearchArticle.tsx:116-123` (owned by the research agent) omits it.
- **App:** the same `ClarityIdeaCard` always renders `idea.categoryName` as a footnote with +7 top, including inside research articles (`ClarityIdeaCard.swift:46-54`; `ClarityReader.swift:299-301`).
- **Fix:** make `categoryName: string` required in `IdeaCardProps`. The research article passes `idea.categoryName`.

### m12 — Export sheet body spacing and hero
- **Web:**
  - `.ia-export { gap: 24px; padding-top: 4px }` plus the sheet body's 4 px top padding (`site.css` `.ia-sheet__body`, currently `:930-936`).
  - The hero gap is 12 px, and the subtitle uses `--ia-fs-subtitle` (19/26.6) (`ideas.css:487-506`).
  - The list gap is 16. `.ia-export__item-text` has gap 2 and `padding-top: 5px`.
  - The info line and the preview title are separate 24-gap children (`ExportSheet.tsx:198-219`).
- **App:**
  - `ClarityReadingSheet`: `VStack(spacing: 28)`, `.padding(.vertical, 24)` (`ClarityReader.swift:885-886`).
  - Hero gap 18. The subtitle uses the **lead** font, Georgia 20 with line spacing 6, so 28.7 (`:725,739`).
  - The included list, the info and the archive hint share one `VStack(spacing: 20)` (`:979-989`).
  - The preview title and text share `VStack(spacing: 18)` (`:991-997`).
  - An item is `HStack(alignment: .top, spacing: 14)`, and its text is `VStack(spacing: 5)` with no top offset (`:1020-1026`).
- **Fix:** wrap `<ol>` and the info `<p>` in `<div className="ia-export__included">`. Wrap the preview `<h3>` and text in `<div className="ia-export__preview-group">`. Then:
  ```css
  .ia-export { gap: 28px; padding-top: 20px; }            /* + 4 px sheet body = 24 */
  .ia-export__hero { gap: 18px; }
  .ia-export__subtitle { font-size: var(--ia-fs-lead); line-height: var(--ia-lh-lead); }
  .ia-export__included { display: flex; flex-direction: column; gap: 20px; }
  .ia-export__list { gap: 20px; }
  .ia-export__item-text { gap: 5px; padding-top: 0; }
  .ia-export__preview-group { display: flex; flex-direction: column; gap: 18px; }
  ```

### m13 — Export action bar
- **Web:**
  - `.ia-export__actions { gap: 6px }`.
  - Copy and Share are `variant="text" size="sm"`: accent, 15/600, 36 px tall, centred with gap 8 (`ExportSheet.tsx:157-178`, `ideas.css:575-579`).
  - «Документ сохранён» is secondary (`:580-586`).
  - The primary icon is lucide `Download`, 18 px.
- **App (`ClarityReader.swift:1029-1054`):**
  - `VStack(spacing: 8)`.
  - `HStack(spacing: 20)` of two buttons, each `.frame(maxWidth: .infinity, minHeight: 44)`, `.subheadline.weight(.medium)`, foreground and tint **ink**.
  - The footnote is ink.
  - The primary trailing glyph is `arrow.down.doc`, 16 semibold (`ClarityStyle.swift:98`).
- **Fix:**
  ```css
  .ia-export__actions { gap: 8px; }
  .ia-export__row { gap: 20px; }
  .ia-export__row > .ia-btn { flex: 1; min-height: 44px; color: var(--ia-ink); font-weight: 500; }
  .ia-export__done { color: var(--ia-ink); }
  ```
  Use `FileDown` (closer to `arrow.down.doc`) at `size={16} strokeWidth={2.4}` for the primary icon. Hiding Share when `navigator.canShare` is false is correct (spec 09 §5 #16). The primary label «Скачать документ» with no «ещё раз» state is also correct (G11 #7).

### m14 — The note is sent to the server to build the file
- **Web:** `ExportSheet.tsx:67-72` POSTs `{lang, note}`. `route.ts:38-43` accepts it and `document.ts:92` appends it. For a guest, the note editor promises the note is kept in this browser (G11 #3), but the export sends the text off the device. It is not stored (`no-store`), but it still leaves the browser.
- **Spec:** 09 G10: "if notes are device-local the client appends part 3 (`L("3. МОЯ ЗАМЕТКА") + "\n" + note`) exactly as `ClarityExportDocument.swift:61-62` does". The app builds everything on the device.
- **Fix:** POST only `{lang}`. The server returns the document without part 3. The client builds the final text with `note.trim() ? text.slice(0, -1) + "\n\n" + t("3. МОЯ ЗАМЕТКА") + "\n" + note + "\n" : text`, adding `"3. МОЯ ЗАМЕТКА"` to `EXPORT_UI_KEYS`. It then uses that string for the preview, download, copy and share. The 20 000-character note check in the route becomes unnecessary.

### m15 — Export: one trailing space lost in 20 files
- **Web:** `document.ts:77` writes `observation.passages.join("\n\n")`. `passages` are trimmed by the importer (`content/text.ts:113-118`).
- **App:** `add(observation.title, observation.body)` uses the raw body (`ClarityExportDocument.swift:27`; `ResearchEditorial.swift:21`). In `research-editorial.{ru,en}.json`, the `habit-tracking` observation `quick-mark` has a paragraph ending in a space. The exports of `habit-tracking-1…10` in ru and en therefore differ by one character (20 of 1 465). All other files are identical (see Verified).
- **Fix:** have the importer keep the raw `body` on `ResearchObservation` (`content/v2/<L>/research/<c>.json`, a type addition in `content/types.ts:148-156`) and use `add(observation.title, observation.body)`. Alternatively, accept it: the difference is invisible.

### m16 — Summary-only export shows the wrong promise
- **Web:** a viewer who can read the idea but not its category gets only the public summary in part 1 (`export.server.ts:35-45`). This is a legacy per-idea unlock, a web-only case. The sheet still lists «1 Разбор категории — Полный текст: задачи людей, наблюдения, цитаты и выводы.» (`ExportSheet.tsx:146-150`).
- **App:** when the full breakdown is missing, the sheet adds a secondary line saying so (`ClarityReader.swift:985-988`). Keeping the paid research out of the file is right.
- **Fix:** return a flag with the document, for example the response header `X-Export-Research: summary`. In that case, show a web-only line in `strings.ts` (5 locales) under the list, in the app's `.subheadline` secondary style. ru: «Полный разбор этой категории — в Plus. В файле будет его краткое описание, идея и заметка.»

### m17 — Quote glyph
- `IdeaArticle.tsx:98` uses lucide `Quote`, an outline closing-style mark. The app uses SF `quote.opening`, a filled opening mark, at caption (13) size in secondary (`ClarityReader.swift:865-867`). Use a filled opening-quote SVG at 13 px in `var(--ia-secondary)`, shared with the research article (the research reviewer's m7).

### m18 — German search: ß (cross-ref, shared `src/site/content/text.ts`)
- **Web:** `normalizeForSearch` (`text.ts:279-286`) lower-cases and strips marks but does not fold `ß`. The query «strasse» does not match «Straße».
- **App:** `localizedStandardContains` returns `true` for both «Straße»/«strasse» and «Straße»/«STRASSE» (checked with a compiled Swift test). ё/е, й/и, é/e and ä/a behave the same on both sides.
- **Fix:** in `normalizeForSearch`, add `.replace(/ß/g, "ss")` after `toLocaleLowerCase` (it also covers `ẞ`, which lower-cases to `ß`). Then re-run the importer, because `search.json` haystacks are stored normalized. The German haystacks contain ß, for example «einzureißen».

### m19 — Reader bookmark: toast and icon (cross-ref, library + ui)
- **Web:**
  - `features/library/components.tsx:42` shows a toast («Закладка сохранена» / removed) on every toggle.
  - The saved state uses `BookmarkFilledIcon` = lucide `BookmarkCheck`, a bookmark with a tick (`src/site/ui/icons.tsx:12`).
- **App:** `ClarityMaterialSave` toggles with only an a11y value and a selection haptic. The icon is `bookmark` ↔ `bookmark.fill`, solid (`ClarityReader.swift:796-812`).
- **Fix:** drop the toast in the reader toolbar, or confirm with the owner. For the saved state, use `<Bookmark fill="currentColor" />`.

---

## Verified (matches the app)

- **Gate (served HTML, guest):**
  - `/ru/ideas` has 293 cards, 288 of them locked, and **0** paid card titles or descriptions anywhere in the HTML.
  - `/ru/ideas/photo-editing-1` has no title, description, block text or category name. It carries `noindex, follow` and the title «Идея в Plus — inApp».
  - `/ru/ideas/interior-design-1` has `index, follow` and the title «Новая комната. Те же стены. — inApp».
  - `POST /api/site/export/photo-editing-1` as a guest returns **401**.
- **Order and heading:** free users see `interior-design-1…5`, then `photo-editing-1`, `calendars-tasks-2`, … (spec 02 §2.3). Subtitle: «5 идей бесплатно. Остальные — в Plus.»
- **Search:** the haystack is entitlement-scoped (readable ideas only). It holds the card title, card description, `text.title`, oneLiner, category name, and the audience in ru only (spec 09 §5 #25). Tokens are AND-matched. The category filter is ANDed with the search.
- **Content parity against the app packs, 293 ideas × 5 locales:** `cards.json` equals `idea-cards.<L>.json`; ranks equal `facts.json`; category names equal `text.<L>.json`. All covers exist in 480/800/1200.
- **Paragraph reflow:** `paragraphs()` equals Swift `ClarityReading.paragraphs` for all 892 idea texts × 5 locales. I checked this with the Swift code compiled via `swiftc`.
- **Export text:**
  - The served POST for `interior-design-1` (ru, with the reference note) is **byte-identical** to `Documentation/LibraryRefresh-2026-09-20/example-export.txt` (33 164 bytes).
  - I ported `ClarityExportDocument` + `ClarityResearchFlow` + `QuoteReading` to Python and ran it over all 293 × 5 exports: 1 445 identical, 20 differ (m15).
  - Filenames (`inApp — <title ≤100 graphemes>.txt`, including the double dot) match 1 465/1 465.
  - The response carries `Content-Disposition` with `filename*` UTF-8 and `private, no-store`.
- **Card geometry:**
  - Surface, radius 24, shadow `0 6px 28px /.05`.
  - Art 3:2, r20 on all four corners.
  - Text block padding 20, gap 15: title Georgia 22/27, description Georgia 19/26.6 secondary, category 13/18 secondary +7.
  - Lock disc 45 px, surface, filled lock 17 accent, 16 px from the corner.
  - Locked cards are a `<button>` that opens the paywall and carry label + hint.
- **Article:**
  - Reading paper, 640 column, gutters 22, block gap 32, hero gap 18.
  - Title Georgia 30; lead Georgia 20/28.7 secondary.
  - Blocks 24 apart; h2 22/600 with +16 top.
  - Quote: 2 px line rule, 18 left, 8 vertical, Georgia 20/29.7.
  - Idea inset: accent-soft, r12, p20, 3 px accent bar inset 20 top and bottom, margin 4.
  - Toolbar: «Идея», bookmark, ⋯ «Действия с идеей» → «Записать мысль», «Скачать документ».
  - Note title = card title (spec 09 C18).
- **Locked gate:** paper background (not reading paper), art, then a `clarityCard` with «Идея доступна в Plus», the body text at 17/26 secondary, the primary capsule and the free-sample link, then «Моя заметка к материалу» with the editor titled «Идея в Plus». No bookmark.
- **Picker:** «Категория», trailing «Готово», «Все категории» always first, collator sort, substring filter, ink checkmark, selecting a row closes the sheet, and the filter resets on every open.

Reproduction scripts (temporary, outside the repo): `/tmp/ia-review/app_export.py` (Python port of the app export), `/tmp/ia-review/web-all.ts`, `/tmp/ia-review/swift/{reflow,search}.swift`.
