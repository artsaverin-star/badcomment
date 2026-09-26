# «Пульс» — needs from reviews, with a pain score

Local feature on `site-v2`; nothing here is deployed or pushed. Product spec (Russian, source of
truth): `app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md`.

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
| `/<L>/pulse` | Feed: heading, compact controls (the category picker and the search in the title/summary — nothing else), gauge cards in a 1/2/3-column grid (760/1280), 24 per page, a closed «Как считаем» at the bottom (with the word levels). Query: `?category=&q=&page=`. Only the unfiltered first page is indexable. Retired keys are ignored: the prototype's `view`, `scope`, `sort` and, since 2026-09-25, `kind` (the removed «Все · Просят · Жалуются» switch) — `?kind=pain` renders the unfiltered feed, indexable, with the canonical `/<L>/pulse`. |
| `/<L>/pulse/<category>--<slug>` | Need page: the category (small link to the filtered feed), title, a large gauge (a 200×116 dial drawn 169×116, «1» and «10» at the ends of the arc) with the word level on the number's baseline, the facts line (reviews · «в 92 из 100 приложений» · share of the category's reviews, «<0,1 %» below 0.1 % · «проверено вручную: 48 из 55», wrapping only between facts, never after a «·»), the summary, link to the category breakdown; «Из чего складывается 7/10»; «Где об этом пишут» (dot grid next to «Чаще всего пишут в»); the star split (5 bars; a zero count has no fill); quotes; «Ещё в категории» as bar rows. Indexable and listed in the sitemap. |
| `/<L>/pulse/<id with ":" or "insight">`, `/<L>/pulse/insight/<…>` | Retired prototype/insight URLs → 307 to `/<L>/pulse?category=<cat>` when the prefix is a Pulse category, else `/<L>/pulse`. |
| any other id | 404 |

Card (`PulseCard.tsx`, server-rendered, no client JS), top to bottom: the category as small
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

## Evidence gate

The first quote is public. The others render only when `getViewer().canReadResearch(categoryId)`
(Plus, the free `interior-design` topic, or a legacy unlock of that category) — the same right as
the category's breakdown. Otherwise a lock card (Plus button → `/<L>/plus?source=pulse_need`, and
«Уже есть доступ? Войти» for guests). The gate runs on the server before rendering
(`visibleEvidence`), so locked quotes are in neither the HTML nor the RSC payload. The need object
never reaches a client component; the only client component (`PulseFilters`) receives category
names and interface strings. ru shows `quoteRu` with the original behind «Показать оригинал»;
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
   работе 61 приложения» — or the catalogue's on a locked topic, the same figures), the archive
   header on `/reviews/<slug>`, the dossier's «отзывов в архиве», the hub's totals on `/reviews`
   («Пульс» there). The test compares them page by page.
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
- The old archive (`src/components/LegacyPulseLink.tsx`, the same component with plain `<a>` links):
  the review hub `/reviews` (the strongest needs across categories, each row with its category,
  «Все потребности (N)»), `/reviews/<slug>`, old topic pages and `NicheDossier` (that category's
  needs; nothing without needs), right under each page's header. Links leave the old site via
  `publicHref` with `old-links: allow`, as `scripts/check-old-links.mjs` requires.
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

## Checks

`test-pulse.ts` covers, besides the data and the routes: the retired `?kind=` (ignored, the feed
unfiltered and indexable, canonical `/pulse`; filtered pages noindex); no kind label, markup or
switch in the card, the rows, the block, the old archive and the live feed/need page; the
word-level thresholds in five locales; the gauge (10 ticks, `score` on, one needle, inside the
box; the drawn box trimmed to the ticks' ink and the CSS sizes matching it; rendered counts); the breakdown for every need (the exact parts add up to the raw score and
round to `score`; each shown part is its value rounded down or up; the shown total rounds to the
score and is within 0.1 of the raw score); the dot grid counts and fill order; «Пульс категории»
(header phrases — the subtitle's reviews and apps equal the host page's own figures, in-process
for every topic and archive page and live on `/ru/segment/<free topic>`, `/ru/reviews/<slug>`,
`/ru/reviews` and a dossier —, fact lines that never break after a «·», one gauge with the #1 score, rows #2…#5 with bars of score × 10 %, «Все N
потребностей →», every link resolves) and its position (in-process through `ResearchArticle` and
`LockedPreview`, and live: between the cover and «Главное», first in the TOC, before the paywall
for a guest on a locked topic); the old archive's hub and category variants; one hue (no old
amber/red hexes, no `--ia-danger`, no bare hex — nor a URL-encoded `%23…` one — outside a `var()`
fallback in the Pulse CSS; the old meter files are gone); every category named in all five
locales; no star-split fill for a zero count.

```sh
node --import tsx scripts/v2/test-pulse.ts   # data, logic, rendered HTML, sitemap; + live HTTP when a dev server answers (PULSE_BASE_URL, default http://localhost:3107)
npx tsx scripts/v2/check-content.ts
npm run test:v2-routing
node scripts/check-old-links.mjs
node docs/site-v2/review/check-ui-keys.mjs
npx tsc --noEmit --incremental false
```

The test derives ids, counts and categories from the file; nothing is hard-coded, because the
file grows while needs are mined. Use `next dev -p 3107 -H localhost` (see `.claude/launch.json`).

## Merge note (2026-09-24)

A parallel branch `site-v2-sections` (worktree `badcomment-sections`) moves `/<L>/reviews/**`,
`/<L>/rating/**` and `/<L>/mcp` into the new design and edits the same shell files (TabBar, routing,
strings, Footer, TopNav, ChromeFrame, ARCHITECTURE.md). Pulse currently embeds its category block in
the OLD reviews pages via `LegacyPulseLink`. When the branches are merged, put `CategoryPulse` into the
new-design `/reviews` hub and `/reviews/[slug]` pages instead, and drop `LegacyPulseLink` there.

