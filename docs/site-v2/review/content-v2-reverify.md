# content/v2 — independent re-verification against the iOS app (2026-09-23)

Scope: the generated content in `content/v2` (written by `scripts/v2/import-app-content.ts`), checked
against the Swift code (`Content/*.swift`, `Clarity/ClarityResearchFlow.swift`, `ClarityReader.swift`,
`ClarityCatalogs.swift`, `ClarityContentAccess.swift`, `ClarityWelcomeExamples.swift`,
`ClarityWelcomeContentPreview.swift`, `ClarityResearchArtwork.swift`, `ClarityIdeaCardArt.swift`,
`Studio/StudioEditorial.swift`, `Strings/UIStrings.swift`) and the raw `Inapp/Resources/*.json`.
Report only; nothing in the repo was changed except this file.

## Verdict

**0 mismatches** across every checked field, in all 5 locales. I re-derived the expected output
before I read the importer. I then fixed a set of deliberate errors in the expected data, and the
diff reported every one of them (9 of 9), so the zero is not an empty pass.
I found 2 visible problems. In both, the web output matches the app, so the fix belongs in the app
packs. I also found 2 hidden risks in the importer and runtime that do not affect today's data.

## Method

The scripts live in `/tmp/v2verify/`:

| Script | What it does |
|---|---|
| `derive.mjs` | Ports the Swift code (not the importer) to Node. It resolves packs with `LocalePacks` / `BundledContent.read` chains, using strict Decodable-style schema checks, and applies `StudioEditorial` sha-verified overrides + `preparedData` on `text.ru`/`rich.ru`. It builds the `Library.join` and `canonicalIdeas`, the catalogue order (`orderedResults` + `localizedStandardCompare`), the free-first idea order, `ClarityResearchFlow` (assignment, the placement filter, article-wide idea and quote dedupe), `QuoteReading.text`, the article-validity rule, the artwork map, the TOC, and the onboarding examples. Output goes to `/tmp/v2verify/expected/<L>/…` |
| `diff.mjs` | Diffs the expected output field by field against `content/v2` and prints the exact field path of each mismatch. |
| `check.swift` | Runs **real Foundation** (`enumerateSubstrings(.bySentences)`, `trimmingCharacters`, `components(separatedBy:"\n\n")`) on the raw packs. It checks all 50 onboarding excerpts (25 body + 25 quote) and all 4,140 observation passages (828 × 5) against `content/v2`. |
| `picker.swift` | Checks Foundation `localizedStandardCompare`-equivalent ordering of the 35 names against `Intl.Collator(L,{numeric,sensitivity:"base"})`, in 5 locales. |
| `bonus.mjs` | Checks `ui.json` against the packs (ru identity over the 755-key union) and `search.json` haystacks against `ClarityCatalogs.swift:25-27,173-174`. |

What was compared (all locales ru/en/de/fr/ja):

| Area | Coverage | Result |
|---|---|---|
| 35 topics: name, summary, corpus, lead, audiences, sections (id/title/intro/art), observations (id/title/passages/quotes text+rating+app/art), placements (directionId/title/body/ideas), remainingDirections/Ideas, conclusion, toc, free | 175 files. Per locale: 101 sections, 272 observations, 225 placements (none without ideas), 792 quotes | identical |
| Research catalogue: order (= `LaunchEdition` via `orderedResults`, all 35 illustrated), name, summary, cover src, free, corpus, ideaCount | 5 × 35 | identical |
| Ideas catalogue: order (rank, slug), `canonicalIdeas` no-op, free flags (= `freeIdeaIDs`), cover src | 5 × 293 | identical. The runtime `orderIdeas` (`src/site/content/search.ts:48-64`, used by `ideas/page.tsx:62`) matches the free-first comparator at `ClarityCatalogs.swift:175-182` |
| Cards (`ClarityIdeaCardCopy`) | 5 × 293 | identical |
| Idea articles: title, description, categoryName, blocks (paragraph/heading/idea/quote → display text, rating, app), rank, free | **all** 1,465 files (per locale: 888 paragraphs, 588 headings, 294 quotes, 4 idea insets). The requested random 30 (seeded) are listed below the table. | identical |
| Onboarding: 5 articles (label via `L()`, observation title, excerpt, art src, quote excerpt + rating, no article-wide dedupe) and 5 ideas (teaser for `interior-design-1` via `L()`, else card copy) | 5 × 10. Excerpts also checked with real Foundation | identical |
| Quote fallback (de/fr/ja) | 792 research + 294 idea quotes per locale | exactly 2 research quotes per locale fall back to English, the same as the app (F2). Idea quotes: 0 fallbacks |
| Alt texts | 213 research images + 35 catalogue covers | See F5. This is a deliberate deviation. |

The random sample of 30 ideas: notes-pkm-10, pet-care-8, voice-recorder-5, resume-builder-8,
interior-design-6, personal-finance-6, personal-finance-2, plant-care-7, habit-tracking-8, translator-7,
teleprompter-captions-8, wardrobe-outfit-3, meditation-mindfulness-10, habit-tracking-3, pet-care-6,
wardrobe-outfit-6, notes-pkm-4, hiking-trails-4, password-manager-2, run-tracking-3, weather-apps-3,
calendars-tasks-4, music-streaming-1, personal-finance-3, notes-pkm-3, scanner-pdf-4, interior-design-4,
weather-apps-4, guitar-tuner-learn-4, flashcards-7. All 150 locale files are identical to my derivation.

These packs resolved identically in both derivations:
- text: own file for each locale.
- rich: ru → `rich.ru`; en/de/fr/ja → `rich.en`.
- research-editorial, idea-articles and idea-cards: own file.
- quote-translations: ru/de/fr/ja own file; en none.
- editorial-reading and research-idea-contexts: `.ru` for every locale.
- ui: none for ru; own file for the others.

Editorial overrides: 690 accepted. None of them changes any rendered research or idea text. In the
launch set, the overrides that match `text.ru` and `rich.ru` only change fields Clarity does not show
(`workout-fitness-7` monetization, `voice-recorder-8` gap, and dossier prose).

## Findings

### F1 — minor — English idea page shows a Russian quote (the app does the same)
- Web: `content/v2/en/ideas/flashcards-4.json.blocks[1].quote.text` (block `example`) =
  «Очень плохо формирует карточки, непонятно, по какому принципу…». This is the only Cyrillic string
  in any non-ru content file (all catalog, cards, onboarding, search, research, idea and ui files
  were scanned).
- Source: `facts.json` → `flashcards-4.quotes[1]` has `lang:"ru"`. `QuoteReading.swift:13` reads
  quote-translations with `ownChain` only, and there is no `quote-translations.en.json`. So
  `QuoteReading.text` (`:17-25`) returns the Russian original. The app shows the same text
  (`ClarityReader.swift:625-627` → `:868`).
- Importer cause: `displayQuote` (`import-app-content.ts:787-792`) is a faithful port. The web
  output matches the app.
- Fix (at the source, so the app is fixed too): add `Inapp/Resources/quote-translations.en.json`:
  ```json
  {"version":1,"locale":"en","translations":{
    "Очень плохо формирует карточки, непонятно, по какому принципу он это делает, то у меня 10 карточек, то 64, из них, например, кто написал какую книгу, хотя эта лекция по истории, загрузила лекцию на русском языке, почему-то меня задают вопросы на английском":
    "It makes terrible cards, no idea what principle it goes by, one time I get 10 cards, then 64, and among them things like who wrote which book, even though this is a history lecture, I uploaded a lecture in Russian and for some reason the questions come in English"}}
  ```
  The value is the English rendering already in `rich.en` `flashcards-finding-4.evidence[1].quote`.
  Then re-run the import. The importer already resolves `quote-translations.en` via `ownChain("en")`
  (`:707`). If `Tools/validate-locale.py` rejects a one-key pack, the web-only alternative is: in
  `buildLocale`, for `L==="en"`, map a Russian facts quote to the `rich.en` evidence with the same
  `app` whose `rich.ru` counterpart equals the original.

### F2 — minor — de/fr/ja: 2 research quotes show English (the app does the same; the translations exist under another key)
- Web (these exact paths in de, fr and ja):
  - `<L>/research/run-tracking.json.sections[0].observations[0].quotes[0].text` (observation
    `pause`, "The design and the idea are great…")
  - `<L>/research/flashcards.json.sections[0].observations[0].quotes[1].text` (observation
    `generation`, "It makes terrible cards…")
- Source: de/fr/ja read `rich.en` (`Library.swift:41-52`, no `rich.de/fr/ja`). In `rich.en` both
  evidence items (`run-tracking-finding-1#1`, `flashcards-finding-4#1`) are the English rendering
  of a Russian original, with `translation: null`. The de/fr/ja packs key their translation by the
  **Russian** original:
  - run-tracking: a stale key (the only unreachable key in each pack; 1,052 keys for 1,053
    reachable texts);
  - flashcards: the key used by the `flashcards-4` idea quote.

  So `QuoteReading.text` misses and shows the English original.
- The importer matches the app (`:1055-1059`, and README "exactly like the app"). Note that spec 04
  §9 #11 is inaccurate: the packs do have the flashcards translation, but under the Russian key.
- Fix (at the source): in `quote-translations.{de,fr,ja}.json`, add two entries keyed by the
  `rich.en` English texts. Copy the values from the existing Russian-keyed entries («Оформление и
  задумка супер…» and «Очень плохо формирует карточки…»). The Russian run-tracking key can then be
  dropped. Re-import. The warning count `quotesWithoutOwnTranslation` goes from 2 to 0.

### F3 — minor (hidden today) — `excerpt()` does not count blank-line segments the way the app does
- Web: `src/site/content/text.ts:43-53` (`sentenceSpans` drops whitespace-only segments), used by
  `excerpt()` at `:77-84` (importer `:1273,1276`).
- App: `ClarityWelcomeExamples.swift:109-123` counts every enumerated sentence. Foundation emits
  blank-line segments. Real Foundation output for `"First one. Second one.\n\nThird one."` is
  `["First one. ", "Second one.\n", "\n", "Third one.\n", …]`, and ICU/Intl gives the same.
- Today all 50 excerpts are identical under real Foundation, because no skip/count window crosses a
  blank line. If an example's window ever spans `"\n\n"`:
  - the app shows fewer sentences, or `""`;
  - the web silently shows a later sentence.
- Fix: in `excerpt()`, index the raw segments without filtering:
  ```ts
  const segs = [...(sentenceSegmenter(locale)?.segment(text) ?? [])];
  const picked = segs.slice(Math.max(0, skip), Math.max(0, skip) + count);
  if (!picked.length) return "";
  const last = picked[picked.length - 1];
  return text.slice(picked[0].index, last.index + last.segment.length).trim();
  ```
  Keep the filtered `sentences()` for `paragraphs()` / `firstSentence()`. The importer's existing
  empty-excerpt error (`:1274`) then flags the degenerate case.

### F4 — minor (hidden today) — the importer's pack acceptance is weaker than Swift `Decodable`
- Web: `import-app-content.ts:502-507`. `acceptEditorial`, `acceptIdeaCards` and `acceptQuoteTr`
  check only the top-level keys.
- App: `LocalePacks.read` (`AppLocale.swift:200-206`) drops the **whole** pack on any nested decode
  error and moves to the next locale in the chain (de → en → ru). The structs are in
  `ResearchEditorial.swift:7-103`, `ClarityIdeaCardArt.swift:5-9` and `QuoteReading.swift:6-9`.
- Today every pack passes my strict schema checks, so there is no effect. Future risk: a de article
  missing `intro` or `title` would be written with that key silently absent (`ov()` at `:547-552`
  passes `undefined` through; `:1075`), while the app would switch all of de to the English pack.
  Likewise, a card missing `description` would make the app use en cards, while the web would use
  `text.de.oneLiner`.
- Fix: validate each pack against the Swift struct shapes (the required string, array and int
  fields listed above) and make a nested decode failure an import **error**. Failing is safer than
  copying the app's silent language fallback.

### F5 — info (deliberate, no action) — alt texts are localized on the web
- The app passes the `launch-research-artwork.json` labels through without `L()`
  (`ClarityResearchArtwork.swift:36-38`), so en/de/fr/ja VoiceOver reads Russian for 32 categories.
- The web localizes them. This affects 224 alt texts per non-ru locale (32 × 6 research images + 32
  catalogue covers). All 896 equal `ui.<L>.json[strings][<Russian label>]`.
- The 3 hand-coded categories use `L()` in both.
- ru alts match the app exactly. This is documented in `content/v2/README.md` and answers spec 04
  §10 Q3.

### F6 — info — places that differ from the Swift code but cannot produce different output today
- The research catalogue is emitted in `LAUNCH` order instead of porting `orderedResults`
  (`ClarityCatalogs.swift:14-21`). This is equivalent, because the importer fails the build when a
  launch topic lacks an article or cover (`:954-966`).
- `observations[].art` is emitted even when an observation has no passages and no quotes. The app
  draws the art only inside the position-0 iteration (`ClarityReader.swift:267-278`). No such
  observation exists (every one of the 272 has passages).
- Whitespace trimming uses JS `trim()` rather than Swift `.whitespacesAndNewlines`. The two differ
  only on U+FEFF and U+0085, and neither character occurs in the data. All 4,140 passages are
  identical under Foundation.

## Why the importer and my derivation agree (importer read after the diff)

Each Swift rule has a line-for-line port in the importer:

| Swift rule | Importer port |
|---|---|
| chains (`AppLocale.swift:62-97`) | `:457-462` |
| `LocalePacks` / `BundledContent` | `:471-500` |
| `StudioEditorial` sha check + `preparedData` | `:517-573` |
| `Library.join` | `:712-724` |
| `canonicalIdeas` | `:763-777` |
| `QuoteReading` | `:787-792` |
| `selectedQuotes` | `:795-812` |
| flow assignment / placements / dedupe | `:974-1066` |
| TOC | `:1099-1107` |
| idea validity + blocks | `:1178-1228` |
| onboarding | `:1258-1300` |

Its hard-coded tables (`HANDCRAFTED_ART`, `ONBOARDING_ARTICLES`, `IDEA_TEASERS`) are drift-checked
against the Swift source (`:415-450`). It also validates counts (35 / 293 / 792), cross-locale
structure, and paid-text leaks before writing. The web-side consumers I looked at exist and use the
data correctly:
- `welcome/page.tsx:52-54` maps `quote.excerpt` → `text`;
- `WelcomeFlow.tsx:305-307` renders `«…»` and `{rating} ★`;
- `ideas/page.tsx:62` uses `orderIdeas` with `viewer.plus`.

No file in scope was missing or unfinished.
