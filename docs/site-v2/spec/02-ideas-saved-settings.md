# 02 — Ideas tab, idea reader, compare, Saved (library), notes, export, settings

Source of truth: live iOS app `/Users/artsaverin/projects/app_04_inapp/Inapp/` (Clarity shell, entry `App/RootView.swift` → `ClarityRootView`).
All paths below are relative to `Inapp/` unless they start with `Documentation/`, `InappUITests/` or `/`.
Research date: 2026-09-22. Where code and docs disagree, this spec follows the code (§11 lists the differences).

**Status labels used in this document**

| Label | Meaning |
|---|---|
| **LIVE** | Reachable in the shipped Clarity UI. Build it for parity. |
| **LEGACY (read-only)** | Only shown when a user has data created by pre-Clarity versions of the iOS app. Clarity cannot create it. A new web user can never have it unless an import exists. |
| **DORMANT** | Code exists but no screen links to it. UI tests assert it is absent. |

---

## 0. Key facts (read first)

1. **Three tabs**: `Разборы` (research) · `Идеи` (ideas) · `Сохранённое` (saved). Settings is **not a tab**. It opens from a gear button in the Saved header (`Clarity/ClarityRoot.swift:57-71`, `Clarity/ClarityMy.swift:92-95`).
2. **Ideas catalogue = 293 ideas** from 35 "launch edition" categories (`Content/LaunchEdition.swift:6-18`). The archive has 592 ideas and 72 categories. Archive ideas are never listed, but saved links to them still open.
3. **Free access = one category + 5 ideas.** The free category is `interior-design`. The free ideas are `interior-design-1` … `interior-design-5`, hard-coded (`Clarity/ClarityContentAccess.swift:6-7`). Everything else requires Plus.
4. **Locked idea cards show artwork only.** They have a lock badge and no title, description or category. This applies both on screen and in the accessibility tree (`Clarity/ClarityIdeaCard.swift:3,28-35`). Free users' search never matches locked ideas (`Clarity/ClarityCatalogs.swift:171-174`). Tapping a locked card opens the paywall directly.
5. **Idea reader**: all 293 launch ideas have a valid block-based article (`idea-articles.<lang>.json`). The article layout is therefore the one that actually ships. An older sectioned "fallback" layout exists only for archive ideas (§3.5).
6. **Idea reader actions**:
   - Bookmark (toolbar).
   - `…` menu: `Записать мысль`, `Скачать документ`.
   - Footer: `Читать разбор категории`, `Записать свою мысль`, `Скачать документ`.
   - There is **no share-link action and no compare action** on ideas.
7. **Compare is DORMANT.** `ClarityComparisonPicker` and `ClarityCompareView` (an app-vs-app comparison) are never instantiated. UI tests assert that `rating-compare` is absent (`InappUITests/ClarityUITests.swift:959,974`). Saved still lists a legacy read-only section `Сравнение идей` (idea slugs stored by the old Studio UI).
8. **Saved** has 4 filter chips: `Всё / Разборы / Идеи / Заметки`, plus search. Clarity can only create bookmarks of **research** and **ideas**, and **notes** on idea/research/problem. Problems, apps, cards, projects and idea comparisons are LEGACY.
9. **Notes** are one plain-text note per material, keyed `"<kind>:<slug>"`. They have no timestamps and no free-standing notes. Saving a note auto-bookmarks the material. Removing a bookmark never deletes the note.
10. **Export** produces one UTF-8 `.txt` file with three parts: full category research, full idea, and the user's note. It is available for every idea the user can read. **There is no quota in Clarity.** The `Shelf.freeExports = 2` quota is legacy and unused (§7.1).
11. **Settings**, in order:
    - Plus card
    - (`Управление подпиской`)
    - `Восстановить покупки`
    - `Язык` (5 locales)
    - `Оформление` (Светлая / Тёмная / Системная, with live previews; **default is light**)
    - `Приложение`: `О материалах` / `Знакомство с приложением` / `Написать разработчику`
    - (DEBUG `Разработка`)
    - `Правовая информация`: `Конфиденциальность` / `Условия использования`
    - Footer: version + "stored on this iPhone"

    There is no text-size, no reset-data and no motion toggle.
12. **Everything personal is stored locally** (UserDefaults) with no account and no sync. On the web this is a product decision (see §12).
13. **The shipped iOS app hard-links to the current site.** It uses `https://inapp.pro/{ru|en}/offer` and `https://inapp.pro/{ru|en}/contacts` (`Strings/Strings.swift:269-276`). These URLs **must keep working** after the old site moves under `/old`.

---

## 1. Shared building blocks

### 1.1 Palette (light / dark)
From `Studio/StudioStyle.swift:5-21`, `Clarity/ClarityStyle.swift:3-18` and `Clarity/ClarityReadingStyle.swift:6`. These match the table in `Documentation/LibraryRefresh-2026-09-20/README.md:9-19`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `paper` (catalogue background) | `#F5F5F7` | `#111214` | Tab screens, settings |
| `readingPaper` (article background) | `#FCFCFD` | `#17181B` | Idea reader, note editor, export sheet |
| `surface` | `#FFFFFF` | `#1D1E22` | Cards, search field, grouped lists |
| `ink` | `#191A20` | `#F2F2F5` | Primary text |
| `secondary` | `#666872` | `#AAADB8` | Secondary text, inactive chips/icons |
| `accent` | `#3458DB` | `#94AAFF` | Selected chip text, links, checkmarks, lock icon |
| `action` (primary button bg, text white) | `#3458DB` | `#3458DB` | Primary buttons |
| `accentSoft` (= `sky`) | `#EDF1FF` | `#262D45` | Selected chip bg, number circles, empty-state icon tile, Plus band |
| `soft` | `#EBECF0` | `#28292F` | Idea-art fallback background |
| `line` | `#DEDFE5` | `#383A42` | Borders, dividers (usually at 55–65% opacity) |
| `danger` (= `coral`) | `#C0443F` | `#F4928C` | Persistence-error labels in Saved |

### 1.2 Typography
Source: `Clarity/ClarityReadingStyle.swift:12-19`. All sizes scale with Dynamic Type; on the web use relative units.

| Role | Font | Size (pt) |
|---|---|---|
| `title` (screen/article H1, `ClarityHeading`) | Georgia | 30 |
| `lead` (article subtitle, first paragraph of a "lead" text) | Georgia | 20 |
| `body` (article paragraphs, heading subtitle, card description) | Georgia | 19, line spacing +5…6 |
| `quote` | Georgia | 20, line spacing +7 |
| `cardTitle` (idea card title, article "idea" inset title) | Georgia | 22 |
| `sectionTitle` (article H2) | System | title2 (≈22) semibold |
| `subheading` (H3, reader footer actions) | System | headline (≈17) semibold |
| `caption` | System | footnote (≈13) |

UI chrome (chips, rows, settings) uses the system sans font (SF). Saved uses a `largeTitle` (≈34) bold header with tracking −1.

### 1.3 Reusable components

| Component | Spec | Source |
|---|---|---|
| `ClarityHeading` | Title (Georgia 30) plus an optional subtitle (Georgia 19, secondary), 10 pt gap, left-aligned. | `Clarity/ClarityStyle.swift:114-127` |
| `ClaritySearch` | Search field on `surface`, radius 16, min height 56, horizontal padding 18. Contains: magnifier icon (secondary), text input (placeholder in secondary, autocorrect off, Enter = submit + blur), and a clear button ⓧ (a11y `Очистить поиск` / "Clear search") shown when not empty. | `Clarity/ClarityStyle.swift:129-146` |
| `ClarityButton` (primary) | Full-width capsule on `action`, white `headline` text, optional trailing icon, padding 18×20, press scale 0.97. | `Clarity/ClarityStyle.swift:90-103` |
| `clarityCard()` | Padding 22, `surface`, radius 20, border `line`@55% 0.5 pt. | `Clarity/ClarityStyle.swift:105-112` |
| `ClarityRow` | 48×48 icon tile (`accentSoft`, radius 16) + title (headline) + optional subtitle (subheadline, secondary). | `Clarity/ClarityStyle.swift:148-162` |
| `ClarityArticleSection` | Divider (`line`), H2 (`sectionTitle`), content; 20 pt spacing. | `Clarity/ClarityReader.swift:745-761` |
| `ClarityArticleText` | Splits text into paragraphs (see *paragraph reflow* below). If `lead=true`, the first paragraph uses the `lead` font. Selectable text. | `Clarity/ClarityReader.swift:763-775` |
| `ClarityArticleBullets` | 5 pt ink dot + `ClarityArticleText` per item, 16 pt gap. | `Clarity/ClarityReader.swift:777-789` |
| `ClarityQuoteBlock` | `quote.opening` glyph (caption, secondary), then the quote text in Georgia 20, selectable. **App name and rating are NOT displayed**, even though they are passed in. | `Clarity/ClarityReader.swift:858-876` |
| `ClarityMaterialSave` | Bookmark toggle icon (see §5.4). | `Clarity/ClarityReader.swift:796-812` |
| Back button | Pushed screens replace the arrow with a text button `Назад` (en "Back"). Edge-swipe back still works. | `Clarity/ClarityBackNavigation.swift:5-21` |

**Paragraph reflow** (`Clarity/ClarityReader.swift:45-62`):
1. Apply ru editorial corrections (§9.3).
2. Replace NBSP with a space.
3. Split on blank line (`\n\n`) and trim; drop empty paragraphs.
4. Any paragraph longer than 430 chars is split at sentence boundaries into chunks that start a new chunk once they would exceed 360 chars.

Quotes bypass the reflow.

**Quote text** (`Content/QuoteReading.swift:17-25`):
- Use the first non-empty of `quote-translations.<lang>.json.translations[original]`, then the translation field supplied by the data. Otherwise use the original.
- This pack exists only for ru/de/fr/ja and **does not fall back to another language**. With `en`, the English original is shown.

**Search matching** (`StudioContent.matches`, `Studio/StudioDomain.swift:79-82`):
- Split the query on whitespace into tokens.
- **Every** token must be contained in **at least one** field.
- Matching is case-insensitive, diacritic-insensitive and locale-aware (`localizedStandardContains`).
- An empty query matches everything.

### 1.4 Access rules
Source: `Clarity/ClarityContentAccess.swift:5-20`.

```
freeCategory = "interior-design"
freeIdeaIDs  = ["interior-design-1","interior-design-2","interior-design-3","interior-design-4","interior-design-5"]
canReadIdea(id)        = isPlus || id ∈ freeIdeaIDs
canRead(category)      = isPlus || category == freeCategory
```

- Research on `interior-design` is fully free. Its ideas `interior-design-6..8` are still locked.
- **Principle (must hold on the web):** "The full reader is constructed only after access is granted. A lock is not a blur over loaded article text" (`Clarity/ClarityContentAccess.swift:22-23`). Likewise, "Paid ideas expose only artwork. Their text is not in the view or accessibility tree" (`Clarity/ClarityIdeaCard.swift:3`).
- The UI test `testPaidIdeaDescriptionsRequirePlusEverywhere` asserts that the paid description is absent from the whole accessibility dump (`InappUITests/ClarityUITests.swift:1502-1560`).
- **Web requirement:** never send a paid idea's title, description or article to a non-Plus client (HTML, JSON or search index).

---

## 2. «Идеи» tab (LIVE)

View: `ClarityIdeasCatalogView` (`Clarity/ClarityCatalogs.swift:159-230`). Tab item: `Идеи` / icon `lightbulb.fill` (`Clarity/ClarityFloatingTabBar.swift:11-15`).

### 2.1 Data per idea

| Field | Source file | Notes |
|---|---|---|
| `slug`, `category`, `rank`, `quote`, `quotes[] {text, app, rating, lang}` | `Resources/facts.json` (locale-independent) | `rank` is a unique integer (curated order) |
| `categoryName` | `text.<lang>.json.categories[category]` | Also the niche name used in the category picker |
| `text.title`, `oneLiner`, `gap`, `pitch`, `features[]`, `antiFeatures[]`, `monetization` | `text.<lang>.json.ideas[slug]` | `text.title` ≠ card title for 292 of 293 ideas (ru) |
| Card `title`, `description` | `idea-cards.<lang>.json.ideas[slug]` (293 entries) | Fallback: `text.title` / `oneLiner` (`Clarity/ClarityIdeaCardArt.swift:4-16`) |
| Article `{title, description, blocks[]}` | `idea-articles.<lang>.json.articles[slug]` (v1, 293 entries, all valid in all 5 locales) | See §3.4 |
| Editorial context `{audience, currentApproach, openQuestion, validation, kind, canonicalSlug, relationship, paymentReviewed}` | `research-idea-contexts.<lang>.json` overrides `editorial-reading.<lang>.json` (`Content/EditorialContent.swift:35`) | Only `.ru` files exist, so other locales fall back to Russian (§11) |
| Enrichment `buyer` | `Resources/studio.json.ideas[slug].buyer` (ru only) | Search field + fallback reader |
| Cover | Asset `EditorialIdeaCover_<slug>` (285 launch ideas), else `IdeaCover_<slug>` (8), else a category object | §2.6 |

- Locale fallback chain for packs: `[locale, en, ru]` (`Content/AppLocale.swift:62-72`).
- UI strings fall back ru→(none), others→en (`Strings/UIStrings.swift:31-36`).

### 2.2 Which ideas are listed
Source: `Clarity/ClarityCatalogs.swift:168-184`.

1. Take all ideas whose `category ∈ LaunchEdition.categories` (35 slugs, `Content/LaunchEdition.swift:6-18`). That gives 293 ideas.
2. Apply the category filter and search (§2.4–2.5).
3. Sort (§2.3).
4. `canonicalIdeas`: replace an idea by its `canonicalSlug` target, then de-duplicate (`Clarity/ClarityReader.swift:7-17`). An idea in the launch edition is **not** redirected to a canonical target outside the launch edition. In the current data this makes the step a no-op: the only launch redirect is `photo-editing-2` → `ai-photo-restore-1`, and that target is outside the edition.
5. Keep launch-edition categories only.

### 2.3 Sorting (no user-facing sort control)
Source: `Clarity/ClarityCatalogs.swift:175-182`.
- **Free user:** the 5 free ideas first, in the order of `freeIdeaIDs`. Then every other idea by `rank` ascending, with `slug` ascending as the tie-breaker.
- **Plus user:** `rank` ascending, then `slug`.

Resulting order today:

| # | Free user (ru card title) | Plus user (ru / en) |
|---|---|---|
| 1 | interior-design-1 «Новая комната. Те же стены.» | photo-editing-1 «Убрать лишнее с фото» / "Remove clutter from a photo" |
| 2 | interior-design-2 «План с точными размерами» | calendars-tasks-2 «Что поместится между встречами?» / "What will fit between the meetings?" |
| 3 | interior-design-3 «Поместится ли новый диван?» | nutrition-calories-1 «Еда рядом с графиком глюкозы» |
| 4 | interior-design-4 «Из картинки — в список покупок» | habit-tracking-1 «Продолжить после пропуска» |
| 5 | interior-design-5 «Примерить цвет до ремонта» | personal-finance-1 «Записать покупку. Увидеть остаток.» |
| 6 | photo-editing-1 (locked: art only) | photo-editing-6 … |

### 2.4 Search
- Field: `ClaritySearch`. Placeholder `Идея или потребность` / "Idea or need" (`Clarity/ClarityCatalogs.swift:192`).
- Filtering is live on every keystroke. There is no minimum length and no debounce.
- When the trimmed query is non-empty, an idea matches only if **both** conditions hold (`Clarity/ClarityCatalogs.swift:171-174`):
  - The idea is **readable** (`canReadIdea`). Locked ideas disappear while searching. This is the intended "no leaking of hidden titles".
  - `matches(query, [cardTitle, cardDescription, text.title, text.title, oneLiner, categoryName, editorialContext.audience ?? studio.buyer ?? ""])`.
- Search combines with the category filter (AND).
- Changing the query scrolls the list to the top (`Clarity/ClarityCatalogs.swift:222`).
- The keyboard is dismissed on scroll.
- No result counter is shown on Ideas. (The research catalogue shows `Найдено: N`; Ideas does not.)

### 2.5 Category filter
**Trigger pill** (`Clarity/ClarityCatalogs.swift:194-213`):
- Surface capsule, padding 13×17, placed below the search field.
- Text: the selected niche name, or `Все категории` / "All categories". Trailing icon `line.3.horizontal.decrease`.
- At accessibility text sizes it becomes a full-width card: the name, then a second line `Выбрать категорию` / "Pick a category" with the same icon.

**Picker** (`ClarityTopicPicker`, `Clarity/ClarityCatalogs.swift:244-274`). Opens in a modal sheet.

| Element | Value |
|---|---|
| Title | `Категория` / "Category" |
| Top-right button | `Готово` / "Done" (closes without changing) |
| Search | `Найти категорию` / "Search categories". Single substring match on the niche name (`localizedStandardContains`, not tokenised). |
| Row 1 | `Все категории` → selection = none |
| Rows | The 35 launch niches, sorted by localized name (`localizedStandardCompare`). Label = `categoryName`. |
| Selected row | Trailing checkmark (ink) |
| Tap row | Set the selection **and close** the sheet immediately |

- Changing the category scrolls the list to the top (`Clarity/ClarityCatalogs.swift:223`).
- **Persistence: none.** Both category and query are in-memory state (`@State`). They survive tab switches while the screen stays mounted, but reset on relaunch.

### 2.6 Screen layout & card anatomy

Screen (`Clarity/ClarityCatalogs.swift:186-229`):
- Background `paper`. Content column max-width 680, centred, padding 20, 14 pt vertical gap. No navigation bar.
- Order:
  1. `ClarityHeading`: title `Идеи` / "Ideas". Subtitle: Plus → `Что можно создать или улучшить.` / "What could be built or improved."; free → `5 идей бесплатно. Остальные — в Plus.` / "5 ideas for free. The rest with Plus."
  2. Search.
  3. Category pill.
  4. Empty state (only if there are no results).
  5. Cards.
- A floating tab bar overlays the bottom. Cards scroll underneath it.

**Unlocked card** (`Clarity/ClarityIdeaCard.swift:20-67`). The whole card is one button.

```
┌──────────────────────────────┐  surface bg, radius 24, border line@65% 0.7pt,
│  ARTWORK 3:2 (radius 20)     │  shadow black 5% blur 14 y 6, bottom margin 6
│                              │
├──────────────────────────────┤
│  Title (Georgia 22)          │  padding 20, 15pt gaps
│  Description (Georgia 19,    │
│  secondary, line +5)         │
│  CategoryName (footnote,     │  7pt extra top
│  secondary)                  │
└──────────────────────────────┘
```

- a11y label: `"{title}. {description}"`. Hint: `Открыть полную идею в отдельном окне.` / "Open the full idea in a separate window."

**Locked card** (`Clarity/ClarityIdeaCard.swift:27-35,70-71`):
- Artwork only. **No text block at all.**
- Bottom-right badge: `lock.fill` (accent, body semibold) in a `surface` circle with padding 14, inset 16 from the corner.
- a11y label: `Идея в Plus` / "Idea in Plus". Hint: `Подробности идеи доступны в Plus.` / "The details of the idea are in Plus."

**Artwork resolution** (`Clarity/ClarityIdeaCardArt.swift:20-55`):
- Aspect ratio 1.5, clipped to radius 20, `object-fit: cover`.
- Resolution order:
  1. `EditorialIdeaCover_<slug>`
  2. `IdeaCover_<slug>`
  3. Fallback: the category object image from `Resources/studio-art.json.categories[category]` (default `StudioObject_led_light_bulb`), `object-fit: contain`, padding 14% of height, on a `soft` background.
- All 293 launch ideas have a cover.
- The old site's `public/idea-covers/` has 253 of the 293 launch slugs. Export the images from `Inapp/Resources/Assets.xcassets/*IdeaCover_*.imageset/` instead.

### 2.7 Tap behaviour & the "5 free ideas" rule
Source: `Clarity/ClarityIdeaCard.swift:21,73-90`.
- **Locked card tap → paywall sheet** (`ClarityPaywallView`, spec elsewhere). The idea reader is **not** opened.
  - After closing the paywall without buying, the user returns to the list.
  - If a purchase succeeds, the card re-renders unlocked, because access is reactive.
- **Unlocked card tap → idea reader in a modal sheet** at full height with a drag indicator. The sheet hosts its own navigation stack:
  - Top-left `Готово` / "Done" closes the sheet.
  - Links inside the reader (e.g. research) push **inside the sheet**.
- The same `ClarityIdeaCard` component (same behaviour) is used inside research articles (`Clarity/ClarityReader.swift:299-301,411-415`). So `interior-design-6..8` appear locked inside the free interior research.

### 2.8 Empty state
Source: `ClarityCatalogEmpty`, `Clarity/ClarityCatalogs.swift:232-242`. A card with:
- `Пока ничего не нашлось` / "Nothing found yet" (headline)
- `Попробуй название категории или более короткий запрос.` / "Try a category name or a shorter query." (subheadline, secondary)

Shown whenever results are empty. This includes a free user who searches for a paid idea.

---

## 3. Idea reader (LIVE)

Views: `ClarityIdeaView` → `ClarityContentGate` → `ClarityIdeaContentView` (`Clarity/ClarityReader.swift:460-600`).

### 3.1 Entry points & presentation

| From | Presentation | Leading button |
|---|---|---|
| Ideas list card / research-article idea card (readable) | Modal sheet, full height | `Готово` |
| Saved → idea row, Saved → "Сравнение идей" row, stored project → `Открыть исходную идею`, legacy card → `Открыть идею` | Push inside the Saved tab's stack (`ClarityRoute.idea(slug)`); tab bar hidden | `Назад` |
| Fallback-layout `Связанное решение` link | Push | `Назад` |

- Navigation title (centred, inline): `Идея` / "Idea" (`Clarity/ClarityReader.swift:570`).
- Background `readingPaper`. Content column max-width 640, horizontal padding 22, vertical padding 24, extra bottom padding 32. Sections are 32 pt apart.
- **Web suggestion (not parity-critical):** a URL like `/{locale}/ideas/{slug}`. From the list it renders as a modal over the list, and as a full page on direct load.

### 3.2 Locked state (gate)
Source: `Clarity/ClarityContentAccess.swift:68-122`.

Reached only via the paths above: a saved idea whose Plus expired, a deep link, or a legacy row. The catalogue never opens it, because locked cards go straight to the paywall.

Layout (padding 22, max-width 640, background `paper`, nav title `Идея`):
1. Idea artwork (same as the card).
2. **No title or description** for ideas. (For research gates, a `ClarityHeading` with the niche name and summary is shown instead.)
3. Card (`clarityCard`), containing:
   - Label with a `lock` icon: `Идея доступна в Plus` / "The idea is available in Plus" (headline). The research variant reads `Полный материал в Plus`.
   - Body: `Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом.` / "Open the solution, the evidence behind it and the full category breakdown. All of it saves as one document." (Research variant: `Все разборы и идеи — в одной подписке.`)
   - Primary button `Открыть все материалы` / "Unlock all materials" → paywall sheet.
   - Plain link `Сначала прочитать бесплатный разбор` / "Read the free breakdown first" → pushes the research reader for `interior-design`.
4. Plain button with `square.and.pencil` icon: `Моя заметка к материалу` / "My note on the material". It opens the note editor (§5.2) with title `Идея в Plus`. **Notes are allowed on locked items.**

- **No bookmark button** in the locked state.
- When Plus becomes active, the paywall sheet auto-closes (`Clarity/ClarityContentAccess.swift:63-65`) and the full reader replaces the gate in place.

### 3.3 Toolbar (unlocked)
Source: `Clarity/ClarityReader.swift:572-580`. Two trailing items, left to right:

1. **Bookmark**: icon `bookmark` or `bookmark.fill`.
   - a11y label `Сохранить` / `Убрать из сохранённого` ("Save" / "Remove from Saved").
   - a11y value `Не сохранено` / `Сохранено`.
   - Toggles the idea in the idea shelf (§6.1).
2. **`…` menu**, a11y `Действия с идеей` / "Idea actions":
   - `Записать мысль` / "Write a thought" (`square.and.pencil`) → note editor
   - `Скачать документ` / "Download the document" (`doc.text`) → export sheet

Icons are 17 pt medium in 38×44 hit areas (`Clarity/ClarityReader.swift:791-794`).

### 3.4 Article layout — the shipped layout for all 293 launch ideas
Sources: `Clarity/ClarityReader.swift:490-492,602-656`, `Content/IdeaArticles.swift`.

**Article validity** (otherwise fall back to §3.5), from `Content/IdeaArticles.swift:29-45`:
- `title` and `description` are non-empty.
- `blocks` is non-empty, and block ids are unique and non-empty.
- `paragraph`/`heading` blocks have non-empty `text`.
- `idea` blocks have non-empty `title` and `text`.
- `quote` blocks have a `quoteIndex` that resolves in `idea.quotes` (or `[idea.quote]` when `quotes` is empty).
- The pack must be `version == 1`.

**Order:**
1. **Hero** (`ClarityArticleHero`, `Clarity/ClarityReader.swift:719-743`):
   - `article.title` in Georgia 30.
   - `article.description` in Georgia 20, secondary, selectable, 18 pt below the title.
2. **Blocks, in array order**, 24 pt apart:

| `kind` | Render | Fields |
|---|---|---|
| `paragraph` | `ClarityArticleText` (body, reflow) | `text` |
| `heading` | `sectionTitle` (title2 semibold), 16 pt extra top margin | `text` |
| `quote` | `ClarityQuoteBlock` with a 2 pt `line` rule on the left, left padding 18, vertical padding 8. Text comes from `idea.quotes[quoteIndex].text` via QuoteReading. | `quoteIndex` |
| `idea` (inset; 4 occurrences in the whole corpus) | Card: `accentSoft` background, radius 12, padding 20. A 3 pt accent bar runs along the left edge, inset 20 pt top/bottom. Contains the title (Georgia 22, header) + `ClarityArticleText(text)`. Vertical margin 4. | `title`, `text` |

Corpus totals (ru): 888 paragraphs, 588 headings, 294 quotes, 4 idea insets.

3. **Footer actions** (§3.6).

There is no "Из отзывов" section, no category label and no metadata in the article layout. Quotes appear only where the blocks place them.

### 3.5 Fallback sectioned layout — archive ideas only (LEGACY-ish)
Source: `Clarity/ClarityReader.swift:493-542,586-599`.

Used when `IdeaArticles.article(for:)` is nil. In the current data this happens **only for non-launch archive ideas** (reachable from old bookmarks). Sections appear in this order; each is an `ClarityArticleSection` (divider + H2):

| # | Section title (ru / en) | Content | Shown when |
|---|---|---|---|
| 0 | Hero | Card title + card description (both fall back to text.title / oneLiner) | always |
| 1 | `Кому пригодится` / "Who it’s for" | `context.audience` ?? `studio.buyer` | non-empty |
| 2 | `Что не получается сейчас` / "What doesn’t work today" | `text.gap`. Then, if `context.currentApproach` exists: subheading `Как решают сейчас` / "How it’s solved today" + that text | always |
| 3 | `Как это может работать` / "How it could work" | `text.pitch` + bullets `text.features` | always |
| 4 | `Границы первой версии` / "Limits of the first version" | bullets `text.antiFeatures` | non-empty |
| 5 | `Что проверить первым` / "What to test first" | `context.openQuestion` (lead font) + `context.validation` | either non-empty |
| 6 | `Возможная модель оплаты` / "A possible payment model" | `text.monetization` | `context.paymentReviewed == true` and non-empty |
| 7 | `Связанное решение` / "A related solution" | `context.relationship` text + link row to the canonical idea. The link label is the canonical idea's card title, or `Идея в Plus` if the user can't read it. | `canonicalSlug` set and ≠ current slug |
| 8 | `Из отзывов` / "From reviews" | Quote blocks separated by dividers (`quotes`, else `[quote]`). If there are none: `Отдельные цитаты к этой идее не приложены. Контекст доступен в разборе ниши.` | always |

Then the footer (§3.6).

### 3.6 Footer actions (both layouts)
Source: `Clarity/ClarityReader.swift:543-564`.

- A divider, then 3 left-aligned rows.
- Font: `subheadline` style = headline semibold. Min height 44. Icon is leading.

| Row | Icon | Label (ru / en) | Action |
|---|---|---|---|
| 1 | `text.book.closed` | `Читать разбор категории` / "Read the category breakdown" | Push the research reader for `idea.category` (the research spec covers it; it is gated by category access) |
| 2 | `square.and.pencil` | `Записать свою мысль` / "Write down your thought" | Note editor (§5.2) |
| 3 | `doc.text` | `Скачать документ` / "Download the document", with a second line (subheadline, secondary): `Полный разбор категории, идея и твоя заметка — в одном файле.` / "The full category breakdown, the idea and your note — in one file." | Export sheet (§7) |

### 3.7 Action matrix for an idea

| Action | Where | Notes |
|---|---|---|
| Save / unsave | Toolbar bookmark; also implicit on note save | Idea bookmarks live in `Shelf.saved` |
| Note | `…` menu, footer row 2, locked gate, Saved row menu | §5 |
| Export | `…` menu, footer row 3 | §7 |
| Open related research | Footer row 1 | Also `Связанное решение` in the fallback layout |
| Compare | **none** | DORMANT (§4) |
| Share link / share text | **none** | The only sharing is "Поделиться" of the exported .txt file (§7.5) |

### 3.8 Missing material
Source: `ClarityMissingMaterial`, `Clarity/ClarityReader.swift:814-818`. Used for an unknown slug. It is a system "unavailable" view:
- Icon `doc.text.magnifyingglass`
- Title `Материал недоступен` / "Material unavailable"
- Text `Вернись в каталог и выбери другой материал. Сохранённые записи остаются на устройстве.` / "Go back to the catalog and pick another material. Saved entries stay on the device."

---

## 4. Compare

### 4.1 Status: DORMANT
- `ClarityComparisonPicker` and `ClarityCompareView` (`Clarity/ClarityCompareView.swift`) are declared but **never instantiated**. The only reference to `ClarityCompareView` is inside the picker itself.
- The rating surfaces that would host them (`ClarityRatingsView`, `ClarityScenarioView`) are also unreachable: the `.ratings` and `.scenario` routes resolve to the research reader (`Clarity/ClarityRoot.swift:124,126`).
- UI tests assert that no `rating-compare` control exists (`InappUITests/ClarityUITests.swift:953-975`).
- `Documentation/Clarity/README.md:37` confirms: "Общие баллы, числовые сравнения и рейтинг приложений не показываются в активном маршруте."

**Recommendation:** do not build compare for parity. If the owner wants it, use §4.2.

### 4.2 What the dormant code does (for reference only)
It compares **two apps from the same category's rating list**. It does not compare ideas.

**Choosing the apps:**
- The first app is given by the caller. The second is picked in `ClarityComparisonPicker`, a sheet with nav title `Сравнение` and a `Готово` button.
- Heading: `С чем сравним?`. Subtitle: `Выбери второе приложение для сравнения с %1$@.` or `Выбери приложение из этой темы.`
- Search: `Название приложения`; it matches the app title or `whoFor`.
- Candidates: the category's `rating.apps` excluding the first app, sorted by title. Row = `ClarityRow(title, whoFor ?? "Посмотреть сравнение", icon app)`.
- Empty: `Пока нет подходящих результатов. Попробуй другое название.`
- The picker is gated by category access.

**Persistence:** none. The pair is passed as route parameters.

**Compare screen** (`ClarityCompareContentView`, nav title `Два приложения`):
1. Title `"%1$@\nи %2$@"`.
2. Intro: `Редакционный анализ сохранённых отзывов: задачи, положительный опыт и жалобы пользователей.`
3. Three paired cards: `Для каких задач` (`whoFor`), `Что хвалят в отзывах` (`loved`), `На что жалуются в отзывах` (`weak`). Each card shows app A's name + text, a divider, then app B's name + text. Missing text → `В подборке пока нет описания по этому пункту.`
4. `Оставь в своём списке`: two save cards (bookmark icon, app title, `В сохранённом` / `Сохранить приложение`). These toggle **saved apps** (§6.1).
5. `Посмотреть основания` card: per app, a link `Отзывы на сайте` → `https://inapp.pro/ru/reviews/{category}/{appId}` (hard-coded `ru`), plus a "Источник и исправления" source sheet.

If either app is missing: `Сравнение недоступно` / `Одно из приложений больше не входит в эту подборку. Вернись и выбери другое.`

### 4.3 LEGACY «Сравнение идей»
- Data: `StudioWorkspace.comparison` holds up to 3 idea slugs, stored under `inapp.studio.workspace.v1` (`Studio/StudioDomain.swift:150-209`). The prefix-3 cap is enforced on load (`:169`), and adding a 4th is rejected (`:199-209`).
- Created only by the pre-Clarity Studio UI (`Studio/StudioDetails.swift:196`). Clarity has no add or remove control.
- Displayed read-only in Saved (§6.5).

---

## 5. Notes (LIVE)

### 5.1 Model
Source: `Studio/StudioNotebook.swift:5-143`.

- **Material reference** = `{kind, slug}`, where `kind ∈ {idea, problem, research}`. `id = "<kind>:<slug>"`.
- **One note per material.** Plain text with no formatting, no title and no timestamps. Notes are stored as a dictionary `notes["<kind>:<slug>"] = text`.
- **No free-standing notes.** A note always belongs to a material. (Legacy stored projects have their own `note` field, §6.9.)
- Saving an empty or whitespace-only note **deletes** that entry (`Studio/StudioNotebook.swift:113-119`).
- Notes survive bookmark removal: they are stored separately from bookmarks (`Studio/StudioNotebook.swift:49-50`).
- "Noted materials" = all entries with non-blank text, **sorted by key string ascending**. In practice that means `idea:*` < `problem:*` < `research:*`, each ordered by slug (`Studio/StudioNotebook.swift:103-111`).
- A per-idea `decisions` map (`skipped|saved`) is also stored in the same archive but **unused by Clarity**.
- iOS storage: UserDefaults key `inapp.studio.notebook.v1`, JSON `{version:1, saved:[{kind,slug}], notes:{"idea:x": "..."}, decisions:{}}`.
  - This one archive also holds the **non-idea bookmarks** (`saved`). Idea bookmarks are never stored here (`Studio/StudioNotebook.swift:74-76,90-97`).
- **Corrupt archive:**
  - Writes are disabled and the data is kept.
  - Error text: `Не удалось прочитать заметки и дополнительные закладки. Исходные данные сохранены. Проекты и сохранённые идеи по-прежнему доступны.`
  - A failed write shows `Не удалось сохранить изменения. Текст остаётся на экране — попробуй ещё раз.`

### 5.2 Note editor
Source: `ClarityMaterialNote`, `Clarity/ClarityReader.swift:898-948`. Modal sheet with a navigation bar.

| Element | Value |
|---|---|
| Nav title | `Моя заметка` / "My note" |
| Leading | `Отмена` / "Cancel". Unchanged → close. Changed → confirmation dialog. |
| Trailing | `Сохранить` / "Save" (semibold). Disabled while a persistence error exists. |
| Content (bg `readingPaper`, padding 22×24, max-width 640, 22 pt gaps) | 1) Material title in Georgia 30. 2) Multi-line text field, placeholder `Что хочется запомнить или проверить?` / "What do you want to remember or check?". It shows 9 lines minimum, grows to 24, then scrolls. Padding 20, `surface` background, radius 26. 3) Persistence error text if any (subheadline, secondary). 4) Footnote `Заметка хранится на этом устройстве. Удаление материала из сохранённого не удаляет заметку.` / "The note is kept on this device. Removing the material from Saved does not delete the note." |
| Discard dialog | Title `Не сохранять изменения?` / "Discard changes?". Buttons: `Не сохранять` / "Don’t save" (destructive, closes), `Продолжить редактирование` / "Keep editing" (cancel). |
| Swipe/backdrop dismiss | Blocked while the text differs from the loaded value. Web: intercept Esc, backdrop and close actions the same way. |

- Pre-filled once on open with the existing note.
- **Save** (`Clarity/ClarityReader.swift:927-935`):
  1. Write the note (empty text deletes it).
  2. If the write failed, stay open.
  3. **Otherwise, if the material is not bookmarked, bookmark it.** Ideas go to `Shelf.saved`; others to `notebook.saved`. This happens even when the note was emptied.
  4. Close.

**Title passed by each caller:**

| Caller | Title shown |
|---|---|
| Idea reader | `idea.text.title` (NOT the card/article title; see §11 #6) |
| Research reader | Niche name |
| Problem reader | `problem.displayTitle` |
| Saved list | Row title (card title / niche name / `Идея в Plus`) |
| Locked gate (idea) | `Идея в Plus` |

### 5.3 Entry points to notes
- **Idea reader:** `…` → `Записать мысль`; footer `Записать свою мысль`.
- **Research reader:** `…` (a11y `Действия с разбором`) → `Заметка к разбору` (`Clarity/ClarityReader.swift:200-202`).
- **Legacy problem reader:** toolbar `square.and.pencil` (a11y `Заметка к наблюдению`).
- **Locked gate:** `Моя заметка к материалу`.
- **Saved:**
  - Row `…` → `Добавить заметку` / `Редактировать заметку`.
  - Tapping a row in the **Заметки** section opens the editor directly, not the material.
- **Legacy card reader** shows the note read-only in a `Твоя заметка к материалу` card (`Clarity/ClarityLegacyCard.swift:89-95`).

### 5.4 Bookmark (save) toggle rules
Sources: `Clarity/ClarityReader.swift:796-812`, `Store/Shelf.swift:46-54`, `Studio/StudioNotebook.swift:90-97`.

- **Ideas → `Shelf.saved`**:
  - A string array under UserDefaults `shelf.saved`, newest first (inserted at index 0).
  - Free and unlimited.
  - It can bookmark ideas the user can't read.
- **Research / problem → `notebook.saved`**, newest first. Disabled if the notebook archive is unreadable.
- A selection haptic fires on toggle. Web: none needed.

---

## 6. «Сохранённое» tab (LIVE + LEGACY sections)

View: `ClarityMyView` (`Clarity/ClarityMy.swift:10-269`). Tab item: `Сохранённое` / "Saved", icon `bookmark.fill`.

### 6.1 Stores read by this screen

| Store | iOS key | Shape | Created by Clarity? |
|---|---|---|---|
| Idea bookmarks | `shelf.saved` | `[slug]`, newest first | **Yes** |
| Research/problem bookmarks + notes | `inapp.studio.notebook.v1` | §5.1 | **Yes** (research bookmarks, notes); problems are legacy |
| Saved apps | `inapp.clarity.saved-apps.v1` | `[{category, appID, savedAt}]` newest first; `savedAt` is a Foundation `Date` (seconds since 2001-01-01) | **No.** The app screen is reachable only from this list (`Clarity/ClarityAppShelf.swift:4-18`) |
| Deck card bookmarks | `inapp.decks.reader.v1` | `{version:1, saved:[cardID], positions:{}}` | **No** (`Decks/DeckContent.swift:308-349`) |
| Projects + idea comparison | `inapp.studio.workspace.v1` | `{projects:[StudioProject], comparison:[slug≤3]}` | **No** |
| Export history (unused) | `shelf.exported` | `[slug]` | No (legacy quota) |

### 6.2 Item types

| Type | Section title | Status | Opens |
|---|---|---|---|
| Research (разбор) | `Разборы` / "Breakdowns" | LIVE | Research reader |
| Idea | `Идеи` / "Ideas" | LIVE | Idea reader (push) |
| Note (loose or all) | `Заметки` / "Notes" | LIVE | Note editor |
| Problem (observation) | `Проблемы` / "Problems" | LEGACY | `ClarityProblemView` (§6.9) |
| App | `Приложения` / "Apps" | LEGACY | `ClarityAppView` (§6.9) |
| Deck card | `Карточки` / "Cards" | LEGACY | `ClarityLegacyCardView` (§6.9) |
| Project | `Проекты` / "Projects" | LEGACY | `ClarityStoredProjectView` (§6.9) |
| Idea comparison | `Сравнение идей` / "Comparing ideas" | LEGACY | Idea reader |

Quotes and observations inside research **cannot** be saved individually in Clarity.

### 6.3 Screen layout
- Background `paper`. Column max-width 660, horizontal padding 20, top padding 24, bottom padding 28, 26 pt vertical gaps. No nav bar. (`Clarity/ClarityMy.swift:46-84`)
- **Header** (`:86-97`):
  - Left: `Сохранённое` (largeTitle bold, tracking −1). Subtitle (subheadline, secondary): `Твоя библиотека` / "Your library" when the library is empty, else `Материалы и личные заметки` / "Materials and personal notes".
  - Right: a 46×46 circular `surface` button with a 0.5 pt `line` border and `gearshape` icon. a11y `Настройки` / "Settings". Opens **Settings** as a modal sheet.
- **`total`** = idea bookmarks + research/problem bookmarks + saved apps + deck cards + projects + loose notes + comparison slugs (`:28`).
- **Empty library** (total == 0, `:112-127`). Search and filters are hidden. A `surface` card (radius 24, padding 24) shows:
  - A bookmark icon (30 pt light, accent) in a 64×72 `accentSoft` tile with radius 18.
  - `Пока нет сохранённого` / "Nothing saved yet" (title2 semibold).
  - `Нажми закладку в разборе или идее — материал появится здесь. Заметки к нему тоже.` / "Tap the bookmark in a breakdown or idea — the material shows up here. Its notes too."
  - Button with a leading `arrow.right` icon: `Открыть разборы` / "Open breakdowns". White on `action`, radius 14, min height 50. It **switches to the Разборы tab**.
- **Non-empty library:**
  1. Search `Найти в сохранённом` / "Search Saved".
  2. Filter chips.
  3. The no-results block, if applicable.
  4. Sections.
  5. Footer `Сохранено на этом iPhone` / "Saved on this iPhone" (footnote, secondary, centred), shown only if something matches.
  6. Error labels: one per failing store, icon `exclamationmark.circle`, `danger` colour, footnote.

### 6.4 Filters & search
- **Chips** (`:98-111`): `Всё` / "All", `Разборы` / "Breakdowns", `Идеи` / "Ideas", `Заметки` / "Notes".
  - Horizontal scroll, 6 pt gap.
  - Chip: subheadline semibold, horizontal padding 16, min height 44.
  - Selected: accent text on an `accentSoft` capsule. Unselected: secondary text, no background.
  - Default `Всё`. Not persisted (resets on relaunch).
- **Search** uses the §1.3 token matching. Fields per item type:

| Item type | Fields searched |
|---|---|
| Material (idea/research/problem) | Row title, row detail, the material's note (`:242`) |
| App | App title or niche name |
| Card | Card title |
| Project | Idea title or project note |
| Comparison | Idea title |

  Locked ideas are titled `Идея в Plus` with an empty detail, so a free user finds them only by that text or by their note.

### 6.5 Section visibility by filter
Source: `Clarity/ClarityMy.swift:56-68,172-218`. Sections render in this order and are hidden when empty.

| Section | `Всё` | `Разборы` | `Идеи` | `Заметки` |
|---|---|---|---|---|
| `Разборы` (research bookmarks) | ✓ | ✓ | – | – |
| `Идеи` (idea bookmarks) | ✓ | – | ✓ | – |
| `Заметки` | ✓ **loose notes only** (notes on materials that are NOT bookmarked) | – | – | ✓ **all notes**, including bookmarked materials |
| `Проблемы` (LEGACY) | ✓ | – | – | – |
| `Приложения` (LEGACY) | ✓ | – | – | – |
| `Карточки` (LEGACY) | ✓ | – | – | – |
| `Проекты` (LEGACY) | ✓ | – | – | – |
| `Сравнение идей` (LEGACY) | ✓ | – | – | – |

**Section chrome** (`:219-230`):
- Header row: the title in headline, then the item count (subheadline, monospaced digits, secondary).
- Rows sit in one `surface` container with radius 18.
- Between rows: a 0.5 pt `line`@65% divider inset 58 pt from the leading edge. There is no divider after the last row.

### 6.6 Row anatomy

**Material row** (research / idea / problem), from `:147-165` and `ClaritySavedRow` at `:271-305`:
- Padding 16, 12 pt gap, top-aligned.
- **Leading visual.** Hidden at accessibility text sizes.
  - Idea: its cover art, 88×66, radius 12. **Shown even when the idea is locked.**
  - Research: the category cover image (`ClarityResearchArtwork.article(for:).cover`), 88×66, radius 12.
  - Otherwise: the SF symbol for the kind (`lightbulb` / `doc.text` / `bubble.left`), accent, 26×28.
- **Title** (body medium).
  - Idea: card title, or `Идея в Plus` if locked, or `Идея недоступна` if the slug is unknown.
  - Research: niche name, or `Разбор недоступен`.
  - Problem: `problem.title`, or `Проблема недоступна`.
- **Detail** (caption, secondary).
  - Idea: `categoryName`, or **empty** if locked.
  - Research: `Разбор`.
  - Problem: `Проблема`.
- **Note preview**, if any (subheadline, secondary): max 2 lines, 3 at accessibility sizes, 3 pt top padding.
- **No chevron.** A trailing `…` button (44×48, secondary, a11y `Действия: %1$@`) opens the actions menu. The same menu is available on long-press or right-click.
- The row body navigates to the material.
- a11y label: `"{title}. {detail}"`, or `"{title}. {detail}. Есть твоя заметка. {note}"`.

**Row actions menu** (`:166-171`):
1. `Добавить заметку` / "Add a note" or `Редактировать заметку` / "Edit the note" (`square.and.pencil`) → note editor.
2. `Убрать из сохранённого` / "Remove from Saved" (`bookmark.slash`, destructive) → unbookmark immediately. There is no confirmation and no undo. The note is kept, so it then appears under `Заметки`.

**Note row** (`:58-66`):
- `ClaritySavedRow(title, detail = kind title (Идея|Разбор|Проблема), icon note.text, note preview)` **with a chevron**.
- Tap → note editor.

**Other row types:**

| Type | Icon | Title | Detail | Tap | Extra action |
|---|---|---|---|---|---|
| App row | `app` | App title, or `Приложение недоступно` | Niche name, or `Приложение` | App screen | Chevron; long-press `Убрать из сохранённого` |
| Card row | `rectangle.on.rectangle` | Card title (`Идея в Plus` if it is an unreadable idea card) | Empty for idea cards, else niche name or `Карточка` | Legacy card reader | Unresolvable card → non-tappable row `Карточка недоступна` / `Закладка сохранена` |
| Project row | `folder` | Idea card title | Stage (`Изучаю` / `Проверяю` / `Делаю` / `Отложил`) | Stored project | — |
| Comparison row | `rectangle.split.2x1` | Idea title | Category | Idea reader | — |

### 6.7 Ordering
There is no sort control.
- Bookmarks keep insertion order, newest first, per store: ideas from `Shelf.saved`, research from `notebook.saved`, apps from `saved-apps`, cards from the deck shelf.
- Notes are sorted by `"<kind>:<slug>"` ascending, not by recency.
- Projects keep stored order (new at index 0).
- Comparison keeps stored order.

### 6.8 No-results block
Source: `Clarity/ClarityMy.swift:128-136`. Shown when the library is non-empty but the current filter/search yields nothing.

| Condition | Title | Body | Button |
|---|---|---|---|
| Query empty, filter ≠ Notes | `Здесь пока пусто` / "Nothing here yet" | `Сохрани материал этого раздела или посмотри всю библиотеку.` / "Save something from this section or browse the whole library." | `Показать всё` / "Show everything" → filter = All |
| Query empty, filter = Notes | `Здесь пока пусто` | `Заметки к материалам появятся здесь, даже если убрать закладку.` / "Notes on materials show up here, even if you remove the bookmark." | `Показать всё` |
| Query non-empty | `Ничего не найдено` / "Nothing found" | `Попробуй другое название или слово из заметки.` / "Try another name or a word from your note." | `Сбросить поиск` / "Reset the search" → clear query |

- Title: title3 semibold. Body: subheadline, secondary. Button: accent, subheadline semibold, min height 44.
- Quirk: the title tests the trimmed query, but the body and button test the raw query.

### 6.9 LEGACY readers opened from Saved

**`ClarityProblemView`** (`Clarity/ClarityReader.swift:658-715`):
- Gated by the problem's category. Nav title `Наблюдение`.
- Toolbar: bookmark + note button.
- Hero: `displayTitle` / `Повторяющаяся тема в отзывах`.
- Sections:
  - `Что происходит` (summary)
  - `Что пишут люди`: note `Фрагменты описывают опыт людей в разных приложениях.`, then quotes. Empty → `Исходные цитаты к этой теме не приложены.`
  - `Разобраться в контексте` → row `Читать разбор категории` / category name

**`ClarityAppView`** (`Clarity/ClarityRatings.swift:234-333`):
- Gated by category. Nav title `Приложение`. Toolbar bookmark (a11y `Сохранить приложение` / `Убрать приложение из сохранённого`).
- Content, in order:
  1. Heading: app title + category name.
  2. `Редакционный анализ сохранённых отзывов` + verdict.
  3. Cards `Для каких задач используют` / `Что хвалят в отзывах` / `На что жалуются в отзывах`.
  4. `Опыт пользователей`: 3 quotes, then `Показать остальные %1$@`. No quotes → `Отдельные примеры для этого приложения не включены в подборку.`
  5. `Открыть в App Store` → `https://apps.apple.com/app/id{id}`.
  6. Row `Что можно улучшить в этой нише` / `Читать исследование пользователей и продуктов`.
  7. Footnote disclaimer.
- Missing app: `Приложение недоступно` / `В этом разборе больше нет такой записи. Сохранённая ссылка останется в твоей подборке.`

**`ClarityLegacyCardView`** (`Clarity/ClarityLegacyCard.swift`):
- Resolves a stored deck card id by rebuilding the deck pages. Gated by the card's idea or category.
- Nav title `Сохранённый материал`. Toolbar bookmark toggles the card id.
- Content, in order:
  1. Heading: card title + niche name.
  2. Paragraphs, each with an optional bold label.
  3. Bullets.
  4. `Отзывы к материалу` + quotes.
  5. Card footnote.
  6. `Твоя заметка к материалу` (the user's note, read-only).
  7. Row `Открыть идею` or `Открыть разбор категории` / `Полный материал`.
- Unresolved: `Материал недоступен` / `Закладка сохранена. Можно открыть разбор этой категории.` + link. Loading: `Открываем материал…`.

**`ClarityStoredProjectView`** (`Clarity/ClarityMy.swift:306-339`):
- Nav title `Проект`.
- Heading: idea `text.title` (or `Твой проект`; `Идея в Plus` if locked) / `Сохранённые решения и заметки`.
- Cards, each shown only if non-empty: `Следующий шаг`, `Кому это нужно`, `Почему выберут продукт`, `Что проверено`, `Выбранные функции` (only if readable).
- An editable `Твоя заметка`: field `Запиши мысль` + button `Сохранить заметку`. It writes `project.note` and is separate from material notes.
- `Задание` (draft).
- Row `Открыть исходную идею` / `Разбор и отзывы`.

**Web recommendation:** a web user can only have LEGACY data if an iOS→web import exists. Otherwise, implement only Research / Ideas / Notes (see §12 Q2).

---

## 7. Export (LIVE)

### 7.1 Access: free vs Plus, quota
- **Rule:** export is allowed if and only if the idea is readable (`canReadIdea`).
  - The export sheet is wrapped in the same `ClarityContentGate`.
  - Every action (save / copy / share) re-checks `allowed` (`Clarity/ClarityReader.swift:962,968-973,1032,1037,1044`).
- **Free users** can export the 5 free interior ideas in full, including the full free interior research.
- **Plus users** can export all ideas.
- **There is no count limit, no "exports left" counter and no consumption in Clarity.**
  - `Shelf.freeExports = 2`, `canExport` and `markExported` (`Store/Shelf.swift:21,58-71`) are used only by legacy `Views/BreakdownView.swift` and `Studio/StudioProjects.swift`.
  - Docs that describe a quota are outdated (§11 #3).
- Only ideas export. Research and notes have no standalone export.

### 7.2 Export sheet UI
Source: `ClarityExportSheet`, `Clarity/ClarityReader.swift:950-1055`. Screenshot: `Documentation/LibraryRefresh-2026-09-20/Screenshots/export-complete-document.png`.

- Modal sheet. Nav title `Готовый документ` / "A ready document". Trailing `Готово` closes it. Background `readingPaper`, padding 22, max-width 640.
- Content, in order:
  1. Hero: `Весь контекст.\nИ твоя идея.` / "The whole context.\nAnd your idea." (Georgia 30, with the line break). Subtitle: `article.title` ?? `text.title`.
  2. "What's included" list. Each item has a numbered 32 pt circle (accent bold on `accentSoft`), then a title (headline) and a detail (subheadline, secondary):
     - `1` `Разбор категории` / "Category breakdown" — `Полный текст: задачи людей, наблюдения, цитаты и выводы.`
     - `2` `Идея целиком` / "The whole idea" — `Весь материал об идее, включая основания и проверку решения.`
     - `3` `Твоя заметка` / "Your note" — `Сохранённая мысль к этой идее.` **Only if the idea has a non-blank note.**
  3. Info: `Один текстовый файл (.txt). Можно читать, редактировать или передать в ИИ вместе со своим вопросом.` / "One text file (.txt). You can read it, edit it or hand it to an AI with your question."
  4. If the category has neither an editorial article nor a dossier: `Разбор этой архивной категории недоступен. В файле будут идея и заметка.`
  5. At accessibility text sizes only, the action block appears here.
  6. `Предпросмотр документа` / "Document preview" (headline), followed by the **entire document text** in Georgia 19. This is the exact string that will be saved.
- **Pinned bottom action bar** at normal text sizes. It has a `readingPaper` background, a top divider and padding 14/10/22.
  - **Primary capsule button:**
    - `Сохранить в Файлы` / "Save to Files", icon `arrow.down.doc`. After a successful save the label becomes `Сохранить ещё раз` / "Save again".
  - **Row of two text buttons:**
    - `Копировать` / "Copy" (`doc.on.doc`). After tapping it shows `Скопировано` / "Copied" with a `checkmark` and stays that way for the life of the sheet.
    - `Поделиться` / "Share" (`square.and.arrow.up`).
  - After a successful save: footnote `Документ сохранён` / "Document saved".

### 7.3 Document format (exact)
Source: `Clarity/ClarityExportDocument.swift:7-63`, `Content/EditorialContent.swift:44-67`, `Content/IdeaArticles.swift:52-70`. Reference output: `Documentation/LibraryRefresh-2026-09-20/example-export.txt` (33,164 bytes / 18,038 chars).

- Plain text, UTF-8, no BOM.
- The document is a list of **parts joined by one blank line (`"\n\n"`)**, followed by a final `"\n"`.
- Inside a part, a title and its body are separated by a **single** `"\n"`.
- Helper `add(title, body)`: skip if `body.trim()` is empty. Otherwise append `body`, or `title + "\n" + body` when there is a title.
- Helper `quote(q)`: `add("", "«" + QuoteReading.text(q.quote, q.translation) + "»")`. Guillemets are used in every locale.

```
parts = [
  L("inApp · Идея и разбор категории"),          // en: "inApp · Idea and category breakdown"
  L("1. РАЗБОР КАТЕГОРИИ"),                       // en: "1. CATEGORY BREAKDOWN"
  idea.categoryName
]
if article = research-editorial.<locale>.categories[idea.category]:     // true for all 35 launch categories in all 5 locales
    flow = ClarityResearchFlow(article, dossier = rich.<locale>.dossiers[category])
    add("", article.summary)
    add("", article.lead)
    if article.audiences non-empty: parts += L("КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ")   // "THE JOBS PEOPLE DO"
    for a in article.audiences: add(a.title, a.body)
    for section in article.sections:
        parts += section.title                     // plain line, NOT upper-cased
        add("", section.intro)
        for obs in section.observations:
            add(obs.title, obs.body)               // body keeps its internal "\n\n" paragraph breaks
            for q in flow.quotes(obs): quote(q)
            for p in flow.directions(obs): add(p.direction.title, p.direction.body)
    for p in flow.remainingDirections: add(p.direction.title, p.direction.body)
    if article.conclusion: add(conclusion.title, conclusion.body)
elif dossier exists:                               // archive categories only
    if thesis: add(L("Главное"), thesis.governing); add(L("Приложения в категории"), thesis.competitorRead)
               for pillar: add(pillar.title, pillar.dek)
    for seg in audience.segments: add(seg.name, join("\n\n", nonEmpty[seg.job, seg.gap, seg.payLevel, seg.payNote]))
    add(L("Выводы об аудитории"), audience.takeaway); add(L("Рынок"), market.marketLead); add(L("Оплата"), market.money)
    for f in findings: add(f.title, join("\n\n", nonEmpty[f.plus, f.minus])); for q in f.evidence: quote(q)
    for c in channels: add(c.name, c.note); for q in c.quotes: add("", "«" + QuoteReading.text(q.quote) + "»")
else:
    parts += L("Разбор этой архивной категории отсутствует в текущем сборнике.")
parts += L("2. ИДЕЯ")                              // "2. IDEA"
parts += ideaDocument(idea)                        // see below; itself "\n\n"-joined
if note.trim() non-empty: parts += L("3. МОЯ ЗАМЕТКА") + "\n" + note     // "3. MY NOTE"
return join("\n\n", parts) + "\n"
```

**`ClarityResearchFlow` placement rules**, needed to reproduce the quote and direction order (`Clarity/ClarityResearchFlow.swift:24-80`):
- **Directions.** Each direction goes to its `observationID` if that id exists in the article. Otherwise it goes to the observation with the **strictly largest** overlap between `sourceFindingIDs` and the observation's `sourceFindingIDs`; on a tie, the first such observation wins. With no overlap it goes to `remainingDirections`.
  - A placement is dropped when it has no (canonical, not-yet-shown) ideas **and** an empty body.
  - In the document, directions with an empty body are skipped anyway by `add`.
- **Quotes per observation.** `observation.quoteRefs` resolve to `dossier.findings[findingID].evidence[quoteIndex]`.
  - Duplicates are removed within the observation by (app, quote).
  - Across the whole article, a quote already used by an earlier observation is not repeated.
- Idea cards and "other ideas of the category" are **not** in the document.

**`ideaDocument(idea)`:**
- **Article exists** (all launch ideas). Parts joined by `"\n\n"`:
  1. `article.title`
  2. `idea.categoryName`
  3. `article.description`
  4. The blocks in order:
     - `paragraph` / `heading` → `text`
     - `idea` → `title + "\n" + text`
     - `quote` → `"«" + QuoteReading.text(quotes[quoteIndex].text) + "»"`
  - The note is passed as nil here. The note goes into part 3 above.
- **No article** (archive):
  1. `text.title`
  2. `categoryName`
  3. `oneLiner`
  4. Then each of the following as `"<LABEL>\n<value>"` when non-empty:
     - `ДЛЯ КОГО` (`context.audience ?? studio.buyer`)
     - `СИТУАЦИЯ` (gap)
     - `КАК РЕШАЮТ СЕЙЧАС` (`currentApproach`)
     - `ВОЗМОЖНОЕ РЕШЕНИЕ` (pitch)
     - `ВОЗМОЖНОСТИ` (features, one `"• x"` per line)
     - `ГРАНИЦЫ РЕШЕНИЯ` (antiFeatures, same format)
     - `ГЛАВНЫЙ ВОПРОС` (`openQuestion`)
     - `КАК ПРОВЕРИТЬ` (validation)
     - `ВОЗМОЖНАЯ ОПЛАТА` (monetization, only if `paymentReviewed`)
     - `ФРАГМЕНТЫ ОТЗЫВОВ` (quote texts joined by `"\n\n"`, without guillemets)
  - The English labels for these are in the Appendix.

**Skeleton** (from `example-export.txt`, abbreviated; `⏎⏎` = blank line):
```
inApp · Идея и разбор категории⏎⏎1. РАЗБОР КАТЕГОРИИ⏎⏎Дизайн интерьера и планировка⏎⏎<summary>⏎⏎<lead ¶1>⏎⏎<lead ¶2>⏎⏎
КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ⏎⏎Для своего дома\n<body>⏎⏎…⏎⏎Сначала — увидеть своё решение⏎⏎<section intro>⏎⏎
Картинка даёт общий предмет для разговора\n<obs ¶1>⏎⏎<obs ¶2>⏎⏎«quote»⏎⏎«quote»⏎⏎Из понравившегося образа — в конкретный выбор\n<direction body>⏎⏎…
Начать с одного решения для своей комнаты\n<conclusion>⏎⏎2. ИДЕЯ⏎⏎Новая комната. Те же стены.⏎⏎Дизайн интерьера и планировка⏎⏎<description>⏎⏎<blocks…>⏎⏎
3. МОЯ ЗАМЕТКА\nМоя проверка: сохранить размеры комнаты.\n
```
The UI test `testDocumentContainsCategoryIdeaAndNoteAndSharesFile` checks this order of passages (`InappUITests/ClarityUITests.swift:1601-1628`).

- The research text is **not** reflowed and has no editorial correction applied at export time; it is used raw from the packs. The ru packs `text`, `rich` and `studio` are corrected at load time (§9.3).
- The note included is the **idea's** note only (`idea:<slug>`). A note on the research is not included.

### 7.4 Filename
Source: `Clarity/ClarityExportDocument.swift:65-69`.
- Base: `"inApp — " + prefix(100, clean(article.title ?? text.title))`.
- `clean` replaces each of `/ \ : * ? " < > |` and newlines with a space.
- Extension: `.txt`. This can produce a double dot, e.g. `inApp — Новая комната. Те же стены..txt`.

### 7.5 Actions and web mapping

| iOS action | iOS behaviour | Web equivalent |
|---|---|---|
| `Сохранить в Файлы` | System "save to Files" dialog (`fileExporter`, `.plainText`). Success → `saved=true`. Failure → alert. | Download a `Blob(text, {type:"text/plain;charset=utf-8"})` with `download="<filename>.txt"`. Show `Документ сохранён` after triggering it (the web cannot confirm). |
| `Копировать` | Clipboard = full text | `navigator.clipboard.writeText(text)`. On rejection, show an error. |
| `Поделиться` | Writes `tmp/inApp-exports/<filename>.txt`, then opens the system share sheet with the **file** (`Clarity/ClarityExportDocument.swift:71-77`) | `navigator.share({files:[File]})` when `navigator.canShare({files})` returns true; else fall back to the download (or hide the button, per the §12 decision). |

### 7.6 Errors
Alert title `Документ не сохранён` / "Document not saved", button `Понятно` / "Got it". Messages:
- Save failure: `Не удалось сохранить документ. Попробуй ещё раз или поделись файлом.`
- Share-file failure: `Не удалось подготовить файл. Попробуй ещё раз.`

---

## 8. Settings (LIVE)

View: `ClaritySettingsView` (`Clarity/ClaritySettings.swift`). Modal sheet opened from the Saved header gear.

### 8.1 Chrome
- Pinned header (`:183-197`): `Настройки` / "Settings" (title2 bold), left-aligned. Right: `Готово` / "Done" in a capsule button (accent semibold text, `surface` background, horizontal padding 16, min height 44). It sits 20 pt from the screen edge.
- Background `paper`. Column max-width 660, horizontal padding 20, 28 pt between groups.
- Group heading: subheadline semibold, secondary, 4 pt inset.
- Group container: `surface`, radius 20. Rows are separated by 0.5 pt `line`@65% dividers inset 56 pt.
- **Row** (`ClaritySettingsRow`, `:316-328`):
  - 24 pt leading SF icon (secondary), then the title (body).
  - Trailing: `chevron.right` for internal rows, `arrow.up.right` for external links, nothing when `showsChevron=false`.
  - Padding 16×17, min height 56.

### 8.2 Rows in order

| # | Group heading | Row (ru / en) | Icon | Action | Visibility |
|---|---|---|---|---|---|
| 1 | — | **Plus card** (§8.3) | — | Opens the paywall sheet | always |
| 2 | — (separate `surface` group, radius 18) | `Управление подпиской` / "Manage subscription" | `creditcard`, external | Opens `https://apps.apple.com/account/subscriptions` | only if Plus via **annual** subscription (not lifetime, not preview) |
| 3 | same group | `Восстановить покупки` / "Restore purchases" (while running: `Восстанавливаем…` / "Restoring…" + spinner) | `arrow.clockwise`, no chevron | §8.4 | always; disabled while running |
| 4 | `Язык` / "Language" | One row per locale, in order: `Русский`, `English`, `Deutsch`, `Français`, `日本語` | Trailing radio: `checkmark.circle.fill` (accent) when selected, `circle` (secondary) otherwise | §8.5 | only if more than 1 locale is available (`:101-126`) |
| 5 | `Оформление` / "Appearance" | 3 theme tiles: `Светлая` / "Light", `Тёмная` / "Dark", `Системная` / "System" | Preview + radio | §8.6 | always |
| 6 | `Приложение` / "App" | `О материалах` / "About materials" | `text.book.closed`, chevron | Push the info page (§8.7) | always |
| 7 | same group | `Знакомство с приложением` / "App walkthrough" | `play.rectangle`, chevron | Closes settings, then replays onboarding in replay mode (`:51-55,89-93`) | always |
| 8 | same group | `Написать разработчику` / "Contact the developer" | `envelope`, external | Opens `https://inapp.pro/{ru\|en}/contacts`. `ru` only when the UI locale is ru; all other locales use `en` (`Strings/Strings.swift:270-273`). | always |
| 9 | `Разработка` / "Development" | `Меню разработчика` / "Developer menu" | `hammer` | §8.10 | **DEBUG builds only** |
| 10 | `Правовая информация` / "Legal" | `Конфиденциальность` / "Privacy" | `hand.raised`, chevron | In-app privacy sheet (§8.8) | always |
| 11 | same group | `Условия использования` / "Terms of use" | `doc.text`, external | Opens `https://inapp.pro/{ru\|en}/offer` | always |
| 12 | footer (centred, secondary) | Line 1: `inApp · {CFBundleShortVersionString}`, currently `inApp · 1.0` (footnote medium). Line 2: `Закладки и заметки хранятся на этом iPhone.` / "Bookmarks and notes are kept on this iPhone." (caption) | — | — | always |

**Not present:**
- Text size (the app follows system Dynamic Type).
- Reset or delete data.
- Account / sign-in.
- Notifications.
- The motion toggle `Анимация` was **removed** (`Documentation/LibraryRefresh-2026-09-20/README.md:54`). The `studio.motion` key is still read, defaulting to `true`, but has no UI.
- Category re-selection.

### 8.3 Plus card
Source: `Clarity/ClaritySettings.swift:199-251`. Screenshot: `plus-composition-light.png`. (`fix-plus-settings-light.png` shows an older blue variant and is obsolete.)

It is one big button with `surface` background, radius 24 and a `line`@55% 0.5 pt border.
- **Top band** (`accentSoft` background, padding 18/20/14):
  - Row: `inApp PLUS` (caption bold, letter-spacing 0.8, accent, never translated). When unlocked, a trailing `Активен` / "Active" label with a `checkmark.circle.fill` icon.
  - Illustration `WelcomeLibrary_v7`, height 112, centred. Hidden at accessibility text sizes.
- **Body** (padding 20):
  1. `Все разборы\nи идеи` rendered with the `\n` replaced by a space → `Все разборы и идеи` / "Every breakdown and idea". Serif title2 semibold.
  2. `Подробные исследования, идеи приложений и экспорт материалов.` / "Detailed research, app ideas and material export." (subheadline, secondary).
  3. CTA bar: `Открыть Plus` / "Open Plus", or `О моём Plus` / "About my Plus" when unlocked, with a trailing `arrow.right`. White on `action`, radius 14, min height 48.
  4. Caption, centred:
     - If unlocked **or** entitlement state not ready → `accessDetail`.
     - Else, if the annual price is known → `"%1$@ в год"` / "%1$@ a year" (StoreKit price 39.99 in `Products.storekit`).
     - Else `Годовая подписка` / "Annual subscription".

**`accessDetail`**, first match wins (`:22-33`):
1. Preview mode (DEBUG) → `Plus · режим просмотра`
2. Not ready → `Проверяем доступ…`
3. Lifetime → `Бессрочный доступ` / "Lifetime access"
4. Billing grace period → `Проверь способ оплаты в App Store`
5. Unlocked with an expiry date → `Доступ до %1$@`, with the date formatted `d MMMM yyyy` in the **current app locale** (e.g. `Доступ до 21 сентября 2027 г.`)
6. Else → `Все разборы, идеи и экспорт`

### 8.4 Restore purchases
Source: `Clarity/ClaritySettings.swift:273-281`, `Store/Purchases.swift:275-298`.
- Tap → button shows `Восстанавливаем…` plus a spinner and is disabled → the store sync runs → a result message appears under the row (footnote, secondary, padding 16).
- Result text is the first that applies:
  1. The purchase layer's error:
     - Nothing found: `На этом Apple ID покупок не нашлось.` / "No purchases found for this Apple ID." (`Strings/Strings.swift:225-228`)
     - Preview mode: `Сейчас включён режим просмотра. Для покупок и восстановления выбери «Как в App Store» в меню разработчика.`
     - Otherwise: the system error text.
  2. If unlocked: `Plus активен на этом устройстве.` / "Plus is active on this device."
  3. Otherwise: `Доступ Plus не подтверждён. Можно повторить восстановление.`
- A user who cancels Apple's sign-in prompt gets no error. The message then falls through to (2) or (3).
- **Web:** "restore" has no direct equivalent. See §12 Q4.

### 8.5 Language
Sources: `Content/AppLocale.swift`, `Content/Library.swift:70-78`.
- Available locales come from `Resources/locales.json` → `["ru","en","ja","de","fr"]`, with default `en`.
- Display order: ru, en, then the rest sorted by their self-name. Result: `Русский`, `English`, `Deutsch`, `Français`, `日本語` (`Content/AppLocale.swift:36-46,76-88`).
- Language names are **not translated**.
- Rows are min height 52, horizontal padding 16. a11y: the selected row gets the selected trait.
- **Tap** switches immediately. The choice is persisted (`content.locale`), content packs reload, and all UI strings re-render. There is no confirmation and no restart.
- One language drives both UI and content; there is no separate content-language setting.
- **First launch** (`:109-128`): an exact match on the device's preferred languages; else a match on the base language (`de-CH` → `de`); else the manifest default `en`.

### 8.6 Appearance (theme)
- Storage: `studio.appearance` ∈ `light | dark | system`. **Default `light`** (`Clarity/ClaritySettings.swift:16`, `Clarity/ClarityRoot.swift:31`).
- Applied app-wide and immediately (`Clarity/ClarityRoot.swift:85`); `system` follows the OS. It persists across relaunches (tested at `InappUITests/ClarityUITests.swift:1699-1731`).
- **Layout:**
  - The three choices sit side by side (12 pt gap, `surface` container, padding 16).
  - If they don't fit the width, they stack vertically (`ViewThatFits`).
  - At accessibility sizes they become rows: a 64 pt-wide preview, the title and the radio.
- **Tile** (`:150-181`):
  - Preview height 74 (54 at accessibility sizes), clipped to radius 10, inset 4.
  - Outer border radius 14: 2 pt `accent` when selected, else 1 pt `line`.
  - Below it: the title (subheadline medium), then the radio (`checkmark.circle.fill` accent, or `circle` secondary).
  - a11y value `Выбрана` / "Selected" when chosen.
- **Preview drawing** (`ClarityThemePreview`, `:331-352`). It always uses fixed hex values, independent of the current theme. Padding 12, 7 pt gaps:

| Element | Light sample | Dark sample |
|---|---|---|
| Background | `#F5F5F7` | `#111214` |
| Title bar (capsule 30×4) | `#191A20` | `#F2F2F5` |
| Card (full width × 22, radius 5) | `#FFFFFF` | `#1D1E22` |
| Accent dash inside the card (capsule 15×4, 7 pt from left) | `#3458DB` | `#94AAFF` |
| Secondary line (capsule 21×3) | `#666872` | `#AAADB8` |

  `system` = the light sample with the **right half** covered by the dark sample.

### 8.7 «О материалах» page
Source: `Clarity/ClaritySettings.swift:295-313`. A pushed page with nav title `О материалах` and a back button. Padding 24, 28 pt gaps, max-width 660. Each block is a headline title plus a body (secondary).

| Title | Body |
|---|---|
| `Разборы и идеи` / "Breakdowns and ideas" | `Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы.` |
| `Чтение без интернета` / "Reading without the internet" | `Тексты и иллюстрации входят в приложение. Для покупки и восстановления доступа нужно подключение к App Store.` (iOS-specific) |
| `Бесплатный раздел` / "Free section" | `Разбор интерьеров и 5 идей доступны бесплатно. Остальные идеи и полные разборы открываются с Plus.` |
| `Твои записи` / "Your records" | `Закладки и заметки хранятся на этом устройстве. Удаление закладки не удаляет заметку. Синхронизации между устройствами нет.` |
| footnote | `Сборник от %1$@`, where the argument is `studio.json.builtAt` (`2026-09-05`) formatted `d MMMM yyyy` **always in Russian** (`Decks/DeckContent.swift:159-167`) → `Сборник от 5 сентября 2026` |

### 8.8 Privacy sheet
Source: `StudioPrivacyView`, `Studio/StudioPrivacy.swift`. Modal sheet with nav title `Конфиденциальность` and trailing `Готово`.

- **Hero card** (`accentSoft` background, radius 28):
  - An illustration object (`note`).
  - `Твои идеи\nостаются твоими.` (bold, ≈31 pt).
  - `Как inApp хранит и использует данные.`
- **Six `surface` cards** (radius 24, padding 20), each a headline + body:
  - `На этом устройстве`
  - `Покупки`
  - `Когда используется интернет`
  - `Избранное`
  - `Аналитика` (RevenueCat)
  - `Удаление данных`
- Link `Связаться с разработчиком` → contacts URL.
- `Обновлено 21 сентября 2026 года`.

All texts are in the Appendix. **The content is iOS-specific** (Apple payments, RevenueCat, "удаление приложения"). The web needs its own privacy text (§12).

### 8.9 External URLs used by these screens

| URL | Where |
|---|---|
| `https://inapp.pro/ru/contacts`, `https://inapp.pro/en/contacts` | Settings, privacy sheet |
| `https://inapp.pro/ru/offer`, `https://inapp.pro/en/offer` | Settings |
| `https://apps.apple.com/account/subscriptions` | Settings (annual Plus) |
| `https://apps.apple.com/app/id{appId}` | Legacy app view |
| `https://inapp.pro/ru/reviews/{category}/{appId}`, `https://inapp.pro/ru/rating/{category}` | Dormant compare |
| `https://inapp.pro/ru/segment/{category}` | Legacy Studio source sheets |

**All `inapp.pro` URLs above are baked into shipped binaries.** Keep them resolving (redirect to `/old/...` or to the new equivalents).

### 8.10 Developer menu (DEBUG only; web: internal/staging only)
Source: `Clarity/ClarityDeveloperSettings.swift`, `Store/Purchases.swift:40-70`.

- Nav title `Разработчик`. Heading `Режим доступа`. Text: `Переключай версию приложения для проверки экранов. Выбор сохранится после перезапуска.`
- Radio list of access modes:

| Mode | Title | Description |
|---|---|---|
| appStore | `Как в App Store` | `Доступ определяется настоящими покупками.` |
| free | `Бесплатно` | `Бесплатная категория, закрытые материалы и экран покупки.` |
| plus | `Plus` | `Все категории, идеи и полный экспорт открыты.` |

- Below the list:
  - `В App Store: ` + one of `Проверяем покупки…` / `Бессрочный Plus` / `Plus активен` / `Бесплатный доступ`.
  - Footnote: `«Бесплатно» и «Plus» меняют только доступ для просмотра. …`
- The mode is persisted under the key `debug.accessPreview`.
- **Recommendation:** provide the same free/plus override on web preview deployments for QA.

---

## 9. Persistence map & web recommendations

### 9.1 Everything the app persists (UserDefaults, per device)

| Key | Content | Written by (this spec) | Web recommendation |
|---|---|---|---|
| `shelf.saved` | Idea bookmark slugs, newest first | Idea bookmark / note save | `bookmarks` with `{kind:'idea', slug, createdAt}` |
| `inapp.studio.notebook.v1` | Research/problem bookmarks + notes (+ unused decisions) | Research bookmark, all notes | `bookmarks` + `notes {kind, slug, text, updatedAt}` (add `updatedAt` for web; keep the key-sorted list order for parity) |
| `inapp.clarity.saved-apps.v1` | Saved apps | (legacy only) | Skip unless importing |
| `inapp.decks.reader.v1` | Deck card bookmarks + reading positions | (legacy only) | Skip unless importing |
| `inapp.studio.workspace.v1` | Projects + idea comparison | (legacy only) | Skip unless importing |
| `shelf.exported` | Legacy export quota slugs | (unused) | Skip |
| `studio.appearance` | `light` / `dark` / `system` (default `light`) | Settings | Cookie or localStorage; apply before first paint to avoid a flash |
| `content.locale` | Language code | Settings / first launch | URL locale prefix and/or cookie |
| `studio.preferences.v1` | `{completed, goal, categories}`; only `completed` matters (onboarding done) | Onboarding / replay | Onboarding spec |
| `studio.motion` | Bool, default true, no UI | — | Honour `prefers-reduced-motion` |
| `debug.accessPreview` | DEBUG access override | Developer menu | Preview-only flag |

### 9.2 Error handling parity
- Each archive, when unreadable, **keeps the stored data and disables writes**. The Saved screen then shows a red footnote per store, and the bookmark buttons for non-idea kinds are disabled.
- Web equivalent: never overwrite unparseable stored data. Show the error text from the Appendix ("Stores" group).

### 9.3 Content-pipeline note (for the web build)
- The ru packs `text.ru.json`, `rich.ru.json` and `studio.json` pass through editorial corrections at load time (`Studio/StudioEditorial.swift:19-63`).
- Corrections come from `editorial-overrides.ru.json` and `research-idea-corrections.ru.json`. Each is an exact string match verified by SHA-256; statuses are `reworded` and `withheld`.
- Keys whose values are never rewritten: `evidence`, `quotes`, `quote`, `quoteRu`, `translation(s)`, `original`, `app*`, `author`, `id`, `slug`, and `title`/`name` inside app records.
- **Pre-apply these corrections when converting the packs for the web.** `ClarityArticleText` also applies them per whole string at render time.

---

## 10. Web adaptation notes (copy that is iOS-specific)

| iOS string | Where | Needs a web variant? |
|---|---|---|
| `Сохранено на этом iPhone` | Saved footer | Yes, depending on the storage decision (e.g. "в этом браузере" / "в аккаунте") |
| `Закладки и заметки хранятся на этом iPhone.` | Settings footer | Yes |
| `Заметка хранится на этом устройстве. …` | Note editor | Yes, if synced |
| `Сохранить в Файлы` / `Сохранить ещё раз` / `Документ сохранён` | Export | Probably "Скачать .txt"; needs translations |
| `Восстановить покупки`, `Управление подпиской`, `Проверь способ оплаты в App Store`, `На этом Apple ID покупок не нашлось.` | Settings | Depends on web billing |
| `Чтение без интернета` block | About materials | Rewrite for web |
| Privacy sheet (all) | Privacy | Rewrite for web |
| `Знакомство с приложением` | Settings | Depends on the web onboarding and landing design |

- **i18n:** the app's catalogues `Resources/ui.{en,de,fr,ja}.json` are keyed by the **Russian source string**, with values in the target language. Russian needs no pack. The web can import them as-is, using the same `%1$@`-style positional placeholders (convert to ICU `{0}`).
- **Every string in this spec already has en/de/fr/ja translations** (Appendix A; the extraction found 0 missing English values).

---

## 11. Code vs docs / screenshots discrepancies (code wins)

1. **Locked idea card.**
   - Docs: `Documentation/LibraryRefresh-2026-09-20/README.md:80` says cover + title + category + Plus label. Screenshot `paid-idea-card-free-dark.png` shows title + category + "🔒 Plus" pill.
   - **Code:** artwork plus a lock badge only (`Clarity/ClarityIdeaCard.swift:3,27-35`). The test asserts label `Идея в Plus` and no description (`InappUITests/ClarityUITests.swift:1532-1533`).
2. **Locked idea screen.**
   - Docs (same line) and screenshot `paid-idea-gate-free-dark.png` show the title and category.
   - **Code:** no heading for ideas (`Clarity/ClarityContentAccess.swift:79-82`).
3. **Export quota.**
   - `README.md:19` ("Plus открывает экспорт без лимита") and `Documentation/Clarity/README.md:39` ("Бесплатный экспорт двух новых идей …") describe a 2-export quota.
   - **Code:** Clarity has no quota. Export = readable ideas (`Clarity/ClarityReader.swift:962`). `Shelf.freeExports` is legacy.
4. **Onboarding and settings categories.**
   - `Documentation/Clarity/README.md:17` says onboarding picks up to 3 categories and settings allow re-choosing them.
   - **Code:** Clarity onboarding keeps the existing categories (`Clarity/ClarityOnboarding.swift:148`), and settings only offer `Знакомство с приложением`. The ideas list ignores preferences.
5. **Stale test.**
   - `testMergedIdeaKeepsSavedIDAndOpensCanonicalArticle` expects a `clarity-idea-canonical` link on `photo-editing-2` (`InappUITests/ClarityUITests.swift:1415-1435`).
   - All 293 launch ideas render the article layout, which has no "Связанное решение". The link is reachable only for archive ideas.
6. **Note sheet title from the idea reader** uses `idea.text.title` (`Clarity/ClarityReader.swift:581`). The card and article title differ for 292 of 293 ideas (e.g. ru `Переделка комнаты без сноса стен` vs `Новая комната. Те же стены.`). Saved uses the card title. This is likely a bug; see §12.
7. **Russian-only date.** `Сборник от …` is always formatted in Russian (`Decks/DeckContent.swift:159-167`).
8. **Concatenated localisation.** `ClarityProblemView` builds its description as `L("Наблюдение из разбора «") + name + "»."` (`Clarity/ClarityReader.swift:665`). This contradicts the project rule at `Clarity/ClarityCatalogs.swift:152-153`.
9. **Plus copy vs reality.** The settings Plus copy ("…и экспорт материалов", `Все разборы, идеи и экспорт`) implies export is Plus-only. Free users can export the 5 free ideas.
10. **Russian context leaks into other locales.** Editorial idea contexts exist only in `.ru`, and other locales fall back to ru. In en/de/fr/ja, the ideas search matches Russian "audience" text, and archive-idea fallback pages show Russian sections.
11. **Hard-coded `ru` URLs.** The dormant compare view hard-codes `ru` URLs regardless of locale.
12. **Outdated comment.** `Content/Library.swift:69` says the Clarity UI is Russian. It now ships 5 locales.
13. **Obsolete screenshot.** `fix-plus-settings-light.png` shows an obsolete solid-blue Plus card. The current card is `plus-composition-light.png`.
14. **Whitespace quirk.** In the Saved no-results block, a whitespace-only query gives the title "Здесь пока пусто" but the body and button of the search case (`Clarity/ClarityMy.swift:130-133`).

---

## 12. Open questions for the architect / owner

1. **Where do bookmarks and notes live on the web?**
   - Option A: localStorage, for parity with "on this device", with no sync.
   - Option B: the user account, since the new site has auth.
   - Option C: both, merged on sign-in.
   - This decides the copy in §10 and whether notes need `updatedAt`.
2. **LEGACY Saved sections** (Проблемы, Приложения, Карточки, Проекты, Сравнение идей): drop them on the web, or build an iOS→web import? Web users otherwise can never have this data.
3. **Compare is dormant in the app.** Exclude it from the web (recommended), or resurrect the app-vs-app compare from §4.2?
4. **Plus on the web.**
   - How is it purchased?
   - Is the entitlement shared with iOS subscribers?
   - What replaces `Восстановить покупки` and `Управление подпиской` (e.g. a billing portal)?
   - What does the Plus card caption show (price source)?
5. **Paid-text gating vs SEO.** Parity forbids sending paid idea text to non-Plus clients. Should public, indexable idea pages exist (e.g. only for the 5 free ideas, or teaser pages)? This also affects how the landing page for unauthenticated users uses idea content.
6. **Default theme.** Keep the app default `light`, or use `system` on the web?
7. **Locales and URLs.** Ship all 5 app locales (ru, en, de, fr, ja) or only ru/en like the old site? What is the URL scheme (`/{locale}/ideas`, …)? How does `/old` coexist with it?
8. **Legacy inbound URLs.** The shipped iOS app links to `inapp.pro/{ru,en}/offer`, `/{ru,en}/contacts`, `/ru/reviews/...`, `/ru/rating/...` and `/ru/segment/...`. Confirm that redirects keep them alive after the old site moves to `/old`.
9. **Export on the web.** Rename `Сохранить в Файлы` to a download label? Hide `Поделиться` where file sharing is unsupported, or fall back to download? New strings need translations.
10. **Note title bug (§11 #6).** Replicate `text.title`, or use the card/article title? The card title is recommended.
11. **`Знакомство с приложением`.** What does "replay onboarding" mean on the web: the landing page, a tour, or nothing?
12. **Idea reader presentation.** Modal over the list (strict parity) plus a deep-linkable URL, or always a full page?
13. **Privacy and terms.** The in-app privacy text is iOS-specific. Is there a web privacy page, and where does `Конфиденциальность` point?

---

## Appendix A — every UI string in scope (ru key → en / de / fr / ja)

Sources:
- `Resources/ui.{en,de,fr,ja}.json` (`strings[<ru>]`), extracted from `L("…")` calls at the cited lines.
- `\n` = line break. `%1$@`, `%2$@` = positional arguments.
- Strings shared with the research reader appear only once (at their first occurrence here).
- Two strings come from `Strings.t(ru, en)` (`Strings/Strings.swift:222-228`).

| # | Where | ru (key) | en | de | fr | ja |
|---|---|---|---|---|---|---|
| | **Ideas catalogue & category picker** | | | | | |
| 1 | ClarityCatalogs.swift:190 | Идеи | Ideas | Ideen | Idées | アイデア |
| 2 | ClarityCatalogs.swift:190 | Что можно создать или улучшить. | What could be built or improved. | Was sich bauen oder verbessern lässt. | Ce qu’on peut créer ou améliorer. | 何をつくれるか、何を良くできるか。 |
| 3 | ClarityCatalogs.swift:190 | 5 идей бесплатно. Остальные — в Plus. | 5 ideas for free. The rest with Plus. | 5 Ideen kostenlos. Alle weiteren mit Plus. | 5 idées gratuites. Les autres avec Plus. | 5つのアイデアを無料で。残りはPlusで。 |
| 4 | ClarityCatalogs.swift:192 | Идея или потребность | Idea or need | Idee oder Bedarf | Idée ou besoin | アイデアやニーズ |
| 5 | ClarityCatalogs.swift:197 | Все категории | All categories | Alle Kategorien | Toutes les catégories | すべてのカテゴリー |
| 6 | ClarityCatalogs.swift:200 | Выбрать категорию | Pick a category | Kategorie wählen | Choisir une catégorie | カテゴリーを選ぶ |
| 7 | ClarityCatalogs.swift:236 | Пока ничего не нашлось | Nothing found yet | Noch nichts gefunden | Rien trouvé pour l’instant | まだ何も見つかりません |
| 8 | ClarityCatalogs.swift:237 | Попробуй название категории или более короткий запрос. | Try a category name or a shorter query. | Probier einen Kategorienamen oder eine kürzere Anfrage. | Essaie un nom de catégorie ou une requête plus courte. | カテゴリー名か、もっと短い言葉を試してください。 |
| 9 | ClarityCatalogs.swift:261 | Найти категорию | Search categories | Kategorie suchen | Chercher une catégorie | カテゴリーを検索 |
| 10 | ClarityCatalogs.swift:263 | Категория | Category | Kategorie | Catégorie | カテゴリー |
| 11 | ClarityCatalogs.swift:264 | Готово | Done | Fertig | Terminé | 完了 |
| | **Idea card** | | | | | |
| 12 | ClarityIdeaCard.swift:70 | Идея в Plus | Idea in Plus | Idee in Plus | Idée dans Plus | アイデアはPlusで |
| 13 | ClarityIdeaCard.swift:70 | %1$@. %2$@ | %1$@. %2$@ | %1$@. %2$@ | %1$@. %2$@ | %1$@。%2$@ |
| 14 | ClarityIdeaCard.swift:71 | Подробности идеи доступны в Plus. | The details of the idea are in Plus. | Die Details der Idee gibt es in Plus. | Les détails de l’idée sont dans Plus. | アイデアの詳細はPlusで読めます。 |
| 15 | ClarityIdeaCard.swift:71 | Открыть полную идею в отдельном окне. | Open the full idea in a separate window. | Die ganze Idee in einem eigenen Fenster öffnen. | Ouvrir l’idée complète dans une fenêtre séparée. | アイデアの全文を別の画面で開きます。 |
| | **Locked-content gate** | | | | | |
| 16 | ClarityContentAccess.swift:84 | Полный материал в Plus | Full material in Plus | Vollständiges Material in Plus | Contenu complet dans Plus | 資料の全文はPlusで |
| 17 | ClarityContentAccess.swift:84 | Идея доступна в Plus | The idea is available in Plus | Die Idee ist in Plus verfügbar | L’idée est disponible dans Plus | このアイデアはPlusで読めます |
| 18 | ClarityContentAccess.swift:86 | Все разборы и идеи — в одной подписке. | Every breakdown and idea — in one subscription. | Alle Analysen und Ideen — in einem Abo. | Tous les décryptages et toutes les idées — dans un seul abonnement. | すべての分析とアイデアを、一つのサブスクリプションで。 |
| 19 | ClarityContentAccess.swift:86 | Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом. | Open the solution, the evidence behind it and the full category breakdown. All of it saves as one document. | Öffne die Lösung, ihre Belege und die vollständige Kategorie-Analyse. Alles lässt sich als ein Dokument speichern. | Ouvre la description de la solution, ses preuves et le décryptage complet de la catégorie. Tout s’enregistre en un seul document. | 解決策の説明、その根拠、カテゴリーの分析全文を開けます。すべてを一つの文書として保存できます。 |
| 20 | ClarityContentAccess.swift:90 | Открыть все материалы | Unlock all materials | Alle Materialien freischalten | Ouvrir tous les contenus | すべての資料を開放する |
| 21 | ClarityContentAccess.swift:95 | Сначала прочитать бесплатный разбор | Read the free breakdown first | Zuerst die kostenlose Analyse lesen | Lire d’abord le décryptage gratuit | まず無料の分析を読む |
| 22 | ClarityContentAccess.swift:104 | Моя заметка к материалу | My note on the material | Meine Notiz zum Material | Ma note sur le contenu | 資料への自分のメモ |
| 23 | ClarityContentAccess.swift:117 | Разбор | Breakdown | Analyse | Décryptage | 分析 |
| 24 | ClarityContentAccess.swift:117 | Идея | Idea | Idee | Idée | アイデア |
| | **Idea reader** | | | | | |
| 25 | ClarityReader.swift:496 | Кому пригодится | Who it’s for | Für wen es passt | À qui ça sert | だれに役立つか |
| 26 | ClarityReader.swift:498 | Что не получается сейчас | What doesn’t work today | Was heute nicht klappt | Ce qui ne marche pas aujourd’hui | いまうまくいっていないこと |
| 27 | ClarityReader.swift:501 | Как решают сейчас | How it’s solved today | Wie es heute gelöst wird | Comment on fait aujourd’hui | いまの解き方 |
| 28 | ClarityReader.swift:505 | Как это может работать | How it could work | Wie es funktionieren könnte | Comment ça pourrait marcher | どう動きうるか |
| 29 | ClarityReader.swift:512 | Границы первой версии | Limits of the first version | Grenzen der ersten Version | Les limites de la première version | 最初のバージョンの範囲 |
| 30 | ClarityReader.swift:517 | Что проверить первым | What to test first | Was zuerst zu prüfen ist | Quoi vérifier en premier | 最初に検証すること |
| 31 | ClarityReader.swift:527 | Возможная модель оплаты | A possible payment model | Ein mögliches Bezahlmodell | Un modèle de paiement possible | 想定される課金モデル |
| 32 | ClarityReader.swift:532 | Связанное решение | A related solution | Eine verwandte Lösung | Une solution liée | 関連する解決策 |
| 33 | ClarityReader.swift:546 | Читать разбор категории | Read the category breakdown | Kategorie-Analyse lesen | Lire le décryptage de la catégorie | カテゴリーの分析を読む |
| 34 | ClarityReader.swift:550 | Записать свою мысль | Write down your thought | Deinen Gedanken festhalten | Noter ta pensée | 自分の考えを書きとめる |
| 35 | ClarityReader.swift:557 | Скачать документ | Download the document | Dokument herunterladen | Télécharger le document | 文書をダウンロード |
| 36 | ClarityReader.swift:558 | Полный разбор категории, идея и твоя заметка — в одном файле. | The full category breakdown, the idea and your note — in one file. | Die vollständige Kategorie-Analyse, die Idee und deine Notiz — in einer Datei. | Le décryptage complet de la catégorie, l’idée et ta note — dans un seul fichier. | カテゴリーの分析全文、アイデア、自分のメモを一つのファイルに。 |
| 37 | ClarityReader.swift:576 | Записать мысль | Write a thought | Gedanken festhalten | Noter une pensée | 考えを書く |
| 38 | ClarityReader.swift:578 | Действия с идеей | Idea actions | Aktionen zur Idee | Actions sur l’idée | アイデアの操作 |
| 39 | ClarityReader.swift:587 | Из отзывов | From reviews | Aus Rezensionen | Extraits d’avis | レビューより |
| 40 | ClarityReader.swift:595 | Отдельные цитаты к этой идее не приложены. Контекст доступен в разборе ниши. | No separate quotes are attached to this idea. The context is in the niche breakdown. | Zu dieser Idee sind keine eigenen Zitate beigelegt. Den Kontext gibt es in der Analyse der Nische. | Aucune citation distincte n’est jointe à cette idée. Le contexte se trouve dans le décryptage de la niche. | このアイデアに個別の引用は添えられていません。文脈はニッチの分析にあります。 |
| | **Problem reader (legacy)** | | | | | |
| 41 | ClarityReader.swift:665 | Наблюдение из разбора « | Observation from the breakdown « | Beobachtung aus der Analyse « | Observation du décryptage « | 分析からの所見 « |
| 42 | ClarityReader.swift:684 | Повторяющаяся тема в отзывах | A recurring theme in reviews | Ein wiederkehrendes Thema in Rezensionen | Un thème qui revient dans les avis | レビューに繰り返し現れるテーマ |
| 43 | ClarityReader.swift:686 | Что происходит | What’s going on | Was passiert | Ce qui se passe | 何が起きているか |
| 44 | ClarityReader.swift:687 | Что пишут люди | What people write | Was Menschen schreiben | Ce que les gens écrivent | 人が書いていること |
| 45 | ClarityReader.swift:688 | Фрагменты описывают опыт людей в разных приложениях. | The excerpts describe people’s experience across different apps. | Die Auszüge beschreiben die Erfahrungen von Menschen in verschiedenen Apps. | Les extraits décrivent l’expérience des gens dans différentes apps. | 抜粋は、さまざまなアプリでの人々の体験を伝えています。 |
| 46 | ClarityReader.swift:694 | Исходные цитаты к этой теме не приложены. | No source quotes are attached to this topic. | Zu diesem Thema sind keine Originalzitate beigelegt. | Aucune citation source n’est jointe à ce sujet. | このテーマに元の引用は添えられていません。 |
| 47 | ClarityReader.swift:696 | Разобраться в контексте | Get the context | Kontext verstehen | Comprendre le contexte | 文脈をつかむ |
| 48 | ClarityReader.swift:704 | Наблюдение | Observation | Beobachtung | Observation | 所見 |
| 49 | ClarityReader.swift:709 | Заметка к наблюдению | Note on the observation | Notiz zur Beobachtung | Note sur l’observation | 所見へのメモ |
| | **Save button & missing material** | | | | | |
| 50 | ClarityReader.swift:806 | Убрать из сохранённого | Remove from Saved | Aus Gespeichert entfernen | Retirer des Enregistrés | 保存済みから解除 |
| 51 | ClarityReader.swift:806 | Сохранить | Save | Speichern | Enregistrer | 保存 |
| 52 | ClarityReader.swift:807 | Сохранено | Saved | Gespeichert | Enregistré | 保存しました |
| 53 | ClarityReader.swift:807 | Не сохранено | Not saved | Nicht gespeichert | Non enregistré | 未保存 |
| 54 | ClarityReader.swift:816 | Материал недоступен | Material unavailable | Material nicht verfügbar | Contenu indisponible | 資料を表示できません |
| 55 | ClarityReader.swift:816 | Вернись в каталог и выбери другой материал. Сохранённые записи остаются на устройстве. | Go back to the catalog and pick another material. Saved entries stay on the device. | Geh zurück in den Katalog und wähl ein anderes Material. Gespeicherte Einträge bleiben auf dem Gerät. | Reviens au catalogue et choisis un autre contenu. Les entrées enregistrées restent sur l’appareil. | カタログに戻って別の資料を選んでください。保存した記録は端末に残ります。 |
| | **Note editor & export sheet** | | | | | |
| 56 | ClarityReader.swift:914 | Что хочется запомнить или проверить? | What do you want to remember or check? | Was willst du dir merken oder prüfen? | Que veux-tu retenir ou vérifier ? | 何を覚えておきたい、あるいは確かめたいですか？ |
| 57 | ClarityReader.swift:919 | Заметка хранится на этом устройстве. Удаление материала из сохранённого не удаляет заметку. | The note is kept on this device. Removing the material from Saved does not delete the note. | Die Notiz bleibt auf diesem Gerät. Das Entfernen des Materials aus Gespeichert löscht die Notiz nicht. | La note reste sur cet appareil. Retirer le contenu des Enregistrés ne supprime pas la note. | メモはこの端末に保存されます。資料を保存済みから外してもメモは消えません。 |
| 58 | ClarityReader.swift:923 | Моя заметка | My note | Meine Notiz | Ma note | 自分のメモ |
| 59 | ClarityReader.swift:925 | Отмена | Cancel | Abbrechen | Annuler | キャンセル |
| 60 | ClarityReader.swift:943 | Не сохранять изменения? | Discard changes? | Änderungen verwerfen? | Abandonner les modifications ? | 変更を破棄しますか？ |
| 61 | ClarityReader.swift:944 | Не сохранять | Don’t save | Nicht speichern | Ne pas enregistrer | 保存しない |
| 62 | ClarityReader.swift:945 | Продолжить редактирование | Keep editing | Weiter bearbeiten | Continuer l’édition | 編集を続ける |
| 63 | ClarityReader.swift:977 | Готовый документ | A ready document | Ein fertiges Dokument | Un document prêt | 完成した文書 |
| 64 | ClarityReader.swift:978 | Весь контекст.\nИ твоя идея. | The whole context.\nAnd your idea. | Der ganze Kontext.\nUnd deine Idee. | Tout le contexte.\nEt ton idée. | 文脈のすべて。\nそしてあなたのアイデア。 |
| 65 | ClarityReader.swift:980 | Разбор категории | Category breakdown | Kategorie-Analyse | Décryptage de catégorie | カテゴリーの分析 |
| 66 | ClarityReader.swift:980 | Полный текст: задачи людей, наблюдения, цитаты и выводы. | The full text: people’s jobs, observations, quotes and conclusions. | Der vollständige Text: Aufgaben der Menschen, Beobachtungen, Zitate und Schlüsse. | Le texte complet : les tâches des gens, les observations, les citations et les conclusions. | 全文：人々の課題、所見、引用、結論。 |
| 67 | ClarityReader.swift:981 | Идея целиком | The whole idea | Die ganze Idee | L’idée en entier | アイデアの全文 |
| 68 | ClarityReader.swift:981 | Весь материал об идее, включая основания и проверку решения. | Everything about the idea, including the evidence and how to test it. | Alles zur Idee, samt Belegen und der Prüfung der Lösung. | Tout sur l’idée, y compris les preuves et la façon de la tester. | 根拠と検証の方法を含む、アイデアに関するすべて。 |
| 69 | ClarityReader.swift:982 | Твоя заметка | Your note | Deine Notiz | Ta note | あなたのメモ |
| 70 | ClarityReader.swift:982 | Сохранённая мысль к этой идее. | The thought you saved for this idea. | Der Gedanke, den du zu dieser Idee gespeichert hast. | La pensée que tu as enregistrée pour cette idée. | このアイデアに書きとめた考え。 |
| 71 | ClarityReader.swift:983 | Один текстовый файл (.txt). Можно читать, редактировать или передать в ИИ вместе со своим вопросом. | One text file (.txt). You can read it, edit it or hand it to an AI with your question. | Eine Textdatei (.txt). Du kannst sie lesen, bearbeiten oder zusammen mit deiner Frage an eine KI geben. | Un seul fichier texte (.txt). Tu peux le lire, le modifier ou le donner à une IA avec ta question. | テキストファイル一つ（.txt）。読むことも、編集することも、質問といっしょにAIに渡すこともできます。 |
| 72 | ClarityReader.swift:986 | Разбор этой архивной категории недоступен. В файле будут идея и заметка. | The breakdown for this archived category isn’t available. The file will hold the idea and the note. | Die Analyse dieser archivierten Kategorie ist nicht verfügbar. In der Datei stehen die Idee und die Notiz. | Le décryptage de cette catégorie archivée n’est pas disponible. Le fichier contiendra l’idée et la note. | このアーカイブ済みカテゴリーの分析は利用できません。ファイルにはアイデアとメモが入ります。 |
| 73 | ClarityReader.swift:992 | Предпросмотр документа | Document preview | Dokumentvorschau | Aperçu du document | 文書のプレビュー |
| 74 | ClarityReader.swift:1011 | Не удалось сохранить документ. Попробуй ещё раз или поделись файлом. | Couldn’t save the document. Try again or share the file. | Das Dokument ließ sich nicht speichern. Versuch es noch einmal oder teil die Datei. | Impossible d’enregistrer le document. Réessaie ou partage le fichier. | 文書を保存できませんでした。もう一度試すか、ファイルを共有してください。 |
| 75 | ClarityReader.swift:1015 | Документ не сохранён | Document not saved | Dokument nicht gespeichert | Document non enregistré | 文書を保存できませんでした |
| 76 | ClarityReader.swift:1016 | Понятно | Got it | Verstanden | Compris | わかりました |
| 77 | ClarityReader.swift:1031 | Сохранить ещё раз | Save again | Erneut sichern | Enregistrer à nouveau | もう一度保存 |
| 78 | ClarityReader.swift:1031 | Сохранить в Файлы | Save to Files | In Dateien sichern | Enregistrer dans Fichiers | ファイルに保存 |
| 79 | ClarityReader.swift:1040 | Скопировано | Copied | Kopiert | Copié | コピーしました |
| 80 | ClarityReader.swift:1040 | Копировать | Copy | Kopieren | Copier | コピー |
| 81 | ClarityReader.swift:1047 | Не удалось подготовить файл. Попробуй ещё раз. | Couldn’t prepare the file. Try again. | Die Datei ließ sich nicht vorbereiten. Versuch es erneut. | Impossible de préparer le fichier. Réessaie. | ファイルを準備できませんでした。もう一度お試しください。 |
| 82 | ClarityReader.swift:1049 | Поделиться | Share | Teilen | Partager | 共有 |
| 83 | ClarityReader.swift:1052 | Документ сохранён | Document saved | Dokument gespeichert | Document enregistré | 文書を保存しました |
| | **Export document text** | | | | | |
| 84 | ClarityExportDocument.swift:8 | inApp · Идея и разбор категории | inApp · Idea and category breakdown | inApp · Idee und Kategorie-Analyse | inApp · Idée et décryptage de catégorie | inApp · アイデアとカテゴリー分析 |
| 85 | ClarityExportDocument.swift:8 | 1. РАЗБОР КАТЕГОРИИ | 1. CATEGORY BREAKDOWN | 1. KATEGORIE-ANALYSE | 1. DÉCRYPTAGE DE CATÉGORIE | 1. カテゴリー分析 |
| 86 | ClarityExportDocument.swift:21 | КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ | THE JOBS PEOPLE DO | WELCHE AUFGABEN MENSCHEN LÖSEN | LES TÂCHES DES GENS | 人々が解決したい課題 |
| 87 | ClarityExportDocument.swift:38 | Главное | Key points | Das Wichtigste | L’essentiel | 要点 |
| 88 | ClarityExportDocument.swift:39 | Приложения в категории | Apps in the category | Apps in der Kategorie | Apps de la catégorie | カテゴリー内のアプリ |
| 89 | ClarityExportDocument.swift:45 | Выводы об аудитории | Audience takeaways | Erkenntnisse zur Zielgruppe | Conclusions sur l’audience | 利用者についての結論 |
| 90 | ClarityExportDocument.swift:46 | Рынок | Market | Markt | Marché | 市場 |
| 91 | ClarityExportDocument.swift:47 | Оплата | Payment | Bezahlung | Paiement | 課金 |
| 92 | ClarityExportDocument.swift:57 | Разбор этой архивной категории отсутствует в текущем сборнике. | The breakdown for this archived category isn’t in the current collection. | Die Analyse dieser archivierten Kategorie fehlt in der aktuellen Sammlung. | Le décryptage de cette catégorie archivée ne figure pas dans le recueil actuel. | このアーカイブ済みカテゴリーの分析は、現在の収録には含まれていません。 |
| 93 | ClarityExportDocument.swift:59 | 2. ИДЕЯ | 2. IDEA | 2. IDEE | 2. IDÉE | 2. アイデア |
| 94 | ClarityExportDocument.swift:61 | 3. МОЯ ЗАМЕТКА | 3. MY NOTE | 3. MEINE NOTIZ | 3. MA NOTE | 3. 自分のメモ |
| | **Export document text (idea fallback)** | | | | | |
| 95 | EditorialContent.swift:54 | ДЛЯ КОГО | WHO IT’S FOR | FÜR WEN | POUR QUI | だれのためか |
| 96 | EditorialContent.swift:55 | СИТУАЦИЯ | SITUATION | SITUATION | SITUATION | 状況 |
| 97 | EditorialContent.swift:56 | КАК РЕШАЮТ СЕЙЧАС | HOW PEOPLE SOLVE IT NOW | WIE ES HEUTE GELÖST WIRD | COMMENT ON FAIT AUJOURD’HUI | いまはどう解決しているか |
| 98 | EditorialContent.swift:57 | ВОЗМОЖНОЕ РЕШЕНИЕ | POSSIBLE SOLUTION | MÖGLICHE LÖSUNG | SOLUTION POSSIBLE | 想定される解決策 |
| 99 | EditorialContent.swift:58 | ВОЗМОЖНОСТИ | CAPABILITIES | MÖGLICHKEITEN | POSSIBILITÉS | できること |
| 100 | EditorialContent.swift:59 | ГРАНИЦЫ РЕШЕНИЯ | SOLUTION LIMITS | GRENZEN DER LÖSUNG | LIMITES DE LA SOLUTION | 解決策の限界 |
| 101 | EditorialContent.swift:60 | ГЛАВНЫЙ ВОПРОС | THE OPEN QUESTION | DIE OFFENE FRAGE | LA QUESTION OUVERTE | 残る問い |
| 102 | EditorialContent.swift:61 | КАК ПРОВЕРИТЬ | HOW TO TEST IT | WIE MAN ES PRÜFT | COMMENT LE VÉRIFIER | どう検証するか |
| 103 | EditorialContent.swift:62 | ВОЗМОЖНАЯ ОПЛАТА | POSSIBLE PAYMENT | MÖGLICHE BEZAHLUNG | PAIEMENT POSSIBLE | 想定される課金 |
| 104 | EditorialContent.swift:64 | ФРАГМЕНТЫ ОТЗЫВОВ | REVIEW EXCERPTS | AUSZÜGE AUS REZENSIONEN | EXTRAITS D’AVIS | レビューの抜粋 |
| 105 | EditorialContent.swift:65 | МОЯ ЗАМЕТКА | MY NOTE | MEINE NOTIZ | MA NOTE | 自分のメモ |
| | **Saved tab & stored project** | | | | | |
| 106 | ClarityMy.swift:6 | Всё | All | Alles | Tout | すべて |
| 107 | ClarityMy.swift:6 | Разборы | Breakdowns | Analysen | Décryptages | 分析 |
| 108 | ClarityMy.swift:6 | Заметки | Notes | Notizen | Notes | メモ |
| 109 | ClarityMy.swift:52 | Найти в сохранённом | Search Saved | In Gespeichert suchen | Chercher dans Enregistrés | 保存済みを検索 |
| 110 | ClarityMy.swift:70 | Сохранено на этом iPhone | Saved on this iPhone | Auf diesem iPhone gespeichert | Enregistré sur cet iPhone | このiPhoneに保存 |
| 111 | ClarityMy.swift:89 | Сохранённое | Saved | Gespeichert | Enregistrés | 保存済み |
| 112 | ClarityMy.swift:90 | Твоя библиотека | Your library | Deine Bibliothek | Ta bibliothèque | あなたのライブラリ |
| 113 | ClarityMy.swift:90 | Материалы и личные заметки | Materials and personal notes | Materialien und persönliche Notizen | Contenus et notes personnelles | 資料と自分のメモ |
| 114 | ClarityMy.swift:95 | Настройки | Settings | Einstellungen | Réglages | 設定 |
| 115 | ClarityMy.swift:117 | Пока нет сохранённого | Nothing saved yet | Noch nichts gespeichert | Encore rien d’enregistré | 保存したものはまだありません |
| 116 | ClarityMy.swift:118 | Нажми закладку в разборе или идее — материал появится здесь. Заметки к нему тоже. | Tap the bookmark in a breakdown or idea — the material shows up here. Its notes too. | Tipp in einer Analyse oder Idee auf das Lesezeichen — das Material erscheint hier. Die Notizen dazu auch. | Touche le signet dans un décryptage ou une idée — le contenu apparaît ici. Ses notes aussi. | 分析やアイデアでブックマークを押すと、資料がここに表示されます。メモもいっしょに。 |
| 117 | ClarityMy.swift:122 | Открыть разборы | Open breakdowns | Analysen öffnen | Ouvrir les décryptages | 分析を開く |
| 118 | ClarityMy.swift:130 | Здесь пока пусто | Nothing here yet | Hier ist noch nichts | Rien ici pour l’instant | ここはまだ空です |
| 119 | ClarityMy.swift:130 | Ничего не найдено | Nothing found | Nichts gefunden | Rien trouvé | 見つかりませんでした |
| 120 | ClarityMy.swift:131 | Заметки к материалам появятся здесь, даже если убрать закладку. | Notes on materials show up here, even if you remove the bookmark. | Notizen zu Materialien erscheinen hier, auch wenn du das Lesezeichen entfernst. | Les notes sur les contenus apparaissent ici, même si tu retires le signet. | 資料へのメモは、ブックマークを外してもここに表示されます。 |
| 121 | ClarityMy.swift:131 | Сохрани материал этого раздела или посмотри всю библиотеку. | Save something from this section or browse the whole library. | Speicher etwas aus diesem Bereich oder sieh dir die ganze Bibliothek an. | Enregistre un contenu de cette section ou parcours toute la bibliothèque. | この画面の資料を保存するか、ライブラリ全体を見てみてください。 |
| 122 | ClarityMy.swift:131 | Попробуй другое название или слово из заметки. | Try another name or a word from your note. | Probier einen anderen Namen oder ein Wort aus der Notiz. | Essaie un autre nom ou un mot de ta note. | 別の名前か、メモの中の言葉を試してください。 |
| 123 | ClarityMy.swift:133 | Показать всё | Show everything | Alles anzeigen | Tout afficher | すべて表示 |
| 124 | ClarityMy.swift:133 | Сбросить поиск | Reset the search | Suche zurücksetzen | Réinitialiser la recherche | 検索をリセット |
| 125 | ClarityMy.swift:150 | %1$@. Есть твоя заметка. %2$@ | %1$@. You have a note. %2$@ | %1$@. Du hast eine Notiz. %2$@ | %1$@. Tu as une note. %2$@ | %1$@。メモがあります。%2$@ |
| 126 | ClarityMy.swift:162 | Действия: %1$@ | Actions: %1$@ | Aktionen: %1$@ | Actions : %1$@ | 操作：%1$@ |
| 127 | ClarityMy.swift:167 | Добавить заметку | Add a note | Notiz hinzufügen | Ajouter une note | メモを追加 |
| 128 | ClarityMy.swift:167 | Редактировать заметку | Edit the note | Notiz bearbeiten | Modifier la note | メモを編集 |
| 129 | ClarityMy.swift:173 | Проблемы | Problems | Probleme | Problèmes | 問題 |
| 130 | ClarityMy.swift:175 | Приложения | Apps | Apps | Apps | アプリ |
| 131 | ClarityMy.swift:178 | Приложение | App | App | App | アプリ |
| 132 | ClarityMy.swift:186 | Карточки | Cards | Karten | Fiches | カード |
| 133 | ClarityMy.swift:190 | Карточка | Card | Karte | Fiche | カード |
| 134 | ClarityMy.swift:192 | Карточка недоступна | Card unavailable | Karte nicht verfügbar | Fiche indisponible | カードを表示できません |
| 135 | ClarityMy.swift:192 | Закладка сохранена | Bookmark saved | Lesezeichen gespeichert | Signet enregistré | ブックマークしました |
| 136 | ClarityMy.swift:199 | Проекты | Projects | Projekte | Projets | プロジェクト |
| 137 | ClarityMy.swift:209 | Сравнение идей | Comparing ideas | Ideen im Vergleich | Comparaison d’idées | アイデアの比較 |
| 138 | ClarityMy.swift:247 | Приложение недоступно | App unavailable | App nicht verfügbar | App indisponible | アプリを表示できません |
| 139 | ClarityMy.swift:250 | Идея недоступна | Idea unavailable | Idee nicht verfügbar | Idée indisponible | アイデアを表示できません |
| 140 | ClarityMy.swift:251 | Разбор недоступен | Breakdown unavailable | Analyse nicht verfügbar | Décryptage indisponible | 分析を表示できません |
| 141 | ClarityMy.swift:252 | Проблема недоступна | Problem unavailable | Problem nicht verfügbar | Problème indisponible | 問題を表示できません |
| 142 | ClarityMy.swift:316 | Твой проект | Your project | Dein Projekt | Ton projet | あなたのプロジェクト |
| 143 | ClarityMy.swift:316 | Сохранённые решения и заметки | Saved solutions and notes | Gespeicherte Lösungen und Notizen | Solutions et notes enregistrées | 保存した解決策とメモ |
| 144 | ClarityMy.swift:318 | Следующий шаг | Next step | Nächster Schritt | Prochaine étape | 次の一歩 |
| 145 | ClarityMy.swift:319 | Кому это нужно | Who needs it | Wer das braucht | Qui en a besoin | だれに必要か |
| 146 | ClarityMy.swift:320 | Почему выберут продукт | Why people will choose it | Warum das Produkt gewählt wird | Pourquoi les gens le choisiront | なぜ選ばれるか |
| 147 | ClarityMy.swift:321 | Что проверено | What’s been checked | Was geprüft ist | Ce qui est vérifié | 確かめたこと |
| 148 | ClarityMy.swift:322 | Выбранные функции | Selected features | Ausgewählte Funktionen | Fonctions choisies | 選んだ機能 |
| 149 | ClarityMy.swift:325 | Запиши мысль | Write a thought | Gedanken notieren | Note une pensée | 考えを書く |
| 150 | ClarityMy.swift:326 | Сохранить заметку | Save the note | Notiz speichern | Enregistrer la note | メモを保存 |
| 151 | ClarityMy.swift:328 | Задание | Brief | Briefing | Brief | 指示書 |
| 152 | ClarityMy.swift:329 | Открыть исходную идею | Open the original idea | Ursprüngliche Idee öffnen | Ouvrir l’idée d’origine | 元のアイデアを開く |
| 153 | ClarityMy.swift:329 | Разбор и отзывы | Breakdown and reviews | Analyse und Rezensionen | Décryptage et avis | 分析とレビュー |
| 154 | ClarityMy.swift:333 | Проект | Project | Projekt | Projet | プロジェクト |
| | **Legacy card reader** | | | | | |
| 155 | ClarityLegacyCard.swift:25 | Открыть идею | Open the idea | Idee öffnen | Ouvrir l’idée | アイデアを開く |
| 156 | ClarityLegacyCard.swift:26 | Открыть разбор категории | Open the category breakdown | Kategorie-Analyse öffnen | Ouvrir le décryptage de la catégorie | カテゴリーの分析を開く |
| 157 | ClarityLegacyCard.swift:47 | Сохранённый материал | Saved material | Gespeichertes Material | Contenu enregistré | 保存した資料 |
| 158 | ClarityLegacyCard.swift:79 | Отзывы к материалу | Reviews behind the material | Rezensionen zum Material | Les avis à l’origine du contenu | 資料のもとになったレビュー |
| 159 | ClarityLegacyCard.swift:91 | Твоя заметка к материалу | Your note on the material | Deine Notiz zum Material | Ta note sur le contenu | 資料へのあなたのメモ |
| 160 | ClarityLegacyCard.swift:97 | Полный материал | The full material | Das vollständige Material | Le contenu complet | 資料の全文 |
| 161 | ClarityLegacyCard.swift:100 | Закладка сохранена. Можно открыть разбор этой категории. | Bookmark saved. You can open the breakdown for this category. | Lesezeichen gespeichert. Du kannst die Analyse dieser Kategorie öffnen. | Signet enregistré. Tu peux ouvrir le décryptage de cette catégorie. | ブックマークしました。このカテゴリーの分析を開けます。 |
| 162 | ClarityLegacyCard.swift:107 | Открываем материал… | Opening the material… | Material wird geöffnet… | Ouverture du contenu… | 資料を開いています… |
| | **Legacy saved-app reader** | | | | | |
| 163 | ClarityRatings.swift:262 | Редакционный анализ сохранённых отзывов | An editorial reading of the saved reviews | Eine redaktionelle Auswertung der gespeicherten Rezensionen | Une lecture éditoriale des avis enregistrés | 保存されたレビューの編集部による読み解き |
| 164 | ClarityRatings.swift:267 | Для каких задач используют | What people use it for | Wofür Menschen sie nutzen | Pour quelles tâches on l’utilise | どんな用途で使われているか |
| 165 | ClarityRatings.swift:268 | Что хвалят в отзывах | What reviews praise | Was Rezensionen loben | Ce que les avis saluent | レビューでほめられている点 |
| 166 | ClarityRatings.swift:269 | На что жалуются в отзывах | What reviews complain about | Worüber Rezensionen klagen | Ce dont les avis se plaignent | レビューで不満が出ている点 |
| 167 | ClarityRatings.swift:273 | Открыть в App Store | Open in App Store | Im App Store öffnen | Ouvrir dans l’App Store | App Storeで開く |
| 168 | ClarityRatings.swift:279 | Что можно улучшить в этой нише | What could be improved in this niche | Was sich in dieser Nische verbessern lässt | Ce qu’on peut améliorer dans cette niche | このニッチで良くできること |
| 169 | ClarityRatings.swift:279 | Читать исследование пользователей и продуктов | Read the research on users and products | Recherche zu Nutzern und Produkten lesen | Lire l’étude sur les utilisateurs et les produits | ユーザーと製品のリサーチを読む |
| 170 | ClarityRatings.swift:281 | Это материал из архива inApp. Перед установкой проверь текущие условия и возможности приложения в магазине. | This is material from the inApp archive. Before installing, check the app’s current terms and features in the store. | Das ist Material aus dem inApp-Archiv. Prüf vor der Installation die aktuellen Bedingungen und Funktionen der App im Store. | C’est un contenu de l’archive inApp. Avant d’installer, vérifie les conditions et les fonctions actuelles de l’app dans la boutique. | これはinAppのアーカイブの資料です。インストールの前に、ストアでアプリの現在の条件と機能を確認してください。 |
| 171 | ClarityRatings.swift:284 | В этом разборе больше нет такой записи. Сохранённая ссылка останется в твоей подборке. | This breakdown no longer has that entry. The saved link stays in your list. | Diesen Eintrag gibt es in der Analyse nicht mehr. Der gespeicherte Link bleibt in deiner Liste. | Ce décryptage n’a plus cette entrée. Le lien enregistré reste dans ta liste. | この分析にそのレコードはもうありません。保存したリンクは一覧に残ります。 |
| 172 | ClarityRatings.swift:293 | Убрать приложение из сохранённого | Remove the app from Saved | App aus Gespeichert entfernen | Retirer l’app des Enregistrés | アプリを保存済みから解除 |
| 173 | ClarityRatings.swift:293 | Сохранить приложение | Save the app | App speichern | Enregistrer l’app | アプリを保存 |
| 174 | ClarityRatings.swift:311 | Опыт пользователей | What users experience | Erfahrungen der Nutzer | L’expérience des utilisateurs | ユーザーの体験 |
| 175 | ClarityRatings.swift:313 | Отдельные примеры для этого приложения не включены в подборку. | No separate examples for this app are included in the selection. | Für diese App sind keine eigenen Beispiele in der Auswahl enthalten. | Aucun exemple distinct pour cette app n’est inclus dans la sélection. | このアプリの個別の事例は、この一覧に含まれていません。 |
| 176 | ClarityRatings.swift:316 | %1$@ фрагментов из разбора. Это отдельные случаи, а не оценка всех пользователей. | %1$@ excerpts from the breakdown. These are individual cases, not a verdict on all users. | %1$@ Auszüge aus der Analyse. Das sind Einzelfälle, kein Urteil über alle Nutzer. | %1$@ extraits du décryptage. Ce sont des cas individuels, pas un verdict sur tous les utilisateurs. | 分析からの抜粋%1$@件。個別の事例であり、すべてのユーザーの評価ではありません。 |
| 177 | ClarityRatings.swift:322 | Показать остальные %1$@ | Show the other %1$@ | Weitere %1$@ anzeigen | Afficher les %1$@ autres | 残り%1$@件を表示 |
| | **App compare (dormant)** | | | | | |
| 178 | ClarityCompareView.swift:22 | С чем сравним? | Compare with what? | Womit vergleichen? | Comparer avec quoi ? | 何と比べますか？ |
| 179 | ClarityCompareView.swift:22 | Выбери второе приложение для сравнения с %1$@. | Pick a second app to compare with %1$@. | Wähl eine zweite App zum Vergleich mit %1$@. | Choisis une deuxième app à comparer avec %1$@. | %1$@と比べるもう一つのアプリを選んでください。 |
| 180 | ClarityCompareView.swift:22 | Выбери приложение из этой темы. | Pick an app from this topic. | Wähl eine App aus diesem Thema. | Choisis une app de ce sujet. | このテーマのアプリを選んでください。 |
| 181 | ClarityCompareView.swift:24 | Название приложения | App name | App-Name | Nom de l’app | アプリ名 |
| 182 | ClarityCompareView.swift:26 | Пока нет подходящих результатов. Попробуй другое название. | No matching results yet. Try another name. | Noch keine passenden Ergebnisse. Probier einen anderen Namen. | Pas encore de résultat correspondant. Essaie un autre nom. | 該当する結果がまだありません。別の名前を試してください。 |
| 183 | ClarityCompareView.swift:34 | Посмотреть сравнение | See the comparison | Vergleich ansehen | Voir la comparaison | 比較を見る |
| 184 | ClarityCompareView.swift:41 | Сравнение | Comparison | Vergleich | Comparaison | 比較 |
| 185 | ClarityCompareView.swift:72 | %1$@\nи %2$@ | %1$@\nand %2$@ | %1$@\nund %2$@ | %1$@\net %2$@ | %1$@\nと%2$@ |
| 186 | ClarityCompareView.swift:75 | Редакционный анализ сохранённых отзывов: задачи, положительный опыт и жалобы пользователей. | An editorial reading of the saved reviews: jobs, good experiences and complaints. | Eine redaktionelle Auswertung der gespeicherten Rezensionen: Aufgaben, gute Erfahrungen und Beschwerden. | Une lecture éditoriale des avis enregistrés : tâches, expériences positives et plaintes. | 保存されたレビューの編集部による読み解き：課題、よかった体験、不満。 |
| 187 | ClarityCompareView.swift:77 | Для каких задач | What it’s used for | Wofür sie genutzt wird | Pour quelles tâches | どんな用途か |
| 188 | ClarityCompareView.swift:81 | Оставь в своём списке | Keep it in your list | Behalt sie in deiner Liste | À garder dans ta liste | 自分のリストに残す |
| 189 | ClarityCompareView.swift:87 | Посмотреть основания | See the evidence | Belege ansehen | Voir les preuves | 根拠を見る |
| 190 | ClarityCompareView.swift:93 | Сравнение недоступно | Comparison unavailable | Vergleich nicht verfügbar | Comparaison indisponible | 比較を表示できません |
| 191 | ClarityCompareView.swift:93 | Одно из приложений больше не входит в эту подборку. Вернись и выбери другое. | One of the apps is no longer in this selection. Go back and pick another. | Eine der Apps gehört nicht mehr zu dieser Auswahl. Geh zurück und wähl eine andere. | Une des apps ne fait plus partie de cette sélection. Reviens en arrière et choisis-en une autre. | 一方のアプリはこの一覧に含まれなくなりました。戻って別のアプリを選んでください。 |
| 192 | ClarityCompareView.swift:97 | Два приложения | Two apps | Zwei Apps | Deux apps | 二つのアプリ |
| 193 | ClarityCompareView.swift:113 | В подборке пока нет описания по этому пункту. | The selection has no description for this point yet. | Zu diesem Punkt gibt es in der Auswahl noch keine Beschreibung. | La sélection n’a pas encore de description pour ce point. | この項目の説明は、この一覧にはまだありません。 |
| 194 | ClarityCompareView.swift:126 | В сохранённом | In Saved | In Gespeichert | Dans Enregistrés | 保存済み |
| 195 | ClarityCompareView.swift:130 | Убрать из сохранённого: %1$@ | Remove from saved: %1$@ | Aus Gespeichert entfernen: %1$@ | Retirer des enregistrés : %1$@ | 保存済みから解除：%1$@ |
| 196 | ClarityCompareView.swift:130 | Сохранить: %1$@ | Save: %1$@ | Speichern: %1$@ | Enregistrer : %1$@ | 保存：%1$@ |
| 197 | ClarityCompareView.swift:137 | Отзывы на сайте | Reviews on the site | Rezensionen auf der Seite | Les avis sur le site | サイトのレビュー |
| | **Settings** | | | | | |
| 198 | ClaritySettings.swift:23 | Plus · режим просмотра | Plus · preview mode | Plus · Vorschaumodus | Plus · mode aperçu | Plus · プレビューモード |
| 199 | ClaritySettings.swift:24 | Проверяем доступ… | Checking access… | Zugang wird geprüft… | Vérification de l’accès… | アクセスを確認しています… |
| 200 | ClaritySettings.swift:25 | Бессрочный доступ | Lifetime access | Dauerhafter Zugang | Accès à vie | 永続アクセス |
| 201 | ClaritySettings.swift:26 | Проверь способ оплаты в App Store | Check your payment method in the App Store | Prüf deine Zahlungsmethode im App Store | Vérifie ton moyen de paiement dans l’App Store | App Storeで支払い方法を確認してください |
| 202 | ClaritySettings.swift:30 | Доступ до %1$@ | Access until %1$@ | Zugang bis %1$@ | Accès jusqu’au %1$@ | %1$@まで利用可能 |
| 203 | ClaritySettings.swift:32 | Все разборы, идеи и экспорт | Every breakdown, idea and export | Alle Analysen, Ideen und Export | Tous les décryptages, les idées et l’export | すべての分析、アイデア、エクスポート |
| 204 | ClaritySettings.swift:49 | О материалах | About materials | Über die Materialien | À propos des contenus | 資料について |
| 205 | ClaritySettings.swift:54 | Знакомство с приложением | App walkthrough | App-Rundgang | Découverte de l’app | アプリの紹介 |
| 206 | ClaritySettings.swift:57 | Написать разработчику | Contact the developer | Dem Entwickler schreiben | Écrire au développeur | 開発者に連絡する |
| 207 | ClaritySettings.swift:60 | Разработка | Development | Entwicklung | Développement | 開発 |
| 208 | ClaritySettings.swift:63 | Меню разработчика | Developer menu | Entwicklermenü | Menu développeur | 開発者メニュー |
| 209 | ClaritySettings.swift:67 | Правовая информация | Legal | Rechtliches | Mentions légales | 法的情報 |
| 210 | ClaritySettings.swift:68 | Конфиденциальность | Privacy | Datenschutz | Confidentialité | プライバシー |
| 211 | ClaritySettings.swift:71 | Условия использования | Terms of use | Nutzungsbedingungen | Conditions d’utilisation | 利用規約 |
| 212 | ClaritySettings.swift:75 | Закладки и заметки хранятся на этом iPhone. | Bookmarks and notes are kept on this iPhone. | Lesezeichen und Notizen bleiben auf diesem iPhone. | Les signets et les notes restent sur cet iPhone. | ブックマークとメモはこのiPhoneに保存されます。 |
| 213 | ClaritySettings.swift:104 | Язык | Language | Sprache | Langue | 言語 |
| 214 | ClaritySettings.swift:130 | Оформление | Appearance | Darstellung | Apparence | 外観 |
| 215 | ClaritySettings.swift:146 | Светлая | Light | Hell | Clair | ライト |
| 216 | ClaritySettings.swift:147 | Тёмная | Dark | Dunkel | Sombre | ダーク |
| 217 | ClaritySettings.swift:148 | Системная | System | System | Système | システム |
| 218 | ClaritySettings.swift:166 | Выбрана | Selected | Ausgewählt | Sélectionnée | 選択中 |
| 219 | ClaritySettings.swift:208 | Активен | Active | Aktiv | Actif | 有効 |
| 220 | ClaritySettings.swift:222 | Все разборы\nи идеи | Every breakdown\nand idea | Alle Analysen\nund Ideen | Tous les décryptages\net les idées | すべての分析\nとアイデア |
| 221 | ClaritySettings.swift:226 | Подробные исследования, идеи приложений и экспорт материалов. | Detailed research, app ideas and material export. | Ausführliche Recherchen, App-Ideen und Material-Export. | Des études détaillées, des idées d’apps et l’export des contenus. | 詳しいリサーチ、アプリのアイデア、資料のエクスポート。 |
| 222 | ClaritySettings.swift:232 | О моём Plus | About my Plus | Über mein Plus | À propos de mon Plus | 自分のPlusについて |
| 223 | ClaritySettings.swift:232 | Открыть Plus | Open Plus | Plus öffnen | Ouvrir Plus | Plusを開く |
| 224 | ClaritySettings.swift:241 | %1$@ в год | %1$@ a year | %1$@ pro Jahr | %1$@ par an | 年額%1$@ |
| 225 | ClaritySettings.swift:241 | Годовая подписка | Annual subscription | Jahresabo | Abonnement annuel | 年額サブスクリプション |
| 226 | ClaritySettings.swift:255 | Управление подпиской | Manage subscription | Abo verwalten | Gérer l’abonnement | サブスクリプションの管理 |
| 227 | ClaritySettings.swift:261 | Восстанавливаем… | Restoring… | Wiederherstellen… | Restauration… | 復元しています… |
| 228 | ClaritySettings.swift:261 | Восстановить покупки | Restore purchases | Käufe wiederherstellen | Restaurer les achats | 購入を復元 |
| 229 | ClaritySettings.swift:278 | Plus активен на этом устройстве. | Plus is active on this device. | Plus ist auf diesem Gerät aktiv. | Plus est actif sur cet appareil. | この端末でPlusが有効です。 |
| 230 | ClaritySettings.swift:278 | Доступ Plus не подтверждён. Можно повторить восстановление. | Plus access isn’t confirmed. You can try restoring again. | Der Plus-Zugang ist nicht bestätigt. Du kannst die Wiederherstellung wiederholen. | L’accès Plus n’est pas confirmé. Tu peux relancer la restauration. | Plusのアクセスが確認できません。もう一度復元を試せます。 |
| 231 | ClaritySettings.swift:298 | Разборы и идеи | Breakdowns and ideas | Analysen und Ideen | Décryptages et idées | 分析とアイデア |
| 232 | ClaritySettings.swift:298 | Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы. | The materials are built from app reviews. The quotes inside breakdowns show what the conclusions rest on. | Die Materialien entstehen aus Rezensionen zu Apps. Die Zitate in den Analysen zeigen, worauf die Schlüsse beruhen. | Les contenus sont construits à partir des avis sur les apps. Les citations dans les décryptages montrent sur quoi reposent les conclusions. | 資料はアプリのレビューをもとにつくられています。分析の中の引用は、結論が何にもとづくかを示します。 |
| 233 | ClaritySettings.swift:299 | Чтение без интернета | Reading without the internet | Lesen ohne Internet | Lecture sans Internet | インターネットなしで読む |
| 234 | ClaritySettings.swift:299 | Тексты и иллюстрации входят в приложение. Для покупки и восстановления доступа нужно подключение к App Store. | Texts and illustrations ship with the app. Buying and restoring access needs an App Store connection. | Texte und Illustrationen gehören zur App. Für Kauf und Wiederherstellung des Zugangs ist eine Verbindung zum App Store nötig. | Les textes et les illustrations sont inclus dans l’app. L’achat et la restauration de l’accès nécessitent une connexion à l’App Store. | 本文と図版はアプリに同梱されています。購入とアクセスの復元にはApp Storeへの接続が必要です。 |
| 235 | ClaritySettings.swift:300 | Бесплатный раздел | Free section | Kostenloser Bereich | Section gratuite | 無料の範囲 |
| 236 | ClaritySettings.swift:300 | Разбор интерьеров и 5 идей доступны бесплатно. Остальные идеи и полные разборы открываются с Plus. | The interior design breakdown and 5 ideas are free. Plus unlocks the other ideas and full breakdowns. | Die Analyse zur Raumgestaltung und 5 Ideen sind kostenlos. Plus öffnet die übrigen Ideen und vollständigen Analysen. | L’analyse sur l’aménagement intérieur et 5 idées sont gratuites. Plus donne accès aux autres idées et aux analyses complètes. | インテリアの分析と5つのアイデアは無料です。残りのアイデアと分析全文はPlusで読めます。 |
| 237 | ClaritySettings.swift:301 | Твои записи | Your records | Deine Einträge | Tes enregistrements | あなたの記録 |
| 238 | ClaritySettings.swift:301 | Закладки и заметки хранятся на этом устройстве. Удаление закладки не удаляет заметку. Синхронизации между устройствами нет. | Bookmarks and notes are kept on this device. Removing a bookmark does not delete the note. There is no syncing between devices. | Lesezeichen und Notizen bleiben auf diesem Gerät. Ein entferntes Lesezeichen löscht die Notiz nicht. Zwischen Geräten wird nichts synchronisiert. | Les signets et les notes restent sur cet appareil. Retirer un signet ne supprime pas la note. Il n’y a pas de synchronisation entre appareils. | ブックマークとメモはこの端末に保存されます。ブックマークを外してもメモは消えません。端末間の同期はありません。 |
| 239 | ClaritySettings.swift:303 | Сборник от %1$@ | Collection from %1$@ | Sammlung vom %1$@ | Recueil du %1$@ | %1$@時点の収録 |
| | **Privacy sheet** | | | | | |
| 240 | StudioPrivacy.swift:14 | Твои идеи\nостаются твоими. | Your ideas\nstay yours. | Deine Ideen\nbleiben deine. | Tes idées\nrestent les tiennes. | あなたのアイデアは\nあなたのもの。 |
| 241 | StudioPrivacy.swift:16 | Как inApp хранит и использует данные. | How inApp stores and uses data. | Wie inApp Daten speichert und verwendet. | Comment inApp conserve et utilise les données. | inAppがデータをどう保存し、どう使うか。 |
| 242 | StudioPrivacy.swift:20 | На этом устройстве | On this device | Auf diesem Gerät | Sur cet appareil | この端末で |
| 243 | StudioPrivacy.swift:20 | Избранное и место чтения хранятся в приложении. Записи из прежних версий также остаются на устройстве. Для работы не нужны имя, почта или аккаунт inApp. | Saved items and your reading position are kept inside the app. Entries from earlier versions also stay on the device. No name, email or inApp account is needed to use it. | Gespeichertes und deine Leseposition bleiben in der App. Einträge aus früheren Versionen bleiben ebenfalls auf dem Gerät. Für die Nutzung sind weder Name noch E-Mail noch ein inApp-Konto nötig. | Les éléments enregistrés et ta position de lecture restent dans l’app. Les entrées des versions précédentes restent aussi sur l’appareil. Aucun nom, e-mail ni compte inApp n’est nécessaire pour l’utiliser. | 保存済みと読んでいた位置はアプリの中に保存されます。以前のバージョンの記録も端末に残ります。利用に名前、メール、inAppのアカウントは必要ありません。 |
| 244 | StudioPrivacy.swift:21 | Покупки | Purchases | Käufe | Achats | 購入 |
| 245 | StudioPrivacy.swift:21 | Оплату и восстановление полного доступа обрабатывает Apple. Приложение получает сведения о праве доступа; реквизиты банковской карты приложению недоступны. | Apple handles payment and the restoring of full access. The app receives entitlement information; your card details are not available to the app. | Zahlung und Wiederherstellung des vollen Zugangs wickelt Apple ab. Die App erhält Angaben zur Berechtigung; deine Kartendaten sind für die App nicht zugänglich. | Apple gère le paiement et la restauration de l’accès complet. L’app reçoit les informations de droit d’accès ; les données de ta carte bancaire ne lui sont pas accessibles. | 支払いとフルアクセスの復元はAppleが処理します。アプリが受け取るのは利用権の情報だけで、カードの情報はアプリからは見えません。 |
| 246 | StudioPrivacy.swift:22 | Когда используется интернет | When the internet is used | Wann das Internet genutzt wird | Quand l’app utilise Internet | インターネットを使うとき |
| 247 | StudioPrivacy.swift:22 | Тексты исследований и иллюстрации входят в приложение. Интернет нужен для работы с покупками через Apple и статистики подписок через RevenueCat. Ссылки на источники, приложения и контакты открываются по твоему нажатию на внешних сайтах с собственными правилами обработки данных. | Research texts and illustrations are included in the app. An internet connection is used for Apple purchases and RevenueCat subscription statistics. Source, app and contact links open only when you tap them, on external sites with their own privacy policies. | Texte und Illustrationen sind in der App enthalten. Internet wird für Käufe über Apple und Abonnementstatistiken über RevenueCat benötigt. Links zu Quellen, Apps und Kontaktseiten öffnen sich erst beim Antippen auf externen Websites mit eigenen Datenschutzregeln. | Les textes et les illustrations sont inclus dans l’application. Internet sert aux achats via Apple et aux statistiques d’abonnements via RevenueCat. Les liens vers les sources, les applications et les contacts ne s’ouvrent qu’à ta demande, sur des sites externes ayant leurs propres règles de confidentialité. | 調査記事とイラストはアプリに含まれています。Appleでの購入とRevenueCatによるサブスクリプション統計にはインターネットを使用します。出典、アプリ、お問い合わせのリンクはタップした場合にのみ外部サイトで開き、それぞれのプライバシーポリシーが適用されます。 |
| 248 | StudioPrivacy.swift:23 | Избранное | Saved items | Gespeichertes | Éléments enregistrés | 保存済み |
| 249 | StudioPrivacy.swift:23 | Приложение не отправляет избранное и историю чтения на сервер inApp. Закладки доступны на этом устройстве и не синхронизируются между устройствами. | The app does not send your saved items or reading history to an inApp server. Bookmarks live on this device and are not synced between devices. | Die App sendet weder Gespeichertes noch deinen Leseverlauf an einen inApp-Server. Lesezeichen liegen auf diesem Gerät und werden nicht zwischen Geräten synchronisiert. | L’app n’envoie pas tes éléments enregistrés ni ton historique de lecture à un serveur inApp. Les signets restent sur cet appareil et ne sont pas synchronisés entre appareils. | アプリは保存済みや閲覧履歴をinAppのサーバーへ送りません。ブックマークはこの端末にあり、端末間で同期されません。 |
| 250 | StudioPrivacy.swift:24 | Аналитика | Analytics | Analysedaten | Données d’analyse | アナリティクス |
| 251 | StudioPrivacy.swift:24 | Для статистики покупок и подписок используется RevenueCat. Сервис получает случайный идентификатор установки, сведения о покупках, пробных периодах и продлениях, а также технические данные приложения и устройства. Мы не передаём ему заметки, избранное или историю чтения. Рекламного отслеживания нет. | RevenueCat provides purchase and subscription statistics. It receives a random installation identifier, purchase, trial and renewal information, and technical app and device data. We do not send it your notes, bookmarks or reading history. There is no advertising tracking. | Für Kauf- und Abonnementstatistiken verwenden wir RevenueCat. Der Dienst erhält eine zufällige Installationskennung, Informationen zu Käufen, Probezeiträumen und Verlängerungen sowie technische App- und Gerätedaten. Notizen, Lesezeichen und Leseverlauf werden nicht übermittelt. Es gibt kein Werbetracking. | RevenueCat fournit les statistiques d’achats et d’abonnements. Le service reçoit un identifiant d’installation aléatoire, les informations d’achat, d’essai et de renouvellement, ainsi que des données techniques sur l’application et l’appareil. Nous ne lui transmettons ni tes notes, ni tes favoris, ni ton historique de lecture. Il n’y a aucun suivi publicitaire. | 購入とサブスクリプションの統計にRevenueCatを使用しています。ランダムなインストール識別子、購入・無料体験・更新の情報、アプリと端末の技術情報が送信されます。メモ、ブックマーク、閲覧履歴は送信しません。広告目的の追跡は行いません。 |
| 252 | StudioPrivacy.swift:25 | Удаление данных | Deleting data | Daten löschen | Suppression des données | データの削除 |
| 253 | StudioPrivacy.swift:25 | Закладку можно убрать из избранного. Удаление приложения удаляет его локальные данные; наличие резервной копии зависит от настроек iOS. Восстановление покупки через Apple не восстанавливает удалённые заметки. | A bookmark can be removed from your saved items. Deleting the app deletes its local data; whether a backup exists depends on your iOS settings. Restoring a purchase through Apple does not restore deleted notes. | Ein Lesezeichen lässt sich aus deinen gespeicherten Einträgen entfernen. Beim Löschen der App verschwinden ihre lokalen Daten; ob es ein Backup gibt, hängt von deinen iOS-Einstellungen ab. Ein über Apple wiederhergestellter Kauf holt gelöschte Notizen nicht zurück. | Un signet peut être retiré de tes éléments enregistrés. Supprimer l’app supprime ses données locales ; l’existence d’une sauvegarde dépend de tes réglages iOS. Restaurer un achat via Apple ne restaure pas les notes supprimées. | ブックマークは保存済みから外せます。アプリを削除するとローカルのデータも消えます。バックアップがあるかはiOSの設定によります。Apple経由で購入を復元しても、削除したメモは戻りません。 |
| 254 | StudioPrivacy.swift:26 | Связаться с разработчиком | Contact the developer | Kontakt zum Entwickler | Contacter le développeur | 開発者に連絡する |
| 255 | StudioPrivacy.swift:28 | Обновлено 21 сентября 2026 года | Updated September 21, 2026 | Aktualisiert am 21. September 2026 | Mis à jour le 21 septembre 2026 | 2026年9月21日更新 |
| | **Developer menu (DEBUG)** | | | | | |
| 256 | ClarityDeveloperSettings.swift:10 | Режим доступа | Access mode | Zugangsmodus | Mode d’accès | アクセスモード |
| 257 | ClarityDeveloperSettings.swift:11 | Переключай версию приложения для проверки экранов. Выбор сохранится после перезапуска. | Switch the app version to check screens. The choice survives a restart. | Schalt die App-Version um, um Bildschirme zu prüfen. Die Wahl bleibt nach einem Neustart erhalten. | Change la version de l’app pour vérifier les écrans. Le choix survit au redémarrage. | 画面を確認するためにアプリのバージョンを切り替えます。選択は再起動後も残ります。 |
| 258 | ClarityDeveloperSettings.swift:27 | Выбран | Selected | Ausgewählt | Sélectionné | 選択中 |
| 259 | ClarityDeveloperSettings.swift:31 | В App Store:  | In the App Store: | Im App Store: | Dans l’App Store : | App Storeでは： |
| 260 | ClarityDeveloperSettings.swift:33 | «Бесплатно» и «Plus» меняют только доступ для просмотра. Покупка и восстановление в этих режимах отключены. Настоящие покупки сохраняются. Меню доступно только в отладочной сборке. | “Free” and “Plus” change only the access you see. Buying and restoring are off in these modes. Real purchases are kept. The menu is only in debug builds. | „Kostenlos“ und „Plus“ ändern nur den sichtbaren Zugang. Kauf und Wiederherstellung sind in diesen Modi aus. Echte Käufe bleiben erhalten. Das Menü gibt es nur in Debug-Builds. | « Gratuit » et « Plus » ne changent que l’accès affiché. L’achat et la restauration sont désactivés dans ces modes. Les achats réels sont conservés. Le menu n’existe que dans les builds de débogage. | 「無料」と「Plus」は表示されるアクセス範囲を変えるだけです。これらのモードでは購入と復元は無効です。実際の購入は保持されます。このメニューはデバッグビルドにのみあります。 |
| 261 | ClarityDeveloperSettings.swift:38 | Разработчик | Developer | Entwickler | Développeur | 開発者 |
| 262 | Purchases.swift:46 | Как в App Store | Like the App Store | Wie im App Store | Comme dans l’App Store | App Storeと同じ |
| 263 | Purchases.swift:47 | Бесплатно | Free | Kostenlos | Gratuit | 無料 |
| 264 | Purchases.swift:53 | Доступ определяется настоящими покупками. | Access follows real purchases. | Der Zugang richtet sich nach echten Käufen. | L’accès suit les achats réels. | アクセスは実際の購入にしたがいます。 |
| 265 | Purchases.swift:54 | Бесплатная категория, закрытые материалы и экран покупки. | A free category, locked material and the purchase screen. | Eine kostenlose Kategorie, gesperrte Materialien und der Kaufbildschirm. | Une catégorie gratuite, du contenu verrouillé et l’écran d’achat. | 無料のカテゴリー、ロックされた資料、購入画面。 |
| 266 | Purchases.swift:55 | Все категории, идеи и полный экспорт открыты. | All categories, ideas and the full export are unlocked. | Alle Kategorien, Ideen und der vollständige Export sind freigeschaltet. | Toutes les catégories, les idées et l’export complet sont ouverts. | すべてのカテゴリー、アイデア、完全なエクスポートが開放されています。 |
| 267 | Purchases.swift:61 | Проверяем покупки… | Checking purchases… | Käufe werden geprüft… | Vérification des achats… | 購入を確認しています… |
| 268 | Purchases.swift:62 | Бессрочный Plus | Lifetime Plus | Plus dauerhaft | Plus à vie | 買い切りのPlus |
| 269 | Purchases.swift:62 | Plus активен | Plus is active | Plus ist aktiv | Plus est actif | Plusが有効です |
| 270 | Purchases.swift:62 | Бесплатный доступ | Free access | Kostenloser Zugang | Accès gratuit | 無料アクセス |
| | **Restore / purchase messages** | | | | | |
| 271 | Purchases.swift:237 | Сейчас включён режим просмотра. Для покупок и восстановления выбери «Как в App Store» в меню разработчика. | Preview mode is on. For purchases and restores, pick “Like the App Store” in the developer menu. | Der Vorschaumodus ist an. Für Käufe und Wiederherstellung wähl im Entwicklermenü „Wie im App Store“. | Le mode aperçu est activé. Pour les achats et les restaurations, choisis « Comme dans l’App Store » dans le menu développeur. | いまはプレビューモードです。購入と復元には、開発者メニューで「App Storeと同じ」を選んでください。 |
| 272 | Purchases.swift:259 | App Store принял покупку, но доступ пока не подтверждён. Попробуй восстановить покупки. | The App Store accepted the purchase, but access isn’t confirmed yet. Try restoring purchases. | Der App Store hat den Kauf angenommen, der Zugang ist aber noch nicht bestätigt. Versuch, die Käufe wiederherzustellen. | L’App Store a accepté l’achat, mais l’accès n’est pas encore confirmé. Essaie de restaurer les achats. | App Storeは購入を受け付けましたが、アクセスはまだ確認されていません。購入の復元をお試しください。 |
| 273 | Purchases.swift:266 | App Store пока не подтвердил покупку. Попробуй проверить её статус позже. | The App Store hasn’t confirmed the purchase yet. Check its status later. | Der App Store hat den Kauf noch nicht bestätigt. Prüf den Status später. | L’App Store n’a pas encore confirmé l’achat. Vérifie son statut plus tard. | App Storeがまだ購入を確認していません。あとで状況を確認してください。 |
| | **Stores: errors & kind titles** | | | | | |
| 274 | StudioNotebook.swift:12 | Проблема | Problem | Problem | Problème | 問題 |
| 275 | StudioNotebook.swift:84 | Не удалось прочитать заметки и дополнительные закладки. Исходные данные сохранены. Проекты и сохранённые идеи по-прежнему доступны. | Notes and extra bookmarks could not be read. The original data is intact. Projects and saved ideas are still available. | Notizen und zusätzliche Lesezeichen ließen sich nicht lesen. Die ursprünglichen Daten sind erhalten. Projekte und gespeicherte Ideen sind weiterhin verfügbar. | Impossible de lire les notes et les signets supplémentaires. Les données d’origine sont intactes. Les projets et les idées enregistrées restent disponibles. | メモと追加のブックマークを読み込めませんでした。元のデータは無事です。プロジェクトと保存したアイデアは引き続き利用できます。 |
| 276 | StudioNotebook.swift:140 | Не удалось сохранить изменения. Текст остаётся на экране — попробуй ещё раз. | Changes could not be saved. The text is still on screen — try again. | Die Änderungen ließen sich nicht speichern. Der Text bleibt auf dem Bildschirm — versuch es noch einmal. | Impossible d’enregistrer les modifications. Le texte est toujours à l’écran — réessaie. | 変更を保存できませんでした。本文は画面に残っています。もう一度お試しください。 |
| | **Stores: stages & errors** | | | | | |
| 277 | StudioDomain.swift:90 | Изучаю | Exploring | Erkunden | Exploration | 調査中 |
| 278 | StudioDomain.swift:91 | Проверяю | Validating | Prüfen | Validation | 検証中 |
| 279 | StudioDomain.swift:92 | Делаю | Building | Bauen | Construction | 開発中 |
| 280 | StudioDomain.swift:93 | Отложил | On hold | Zurückgestellt | En pause | 保留中 |
| 281 | StudioDomain.swift:172 | Не удалось прочитать проекты. Исходные данные сохранены; новые изменения не будут записаны поверх них. | Projects could not be read. The original data is intact; new changes will not be written over it. | Projekte ließen sich nicht lesen. Die ursprünglichen Daten sind erhalten; neue Änderungen werden nicht darüber geschrieben. | Impossible de lire les projets. Les données d’origine sont intactes ; les nouvelles modifications ne seront pas écrites par-dessus. | プロジェクトを読み込めませんでした。元のデータは無事で、新しい変更が上書きされることはありません。 |
| | **Stores: errors** | | | | | |
| 282 | ClarityAppShelf.swift:30 | Не удалось прочитать сохранённые приложения. Исходные данные сохранены. | Couldn’t read the saved apps. The original data is kept. | Die gespeicherten Apps ließen sich nicht lesen. Die ursprünglichen Daten sind erhalten. | Impossible de lire les apps enregistrées. Les données d’origine sont conservées. | 保存したアプリを読み込めませんでした。元のデータは残っています。 |
| 283 | ClarityAppShelf.swift:52 | Не удалось сохранить приложение. Попробуй ещё раз. | Couldn’t save the app. Try again. | Die App ließ sich nicht speichern. Versuch es erneut. | Impossible d’enregistrer l’app. Réessaie. | アプリを保存できませんでした。もう一度お試しください。 |
| | **Shared controls** | | | | | |
| 284 | ClarityStyle.swift:141 | Очистить поиск | Clear search | Suche löschen | Effacer la recherche | 検索をクリア |
| 285 | ClarityBackNavigation.swift:13 | Назад | Back | Zurück | Retour | 戻る |
| | **Restore / purchase messages** | | | | | |
| 286 | Strings.swift:226 | На этом Apple ID покупок не нашлось. | No purchases found for this Apple ID. | Für diese Apple-ID wurden keine Käufe gefunden. | Aucun achat trouvé pour cet identifiant Apple. | このApple IDでは購入が見つかりませんでした。 |
| 287 | Strings.swift:222 | Apple не подтвердила покупку. Доступ не открыт. | Apple could not verify the purchase. Access was not granted. | Apple konnte den Kauf nicht bestätigen. Der Zugang wurde nicht freigeschaltet. | Apple n’a pas pu vérifier l’achat. L’accès n’a pas été ouvert. | Appleが購入を確認できませんでした。アクセスは開放されていません。 |
