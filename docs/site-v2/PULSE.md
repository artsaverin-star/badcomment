# «Пульс» — needs from reviews, with a pain score

Local feature on `site-v2`; nothing here is deployed or pushed. Product spec (Russian, source of
truth): `app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md`.

The tab shows concrete requests and complaints people write in App Store reviews and how strongly
they show up. Each need has one number, «Боль 7/10» — a rough signal strength, not a market
rating. There are no dates or charts over time (owner, 2026-09-24: «зачем даты, надо просто
говорить условная боль от 0 до 10 и всё»). It replaced the prototype's 20 curated insights, the
rating-distribution chart, the 2×2 tiles, the source stacks and the check ring.

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

- Needs: `id` = `<category>--<slug>` (URL-safe, no colons), `kind` `request` | `pain`, `rank` in
  the category, `score` 1..10, `title`/`summary` in ru/en/de/fr/ja, counts, `share`,
  `ratingCounts` (1★..5★), hand-check `precision`/`precisionSample`, `topApps` (≤ 5), `evidence`
  quotes (`quote` original, `quoteRu` translation). The file order is the feed order: score, then share.
- Score = round(10 × (0.5 × logscale(share, 0.04 %..1.5 %) + 0.2 × apps / category apps
  + 0.3 × logscale(reviewCount, 15..1000))), clamped to 1..10 (parameters in `source.score`). The
  absolute-volume term keeps a small category (10 apps, 2 000 reviews) from reaching 10 on a few
  dozen reviews. The test recomputes it for every need.
  «Как считаем» calls it «условная оценка от 1 до 10» in all five locales (SPEC «Лента»): the
  published scores are 1..10 because of the clamp, and the validator rejects anything else. The
  test checks the wording. `PainMeter` would draw 0 as an empty scale, but no need has 0.
- Categories: only those with needs. Names on the site: the product's localized catalogue name
  (35 launch categories, all five locales), else the file's `name.ru`/`name.en`, else English.

Loader: `src/site/sitedata/pulse.ts` (`server-only`). Production reads the file once; development
re-reads it when its mtime changes. A missing file is an empty state (empty feed, no embed, no
sitemap entries); an unsupported schema throws.

## Pages

| URL | What |
|---|---|
| `/<L>/pulse` | Feed: heading, compact controls (category picker, Все · Просят · Жалуются, search in the title/summary), cards in a 1/2/3-column grid (760/1280), 24 per page, a closed «Как считаем» at the bottom. Query: `?category=&kind=request\|pain&q=&page=`. Only the unfiltered first page is indexable. Retired prototype keys (`view`, `scope`, `sort`) are ignored. |
| `/<L>/pulse/<category>--<slug>` | Need page: category pill + kind, title, big «Боль 7/10» with the scale, numbers (reviews · apps · share of the category's reviews, «<0,1 %» below 0.1 % · «проверено вручную: 48 из 55»), summary, link to the category breakdown, star split (5 bars), «Чаще всего пишут в», quotes, «Ещё в категории». Indexable and listed in the sitemap. |
| `/<L>/pulse/<id with ":" or "insight">`, `/<L>/pulse/insight/<…>` | Retired prototype/insight URLs → 307 to `/<L>/pulse?category=<cat>` when the prefix is a Pulse category, else `/<L>/pulse`. |
| any other id | 404 |

Card (`PulseCard.tsx`, server-rendered, no client JS): grey category pill, grey kind label
(«Просят» / «Жалуются»), title (≤ 3 lines), «Боль» + big «7» + grey «/10», the 10-segment scale,
grey «267 отзывов · в 67 из 100 приложений». The whole card is one link; screen readers get
«Боль 7 из 10.» as text. White card, radius 24, the soft two-layer shadow, on the `--ia-paper`
canvas (≈ #F5F5F5); dark theme via the `--ia-*` tokens.

Pain scale (`PainMeter.tsx`, `pain.ts`, `pain-meter.css`): 10 rounded segments, `score` filled, each
filled segment coloured by its position on a linear amber `#F4B63F` (1) → red `#E5484D` (10) ramp;
empty segments `#E9E9E9` / dark `#2C2C2E`. The number («7» on cards and the need page, «7/10» in
compact rows and the old archive) is ink-coloured, like «4/10» in the owner's reference: amber text
on white is ≈ 1.8:1 and unreadable, so the colour lives only in the meter; the test checks cards and
rows. Never depends on `kind`. `pain-meter.css` is self-contained because the old archive uses it too.

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

- «Пульс категории» (`CategoryPulse` → `CategoryPulseView`): up to 5 compact rows (title, «7/10» +
  mini scale) and «Все потребности категории (N)» → the filtered feed. In `TopicExtras` on every
  new topic page, readable or locked. The TOC entry `#category-pulse` is added under the same test
  (`hasCategoryPulse`) — no section and no TOC entry for a category without needs.
- The old archive (`src/components/LegacyPulseLink.tsx`): the review hub `/reviews` (the strongest
  needs across categories + «Все потребности (N)»), `/reviews/<slug>`, old topic pages and
  `NicheDossier` (that category's needs; nothing without needs). Links leave the old site via
  `publicHref` with `old-links: allow`, as `scripts/check-old-links.mjs` requires.
- Tab bar, top bar, footer, the research catalogue link, and the sitemap (feed + every need, all
  five locales).

## Strings

`src/site/features/pulse/strings.ts` (`defineStrings`, ru/en/de/fr/ja). Plural forms per
`pluralCategory()`: ru «отзыв/отзыва/отзывов», «приложение/приложения/приложений» and the genitive
after «из N» («в 3 из 21 приложения», «в 67 из 100 приложений»); en/de one/other; fr agrees with
the first number («dans 1 appli sur 100»); ja has one form. Need titles and summaries come from
the file.

## Checks

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

