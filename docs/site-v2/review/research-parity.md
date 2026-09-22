# Review: research catalog + article parity with the iOS app (by code)

Reviewer key: `research-parity` · 2026-09-23 · report only, no source files edited.

**Scope.** Web: `src/site/features/research/**`, `src/app/(site)/site/[lang]/segment/{page,[slug]/page}.tsx`, plus the shared pieces they render (`src/site/ui/*`, `site.css`, `features/ideas/IdeaCard.tsx`, `features/library/components.tsx` BookmarkButton).
**Compared against** `Inapp/Clarity/ClarityCatalogs.swift` (research part), `ClarityReader.swift`, `ClarityResearchFlow.swift`, `ClarityResearchArtwork.swift`, `ClarityContentAccess.swift`, `ClarityStyle.swift`, `ClarityReadingStyle.swift`, `ClarityIdeaCard.swift`, and specs 01 §3–§8, 05, 09.
**Checked on the shared dev server:** `/ru/segment`, `/ru/segment?q=%20`, `/ru/segment?q=zzzqqq`, `/ru/segment/interior-design` (readable), `/ru/segment/habit-tracking` (locked). All returned 200 (one transient 500 while another agent was saving).
Swift paths are relative to `/Users/artsaverin/projects/app_04_inapp/Inapp/`. Web paths are relative to the worktree root.

**Still changing during the review.** `TopicExtras.tsx` (AppRow markup) and its CSS (`.ia-rs-app__main/__actions`) were rewritten while I read them. `ArticleChrome.tsx` also changed (TocList `idPrefix`). Line numbers below are from 00:05 on 2026-09-23.
**Not written yet:** the intercepting idea-modal route (see M5).

---

## Summary table

| # | Sev | What | Web | Source of truth |
|---|---|---|---|---|
| M1 | major | Quotes show the app name and stars | `ResearchArticle.tsx:64-97`, `research.css:394-410` | `ClarityReader.swift:447-458, 858-876`; spec 01 §6.8; spec 09 §5 #28 |
| M2 | major | Idea cards form a 2-column grid inside the 640 reading column | `research.css:423-437` | `ClarityReader.swift:290-303`; spec 05 §3.6 M |
| M3 | major | Catalog cards sit 14 px apart on phones, not 24 | `site.css:185-202` via `research.css:28-32` | `ClarityCatalogs.swift:42`; spec 05 §3.2 |
| M4 | major | Locked preview uses reading paper `#FCFCFD`, not paper `#F5F5F7` | `segment/[slug]/page.tsx:102` + `site.css:119-121` | `ClarityContentAccess.swift:115`; spec 01 §5.1 |
| M5 | major | Idea cards in the article navigate away; there is no modal (**route not written yet**) | `ResearchArticle.tsx:116-123`; no `@modal` under `[lang]/` | `ClarityIdeaCard.swift:74-90`; spec 01 §5.9; spec 09 C17, G6 |
| m1 | minor | Unlocked idea cards in the article have no category line | `ResearchArticle.tsx:19-21,116-123`; `segment/[slug]/page.tsx:129` | `ClarityIdeaCard.swift:46-54` |
| m2 | minor | The 8 px image margin is applied to every inline image | `research.css:277-279`; `ResearchArticle.tsx:215,230`; `LockedPreview.tsx:26` | `ClarityReader.swift:242,256-258,276-277`; `ClarityContentAccess.swift:74-78` |
| m3 | minor | The cover stops bleeding at ≥ 720 px | `research.css:269-276`, `ResearchArticle.tsx:52` | `ClarityReader.swift:159-162`; spec 05 §3.6 M, §6.2 |
| m4 | minor | Audience items are 18 + 1 + 18 apart, not 20 + 1 + 20 | `research.css:328-342` | `ClarityReader.swift:243-248, 750` |
| m5 | minor | «Сначала прочитать бесплатный разбор» is centred, not leading | `research.css:516-529` | `ClarityContentAccess.swift:95-98` |
| m6 | minor | TOC sheet has double side padding (44 px) | `research.css:489-491` + `site.css:861-867` | `ClarityReader.swift:210-220` |
| m7 | minor | Quote glyph is a closing mark ” in outline, not an opening mark “ | `ResearchArticle.tsx:85`, `research.css:380-383` | `ClarityReader.swift:865-867` |
| m8 | minor | Quote text starts 20 px from the rule, not 18 | `research.css:377-378` | `ClarityReader.swift:451-455` |
| m9 | minor | Styling of the «Скоро в новом формате» block (heading size, body colour, 40 px pills) | `segment/page.tsx:102`, `research.css:96-128` | `ClarityCatalogs.swift:67-76`; spec 05 §3.6 H |
| m10 | minor | Catalog empty state gap is 6, not 8 | `research.css:80-84` | `ClarityCatalogs.swift:235` |
| m11 | minor | Catalog search stretches to 1200 px on desktop | `CatalogSearch.tsx:52` (the form has no class) | spec 05 §3.2 md ("search max 680") |
| m12 | minor | Whitespace-only query keeps catalog order and still shows the old-topics block | `content/search.ts:23`, `segment/page.tsx:63,68,100` | `ClarityCatalogs.swift:15,47,67`; spec 01 §4.3 (3) |
| m13 | minor | TOC rail uses 15 px text, 12 px indent and grey depth-1 rows | `research.css:470-488` | `ClarityReader.swift:214-216`; spec 05 §3.6 J |
| m14 | minor | Bookmark: check icon instead of a filled one, accent tint, toast | `library/components.tsx:42,45`; `site.css:651-653` | `ClarityReader.swift:231, 796-812`; spec 01 §5.6 |
| m15 | minor | Site-only blocks: row dividers, promo width, black badges on every row, mobile header on detail pages | see §3 | spec 05 §3.6 K, §6.2 |

No blockers. The paywall gate holds:
- The locked page `/ru/segment/habit-tracking` contains neither the lead nor any TOC title of the locked article.
- The titles of `interior-design-6/7/8` are absent from `/ru/segment/interior-design`, while `-5` is present as expected.

---

## 1. Major

### M1 — Quotes show the app name and star rating
- **Web:** `src/site/features/research/ResearchArticle.tsx:77-97` renders `<figcaption class="ia-rs-quote__cite">` with `<cite>{quote.app}</cite>` and `<Stars>` (`:64-75`). Styled in `research.css:394-410`. There are 18 captions on `/ru/segment/interior-design`.
- **App:** `ClarityQuoteBlock` (`ClarityReader.swift:858-876`) receives `app` and `rating` but renders only the glyph and the text. Spec 01 §6.8 says "The app name and the star rating are NOT displayed … no attribution line". Spec 09 §5 #28 ("Show app names on quotes?") is **ANSWERED: No**. Spec 04 §9 #16 says the same.
- DECISIONS §3 allows site-only *blocks* (apps list, players, review counts). It does not cover changing the reading design of the article.
- **Fix:**
  - Delete `ResearchArticle.tsx:89-94` and the `Stars` component (`:64-75`). The quote becomes glyph + text only:
    ```tsx
    <figure className="ia-rs-quote">
      <QuoteIcon … className="ia-rs-quote__glyph" aria-hidden="true" />
      <blockquote className="ia-rs-quote__text"><p>{applyNbspPolicy(quote.text)}</p></blockquote>
    </figure>
    ```
  - Remove `.ia-rs-quote__cite`, `.ia-rs-stars` and `.ia-rs-stars__off` from `research.css`.
  - If the owner wants attribution, it needs its own DECISIONS entry first.

### M2 — Idea cards inside the article form a 2-column grid
- **Web:** `research.css:423-437`: `.ia-rs-ideas { display:grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr)); gap:14px }`.
  - Whenever the reading column is ≥ 554 px (tablet and desktop), a placement with 2–3 ideas shows ~290 px cards side by side.
  - 61 of 225 directions have more than one idea (spec 01 §5.4.2), so Plus readers hit this on most topics.
- **App:** `editorialIdea` (`ClarityReader.swift:290-303`) is a `VStack(spacing: 18)`, and every `ClarityIdeaCard` is full width. Spec 05 §3.6 M: "standard idea card, 18 gap, 12 top padding".
- **Fix** (`research.css:423-437`):
  ```css
  .ia-rs-ideas { display: flex; flex-direction: column; gap: 18px; margin: 0; padding: 0; list-style: none; }
  .ia-rs-ideas > li { display: block; min-width: 0; }
  ```
  - Keep the card's own `margin-bottom: 6px` (`ClarityIdeaCard.swift:67`).
  - Optional: the «Другие идеи категории» list (`remainingIdeas`) uses 14 in the app (`ClarityReader.swift:411`). Give it a modifier `.ia-rs-ideas--remaining { gap: 14px }`. That list never renders with the shipped data.

### M3 — Catalog card spacing uses the ideas density
- **Web:** `segment/page.tsx:85` uses `<ul className="ia-grid ia-rs-grid">`. `.ia-grid` (`site.css:185-202`) sets `gap: 14px` below 760, `24px 20px` at 760+ and `28px` at 1280+. `.ia-rs-grid` (`research.css:28-32`) does not override the gap.
- **App:** `ClarityCatalogs.swift:42` has `LazyVStack(spacing: 24)`. Spec 05 §3.2: research gap 24 (md) and 28 (xl). The 14 value belongs to the ideas list (`ClarityCatalogs.swift:189`).
- **Fix** (`research.css:28`):
  ```css
  .ia-rs-grid { margin: 0; padding: 0; list-style: none; gap: 24px; }
  @media (min-width: 1280px) { .ia-rs-grid { gap: 28px; } }
  ```

### M4 — Locked preview sits on reading paper
- **Web:** `src/app/(site)/site/[lang]/segment/[slug]/page.tsx:102` wraps the locked branch in `<div className="ia-reading-page">`. `site.css:119-121` (`body:has(.ia-reading-page)`) then turns the whole canvas `#FCFCFD`. The white `clarityCard` (0.5 px line@55 %) almost disappears against it (surface vs canvas ≈ 1.01:1).
- **App:** `ClarityContentAccess.swift:115` uses `.background { ClarityBackground() }`, which is `paper` (`#F5F5F7` / dark `#111214`, `ClarityStyle.swift:20-24`). Spec 01 §5.1 ("background `paper`") and spec 05 §1.1 (`--ia-paper` lists "locked gate") agree.
- **Fix:** `page.tsx:102` → `<div className="ia-rs-locked-page">`, i.e. any class except `ia-reading-page`. Keep `ia-reading-page` on the readable branch (`:154`). Owner: the pages agent.

### M5 — Idea cards push a page instead of opening a modal (**not written yet**)
- **Web:** `ResearchArticle.tsx:116-123` gives unlocked cards `href={routes.idea(locale, slug)}`, a plain navigation. There is no `@modal` slot or `(.)ideas/[id]` intercepting route under `src/app/(site)/site/[lang]/`.
- **App:** `ClarityIdeaCard.swift:74-90` opens a sheet: large detent, drag indicator, «Готово» **top-leading**, the article stays underneath. Spec 01 §5.9 and spec 09 C17 (decision) require a modal (intercepting route) when opened from a card, including inside a research article, and a full page for a direct URL or reload. Spec 09 G6 sets the nesting rules.
- **Fix** (pages agent):
  - Add `src/app/(site)/site/[lang]/@modal/(.)ideas/[id]/page.tsx`. It renders the idea reader inside `<Sheet size="reading" paper="reading" leading={<SheetAction onClick={back}>{t("Готово")}</SheetAction>}>`.
  - Add `@modal/default.tsx`, which returns `null`.
  - Render `{modal}` in `[lang]/layout.tsx`.
  - Close with `router.back()`, so the article keeps its scroll position.
  - Inside the modal, «Читать разбор категории» closes the modal and navigates (G6.3).
  - Locked cards already open the paywall (correct).

---

## 2. Minor

### m1 — No category line on idea cards inside the article
- **Web:** `ResearchArticle.tsx:116-123` passes no `categoryName`. The `ArticleIdea` type (`:19-21`) has no such field, and `segment/[slug]/page.tsx:129` does not supply one. The `IdeaCard.tsx` contract comment says "omitted inside the idea's own category article".
- **App:** `ClarityIdeaCard.swift:46-54` always renders `idea.categoryName` (footnote 13, secondary, +7 top), including in the article (`ClarityReader.swift:300`).
- **Fix:**
  - `page.tsx:129`: `{ slug: id, locked: false, cover, title: copy.title, description: copy.description, categoryName: ideaCategoryName(catalog, id) }`, with the import from `@/site/content/text`.
  - Add `categoryName: string` to the unlocked branch of `ArticleIdea`.
  - Pass `categoryName={idea.categoryName}` at `ResearchArticle.tsx:116`.
  - Correct the comment in `features/ideas/IdeaCard.tsx`.

### m2 — The 8 px image margin applies to every inline image
- **Web:** `research.css:277-279` (`.ia-rs-art--inline { margin-block: 8px }`) applies to:
  - the audiences image (`ResearchArticle.tsx:215`): 28 px instead of 20 before the first audience;
  - the section image (`:230`);
  - the locked-preview cover (`LockedPreview.tsx:26`).
- **App:** only the observation image gets `.padding(.vertical, 8)` (`ClarityReader.swift:276-277`). The audiences image (`:242`), section image (`:256-258`) and locked cover (`ClarityContentAccess.swift:74-78`) have none.
- **Fix:**
  - Rename the rule to `.ia-rs-art--obs { margin-block: 8px; }`.
  - Add a prop to `Artwork`, e.g. `spaced`, and use it only at `ResearchArticle.tsx:151`.
  - Plain inline images get `margin: 0`.

### m3 — The cover stops bleeding on wide screens
- **Web:** `research.css:272-276` resets `margin-inline: 0` at ≥ 720 px, so the cover shrinks to the 640 text column.
- **App:** `ClarityReader.swift:159-162` always applies `.padding(.horizontal, -22)`. Spec 05 §3.6 M and §6.2: "cover art bleeds 22 px outside it" at every breakpoint, i.e. the 684 column.
- **Fix:** delete `research.css:272-276`. Change `ResearchArticle.tsx:52` sizes to `"(min-width: 728px) 684px, 100vw"`. The ≥ 1200 grid column is exactly 684, so nothing overlaps the TOC rail.

### m4 — Spacing between audience items
- **Web:** `research.css:328-342` uses `padding-block: 18px`, giving 18 + 1 + 18.
- **App:** the items, their `Divider()`s and the image are siblings in `ClarityArticleSection`'s `VStack(spacing: 20)` (`ClarityReader.swift:243-248, 750`), giving 20 + 1 + 20.
- **Fix:** `.ia-rs-audience { padding-block: 20px; }`. Keep the first/last-child resets.

### m5 — Free-sample link is centred
- **Web:** `research.css:516-529` sets `.ia-rs-text-link { align-self: center; justify-content: center; padding: 0 4px }`.
- **App:** `ClarityContentAccess.swift:95-98` uses `.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)`, a full-width row with left-aligned text (subheadline medium, ink).
- **Fix:** `.ia-rs-text-link { align-self: stretch; justify-content: flex-start; padding: 0; }`. The `--body` modifier (note button) keeps `align-self: flex-start`, which matches `ClarityContentAccess.swift:104-107` visually.

### m6 — TOC sheet: double side padding
- **Web:** `research.css:489-491` gives `.ia-rs-sheet-toc` `padding: 4px 22px 24px`. It sits inside `.ia-sheet__body`, which already has `padding: 4px var(--ia-gutter-reader) 24px` (`site.css:861-867`). Result: rows start 44 px from the edge, with 48 px at the bottom.
- **App:** a `List` with standard row insets (`ClarityReader.swift:210-220`).
- **Fix:** `.ia-rs-sheet-toc { padding: 0; }`.

### m7 — Quote glyph
- **Web:** `ResearchArticle.tsx:85` uses lucide `Quote` at 13 px with stroke 2. Lucide's path is a **closing** mark (”, block on top, tail down), drawn as an outline.
- **App:** `Image(systemName: "quote.opening")`, a filled opening mark “ at footnote 13, secondary (`ClarityReader.swift:865-867`).
- **Fix:** `<QuoteIcon size={13} strokeWidth={0} fill="currentColor" className="ia-rs-quote__glyph" aria-hidden="true" />`, plus in `research.css:380`: `.ia-rs-quote__glyph { transform: rotate(180deg); }`. A 180° turn of ” gives “.

### m8 — Quote text inset
- **Web:** `research.css:377-378` uses `border-left: 2px` plus `padding-left: 18px`, so the text starts 20 px from the rule's outer edge.
- **App:** the 2 pt rule is an overlay on top of the 18 pt leading padding (`ClarityReader.swift:451-455`), so the text starts at 18.
- **Fix:** `.ia-rs-quote { padding: 10px 0 10px 16px; }`. The 8 px outer margin is already correct: 18 gap + 8 = 26 = app.

### m9 — «Скоро в новом формате» block
- The copy follows DECISIONS §4 and replaces the app's «Готовим следующие разборы / Велоспорт, йога…». That is fine. The styling should still follow the app's coming-soon block (`ClarityCatalogs.swift:67-76`):
  - heading = `subheading` (17/600, header);
  - body = Georgia 19, **ink**, `lineSpacing(5)` → 26.6;
  - `VStack(spacing: 12)`; vertical padding 28.
- **Web differences:**
  - `segment/page.tsx:102` uses `SectionTitle` (22/600).
  - `research.css:102-107` makes the body secondary with line-height 1.452.
  - `.ia-rs-soon__link` has `min-height: 40px` (`research.css:119`); spec 05 §3.6 H requires 44 minimum targets.
- **Fix:**
  - `<Subheading id="research-soon">{s.soonTitle}</Subheading>` (`ui/Heading.tsx:54`).
  - `.ia-rs-soon__body { color: var(--ia-ink); font: 400 var(--ia-fs-subtitle)/var(--ia-lh-subtitle) var(--ia-font-serif); }`.
  - `.ia-rs-soon__link { min-height: 44px; }`.
  - The pills (surface + 1 px line@65 %) fit the chip vocabulary; keep them.

### m10 — Catalog empty state gap
- **Web:** `research.css:83` has `gap: 6px`.
- **App:** `ClarityCatalogs.swift:235` has `VStack(alignment: .leading, spacing: 8)`.
- **Fix:** `gap: 8px`. Copy, fonts (17/600 and 15 secondary) and the `clarityCard` already match.

### m11 — Search width on the desktop grid
- **Web:** the search `<form>` (`CatalogSearch.tsx:52`) has no class, so the field spans the whole grid container (up to 1200 px).
- **Spec 05 §3.2 (md):** "heading + search span the grid, search max 680".
- **Fix:** add `className="ia-rs-search"` to the form, plus `.ia-rs-search { max-width: var(--ia-w-catalog); }`.

### m12 — Whitespace-only query (edge case)
- **App:** `query.isEmpty` is untrimmed (`ClarityCatalogs.swift:15,47,67`). A query of spaces gives alphabetical order, «Найдено: 35», and **no** coming-soon block (spec 01 §4.3 (3)).
- **Web:**
  - «Найдено: 35» is shown (correct).
  - `content/search.ts:23` returns catalog order when `query.trim() === ""`.
  - `segment/page.tsx:68` lists all old topics, so the block renders.
- **Fix:**
  - In `search.ts:23`, short-circuit only on `query === ""`. Zero tokens then match all topics with equal relevance 0, so they sort by name.
  - In `segment/page.tsx:68`: `const soon = query === "" ? all : query.trim() === "" ? [] : all.filter(…)`.

### m13 — TOC rail typography (web-only addition)
- **Web:** `research.css:477-488` sets rail items to 15 px, depth-1 indent 12, secondary colour, and adds an uppercase 13 px title.
- **Spec 05 §3.6 J:** depth 0 17/600, depth 1 17/400 indented 14 (same as the sheet, `ClarityReader.swift:214-216`).
- **Fix:**
  - Remove the `.ia-rs-rail .ia-rs-toc__link` size override.
  - Set `.ia-rs-rail .ia-rs-toc__link--depth1 { padding-left: 14px; color: var(--ia-ink); }`.
  - The accent for the current row is a reasonable web extra.
  - Low priority: the rail is an O9 design item.

### m14 — Bookmark in the research toolbar
- This is library/ui code, used by `ArticleChrome.tsx:118`.
- **Web differences:**
  - The saved state uses lucide `BookmarkCheck` (outline with a check mark; `library/components.tsx:45`, `ui/icons.tsx:12`).
  - `.ia-icon-btn[aria-pressed="true"]` paints it accent (`site.css:651-653`).
  - Every toggle shows a toast (`components.tsx:42`).
- **App:**
  - `bookmark` ↔ `bookmark.fill` (a filled glyph), tinted **ink** (reader tint, `ClarityReader.swift:231, 805`).
  - No toast (spec 01 §5.6; only a selection haptic).
- **Fix:**
  - Use `<BookmarkIcon size={17} fill={saved ? "currentColor" : "none"} />`.
  - Add `.ia-glass-pill .ia-icon-btn[aria-pressed="true"] { color: inherit; }`.
  - The toast is an owner call (a web stand-in for the haptic). If kept, fine.

### m15 — Integration of the site-only blocks (DECISIONS §3, §12)
These blocks are generally consistent with the design: a hairline plus a 22/600 heading like `ArticleSection` (`research.css:551-562`), surface list r20, 44 px targets, 15/13 sans meta. Tweaks:
- **a. Apps list dividers.**
  - Now: `research.css:591-593` draws a full-width 1 px `--ia-line`.
  - Spec 05 §3.6 K: grouped-list dividers are 0.5 px line@65 %, inset from the leading edge.
  - Fix: remove the border-top and add `.ia-rs-app + .ia-rs-app { position: relative; } .ia-rs-app + .ia-rs-app::before { content: ""; position: absolute; top: 0; left: 78px; right: 0; height: 1px; background: var(--ia-line-65); }` (16 padding + 48 icon + 14 gap).
- **b. Promo width on the catalog.**
  - `AppPromo` (`segment/page.tsx:122`, `research.css:136-143`) spans the whole grid, becoming a 1200 px accent-soft band at ≥ 1280.
  - Fix: `.ia-rs-catalog > .ia-rs-promo { width: 100%; max-width: var(--ia-w-catalog); }`.
- **c. Black App Store badges on every row.**
  - `TopicExtras.tsx:70`, `research.css:634-642`: 8–16 official black badges in one list compete with the "one accent" rule (spec 05 §6.2).
  - The CI marker `/badges/app-store.svg` is already on every topic page via `AppPromo` → `AppStoreBadge` (`ui/AppStore.tsx:39`).
  - Rows could use an accent text link «App Store ↗» styled like `.ia-rs-app__link`.
  - Owner call: ARCHITECTURE §5.4 mentions "store badges". Re-run the smoke grep if changed.
- **d. Mobile detail pages have two top rows.**
  - `src/site/shell/ChromeFrame.tsx:36,65` shows the 56 px compact header (plus the open-in-app banner) above the sticky «Назад» toolbar on articles and locked previews.
  - App: pushed screens have a single nav bar (spec 01 §1.3).
  - Suggest `compactHeader: isTabRoot(pathname)`. Keep the banner (DECISIONS §12). Owner: shell.
- **e. Gap before the extras.**
  - `.ia-rs-article { padding-bottom: 40px }` (`research.css:218`) sets the gap before the extras.
  - Use 32 (`--ia-gap-article`) to keep the article's block rhythm (`ClarityReader.swift:156`).

---

## 3. Deliberate deviation noted (no action unless the owner disagrees)
- **Locked toolbar without the «Разбор» title** (`ArticleChrome.tsx:206-214`). The code comment says why: the transparent glass toolbar has no bar behind a centred title. The app shows «Разбор» inline (`ClarityContentAccess.swift:117`). Acceptable.
- **Search debounce** of 180 ms with a server round-trip (`CatalogSearch.tsx:14`), no scroll-to-top on query change (`ClarityCatalogs.swift:81`). Allowed by spec 09 §331-333.

## 4. Verified as matching (by code, and in the rendered HTML where noted)

**Catalog**
- Order: heading → search → «Найдено» (untrimmed, subheadline secondary) → empty `clarityCard` → cards (`ClarityCatalogs.swift:43-66`).
- 35 cards in LaunchEdition order (HTML).
- The empty state shows for `?q=zzzqqq` and hides the soon block.

**Catalog card** (`ClarityCatalogs.swift:89-157`):
- r28, 1 px line@65 %, shadow `0 6 32 / .055`;
- 3:2 art, unrounded, clipped;
- body padding 22 / gap 10;
- title Georgia 22/27, outline lock 15 secondary on the first baseline;
- summary sans 17/26 secondary;
- «Бесплатный разбор» 12/600, 7×12, +5, also shown to Plus viewers.

**Article order** (`ClarityReader.swift:156-190`): hero → cover → «Главное» → «Какие задачи решают люди» → sections → «Другие возможности» / «Другие идеи категории» (conditional) → conclusion. Container: 32 gap, 22 gutters, 640 column.

**Hero:**
- Georgia 30 / lead 20 secondary, gap 18, padding-block 4.
- Description = summary + corpus sentence; ru plurals and NBSP thousands verified («…Мы изучили 18 442 отзыва о работе 61 приложения.»), ja word order verified.

**Sections and observations:**
- `ArticleSection` = 1 px rule + 4 + gap 20 + 22/600 sans.
- `ArticleText`: Georgia 19/27.6, gap 20, lead first paragraph 20/28.7, reflow > 430 → ≤ 360 by sentences (`content/text.ts:127-165`).
- Observation: gap 18, 32 + 1 + 32 dividers, passage / quote / image-after-index-0 interleave (`ResearchArticle.tsx:142-164`).
- Placement: title only when it has no ideas, body, 12 top padding, 18 gap.
- Quote: 2 px rule, 10/18, 8 outer, Georgia 20/29.7 ink.

**TOC:**
- Items and depth match `contentsItems` (`ClarityReader.swift:131-151`; checked against `interior-design.json` toc).
- Row style: 17/600 depth 0, 17/400 depth 1 indented 14, 11 px padding.
- «Содержание» sheet on reading paper with «Готово».
- Jump after the sheet closes, smooth unless Reduce Motion; anchors have `scroll-margin-top`.

**Toolbar:** «Назад» glass pill 17/500; trailing bookmark · `list` · ⋯ in 38×44; the ⋯ menu has exactly one item «Заметка к разбору»; no share.

**Locked preview** (`ClarityContentAccess.swift:68-122`):
- cover → `ClarityHeading` (summary only, no corpus sentence) → card (lock label 17/600 · 17/26 secondary body · primary capsule · free-sample link) → «Моя заметка к материалу»;
- gap 24 / 16; no bookmark, TOC or menu.

**Access and missing material:**
- 404 renders «Материал недоступен» (`shell/StatusViews.tsx:15-31`).
- Floating tab bar only on `/segment` (HTML).
- No paid text in locked HTML (checked).
