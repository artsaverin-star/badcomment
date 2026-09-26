# «Пульс» — needs from reviews, with a pain score

Merged into `main` on 2026-09-26 together with the web-only sections (rating, reviews, MCP; see
«Merge note» below). Product spec (Russian, source of truth):
`app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md`.

The tab shows concrete needs people write about in App Store reviews and how strongly they show
up. Each need has one number, «Боль 7/10» — a rough signal strength, not a market rating. There
are no dates or charts over time (owner, 2026-09-24: «зачем даты, надо просто говорить условная
боль от 0 до 10 и всё»). It replaced the prototype's 20 curated insights, the rating-distribution
chart, the 2×2 tiles, the source stacks and the check ring.

Design: direction A «Прибор» (owner, 2026-09-25: «давай А и стилек хочется флэт 3D премиум эппл
такой и убрать просят жалуются это мусор»; the synthesis of the directions is kept in
`app_04_inapp/Documentation/PulseDemand-2026-09-24/design-directions.md`).
Every score is a 10-tick gauge with the number inside and a word level; one hue — the brand
cobalt; no «Просят / Жалуются» anywhere. The need's `kind` stays in the data and is never shown
nor used for colour.

## Data

`content/v2/pulse-demand.json` (schemaVersion 1), built by `app_04_inapp/Tools/pulse-demand/build.py`
from mined and independently verified needs. `build.py --site` is its only source: it writes
`Tools/pulse-demand/out/pulse-demand.json` and copies it here byte-identical. Pulse is site-only
(owner, 2026-09-24: «эти разделы только на сайте, в апп их не надо пока»): the iOS app bundle has
no `pulse-demand.json`, and `scripts/v2/import-app-content.ts` neither reads nor writes it (its
stale-file sweep only covers `<locale>/research` and `<locale>/ideas`). Never edit it by hand:

```sh
python3 ~/projects/app_04_inapp/Tools/pulse-demand/build.py --site     # rebuild + copy here
# development build that also includes needs still waiting for verification:
python3 ~/projects/app_04_inapp/Tools/pulse-demand/build.py --allow-unverified --site
```

`scripts/v2/check-content.ts` validates it (`src/site/features/pulse/validate.ts`, shared with the
tests). It is outside `manifest.contentHash`, because `build.py --site` refreshes it independently
of the app import.
A development build (`source.unverifiedIncluded: true`) is a warning locally and an error in CI
(`CI` set; `.github/workflows/deploy.yml` runs `check-content.ts` before the build), because the
interface does not distinguish it. `PULSE_ALLOW_UNVERIFIED=1` lets CI ship it anyway.

- Needs: `id` = `<category>--<slug>` (URL-safe, no colons), `kind` `request` | `pain` (kept in
  the data, never shown: no label, no filter, no colour), `rank` in the category, `score` 1..10, `title`/`summary` in ru/en/de/fr/ja, counts, `share`,
  `ratingCounts` (1★..5★), hand-check `precision`/`precisionSample`, `topApps` (≤ 5), `evidence`
  quotes (`quote` original, `quoteRu` translation). The file order is the feed order: score, then share.
- Score = round(10 × (0.5 × logscale(share, 0.04 %..1.5 %) + 0.2 × apps / category apps
  + 0.3 × logscale(reviewCount, 15..1000))), clamped to 1..10 (parameters in `source.score`). The
  absolute-volume term keeps a small category (10 apps, 2 000 reviews) from reaching 10 on a few
  dozen reviews. The test recomputes it for every need.
  «Как считаем» calls it «условная оценка от 1 до 10» in all five locales (SPEC «Лента»): the
  published scores are 1..10 because of the clamp, and the validator rejects anything else. The
  test checks the wording. The gauge would draw 0 with no tick on, but no need has 0.
- Categories: only those with needs. Names on the site: the product's localized catalogue name
  (35 launch categories), else the file's `name[locale]`, else English. The file names every
  category in all five locales (`Tools/pulse-demand/categories.json`, 2026-09-25: de/fr/ja
  written for the 36 non-launch categories, copied from the catalogue for the 35 launch ones), so
  a de/fr/ja card never shows an English category; the test checks it.

Loader: `src/site/sitedata/pulse.ts` (`server-only`). Production reads the file once; development
re-reads it when its mtime changes. A missing file is an empty state (empty feed, no embed, no
sitemap entries); an unsupported schema throws.

## Pages

| URL | What |
|---|---|
| `/<L>/pulse` | Feed: heading, compact controls (the category picker and the search in the title/summary — nothing else), gauge cards in a 1/2/3-column grid (760/1280), 24 per page that the list loads by itself as the reader scrolls (see «Auto-loading»; `?page=N` and the «Назад · N / M · Дальше» links stay for crawlers and no-JS), a closed «Как считаем» at the bottom (with the word levels). Query: `?category=&q=&page=`. Only the unfiltered first page is indexable. Retired keys are ignored: the prototype's `view`, `scope`, `sort` and, since 2026-09-25, `kind` (the removed «Все · Просят · Жалуются» switch) — `?kind=pain` renders the unfiltered feed, indexable, with the canonical `/<L>/pulse`. |
| `/<L>/pulse/<category>--<slug>` | Need page: the category (small link to the filtered feed), title, a large gauge (a 200×116 dial drawn 169×116, «1» and «10» at the ends of the arc) with the word level on the number's baseline, the facts line (reviews · «в 92 из 100 приложений» · share of the category's reviews, «<0,1 %» below 0.1 % · «проверено вручную: 48 из 55», wrapping only between facts, never after a «·»), the summary, link to the category breakdown; «Из чего складывается 7/10»; «Где об этом пишут» (dot grid next to «Чаще всего пишут в»); the star split (5 bars; a zero count has no fill); quotes; «Ещё в категории» as bar rows. Indexable and listed in the sitemap. |
| `/<L>/pulse/<id with ":" or "insight">`, `/<L>/pulse/insight/<…>` | Retired prototype/insight URLs → 307 to `/<L>/pulse?category=<cat>` when the prefix is a Pulse category, else `/<L>/pulse`. |
| any other id | 404 |

Card (`PulseCard.tsx`, no client JS of its own; the server renders the feed's page, `PulseFeed`
renders the same component on the client for the pages it loads), top to bottom: the category as small
secondary text (no pill), the title (≤ 3 lines), flexible space, the gauge row — the gauge
(84×56, its ink flush with the text column) with the number inside and, 16 px to its right, the
word level (17 px semibold, `--ia-accent`) over «боль 7 из 10» (13 px, `--ia-secondary`), its last
baseline on the number's —, a hairline, «267 отзывов · в 67 из 100 приложений» (`PulseFactList`:
it wraps only between facts, the «·» going with the next one). The whole card is one link; screen readers get «Боль 7 из 10, сильная. 267 отзывов,
в 67 из 100 приложений.» (`needAria`) as text; the visible level and counts are `aria-hidden`.
White `--ia-surface` card on the `--ia-paper` canvas, radius `--ia-radius-idea-card` (24), the
idea card's elevation (`--ia-shadow-idea-card` + the DS card stroke `--ia-line-65`); hover lifts it
2 px with a stronger shadow (none under `prefers-reduced-motion`); dark theme via the tokens, with
a darker shadow and the stroke carrying the edge.

### Gauge, level, bars (`gauge.ts`, `PulseGauge.tsx`, `pulse-kit.css`)

- **Gauge** (`PulseGauge`, SVG, `aria-hidden`): ten round-capped ticks on a 180° arc, tick *i* at
  180° − (*i* − 0.5) × 18°. The first `score` are filled with a vertical gradient — lighter at the
  top of the dial (`color-mix(--ia-accent 72 %, --ia-surface)`), the deep cobalt below
  (`--ia-action`); in dark the accent itself (#94aaff) blended into the action cobalt — and, in
  the light theme only, a soft coloured drop shadow (`feDropShadow`, the accent at 28 %; in dark
  it bloomed into a halo around every tick, so dark has the gradient alone). The last filled tick is the needle:
  longer (28→44 instead of 30→40 on the card) and solid (`--ia-action`; dark `--ia-accent`) so it
  reads at any angle of the gradient. Empty ticks `--ia-line`. The number inside is Onest 600,
  `tabular-nums`, `--ia-ink`. Dials (`GAUGE`): `card` 96×56 (number 28), scaled by CSS × 4/3 in a
  «Пульс категории» ≥ 560 px wide; `page` 200×116 (number 60, «1» and «10» at the ends). The drawn
  box (`gaugeBox`) is trimmed at both sides to the outer ends of the first and last ticks, caps
  included — 84×56 (112×74.67 scaled) and 169×116 — so the ticks start exactly at the text
  column's edge; the longer needle at 1 or 10 overflows by a few px (`overflow: visible`). The
  gradient and the shadow are referenced by id, so every gauge gets a unique `id` (`pg-<need id>`).
  No dial well behind the arc: tried by eye, the flat version reads cleaner.
- **Word level** (`painLevel`, the only place with the thresholds; `PAIN_LEVELS`): 1–3 «Фоновая» /
  Mild / Leicht / Légère / 軽い, 4–6 «Заметная» / Noticeable / Spürbar / Notable / 目立つ, 7–8
  «Сильная» / Strong / Stark / Forte / 強い, 9–10 «Острая» / Acute / Akut / Aiguë / 深刻.
  «Как считаем» lists them (`levelScale`).
- **Bar** (`PulseBar`): track `--ia-soft`, fully rounded, 8 px (6 px thin), the fill the same
  vertical gradient with a faint coloured shadow (light only).
- **Fact lines** (`PulseFactList`): «a · b · c» where every fact after the first is one
  inline-block run with its «·», so a line never ends in a separator and never splits «в 67 из
  100 приложений» or «18 442 отзыва о 61 приложении» (a fact longer than the line still wraps
  inside). Used by the card counts, the block's subtitle and lead line, and the need page's facts.
- **Bar rows** (`PulseBarRows`): title (≤ 2 lines) + a bar of score × 10 % + «9/10» (Onest); in a
  list ≥ 500 px wide one line [title 1fr][bar 200][score 56] (a «Пульс категории» ≥ 560 px), on a
  phone the bar and the score go under the title. Hairlines between rows; each row one link with
  `needAria` as its text alternative.
- One hue: every colour is a DS token or a `color-mix` of tokens; no amber, no red
  (`--ia-danger` included), nothing by kind. `pulse-kit.css` is self-contained with DS fallbacks
  (the old archive has no `--ia-*` tokens) and carries the Onest `@font-face` for the old site.
  The retired amber → red `PainMeter.tsx`, `pain.ts` and `pain-meter.css` are deleted; the test
  greps the Pulse CSS for their hexes. Quote stars are `--ia-ink-65`.

### «Из чего складывается 7/10» and «Где об этом пишут» (`PulseDetail.tsx`)

- The breakdown (`scoreBreakdown`) splits the score into the three terms of `source.score`, each a
  row with a thin bar: «Доля отзывов категории · 8,3 %» → «5,0 из 5» (10 × shareWeight), «Приложения
  · 92 из 100» → «1,8 из 2» (10 × breadthWeight), «Отзывы · 3 827» → «3,0 из 3» (10 × volumeWeight),
  then «Итого 9,8 ≈ 10/10». The exact parts add up to the raw score. Shown to one decimal they are
  rounded by largest remainder (each is its value rounded down or up to 0.1) so they add up to
  the total, and the total is the raw score to one decimal — except when that decimal would read
  as the neighbour score (build.py rounds 7.46 to 7, but «7,5» reads as 8): then it is pulled to
  score + 0.4 or score − 0.5 (29 of 547 needs today, never more than 0.1 away).
- The dot grid (`dotGrid`): one 8 px dot per app of the category, 10 to a row, `appCount` of them
  filled in cobalt from the bottom-left (the bottom row left to right, then up; a partial row is
  the top one), a legend «● 92 с этой болью · ● 8 без» (the swatch and the dots share one colour,
  `--pulse-dot-on`) and «Каждая точка — одно приложение
  категории». The dots are not particular apps (only the top five are known). Next to it «Чаще
  всего пишут в».

## Auto-loading

Owner, 2026-09-26, on the live feed with «1 / 25 · Дальше →»: «неудобно пагинация, пусть
автоподгрузка будет». The feed grows by itself; the pagination stays only as a no-JS fallback.

- **Server page, unchanged for crawlers and no-JS.** `/<L>/pulse?page=N` renders that page (24
  cards, `pulseFeedPage`: clamped to the last page) with the same card markup, the same SEO (only the
  unfiltered page 1 indexable, canonical as before) and the «← Назад · N / M · Дальше →» links. The
  cards go into `PulseFeed` (`PulseFeed.tsx`, the feed's only other client component) as its
  `children`, so the server's `<li>`s are the list's first items as before.
- **Client.** Once hydrated, `PulseFeed` drops the counter and «Дальше →» (a later page keeps its
  «← Назад»; before hydration the server's nav is untouched). A 1 px sentinel `<li>` on the list's
  bottom edge (absolutely positioned, out of the grid flow, `aria-hidden`) is watched by an
  `IntersectionObserver` with `rootMargin: 0px 0px 1000px 0px`: when it comes within ~1000 px below
  the viewport the next page loads. The observer is re-created after every page (its first
  callback re-checks, so a tall screen keeps loading until the list reaches past it) and is off
  while loading, after a failure and at the end. Jumping straight past the list (End, the scrollbar)
  does not load: the footer and «Как считаем» stay reachable, and scrolling back up to the list
  resumes loading.
- **No self-feeding loop** (review 2026-09-26). With a slow network and the reader at the list's
  end, Chrome's scroll anchoring took a skeleton or the sentinel as its anchor and held the view at
  the list's end while each page went in above it: the sentinel never left the range and the feed
  pulled in all 25 pages by itself (scrollY 2390 → 25341, no input). Two guards. The skeleton
  `<li>`s and the sentinel have `overflow-anchor: none`, so the anchor is a card or the list itself
  and new cards go in under the reader's eyes. And the list keeps growing on its own only while the
  view stays where it was when the page arrived (a screen taller than the list): if the view moved
  with the list, the observer's first look after that page holds loading until the reader scrolls
  (a position change other than the one already made, or a wheel, touch or key), so at most one page
  arrives per scroll. «Как считаем» and the footer keep default anchoring: they are only chosen when
  no part of the list is on screen, and then the sentinel is above the viewport, out of range.
- **Next page: `GET /api/site/pulse?l=&category=&q=&page=`** (`src/app/api/site/pulse/route.ts`):
  `parsePulseQuery` → `selectPulseNeeds` (the page's selection and order), `PULSE_PAGE_SIZE` = 24 per
  page, the page's category names; `page` is not clamped — past the last page `items` is empty. It
  returns `{ version, page, pages, total, items }` where an item is `PulseFeedItem` (`pulseFeedItem`):
  `id`, `categoryName`, `title` in the page locale only, `score`, `reviewCount`, `appCount`,
  `categoryAppCount` — no summary, no quotes, no kind. The client renders each with the very
  `PulseCard` (its props are the slim `PulseCardNeed` and `PulseCardStrings`; `PULSE_CARD_ROWS`,
  `PULSE_FEED_ROWS` and `pickStrings` hand the client only the rows it reads), so an appended
  card is byte-for-byte the server's (the test compares them for every need). Public,
  `Cache-Control: public, max-age=300`, `X-Robots-Tag: noindex`; 400 for a bad `l` or `page`. The
  file never reaches the client bundle. Appended cards are de-duplicated by id.
- **States.** Loading: `aria-busy` on the list and three skeleton cards in the card's own shape
  (`.ia-skeleton` shimmer on `--ia-*` tokens; the third only at three columns). Failure: «Не удалось
  загрузить продолжение» with a secondary «Повторить» pill (no automatic retries; while retrying the
  button keeps the focus, `aria-disabled` with a spinner; when it goes away after a success the
  focus moves to the first new card — the only time focus moves). End (a list grown from page 1 to
  its last page): one quiet centred line «Это все 585 болей» (`endPhrase`, plural-aware, five
  locales). No pagination text in any of them.
- **Screen readers.** A visually hidden `role="status" aria-live="polite"` region, present from the
  start, announces every arrival — «Загружены ещё 24 боли. Показано 48 из 585.» (`loadedPhrase`) —
  and a failure. Appended cards follow in the DOM and tab order; nothing steals the focus. New cards
  fade in (`ia-pulse-in`, 320 ms, 8 px); none under `prefers-reduced-motion`, and restored cards never
  animate.
- **Back.** The appended cards and the scroll position are kept in sessionStorage `ia2:pulse.feed`
  (up to three lists, one per history entry, 30 minutes, each with its locale + category + search +
  first page and the data version `pulseDataVersion` — an FNV-1a hash of `generatedAt`,
  `source.fingerprint` and the ids and scores in feed order), written after every page, on a card
  click, on `pagehide` and on unmount; a page from a newer file (a deploy mid-scroll) drops the
  entry's list. On mount the feed marks its history entry: `history.state.iaPulseFeed = { key,
  entry }`, where `entry` is a random id (`crypto.randomUUID`, a fallback on plain http). An entry
  that already carries a mark for the same list keeps its id (Back/Forward, reload); any other
  visit gets a new id. A list is restored only under the entry's own id, fresh and of the same
  data. Until the review of 2026-09-26 the mark was the filter key alone, so every visit of
  `/ru/pulse` «matched»: a fresh visit with the server's 24 cards got an older visit's 585 on Back,
  or its position 15 000 px down on reload. The cards go back in one render before paint and the
  position is set once they are laid out (not earlier: on the server's short page it would be
  clamped and scroll anchoring would then follow the footer). A fresh visit (a link, a tab, a new
  filter) starts at page 1 at the top. The key is listed in the privacy notice (`/<L>/privacy`,
  the storage paragraph, five locales).
- **Filters.** The feed is keyed by locale + category + search + page: a filter change (the GET
  form, «Сбросить», a category link) mounts a new list and aborts a pending request.

## Evidence gate

The first quote is public. The others render only when `getViewer().canReadResearch(categoryId)`
(Plus, the free `interior-design` topic, or a legacy unlock of that category) — the same right as
the category's breakdown. Otherwise a lock card (Plus button → `/<L>/plus?source=pulse_need`, and
«Уже есть доступ? Войти» for guests). The gate runs on the server before rendering
(`visibleEvidence`), so locked quotes are in neither the HTML nor the RSC payload. The need object
never reaches a client component: `PulseFilters` receives category names and interface strings,
`PulseFeed` the server cards' ids and the rows of the strings table it reads, and renders only the
slim card items of `GET /api/site/pulse` (no summary, no quotes). ru shows `quoteRu` with the original behind «Показать оригинал»;
other locales show the original.

## Where it is embedded

«Пульс категории» is one shared block, `CategoryPulseHero.tsx` + `category-pulse-hero.css` (with
`pulse-kit.css`), direction A (owner, 2026-09-25; it replaced the cobalt GO Club canvas of the same
morning). A white DS card — `--ia-surface`, radius `--ia-radius-research-card` (28),
`--ia-shadow-research-card` and the DS card stroke; on the old dark site its own `#1d1e22`
surface with a visible stroke. Top to bottom:

1. «Пульс категории» (h2, Georgia 22/28 like the article) and, 13 px secondary, «7 потребностей ·
   46 072 отзыва о 100 приложениях» (`needsPhrase` · `aboutAppsPhrase`, plural-aware: «о 61
   приложении»). The figures are the host page's own (`stats`), never the Pulse file's count
   (it drops a few duplicate texts, e.g. 45 975 vs 46 072), so one screen never shows two nearly
   equal numbers: the topic's corpus (`research.corpus` — the hero's «Мы изучили 18 442 отзыва о
   работе 61 приложения» — or the catalogue's on a locked topic, the same figures), the sizes
   line under the name on `/reviews/<slug>`, the dossier's «отзывов в архиве», the hub's totals
   line on `/reviews` («Пульс» there). The test compares them page by page.
2. The #1 need, one link: its gauge (84×56; 112×74.67 when the block is ≥ 560 px wide), a small caps
   caption «ГЛАВНАЯ БОЛЬ», the title (≤ 4 lines beside the gauge on a phone, the longest de/fr
   titles need them), «Острая · 3 827 отзывов · в 92 из 100 приложений» (the level in cobalt; on
   the hub with the category). A hairline under it.
3. Rows for needs #2…#5 (`PULSE_EMBED_LIMIT` = 5 needs in all), `PulseBarRows`: title + a labelled
   bar of score × 10 % + «9/10»; one line [title][bar 200][score 56] in a wide block, stacked on a
   phone. On the hub each row names its category.
4. «Все 7 потребностей →» (`allNeedsPhrase`) in `--ia-accent` to the filtered feed.

No chart, no rank numbers, no kind. The CSS is self-contained (its own fallbacks, the theme via
`<html data-theme>` on both sites, Georgia and Onest without the new site's variables), so it
renders the same in the old layout, which loads neither `site.css` nor the Onest variable. A
`@container` query switches the wide layout at ≥ 560 px of block width; nothing overflows at
375 px in any locale.

- New topic pages (`CategoryPulse`): right under the hero — `ResearchArticle`'s `afterHero` slot
  (after the title, lede and cover, before «Главное») when readable, `LockedPreview`'s `afterHero`
  slot (after the locked hero, before the Plus card) when locked. Its TOC entry `#category-pulse`
  comes first, under the same test (`hasCategoryPulse`) — no section and no TOC entry for a
  category without needs. `TopicExtras` keeps only the App Store promo and the old-version link.
- The review archive, a new-site section since 2026-09-24 (`src/app/(site)/site/[lang]/reviews/`),
  right under each page's header (the name or title and its « · » sizes line), before the list or
  the lock card: `/<L>/reviews/<slug>` → `CategoryPulse` with the page's own figures (that
  category's needs; nothing without needs); the hub `/<L>/reviews` → `PulseTop` (the strongest
  needs across categories, each row and the lead naming its category with the feed's names,
  «Все N потребностей →» to the unfiltered feed; `id="pulse-top"`). All five locales (the
  archive's data is ru/en; the block speaks the page locale). No block on the rating pages
  (DECISIONS «Clarity redesign», Q11).
- The old site (`src/components/LegacyPulseLink.tsx`, the same component with plain `<a>` links):
  old topic pages served in place and `NicheDossier` (that category's needs; nothing without
  needs), right under each page's header. Links leave the old site via `publicHref` with
  `old-links: allow`, as `scripts/check-old-links.mjs` requires. The archived old copies of the
  review pages (`/<ru|en>/old/reviews/**`, typed-in only) carry no block.
- Tab bar, top bar, footer, the research catalogue link, and the sitemap (feed + every need, all
  five locales).

## Strings

`src/site/features/pulse/strings.ts` (`defineStrings`, ru/en/de/fr/ja). No kind label or filter
strings any more; the feed subtitle and the empty states no longer speak of «просят / жалуются»
(ru «Конкретные боли из отзывов о приложениях — и насколько они сильные»). Plural forms per
`pluralCategory()`: ru «отзыв/отзыва/отзывов», «приложение/приложения/приложений», the genitive
after «из N» («в 3 из 21 приложения», «в 67 из 100 приложений») and the prepositional after «о N»
(«о 61 приложении», «о 100 приложениях»), «Все 3 потребности / Все 7 потребностей»; en/de
one/other; fr agrees with the first number («dans 1 appli sur 100»); ja has one form. The word
levels and the text alternative («Боль 7 из 10, сильная. 267 отзывов, в 67 из 100 приложений.»,
`needAria`) are per locale. Need titles and summaries come from the file.
The auto-loading feed adds `loaded*` (ru «Загружена ещё 1 боль / Загружены ещё 24 боли /
Загружено ещё 9 болей. Показано 48 из 585.»), `end*` («Это все 31 боль / 42 боли / 585 болей»;
en "That’s all 585 pains", de «Das sind alle 585 Schmerzpunkte», fr «C’est tout : 585 douleurs»,
ja «以上、585件のペインです»), `loadError` and `retry` (the app packs' «Повторить»: Try again /
Erneut versuchen / Réessayer / 再試行); `pages`, `next`, `previous` stay for the no-JS pagination.

## Checks

`test-pulse.ts` covers, besides the data and the routes: the retired `?kind=` (ignored, the feed
unfiltered and indexable, canonical `/pulse`; filtered pages noindex); no kind label, markup or
switch in the card, the rows, the block, the old archive and the live feed/need page; the
word-level thresholds in five locales; the gauge (10 ticks, `score` on, one needle, inside the
box; the drawn box trimmed to the ticks' ink and the CSS sizes matching it; rendered counts); the breakdown for every need (the exact parts add up to the raw score and
round to `score`; each shown part is its value rounded down or up; the shown total rounds to the
score and is within 0.1 of the raw score); the dot grid counts and fill order; «Пульс категории»
(header phrases — the subtitle's reviews and apps equal the host page's own figures, in-process
for every topic and archive page and live on `/{ru,en}/segment/<free topic>`,
`/{ru,en,de}/reviews/<slug>`, `/{ru,en}/reviews` and a dossier —, fact lines that never break after a «·», one gauge with the #1 score, rows #2…#5 with bars of score × 10 %, «Все N
потребностей →», every link resolves) and its position (in-process through `ResearchArticle` and
`LockedPreview`, and live: between the cover and «Главное», first in the TOC, before the paywall
for a guest on a locked topic; on the review hub and category pages right under the header, before
the category list, the apps or the lock card; none on the archived `/ru/old/reviews`); the hub
variant (`PulseTop`, rows naming their categories), the category variant and the old bridge
(`LegacyPulseLink`, `publicHref` links); one hue (no old
amber/red hexes, no `--ia-danger`, no bare hex — nor a URL-encoded `%23…` one — outside a `var()`
fallback in the Pulse CSS; the old meter files are gone); every category named in all five
locales; no star-split fill for a zero count. Auto-loading: `pulseFeedPage` (24 per page, clamped);
the slim card data (only card fields, the title in the page locale) renders the same `PulseCard`
markup as the full need, for every need in five locales; `pulseDataVersion` (stable, changes with
the file); the loader's phrases and plurals in five locales, with no pagination words;
`GET /api/site/pulse` in-process (every page of the unfiltered feed in ru/en, a category, a
category ∩ search, a search, no match, an unknown category: the page's slices in order, every need
exactly once, then an empty page; the page's category names; the server's card markup for page 2 in
five locales; no summary/quotes/kind in the JSON; 400 for bad `l`/`page`); `PulseFeed`'s server
HTML (the server's `<li>`s then the sentinel, the no-JS «Дальше →» and «1 / 25», «← Назад» on later
pages with the filters kept, no sentinel on the last page, nothing of the kind on a one-page list,
the empty polite live region, no end line before the list is complete); the CSS fade-in off under
`prefers-reduced-motion`; and live: the feed's fallback pagination, sentinel and live region in
five locales, `?page=2` and the last page, and the endpoint (slices, a category, past the end, 400).

```sh
node --import tsx scripts/v2/test-pulse.ts   # data, logic, rendered HTML, sitemap, auto-loading; + live HTTP when a dev server answers (PULSE_BASE_URL, default http://localhost:3107)
npx tsx scripts/v2/check-content.ts
npm run test:v2-routing
node scripts/check-old-links.mjs
node docs/site-v2/review/check-ui-keys.mjs
npx tsc --noEmit --incremental false
```

The test derives ids, counts and categories from the file; nothing is hard-coded, because the
file grows while needs are mined. Use `next dev -p 3107 -H localhost` (see `.claude/launch.json`).

## Merge note (2026-09-24, merged 2026-09-26)

A parallel branch `site-v2-sections` (shipped as 6100b863) moved `/<L>/reviews/**`,
`/<L>/rating/**` and `/<L>/mcp` into the new design and edited the same shell files. The merge
keeps both: «Пульс» stays the second tab of the capsule (TabBar) and is also listed in the mobile ☰
menu (`SectionNav.tsx`, label `shellStrings.pulse`, lucide Activity) and the footer, next to the
sections; `CategoryPulse` / `PulseTop` sit in the new-design `/reviews/[slug]` and `/reviews`
pages; `LegacyPulseLink` left the old review pages (now archived copies) and keeps only the
category variant for old topic pages and `NicheDossier`; the need page's «Разбор категории» link
to a category's review archive is the new-site `/<L>/reviews/<slug>` (next/link).
