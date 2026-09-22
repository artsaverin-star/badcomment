# 04 · Content data model (data contract for the web version)

Status: research spec, 2026-09-22. Source of truth: the live iOS app `Inapp/` (Clarity shell).
All paths below are relative to `/Users/artsaverin/projects/app_04_inapp/Inapp/` unless stated otherwise.
File:line citations point at that tree. Where code and docs disagree, the code wins and the discrepancy is listed in §9.

---

## 0. TL;DR for implementers

* Clarity shows exactly **35 research categories** (`LaunchEdition.categories`, `Content/LaunchEdition.swift:6-18`) and the **293 ideas** in them. That holds in every locale. The bundle has more data (72 categories, 592 ideas in Russian), but no screen shows it.
* Five locales ship: `ru, en, de, fr, ja` (`Resources/locales.json`). The default is `en`. Content and UI always use the same language.
* Per locale, the content that is actually rendered is **1.4–2.0 MB of JSON** (0.56–0.67 MB gzip) once pre-split and pre-resolved (§7). The raw bundle files the app reads are **12–32 MB per locale**. Do not load the raw files on the 2 GB server.
* Images: **510 raster files are referenced** (293 idea covers, 213 research illustrations, 4 welcome illustrations). The source is 119.9 MB of JPEG/PNG. As WebP at 1200/800/480 px widths that comes to ~37 MB (§6).
* Paid text must never reach the client for locked users. Locked idea cards expose **artwork only**, with no title, description or category name. Locked research exposes name, summary and cover (§5.6, §7.6).
* Recommended layout: `content/v2/<locale>/{catalog.json, cards.json, search.json, onboarding.json, ui.json, research/<category>.json, ideas/<slug>.json}` plus `public/media/{research,ideas,welcome}/<name>-<w>.webp`. A build script resolves every fallback, override and quote translation ahead of time, so the web runtime has no fallback logic for content (§7).

---

## 1. Resource inventory

`Resources/` holds 41 JSON files (43.4 MB total), `Assets.xcassets` (208.4 MB, 1,024 entries) and `Fonts/Onest.ttf`.
In the "Used by Clarity" column, **Yes** means the live Clarity UI renders data from the file. **Load-only** means the file is decoded but none of its data reaches a Clarity screen. **Legacy** means it is reachable only from pre-Clarity saved items.

| File | Bytes | Loader (file:line) | Used by Clarity? | What Clarity takes from it | Needed on web |
|---|---:|---|---|---|---|
| `locales.json` | 392 | `AppLocale.available` / `fallbackDefault` (`Content/AppLocale.swift:36-55`) | Yes | available locales, default | Yes → `manifest.json` |
| `facts.json` | 4,937,564 | `BundledContent.loadFacts` (`Content/Library.swift:54`) | Yes (partial) | `slug, category, rank, quotes[]` (quote blocks of idea articles). `prompt` (3.75 MB), `stats`, `painObs/loveObs`, `markets` (225 KB) are decoded but not rendered by Clarity | Only slug/category/rank + referenced quotes (baked in) |
| `text.ru.json` | 2,481,017 | `BundledContent.loadText` (`Library.swift:41-55`) + `StudioEditorial.preparedData` (ru only, `Library.swift:48-49`) | Yes | `categories` (category display names). `ideas[slug]` must exist (join drops ideas without text, `Library.swift:200-217`). `title`/`oneLiner` for search and card fallback | names + title/oneLiner for search |
| `text.{en,de,fr,ja}.json` | 883–898 K each | same | Yes | same (35 categories / 293 ideas each) | same |
| `rich.ru.json` | 14,696,156 | `BundledContent.loadRich` (`Library.swift:56`) + `preparedData` | Yes (partial) | `corpusApps`, `corpusReviews`, `findings[].evidence[]` addressed by `quoteRefs`. `rating` only in the legacy app view | corpus numbers + referenced evidence (baked in) |
| `rich.en.json` | 1,527,946 | same; also the fallback for de/fr/ja (there is no `rich.de/fr/ja`) | Yes (partial) | same; has no `rating` branch | same |
| `research-editorial.{ru,en,de,fr,ja}.json` | ru 1,687,350; others 611–701 K | `ResearchEditorial` via `LocalePacks` (`Content/ResearchEditorial.swift:105-111`) | Yes | the full research article (35 categories; ru has 72, 37 are unused) | Yes, full (35) |
| `idea-articles.{ru,en,de,fr,ja}.json` | ru 582,462; others 383–426 K | `IdeaArticles` (`Content/IdeaArticles.swift:26-45`) | Yes | the full idea article (293) | Yes, full |
| `idea-cards.{ru,en,de,fr,ja}.json` | ru 86,819; others 58–66 K | `ClarityIdeaCardCopy` (`Clarity/ClarityIdeaCardArt.swift:4-16`) | Yes | card title + description (293) | Yes (gated) |
| `quote-translations.ru.json` | 3,482,708 | `QuoteReading` (`Content/QuoteReading.swift:13`) | Yes | 1,052 of its 6,801 keys are reachable | only visible keys (baked in) |
| `quote-translations.{de,fr,ja}.json` | 488–507 K | same | Yes | 1,052 keys each | baked in |
| `ui.{en,de,fr,ja}.json` | 91–101 K | `UIStrings` (`Strings/UIStrings.swift:31-47`) | Yes | UI strings (755 keys) + 5 plural keys. There is **no `ui.ru.json`**: Russian keys are the source strings | Yes, plus a generated `ui.ru.json` |
| `launch-research-artwork.json` | 43,206 | `ClarityResearchArtwork.launchArticles` (`Clarity/ClarityResearchArtwork.swift:31-45`) | Yes | image placement for 32 categories (asset name + Russian alt text) | baked into research files |
| `studio-art.json` | 4,124 | `ClarityIdeaCardArt.categories` (`ClarityIdeaCardArt.swift:23-31`) | Load-only in practice | fallback object per category. Never hit, because all 293 ideas have covers | No (keep as build fallback) |
| `editorial-overrides.ru.json` | 1,010,642 | `StudioEditorial` (`Studio/StudioEditorial.swift:19-37`) | Yes (ru) | exact-match text replacements applied to `text.ru`, `rich.ru`, `studio.json` and to every rendered paragraph | Build-time only |
| `research-idea-corrections.ru.json` | 98,128 | same | Yes (ru) | same mechanism, 145 entries | Build-time only |
| `editorial-reading.ru.json` | 189,076 | `EditorialContent` (`Content/EditorialContent.swift:29-35`) | Load-only for the 35/293 | `canonicalSlug` (no effect on the launch set, §3.4), `audience` (idea search haystack), `findingSections` (fallback research path only) | Optional (ru search) |
| `research-idea-contexts.ru.json` | 10,996 | same (checked first) | same | 11 ideas, none in the launch set | No |
| `studio.json` | 2,531,192 | `StudioContent.reload` (`Studio/StudioDomain.swift:57-65`), with `preparedData` | Yes (small) | **A load error blocks the whole app** (`Clarity/ClarityRoot.swift:36-41`). `builtAt` ("Сборник от …", `ClaritySettings.swift:302-303`), `ideas[slug].buyer` (search haystack, fallback idea view), `problems` (legacy saved problems) | Only `builtAt` → manifest |
| `quote-sources.json` | 34,511 | `StudioQuoteSources` (`Studio/StudioQuoteSources.swift:32-37`) | Legacy (Decks / unreachable Compare view) | — | No |
| `Fonts/Onest.ttf` (+ LICENSE) | 193,056 | `ClarityWelcomeTypography` (`Clarity/ClarityWelcomeTypography.swift:15-33`) | Yes | onboarding / paywall typography (variable `wght`) | Yes (woff2 + OFL license) |
| `Assets.xcassets` | 208,416,947 | `Image(...)` / `UIImage(named:)` | Partly | 510 images (§6) | 510 images → WebP |

"Reachable" means reachable from `App/RootView.swift → ClarityRootView` in a Release build. `DebugScreenHost` and the Studio/Views/Decks screens are not reachable, apart from legacy saved-item routes (`ClarityRoute.app`, `.problem`, `.legacyCard`, `.storedProject`). The web version has no legacy saved state, so it drops them (§8).

---

## 2. Source schemas (TypeScript-style), with sample values

Decoding in the app uses `JSONDecoder`. Unknown keys are ignored. Keys listed below as unread exist in the files, but Swift does not decode them.

### 2.1 `locales.json`
```ts
interface LocalesManifest {
  version: 1;
  comment: string;                 // Russian note, ignore
  default: "en";                   // fallbackDefault (AppLocale.swift:49-55)
  available: ["ru","en","ja","de","fr"]; // file order; display order is computed (§4.1)
}
```

### 2.2 `facts.json` (locale-independent, version 2)
```ts
interface FactsFile {
  version: 2;                      // not checked by the app
  ideas: FactIdea[];               // 592 (293 in launch categories)
  markets: Record<CategorySlug, Market>; // 72 — not used by Clarity
}
interface FactIdea {               // Models/Idea.swift:21-35
  slug: string;                    // "photo-editing-1"  (= `${category}-${n}`)
  category: string;                // "photo-editing"
  rank: number;                    // 0..591, unique globally — curated order
  stats: { apps: number; reviews: number; observations: number }; // not shown (reviews is known-wrong, Idea.swift:142-145)
  painObs: number; loveObs: number;
  quote: Quote | null;             // never null in current data
  quotes: Quote[];                 // 5 for 585 ideas, 4 for 7
  prompt: string | null;           // English build brief, avg 6.3K chars — NOT used by Clarity
}
interface Quote { text: string; app: string; rating: number /*1..5*/; lang: "en" | "ru" } // 2,951 en + 2 ru
// Market / Player / Keyword: Idea.swift:94-131 — not used by Clarity.
```
Sample: `{"slug":"photo-editing-1","category":"photo-editing","rank":0,"stats":{"apps":100,"reviews":45526,"observations":52},"painObs":31,"loveObs":52,"quote":{"text":"Best retouching app available. …","app":"TouchRetouch","rating":5,"lang":"en"},"quotes":[…5…],"prompt":"…"}`

Quote list rule used everywhere: `quotes.length ? quotes : (quote ? [quote] : [])` (`IdeaArticles.swift:47-50`).

### 2.3 `text.<L>.json` (version 2)
```ts
interface TextPack {                // Models/Idea.swift:54-72
  version: 2; locale: string;
  categories: Record<CategorySlug, string>;  // ru: 72, others: exactly the 35 launch slugs
  ideas: Record<IdeaSlug, IdeaText>;         // ru: 592, others: exactly the 293 launch ideas
}
interface IdeaText {
  title: string;                   // "Remove clutter from a photo"
  oneLiner: string;
  gap: string; pitch: string;      // "\n\n"-separated paragraphs
  features: string[]; antiFeatures: string[];
  monetization: string;
  mechanisms: { title?: string|null; obsCount: number; apps: string[]; polarity: "pain"|"love" }[];
}
```
Only `categories`, `title` and `oneLiner` matter for the 293 launch ideas. `gap/pitch/features/antiFeatures/monetization` render only in the fallback idea view (§5.5), which is unreachable because every launch idea has a valid article.

### 2.4 `rich.<L>.json` (research dossiers; files exist for `ru` and `en` only)
```ts
interface RichPack { version: 1; locale: "ru"|"en"; dossiers: Record<CategorySlug, ResearchDossier> } // ru 72, en 35
interface ResearchDossier {        // Models/ResearchDossier.swift:14-25
  rank?: number|null;              // 390.40…  (unused)
  corpusApps?: number|null;        // 61     → hero sentence (§5.3)
  corpusReviews?: number|null;     // 18442
  observations?: number|null;
  thesis?: { governing: string; competitorRead: string; pillars: {title:string; dek:string; match?:string[]|null}[] } | null;
  audience: { segments: AudienceSegment[]; takeaway: string };
  market: { money: string; marketLead: string; metrics?: {
      ratingsTotal?: number|null; installMinimum?: number|null; installApps?: number|null;
      prices: string[]; revenueLow?: string|null; revenueHigh?: string|null; revenueNote?: string|null } | null };
  channels: { name: string; note: string; count: number; quotes: {app:string; quote:string}[] }[];
  rating?: { count: number; totalReviews: number; apps: RatedApp[] } | null;  // ru only (5.65 MB for launch cats)
  findings?: ResearchFinding[] | null;
}
interface AudienceSegment { name; job; payLevel; payNote; servedBy: string[]; gap; cover?: string|null }
interface ResearchFinding { id: string /*"interior-design-finding-0"*/; title; plus; minus; count: number; apps: string[]; evidence: ResearchQuote[] }
interface ResearchQuote { app: string; rating: number; quote: string /*original*/; translation: string|null }
interface RatedApp { id: string /*App Store id*/; title; icon?: string|null; storeAvg?: number|null; ratings: number;
  realScore?: number|null; authenticity?: string|null; verdict; loved; weak; whoFor; shots: string[] }
```
Sample evidence: `{"app":"RoomGPT : AI Interior Design","rating":5,"quote":"i was about to hire an interior designer …","translation":null}`.
Facts verified for the 35 launch categories:
* Finding ids and evidence order are identical in `rich.en` and `rich.ru`.
* `corpusApps` and `corpusReviews` are identical in both.
* In `rich.en`, 1,465 of 1,658 evidence items carry an English `translation`: 1,461 are equal to `quote`, 4 are lightly edited. In 5 items the Russian original was translated into English in `quote` (flashcards-finding-4, journaling-mood-finding-4, nutrition-calories-finding-5, …).
* For the editorial path Clarity reads only `corpusApps`, `corpusReviews` and `findings[].id/evidence[]`.

### 2.5 `research-editorial.<L>.json` (version 1)
```ts
interface ResearchEditorialPack {   // Content/ResearchEditorial.swift:98-103
  version: 1; locale: string;       // locale is NOT checked by the app
  editedAt: "2026-09-15"; sourceRichSHA256: string;  // unread
  categories: Record<CategorySlug, ResearchArticle>; // ru 72, others 35 (= LaunchEdition)
}
interface ResearchArticle {
  category: string;                 // == key
  summary: string;                  // catalogue card subtitle + hero
  lead: string;                     // "Главное"
  audiences: { title: string; body: string; sourceFindingIDs: string[] }[];
  sections: { id: string; title: string; intro: string; observations: Observation[] }[];
  directions: Direction[];
  conclusion: { title: string; body: string } | null;   // present for all 35
}
interface Observation { id: string; title: string; body: string /* authored passages separated by "\n\n" */;
  sourceFindingIDs: string[]; quoteRefs: { findingID: string; quoteIndex: number }[] }
interface Direction { id: string; title: string; body: string; sourceFindingIDs: string[];
  observationID: string | null; ideaSlugs: string[] }
```
Counts per locale for the 35 categories: 101 sections, 272 observations, 792 quoteRefs, 225 directions, 35 conclusions. Every direction has a valid `observationID` and at least one idea slug. The structure (ids, refs, slugs) is identical across all 5 locales; only the text differs.
Sample observation (en): `{"id":"decision","title":"A picture gives everyone something to talk about","body":"Discussing a future interior …\n\nThat is already …","sourceFindingIDs":[…],"quoteRefs":[{"findingID":"interior-design-finding-0","quoteIndex":1},…]}`.
Sample direction: `{"id":"shopping-path","title":"From a look you like to a concrete choice","body":"The step after choosing a look …","sourceFindingIDs":["interior-design-finding-0"],"ideaSlugs":["interior-design-4"],"observationID":"decision"}`.

### 2.6 `idea-articles.<L>.json` (version 1)
```ts
interface IdeaArticlesPack { version: 1; locale?: string /* missing in ru */; articles: Record<IdeaSlug, IdeaArticle> } // 293 each
interface IdeaArticle { title: string; description: string; blocks: IdeaBlock[] }   // 5..15 blocks
type IdeaBlock =
  | { id: string; kind: "paragraph" | "heading"; text: string }
  | { id: string; kind: "quote"; quoteIndex: number }        // index into facts quotes of THIS idea
  | { id: string; kind: "idea"; title: string; text: string };
```
Block totals per locale: 888 paragraph, 588 heading, 294 quote, 4 idea. Block ids, kinds and quoteIndex are identical across locales, and all 5 × 293 articles pass the validity check (§5.5).
Sample (en, `interior-design-1`): `title "A new room. The same walls."`, blocks `{"id":"decision-before-purchase","kind":"paragraph","text":"Someone wants to refresh the living room …"}`, `{"id":"recognizable-room","kind":"heading","text":"Recognizing your own room"}`, `{"id":"ceiling-quote","kind":"quote","quoteIndex":2}`.

### 2.7 `idea-cards.<L>.json`
```ts
interface IdeaCardsPack { version: 1 /* not checked */; locale?: string; ideas: Record<IdeaSlug, { title: string; description: string }> } // 293
```
ru `interior-design-1`: `{"title":"Новая комната. Те же стены.","description":"Примерять мебель и отделку на фотографии своей комнаты, заранее отмечая, что должно остаться на месте."}`. The en/de/fr/ja card copy equals the article title and description.

### 2.8 `quote-translations.<L>.json` (ru, de, fr, ja; no `en`)
```ts
interface QuoteTranslationsPack { version: 1; locale: string; editedAt?: string;
  translations: Record<string /* exact original quote text */, string /* reading text */> } // ru 6,801; de/fr/ja 1,052
```
Sample ja: `"I do not wish for Grammarly AI to assist with my writing because …" → "Grammarly AIに自分の文章を手伝ってもらいたくない。…"`.

### 2.9 `ui.<L>.json` (en, de, fr, ja)
```ts
interface UIPack { version: 1; locale: string;
  strings: Record<string /* Russian source string = key */, string>;           // 755 keys, identical keysets
  plurals?: Record<"идея"|"наблюдение"|"наблюдение в отзывах"|"отзыв"|"приложение",
                   Partial<Record<"zero"|"one"|"two"|"few"|"many"|"other", string>>> }
```
* Keys may contain `\n` as a real newline, e.g. `"Все разборы\nи идеи"`, `"Весь контекст.\nИ твоя идея."`.
* 23 keys contain positional format tokens `%1$@`, `%2$@`, … (e.g. `"Мы изучили %1$@ %2$@ о работе %3$@ %4$@."` → en `"We studied %1$@ %2$@ about how %3$@ %4$@ work."`, ja `"%3$@件の%4$@がどう使われているかについて、%1$@件の%2$@を調べました。"`). Translators may reorder tokens. Web: `s.replace(/%(\d+)\$@/g, (_, n) => args[n-1])`.
* Plurals: en `{"отзыв":{"one":"review","other":"reviews"},"приложение":{"one":"app","other":"apps"}, …}`; ja uses only `other`; fr `"отзыв":{"one":"avis","other":"avis"}`.

### 2.10 `launch-research-artwork.json`
```ts
type LaunchResearchArtwork = Record<CategorySlug /* 32 = launch minus interior-design, habit-tracking, personal-finance */, {
  prefix: string;                                   // "ResearchLaunch_calendars-tasks_" (unread)
  cover: ArtEntry; audiences: ArtEntry;
  observations: Record<ObservationId, ArtEntry>;    // exactly 4 per category, all ids exist in the article
}>;
interface ArtEntry { assetName: string; accessibilityLabel: string /* Russian only */ }
```
Sample: `"calendars-tasks": {"cover":{"assetName":"ResearchLaunch_calendars-tasks_cover","accessibilityLabel":"Календари и задачи"},"audiences":{"assetName":"ResearchLaunch_calendars-tasks_audiences","accessibilityLabel":"Разные задачи в категории «Календари и задачи»."},"observations":{"capture-view":{"assetName":"ResearchLaunch_calendars-tasks_capture-view","accessibilityLabel":"Иллюстрация к теме «Записать сейчас, разобрать позже»."}, …}}`.
The alt texts follow templates: cover = category name (24/32, the rest are small variants); audiences = `Разные задачи в категории «<name>».` or `Задачи людей: <name>`; observations = `Иллюстрация к теме «<observation title>».` (128/128). The web can therefore generate localized alt text (§4.5).

### 2.11 `studio-art.json`
```ts
interface StudioArtFile { version: 1;
  roles: Record<"ideas"|"problems"|"research"|"library"|"project"|"premium"|"note"|"source"|"empty", AssetName>; // unread (StudioArtCatalogue is dead code)
  categories: Record<CategorySlug, AssetName> }   // 72, e.g. "interior-design":"StudioObject_paint_roller"
```

### 2.12 Editorial corrections (ru; build-time on web)
```ts
interface EditorialOverrides {            // editorial-overrides.ru.json
  version: 1; locale: "ru"; scope: string;
  entries: { id; file; path /* JSON pointer, informational */; sha256; original; replacement; reason;
             status: "reworded" | "withheld"; reviewedAt }[];   // 545 (449 reworded, 96 withheld)
  reviewedNotChanged: {…}[];                                      // 38, ignored
}
interface ResearchIdeaCorrections { version: 1; editedAt; entries: { id; original; sha256; replacement; status: "reworded" }[] } // 145
```
Algorithm (`Studio/StudioEditorial.swift:19-63`):
1. Accept an entry only if `sha256(original UTF-8) == sha256`, `replacement.trim() !== ""` and `status ∈ {reworded, withheld}`. All 690 entries pass today.
2. `text(s) = entries[s]?.replacement ?? s`. The match is whole-string and exact.
3. `preparedData(json)` walks every string value and replaces it, except in these cases:
   * keys `evidence, quotes, quote, quoteRu, translation, translations, original, app, appName, appTitle, author, appID, id, slug` are copied verbatim (whole subtree);
   * `apps` is copied verbatim when it is a string array;
   * inside an object that has both `id` and `verdict`, `title` and `name` are copied verbatim.
4. `preparedData` runs on `text.ru` and `rich.ru` only when the **ru** file is the one resolved (`Library.swift:46-49`), and on `studio.json` (`StudioDomain.swift:62`).
5. `text()` also runs at render time on every paragraph (`ClarityReading.paragraphs`, `firstSentence`; `ClarityReader.swift:33-62`), in any locale. Only Russian strings can match.

Hits in the launch scope today: `text.ru` 3, `rich.ru` 86. There are 0 hits in `research-editorial.ru`, `idea-articles.ru`, `idea-cards.ru` and `editorial-reading.ru`.
Withheld replacements are the placeholders `"Редакционный вывод уточняется."` (91) and `"Аудитория требует уточнения."` (5).
**Web: apply this at build time to the ru data and ship the result.** The runtime does not need the override files.

### 2.13 `editorial-reading.ru.json` / `research-idea-contexts.ru.json` (EditorialContent)
```ts
interface EditorialReadingPack { version: 1; editedAt: string;
  ideas: Record<IdeaSlug, { audience?; currentApproach?; openQuestion?; validation?; kind?;
                            canonicalSlug?; relationship?; relatedCanonical?; paymentReviewed?: boolean }>; // 107 (+11 in contexts)
  findingSections: Record<FindingId, { index?: number; title?: string; summary?: string; assignmentBasis?: string }> } // 859
```
Lookup: `researchContexts.ideas[slug] ?? editorialReading.ideas[slug]` (`EditorialContent.swift:35`). 25 launch ideas have a context. The only launch idea with a foreign `canonicalSlug` is `photo-editing-2 → ai-photo-restore-1`, and it is ignored (§3.4).

### 2.14 `studio.json` (only `builtAt` matters)
```ts
interface StudioPack { version: 1; builtAt: "2026-09-05";
  problems: StudioProblem[];                       // 160, legacy
  ideas: Record<IdeaSlug, { buyer: string; pay; risk; painTitle; asOf; screens: {title;purpose;hero;data}[]; designDirection }> } // 592, Russian
```

### 2.15 Runtime join (what "Idea" and "Niche" mean in Swift)
* `Idea` = `FactIdea` ⨝ `text.<L>.ideas[slug]`, plus `categoryName = text.categories[category] ?? category` (`Library.swift:200-217`). An idea without text is dropped. That is why the library holds 293 ideas in en/de/fr/ja and 592 in ru.
* `Niche` is built for every category that has ideas. `name = text.categories[slug]`. The list is sorted by pain share (`Library.swift:130-148`), but every Clarity screen re-sorts it, so the pain-share order is never visible.
* `library.ideas(in: c)` = ideas of category `c` sorted by `rank` ascending (`Library.swift:124-126`).
* `dailySlug` / `ordered` (idea of the day) are **not used by Clarity**.

---

## 3. Selection and ordering: 35 categories, 293 ideas

### 3.1 The launch edition (explicit list, `Content/LaunchEdition.swift:6-18`)
Order = catalogue order. Counts: `ideas` = launch ideas; `sec/obs/dir` = article sections, observations, directions; corpus = `corpusReviews/corpusApps`. Idea list = suffix numbers in **rank order** (global rank in parentheses).

| # | slug | ideas | ideas by rank: `n(rank)` | sec/obs/dir | corpus |
|---|---|---|---|---|---|
| 1 | `interior-design` | 8 | 1(309), 2(364), 3(373), 4(438), 5(452), 8(453), 6(482), 7(488) | 3/7/8 | 18442/61 |
| 2 | `habit-tracking` | 10 | 1(4), 6(13), 2(22), 5(30), 7(38), 3(46), 4(56), 8(144), 9(170), 10(306) | 3/8/10 | 31299/98 |
| 3 | `personal-finance` | 10 | 1(5), 4(10), 5(15), 6(26), 2(35), 7(41), 3(47), 8(133), 9(245), 10(351) | 3/8/10 | 32561/99 |
| 4 | `calendars-tasks` | 10 | 2(1), 3(8), 5(19), 4(28), 1(43), 6(54), 7(66), 9(111), 8(148), 10(404) | 3/8/6 | 44363/100 |
| 5 | `notes-pkm` | 10 | 2(18), 1(33), 6(52), 5(62), 3(68), 4(71), 7(75), 9(119), 8(202), 10(296) | 3/9/8 | 27811/91 |
| 6 | `nutrition-calories` | 8 | 1(2), 2(11), 7(20), 5(25), 6(34), 3(44), 4(59), 8(108) | 3/8/4 | 29852/95 |
| 7 | `workout-fitness` | 8 | 7(80), 4(84), 1(98), 5(115), 6(184), 2(212), 3(238), 8(334) | 3/8/3 | 35074/91 |
| 8 | `sleep-tracking` | 8 | 8(136), 3(169), 5(190), 4(205), 7(206), 6(302), 1(330), 2(403) | 3/8/5 | 31731/94 |
| 9 | `language-learning` | 10 | 1(210), 3(277), 2(321), 10(333), 6(338), 4(349), 5(411), 8(412), 9(428), 7(527) | 3/8/8 | 39649/100 |
| 10 | `photo-editing` | 10 | 1(0), 6(7), 5(14), 2(23), 4(36), 3(48), 7(61), 9(224), 8(318), 10(410) | 3/8/6 | 45035/100 |
| 11 | `travel-planning` | 8 | 1(100), 8(109), 5(213), 7(265), 6(342), 2(462), 4(492), 3(508) | 3/7/5 | 25175/90 |
| 12 | `meal-prep-grocery` | 8 | 3(95), 2(99), 4(118), 7(129), 1(181), 5(194), 8(220), 6(285) | 2/8/7 | 12689/54 |
| 13 | `voice-recorder` | 8 | 4(106), 7(113), 6(120), 2(134), 1(140), 8(146), 5(186), 3(287) | 3/8/6 | 12545/30 |
| 14 | `focus-productivity` | 8 | 1(86), 4(90), 5(105), 7(112), 8(151), 3(165), 6(167), 2(246) | 3/8/6 | 18140/75 |
| 15 | `plant-care` | 8 | 1(49), 2(57), 4(64), 5(69), 3(73), 6(74), 7(76), 8(582) | 3/7/5 | 14107/64 |
| 16 | `pet-care` | 8 | 4(17), 2(24), 5(32), 1(42), 3(53), 7(63), 6(70), 8(541) | 3/8/8 | 6560/27 |
| 17 | `guitar-tuner-learn` | 8 | 1(240), 2(292), 3(326), 4(348), 5(360), 6(402), 7(416), 8(434) | 3/7/4 | 17982/61 |
| 18 | `scanner-pdf` | 8 | 3(214), 6(225), 1(263), 7(343), 4(394), 2(413), 8(522), 5(552) | 3/8/7 | 23488/52 |
| 19 | `weather-apps` | 8 | 1(12), 2(29), 6(37), 4(45), 3(50), 7(58), 5(65), 8(250) | 3/8/6 | 24792/92 |
| 20 | `wardrobe-outfit` | 8 | 1(114), 5(149), 4(166), 2(176), 3(217), 6(241), 8(242), 7(398) | 3/8/5 | 9748/46 |
| 21 | `run-tracking` | 8 | 8(228), 7(256), 2(422), 1(429), 4(446), 3(485), 5(500), 6(528) | 3/8/6 | 18463/50 |
| 22 | `hiking-trails` | 8 | 3(375), 1(388), 4(440), 7(468), 6(491), 2(507), 8(526), 5(568) | 3/7/6 | 8565/26 |
| 23 | `flashcards` | 8 | 6(203), 8(255), 1(286), 3(297), 2(331), 4(344), 5(362), 7(370) | 3/8/7 | 11059/34 |
| 24 | `journaling-mood` | 8 | 2(110), 3(121), 1(154), 8(163), 6(195), 4(211), 7(253), 5(405) | 3/8/7 | 29993/95 |
| 25 | `invoice-maker` | 8 | 4(223), 5(268), 7(298), 8(329), 1(368), 6(395), 2(464), 3(510) | 2/8/7 | 6720/26 |
| 26 | `meditation-mindfulness` | 9 | 2(94), 9(135), 7(183), 1(201), 3(247), 4(284), 6(295), 10(356), 5(471) | 3/8/8 | 40024/100 |
| 27 | `mind-mapping` | 8 | 6(271), 4(290), 1(332), 2(406), 8(450), 3(511), 5(512), 7(515) | 3/7/7 | 2088/10 |
| 28 | `car-maintenance` | 8 | 2(122), 5(139), 3(145), 6(168), 1(207), 4(236), 7(262), 8(353) | 3/8/7 | 13395/56 |
| 29 | `ai-writing` | 8 | 5(177), 3(198), 7(204), 2(278), 6(328), 8(380), 1(436), 4(509) | 3/8/5 | 21356/91 |
| 30 | `teleprompter-captions` | 8 | 5(376), 1(389), 2(441), 6(538), 7(546), 8(563), 3(577), 4(586) | 2/8/7 | 9895/41 |
| 31 | `password-manager` | 8 | 6(82), 4(89), 2(91), 8(107), 7(160), 1(162), 3(172), 5(248) | 3/7/7 | 22182/95 |
| 32 | `translator` | 8 | 5(473), 4(539), 2(553), 3(570), 1(578), 6(579), 7(588), 8(591) | 3/8/6 | 13895/38 |
| 33 | `astronomy-stargazing` | 8 | 1(426), 2(459), 3(475), 4(518), 5(536), 7(554), 6(567), 8(585) | 3/7/6 | 15866/53 |
| 34 | `resume-builder` | 8 | 6(279), 4(381), 8(384), 1(417), 5(478), 2(514), 7(534), 3(574) | 2/7/6 | 4338/26 |
| 35 | `music-streaming` | 8 | 2(87), 5(158), 7(164), 8(191), 4(196), 3(244), 6(249), 1(294) | 3/8/6 | 25893/95 |

Total 293 ideas. `meditation-mindfulness` has no `-8`. Idea slugs are always `${category}-${n}`.

Category display names (`text.<L>.categories`, verbatim):

| slug | ru | en | de | fr | ja |
|---|---|---|---|---|---|
| interior-design | Дизайн интерьера и планировка | Interior design and floor plans | Inneneinrichtung und Grundrisse | Design d’intérieur et plans d’aménagement | インテリアデザインと間取り図 |
| habit-tracking | Привычки | Habits | Gewohnheiten | Habitudes | 習慣 |
| personal-finance | Личные финансы | Personal finance | Persönliche Finanzen | Finances personnelles | 家計管理 |
| calendars-tasks | Календари и задачи | Calendars and tasks | Kalender und Aufgaben | Calendriers et tâches | カレンダーとタスク |
| notes-pkm | Заметки и база знаний | Notes and knowledge base | Notizen und Wissensdatenbank | Notes et base de connaissances | メモとナレッジベース |
| nutrition-calories | Калории и питание | Calories and nutrition | Kalorien und Ernährung | Calories et nutrition | カロリーと栄養 |
| workout-fitness | Тренировки и фитнес | Workouts and fitness | Training und Fitness | Entraînements et fitness | トレーニングとフィットネス |
| sleep-tracking | Трекеры сна и будильники | Sleep trackers and alarms | Schlaftracker und Wecker | Trackers de sommeil et réveils | 睡眠トラッカーとアラーム |
| language-learning | Изучение языков | Language learning | Sprachenlernen | Apprentissage des langues | 語学学習 |
| photo-editing | Фоторедакторы | Photo editors | Fotoeditoren | Éditeurs photo | 写真編集アプリ |
| travel-planning | Планирование путешествий | Travel planning | Reiseplanung | Planification de voyages | 旅行の計画 |
| meal-prep-grocery | Меню и списки покупок | Menus and shopping lists | Menüs und Einkaufslisten | Menus et listes de courses | 献立と買い物リスト |
| voice-recorder | Запись и расшифровка речи | Recording and transcribing speech | Sprachaufnahme und Transkription | Enregistrement et transcription de la parole | 音声録音と文字起こし |
| focus-productivity | Концентрация и продуктивность | Focus and productivity | Konzentration und Produktivität | Concentration et productivité | 集中と生産性 |
| plant-care | Уход за растениями | Plant care | Pflanzenpflege | Soin des plantes | 植物の世話 |
| pet-care | Уход за питомцами | Pet care | Haustierpflege | Soin des animaux | ペットの世話 |
| guitar-tuner-learn | Гитара: тюнер и обучение | Guitar: tuner and learning | Gitarre: Stimmgerät und Lernen | Guitare : accordeur et apprentissage | ギター：チューナーと練習 |
| scanner-pdf | Сканеры документов | Document scanners | Dokumentenscanner | Scanners de documents | ドキュメントスキャナー |
| weather-apps | Погода | Weather | Wetter | Météo | 天気 |
| wardrobe-outfit | Гардероб и образы | Wardrobe & outfits | Kleiderschrank und Outfits | Garde-robe et tenues | ワードローブとコーディネート |
| run-tracking | Бег | Running | Laufen | Course à pied | ランニング |
| hiking-trails | Походы и маршруты | Hikes and routes | Wanderungen und Routen | Randonnées et itinéraires | ハイキングとルート |
| flashcards | Учебные карточки | Study flashcards | Lernkarten | Cartes mémoire pour apprendre | 暗記カード |
| journaling-mood | Дневники и настроение | Journaling and mood | Tagebücher und Stimmung | Journal et humeur | 日記と気分 |
| invoice-maker | Счета для клиентов | Invoices for clients | Rechnungen für Kunden | Factures pour les clients | 顧客への請求書 |
| meditation-mindfulness | Медитация и осознанность | Meditation and mindfulness | Meditation und Achtsamkeit | Méditation et pleine conscience | 瞑想とマインドフルネス |
| mind-mapping | Карты мыслей | Mind maps | Mindmaps | Cartes mentales | マインドマップ |
| car-maintenance | Обслуживание автомобиля | Car maintenance | Autowartung | Entretien de la voiture | 車のメンテナンス |
| ai-writing | ИИ-помощники для текста | AI writing assistants | KI-Schreibassistenten | Assistants d’écriture IA | 文章のAIアシスタント |
| teleprompter-captions | Телесуфлёр и субтитры | Teleprompter and captions | Teleprompter und Untertitel | Téléprompteur et sous-titres | テレプロンプターと字幕 |
| password-manager | Менеджеры паролей | Password managers | Passwortmanager | Gestionnaires de mots de passe | パスワード管理アプリ |
| translator | Переводчики | Translators | Übersetzer | Traducteurs | 翻訳アプリ |
| astronomy-stargazing | Звёздное небо и астрономия | Night sky and astronomy | Sternenhimmel und Astronomie | Ciel nocturne et astronomie | 星空と天文 |
| resume-builder | Конструкторы резюме | Resume builders | Lebenslauf-Baukästen | Créateurs de CV | 履歴書作成 |
| music-streaming | Прослушивание музыки | Listening to music | Musikhören | Écoute de la musique | 音楽を聴く |

### 3.2 Free sample (`Clarity/ClarityContentAccess.swift:6-19`)
* Free category: `interior-design`. Its full research article is readable without Plus.
* Free ideas, in this order: `interior-design-1 … interior-design-5`. `interior-design-6/7/8` are **paid**, even though they appear inside the free article.
* `canReadIdea(slug) = unlocked || freeIdeas.includes(slug)`; `canRead(category) = unlocked || category === "interior-design"`.

### 3.3 Research catalogue ("Разборы" tab) — `ClarityCatalogs.swift:7-37`
1. Candidates: `library.niches` filtered by `LaunchEdition.contains(slug)` and by the search query (below). This gives 35 when the query is empty.
2. Sort: by relevance (0 = the name matches the query, 1 = the summary matches, 2 = anything else), then by `name` with `localizedStandardCompare`.
3. With an **empty query**, "illustrated" categories are moved to the front in `LaunchEdition.categories` order. A category counts as illustrated when its editorial article exists and its cover asset exists, which is true for all 35. **The effective empty-query order is exactly the §3.1 order.**
4. Search haystack per category: `[name] + article.searchText`, where `searchText = [summary, lead, audiences.title/body…, section.title, observation.title/body…, directions.title/body…, conclusion.title/body]` (`ResearchEditorial.swift:85-95`). The dossier fallback (`audience.segments[].job`) is not reached.
5. Card: `title = name`, `summary = article.summary`, cover = category cover, lock icon when `!canRead(category)`, badge `"Бесплатный разбор"` / "Free breakdown" when `category == interior-design`.
6. Header copy: `"Разборы"` / `"Что людям важно в приложениях и чего им не хватает."`. Search prompt `"Категория или потребность"`. `"Найдено: %1$@"` appears when the query is non-empty. The footer (query empty) reads `"Готовим следующие разборы"` + `"Велоспорт, йога и определение растений и животных."` (en: "Cycling, yoga and identifying plants and animals.").

### 3.4 Ideas catalogue ("Идеи" tab) — `ClarityCatalogs.swift:168-184`
1. Candidates: `library.ideas` where `LaunchEdition.contains(category)` and (`selectedCategory == nil || category == selectedCategory`), and either the query is empty **or** (`canReadIdea(slug)` **and** the query matches). **Locked ideas never match a search.**
2. Sort:
   * **Not unlocked:** ideas listed in `freeIdeaIDs` first, in list order.
   * **Always:** then `rank` ascending, with `slug` ascending as the tie-break.
3. `canonicalIdeas` (`ClarityReader.swift:7-17`): each idea is replaced by its `canonicalSlug` target, unless the source is a launch idea and the target is outside the launch set. Duplicates are then dropped. Only one launch idea has a canonical (`photo-editing-2 → ai-photo-restore-1`, outside the launch set), and in en/de/fr/ja the target is not even loaded. The step is therefore a **no-op**, and the list is always 293. The web may ignore canonical resolution. The build validator should assert it stays a no-op.
4. Resulting order:
   * Unlocked: `photo-editing-1, calendars-tasks-2, nutrition-calories-1, habit-tracking-1, personal-finance-1, photo-editing-6, calendars-tasks-3, personal-finance-4, nutrition-calories-2, weather-apps-1, habit-tracking-6, photo-editing-5, …` (= global rank).
   * Locked: `interior-design-1…5`, then the same rank order without them.
5. Search haystack (`ClarityCatalogs.swift:173-174`): `[cardTitle, cardDescription, text.title (twice, via studioTitle), text.oneLiner, categoryName, EditorialContent.audience ?? studio.json buyer ?? ""]`. The last element is Russian in every locale (§9 #10).
6. Header subtitle: unlocked `"Что можно создать или улучшить."`, locked `"5 идей бесплатно. Остальные — в Plus."` ("5 ideas for free. The rest with Plus."). Search prompt `"Идея или потребность"`.
7. Category filter sheet (`ClarityCatalogs.swift:244-273`): `"Все категории"`, then the 35 launch niches sorted by localized name (`localizedStandardCompare`), filterable by `localizedStandardContains`. The web equivalent is `Intl.Collator(locale, {numeric: true, sensitivity: "base"})`.

### 3.5 Inside a research article: how directions, idea cards and quotes are placed — `Clarity/ClarityResearchFlow.swift:24-80`
Input: `article` (research-editorial), `dossier` (rich) and the library.
1. `observations` = all observations of all sections, in reading order.
2. Each direction goes to an observation. If `direction.observationID` names an observation of this article, it goes there. Otherwise it goes to the observation with the largest overlap between `direction.sourceFindingIDs` and `observation.sourceFindingIDs`: the overlap must be strictly greater than the best so far, so the first observation wins ties, and it must be > 0. With no such observation, the direction is "unassigned". Today every direction has a valid `observationID`.
3. Placements: for each observation, walk its assigned directions in `article.directions` order.
   * `ideas = canonicalIdeas(direction.ideaSlugs → library)` filtered by a **global `seenIdeas` set**, so each idea appears once per article.
   * Drop the placement if `ideas` is empty **and** `body.trim()` is empty.
4. `remainingDirections` = placements of the unassigned directions (always empty today).
5. `remainingIdeas` = `canonicalIdeas(library.ideas(in: category))` (rank order) minus `seenIdeas`. This is **always empty today**: every launch idea is referenced by some direction of its own category.
6. Quotes per observation: `selectedQuotes` = `quoteRefs.map(ref → dossier.findings[id == ref.findingID].evidence[ref.quoteIndex])`. Invalid refs are skipped, and duplicates inside the observation are dropped by `(app, quote)`. Then a **global per-article** dedupe by `(app, quote)` runs in reading order. Today: 792 quotes shown per locale and 0 duplicates.
7. `otherQuotes` (`ResearchEditorial.swift:41-46`) is never called. Unreferenced evidence is never shown.

**Web: compute all of this at build time** and store the result (placements with idea slugs, deduped quotes) in `research/<category>.json` (§7.3). It does not depend on the user.

---

## 4. Locale rules

### 4.1 Locale set, display order, negotiation
* Available: `locales.json.available` = `ru, en, ja, de, fr`. With an empty or missing manifest the app falls back to `[ru]`.
* Display order (`AppLocale.swift:44-45`): `ru` and `en` first, then the rest sorted by native name. Result: **Русский, English, Deutsch, Français, 日本語**. Names: ru `"Русский"`, en `"English"`, others from `Locale.localizedString` capitalized.
* Initial locale (`AppLocale.restore`, `AppLocale.swift:109-128`):
  1. the saved choice (`UserDefaults["content.locale"]`), if available;
  2. otherwise each system preferred language in turn: exact match, then base language (`de-CH → de`), then any available that starts with `base-`;
  3. otherwise `default` (`en`), if available;
  4. otherwise the first available.

  Web equivalent: URL prefix / cookie → `Accept-Language` walked with the same algorithm → `en`.
* One language drives UI and content together (`Library.locale` setter, `Library.swift:70-78`).

### 4.2 Fallback chain per content type
`fallbacks(L) = [L, base(L) if L has a region, "en", "ru"]` with duplicates removed (`AppLocale.swift:62-72`). `ownChain(L) = [L, base(L)?]` (`AppLocale.swift:94-97`).
`LocalePacks` walks the chain and takes the first file that exists **and** decodes **and** passes `accept`; it caches the result per locale (`AppLocale.swift:182-206`). `BundledContent.read` takes the first existing file and throws if that file fails to decode (`Library.swift:41-52`).

| Content | Chain | Accept | Resolved file for ru / en / de / fr / ja | Per-item fallback |
|---|---|---|---|---|
| `text` | fallbacks | — | ru / en / de / fr / ja | idea without text → dropped; category name → slug |
| `rich` | fallbacks | — | ru / en / **en / en / en** | — |
| `research-editorial` | fallbacks | `version==1` | own file for all 5 | missing article → dossier-based fallback view (unreached) |
| `idea-articles` | fallbacks | `version==1` | own file for all 5 | invalid article → fallback idea view (unreached, §5.5) |
| `idea-cards` | fallbacks | — | own file for all 5 | title → `text.title`, description → `text.oneLiner` |
| `quote-translations` | **ownChain** | `version==1` | ru / **none** / de / fr / ja | → evidence `translation` → original (§4.3) |
| `editorial-reading`, `research-idea-contexts` | fallbacks | `version==1` | **ru for every locale** | — |
| `ui` | ru: `[ru]`; others: `ownChain + [en]` | `version==1` | none (keys are Russian) / en / de / fr / ja | missing key → the Russian key itself |
| `facts`, `studio`, `studio-art`, `launch-research-artwork` | locale-independent | — | — | — |
| editorial overrides | only when the resolved text/rich file is ru, plus render-time exact match | sha256 | ru only | — |

Consequences:
* de/fr/ja research quotes and corpus numbers come from `rich.en`.
* No content type ever falls back to Russian for the 35/293 in en/de/fr/ja. The exceptions are `editorial-reading` (search only) and the artwork alt texts (§4.5).

### 4.3 Quotes: original vs reading text
One function renders every quote: `QuoteReading.text(original, translation?)` (`Content/QuoteReading.swift:17-25`).
```
display(original, translationField?, L):
  t = quoteTranslations[L]?.[original]      // pack for L only (ownChain). ru/de/fr/ja have one; en has none
  if (t && t.trim()) return t
  if (translationField && translationField.trim()) return translationField
  return original
```

| Where the quote appears | `original` comes from | `translationField` | ru result | en result | de/fr/ja result |
|---|---|---|---|---|---|
| Idea article `quote` block (294 blocks) | `facts.json` `quotes[quoteIndex].text` (English; 2 Russian originals exist in facts) | none | `quote-translations.ru` (all covered) | original English | `quote-translations.<L>` (all covered) |
| Research observation quote (792 per locale) | ru: `rich.ru` evidence `quote`; others: `rich.en` evidence `quote` | evidence `translation` (ru: Russian or null; en: English) | `quote-translations.ru` (all 792 covered) | `translation` (English, = quote or lightly edited) | `quote-translations.<L>`. **2 misses** (§9 #11) → English `translation` |
| Onboarding article quote | same as research | same | same | same | same |
| Export document | same as its source | same | same | same | same |

* Distinct quote texts reachable: 294 (ideas) + 792 (research) − 33 overlap = **1,053**. `quote-translations.{de,fr,ja}` cover 1,051 of them and have 1 stale key. `quote-translations.ru` covers all.
* `Quote.lang` is ignored by the app.
* Reader quote blocks render **only the text**. `app` and `rating` are passed in but not drawn (`ClarityReader.swift:858-876`). The one exception is the onboarding quote card, which shows `"{rating} ★"` and the label `"Из отзыва пользователя"` ("From a user review"; `ClarityWelcomeContentPreview.swift:86-99`).
* **Web: resolve at build time.** Every quote in the web JSON is already the display string for its locale.

### 4.4 UI strings, plurals, numbers
* `L(source)` = `ui.<L>.strings[source] ?? source` (`UIStrings.swift:39-51`). For `ru` there is no pack, so the Russian source string is used. `L(source, args…)` substitutes `%n$@` positionally (`UIStrings.swift:57-59`). **Web: generate `ui.ru.json` with identity values** for the 755 keys so every locale has the same shape.
* `Plural.word(key, n)` (`UIStrings.swift:139-144`): `forms[cldrCategory(n, L)] ?? forms.other ?? fallback`. Categories: ru `one/few/many`, en/de `one/other`, fr `one` for 0 and 1, ja `other` (`UIStrings.swift:73-133`). `Intl.PluralRules(L).select(n)` gives the same categories for these 5 locales; for fr at 1e6 it may return `many`, so fall back to `other`.
* Clarity uses plurals only in the research hero sentence (`ClarityReader.swift:424-437`). The ru forms are hard-coded fallbacks, and the web must reproduce them:
  * `"отзыв"`: `one → "отзыв"`, `few → "отзыва"`, `many → "отзывов"` (18 442 → «отзыва»).
  * `"приложение"` (genitive after «о работе»): `mod10 == 1 && mod100 != 11 → "приложения"`, else `"приложений"`.
* Numbers: `n.formatted(.number.locale(L))` → `Intl.NumberFormat(L).format(n)`. ru "18 442", en "18,442", de "18.442", fr "18 442", ja "18,442".
* Rendered example: ru `«Мы изучили 18 442 отзыва о работе 61 приложения.»`; en `"We studied 18,442 reviews about how 61 apps work."`.

### 4.5 Known Russian leaks and gaps in non-ru locales (decide on the web; see §10)
* Artwork alt texts for the 32 JSON categories are Russian and are not passed through `L()` (`ClarityResearchArtwork.swift:36-38`). The 3 hard-coded categories are localized through `L()` (`ClarityResearchArtwork.swift:47-86`). **Recommendation:** for non-ru, derive alt text from the templates in §2.10 using the localized category name and observation title, or use `alt=""`, since the images are decorative next to their headings.
* The Settings date `"Сборник от %1$@"` is always formatted with `ru_RU` `"d MMMM yyyy"` (`Decks/DeckContent.swift:159-167`), e.g. "5 сентября 2026" even in English. The web should format per locale.
* The idea search haystack includes Russian `audience` / `buyer` in every locale.

---

## 5. How screens assemble content (data level)

Visual design belongs to other specs. This section only says which fields feed which slot, in what order, and under which condition.

### 5.1 Root (`ClarityRoot.swift:36-55`)
* If loading `text`/`rich`/`facts` fails **or** `studio.json` fails: error screen `"Не удалось открыть материалы"` / `"Попробуй загрузить библиотеку ещё раз."` / button `"Повторить"`. While ideas are empty: `"Открываем материалы…"`.
* Onboarding finish routes: `"sample"` and `"research"` open the Research tab with `research(interior-design)` pushed; `"catalog"` opens the Research tab root.
* Tabs: `"Разборы"` (Breakdowns), `"Идеи"` (Ideas), `"Сохранённое"` (Saved).

### 5.2 Research catalogue card
See §3.3. Data: `{slug, name, summary, cover, locked, free}`. The no-cover fallback (gradient plus an SF symbol from `StudioStyle.categorySymbol`) is never hit.

### 5.3 Research article (`ClarityReader.swift:99-437`)
The gate comes first: `canRead(category)`, else the locked preview (§5.6). Render order:
1. **Hero**: `title = name`; `subtitle = [summary, corpusSentence].filter(nonEmpty).join(" ")`. `corpusSentence = L("Мы изучили %1$@ %2$@ о работе %3$@ %4$@.", fmt(corpusReviews), word("отзыв", reviews), fmt(corpusApps), word("приложение", apps))`, and only when both numbers are > 0 (`:419-437`).
2. **Cover** artwork, full-bleed, aspect 3:2 (`:159-162`).
3. Section `"Главное"`: `article.lead`, with the first paragraph in lead style (`:234-238`).
4. Section `"Какие задачи решают люди"` (only if `audiences` is non-empty): the audiences artwork, then for each audience `title` (subheading) + `body`, with dividers between (`:240-251`).
5. For each `section`:
   * `title`, then `intro` (if non-empty), then section artwork (only `interior-design` / `finish` → `ResearchInterior_directions`).
   * Then, for each observation (dividers between):
     * `title`;
     * `passages = body.split("\n\n").map(trim).filter(nonEmpty)` (`ResearchEditorial.swift:27-31`);
     * `quotes = flow.quotes(obs)`;
     * `for i in 0..<max(passages, quotes)`: render `passages[i]` (if any), then `quotes[i]` (if any); **after i == 0** render the observation artwork (if any);
     * then the observation's **placements**. For each placement: show `direction.title` as a subheading **only when the placement has no ideas**, then `direction.body` (if non-empty), then an idea card (§5.4) per idea (`:253-303`).
6. `"Другие возможности"` (remainingDirections) — empty today.
7. `"Другие идеи категории"` (remainingIdeas) — empty today.
8. Conclusion: `conclusion.title` as the section heading, then `conclusion.body`.

Table of contents (`:131-151`):
* `introduction` = `"Главное"`;
* `audience` = `"Какие задачи решают люди"` (if audiences);
* per section: `theme-<id>` = section title, followed by `observation-<id>` = observation title (depth 1);
* `directions` / `ideas` if non-empty;
* `conclusion` = conclusion title.

Toolbar: save, contents, note. `ClarityQuoteBlock` = quote text only (§4.3).

### 5.4 Idea card (`ClarityIdeaCard.swift`, `ClarityIdeaCardArt.swift`)
* Art: aspect 1.5 (3:2), `scaledToFill`, radius 20. Image = `EditorialIdeaCover_<slug>` ?? `IdeaCover_<slug>` ?? category object on a `soft` background (§6.2).
* **Unlocked:** `title = cards[slug].title ?? text.title`, `description = cards[slug].description ?? text.oneLiner`, footer = `categoryName`.
* **Locked:** art plus a lock badge only. There is no title, description or category in the view or accessibility tree; the accessibility label is `"Идея в Plus"` (`:18-56, :70`).
* Tap: a locked card opens the paywall; an unlocked card opens the idea in a sheet.

### 5.5 Idea article (`ClarityReader.swift:460-656`)
The gate comes first: `canReadIdea(slug)`, else the locked preview. An article is valid when all of these hold (`IdeaArticles.swift:29-45`):
* title and description are non-empty;
* there is at least one block and block ids are unique and non-empty;
* paragraph and heading blocks have text;
* idea blocks have title and text;
* quote blocks have a `quoteIndex` that resolves in facts.

All 1,465 locale×idea combinations are valid. Render:
1. Hero: `article.title` / `article.description`.
2. Blocks in order:
   * `paragraph` → body text (reflowed, §5.11);
   * `heading` → section-title style;
   * `quote` → `display(facts.quotes[quoteIndex].text)` with a left rule;
   * `idea` → inset card (accent-soft background, 3 pt accent bar) with `title` in card-title style and `text`.
3. A divider, then:
   * `"Читать разбор категории"` → research(category);
   * `"Записать свою мысль"` → note;
   * `"Скачать документ"` + `"Полный разбор категории, идея и твоя заметка — в одном файле."` → export (§5.10).

Nav title `"Идея"`.
*The fallback view (`:493-542`: gap/pitch/features/antiFeatures, `editorial.*`, monetization when `paymentReviewed`, "Связанное решение", quotes list) is unreachable for the 293 ideas. The web does not implement it.*

### 5.6 Locked previews (`ClarityContentAccess.swift:68-122`)
* **Research:**
  * cover artwork;
  * heading `name` plus `summary` (**no corpus sentence**);
  * card with `"Полный материал в Plus"` / `"Все разборы и идеи — в одной подписке."`;
  * button `"Открыть все материалы"`;
  * link `"Сначала прочитать бесплатный разбор"` → research(interior-design);
  * optional `"Моя заметка к материалу"`;
  * nav title `"Разбор"`.
* **Idea:**
  * **only** the idea card art (no title or description);
  * `"Идея доступна в Plus"` / `"Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом."`;
  * same buttons as above;
  * note sheet title `"Идея в Plus"`;
  * nav title `"Идея"`.
* Public data per locked item: research `{name, summary, cover}`; idea `{slug, cover}`.

### 5.7 Saved (`ClarityMy.swift`)
* Rows: saved ideas (`shelf.saved`, newest first), plus saved research refs (`notebook.saved`), plus notes.
* Idea row: `title` = card title if readable, else `"Идея в Plus"`; `detail` = `categoryName` if readable, else `""`; thumbnail = idea art 88×66.
* Research row: `title = name`; `detail = "Разбор"`; thumbnail = cover 88×66.
* Filters: `"Всё" / "Разборы" / "Идеи" / "Заметки"`. Search runs over title, detail and note.

### 5.8 Onboarding previews (`ClarityOnboarding.swift`, `ClarityWelcomeContentPreview.swift`, `ClarityWelcomeExamples.swift`)
* Four story steps, each with a title and description:
  1. `"1,4 млн отзывов"` / `"Изучили отзывы о 4 623 приложениях: что раздражает людей и чего им не хватает."`;
  2. `"Разборы отзывов"` / `"В каждом разборе — выводы и отзывы, на которых они основаны."`;
  3. `"Идеи приложений"` / `"Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться."`;
  4. `"Новые выпуски"` / `"С обновлениями приложения регулярно добавляем новые темы, разборы и идеи."`.

  After the four steps comes the paywall (step 4). Corpus constants: `ResearchCorpus` 1,451,072 reviews / 4,623 apps / 72 niches (`Models/ResearchProduct.swift:8-12`).
* Step 0: `WelcomeReviews_v7`. Step 3: `WelcomeLibrary_v7` + chips `"Интерьер"`, `"Привычки"`, `"Личные финансы"`.
* **Step 1 — 5 article examples** (auto-advance every 7 s):

| category | observation | excerpt sentences (skip, count) | quote index | quote sentences (skip, count) | image | label |
|---|---|---|---|---|---|---|
| interior-design | controlled-change | (1, 1) | 0 | (0, 1) | `ResearchInterior_controlled-change` | `"Дизайн интерьера"` |
| habit-tracking | pause-correction | (0, 1) | 0 | (1, 1) | `ResearchHabits_pause-correction` | `"Привычки"` |
| personal-finance | couple | (0, 2) | 0 | (0, 1) | `ResearchFinance_couple` | `"Личные финансы"` |
| nutrition-calories | database | (0, 1) | 0 | (0, 1) | `ResearchLaunch_nutrition-calories_database` | `"Питание"` |
| calendars-tasks | time | (0, 1) | 0 | (0, 1) | cover (no obs art) `ResearchLaunch_calendars-tasks_cover` | `"Календари и задачи"` |

  Each card shows the observation title, `excerpt(observation.body, skip, count)`, then a quote card: `"Из отзыва пользователя"`, `"{rating} ★"`, `«excerpt(display(quote))»`.
  * The quote is `observation.selectedQuotes(dossier)[quoteIndex]`, **without** the article-wide dedupe.
  * `excerpt` takes whole sentences `[skip, skip+count)` using sentence segmentation (`ClarityWelcomeExamples.swift:109-123`). Web: `Intl.Segmenter(L, {granularity: "sentence"})`.
* **Step 2 — idea examples:** `ideaSlugs = freeIdeaIDs` (5 interior ideas), shown in pairs `[1,2], [3,4], [5]` (3 pages, auto-advance every 6 s).
  * Title and description come from `ideaTeasers` when present: only `interior-design-1` has one, `"Новая комната. Те же стены."` / `"Новая мебель и отделка на фото твоей комнаты. Стены, окна и двери остаются на месте."`.
  * Otherwise card copy is used.
  * Examples are always shown in full, regardless of access. The other 9 teaser entries in the file are dead because their slugs are not in `ideaSlugs`.
* **Web: precompute `onboarding.json` per locale** (§7.3).

### 5.9 Paywall / Settings data
* Paywall art: `WelcomeResearch_v7`, `WelcomeProduct_v7`, `WelcomeLibrary_v7` (`ClarityPaywall.swift:159-177`). Settings Plus card: `WelcomeLibrary_v7` (`ClaritySettings.swift:213`).
* Settings "О материалах" (`ClaritySettings.swift:298-303`): 4 static texts plus `"Сборник от %1$@"` with `studio.json.builtAt` = 2026-09-05.
* Language list per §4.1.
* External links (`Strings/Strings.swift:269-276`):
  * `https://inapp.pro/{ru|en}/offer`, where `ru` is used only for ru and `en` for every other locale;
  * `https://inapp.pro/{ru|en}/contacts`;
  * privacy `https://artsaverin-star.github.io/legal/inapp/privacy.html`.

  **These URLs are in shipped binaries and must keep resolving after the old site moves to `/old`** (§10).

### 5.10 Export document (`Clarity/ClarityExportDocument.swift:7-69`)
Plain UTF-8 text. Parts are joined with `"\n\n"` and the document ends with `"\n"`. `add(title, body)` is skipped when `body` is blank, and emits `title + "\n" + body` when `title` is non-empty.
```
L("inApp · Идея и разбор категории")
L("1. РАЗБОР КАТЕГОРИИ")
categoryName
add("", article.summary); add("", article.lead)
if audiences: L("КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ"); for a: add(a.title, a.body)
for section: section.title; add("", intro)
  for obs: add(obs.title, obs.body); for q in flow.quotes(obs): add("", "«"+display(q)+"»")
           for placement: add(direction.title, direction.body)      // title always, body required
for remainingDirections: add(title, body)
if conclusion: add(conclusion.title, conclusion.body)
L("2. ИДЕЯ")
[article.title, categoryName, article.description, …blocks]  // paragraph/heading → text; idea → title+"\n"+text; quote → "«"+display+"»"
if note: L("3. МОЯ ЗАМЕТКА") + "\n" + note
```
* Filename: `"inApp — " + title`. Characters `/\:*?"<>|\n\r` become spaces and the title is cut to 100 chars; the extension is `.txt`.
* Export is allowed only when `canReadIdea`.
* Localized headings: en `"inApp · Idea and category breakdown"`, `"1. CATEGORY BREAKDOWN"`, `"THE JOBS PEOPLE DO"`, `"2. IDEA"`, `"3. MY NOTE"`; de `"1. KATEGORIE-ANALYSE"`, …; ja `"1. カテゴリー分析"`, … (all in `ui.<L>.json`).

### 5.11 Text helpers the web must mirror
* `paragraphs(text)` (`ClarityReader.swift:45-62`):
  1. apply `StudioEditorial.text` (whole-string override; pre-applied on the web);
  2. replace U+00A0 with a regular space;
  3. split on `"\n\n"`, trim, drop empties;
  4. re-chunk any paragraph longer than **430** characters at sentence boundaries into chunks of at most **360** characters. A chunk flushes when `current.length + sentence.length > 360`, and no sentence is ever dropped.

  Observation passages are split by `"\n\n"` first, so quote placement follows the authored passages; each passage is then reflowed for display.
* `firstSentence(text)`: override, NBSP → space, trim, first sentence.
* `matches(query, fields)` (`StudioDomain.swift:79-82`): split the query on whitespace; **every** token must be contained in **some** field, case- and diacritic-insensitively and locale-aware. An empty query matches everything. Web: normalize both sides with `toLocaleLowerCase(L)` + NFD with diacritics stripped, then `includes`.
* Sorting by name: `localizedStandardCompare` → `Intl.Collator(L, {numeric: true, sensitivity: "base"}).compare`.

---

## 6. Image assets

### 6.1 Inventory (measured with PIL)

| Group | Asset name pattern | Sets | Pixels | Format | Bytes | Used by Clarity |
|---|---|---:|---|---|---:|---|
| Idea covers (editorial) | `EditorialIdeaCover_<slug>` | 285 | 1200×800 | JPEG RGB | 64,770,227 | **Yes** (all 285 are launch ideas) |
| Idea covers (old) | `IdeaCover_<slug>` | 464 | 455×(900×600), 8×(1200×800), 1×(900×513) | JPEG RGB | 57,973,378 | **Only 8**: `IdeaCover_interior-design-{1..8}` (1200×800); 253 are shadowed by editorial covers, 203 belong to non-launch ideas |
| Research, 32 categories | `ResearchLaunch_<category>_{cover,audiences,<obsId>×4}` | 192 | 1200×800 | JPEG RGB | 43,309,237 | **Yes** (all) |
| Research, interior | `ResearchInterior_{cover,audiences,controlled-change,measure,dependencies,levels,saved-work,limits,directions}` | 9 | 1200×800 | JPEG | 2,261,254 | **Yes** |
| Research, habits | `ResearchHabits_{cover,audiences,quick-mark,sequence,pause-correction,social-choice}` | 6 | 1200×800 | JPEG | 1,351,597 | **Yes** |
| Research, finance | `ResearchFinance_{cover,audiences,manual,allowance,couple,archive}` | 6 | 1200×800 | JPEG | 1,383,691 | **Yes** |
| Welcome v7 | `WelcomeReviews_v7`, `WelcomeLibrary_v7`, `WelcomeResearch_v7`, `WelcomeProduct_v7` | 4 | 1254×1254 | PNG RGBA | 5,159,211 | **Yes** |
| Welcome old | `WelcomeReviews_v3`, `WelcomeLibrary_v5`, `WelcomeGrowth_v5`, `WelcomeVoices_v5`, `WelcomeNeeds_v3/_v5`, `WelcomeIdeas_v3` | 7 | 1254×1254 | PNG | 10,958,242 | No |
| Studio objects | `StudioObject_*` | 39 | 600×600 | PNG RGBA | 10,957,834 | Fallback only, never hit |
| Clarity/Studio art | `ClarityChoose/Ideas/Research/Welcome`, `StudioFlame`, `StudioIdeas` (1254²), `ShortlistArt` (1214×1295), `FindSignal`, `MarketGap` (1024×1536) | 9 | see names | PNG RGBA | 10,292,276 | No (Studio/legacy views; `ClarityArt` is drawn in code with SF Symbols) |
| App icon | `AppIcon.appiconset/icon-rating-paper-cobalt-1024.png` | 1 | 1024×1024 | PNG | 1,484,717 | For landing/meta |

Each imageset contains exactly one file (`illustration.jpg` / `illustration.png`, universal idiom, no @2x/@3x).
**Used total: 510 images, 119,856,316 bytes** (ideas 66,391,326 + research 48,305,779 + welcome 5,159,211). The full catalogue is 208.4 MB.

### 6.2 Mapping rules (exact)
* **Idea → image** (`ClarityIdeaCardArt.swift:31, 40-49`): `EditorialIdeaCover_<slug>` if it exists, else `IdeaCover_<slug>`, else `studio-art.categories[category] ?? "StudioObject_led_light_bulb"` drawn at padding 14% of height on `ClarityStyle.soft` (#EBECF0 / #28292F).
  * Current result: 285 ideas → `EditorialIdeaCover_<slug>`; `interior-design-1…8` → `IdeaCover_interior-design-<n>`; 0 fallbacks.
  * **Web: name every idea image by slug** (`ideas/<slug>`) and resolve the source asset at build time.
* **Category → research images** (`ClarityResearchArtwork.swift:20-105`): the hard-coded map wins over the JSON (`article(for:) = articles[c] ?? launchArticles[c]`).
  * `interior-design`, prefix `ResearchInterior_`:
    * cover, audiences;
    * observations `controlled-change, measure, dependencies, levels, saved-work, limits`;
    * **section** `finish` → `ResearchInterior_directions`.
    * Its article has 7 observations; `decision` has no image.
  * `habit-tracking`, prefix `ResearchHabits_`: cover, audiences, observations `quick-mark, sequence, pause-correction, social-choice`.
  * `personal-finance`, prefix `ResearchFinance_`: cover, audiences, observations `manual, allowance, couple, archive`.
  * The other 32 categories: `launch-research-artwork.json` (cover, audiences, 4 observations each, asset = `ResearchLaunch_<category>_<key>`).
  * Images are shown only when the editorial article exists (always) and the asset exists (always).
  * Alt texts: hard-coded ones are keys in `ui.*.json`, e.g. `"Двое людей сравнивают образцы цвета в комнате, держа развёрнутый план будущего интерьера."` → en `"Two people compare color samples in a room, holding an unfolded plan of the future interior."`. JSON ones are Russian only (§4.5).
* **Rendered sizes (pt):**

| Image | Where | Rendered size |
|---|---|---|
| research cover | reader | full-bleed, ≤ 684 wide, 3:2 |
| research cover | catalogue card | ≤ 680 wide, 3:2 |
| inline research art | reader | ≤ 640 wide, 3:2 |
| idea card | catalogue / reader | ≤ 640 wide, 3:2 |
| thumbnails | Saved | 88×66 |
| onboarding thumbnail | onboarding article card | 103×80 |
| welcome art | onboarding / paywall | ≤ 354 wide (paywall stacks up to ~0.81 of width) |

### 6.3 Recommended web export recipe
Targets:
* covers and research images: WebP at widths **1200, 800, 480** (never upscale; all sources are 1200 wide), `q=78`;
* welcome PNGs (alpha): WebP at **800, 400**, `q=82`, `alpha_q=90`.

`srcset="…-480.webp 480w, …-800.webp 800w, …-1200.webp 1200w"` with `sizes="(min-width: 720px) 680px, 100vw"`. Thumbnails use the 480 variant.
Measured on a random sample of 40 used covers (cwebp 1.x, `-q 78 -m 6`), extrapolated to 506 images: **1200w ≈ 20.7 MB, 800w ≈ 10.5 MB, 480w ≈ 5.5 MB (≈ 36.7 MB total)**, compared with 114.7 MB of JPEG sources. One welcome PNG at 800w: 1.23 MB → 47 KB.

```bash
# Input: content/v2/_build/used-images.json = [{ "out": "ideas/interior-design-1", "asset": "IdeaCover_interior-design-1" }, …]
SRC=/Users/artsaverin/projects/app_04_inapp/Inapp/Resources/Assets.xcassets
OUT=public/media
jq -c '.[]' content/v2/_build/used-images.json | while read -r row; do
  out=$(jq -r .out <<<"$row"); asset=$(jq -r .asset <<<"$row")
  f=$(find "$SRC/$asset.imageset" -maxdepth 1 \( -name '*.jpg' -o -name '*.png' \) | head -1)
  mkdir -p "$OUT/$(dirname "$out")"
  case "$out" in
    welcome/*) for w in 800 400; do cwebp -quiet -q 82 -alpha_q 90 -m 6 -resize $w 0 "$f" -o "$OUT/$out-$w.webp"; done ;;
    *)         for w in 1200 800 480; do
                 if [ "$w" -ge "$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')" ]; then r=""; else r="-resize $w 0"; fi
                 cwebp -quiet -q 78 -m 6 $r "$f" -o "$OUT/$out-$w.webp"; done ;;
  esac
done
# Optional JPEG fallback (not needed for evergreen browsers):
# sips -s format jpeg -s formatOptions 72 --resampleWidth 800 "$f" --out "$OUT/$out-800.jpg"
```
* Output names: `public/media/ideas/<slug>-<w>.webp` (293 × 3), `public/media/research/<assetName>-<w>.webp` (213 × 3), `public/media/welcome/<name>-<w>.webp` (4 × 2). Check that `public/media` does not collide with an existing route or public folder of the old site (the old site already uses `public/idea-covers/`, 115 MB of different art).
* Do **not** rely on `next/image` runtime optimization on the 2 GB box. Use `images.unoptimized` for these paths or a custom loader that picks the pre-built widths.
* App icon for landing/OG: `sips -Z 512 icon-rating-paper-cobalt-1024.png --out public/media/app-icon-512.png`.

### 6.4 Font
`Resources/Fonts/Onest.ttf` (variable font, `wght` 100–900, 193 KB, SIL OFL, `Onest-LICENSE.txt` must ship alongside). Used only for onboarding and paywall headings (weights 400/450/500/550/600/900). Convert with `pyftsubset Onest.ttf --flavor=woff2 --layout-features='*' --unicodes='U+0000-024F,U+0400-04FF,U+2000-206F,U+20AC,U+20BD' --output-file=onest-var.woff2`. Onest has no Japanese glyphs; ja falls back to the system font, as in the app.
The reading typography is **Georgia** (title 30, body 19, lead 20, quote 20, card title 22) plus the system font for section titles (`Clarity/ClarityReadingStyle.swift:12-19`). Georgia is not bundled, so it needs a serif fallback stack on the web.

---

## 7. Payload and recommended web data layout

### 7.1 Payload per locale
**A. Raw files the app reads, as-is:**

| Locale | Per-locale files | Plus locale-independent files | Total |
|---|---|---|---|
| ru | 23.0 MB | 8.8 MB (facts, studio, overrides, editorial-reading, …) | ≈ 32 MB |
| en | 3.6 MB | 8.8 MB | ≈ 12.4 MB |
| de / fr / ja | 4.2 MB each | 8.8 MB | ≈ 13 MB each |

Parsed in V8 this is roughly 3× in heap. **Not acceptable** on a 2 GB box.

**B. Only what Clarity renders, pre-resolved** (measured with a prototype build over the real data, minified JSON):

| Locale | Total raw | Total gzip | catalog.json | research/<c>.json max / avg | ideas/<slug>.json max / avg |
|---|---:|---:|---:|---:|---:|
| ru | 2.01 MB | 0.67 MB | 236 KB | 39.5 / 32.4 KB | 7.3 / 2.2 KB |
| en | 1.43 MB | 0.56 MB | 164 KB | 25.5 / 21.3 KB | 4.7 / 1.5 KB |
| de | 1.59 MB | 0.62 MB | 182 KB | 28.8 / 23.8 KB | 5.2 / 1.6 KB |
| fr | 1.61 MB | 0.61 MB | 187 KB | 28.8 / 24.1 KB | 5.2 / 1.7 KB |
| ja | 1.65 MB | 0.65 MB | 182 KB | 30.4 / 25.1 KB | 5.4 / 1.7 KB |

These figures include `ui.json` (~95 KB) for non-ru and search strings inside the catalog. All 5 locales together come to about 8.3 MB on disk. Images (§6) are shared across locales.

### 7.2 Recommended layout (new site, same Next app)
```
content/v2/                                   # repo root, NOT under src/ (never bundled; read via fs)
  manifest.json                               # §7.3
  _build/used-images.json                     # input for the image recipe
  <locale>/                                   # ru | en | de | fr | ja
    catalog.json        # PUBLIC-SAFE: 35 categories (+name, summary, cover), 293 ideas (slug, category, rank, free) — no paid text
    cards.json          # SERVER-ONLY: slug → {title, description}; strip paid entries for non-Plus before sending
    search.json         # SERVER-ONLY: research + idea haystacks (normalized)
    onboarding.json     # PUBLIC: 5 article examples + 5 idea examples, pre-excerpted
    ui.json             # PUBLIC: strings + plurals (ru generated as identity + ru plural forms)
    research/<category>.json   # 35 — gated except interior-design
    ideas/<slug>.json          # 293 — gated except interior-design-1..5
public/media/{ideas,research,welcome}/…webp  # §6.3
```
The old site keeps `src/data/**` and `public/idea-covers/**` untouched for `/old`.

### 7.3 Web output interfaces (the contract the TS loaders read)
```ts
type LocaleCode = "ru" | "en" | "de" | "fr" | "ja";
interface Manifest {
  version: 1;
  contentBuiltAt: string;                 // ISO timestamp of the import run
  collectionDate: "2026-09-05";           // studio.json.builtAt → "Сборник от %1$@"
  source: { path: string; gitCommit?: string; sha256: Record<string, string> }; // per source file
  locales: LocaleCode[];                  // display order: ["ru","en","de","fr","ja"]
  localeNames: Record<LocaleCode, string>;// {"ru":"Русский","en":"English","de":"Deutsch","fr":"Français","ja":"日本語"}
  defaultLocale: "en";
  launch: string[];                       // 35, LaunchEdition order
  free: { category: "interior-design"; ideas: ["interior-design-1","interior-design-2","interior-design-3","interior-design-4","interior-design-5"] };
  corpus: { reviews: 1451072; apps: 4623; niches: 72 };   // Models/ResearchProduct.swift:8-12
}
interface Art { src: string /* "research/ResearchLaunch_calendars-tasks_cover" */; alt: string; widths: number[] }
interface CatalogFile {
  version: 1; locale: LocaleCode;
  categories: { slug: string; name: string; summary: string; cover: Art; free: boolean;
                corpus: { reviews: number; apps: number }; ideaCount: number }[];      // 35, catalogue order
  ideas: { slug: string; category: string; rank: number; free: boolean; cover: Art }[];  // 293, (rank, slug)
}
interface CardsFile { version: 1; locale: LocaleCode; ideas: Record<string, { title: string; description: string }> }
interface SearchFile { version: 1; locale: LocaleCode;
  research: Record<string, { name: string; summary: string; body: string[] }>;   // name/summary for relevance tiers
  ideas: Record<string, string[]> }                                              // haystack per slug (readable-only filter at query time)
interface QuoteView { text: string /* display text for this locale */; rating: number; app: string /* not rendered in readers */ }
interface Placement { directionId: string; title: string; body: string; ideas: string[] /* slugs, deduped article-wide */ }
interface ResearchFile {
  version: 1; locale: LocaleCode; category: string; name: string; summary: string;
  corpus: { reviews: number; apps: number } | null;     // null → omit the hero sentence
  lead: string;
  cover: Art; audiencesArt: Art | null;
  audiences: { title: string; body: string }[];
  sections: { id: string; title: string; intro: string; art: Art | null;
    observations: { id: string; title: string; passages: string[]; quotes: QuoteView[]; art: Art | null; placements: Placement[] }[] }[];
  remainingDirections: Placement[];                      // [] today
  remainingIdeas: string[];                              // [] today
  conclusion: { title: string; body: string } | null;
  toc: { id: string; title: string; depth: 0 | 1 }[];    // precomputed per §5.3
}
type IdeaBlockView =
  | { id: string; kind: "paragraph" | "heading"; text: string }
  | { id: string; kind: "idea"; title: string; text: string }
  | { id: string; kind: "quote"; quote: QuoteView };
interface IdeaFile { version: 1; locale: LocaleCode; slug: string; category: string; categoryName: string;
  title: string; description: string; cover: Art; blocks: IdeaBlockView[] }
interface OnboardingFile { version: 1; locale: LocaleCode;
  articles: { category: string; label: string; observationTitle: string; excerpt: string; art: Art;
              quote: { excerpt: string; rating: number } | null }[];            // 5, §5.8 order
  ideas: { slug: string; title: string; description: string; cover: Art }[] } // 5
interface UIFile { version: 1; locale: LocaleCode; strings: Record<string, string>; plurals: Record<string, Record<string, string>> }
```
Notes:
* Store text **after** editorial overrides and with NBSPs intact. The renderer applies the NBSP→space and reflow rules from §5.11, or deviates deliberately (§10).
* `passages` must be the authored `"\n\n"` split, because quotes align to them by index.

### 7.4 Build (import) script — `scripts/v2/import-app-content.ts` (Node, so `Intl.Segmenter` matches Apple ICU)
1. Read `Resources/` from a configurable path. Record the sha256 of every file and the app git commit.
2. Load the overrides and verify the sha256 of each (§2.12).
3. For each locale L:
   * resolve every pack by the §4.2 chains;
   * apply `preparedData` to `text` and `rich` when the resolved file is ru;
   * join facts ⨝ text → ideas; keep the launch categories only;
   * build the flow (§3.5) and resolve quotes (§4.3);
   * map artwork (§6.2) and alt text (§4.5);
   * write the files from §7.3.
4. `ui.ru.json` = identity over the `ui.en.json` keys, plus ru plurals `{"отзыв":{"one":"отзыв","few":"отзыва","many":"отзывов"},"приложение":{"one":"приложения","few":"приложений","many":"приложений"}}`. The latter is a genitive special case and should be applied only to the corpus sentence.
5. Validate, and fail the build on any mismatch:
   * 35 categories and 293 ideas per locale;
   * the structure (ids/refs) is identical across locales;
   * every `quoteRef` resolves;
   * every idea article passes the §5.5 validity check;
   * canonical resolution is a no-op;
   * every direction has ≥ 1 idea or a body;
   * `remainingIdeas` and `remainingDirections` are empty (warn if not);
   * every referenced asset exists;
   * warn on quotes with no own-locale translation (currently 2 in de/fr/ja).
6. Emit `_build/used-images.json` for §6.3.

### 7.5 Server loading and memory (2 GB box)
* Loader module: `import "server-only"`; `readFile(path.join(process.cwd(), "content/v2", L, …))` + `JSON.parse`.
* Cache in a small in-process LRU, e.g. 200 entries; the largest file is 236 KB and a typical one 2–40 KB, so the worst case is well under 30 MB of heap. Never import these JSON files statically: that would put all locales into the server bundle.
* If deploying with `output: "standalone"`, add `outputFileTracingIncludes: { "/**": ["content/v2/**"] }`, or copy `content/v2` next to the server.
* Public, non-gated pages (landing, catalogues, the free article and ideas) can be statically generated with `generateStaticParams`: 5 locales × (1 research + 5 ideas). Gated pages render per request after the entitlement check.

### 7.6 Gating and leak rules (from the app's own guarantees)
* **Never send paid text to a user without Plus.** The app does not build the reader at all before access is granted ("A lock is not a blur over loaded article text", `ClarityContentAccess.swift:22-23`). On the web, that covers:
  * `research/<c>.json` for c ≠ interior-design;
  * `ideas/<slug>.json` for paid slugs;
  * paid entries of `cards.json`.
* A locked idea card carries `{slug, cover}` only (§5.4). A locked research card carries `{name, summary, cover}` (§5.2, §5.6).
* Search runs server-side:
  * research search may match locked bodies, but the response contains only catalogue fields;
  * idea search excludes locked ideas entirely (§3.4).
* The free research article renders cards for `interior-design-6/7/8`, which stay locked (art only).

---

## 8. User state contract (for Saved, notes, export; not bundled data)

| App store (key) | Shape | Clarity use | Web note |
|---|---|---|---|
| `Shelf` (`shelf.saved`), `Store/Shelf.swift:23-54` | `string[]` of idea slugs, newest first | saved ideas | per-user table or localStorage |
| `Shelf` (`shelf.exported`) | `string[]` | legacy export counter (Clarity export is gated by `canReadIdea` instead) | drop |
| `StudioNotebook` (`inapp.studio.notebook.v1`), `Studio/StudioNotebook.swift` | `{version:1, saved: {kind:"research"\|"problem", slug}[], notes: Record<"kind:slug", string>, decisions: …}` | research bookmarks (newest first), notes for any material (idea notes keyed `idea:<slug>`) | keep `kind:slug` keys; removing a bookmark keeps the note |
| `ClarityAppShelf` (`inapp.clarity.saved-apps.v1`), `StudioWorkspace`, `DeckShelf`, `StudioPreferences` | legacy archives | legacy rows in Saved "Всё" | not applicable on the web |
| `content.locale` | locale code | chosen language | cookie / URL |
| `studio.appearance` | `"light" \| "dark" \| "system"` | theme | cookie |

---

## 9. Discrepancies, dead paths and data anomalies (code wins)

1. `ResearchEditorial.swift:105-107`: the comment says a pack whose `locale` field mismatches is rejected. The code checks only `version == 1`.
2. `Documentation/Localization/README.md:25-27`: says availability is inferred from `text.<L>.json`. The code uses `locales.json` (`AppLocale.swift:29-46`), as the same README's pitfall #1 admits.
3. Localization README: "792 research quotes (758 after dedupe)". With the code's `(app, quote)` dedupe, all 792 are distinct; distinct texts across idea and research quotes = 1,053 (the README says 1,052).
4. `Documentation/LibraryRefresh-2026-09-20/README.md:80`: says locked idea cards show cover, title, category and the Plus mark. The code shows **artwork + lock only** (`ClarityIdeaCard.swift:23-56`).
5. `Documentation/Clarity/README.md:17`: describes a 3-step onboarding with category choice. The code has 4 story steps, then the paywall, and no category picking (`ClarityOnboarding.swift:18-35`).
6. `Documentation/Clarity/README.md:37`: "72 categories, 592 ideas". True of the ru bundle; Clarity exposes 35/293 (`LaunchEdition`).
7. `Library.swift:68-69`: a comment says Clarity uses Russian. It is stale; all 5 locales are live.
8. The alt texts in `launch-research-artwork.json` are Russian and not localized (§4.5).
9. The Settings date is always formatted in Russian (`DeckContent.swift:159-167`).
10. `editorial-reading.ru` / `research-idea-contexts.ru` / `studio.json` are Russian-only and feed the idea search haystack in every locale (`ClarityCatalogs.swift:173-174`).
11. Quote translation gaps in de/fr/ja: `run-tracking/pause` and `flashcards/generation` show English. Their originals are Russian and `rich.en` carries English renderings; the de/fr/ja packs key the run-tracking one by the Russian original and do not have the flashcards one.
12. `ResearchReading.groups` hard-codes the non-`L()` titles `"Выводы из отзывов"` / `"Другие ситуации из отзывов"` (`Studio/StudioResearchReader.swift:347, 375`). Only the unreached dossier fallback path uses them.
13. `idea-articles.ru.json` and `idea-cards.ru.json` lack the top-level `locale` key that the other locales have. `text.*` and `facts` are `version: 2` and unchecked.
14. `rich.en` has no `rating`, so the legacy saved-app view shows "Приложение недоступно" in non-ru locales. `ClarityRatingsView`, `ClarityCategoryRatingView`, `ClarityScenarioView`, `ClarityComparisonPicker` and `ClarityCompareView` are unreachable. The `.ratings` and `.scenario` routes open the research article (`ClarityRoot.swift:124-126`).
15. Dead data paths for the launch set:
    * the fallback idea view;
    * the dossier-based research view;
    * `nicheSummary` hard-coded fallbacks (`ClarityReader.swift:20-30`);
    * `remainingDirections` / `remainingIdeas`;
    * `StudioArtCatalogue`;
    * 9 of the 10 `ideaTeasers`;
    * `otherQuotes`;
    * `facts.prompt` / `markets`.
16. `ClarityQuoteBlock` receives `app`/`rating` but renders neither (§4.3). Readers deliberately omit app names.

---

## 10. Open questions
See the structured list returned with this spec. They are also summarized here:
1. Web locales and default: all 5 from `locales.json` with default `en`, or `ru` as the root default for inapp.pro (the current site is ru-first)?
2. The app hard-codes `https://inapp.pro/{ru|en}/offer` and `/contacts`, and the unreachable Compare view links `/ru/reviews/…` and `/ru/rating/…`. After the old site moves to `/old`, should these paths be real new pages or redirects?
3. Alt text for the 32 JSON categories in en/de/fr/ja: generate from templates, use empty alt, or add translations in the app repo?
4. The 2 untranslated de/fr/ja quotes: fix at the source (the app repo) or keep parity?
5. Keep parity on NBSP→space and 430/360 reflow, or keep NBSPs (better web typography)?
6. Drop the Russian `audience`/`buyer` from non-ru idea search (recommended)?
7. Hosting of about 37 MB of WebP: commit to the repo (LFS?), or object storage/CDN?
8. Content sync: run the import script manually against a pinned app commit, or wire it into CI?
9. Is showing `app` names in quotes on the web desired? The app hides them.
