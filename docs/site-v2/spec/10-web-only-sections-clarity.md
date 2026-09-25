<!-- Copied from the redesign working file on 2026-09-25 so the "spec §N" references in the code
     (features/rating, features/reviews, features/mcp, content/rating*, scripts/v2/import-rating.ts)
     resolve. The answers to §10 «Open questions» are in ../DECISIONS.md «Web-only sections». -->

# inApp site v2: redesign spec for Rating, Review archive and MCP in the Clarity style (revised)

> **Rating: superseded by spec 11 (`11-rating-rich.md`, 2026-09-25)** — §1.1 #3/#4/#6/#7, R2–R4, R6,
> R7, R9 (method sheet), R11, §3, rating rows of §8–§10. The review archive and MCP keep this spec
> and their access rules.

**Repos and path conventions**
- **Web** = `/Users/artsaverin/projects/badcomment-sections`. Web paths below are relative to it.
- **App** = `/Users/artsaverin/projects/app_04_inapp`.
  - Bare Swift file names such as `ClarityRatings.swift:105` are in `Inapp/Clarity/`.
  - `Studio/…` is in `Inapp/Studio/`.
  - `Documentation/…` and `InappUITests/…` are relative to the app root.

**Rule:** check the design against the Swift code. Every value below comes from one of three places: the Swift code, the existing web tokens, or the existing web ports. Anything that exists only on the web is labelled **web-only**.

---

## 1. Principles

### 1.1 Why the current rating does not look like inApp, worst first
1. **Shadowed "idea card" chrome on every item.** The catalogue uses `<Card variant="idea">` (features/rating/RatingCatalog.tsx:65). App items use `.ia-rt-app` (rating.css:240-251): radius 24, `0 6px 28px rgb(0 0 0/.05)`, 0.7 px stroke. Clarity rating screens use only `clarityCard`: padding 22, radius 20, a 0.5 pt stroke of line at 55 %, **no shadow** (ClarityStyle.swift:105-110).
2. **Colour.** The web uses:
   - an accent score pill (rating.css:291-313);
   - green/amber/red "mismatch" dots, with a non-token `--ia-rt-warn #9a5b00 / #f2c261` (rating.css:6-17, 40-64);
   - green/red thumbs icons (rating.css:533-538);
   - accent eyebrows (rating.css:33-38).

   Clarity ratings are monochrome: numbers in ink, captions in secondary (ClarityRatings.swift:410-414). Praise and complaints are identical neutral cards (:267-269).
3. **Store artwork.** The web shows `AppIcon` at 34, 56 and 72 px, and screenshot strips at 260 and 360 px (rating.css:373-424). Clarity never draws them. `Documentation/Studio/MECHANICS-REDESIGN.md:68` records that third-party icons, screenshots, aggregate ratings and `realScore` were removed.
4. **Layout.** The web uses a 2–3 column grid (`rating/page.tsx:58`, `ia-page--grid`). The app uses one 680 column (ClarityRatings.swift:105).
5. **Serif where Clarity uses SF.**
   - Georgia 22 niche titles (rating.css:110-118)
   - Georgia 17 verdict (318-325)
   - Georgia 19 lead (179-186)
   - Georgia 20 «Кому подходит» (552-559)
6. **Density.** Each list item is a full dossier (`[slug]/page.tsx:66-141`). The app row has only a title, a score and a 3-line summary (ClarityRatings.swift:396-423).
7. **Stat tiles** (rating.css:187-215). Clarity has none.
8. **Voice.** The web says «Народный рейтинг», «наш балл», «витринная звезда», «На что злятся» (features/rating/strings.ts:11-13, 26, 42, 57, 70). The app's own keys are already translated in `content/v2/{ru,en,de,fr,ja}/ui.json`. All 76 app keys used below are present in all five packs (755 keys per pack, checked).

### 1.2 Rules
- **R1. Swift is the spec.**
  - The rating follows ClarityRatings.swift:
    - catalogue :67-123
    - category :144-232
    - app :234-333
    - scenario :335-394
    - method sheet :444-472
  - Only ClarityAppView is reachable in the release app: `.ratings` and `.scenario` open research (ClarityRoot.swift:134-136). The dormant screens are still the only Clarity rating design.
  - Reviews and MCP have no Swift screen. Build them only from the blocks in §2.
- **R2. One column.** Page container is `ia-page ia-page--catalog ia-page--stack` (680 + 2×20).
  - Gap 20 on catalogue and list pages (:79, 166).
  - Gap 24 on detail pages and sheets (`ia-page--stack-24`; :256, 354, 450).
  - Page H1s are fixed Georgia 30/34 (`ia-heading--fixed`; ClarityReadingStyle.swift:12).
- **R3. Flat.**
  - The only card is `.ia-card--utility`.
  - Grouped lists use the Settings or Saved box (no stroke, no shadow).
  - No press scale. `.buttonStyle(.plain)` only dims the label (:99, 217), so never pass `interactive`.
- **R4. Monochrome.** Ink and secondary on surface or paper. Accent is used only for:
  - interactive text: «Назад» on non-reader screens (root `.tint(ClarityStyle.accent)`, ClarityRoot.swift:89), the sort trigger, toggles, text buttons;
  - selected chips;
  - focus rings;
  - the Plus band.

  No green, amber or red. The one exception is the destructive button inside a confirmation dialog, which uses the existing `.ia-lib-confirm__discard`. ★ appears only as a text glyph.
- **R5. Type scale only.**
  - Georgia:
    - 30/34 H1
    - 19/26.6 subtitle
    - 20/29.7 quotes
  - SF:
    - 22/28 **700** section titles (`.title2.weight(.bold)`, :90, 174, 196, 302, 311, 363, 368)
    - 17/22 600 row titles
    - 17/27 prose (body + lineSpacing 5, :264, 303, 365)
    - 15/20 summaries
    - 13/18 footnotes
    - 12/16 caption
    - 11/13 score unit
- **R6. No eyebrows or kickers.** Context goes into the Heading subtitle (:258, 356-357).
- **R7. Numbers.**
  - Each item gets one hero number, 700 ink, with a secondary unit.
  - Aggregate counts go into one 13/18 sentence joined with « · », or into the method sheet.
  - No tiles (Documentation/PulseDemand-2026-09-24/SPEC.md:59, 85-86).
- **R8. Links.**
  - Links between pages are ClarityRow cards: a 48 px tile, title, subtitle, no chevron, no «→» (:219-221, 278-280, 384-386).
  - Actions inside a page are accent text buttons without arrows (:187-190, 321-324).
  - Inline navigation links in a lock card use `.ia-rs-text-link` (ClarityContentAccess.swift:95-101).
- **R9. Honesty copy stays.** Keep the app's footnote disclaimers (:103, 281). The methodology goes in a sheet (:206-209).
- **R10. Visible copy uses `t()` app keys.** Web-only strings are allowed only for web-only elements, SEO meta and plural fixes (§7.2).
- **R11. Paid research content stays behind the gate.**
  - Quotes on the app page and the gap and app list on scenario pages are research content. Render them only when `viewer.canReadResearch(slug)` (site/access.ts:75), decided on the server.
  - Everyone else gets the research lock card.
  - The web research gate shows locked viewers only `{name, summary, cover}` (features/research/LockedPreview.tsx:10-12).

### 1.3 Invariants
- **URLs.**
  - `/<L>/rating`, `/<L>/rating/<niche>`, `/<L>/rating/<niche>/<app slug>`
  - the four `/reviews` routes, `/mcp`, `/mcp/connect`
  - The only new route is `/<L>/rating/<niche>/tasks/<n>` (§3.4).
  - The slug index stays keyed to the raw `set.apps` order (sitedata/rating.ts:121-136). Display sorting must never feed it, or the `-<id>` suffixes move.
- **Canonicals.**
  - `dataAlternates` (features/rating/seo.ts:9-12) stays. de/fr/ja canonicalise to en; alternates are ru, en and x-default.
  - The MCP page keeps `localeAlternates` (all five locales canonical).
- **JSON-LD.**
  - CollectionPage + ItemList (rating/page.tsx:59-92). `name` becomes `t("Рейтинги")`.
  - Niche ItemList of SoftwareApplication (`rating/[slug]/page.tsx:147-176`):
    - **`aggregateRating` is dropped from its items**, because the list does not show `ratingCount`;
    - `name` comes from `format(s.nicheMetaTitle, {name, count})`, not the deleted `nicheTitle`.
  - SoftwareApplication + aggregateRating on the app page (`[app]/page.tsx:100-134`), unchanged.
  - Dataset (reviews), WebPage + FAQPage (MCP), breadcrumbs.
- **Gates.**
  - Rating pages stay public (sitedata/rating.ts:11-12), except the R11 parts.
  - Reviews:
    - dating-apps is free; the rest needs `viewer.canReadReviews` (reviews/page.tsx:130, `reviews/[slug]/page.tsx:69`, `[slug]/[id]/page.tsx:70`);
    - review texts load only after the gate (`[id]/page.tsx:77-79`).
- **Data locale.** ru shows ru data. en/de/fr/ja show English data with `lang="en"` (`dataLang`, seo.ts:15-18) and `dataNote` for de/fr/ja. Localised niche names carry their own `nameLang` (§8).

### 1.4 Order of work
The steps are ordered so nothing ships in a half-migrated state.

1. **Tokens and shared primitives** (§2.2–2.3). All go in `site.css`/`ui`, not `rating.css`.
2. **Migrate Reviews, MCP and `/mcp/connect` off `rating.css` and `NavCard`** (§4, §5). Five files still import rating.css:
   - reviews/page.tsx:7
   - reviews/[slug]/page.tsx:9
   - reviews/[slug]/[id]/page.tsx:8
   - reviews/methodology/page.tsx:5
   - mcp/page.tsx:11 and mcp/connect/page.tsx:7

   These also use `ia-rt-*` classes:
   - ReviewNiches.tsx:43-52
   - ReviewApps.tsx:50-55
   - ReviewBrowser.tsx:219-220
   - ConnectScreen.tsx:35
   - mcp.css:22-29

   Change the smoke test in the same PR (§11, deploy.yml).
3. **Importer** (§8). It must land before the rating app page and the scenario pages, so they never show «Отдельные примеры … не включены» for the 1,842 apps that have quotes.
4. **Rating:** niche page, app page, catalogue with search API, method sheet, scenario pages. Then rewrite rating.css from scratch.
5. **Navigation** (§6).
6. **Deletions** (§9).

### 1.5 Deliberate web deviations (label them in code comments)
| Item | App | Web | Why |
|---|---|---|---|
| Page padding | 20 all round (:105) | 24 top / 32 bottom (`.ia-page`, site.css:174-178) | Same on every web tab |
| Scores | Live ClarityAppView shows none (UI test InappUITests/ClarityUITests.swift:960-961); dormant screens do | Shown on the niche list, search results and app page (§3.5.5, ClarityAppMetric :425-434 is unused in Swift) | SEO: visible `aggregateRating`; §10 Q1–Q2 |
| Gate | Whole category behind Plus (:147, 238, 339) | Public except R11 parts | Section exists for search traffic; §10 Q9 |
| Store decimal | «4.7» (`String(format:"%.1f")`, :411) | «4,7» via `Intl.NumberFormat` | Locale; §10 Q10 |
| Plurals | «1 приложений» (:97, 316, 461) | W1–W3 ru plurals; W2 in all locales | 976 apps have exactly one quote |
| « · об оценках», «В материале также упомянуты: » | leading/trailing space in ru only | trim + join with a space (no space for ja) | en/de/fr values lack the space |
| Search paging | lists every result (:117-121) | first 40, then «Показать остальные N» loads the rest | Payload |
| Accessibility layout | Dynamic Type accessibility sizes (:406) | container query ≤ 280 px | No Dynamic Type on the web |
| Press/hover | system `.plain` dimming | label opacity .55 on press, surface tint on hover, `.ia-btn--text:hover` underline (site.css:412) | No Swift values exist |
| Global «⋯» | tab roots have none (ClarityCatalogs.swift:85; ClarityMy.swift:81) | one «⋯» sections menu in the desktop bar (§6) | Web-only sections need an entry |
| Rows W5–W8, badge W9 | — | web-only cross-links | Archive and MCP are web-only |
| Review list `{n}★` | ClarityQuoteBlock ignores `rating` (ClarityReader.swift:870-888) | `{n}★` footnote per review | The archive filters by rating |
| Bookmark on app page | yes (:290-296) | no (no "app" kind in the web library) | §10 Q8 |
| Sheet width | 680 | 684 (`size="reading"`) | Existing sheet sizes |
| Glyphs | SF 21 medium / title2 | lucide 24, stroke 1.9 | lucide draws about 80 % of its box |

---

## 2. Tokens and blocks to reuse

### 2.1 Existing blocks: reuse by name, do not copy values
| Clarity block (Swift) | Web equivalent |
|---|---|
| ClarityBackground paper (ClarityStyle.swift:20-24) | `html/body var(--ia-paper)` |
| 680 column, padding 20 | `.ia-page.ia-page--catalog` (site.css:174-182) |
| ClarityHeading (:114-127) | `<Heading>` ui/Heading.tsx (`title: ReactNode` — put `lang` on an inner `<span>`), `.ia-heading*` site.css:251-280 |
| ClaritySearch (:129-146) | `<SearchField>` ui/SearchField.tsx |
| clarityCard (:105-112) | `<Card variant="utility">`, `.ia-card--utility` site.css:434-438 |
| ClarityButton | `<Button variant="primary">` |
| Text button | `<Button variant="text">` site.css:387-393. **It inherits 600 from `.ia-btn` (site.css:321)** and sets 15/20 accent. |
| Badge «Бесплатный разбор» (mint = accentSoft, ClarityStyle.swift:14) | `<Badge className>` (no `style` prop, ui/Badge.tsx:8-25) |
| Saved filter chips | `<Chip>/<ChipRow>` |
| Category pill + ClarityTopicPicker (ClarityCatalogs.swift:200-211, 244-273) | `.ia-ideas__pill` (ideas.css:135-166) + `CategoryPicker` (IdeasCatalog.tsx:180-243), promoted to shared in §2.3 P10 |
| Menu with a Picker (:196-203) | `<Menu>` ui/Menu.tsx (`triggerLabel`, `checked`, `icon`) + P9 |
| Sheet and «Готово» | `<Sheet>` (`bodyClassName`, `size`) + `<SheetAction tone emphasis>` ui/Sheet.tsx |
| Detail toolbar and «Назад» | `<DetailToolbar>`, `<BackButton className>` (ui/Toolbar.tsx:66-100, 153-171); accent = `ia-glass-pill--accent` (site.css:762-764) |
| Content-gate lock card (ClarityContentAccess.swift:86-104) | `.ia-rs-lock-card`, `__label`, `__body`, `.ia-rs-text-link` (research.css:505-545) |
| ClarityCatalogEmpty | `.ia-rs-empty*` research.css:101-114 (17/600 + 15/20, gap 8) |
| Settings group/box/row (ClaritySettings.swift:286-298, 320-332) | `.ia-set-group`, `.ia-set-group__title`, `.ia-set-box`, `.ia-set-row`, `.ia-set-row__icon/__text/__title/__sub/__trail` (settings.css:63-176) |
| Settings Plus card (ClaritySettings.swift:203-255) | `PlusCard` (settings/client.tsx:41-120), `.ia-set-plus*` (settings.css:211-290), `CheckCircleFill` (settings/CheckCircleFill.tsx) |
| Account rows + sign-out confirmation (ClarityAccountSection.swift:26-33, 118-131, 174-184) | `.ia-set-row` + `Sheet variant="dialog"` + `.ia-lib-confirm`, `.ia-lib-confirm__discard` (library/components.tsx:242-265; library.css:330-338) |
| Saved section and rows (ClarityMy.swift:220-231, 272-306) | `.ia-lib-section`, `__title` (17/600 + count 8 right), `.ia-lib-group`, `.ia-lib-row`, `__main`, `__glyph`, `__text`, `__title`, `__detail`, `__chevron` (13/2.5, SavedScreen.tsx:397) (library.css:36-175) |
| Article hero, section, text (ClarityReader.swift:731-800) | `.ia-rs-hero*`, `.ia-rs-section*`, `.ia-rs-text` (research.css:253-330) |
| Lock glyph beside a title (ClarityCatalogs.swift:121-126) | `<LockBadge variant="inline" label>` (ui/Badge.tsx) |

**Cross-feature styles.** Import the owning stylesheet in the page, as `rating/[slug]/page.tsx:10` does:
- `@/site/features/settings/settings.css`
- `…/library/library.css`
- `…/research/research.css`

Do not copy rules.

### 2.2 New tokens (tokens.css, after line 161)
```css
--ia-fs-caption2: 0.6875rem;  /* 11/13 score unit (ClarityRatings.swift:413) */
--ia-lh-caption2: 1.182;
--ia-lh-body-loose: 1.588;    /* 17/27 = body + lineSpacing 5 (ClarityRatings.swift:264, 303, 365) */
```

### 2.3 New shared primitives (src/site/ui + site.css `@layer components`)

**P0. Page stack and fixed heading.** Add after `.ia-page--library` (site.css:~185) and after the heading media query (site.css:268).
```css
.ia-page--stack{display:flex;flex-direction:column;gap:20px}      /* modifier: keeps .ia-page margin/padding */
.ia-page--stack-24{gap:24px}
@media (min-width:1024px){.ia-heading--fixed .ia-heading__title{font-size:var(--ia-fs-title)}} /* 30, no clamp (site.css:265-268) */
```
- Pass `className="ia-heading--fixed"` to every `<Heading>` on rating, reviews and MCP pages and in the method sheet.
- The reviews methodology uses `.ia-rs-hero` (reader) and keeps the clamp.

**P1. `Row`** (ClarityRow, ClarityStyle.swift:148-162) in `ui/Row.tsx`.
- Props: `{glyph: ReactNode, title: ReactNode, subtitle?: ReactNode, titleAs?: "span"|"h3", titleLang?, trailing?: ReactNode, children?: ReactNode}`.
- The glyph is lucide at size 24, strokeWidth 1.9, `aria-hidden`. Optically this matches SF 21 medium.
- `trailing` sits on the title line; `children` go under the subtitle.
```html
<span class="ia-row">
  <span class="ia-row__tile" aria-hidden="true">{glyph}</span>
  <span class="ia-row__text">
    <span class="ia-row__titleline"><{titleAs} class="ia-row__title" lang>{title}</…>{trailing}</span>
    [<span class="ia-row__subtitle">{subtitle}</span>]
    {children}
  </span>
</span>
```
```css
.ia-row{display:flex;align-items:center;gap:16px;padding-block:6px;color:var(--ia-ink)}
.ia-row__tile{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:var(--ia-radius-field);background:var(--ia-accent-soft);color:var(--ia-ink)}
.ia-row__text{display:flex;flex:1;flex-direction:column;gap:6px;min-width:0}
.ia-row__titleline{display:flex;align-items:baseline;gap:12px}
.ia-row__title{flex:1;min-width:0;margin:0;font:600 var(--ia-fs-headline)/var(--ia-lh-headline) var(--ia-font-sans);letter-spacing:-.025em;overflow-wrap:anywhere}
.ia-row__subtitle{font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);letter-spacing:-.015em;color:var(--ia-secondary)}
.ia-row__badge{margin-top:9px}   /* 6 gap + 9 = 15 = spacing 10 + padding.top 5 (ClarityCatalogs.swift:134-139) */
```
The glyph is ink on accent-soft: the tile is `lilac` = accentSoft (ClarityStyle.swift:15), and the glyph inherits ink. Card minimum height is 48 + 12 + 44 = 104.

**P2. `RowCard`** in ui/Row.tsx: `<Card variant="utility" href className="ia-row-card"><Row …/></Card>`. The whole card is one link. Do not pass `hrefLang` or `old`: `nicheTopicLink` only returns launch topics with `old:false` (sitedata/topics.ts:18-20).
```css
.ia-row-card{text-decoration:none;transition:background-color 150ms ease}
.ia-row-card:active>*{opacity:.55}
@media (hover:hover){.ia-row-card:hover{background:color-mix(in srgb,var(--ia-surface) 94%,var(--ia-ink))}}
.ia-row-card:focus-visible{outline:2px solid var(--ia-accent);outline-offset:2px}
```

**P3. Section head** (ClarityRatings.swift:89-93, a plain `HStack` that centres; :195, `.firstTextBaseline`).
```css
.ia-section-title--bold{font-weight:700}
.ia-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ia-section-head--baseline{align-items:baseline}
.ia-section-head__count{font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);font-variant-numeric:tabular-nums;color:var(--ia-secondary)}
```

**P4. `QuoteBlock`** (ClarityQuoteBlock, ClarityReader.swift:870-888) in `ui/QuoteBlock.tsx`.
- First hoist `QuoteOpeningGlyph` from features/ideas/IdeaArticle.tsx:84-91 into ui/icons.tsx as `QuoteOpeningIcon`, unchanged. It is the only filled SF `quote.opening` shape.
- IdeaArticle.tsx imports it from there. Research keeps its own markup in this change.
```html
<figure class="ia-quote"><QuoteOpeningIcon class="ia-quote__glyph"/><blockquote class="ia-quote__text" lang>…</blockquote></figure>
```
```css
.ia-quote{display:flex;flex-direction:column;gap:12px;margin:0}
.ia-quote__glyph{flex:none;color:var(--ia-secondary)}
.ia-quote__text{margin:0;font:400 var(--ia-fs-quote)/var(--ia-lh-quote) var(--ia-font-serif);font-synthesis:none;color:var(--ia-ink);overflow-wrap:break-word}
```
No app name and no stars: the app receives both and renders neither.

**P5. `Button variant="ink"`** («Открыть в App Store», ClarityRatings.swift:271-277). Add `"ink"` to `ButtonVariant` (ui/Button.tsx:13). next.config ignores TS errors, so do not rely on the build to catch a missing variant.
```css
.ia-btn--ink{width:100%;min-height:54px;padding:0 20px;border-radius:var(--ia-radius-pill);background:var(--ia-ink);color:var(--ia-paper)}  /* font: .ia-btn 600 17/22 */
.ia-btn--ink:active{opacity:.7}
@media (hover:hover){.ia-btn--ink:hover{background:color-mix(in srgb,var(--ia-ink) 86%,var(--ia-paper))}}
```

**P6. `EmptyCard`** (ClarityRatingsEmpty, :474-483) in `ui/EmptyCard.tsx`. Title is a `<p>`: in Swift it is not a header.
```html
<Card className="ia-empty-card"><SearchIcon size={24} strokeWidth={1.9} aria-hidden/><p class="ia-empty-card__title">…</p><p class="ia-empty-card__body">…</p></Card>
```
```css
.ia-empty-card{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.ia-empty-card>svg{color:var(--ia-secondary)}
.ia-empty-card__title{margin:0;font:700 var(--ia-fs-title2)/var(--ia-lh-title2) var(--ia-font-sans);letter-spacing:-.012em}
.ia-empty-card__body{margin:0;font:400 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);color:var(--ia-secondary)}
```

**P7. Utilities.** Tailwind preflight (site.css:9) already resets `ul`/`ol` margin, padding and list-style.
```css
.ia-footnote{margin:0;font:400 var(--ia-fs-footnote)/var(--ia-lh-footnote) var(--ia-font-sans);color:var(--ia-secondary)}
.ia-footnote--gap{margin-top:4px}                    /* :104 .padding(.top, 4) → 24 below the list */
.ia-stack{display:flex;flex-direction:column;gap:20px}
.ia-stack--24{gap:24px}
.ia-search-status{margin:0;font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);color:var(--ia-secondary)}
.ia-search-status:empty{display:none}
.ia-btn--text.ia-btn--flush{padding-inline:0;align-self:flex-start}
.ia-btn--text.ia-btn--body{font:500 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);letter-spacing:-.025em} /* .body.weight(.medium), :323 */
.ia-bullets{display:flex;flex-direction:column;gap:16px}
.ia-bullets li{position:relative;padding-left:17px;font:400 var(--ia-fs-body-serif)/var(--ia-lh-body-serif) var(--ia-font-serif);font-synthesis:none}
.ia-bullets li::before{content:"";position:absolute;left:0;top:10px;width:5px;height:5px;border-radius:50%;background:var(--ia-ink)} /* ClarityReader.swift:789-800 */
```
«Все задачи (N)» (`.subheadline.semibold`) is plain `variant="text"`, which is already 600 15/20.

**P8. `categoryGlyph(slug)`** in `ui/categoryGlyph.ts`. Exact port of `StudioStyle.categorySymbol` (Studio/StudioStyle.swift:45-56). It takes the first substring match, in this order:

| Slug contains | SF Symbol | lucide |
|---|---|---|
| photo \| image | photo.on.rectangle.angled | `Images` |
| calendar \| habit | calendar | `Calendar` |
| fitness \| run \| workout | figure.run | `PersonStanding` |
| money \| budget \| finance | creditcard | `CreditCard` |
| note \| writ | note.text | `NotebookText` |
| music \| audio | headphones | `Headphones` |
| sleep | moon.stars | `MoonStar` |
| food \| recipe \| nutrition | carrot | `Carrot` |
| learn \| flashcard \| language | graduationcap | `GraduationCap` |
| anything else | square.stack.3d.up | `Layers` |

Fixed glyphs, exported from ui/icons.tsx:
- `doc.text.magnifyingglass` → `FileSearch as SourceIcon`
- `info.circle` → `Info as InfoIcon`
- app → `AppWindow as AppWindowIcon`
- ratings → `ListOrdered as RatingIcon`

All of them exist in lucide-react 1.47.0 (checked). 53 of 72 niches get `Layers` (§10 Q5).

**P9. Sort trigger and ticked menu** (site.css, shared by rating and reviews):
```css
.ia-sort-btn{display:inline-flex;align-items:baseline;gap:6px;min-height:44px;padding:12px 0;border:0;background:none;color:var(--ia-accent);font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);letter-spacing:-.015em;cursor:pointer}
.ia-sort-btn svg{flex:none;align-self:center}   /* the text span sets the baseline, so «Порядок» aligns with «Приложения» */
.ia-menu-anchor--tick .ia-menu__item[aria-checked="true"]{color:var(--ia-ink);font-weight:400}
.ia-menu-anchor--tick .ia-menu__icon{color:var(--ia-ink)}
```
Usage:
```tsx
<Menu className="ia-menu-anchor--tick" align="end" label={t("Сортировка")} triggerLabel={t("Порядок")}
  triggerClassName="ia-sort-btn"
  trigger={<><FilterIcon size={18} strokeWidth={2} aria-hidden="true"/><span>{t("Порядок")}</span></>}
  items={options.map(o => ({label:o.label, checked:o.value===sort,
    icon: o.value===sort ? <CheckIcon size={17} strokeWidth={2.4}/> : <span/>, onSelect:()=>setSort(o.value)}))}/>
```
- There is no `{type:"label"}` row: the iOS Picker title is not shown inline (:198-201).
- `triggerLabel` keeps the accessible name equal to the visible «Порядок» (Menu.tsx:115).

**P10. Pill + picker sheet** (ClarityCatalogs.swift:206-211, 244-273).
- Move `.ia-ideas__pill*` (ideas.css:135-166) to site.css as `.ia-pill*`, and `.ia-picker*` (ideas.css:193-230) to site.css unchanged. Update IdeasCatalog.tsx:104 to `.ia-pill`.
- Extract `CategoryPicker` (IdeasCatalog.tsx:180-243) to `ui/PickerSheet.tsx`:
  - Props: `{open, onClose, title, searchPlaceholder, options:{value:string|null,label:string,lang?:string}[], selected, onSelect}`.
  - The "all" option is the first entry of `options`.
  - IdeasCatalog passes its current values, so its behaviour is unchanged.

---

## 3. Rating

> **Superseded by spec 11 (`11-rating-rich.md`, 2026-09-25)** — rich and free: icons and screenshots,
> visible ranks, leaders, public quotes and tasks, method on the page. Kept for history only.

### 3.0 Rating feature pieces (src/site/features/rating)

**`ScoreBlock`** (server-safe; ClarityRatings.swift:410-414):
```html
<span class="ia-rt-score"><span class="ia-rt-score__value">82</span><span class="ia-rt-score__unit">{t("из 100 · отзывы")}</span></span>
```
```css
.ia-rt-score{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:end}
.ia-rt-score__value{font:700 var(--ia-fs-title2)/var(--ia-lh-title2) var(--ia-font-sans);font-variant-numeric:tabular-nums;letter-spacing:-.012em;color:var(--ia-ink)}
.ia-rt-score__unit{font:400 var(--ia-fs-caption2)/var(--ia-lh-caption2) var(--ia-font-sans);color:var(--ia-secondary);white-space:nowrap}
```
- **Review mode:** `String(realScore)`, or «—»; unit `t("из 100 · отзывы")`.
- **Store mode:** `storeAvg` via `Intl.NumberFormat(INTL_LOCALE[L],{minimumFractionDigits:1,maximumFractionDigits:1})`, or «—»; unit `t("из 5 · магазин")`.
- No pill, no background, no colour. «—» never shows on current data (0 nulls, checked); keep the fallback anyway.

**`RatedAppRow`** (:396-423). Props: `{href, title, score?: {value, unit}, context?: {name, lang}, summary: string|null, summaryLang?}`.
```html
<li><Card variant="utility" href class="ia-row-card ia-rt-row">
  [<p class="ia-rt-row__context" lang>{niche}</p>]
  <span class="ia-rt-row__main"><h3 class="ia-rt-row__title">{title}</h3>[<ScoreBlock/>]</span>
  [<p class="ia-rt-row__summary" lang>{summary}</p>]
</Card></li>
```
```css
.ia-rt-row{display:flex;flex-direction:column;gap:12px;container-type:inline-size}
.ia-rt-row__context{margin:0;font:400 var(--ia-fs-caption)/var(--ia-lh-caption) var(--ia-font-sans);color:var(--ia-secondary)}
.ia-rt-row__main{display:flex;align-items:flex-start;gap:14px}
.ia-rt-row__title{flex:1;min-width:0;margin:0;font:600 var(--ia-fs-headline)/var(--ia-lh-headline) var(--ia-font-sans);letter-spacing:-.025em;overflow-wrap:anywhere}
.ia-rt-row__summary{margin:0;font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);letter-spacing:-.015em;color:var(--ia-secondary);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
@container (max-width:280px){.ia-rt-row__main{flex-direction:column;gap:12px}.ia-rt-score{align-items:flex-start}}
```
- `summary` is `readable(whoFor) ?? readable(verdict)` (:418-419).
- `readable` hides empty text and «Редакционный вывод уточняется.» (ClarityRatings.swift:18-22). It runs at build time (§8).

**Text styles:**
```css
.ia-rt-prose{margin:0;font:400 var(--ia-fs-body)/var(--ia-lh-body-loose) var(--ia-font-sans);letter-spacing:-.025em;color:var(--ia-ink);overflow-wrap:break-word}
.ia-rt-section{display:flex;flex-direction:column;gap:12px}          /* on the utility Card, :299-306 */
.ia-rt-verdict{display:flex;flex-direction:column;gap:10px}           /* :261 */
.ia-rt-proof{display:flex;flex-direction:column;gap:16px}             /* :310 */
.ia-rt-proof__more{display:flex;flex-direction:column;gap:16px}
.ia-rt-proof__empty{margin:0;font:400 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);color:var(--ia-secondary)}
```

**Search matching** (`matches.ts`, shared by the server and the client). Port of `StudioContent.matches` (Studio/StudioDomain.swift:79-82):
- Split the query on whitespace. Every token must be contained in at least one field.
- Fold both sides with `s.normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase(L)`. This is `localizedStandardContains`: case- and diacritic-insensitive.
- Title-first sort compares the **whole trimmed query** against the title (:34-35), then `Intl.Collator(L,{numeric:true,sensitivity:"base"})`.
- `normalizedTitle(s) = s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu,"")`. This is `CharacterSet.alphanumerics` (:41-42). Titles contain Cyrillic look-alike letters.

**rating.css** is rewritten from scratch. Its header cites ClarityRatings.swift and ClarityStyle.swift instead of «the app has no rating» (rating.css:1).

### 3.1 Catalogue: `/<L>/rating` (ClarityRatings.swift:67-123)
Markup, top to bottom:
1. `<DetailToolbar title={t("Рейтинги")} />`. This is the inline nav title (:108). No leading slot: this is a section root.
2. `<div class="ia-page ia-page--catalog ia-page--stack">`, which replaces `ia-page--grid ia-rt-page` (rating/page.tsx:58).
3. JSON-LD:
   - CollectionPage `name: t("Рейтинги")`.
   - ItemList order equals the rendered niche order.
   - Breadcrumb inApp › `t("Рейтинги")`.
4. `<Heading className="ia-heading--fixed" title={t("Выбери приложение")} subtitle={t("Посмотри, для чего его используют, что нравится людям и с какими трудностями они сталкиваются.")}/>` (:80). `s.metaTitle` stays in metadata only (§10 Q3).
5. dataNote (de/fr/ja): `<p class="ia-footnote">{s.dataNote}</p>`.
6. `RatingCatalog` (client, rewritten; wrapped in `I18nProvider strings={t.pick(RATING_UI_KEYS)}`):
   - **Search:** `<SearchField ref placeholder={t("Приложение или задача")} clearLabel={t("Очистить поиск")}/>` (:82).
     - When the query changes, scroll the field back into view if its top is above the viewport (:106).
   - **Status:** `<p class="ia-search-status" role="status" aria-live="polite">`. Empty in default mode; `t("Найдено приложений: %1$@",[t.number(total)])` in search mode.
   - **Default mode** (trimmed query empty):
     - `<div class="ia-section-head"><h2 id="rating-topics-title" class="ia-section-title ia-section-title--bold">{t("Выбери тему")}</h2><span class="ia-section-head__count">{t.number(n)}</span></div>` (:89-93).
     - `<ul id="rating-niches" class="ia-stack" aria-labelledby="rating-topics-title">`, one `RowCard` per niche (:94-101):
       - glyph `categoryGlyph(slug)`;
       - `titleAs="h3"`, title = niche name, `titleLang={nameLang}`;
       - subtitle: ru uses W1 (`counted("ru", count, s.nicheAppsWord)`); en/de/fr/ja use `t("%1$@ приложений в разборе",[t.number(count)])` (every niche has 10 or more apps, checked);
       - href `routes.ratingNiche(L, slug)`.
     - Order: alphabetical by displayed name with `Intl.Collator(L,{numeric:true,sensitivity:"base"})` (:71-74; §10 Q4).
   - **Search mode:**
     - Request: `GET /api/site/rating-search?l=<L>&q=<q>&offset=0&limit=40`. Debounce 200 ms, cancel with AbortController, keep the previous results on screen while loading.
     - Response: `{total, items:[{niche, nicheName, nicheLang, slug, title, realScore, summary, summaryLang}]}`.
     - Rows: `<ol class="ia-stack">` of `RatedAppRow` with `context={name: nicheName, lang: nicheLang}` and the review score.
     - If `total > shown`: `<Button variant="text" className="ia-btn--body ia-btn--flush">{t("Показать остальные %1$@",[t.number(total-shown)])}</Button>`. It requests `offset=<shown>&limit=all`, appends every remaining row, then removes itself.
     - No results: `<EmptyCard title={t("Пока не нашли")} body={t("Попробуй название приложения или тему: например, календарь, фото или привычки.")}/>` (:114-116).
7. Footnote, always shown: `<p class="ia-footnote ia-footnote--gap">{t("Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.")}</p>` (:103-104).

**Server search** (`searchRatingApps(L, q)` in sitedata/rating.ts):
- Walk niches alphabetically and apps in data order. Match fields `[title, nicheName, readable(whoFor)]` (:24-39), dedupe by app id, sort as in §3.0.
- Reads through the same reader as the pages, never files directly.
- Keeps an in-memory LRU of 200 entries keyed `${dataLocale}:${foldedQuery}` holding the full sorted list.
- Truncates `summary` to 280 characters at a word boundary; CSS clamps it to 3 lines.

**Route** `src/app/api/site/rating-search/route.ts`:
- 400 unless `isLocale(l)` and `q.trim()` is non-empty.
- `q` is cut to 80 characters.
- `limit` is `40` or `all`.
- Headers `{"Cache-Control":"public, max-age=300","X-Robots-Tag":"noindex"}`, as in api/site/plus/offer/route.ts:19. nginx has no proxy cache, so `s-maxage` would do nothing.

**Removed:** grid, idea cards, the AppIcon row, blurb, «новое», and the count + chevron footer (`.ia-rt-card*`, rating.css:86-154). `listRatingNiches(L)` returns `{slug, name, nameLang, count}` and no longer computes `blurb`, `icons` or `isNew`. The `!blurb` skip at rating.ts:209-210 is a no-op: all 72 sets have blurbs, and the niche scope is `usable()` → 71.

### 3.2 Niche: `/<L>/rating/<niche>` (ClarityRatings.swift:144-232)
1. **JSON-LD:**
   - ItemList `name: format(s.nicheMetaTitle,{name: seoName-or-lowercased, count})`, reusing `nicheName()` from the current page (`[slug]/page.tsx:27-31`).
   - Items `{"@type":"SoftwareApplication", name, url, applicationCategory, operatingSystem}` with **no `aggregateRating`**.
   - Positions follow the default sort: `realScore` descending, missing scores last, ties by title (:134-141).
   - Breadcrumb inApp › `t("Рейтинги")` › niche.
2. **Toolbar:** `<DetailToolbar leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={routes.rating(L)}/>} title={t("Рейтинг")}/>` (:228), without `revealTitle`.
3. **Container:** `ia-page ia-page--catalog ia-page--stack` (gap 20, :166).
4. **Heading:** `<Heading className="ia-heading--fixed" title={<span lang={nameLang}>{name}</span>} subtitle={t("Выбери по своей задаче или сравни приложения из исследованной выборки.")}/>` (:167).
5. **dataNote** footnote (de/fr/ja).
6. **`RatingNicheBrowser`** (client). Props:
   - `apps[{slug, title, realScore, storeAvg, summary, whoFor}]` in data order;
   - `scenarios[{n, job}]` (readable only);
   - `method{count, totalReviews}`;
   - `dataLang`.

   Contents:
   - **a. Scenario card** (:170-193). Shown only if at least one job is readable **and** the query is blank.
     ```html
     <Card as="section" class="ia-rt-tasks" aria-labelledby="rating-tasks-title">
       <h2 id="rating-tasks-title" class="ia-section-title ia-section-title--bold">{t("Для чего тебе приложение?")}</h2>
       <ul id="rating-tasks-list" class="ia-rt-tasks__list">
         <li [hidden]><Link class="ia-rt-task" href={routes.ratingTask(L,niche,n)}><span lang>{job}</span></Link></li>…
       </ul>
       [<Button variant="text" class="ia-btn--flush" aria-expanded aria-controls="rating-tasks-list">{t("Все задачи (%1$@)",[N])} | {t("Свернуть")}</Button>]
     </Card>
     ```
     ```css
     .ia-rt-tasks{display:flex;flex-direction:column;gap:16px}
     .ia-rt-tasks__list{display:flex;flex-direction:column;gap:16px}
     .ia-rt-tasks__list li:not([hidden])+li:not([hidden]){padding-top:16px;border-top:var(--ia-hairline) solid var(--ia-line)} /* Divider(), :184 */
     .ia-rt-task{display:flex;align-items:center;min-height:48px;color:var(--ia-ink);text-decoration:none;font:500 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);letter-spacing:-.025em}
     .ia-rt-task span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
     .ia-rt-task:active span{opacity:.55}
     ```
     - `N` counts **readable** jobs only (:170, 187).
     - All rows are server-rendered. Rows 4 and later carry `hidden` until the card is expanded, so the links stay crawlable.
     - The toggle appears only when N > 3. It is 600 15/20 accent, min-height 44.
   - **b. Search:** `<SearchField placeholder={t("Найти в этой теме")}/>` (:194). Filters with `matches(query, [title, whoFor])` (:210-212). Scroll the field into view on change (:227).
   - **c. Head** (:195-205): `<div class="ia-section-head ia-section-head--baseline"><h2 id="rating-apps-title" class="ia-section-title ia-section-title--bold">{t("Приложения")}</h2>` + the P9 menu with options `review` `t("По оценке отзывов")`, `store` `t("По оценке в магазине")`, `name` `t("По названию")`.
   - **d. Method link** (:206-209):
     - Markup: `<button type="button" class="ia-rt-method-link" aria-haspopup="dialog"><InfoIcon size={15} strokeWidth={2} aria-hidden/><span>{sortTitle + " " + t(" · об оценках").trim()}</span></button>`, e.g. «По оценке отзывов · об оценках».
     - Style: `.ia-rt-method-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0;border:0;background:none;align-self:flex-start;color:var(--ia-secondary);font:400 var(--ia-fs-footnote)/var(--ia-lh-footnote) var(--ia-font-sans);cursor:pointer}`; on hover (hover-capable only) the colour becomes ink.
     - Opens the §3.3 sheet.
   - **e. Empty:** `<EmptyCard title={t("Нет подходящих результатов")} body={t("Попробуй другое название или очисти поиск.")}/>` (:213).
   - **f. List:** `<ol id="rating-apps" class="ia-stack" aria-labelledby="rating-apps-title">` of `RatedAppRow` without context.
     - The score follows the sort: store shows /5; review and name show /100 (:214-218).
     - All 100 or fewer apps are server-rendered in review order.
7. **Research row:** `RowCard` with `SourceIcon`, `t("Изучить весь разбор")` / `t("Задачи людей, сильные стороны продуктов и нерешённые проблемы")` → `nicheTopicLink(L,slug).href` (:219-221). Omitted when there is no topic (non-launch niches).
8. **Web-only row W6:** `RowCard` with `ReviewsIcon`, `reviewsStrings.nicheReviewsTitle` / `nicheReviewsBody` → `routes.reviewsNiche(L,slug)`, only if `hasReviewCorpus(slug)`.
9. **Removed:**
   - the eyebrow «Народный рейтинг» and `nicheLead`;
   - the stats tiles (`[slug]/page.tsx:213-224`) and «Как считаем» (:226-229);
   - `AppCard` (:66-141) and the big `NavCard` (:237-239).

### 3.3 Method sheet (ClarityRatings.swift:444-472)
`RatingMethodSheet` (client):
```tsx
<Sheet open onClose title={t("Об оценках")} size="reading" paper="paper" bodyClassName="ia-rt-method-body"
       trailing={<SheetAction tone="accent" emphasis="strong" onClick={close}>{t("Готово")}</SheetAction>}>
```
```css
.ia-sheet__body.ia-rt-method-body{padding:20px;display:flex;flex-direction:column;gap:24px}  /* replaces 4/22/24 (site.css:1012-1020); Swift .padding(20), :466 */
.ia-rt-method-card{display:flex;flex-direction:column;gap:12px}
.ia-rt-method-card p{margin:0;font:400 var(--ia-fs-body)/var(--ia-lh-body) var(--ia-font-sans);color:var(--ia-ink)}
```
Body, in order:
1. `<Heading level={2} className="ia-heading--fixed" title={t("Две оценки — два источника")} subtitle={t("Они помогают сравнивать приложения, но не заменяют проверку своей задачи.")}/>`
2. `<Card className="ia-rt-method-card"><h3 class="ia-subheading">{t("Оценка отзывов · до 100")}</h3><p>{t("Сохранённый балл из исследования inApp по текстам отзывов. Это общая оценка приложения в архиве, а не балл надёжности конкретной функции.")}</p></Card>`
3. The same card with `t("Оценка магазина · до 5")` / `t("Оценка со страницы приложения на момент сбора данных. Текущая оценка и версия могут отличаться.")`
4. `<p class="ia-search-status">`:
   - ru: W3, `format(s.methodCounts,{apps: counted("ru",count,s.appsWord), reviews: counted("ru",totalReviews,s.methodReviewsWord)})`;
   - others: `t("В архивной выборке этой темы: %1$@ приложений и %2$@ прочитанных отзывов. Это общий объём исследования, не число отзывов у каждого приложения.",[t.number(count), t.number(totalReviews)])`.
5. `<p class="ia-search-status">{t("Разница между оценками не доказывает накрутку. Дата расчёта и полная методика балла не включены в мобильный архив. Сравнивай описания задач и исходные цитаты, а условия проверяй в текущей версии.")}</p>`

The sheet replaces «Как считаем» and the app page's «Про оценку в App Store».

### 3.4 Scenario: `/<L>/rating/<niche>/tasks/<n>` (new; ClarityRatings.swift:335-394)
- **Route:** `src/app/(site)/site/[lang]/rating/[slug]/tasks/[n]/page.tsx`, plus `routes.ratingTask(l, niche, n) = href(l,"rating",niche,"tasks",String(n))`.
  - The static `tasks` segment wins over `[app]`. No app slug equals `tasks` (checked).
  - Guard in `slugIndex` (rating.ts:127): `if (slug === "tasks") slug = \`tasks-${app.id}\``.
  - decide.ts already rewrites any depth under `/rating`.
- **`n`:**
  - `/^[1-9]\d{0,2}$/`, a 1-based index into the full `scenarios` of the data locale.
  - ru and en orders line up (0 of 157 differ, checked).
  - `notFound()` if the index is out of range or the job is not readable.
  - For en/de/fr/ja, a non-launch niche has no scenarios, so these routes return 404.
- **Container:** `ia-page ia-page--catalog ia-page--stack ia-page--stack-24` (:354). Elements:
  1. `<DetailToolbar leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={routes.ratingNiche(L,slug)}/>} title={t("Выбор по задаче")}/>` (:392)
  2. `<Heading className="ia-heading--fixed" title={<span lang={dataLang}>{job}</span>} subtitle={<span lang={nameLang}>{name}</span>}/>`. No fallback title: unreadable jobs 404.
  3. If the segment name is readable: `<p class="ia-search-status" lang>{segmentName}</p>` (:358-360).
  4. **If `viewer.canReadResearch(slug)`:**
     - gap (if readable): `<Card as="section" class="ia-rt-section"><h2 class="ia-section-title ia-section-title--bold">{t("Что проверить перед выбором")}</h2><p class="ia-rt-prose" lang>{gap}</p></Card>` (:361-366)
     - `<h2 class="ia-section-title ia-section-title--bold">{t("Какими приложениями пользуются")}</h2>` (:368)
     - `<p class="ia-search-status">{t("Эти приложения упомянуты в разборе этой задачи. Открой каждое, чтобы сравнить сильные стороны и ограничения. Порядок списка не означает рейтинг пригодности.")}</p>` (:369-370)
     - no apps: `<EmptyCard title={t("Пока нет связанных карточек")} body={t("В исследовании есть описание задачи, но недостаточно данных для списка подходящих приложений.")}/>`
     - `<ol class="ia-stack ia-stack--24">` of `RatedAppRow` without a score, in `appIds` order (rows are direct children of the 24-spaced VStack, :374-378)
     - unmatched names: `<p class="ia-footnote">{t("В материале также упомянуты: ").trim() + sep + unmatched.join(", ") + t(". Отдельных карточек в этой подборке нет.")}</p>`, where `sep` is `" "`, or `""` for ja (:379-383)
  5. **Else:** the research lock card (the ClarityContentAccess.swift:86-104 pattern):
     ```html
     <Card class="ia-rs-lock-card">
       <p class="ia-rs-lock-card__label"><LockIcon 17/2 aria-hidden/>{t("Полный материал в Plus")}</p>
       <p class="ia-rs-lock-card__body">{t("Все разборы и идеи — в одной подписке.")}</p>
       <PlusButton source="rating_scenario_locked" variant="primary" label={t("Открыть все материалы")}/>
       <Link class="ia-rs-text-link" href={routes.topic(L, FREE_CATEGORY)}>{t("Сначала прочитать бесплатный разбор")}</Link>
     </Card>
     ```
  6. `RowCard` with `SourceIcon`, `t("Откуда взят этот разбор")` / `t("Прочитать исследование и наблюдения из отзывов")` → `nicheTopicLink` (:384-386). Omitted for non-launch niches.
- **SEO:**
  - `robots: {index:false, follow:true}`. Not in the sitemap (§10 Q7).
  - Title: `clampTitle(job, L)`, a new helper in features/rating/seo.ts that cuts at a word boundary so that `displayWidth(title) + BRAND_WIDTH ≤ TITLE_BUDGET` (65; research/seo.ts:45-57).
  - Description: `clampDescription(gap ?? job, L)`.
  - JSON-LD: breadcrumb only (inApp › Рейтинги › niche › job).
  - Alternates: `dataAlternates(L, path, {en: isLaunchCategory(slug)})`, extended so that non-launch niches list only `ru`.

### 3.5 App: `/<L>/rating/<niche>/<app>` (ClarityRatings.swift:234-333)
Container `ia-page ia-page--catalog ia-page--stack ia-page--stack-24` (:256). Top to bottom:
1. **JSON-LD:** unchanged, with SoftwareApplication + aggregateRating from `storeAvg`/`ratings`. No `image`: icon rights are not established (MECHANICS-REDESIGN.md:68).
2. **Toolbar:** `<DetailToolbar leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={nicheHref}/>} title={t("Приложение")}/>` (:289).
   - No `revealTitle`.
   - Trailing slot stays empty. Swift has a bookmark at :290-296, but the web library has no app kind (§10 Q8).
3. **Heading:** `<Heading className="ia-heading--fixed" title={app.title} subtitle={<span lang={nameLang}>{name}</span>}/>` (:258).
4. **dataNote** (de/fr/ja).
5. **Metrics (web-only, ClarityAppMetric :425-434):**
   ```html
   <ul class="ia-rt-metrics">
     <li><span class="ia-rt-metric__value">82</span><span class="ia-rt-metric__label">{t("из 100 · отзывы")}</span></li>
     <li><span class="ia-rt-metric__value">4,7</span><span class="ia-rt-metric__label">{t("из 5 · магазин")}</span></li>
   </ul>
   [<p class="ia-footnote">W4 {format(s.ratingsNote,{count: counted(L, ratings, s.ratingsWord)})}</p>]
   ```
   ```css
   .ia-rt-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
   .ia-rt-metrics li{display:flex;flex-direction:column;gap:6px}
   .ia-rt-metric__value{font:700 var(--ia-fs-title2)/var(--ia-lh-title2) var(--ia-font-sans);font-variant-numeric:tabular-nums;color:var(--ia-ink)}
   .ia-rt-metric__label{font:400 var(--ia-fs-caption)/var(--ia-lh-caption) var(--ia-font-sans);color:var(--ia-secondary)}
   ```
   - This block is web-only. The live app asserts these labels are **absent** on this screen (InappUITests/ClarityUITests.swift:960-961). It exists only so that the JSON-LD `aggregateRating` is visible.
   - If §10 Q2 is "no numbers", delete the block **and** `aggregateRating`.
6. **Verdict** (:260-266), if readable:
   ```html
   <section class="ia-rt-verdict"><p class="ia-footnote">{t("Редакционный анализ сохранённых отзывов")}</p><p class="ia-rt-prose" lang>{verdict}</p></section>
   ```
7. **Three cards** (:267-269, 299-306), each `<Card as="section" class="ia-rt-section" aria-labelledby><h2 class="ia-section-title ia-section-title--bold">…</h2><p class="ia-rt-prose" lang>{one paragraph}</p></Card>`:
   - `t("Для каких задач используют")` ← whoFor
   - `t("Что хвалят в отзывах")` ← loved
   - `t("На что жалуются в отзывах")` ← weak

   Skip a card if its text is null. `points()` is removed.
8. **«Опыт пользователей»** (:308-327): `<section class="ia-rt-proof" aria-labelledby="rating-proof-title">` with h2 bold `t("Опыт пользователей")`.
   - **No quotes:** `<p class="ia-rt-proof__empty">{t("Отдельные примеры для этого приложения не включены в подборку.")}</p>`.
   - **Quotes, and `viewer.canReadResearch(slug)`** (`QuotesProof`, client):
     1. `<p class="ia-footnote">` W2: `format(s.quotesNote,{count: counted(L, n, s.quotesWord)})`.
     2. The first 3 as `<QuoteBlock lang={q.lang}>`.
     3. `<div class="ia-rt-proof__more" hidden>` with the rest (server-rendered).
     4. `<Button variant="text" className="ia-btn--body ia-btn--flush">{t("Показать остальные %1$@",[t.number(n-3)])}</Button>`. It expands one way, then removes itself and moves focus to the first revealed quote (:321-324).
   - **Quotes, locked:** the W2 footnote, then the lock card from §3.4 item 5 with `source="rating_app_locked"`. No quote text is sent.
   - If the rating content files are missing (dev before import), omit the whole section.
9. **App Store** (:271-277), numeric ids only:
   ```tsx
   <Button variant="ink" href={`https://apps.apple.com/app/id${id}`} external target="_blank" rel="noopener noreferrer">
     {t("Открыть в App Store")}<span className="sr-only"> {s.newTab}</span>
   </Button>
   ```
   Drop `/us/` (`[app]/page.tsx:152`), the external glyph and `appStoreLabel`. The visible text stays in the accessible name.
10. **Research row:** `RowCard` with `SourceIcon`, `t("Что можно улучшить в этой нише")` / `t("Читать исследование пользователей и продуктов")` → `nicheTopicLink` (:278-280).
11. **Web-only row W5:** `RowCard` with `ReviewsIcon`, `reviewsStrings.appReviewsTitle` / `appReviewsBody` → `routes.reviewsApp(L,niche,id)`, only when `hasReviews`.
12. **Footnote:** `<p class="ia-footnote">{t("Это материал из архива inApp. Перед установкой проверь текущие условия и возможности приложения в магазине.")}</p>` (:281-282).

The page calls `getViewer()` (`Promise.all` with `getT`), as reviews/[id]/page.tsx:66 does.

**Removed from `[app]/page.tsx`:**
- AppIcon 72, the «№ в нише» eyebrow, mismatch and the small store link (:141-160)
- the Georgia lead and tiles (:162-180)
- «Про оценку в App Store» (:182-192)
- eyebrows, thumbs lists and the accent whoFor panel (:194-239)
- screenshots and the three NavCards (:241-270)

---

## 4. Review archive
All four pages stop importing rating.css and NavCard, and import `research.css` (plus `library.css` on §4.2 and `ideas`-free site.css pills on §4.3). Detail toolbars use `BackButton className="ia-glass-pill--accent"`, except the methodology page, which is a reader: its Back stays ink.

### 4.1 `/<L>/reviews`
Container `ia-page ia-page--catalog ia-page--stack`, replacing `ia-page--grid ia-rt-page` (reviews/page.tsx:74).
1. JSON-LD Dataset: unchanged.
2. `<Heading className="ia-heading--fixed" title={s.title} subtitle={s.subtitle}/>`.
3. `<p class="ia-footnote">{summary}</p>`: the existing « · » line (:65-69).
4. dataNote.
5. The free-note sentence (:108-116) and the «→» methodology link (:117-123) are deleted.
6. `ReviewNiches` (client, rewritten). Props: `niches[{slug, href, name, nameLang, meta, locked, free}]`, where `locked = !viewer.canReadReviews(slug)` and `free = slug === FREE_REVIEW_NICHE`.
   - `SearchField` with `t("Найти категорию")`; status `.ia-search-status` with `t("Найдено: %1$@")`.
   - `.ia-section-head` with h2 bold `t("Выбери тему")` (id `review-topics-title`) and count.
   - `<ul id="review-niches" class="ia-stack" aria-labelledby>` of `RowCard`:
     - glyph `categoryGlyph(slug)`, `titleAs="h3"`, title name (`titleLang`);
     - subtitle `meta` («12 приложений · 3 400 отзывов»), 15/20;
     - `trailing={locked ? <LockBadge variant="inline" label={s.locked}/> : null}` (ClarityCatalogs.swift:121-126);
     - `children={free ? <Badge className="ia-row__badge">{s.freeBadge}</Badge> : null}`. W9 is shown to everyone, Plus included (:134 checks `isFree` only).
   - Empty: `<Card className="ia-rs-empty"><p class="ia-rs-empty__title">{t("Пока ничего не нашлось")}</p><p class="ia-rs-empty__body">{t("Попробуй название категории или более короткий запрос.")}</p></Card>`.
7. Last element: `RowCard` with `AboutIcon`, `s.methodology` / W10 `s.methodologyBody` → `routes.reviewsMethodology(L)`.

### 4.2 `/<L>/reviews/<niche>`
1. JSON-LD unchanged.
2. `<DetailToolbar leading={<BackButton …accent fallbackHref={routes.reviews(L)}/>} title={s.title}/>`, no reveal.
3. Container `ia-page ia-page--catalog ia-page--stack`.
4. `<Heading className="ia-heading--fixed" title={<span lang={nameLang}>{name}</span>}/>` without a subtitle, then `<p class="ia-footnote">{apps} · {reviews}</p>`. The eyebrow (:111) is removed.
5. dataNote.
6. **Open:** `ReviewApps` (Saved pattern, ClarityMy.swift:220-231, 272-306):
   - `SearchField` with `s.appSearch`, then status.
   - `<section class="ia-lib-section" aria-labelledby="review-apps-title"><h2 id="review-apps-title" class="ia-lib-section__title">{t("Приложения")}<span class="ia-lib-section__count">{n}</span></h2>`. Unchanged 17/600 with the count 8 to the right; no override.
   - `<ul id="review-apps" class="ia-lib-group">` with rows:
     ```html
     <li class="ia-lib-row"><Link class="ia-lib-row__main" href>
       <span class="ia-lib-row__glyph" aria-hidden><AppWindowIcon size={19} strokeWidth={2}/></span>
       <span class="ia-lib-row__text"><span class="ia-lib-row__title">{title}</span><span class="ia-lib-row__detail">{topics} · {reviews}</span></span>
       <ChevronRightIcon class="ia-lib-row__chevron" size={13} strokeWidth={2.5} aria-hidden/>
     </Link></li>
     ```
   - Empty: `.ia-rs-empty` as in §4.1.
7. **Locked:** the lock card, replacing `.ia-rv-lock` (:135-147):
   ```html
   <Card class="ia-rs-lock-card">
     <p class="ia-rs-lock-card__label"><LockIcon 17/2/>{s.lockTitle}</p>
     <p class="ia-rs-lock-card__body">{format(s.lockBody,{apps,reviews})}</p>
     <PlusButton source="reviews_locked" variant="primary" label={t("Открыть все материалы")}/>
     <Link class="ia-rs-text-link" href={routes.reviewsNiche(L,FREE)}>{format(s.lockSample,{free})}</Link>
   </Card>
   ```
8. **Rows**, replacing the NavCards (:150-163):
   - W8 `ratingStrings.nicheRatingTitle` / `nicheRatingBody` with `RatingIcon` → `routes.ratingNiche`, if `hasRatingNiche(slug)`;
   - `t("Изучить весь разбор")` / `t("Задачи людей, сильные стороны продуктов и нерешённые проблемы")` with `SourceIcon`, if there is a topic.

### 4.3 `/<L>/reviews/<niche>/<id>`
1. JSON-LD unchanged (`isAccessibleForFree` stays).
2. Toolbar: Back (accent) + `title={s.title}`.
3. `<Heading className="ia-heading--fixed" title={app.title} subtitle={<span lang={nameLang}>{niche}</span>}/>`. AppIcon 64 and the niche-link eyebrow (:116-129) are removed.
4. `<p class="ia-footnote">{reviews} · {topics}</p>`, then dataNote.
5. **Open:** `ReviewBrowser`:
   - `SearchField` with `s.textSearch`.
   - **Filters:** `<div class="ia-rv-controls">` (`display:flex;flex-wrap:wrap;gap:8px`).
     - Topic: `<button class="ia-pill" aria-haspopup="dialog"><span lang>{currentTopic ?? format(s.allTopics,{n})}</span><FilterIcon size={14} strokeWidth={2.2} aria-hidden/></button>` opens `PickerSheet`:
       - title `s.topicLabel`, search placeholder W12 `s.topicSearch`;
       - options: «all», then the concrete topics as `"{label} — {count}"`, then the general topics;
       - each option `lang={dataLang}`.
       - This matches the app pill: 15/500 ink on surface, 13×17, gap 8, glyph in ink (ClarityCatalogs.swift:206-211).
     - Rating: `<Menu className="ia-menu-anchor--tick" triggerClassName="ia-pill" label={s.ratingLabel} trigger={<><span>{stars ? `${stars}★` : s.allRatings}</span><FilterIcon 14/2.2/></>} items=[all, 1★…5★ with counts, checked + tick]/>`.
     - Sort: the P9 menu with `s.worstFirst`, `s.bestFirst`.
     - The native `<select>`s and `.ia-rv-sort` are removed.
   - **Head:** `<div class="ia-section-head ia-section-head--baseline"><h2 id="reviews-list-title" class="ia-section-title ia-section-title--bold">{s.listTitle}</h2><span class="ia-section-head__count" role="status">{counted(…)}</span></div>`. Loading and failure lines use `.ia-footnote`.
   - **List:** `<Card as="ol" variant="group" className="ia-rv-reviews">`, one review per `li.ia-rv-review`:
     ```html
     <li class="ia-rv-review"><figure class="ia-quote">
       <QuoteOpeningIcon class="ia-quote__glyph"/><blockquote class="ia-quote__text" lang="en">{text}</blockquote>
       <figcaption class="ia-rv-review__meta">
         <span class="ia-rv-stars"><span aria-hidden="true">{n}★</span><span class="sr-only">{format(s.stars,{n})}</span></span>
         {topics.map(<button class="ia-rv-topic[ --general]" aria-pressed lang>)}
       </figcaption></figure></li>
     ```
     ```css
     .ia-rv-review{position:relative;padding:20px 22px}
     .ia-rv-review+.ia-rv-review::before{content:"";position:absolute;top:0;left:22px;right:0;height:.5px;background:var(--ia-line-65)}  /* leading inset only */
     .ia-rv-review__meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
     .ia-rv-stars{font:400 var(--ia-fs-footnote)/var(--ia-lh-footnote) var(--ia-font-sans);font-variant-numeric:tabular-nums;color:var(--ia-secondary)}
     .ia-rv-topic{position:relative;padding:7px 12px;border:0;border-radius:var(--ia-radius-pill);background:var(--ia-soft);color:var(--ia-ink);font:600 var(--ia-fs-caption)/var(--ia-lh-caption) var(--ia-font-sans);cursor:pointer}
     .ia-rv-topic::after{content:"";position:absolute;inset:-8px -2px}
     .ia-rv-topic--general{background:none;box-shadow:inset 0 0 0 var(--ia-hairline) var(--ia-line);color:var(--ia-secondary)}
     .ia-rv-topic[aria-pressed="true"]{background:var(--ia-accent-soft);color:var(--ia-accent)}
     ```
     **Delete** `.ia-rv-reviews > li + li` (reviews.css:289); otherwise every row gets two dividers.
   - Empty: `.ia-rs-empty` with «Пока ничего не нашлось».
   - More: `<Button variant="text" className="ia-btn--body ia-btn--flush">{format(s.showMore,{n})}</Button>`. **Keep `s.showMore`** («Показать ещё — осталось {n}»): the button adds `PAGE*2` = 80 rows (ReviewBrowser.tsx:20, 259-262), not all of them. The secondary pill is removed.
6. **Locked:** the §4.2 lock card with `format(s.lockAppBody,{app,reviews})`.
7. **Last element:** RowCard W7 `ratingStrings.appRatingTitle` / `appRatingBody` with `RatingIcon` → `routes.ratingApp(L,slug,ratingSlug)`, if `ratingSlug` exists. It replaces the «→» link (:131-139).

### 4.4 `/<L>/reviews/methodology`
Reader pattern (ClarityReader.swift:731-800). `<article class="ia-page ia-page--reading ia-rv-method">` keeps its article gap 32. The toolbar keeps `revealTitle`, with an ink Back.
- **Hero:** `<header class="ia-rs-hero"><h1 class="ia-rs-hero__title">{m.title}</h1><p class="ia-rs-hero__desc">{m.lead}</p></header>` (Georgia 30 + Georgia 20/28.7 secondary, gap 18), then `<p class="ia-footnote">{format(m.version,{date})}</p>`. Remove `m.eyebrow`.
- **Sections:** `<section class="ia-rs-section"><h2 class="ia-rs-section__title">…</h2><div class="ia-rs-text"><p>…</p></div></section>`. Remove the «1. » to «4. » prefixes from `corpusTitle`, `layersTitle`, `readTitle` and `limitsTitle` in all five locales (methodology.ts:18, 33, 46, 59 and their equivalents).
- **Layers:** `<ul class="ia-stack">` of `<Card className="ia-rt-method-card">` with `<h3 class="ia-subheading">{title}</h3><p>{body}</p>`. This is the method-sheet pattern: 600 17/22 over 400 17/22 ink (ClarityRatings.swift:452-459). Style `.ia-rt-method-card` is defined once in site.css (not rating.css), because reviews uses it too. Remove the kickers.
- **Definitions:** keep `.ia-rv-defs` (Georgia 19 `dd`, the ArticleText voice).
- **Limits:** `<ul class="ia-bullets">`. Remove the «01» counters (reviews.css:432-451).
- **Check card:** `<Card className="ia-rt-method-card"><h2 class="ia-subheading">{m.checkTitle}</h2><p>{m.checkBody}</p><Link class="ia-rs-text-link" href={routes.reviews(L)}>{m.checkLink}</Link></Card>`, with no «→».

---

## 5. MCP (`/<L>/mcp`, `/<L>/mcp/connect`)
The page imports `settings.css`, `library.css` and `research.css`, and stops importing `rating.css`.

- **Container:** `ia-page ia-page--catalog ia-page--stack ia-page--stack-24`, replacing gap 40 (`.ia-mcp-page`, mcp.css:6-10).
- **Section helper** (mcp/page.tsx:73-95): drop `kicker`; render `<section class="ia-mcp-section" id aria-labelledby><h2 class="ia-section-title ia-section-title--bold" id>…</h2>{children}</section>` with `.ia-mcp-section{display:flex;flex-direction:column;gap:20px}`.

Elements:
1. JSON-LD WebPage + FAQPage: unchanged.
2. `<Heading className="ia-heading--fixed" title={s.title} subtitle={s.subtitle}/>`. Remove the «MCP» eyebrow (:156) and `s.whatIs` (:158); FAQ 1 already answers it.
3. **Counts:** `<p class="ia-footnote">{[counted(niches,s.nichesWord), counted(apps,s.appsWord), counted(reviews,s.reviewsReadWord), counted(tools,s.toolsWord)].join(" · ")}</p>`. It replaces the four tiles (:160-172).
4. The «Как подключить» rect button (:173-177) is removed. The install section keeps `id="install"`.
5. **Plus card:** move `PlusCard` from settings/client.tsx:41-120 to `src/site/features/plus/PlusCard.tsx`.
   - Props: `{title: string; body: string; source: string; art: {src; srcSet} | null; caption: "account" | "static"}`.
   - `useId()` for the title and caption ids.
   - Band: `inApp PLUS` 12/700, 0.8 tracking, accent. For Plus viewers, add `<span class="ia-set-plus__active"><CheckCircleFill size={12} knockout="var(--ia-accent-soft)" strokeWidth={2.4}/>{t("Активен")}</span>` (ClaritySettings.swift:212-213, 12/500).
   - Art: 112 px `WelcomeLibrary_v7` (:217-219). The MCP page gets it as settings/page.tsx:37 does (`manifest.art.WelcomeLibrary_v7`, `mediaSrc(art,224)`, `mediaSrcSet(art)`).
   - Title `var(--ia-font-serif-ui)` 600 22/28; text 15/23 secondary.
   - CTA for **everyone** (:236): `t("О моём Plus")` for Plus viewers, `t("Открыть Plus")` otherwise, plus `ArrowRightIcon`; rect, radius 14, min-height 48, 20 above.
   - Caption 12/16, centred, 10 below (:245-248):
     - `caption="account"` (Settings) keeps the `/api/me` fetch and its texts;
     - `caption="static"` (MCP) shows `t("Все разборы, идеи и экспорт")` to Plus viewers and `t("Один платёж. Без продления.")` to others, with no fetch.
   - MCP passes `title={s.plusTitle}`, `body={viewer.plus ? s.plusActive : format(s.plusBody,{sample})}`, `source="mcp_page"`.
   - This removes the green `--ia-success` line (:183-186) and `.ia-mcp-plus*` (mcp.css:38-65).
6. **«Что получает агент после подключения»** (`s.givesTitle`): `<ul class="ia-stack">` of three `RowCard`s, replacing the 3-column `.ia-mcp-gives` (mcp.css:84-114):
   - `ReviewsIcon`: `s.give1Title` / `s.give1Body` → `routes.reviews(L)`
   - `RatingIcon`: `s.give2Title` / `s.give2Body` → `routes.rating(L)`
   - `ResearchIcon`: `s.give3Title` / `s.give3Body` → `routes.research(L)`

   The bottom «→» links (:296-307) and `s.seeReviews`/`s.seeRating` are removed.
7. **Install** (`s.installTitle`, section `id="install"`), in `InstallPicker`:
   - `ChipRow`/`Chip` stay.
   - `<ol class="ia-stack ia-mcp-steps">` with `.ia-mcp-steps{counter-reset:step}` and `.ia-mcp-step{counter-increment:step}`.
   - `.ia-mcp-step__body{display:flex;flex-direction:column;gap:10px}`.
   - `.ia-mcp-step__title{margin:0;font:600 var(--ia-fs-headline)/var(--ia-lh-headline) var(--ia-font-sans)}` and `.ia-mcp-step__title::before{content:counter(step) ". "}`. The counter sits on the title (InstallPicker.tsx:103), not on the flex-column `li`.
   - `.ia-mcp-step__text{margin:0;font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);color:var(--ia-secondary)}`.
   - `.ia-mcp-code`: surface, radius 16, padding 14px 16px, 400 13/18 `ui-monospace`; copy button 44×44 with a secondary glyph.
   - Delete the circles (`.ia-mcp-step::before`, mcp.css:208-218).
   - Cursor: `Button variant="secondary" size="sm"`, kept.
   - Free tier: `<p class="ia-footnote">`, replacing `.ia-mcp-free` (mcp.css:282-291).
8. **Connections** (signed-in only; `s.connectionsTitle`). Pattern: ClarityAccountSection profile row + «Выйти» row + confirmation (ClarityAccountSection.swift:26-33, 118-131, 174-184). `<div class="ia-stack ia-mcp-conns">` (gap 12) with one `.ia-set-box` per connection:
   ```html
   <div class="ia-set-box">
     <div class="ia-set-row ia-set-row--info">
       <span class="ia-set-row__icon" aria-hidden><McpIcon size={19} strokeWidth={2}/></span>
       <span class="ia-set-row__text"><span class="ia-set-row__title">{clientName}</span><span class="ia-set-row__sub">{format(s.lastActive,{host,date})}</span></span>
     </div>
     <button type="button" class="ia-set-row" aria-haspopup="dialog" aria-label={format(s.disconnectLabel,{client})}>
       <span class="ia-set-row__icon" aria-hidden><DisconnectIcon size={19} strokeWidth={2}/></span><span class="ia-set-row__title">{s.disconnect}</span>
     </button>
   </div>
   ```
   - Settings.css additions: `.ia-set-row--info{align-items:flex-start;padding:14px 16px}`, `.ia-set-row--info .ia-set-row__text{gap:3px}`, `.ia-set-row--info .ia-set-row__sub{font:400 var(--ia-fs-caption)/var(--ia-lh-caption) var(--ia-font-sans);letter-spacing:0}`.
   - The button opens `<Sheet variant="dialog" history={false} title={format(s.disconnectConfirm,{client})}>` containing:
     - `<p class="ia-search-status">{s.disconnectConfirmBody}</p>`;
     - `<div class="ia-lib-confirm">` with `<Button variant="secondary" block className="ia-lib-confirm__discard" busy>{s.disconnect}</Button>` and `<Button variant="secondary" block>{t("Отмена")}</Button>`.
   - Empty state: `<p class="ia-search-status">{s.connectionsEmpty}</p>`.
9. **Example** (`s.exampleTitle`):
   - `<p class="ia-search-status">{exampleLead}</p>`.
   - `<ul class="ia-set-box ia-set-box--flush">` of `li.ia-set-row`: `<span class="ia-set-row__title" lang>{label}</span>` (400 17/22 ink) + `<span class="ia-set-row__trail ia-mcp-count">{count}</span>`, with `.ia-mcp-count{font:400 var(--ia-fs-subheadline)/var(--ia-lh-subheadline) var(--ia-font-sans);font-variant-numeric:tabular-nums}`.
   - Then `<Link class="ia-rs-text-link" href={routes.reviewsNiche(L,slug)}>{s.exampleLink}</Link>`, with no «→».
10. **Prompts** (`s.promptsTitle`): `<ul class="ia-set-box ia-set-box--flush">` of six `li.ia-set-row` (400 17/22 sans ink, padding 17/16, min-height 56). This removes the Georgia `.ia-mcp-prompt` (mcp.css:141-146).
11. **Tools** (`s.toolsTitle`), **server-rendered and always visible**. The deploy smoke test greps `list_niche_themes` (deploy.yml:229).
    - One `<div class="ia-set-group">` per group: `<h3 class="ia-set-group__title">{name}</h3>` (15/600 secondary, 4 px inset) + `<ul class="ia-set-box ia-set-box--flush">`.
    - Each row: `li.ia-set-row.ia-mcp-tool` with `<code>{name}</code><span>{line}</span>`, where `.ia-mcp-tool{flex-direction:column;align-items:flex-start;gap:4px;padding:14px 16px}`, `code` is 400 13/18 `ui-monospace` ink, and `span` is 15/20 secondary.
    - `s.toolsNote` goes in `.ia-footnote`.
12. **FAQ** (`s.faqTitle`), open info blocks (ClaritySettings.swift:312-325):
    - `<div class="ia-mcp-faq">` with `.ia-mcp-faq{display:flex;flex-direction:column;gap:28px}`.
    - Each block: `<div class="ia-mcp-faq__item">` (`display:flex;flex-direction:column;gap:10px`) with `<h3 class="ia-subheading">{q}</h3><p class="ia-mcp-faq__a">{a}</p>`, where `.ia-mcp-faq__a{margin:0;font:400 var(--ia-fs-body)/var(--ia-lh-body-relaxed) var(--ia-font-sans);color:var(--ia-secondary)}` (body + lineSpacing 4 = 17/26).
    - This removes the `<details>` accordion (mcp.css:314-352).

**Settings.css additions used above:**
```css
.ia-set-box--flush > * + *::before{left:16px}   /* rows without a glyph column (settings.css:88-97 hard-codes 56) */
li.ia-set-row{cursor:default}                  /* add to the div.ia-set-row rule, settings.css:124-126 */
```

**`/mcp/connect`:** ConnectScreen.tsx:35 drops the `ia-rt-eyebrow` «MCP». Keep the `Heading` (with `ia-heading--fixed`) and the primary button. Wrap in `ia-page--stack ia-page--stack-24`. connect/page.tsx:7 stops importing rating.css.

---

## 6. Navigation

**Verdict:** the section nav does not fit the app.
- The app's only navigation element is the tab bar (ClarityRoot.swift:58-75: Разборы · Идеи · Сохранённое · Пульс). There is no second level.
- `SectionLinks` put an accent-on-accent-soft current marker next to the tab capsule's own selected look (site.css:1841-1845).
- In the app, ratings are not a destination (ClarityRoot.swift:134; Documentation/Clarity/CONTRACT.md:17).

**Change (preferred):**
1. **TopNav.tsx:29-30:** remove `<SectionLinks/>` and `<SectionsMenu/>`. The desktop bar becomes logo · `TabCapsule` · App Store / «⋯» / language / account.
2. **SectionNav.tsx:**
   - export `sectionItems`;
   - add `export function SectionsMore()` = `<Menu label={s.sectionsMore} align="end" items={sectionItems(locale, s)}/>` (default `MoreIcon`, 38×44 `ia-icon-btn`; Menu.tsx:16-24);
   - render it in `.ia-topnav__end` before `LanguageMenu`;
   - `SECTION_ICON.rating` becomes `RatingIcon` (`ListOrdered`) instead of `StarIcon` (R4);
   - delete `SectionLinks` and `SectionsMenu`.
3. **Mobile:** keep `MobileMenu` (SectionNav.tsx:100-118). After merging v2, add `pulse` to `TAB_TITLE`/`TAB_ICON` (:35-36).
4. **Labels.** Keep the shell key `rating` (`sectionItems` and Footer.tsx:45 read it; «Рейтинги» is not in `SHELL_UI_KEYS`, i18n/builtin.ts:8-33). Change only its values, taken from ui.json «Рейтинги»:

   | Locale | Value |
   |---|---|
   | ru | «Рейтинги» |
   | en | «Ratings» (unchanged) |
   | de | «Bewertungen» |
   | fr | «Classements» |
   | ja | «評価一覧» |

   (shell/strings.ts:25, 49, 73, 97, 121). Reviews stays «Отзывы» and MCP stays «MCP».
5. **CSS:** delete only the `.ia-secnav*` rules (site.css:1806-1864). Keep the block comment's `@layer components {` opener (1798), `.ia-topnav__start` (1799-1805; TopNav.tsx:27 uses it), `.ia-mobile-header__end` (1865-1869) and `.ia-menu-btn` (1870-1874).
6. **Context entry points:**
   - ~~Research article → rating (W8)~~ — dropped (owner, 2026-09-25): the research article mirrors the app's article; rating, reviews and MCP stay out of it and out of the iOS app.
   - Rating niche → reviews (W6); rating app → reviews (W5).
   - Reviews → rating (W7, W8).
   - MCP → the three sections (§5.6).
7. **Current tab:** none on section pages (`tabOf` returns null, routing.ts:108). Depth comes from the Back pill.

**Fallback** (§10 Q14): keep `SectionLinks`, styled 500 15/20 secondary, min-height 44, with the current item in ink and **no** accent-soft pill.

---

## 7. Strings

### 7.1 App keys through `t()`
All of these are present in the five packs (checked). Client components receive them through `t.pick(RATING_UI_KEYS)` (features/rating/keys.ts) or `REVIEWS_UI_KEYS`.

| Where | ru key (verbatim) |
|---|---|
| Catalogue | «Рейтинги» · «Выбери приложение» · «Посмотри, для чего его используют, что нравится людям и с какими трудностями они сталкиваются.» · «Приложение или задача» · «Выбери тему» · «%1$@ приложений в разборе» (en/de/fr/ja; ru → W1) · «Найдено приложений: %1$@» · «Пока не нашли» · «Попробуй название приложения или тему: например, календарь, фото или привычки.» · «Показать остальные %1$@» · «Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.» · «Очистить поиск» |
| Niche | «Рейтинг» · «Назад» · «Выбери по своей задаче или сравни приложения из исследованной выборки.» · «Для чего тебе приложение?» · «Все задачи (%1$@)» · «Свернуть» · «Найти в этой теме» · «Приложения» · «Порядок» · «Сортировка» · «По оценке отзывов» · «По оценке в магазине» · «По названию» · « · об оценках» (trim, join with " ") · «из 100 · отзывы» · «из 5 · магазин» · «Нет подходящих результатов» · «Попробуй другое название или очисти поиск.» · «Изучить весь разбор» · «Задачи людей, сильные стороны продуктов и нерешённые проблемы» |
| Method sheet | «Об оценках» · «Готово» · «Две оценки — два источника» · «Они помогают сравнивать приложения, но не заменяют проверку своей задачи.» · «Оценка отзывов · до 100» · «Сохранённый балл из исследования inApp по текстам отзывов. Это общая оценка приложения в архиве, а не балл надёжности конкретной функции.» · «Оценка магазина · до 5» · «Оценка со страницы приложения на момент сбора данных. Текущая оценка и версия могут отличаться.» · «В архивной выборке этой темы: %1$@ приложений и %2$@ прочитанных отзывов. Это общий объём исследования, не число отзывов у каждого приложения.» (en/de/fr/ja; ru → W3) · «Разница между оценками не доказывает накрутку. Дата расчёта и полная методика балла не включены в мобильный архив. Сравнивай описания задач и исходные цитаты, а условия проверяй в текущей версии.» |
| App | «Приложение» · «Редакционный анализ сохранённых отзывов» · «Для каких задач используют» · «Что хвалят в отзывах» · «На что жалуются в отзывах» · «Опыт пользователей» · «Отдельные примеры для этого приложения не включены в подборку.» · «Показать остальные %1$@» · «Открыть в App Store» · «Что можно улучшить в этой нише» · «Читать исследование пользователей и продуктов» · «Это материал из архива inApp. Перед установкой проверь текущие условия и возможности приложения в магазине.» |
| Scenario | «Выбор по задаче» · «Что проверить перед выбором» · «Какими приложениями пользуются» · «Эти приложения упомянуты в разборе этой задачи. Открой каждое, чтобы сравнить сильные стороны и ограничения. Порядок списка не означает рейтинг пригодности.» · «Пока нет связанных карточек» · «В исследовании есть описание задачи, но недостаточно данных для списка подходящих приложений.» · «В материале также упомянуты: » (trim; join " ", ja "") · «. Отдельных карточек в этой подборке нет.» · «Откуда взят этот разбор» · «Прочитать исследование и наблюдения из отзывов» |
| Lock card (rating) | «Полный материал в Plus» · «Все разборы и идеи — в одной подписке.» · «Открыть все материалы» · «Сначала прочитать бесплатный разбор» |
| Reviews | «Найти категорию» · «Найдено: %1$@» · «Пока ничего не нашлось» · «Попробуй название категории или более короткий запрос.» · «Выбери тему» · «Приложения» · «Порядок» · «Сортировка» · «Открыть все материалы» · «Изучить весь разбор» · «Задачи людей, сильные стороны продуктов и нерешённые проблемы» · «Готово» · «Очистить поиск» |
| MCP | «Открыть Plus» · «О моём Plus» · «Активен» · «Один платёж. Без продления.» · «Все разборы, идеи и экспорт» · «Отмена» |

The W2 app key «%1$@ фрагментов из разбора. …» and the key «Задача пользователей» are no longer used on the web.

### 7.2 Web-only strings (informal ты/du/tu; Japanese です・ます)
Plural forms are `one|few|many|other`, used through `counted(L, n, forms)` (i18n/count.ts:24-28).

| Id | Key (file) | ru | en | de | fr | ja |
|---|---|---|---|---|---|---|
| W1 | `nicheAppsWord` (rating) | `приложение в разборе\|приложения в разборе\|приложений в разборе\|приложения в разборе` | "" (uses t) | "" | "" | "" |
| W2 | `quotesNote` (rating) | «{count}. Это отдельные случаи, а не оценка всех пользователей.» | «{count}. These are individual cases, not a verdict on all users.» | «{count}. Das sind Einzelfälle, kein Urteil über alle Nutzer.» | «{count}. Ce sont des cas individuels, pas un verdict sur tous les utilisateurs.» | «分析からの抜粋{count}。個別の事例であり、すべてのユーザーの評価ではありません。» |
| W2 | `quotesWord` (rating) | `фрагмент из разбора\|фрагмента из разбора\|фрагментов из разбора\|фрагмента из разбора` | `excerpt from the breakdown\|excerpts from the breakdown\|excerpts from the breakdown\|excerpts from the breakdown` | `Auszug aus der Analyse\|Auszüge aus der Analyse\|Auszüge aus der Analyse\|Auszüge aus der Analyse` | `extrait du décryptage\|extraits du décryptage\|extraits du décryptage\|extraits du décryptage` | `件` |
| W3 | `methodCounts` (rating) | «В архивной выборке этой темы: {apps} и {reviews}. Это общий объём исследования, не число отзывов у каждого приложения.» | "" (uses t) | "" | "" | "" |
| W3 | `methodReviewsWord` (rating) | `прочитанный отзыв\|прочитанных отзыва\|прочитанных отзывов\|прочитанного отзыва` | "" | "" | "" | "" |
| W4 | `ratingsNote` (rating), with existing `ratingsWord` | «{count} в App Store на момент сбора данных» | «{count} on the App Store when the data was collected» | «{count} im App Store zum Zeitpunkt der Erhebung» | «{count} sur l’App Store au moment de la collecte» | «App Storeの{count}（データ収集時点）» |
| W5 | `appReviewsTitle` / `appReviewsBody` (reviews) | «Все отзывы о приложении» / «Полные тексты, оценки и темы каждого отзыва» | «All reviews of this app» / «Full texts, ratings and topics of every review» | «Alle Rezensionen zu dieser App» / «Volltexte, Bewertungen und Themen jeder Rezension» | «Tous les avis sur cette app» / «Textes complets, notes et thèmes de chaque avis» | «このアプリのすべてのレビュー» / «各レビューの全文、評価、トピック» |
| W6 | `nicheReviewsTitle` / `nicheReviewsBody` (reviews) | «Отзывы этой темы» / «Полные тексты с оценками и темами каждого отзыва» | «Reviews in this topic» / «Full texts with the rating and topics of every review» | «Rezensionen in diesem Thema» / «Volltexte mit Bewertung und Themen jeder Rezension» | «Avis de ce thème» / «Textes complets avec la note et les thèmes de chaque avis» | «このテーマのレビュー» / «各レビューの全文、評価、トピック» |
| W7 | `appRatingTitle` / `appRatingBody` (rating) | «Оценка и разбор приложения» / «Оценка по отзывам, что хвалят и на что жалуются» | «The app’s score and breakdown» / «The review score, what people praise and what they complain about» | «Wert und Analyse der App» / «Wert aus Rezensionen, was gelobt und was bemängelt wird» | «Note et décryptage de l’app» / «La note des avis, ce qui est salué et ce qui est reproché» | «アプリのスコアと分析» / «レビュースコア、評価されている点と不満点» |
| W8 | `nicheRatingTitle` / `nicheRatingBody` (rating) | «Рейтинг приложений темы» / «Оценка по отзывам и оценка магазина для каждого приложения» | «App ratings in this topic» / «The review score and the store rating of every app» | «App-Bewertungen in diesem Thema» / «Wert aus Rezensionen und Store-Bewertung jeder App» | «Classement des apps du thème» / «La note des avis et la note de la boutique pour chaque app» | «このテーマのアプリ評価» / «各アプリのレビュースコアとストア評価» |
| W9 | `freeBadge` (reviews) | «Открыто бесплатно» | «Free to read» | «Kostenlos lesbar» | «En accès libre» | «無料公開» |
| W10 | `methodologyBody` (reviews) | «Корпус, темы и ограничения разметки» | «The corpus, the topics and the limits of the labels» | «Korpus, Themen und Grenzen der Kennzeichnung» | «Le corpus, les thèmes et les limites de l’annotation» | «コーパス、トピック、ラベル付けの限界» |
| W11 | `newTab` (rating) | «(откроется в новой вкладке)» | «(opens in a new tab)» | «(öffnet sich in einem neuen Tab)» | «(s’ouvre dans un nouvel onglet)» | «（新しいタブで開きます）» |
| W12 | `topicSearch` (reviews) | «Найти тему» | «Find a topic» | «Thema finden» | «Trouver un thème» | «トピックを探す» |
| W13 | `disconnectConfirm` (mcp) | «Отключить {client}?» | «Disconnect {client}?» | «{client} trennen?» | «Déconnecter {client} ?» | «{client}の接続を解除しますか？» |
| W13 | `disconnectConfirmBody` (mcp) | «Агент потеряет доступ к inApp. Подключить его снова можно в любой момент.» | «The agent will lose access to inApp. You can connect it again at any time.» | «Der Agent verliert den Zugriff auf inApp. Du kannst ihn jederzeit wieder verbinden.» | «L’agent perdra l’accès à inApp. Tu peux le reconnecter à tout moment.» | «エージェントはinAppにアクセスできなくなります。いつでも再接続できます。» |

The research article's W8 row reads `ratingStrings[L].nicheRatingTitle/Body`.

### 7.3 Rewritten existing web strings (app voice: «оценка в App Store», «тема»; no «Народный», «витринная звезда», «наш балл»)

| Key (features/rating/strings.ts) | ru | en | de | fr | ja |
|---|---|---|---|---|---|
| `metaTitle` | «Рейтинги приложений по отзывам» | «App ratings from real reviews» | «App-Bewertungen aus echten Rezensionen» | «Classements d’apps d’après de vrais avis» | «実際のレビューにもとづくアプリ評価一覧» |
| `metaDescription` | «До 100 приложений в каждой теме: оценка по текстам отзывов и оценка в App Store, для каких задач используют, что хвалят и на что жалуются.» | «Up to 100 apps in each topic: a score from review text and the App Store rating, what people use them for, what they praise and what they complain about.» | «Bis zu 100 Apps pro Thema: ein Wert aus den Rezensionstexten und die App-Store-Bewertung, wofür die Apps genutzt werden, was gelobt und was bemängelt wird.» | «Jusqu’à 100 apps par thème : une note tirée du texte des avis et la note de l’App Store, à quoi elles servent, ce qui est salué et ce qui est reproché.» | «各テーマ最大100アプリ。レビュー本文にもとづくスコアとApp Storeの評価、使われ方、評価されている点と不満点をまとめています。» |
| `nicheMetaDescription` ({apps},{name},{reviews}) | «{apps} в теме «{name}». Прочитано отзывов: {reviews}. Оценка по текстам отзывов, оценка в App Store и выводы по каждому приложению.» | «{apps} in {name}. Reviews read: {reviews}. A score from review text, the App Store rating and findings for every app.» | «{apps} im Thema {name}. Gelesene Rezensionen: {reviews}. Ein Wert aus den Rezensionstexten, die App-Store-Bewertung und Erkenntnisse zu jeder App.» | «{apps} dans le thème {name}. Avis lus : {reviews}. Une note tirée du texte des avis, la note de l’App Store et des conclusions pour chaque app.» | «{name}の{apps}。読んだレビュー：{reviews}件。レビュー本文にもとづくスコア、App Storeの評価、アプリごとの分析です。» |
| `appMetaDescription` ({app},{score},{star}) | «{app}: для каких задач используют, что хвалят и на что жалуются в отзывах. Оценка по отзывам — {score} из 100, в App Store — {star}.» | «{app}: what people use it for, what they praise and what they complain about in reviews. Review score: {score}/100; App Store rating: {star}.» | «{app}: wofür die App genutzt wird, was in Rezensionen gelobt und was bemängelt wird. Wert aus Rezensionen: {score}/100; App-Store-Bewertung: {star}.» | «{app} : à quoi elle sert, ce qui est salué et ce qui est reproché dans les avis. Note des avis : {score}/100 ; note sur l’App Store : {star}.» | «{app}の使われ方、レビューで評価されている点と不満点。レビュースコア：{score}/100、App Storeの評価：{star}。» |
| `dataNote` | "" | "" | «Die Texte zu den Apps sind auf Englisch.» | «Les textes sur les apps sont en anglais.» | «アプリについての本文は英語です。» |
| `appsWord` (fr only) | — | — | — | `app\|apps\|apps\|apps` | — |

- **Kept unchanged:** `nicheMetaTitle` and `appMetaTitle` (search head terms, §10 Q3), `appsWord`, `ratingsWord`.
- **Deleted** from `ratingStrings`: `title`, `listLabel`, `appsListLabel` (lists use `aria-labelledby`), `appStoreLabel`, and every key listed in §9.
- **`reviewsStrings`:** keep all content keys, **including `showMore`**. Remove the kicker keys, add W5, W6, W9, W10 and W12, and remove the «N. » prefixes from the four methodology section titles in all locales.
- **`mcpStrings`:** add W13.

---

## 8. Data plan
Rating texts exist only in ru in the app (`rich.ru.json`: 72 categories, 4,443 apps). `rich.en.json` has no `rating`. The data-locale rule and the canonicals therefore stay.

| Field | ru | en | de / fr / ja | Source |
|---|---|---|---|---|
| id, title, storeAvg, ratings, realScore, raw order | peoplesRating (0 differences from rich.ru over 4,443 apps) | same | same | `src/data/peoplesRating` |
| verdict, loved, weak, whoFor | rich.ru **after** `prepared()` editorial overrides (305 differ; 101 become «Редакционный вывод уточняется.» → null), then `tg()` + `neutralizeTrustLanguage(…,"ru")` | peoplesRating `app.en` + `capFirst` + `neutralizeTrustLanguage(…,"en")`. The 10 Cyrillic weight-tracker verdicts (ids 6499510249, 413313086, 578546778, 1001285466, 6511248415, 1515595647, 550932668, 552341639, 1576161548, 666822519) → null | = en | importer |
| niche name + nameLang | `text.ru` categories (51 of 72 differ from `set.name`), "ru" | `content/v2/en/catalog.json` for the 35 launch topics, else `nameEn`; "en" | own `catalog.json` for the 35 (nameLang = L), else `nameEn` ("en") | importer; the same name on reviews pages via `ratingNicheName(L, slug)` |
| seoName | peoplesRating `seoName` | — | — | unchanged |
| count, totalReviews | peoplesRating | same | same | unchanged |
| scenarios {n, name, job, gap, appIds, unmatched} | `rich.ru.dossiers[slug].audience.segments` (72 / 317), readable + `tg()` | `rich.en` (35 / 157) | = en | importer |
| quotes per app | `rich.ru` findings evidence, matched by `normalizedTitle` and deduped by quote text (:59-64): 1,842 apps, about 3,270 quotes. Text: `quote-translations.ru` → `evidence.translation` → original; `lang` = "ru" for the first two, "en" for the original | original, "en" | `quote-translations.<L>` (813 hits) → original "en". **Never** `evidence.translation`, which is Russian | importer, using rich.ru evidence for **every** locale (rich.en has only 35 categories) |
| authNote, authenticity, shots, icon, inflated | not imported | — | — | — |

**Importer** (`scripts/v2/import-app-content.ts`):
- Add `SrcDossier.rating` and `.audience.segments`.
- `loadLocale` (:697-712) already produces a `prepared()` ru rich pack (:560-572), whose `isApp` rule keeps `title` verbatim. Load rich.ru once for evidence.
- Quote text is computed by a `ratingQuote(L, evidence)` function, not by `displayQuote` (:787-792). `displayQuote` falls back to `translation` for every locale.

Outputs. Texts are stored once per data locale; de/fr/ja get only an overlay:
- `content/v2/ru/rating/index.json` and `content/v2/en/rating/index.json`: `[{slug, name, nameLang, count}]` (72).
- `content/v2/{ru,en}/rating/<slug>.json`:
  ```json
  {category, name, nameLang, seoName|null, count, totalReviews,
   apps:[{id, title, realScore, storeAvg, ratings, verdict|null, loved|null, weak|null, whoFor|null, quotes:[{text, lang}]}],
   scenarios:[{n, name|null, job|null, gap|null, appIds:[], unmatched:[]}]}
  ```
  `apps` stays in raw peoplesRating order. `appIds`/`unmatched` come from `servedBy`: exact title first, else a unique `normalizedTitle` match, deduped by id (:41-57).
- `content/v2/{de,fr,ja}/rating/overlay.json`: `{names:{slug:{name,nameLang}}, quotes:{"<slug>:<appId>":[{text,lang}]}}`. The quotes map covers only apps with at least one translated quote and holds their full list.
- Record `source: "web peoplesRating (numbers, en texts) + app rich.ru/rich.en/text.ru/quote-translations"` in the manifest.

Validation (fail on violation):
- ids unique per category;
- numbers equal peoplesRating;
- every `appIds` entry exists;
- no Cyrillic in en text fields (verdict, loved, weak, whoFor, name, job, gap), excluding `title` and `unmatched` (7 titles contain Cyrillic look-alike letters, e.g. «Photo Editоr» 530957470);
- counts ru 72 / 4,443 / 317, en scenarios 35 / 157, apps with quotes 1,842, behind `ALLOW_COUNT_CHANGE`.

**Reader** (`sitedata/rating.ts`):
- Reads `content/v2` through `src/site/content` loaders.
- de/fr/ja = en + overlay.
- Keeps `usable()` (:105-110, 71 niches), the slug index (:118-142) and `hasRatingNiche`.
- Applies no text processing of its own.
- If the content files are absent (dev before import), it falls back to peoplesRating, and pages hide the scenario card and «Опыт пользователей».
- `searchRatingApps` goes through the reader.

**Reviews:** `sitedata/reviews.ts` uses `ratingNicheName(L, slug)` for niche names, so a niche has the same name on rating and review pages. `nicheMetaTitle` keeps `seoName` (e.g. ai-avatars-headshots is «Аватары и портреты с ИИ» on the page but «фото с ИИ» in the title; §10 Q13).

---

## 9. Things to delete

**Files:**
- `src/site/features/rating/Shots.tsx`
- `src/site/features/rating/NavCard.tsx`
- `src/site/ui/AppIcon.tsx`, with its export `AppIcon, appIconAt` (ui/index.ts:2; no other users) and `.ia-app-icon` (site.css:1876-1887)
- `src/site/sitedata/rating-niches.ts` (`RATING_NICHE_BLURBS`, `NEW_RATING_NICHES`)

**features/rating/format.ts:** `mismatchText` (:13-17) and `points` (:25-31). Keep `starText`, which `appMetaDescription` still uses.

**sitedata/rating.ts:**
- `RatingNicheCard.blurb/icons/isNew` (:57-66)
- `cleanBlurb` (:159-171)
- `StarMismatch`/`MISMATCH`/`mismatch` (:52-55, 185)
- `largeMismatch` (:96, 253)
- `authNote`, `icon`, `shots` (:73, 82-83, 181, 190-191)
- `prose()`/`capFirst()` (moved to the importer)
- the peoplesRating text path, which stays only as the dev fallback

**rating.css:** everything (rewrite, §3.0), in particular:
- `--ia-rt-warn` (:6-17), `.ia-rt-eyebrow` (:33-38), `.ia-rt-mismatch*` (:41-64)
- `.ia-rt-search` (:70-73), `.ia-rt-grid`/`card*` (:86-154)
- `.ia-rt-head`/`lead`/`stats`/`stat*`/`how*` (:174-230)
- `.ia-rt-app*`, old `score*`, `verdict`, `facts`, `link` (:232-370)
- `.ia-rt-shots*` (:373-424), `.ia-rt-navcard*` (:427-467)
- `.ia-rt-apphead`/`store-link` (:473-501), `.ia-rt-points*` (:502-538), `.ia-rt-whofor*` (:539-559)

**ratingStrings keys:** title, subtitle, listLabel, searchPlaceholder, newBadge, eyebrow, nicheTitle, nicheLead, reviewsFromWord, statApps, statReviews, statMismatch, howTitle, howBody, appsListLabel, place, storeStar, noRatings, ourScore, scoreLabel, noScore, mismatchAligns/Some/Large(+Long), strong, weak, whoFor, sourcesLink, shotAlt, breakdownKicker, breakdownTitle, appPlace, statScore, statStar, statRatings, aboutTitle, aboutNote, lovedEyebrow, lovedTitle, weakEyebrow, weakTitle, whoForTitle, screenshots, appStore, appStoreLabel, navFullKicker, navFull, navSourcesKicker, navSources, navBreakdownKicker, navBreakdown.

**ui/icons.tsx:** `LovedIcon`, `WeakIcon` (only the app page) and `SortIcon` (only ReviewBrowser). `StarIcon` stays (landing/parts.tsx:9, welcome/WelcomeFlow.tsx:17).

**reviews.css:**
- `.ia-rv-inline-link`, `.ia-rv-links` (:13-46)
- `.ia-rv-niches`/`niche*`/`chevron` (:52-120)
- `.ia-rv-list`/`row*` (:131-167)
- `.ia-rv-lock*` (:170-204)
- `.ia-rv-select*` (:216-251), `.ia-rv-sort` (:252-270)
- `.ia-rv-reviews > li + li` (:289), `.ia-rv-review__head` (:298)
- `.ia-rv-stars` accent + `__off` (:304-313), `.ia-rv-review__text` Georgia 17 (:341-349), `.ia-rv-more` (:350)
- `.ia-rv-layer p:not(.ia-rt-eyebrow)` (:406)
- the limit counters (:432-451)
- the header comment's reference to rating.css (:5)

**reviewsStrings:** freeNote, ratingKicker, ratingTitle, topicKicker, topicTitle, inRating; methodology `eyebrow`, `layer1Kicker`…`layer3Kicker`. **`showMore` stays.**

**mcp.css:**
- `.ia-mcp-top`, `.ia-mcp-note` (:11-20)
- stats (:21-29), actions (:30-37), plus (:38-65), section head/kicker (:72-83), gives (:84-114)
- `.ia-mcp-rows*` (:115-140), prompt serif (:141-146), `.ia-mcp-tools*` (:147-169), link (:170-187)
- step circles (:208-218), free panel (:282-291), `.ia-mcp-conn*` (:292-313), FAQ accordion (:314-352), links (:353-362)
- the header comment (:4)

**mcpStrings:** whatIs, install, givesKicker, exampleKicker, installKicker, connectionsKicker, promptsKicker, toolsKicker, seeReviews, seeRating.

**Shell:**
- `SectionLinks`, `SectionsMenu`, and `.ia-secnav*` (site.css:1806-1864)
- `shellStrings.sectionsNav`, if it has no other users
- `sectionsMore` stays: it labels the «⋯» menu

**Moved, not deleted:** `.ia-ideas__pill*` → site.css `.ia-pill*`; `.ia-picker*` → site.css; `PlusCard` → features/plus/PlusCard.tsx.

**Dead CSS found during mapping:** research.css:558-712 (`.ia-rs-apps*`, no TSX users).

---

## 10. Open questions
1. **Product conflict.** The app removed rankings (MECHANICS-REDESIGN.md:66-70, CONTRACT.md:17, UI tests ClarityUITests.swift:953-993). This spec revives the dormant ClarityRatings design, with scores, on the public web. Confirm.
2. **App page numbers.** Options:
   - keep the web-only metrics + W4 (default; they make `aggregateRating` visible);
   - show none, like ClarityAppView, and drop `aggregateRating`.

   Also check Google's review-snippet guideline on ratings that come from another site (the App Store). If that markup is ineligible anyway, the second option loses nothing.
3. **Titles.** H1s use app wording («Выбери приложение»; the niche name). `<title>` keeps the search head terms `nicheMetaTitle` «Лучшие приложения для {name}: топ-{count} по отзывам» and `appMetaTitle`. Rewrite those too?
4. **Catalogue order.** Alphabetical (app, :71-74) or `byNicheMoney` (current web, rating.ts:225)?
5. **Glyph variety.** 53 of 72 niches get `Layers`. Extend `StudioStyle.categorySymbol` in both the app and the web?
6. **Length.** Up to 100 cards of about 160 px per niche page. Keep one card per row (Swift), or use a grouped box or paging? JSON-LD needs every item in the HTML.
7. **Scenario pages.** noindex and no sitemap (default: part of the content is gated, and titles are long jobs), or index ru + the 35 en with sitemap entries?
8. **Bookmark.** The web library has no "app" kind (the app has ClarityAppShelf.swift). Add it later (accent `IconButton`, keys «Сохранить приложение» / «Убрать приложение из сохранённого») or skip?
9. **Gate.** Quotes and scenario details are gated (R11); jobs appear publicly as teasers on the niche page; the rest of the rating is public. The app gates the whole category (ClarityRatings.swift:147, 238, 339). Confirm.
10. **Store decimal.** Web «4,7», app «4.7» (:411). Fix the app?
11. **Pulse.** After merging badcomment-v2, should the niche page embed «Пульс категории» (PulseRows.tsx)? Do not port PulseRatingChart. The tab order also differs: Пульс is last in the app (ClarityRoot.swift:73-75) and second in v2.
12. **Scope.** astrology has ratings in the app but no review corpus on the web (`usable()` → 71). Keep it out?
13. **Names.** Should the app's renamed niche names (51 ru, 26 en) also rename the review archive and the page `<title>`s, which keep `seoName`?
14. **Navigation.** Preferred option (app chrome + «⋯») or the fallback (quiet links)?

---

## 11. File-by-file change list (web repo)

| File | Change |
|---|---|
| `src/site/styles/tokens.css` | + `--ia-fs-caption2`, `--ia-lh-caption2`, `--ia-lh-body-loose` (§2.2) |
| `src/site/styles/site.css` | + P0 (`.ia-page--stack*`, `.ia-heading--fixed`), P1–P3, P4 `.ia-quote*`, P5 `.ia-btn--ink`, P6, P7, P9, `.ia-rt-method-card` (§4.4); + `.ia-pill*`, `.ia-picker*` (moved from ideas.css); − `.ia-secnav*` 1806-1864, − `.ia-app-icon` 1876-1887 |
| `src/site/ui/Button.tsx` | `ButtonVariant` + `"ink"` |
| `src/site/ui/Row.tsx` (new) | `Row`, `RowCard` |
| `src/site/ui/QuoteBlock.tsx` (new) | P4 |
| `src/site/ui/EmptyCard.tsx` (new) | P6 |
| `src/site/ui/PickerSheet.tsx` (new) | P10, extracted from IdeasCatalog.tsx:180-243 |
| `src/site/ui/categoryGlyph.ts` (new) | P8 |
| `src/site/ui/icons.tsx` | + `QuoteOpeningIcon` (from IdeaArticle.tsx:84-91), `SourceIcon`, `InfoIcon`, `AppWindowIcon`, `RatingIcon`, and the P8 category glyphs; − `LovedIcon`, `WeakIcon`, `SortIcon` |
| `src/site/ui/index.ts` | export the new primitives; − `AppIcon`, `appIconAt` |
| `src/site/ui/AppIcon.tsx` | delete |
| `src/site/features/ideas/IdeasCatalog.tsx`, `ideas.css`, `IdeaArticle.tsx` | use `PickerSheet` and `.ia-pill`; remove the moved rules; import `QuoteOpeningIcon` |
| `src/site/features/rating/rating.css` | rewrite (§3.0–3.5) |
| `src/site/features/rating/RatingCatalog.tsx` | rewrite (§3.1) |
| `src/site/features/rating/RatingNicheBrowser.tsx` (new, client) | §3.2 item 6 |
| `src/site/features/rating/RatedAppRow.tsx` (new) | `RatedAppRow` + `ScoreBlock` |
| `src/site/features/rating/RatingMethodSheet.tsx` (new, client) | §3.3 |
| `src/site/features/rating/QuotesProof.tsx` (new, client) | §3.5 item 8, reveal |
| `src/site/features/rating/matches.ts` (new) | search port (§3.0) |
| `src/site/features/rating/strings.ts` | §7.2–7.3, §9 |
| `src/site/features/rating/keys.ts` | `RATING_UI_KEYS` = the catalogue, niche, method and app keys of §7.1 used by client components |
| `src/site/features/rating/seo.ts` | `dataAlternates(L, path, {en?: boolean})`, `clampTitle` |
| `src/site/features/rating/format.ts` | keep `starText` only |
| `src/site/features/rating/Shots.tsx`, `NavCard.tsx` | delete |
| `src/site/sitedata/rating.ts` | reader over content/v2 (§8), `searchRatingApps`, `ratingNicheName`, slug guard `tasks`; deletions (§9) |
| `src/site/sitedata/rating-niches.ts` | delete |
| `src/site/sitedata/reviews.ts` | niche names via `ratingNicheName` |
| `src/site/content/*` | rating loader for `content/v2/<dl>/rating/*.json` + overlay |
| `src/site/routing.ts` | + `ratingTask(l, niche, n)` |
| `src/app/(site)/site/[lang]/rating/page.tsx` | §3.1 |
| `src/app/(site)/site/[lang]/rating/[slug]/page.tsx` | §3.2 (+ `I18nProvider` with `RATING_UI_KEYS`) |
| `src/app/(site)/site/[lang]/rating/[slug]/[app]/page.tsx` | §3.5 (+ `getViewer`, imports research.css) |
| `src/app/(site)/site/[lang]/rating/[slug]/tasks/[n]/page.tsx` (new) | §3.4 |
| `src/app/api/site/rating-search/route.ts` (new) | §3.1 |
| `src/app/(site)/site/[lang]/reviews/page.tsx`, `[slug]/page.tsx`, `[slug]/[id]/page.tsx`, `methodology/page.tsx` | §4; drop rating.css/NavCard; import research.css (+ library.css on `[slug]`) |
| `src/site/features/reviews/ReviewNiches.tsx`, `ReviewApps.tsx`, `ReviewBrowser.tsx` | rewrite per §4.1–4.3 (`id="review-niches"`, `id="review-apps"`) |
| `src/site/features/reviews/reviews.css`, `strings.ts`, `methodology.ts`, `keys.ts` | §4, §7.2, §9 |
| `src/app/(site)/site/[lang]/mcp/page.tsx`, `mcp/connect/page.tsx` | §5; import settings/library/research css; manifest art |
| `src/site/features/mcp/ConnectScreen.tsx`, `Connections.tsx`, `InstallPicker.tsx`, `CopyLine.tsx`, `mcp.css`, `strings.ts` | §5, §7.2, §9 |
| `src/site/features/plus/PlusCard.tsx` (new) | from settings/client.tsx:41-120, generalised (§5.5) |
| `src/site/features/settings/client.tsx`, `SettingsScreen.tsx`, `settings.css` | use the shared `PlusCard` (`caption="account"`); + `.ia-set-box--flush`, `li.ia-set-row`, `.ia-set-row--info*` |
| `src/site/features/research/ResearchArticle.tsx` | + W8 RowCard after the conclusion (if `hasRatingNiche`) |
| `src/site/features/research/research.css` | − :558-712 |
| `src/site/shell/TopNav.tsx`, `SectionNav.tsx`, `strings.ts` | §6 |
| `scripts/v2/import-app-content.ts` | rating output + validation (§8) |
| `.github/workflows/deploy.yml` | :224 `grep -q 'ia-rt-card'` → `grep -q 'id="rating-niches"'`; :227 `grep -q 'ia-rv-row'` → `grep -q 'id="review-apps"'`; :229 unchanged (tool rows stay server-rendered) |

---

## 12. Review points not applied as written
- **Critique 2 #9, partly wrong.** "Text is neutralised today" is inaccurate: only `authNote` is neutralised (sitedata/rating.ts:190). English verdicts, weak and whoFor texts containing "inflated" (24, 13 and 3 matches) are shown un-neutralised today. The fix, neutralising and typografing in the importer, is still applied.
- **Critique 2 #17, moot.** §4.2 no longer overrides `.ia-lib-section__title` (Critique 1 #19).
- **Critique 2 quote count.** The count is 3,264, not 3,272, when deduplicating by quote text per app as Swift does (:59-64). §8 says "about 3,270", and the importer records the exact count.
- **Correction to the previous spec (found while verifying).** The review list's «Показать остальные %1$@» would have been wrong: the button adds 80 rows, not the rest. `s.showMore` is kept.
- **Critique 1 #26 (bottom padding).** Not rejected. It is kept as a documented web deviation (§1.5).