# Spec 11: the rating, rich, visual and free (web only)

Status: binding for the rating, 2026-09-25. Worktree `badcomment-sections`, branch `site-v2-sections`.

**Covers:**
- `/<L>/rating`
- `/<L>/rating/<niche>`
- `/<L>/rating/<niche>/<app>`
- `/<L>/rating/<niche>/tasks/<n>`
- the new compare pages `/<L>/rating/<niche>/<app>/vs` and `/<L>/rating/<niche>/<app>/vs/<other>`
- `GET /api/site/rating-search`
- the rating's sitemaps, robots, IndexNow and llms entries

**Lead-session override (2026-09-25): Compare is deferred.** D9 and §4.5 are NOT part of this release: no
`/vs` pages, no `routes.ratingCompare`, no `RatingListFilter`, no `compareJsonLd`, no «Сравнить с другим
приложением» button on the app page (the actions row keeps only «Открыть в App Store»), no compare strings.
Everything else in this spec stands. Where the text below mentions compare, skip it.

**Relation to spec 10.** This spec supersedes the rating parts of `docs/site-v2/spec/10-web-only-sections-clarity.md`: §1.1 #3/#4/#6/#7, R2–R4, R6, R7, R9 (method sheet) and R11 for rating pages, §3.0–3.5, and the rating rows of §8, §9 and §10. The review archive and MCP keep spec 10 and their current access rules unchanged.

**Owner rules that still hold:**
- Rating, reviews and MCP are site-only. Nothing goes into the iOS app.
- Pages that mirror the app (research articles, ideas, saved, settings) never link the rating.
- The iOS sources (`/Users/artsaverin/projects/app_04_inapp/Inapp/**`) are read-only references.

**How the facts were checked.** Every data fact below was measured in this worktree on 2026-09-25:
- `src/data/peoplesRating/*.json`
- `content/v2/*/rating/*.json`
- the Apple CDN (`is1-ssl.mzstatic.com`), probed with curl

---

## 1. Decisions

The owner reviewed the Clarity rating and wrote:

> «а что-то из рейтинга пропали все скрины, и смотреть неудобно, дизайн/UX плоский, и вся часть рейтингов у нас бесплатная — она для SEO больше нужна»

Three problems follow from it:
1. The screenshots are gone.
2. The pages are inconvenient to browse and look flat.
3. The rating is free, and its main job is organic search.

The design stays in the new inApp (Clarity) language:
- calm and monochrome, with one accent;
- a 680 column on detail pages;
- radius-20 cards, with radius-28 research-card chrome for the few "hero" objects;
- Georgia for titles and editorial text.

What changes is that it becomes visual and scannable: icons, screenshots, ranks, score meters, leaders and visible controls.

| # | Decision |
|---|---|
| D1 | **Artwork is back, on the site only.** Every app shows its App Store icon everywhere in the rating. Every niche row shows its first 3 screenshots. The top 3 get a screenshot stage of up to 10. The app page gets a full gallery with a viewer. Images are hotlinked from `is1-ssl.mzstatic.com` in CDN-sized WebP (§3.1), as real `<img>` tags in the server HTML. This is allowed by DECISIONS.md §3 («the web may … show their icons»). `MECHANICS-REDESIGN.md:68` remains a rule for the iOS app only. |
| D2 | **The whole rating is free.** No `canReadResearch`, lock card, Plus button or price anywhere under `/rating`. Quotes, task «что проверить», task app lists and «также упомянуты» are public. Accepted consequence: some rating quotes also appear in the paid research articles (22 of 45 in habit-tracking open with the same 60 characters). |
| D3 | **Rank is visible.** Rank = raw data index + 1. All 72 peoplesRating files are sorted by `realScore` descending and have no null score (checked), so this equals the old site's №. Ties keep data order (2,349 ties). The rank never changes when the list is re-sorted. |
| D4 | **Niche page hierarchy.** The hero H1 carries the search phrase. Then a one-sentence intro, a **Top-5** jump card with icons, visible controls, **«Тройка лидеров»** (3 leader cards with a screenshot stage), the tasks inline (public, with gap text and icon stacks), then **«Места 4–N»** as visual row cards. |
| D5 | **Row cards show everything by default.** Each row has rank, icon, title, store star and count, a score with a meter, 3 screenshots, the verdict, and «Хвалят», «Жалуются» and «Кому». Nothing is collapsed and there is no `<details>`. Long texts are clamped with CSS only; the full text is in the DOM. |
| D6 | **Sorting uses visible chips**: «По отзывам · По App Store · Популярные · По названию». The «Порядок» menu goes. Search stays visible, and a toolbar shortcut appears once the search field has scrolled away. |
| D7 | **The catalogue is a grid of niche cards in 10 groups.** Each card has an App Library–style folder of the top-4 icons, the Georgia name, the intro, counts and the leader. Anchor chips jump to the groups. |
| D8 | **App page**: icon hero, facts strip, «Открыть в App Store», verdict inset, screenshot gallery with viewer, «Для каких задач», praise and complaints as a pair of cards, public quotes (all of them), tasks that name the app, 5 alternatives, the same app in other niches, and a compare entry. |
| D9 | **Compare ships in this release.** It ports the dormant `ClarityCompareView`: a picker page, then a compare page with both apps' screenshots and paired texts. It is `noindex`. |
| D10 | **SEO.** Keyword H1s, full per-app text in the server HTML, unique app titles, and per-language `<url>` entries. App pages go into two new image sitemaps. JSON-LD follows Google's rules: no App Store `aggregateRating`, lists are `ListItem`s only, and app pages carry an editorial `Review` by inApp on a 0–100 scale. |
| D11 | **Task pages are public.** A task page is indexable when it has gap text, at least 3 rated apps, and a generated title that fits the title budget (§6.1). That makes 31 ru and 68 en pages indexable today. Every other task page is `noindex, follow`. |
| D12 | **Method on the page.** The method moves from a sheet to a visible «Об оценках» section at the bottom of the niche page. The honesty copy stays word for word. |
| D13 | **Data carries media.** The importer copies `icon`, `shots` and `nrev` from peoplesRating into `content/v2/{ru,en}/rating/*.json` as compact CDN paths. It also adds the SEO head terms, per-niche intros, short app names, leaders and `updatedAt` dates. |
| D14 | **No new tokens, no status colours, no trust wording.** Tokens only. Accent is used only for the leader rank badge, the verdict/gap inset bar, selected chips, links and focus. There is no green/amber/red and no «накрутка», «витринная звезда» or «наш балл» (the method section keeps the app's honesty sentence). |
| D15 | **No `next/image`.** Plain `<img>` with CDN size variants, explicit `width`/`height`, native `loading="lazy"`, and one `preconnect`. Screenshots are never mounted by an IntersectionObserver. |
| D16 | **One `/sitemap.xml` stays.** The rating's app and task pages go into `/sitemap-rating-ru.xml` and `/sitemap-rating-en.xml`, both listed in `robots.txt`. |

---

## 2. Rules for rating pages (they replace spec 10 R2–R4, R6, R7, R9 and R11 under `/rating/**`)

- **RR1 Layout.**
  - Niche, task and compare pages use `.ia-page.ia-page--catalog.ia-page--stack`: 680 + 2×20, gap 20.
  - The app page adds `.ia-page--stack-24`.
  - The catalogue uses `.ia-page.ia-page--grid.ia-page--stack`, with a 1/2/3-column `.ia-grid`.
  - There is no side rail.
- **RR2 Surfaces.**
  - Rows, mini lists, tasks, facts and niche cards are `.ia-card--utility`: radius 20, hairline, flat.
  - Leader cards alone use `.ia-card--research`: radius 28, `--ia-shadow-research-card`, and the 0.7 stroke drawn in `::after`.
- **RR3 Colour.**
  - Text and fills are ink and secondary on surface, paper or soft.
  - Accent appears only on: the leader rank `Badge tone="accent"`, the 3 px bar of `.ia-rt-inset`, selected chips, text links and text buttons, and focus rings.
  - Score meters are ink on `--ia-soft`.
  - ★ is a text glyph only.
- **RR4 Type.** Tokens only. Page H1 is `Heading` (Georgia 30, rising to 40 at ≥ 1024, except `--fixed`). Leader and niche-card titles are Georgia 22/27 (`--ia-fs-card-title`). Row titles are SF 17/22 at 600. Meta is 13/18 secondary. Notes are 15/20.
- **RR5 Images.** Only the rating shows App Store artwork. Every `<img>` has `width`/`height` (or a CSS `aspect-ratio` box) and a CDN-sized URL (§3.1). Images below the fold are `loading="lazy" decoding="async"`.
- **RR6 Text.** All editorial text is in the server HTML. Visual `line-clamp` is allowed. `hidden`, `display:none` and collapsed `<details>` are not allowed on indexable text. The only `hidden` rows are in-topic search results that do not match (client-side, after the user types).
- **RR7 Access.** Nothing under `/rating/**` reads the viewer. No lock cards and no Plus UI.
- **RR8 Copy.**
  - App keys go through `t()` where the app has a key.
  - Web-only strings live in `features/rating/strings.ts` for all 5 locales (§7).
  - Client components read web strings with `useWeb<RatingStrings>("rating")` under `<I18nProvider web={{ rating: ratingStrings[L] }}>`, and app keys with `useT()` under `strings={t.pick(RATING_UI_KEYS)}`.
  - Fixer amendment (2026-09-25): the provider gets only the fields the client components read, `ratingClientStrings(L)` (`RATING_CLIENT_FIELDS` in `strings.ts`), typed `useWeb<RatingClientStrings>("rating")`. The SEO templates, method and archive texts stay on the server (RSC payload).
- **RR9 Links.**
  - Links between sections are `RowCard`s.
  - Inside a card the title is the link, and its `::after` stretches over the card (or over the leader body).
  - Screenshot strips are sibling links above the overlay (`position:relative; z-index:1`). A strip never sits inside another link.
  - Each row has one tab stop, the title. Shot links in rows and on the stage use `tabindex="-1"`.

---

## 3. Shared components

All new files go in `src/site/features/rating/` unless a path says `src/site/ui/`.

CSS:
- Rating CSS goes in `rating.css`, prefixed `ia-rt-`. It is unlayered, like today.
- `.ia-app-icon` goes in `site.css` `@layer components`, next to the Row block, because the review archive may adopt it later.

### 3.1 `media.ts`: Apple CDN URLs (pure, client-safe)

The data stores compact paths (§8.1). A compact path is the part between `https://is1-ssl.mzstatic.com/image/thumb/` and the last `/`. Example icon path: `Purple211/v4/e5/5e/07/e55e071a-…/AppIcon-0-0-1x_U007emarketing-0-7-0-sRGB-85-220.png`.

```ts
export const MZ_ORIGIN = "https://is1-ssl.mzstatic.com";
const BASE = `${MZ_ORIGIN}/image/thumb/`;
/** Displayed icon px → requested square: ≤ 40 → 80, ≤ 64 → 128, else 192 (3 URLs per icon: CDN hit rate). */
export function iconSrc(path: string, cssPx: number): string;          // `${BASE}${path}/${s}x${s}bb.webp`
export const SHOT_H = { row: 440, stage: 520, gallery: 720, viewer: 1400 } as const;
export function shotSrc(path: string, kind: keyof typeof SHOT_H): string; // `${BASE}${path}/9999x${h}bb.webp`
export function iconLd(path: string): string;  // `${BASE}${path}/512x512bb.jpg`  (JSON-LD, image sitemap)
export function shotLd(path: string): string;  // `${BASE}${path}/600x0w.jpg`     (JSON-LD, image sitemap)
/** Displayed shot box: width = round(h × 6 / 13). */
export const SHOT_RATIO = 6 / 13;
```

Variants verified today (Hevy and a `.png`-source shot):

| Variant | Size and weight |
|---|---|
| `80x80bb.webp` | 4.0 KB |
| `128x128bb.webp` | 4.4 KB |
| `192x192bb.webp` | 4.8 KB |
| `512x512bb.jpg` | 18 KB |
| `9999x440bb.webp` | 203×440, 11 KB |
| `9999x520bb.webp` | 240×520, 12.9 KB |
| `9999x720bb.webp` | 333×720, 17.6 KB |
| `9999x1400bb.webp` | 647×1400, 33 KB |
| `600x0w.jpg` | 600×1299 |
| `.avif` | returns 400; never used |

**Size choices:**
- Use one `src` at about 2× the displayed size, with no `srcset`. This keeps the HTML and the RSC payload small.
- The screenshot box is `aspect-ratio: 6 / 13` with `object-fit: contain` on `--ia-soft`. Every sampled shot is iPhone portrait (1242×2688 ≈ 0.462); a rare iPad or landscape shot letterboxes instead of distorting.

**Preconnect.** Every rating page component (catalogue, niche, app, task, compare) calls `preconnect("https://is1-ssl.mzstatic.com")` from `react-dom` at the top of its render.

### 3.2 `src/site/ui/AppIcon.tsx` (export it from `ui/index.ts`)

```ts
export function AppIcon(props: {
  path: string | null;
  size: 24 | 28 | 33 | 40 | 44 | 52 | 56 | 64 | 72 | 80 | 96;
  alt?: string;            // default "" (decorative: the name is printed next to it)
  eager?: boolean;         // default false → loading="lazy"
  className?: string;
}): JSX.Element;
```

- **With a path:** `<img class="ia-app-icon" src={iconSrc(path,size)} width={size} height={size} alt loading decoding="async" style={{ borderRadius: Math.round(size * 0.2237) }}>`. The radius is the iOS squircle maths used by `AppMark`.
- **Without a path:** `<span class="ia-app-icon ia-app-icon--empty" aria-hidden="true" style={{ width, height, borderRadius }}>`.

CSS in `site.css` `@layer components`:

```css
.ia-app-icon {
  display: block;
  flex: none;
  object-fit: cover;
  background: var(--ia-soft);
  /* Drawn over the image (outlines paint last) and follows the radius: white and black
     icons keep an edge on light and dark surfaces. No wrapper node, no new token. */
  outline: var(--ia-hairline) solid var(--ia-ink-15);
  outline-offset: calc(-1 * var(--ia-hairline));
}
```

### 3.3 `score.tsx`: `ScoreMeter` and `RankMark` (server- and client-safe)

`ScoreMeter({ score, size, locale })`:
- Markup: `<span class="ia-rt-score ia-rt-score--{sm|md|lg}" aria-hidden="true">` containing:
  - `<span class="ia-rt-score__value">91</span>`
  - `<span class="ia-rt-score__unit">{s.outOf100}</span>`, omitted for `sm`
  - `<span class="ia-rt-meter" style="--v:91"></span>`
- The accessible text goes into the owner's sr-only span. The row meta sr text is in §3.6; mini rows use `sr-only` `s.scoreA11y`.

| Size | Value | Meter | Used in |
|---|---|---|---|
| `sm` | 17/22, 700 | 40×3 | mini rows |
| `md` | `--ia-fs-title2` 22/28, 700 | 44×4 | row cards, search rows, facts |
| `lg` | `--ia-fs-large-title` 34/41, 700 | 64×4 | leader cards |

- The value uses tabular numbers in ink. The unit is `--ia-fs-caption2` 11/13 secondary.
- Column layout: `flex-direction: column; align-items: flex-end; gap: 3px`.
- Meter CSS: `height: 4px` (3 for `sm`), `border-radius: 2px`, `background: linear-gradient(var(--ia-ink) 0 0) 0 / calc(var(--v) * 1%) 100% no-repeat, var(--ia-soft)`.
- Under `@media (forced-colors: active)` the meter gets `border: 1px solid CanvasText`.
- A null score shows «—» with no meter. There are no null scores today.

`RankMark({ rank })` renders `<span class="ia-rt-rank" aria-hidden="true">{rank}</span>`: 15/20, 600, tabular, secondary.
- On narrow cards the list sets `style={{ "--ia-rt-rank-prefix": JSON.stringify(s.rankPrefix), "--ia-rt-rank-suffix": JSON.stringify(s.rankSuffix) }}`.
- Under 600 px (container) the rank reads «№ 4» / "#4" / «4位» through `::before { content: var(--ia-rt-rank-prefix) }` and `::after { content: var(--ia-rt-rank-suffix) }`.
- From 600 px it is the bare numeral in a 28 px column.

### 3.4 Screenshots

Common image markup: `<img class="ia-rt-shot" src={shotSrc(p, kind)} width height alt loading decoding="async">`.

Common CSS:
- `aspect-ratio: 6 / 13`, `object-fit: contain`, `background: var(--ia-soft)`
- `border-radius: var(--ia-radius-thumb)` (12); the gallery uses `--ia-radius-field` (16)
- the same outline ring as `.ia-app-icon`
- no fade-in (it would need JS; the soft box already reserves the space)

Alt text on every shot: `format(s.shotAlt, { app: short, n: i + 1, count: shotsTotal })`, e.g. «Hevy: скриншот 1 из 10». It is also the image-search text.

| Component | Where | Display | Request | Count | Interaction |
|---|---|---|---|---|---|
| `RatingShots` (server) `.ia-rt-shots` | row cards, compare | ≥ 600 container: 3 × 102×221, gap 8, right column 322 wide. < 600: 3 equal columns (`grid-template-columns: repeat(3, 1fr)`, gap 8), height from the width (≈ 94×204 at 375). | `row` (440) | first 3 | The strip is one `<a class="ia-rt-shots" href="{app}#screenshots" tabindex="-1" aria-hidden="true">` with 3 `<img>`. It never scrolls. |
| `RatingStage` (server) + `ShotScroller` (client) `.ia-rt-stage` | leader cards | Stage `--ia-soft`, padding 20 (16 below 600). Track height 260 (228 below 600), gap 10. Shots get `box-shadow: var(--ia-shadow-illustration)`. | `stage` (520) | up to 10 | `ShotScroller` renders `<div class="ia-rt-stage__track" role="region" aria-label={shotsLabel} tabindex="0">`. Each shot is `<a href="{app}#screenshots" tabindex="-1">`. Track CSS: `overflow-x:auto; scroll-snap-type:x proximity; overscroll-behavior-x:contain; scrollbar-width:none`; each child has `scroll-snap-align:start`. |
| `RatingGallery` (client) `.ia-rt-gallery` | app page `section#screenshots` | Height 360 at ≥ 760 viewport, 300 below. Gap 12. Below 760 the track bleeds into the page gutter (`margin-inline: calc(-1 * var(--ia-gutter-catalog)); padding-inline` and `scroll-padding-inline` the same). | `gallery` (720) | all (≤ 10) | Each shot is `<a class="ia-rt-gallery__shot" href={shotSrc(p,"viewer")} data-rt-shot={i}>`. The page opens the viewer; without JS the link opens the large image. The shots are Tab stops. |
| viewer inside `RatingGallery` `<dialog class="ia-rt-viewer">` | app page | Full screen. Images `height: min(100dvh - 140px, 1000px)`. | `viewer` (1400) | on open | See below. |

**Arrows (`ShotScroller` and the gallery):**
- Two 36 px glass circles (`.ia-rt-arrow`, the `.ia-glass-pill` look), vertically centred at the track edges. Icons are `ChevronLeftIcon` / `ChevronRightIcon` at 18.
- Rendered only under `@media (hover: hover) and (pointer: fine)`, and hidden (`hidden`) when that direction cannot scroll. `data-at-start` / `data-at-end` are updated on `scroll` and `resize`.
- A click scrolls by 80 % of `clientWidth` with `behavior: "smooth"` (instant under `prefers-reduced-motion`).
- On the stage the arrows are `tabindex="-1" aria-hidden="true"`: the region itself scrolls with arrow keys. In the gallery they are real buttons labelled `s.prevShot` / `s.nextShot`.

**Viewer:**
- Native `<dialog aria-label={shotsLabel}>` opened with `showModal()`. The backdrop is `rgb(0 0 0 / 0.9)` in both themes.
- The track scroll-snaps with `x mandatory`, centred. Swipe is native scrolling.
- Top bar:
  - a counter `format(s.viewerCount, { n, count })`, 13/18, white at 80 %, `aria-live="polite"`;
  - `IconButton variant="circle"` with `CloseIcon`, label `t("Закрыть")`.
- Previous/next 44 px circles show at ≥ 760.
- Keys: ← → Home End, and Esc (native).
- It opens at the clicked index with `scrollTo({ left, behavior: "instant" })`. Focus returns to the thumbnail that opened it.
- History: it owns one history entry, so Back closes it. Copy the effect from `src/site/ui/Sheet.tsx:109-133`, using its own state key `iaViewer`.
- Viewer images are `loading="lazy"` except the opened one and its neighbours.
- No motion under `prefers-reduced-motion`.

**Broken images: `RatingImageGuard` (client, renders `null`).** Each rating page mounts it once.
- On mount it scans `img.ia-rt-shot, img.ia-app-icon` for `complete && naturalWidth === 0`. Then it listens to `error` on `document` in the capture phase.
- A broken shot: its link or slot gets `hidden`. If every shot of a strip is gone, the strip gets `hidden`, and a row without shots then reflows to one column through `:has()`.
- A broken icon: `src` becomes the 1×1 transparent GIF `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`, so the soft tile and ring stay.

Apple URLs change when apps update their screenshots. This guard is the safety net; the refresh is out of scope (§12).

### 3.5 `IconStack` (server)

- Up to 4 `AppIcon`s. From the second icon on: `margin-inline-start: calc(var(--s) * -0.28)` and `box-shadow: 0 0 0 2px var(--ia-surface)`.
- Sizes: 28 (task rows) and 24.
- The stack is `aria-hidden="true"`; the names are printed next to it.

### 3.6 `RatingAppCard` (server): `variant="row"` (№4+, task and search contexts) and `variant="leader"` (№1–3)

```ts
export function RatingAppCard(props: {
  app: RatingAppEntry;   // sitedata (§8.3): rank, short, icon, shots, texts
  href: string;          // routes.ratingApp(L, niche, app.slug)
  locale: Locale;
  dataLang?: string;     // lang attr for texts on de/fr/ja pages ("en")
  variant: "row" | "leader";
  eager?: boolean;       // icon (leader №1 also: first 3 stage shots)
}): JSX.Element;         // returns the <li id="app-{slug}" data-slug={slug}>
```

**Row markup** (element count per row ≈ 25):

```html
<li id="app-{slug}" data-slug="{slug}" class="ia-rt-item">
 <article class="ia-card ia-card--utility ia-rt-card [ia-rt-card--noshots]" aria-labelledby="{slug}-t">
  <div class="ia-rt-card__head">
    <span class="ia-rt-rank" aria-hidden="true">4</span>
    <img class="ia-app-icon" …52 | 56…>
    <div class="ia-rt-card__titles">
      <h3 id="{slug}-t" class="ia-rt-card__title"><a class="ia-rt-card__link" href="{href}">{title}</a></h3>
      <p class="ia-rt-meta"><span class="sr-only">{rankA11y}. {scoreA11y}. {storeA11y} </span>
         <span class="ia-rt-meta__star">4,8★</span> · <span class="ia-rt-meta__count">12 345 оценок</span></p>
    </div>
    <ScoreMeter size="md"/>
  </div>
  <RatingShots/>                                                     <!-- when shots.length > 0 -->
  <p class="ia-rt-card__verdict" lang>{verdict}</p>                   <!-- when not null -->
  <p class="ia-rt-note ia-rt-note--plus" lang><strong>{s.praised}</strong> {loved}</p>
  <p class="ia-rt-note ia-rt-note--minus" lang><strong>{s.complained}</strong> {weak}</p>
  <p class="ia-rt-note ia-rt-note--for" lang><strong>{s.forWhom}</strong> {whoFor}</p>
 </article>
</li>
```

A text that is `null` is not rendered: 22 ru / 32 en apps have no verdict. The meta star or count is dropped when missing or zero.

**Row layout.** The list is the container: `.ia-rt-list { container: rt-list / inline-size }`.

Narrow (< 600, phones). Card padding 18.

```
┌─────────────────────────────────────────┐
│ [icon52] № 4                         84 │  rank caption 12/16 600 secondary (prefix via CSS)
│          Streaks - Habit Tracker  из 100│  title 17/22 600, 2-line clamp, overflow-wrap:anywhere
│          4,8★ · 12 345 оценок      ▬▬▬▬ │  meta 13/18 secondary
│ [shot ][shot ][shot ]                    │  3 equal columns, gap 8, ≈ 94×204
│ Verdict 15/20 ink, 3-line clamp          │
│ (👍) Хвалят: … 15/20, 2-line clamp       │
│ (👎) Жалуются: …                         │
│ (👤) Кому: …                             │
└─────────────────────────────────────────┘  ≈ 520 px
```

- `.ia-rt-card__head` grid: columns `52px minmax(0,1fr) auto`; areas `"icon rank score" "icon title score" "icon meta score"`; column gap 12, row gap 2.
- The article is a flex column with gap 12.

Wide (≥ 600 container: tablets and desktop, where the column is 680). Card padding 22.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  4  [icon56]  Streaks - Habit Tracker                                   84  │
│               4,8★ · 12 345 оценок                               из 100 ▬▬▬ │
│ Verdict 15/20 ink, 4-line clamp …                 │ [shot][shot][shot]      │
│ (👍) Хвалят: … 2 lines                             │  3 × 102×221, gap 8     │
│ (👎) Жалуются: … 2 lines                           │                         │
│ (👤) Кому: … 2 lines                               │                         │
└────────────────────────────────────────────────────────────────────────────┘  ≈ 340 px
```

- Head grid: columns `28px 56px minmax(0,1fr) auto`; areas `"rank icon title score" "rank icon meta score"`; column gap 14.
- The article becomes a grid: columns `minmax(0,1fr) 322px`; column gap 24, row gap 10.
  - The head spans both columns.
  - `.ia-rt-shots` sits at `grid-column: 2; grid-row: 2 / span 4; align-self: start`.
  - The texts go in column 1.
  - `.ia-rt-card--noshots` (or `:not(:has(.ia-rt-shots:not([hidden])))`) uses a single column.

**Notes.**
- The glyph costs no DOM nodes. `.ia-rt-note::before` is a 20 px circle in `--ia-soft` at `margin-inline-end: 8px`. `::after` holds the glyph: a 12 px ink shape painted with `mask: url("data:image/svg+xml,…") center / contain no-repeat; background: var(--ia-ink)`, positioned over the circle.
- The masks are lucide `thumbs-up` (plus), `thumbs-down` (minus) and `user-round` (for), stroke 2.
- The label `<strong>` is 600 ink; the text is secondary.
- Clamp: `display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; overflow:hidden`. The verdict clamps at 3 lines (narrow) or 4 (wide).
- The full text stays in the DOM (RR6).

**Interaction.**
- The article is `position: relative`. `.ia-rt-card__link::after { content:""; position:absolute; inset:0; border-radius:inherit }` makes the whole card open the app page.
- `.ia-rt-shots` is `position:relative; z-index:1` and is its own link to `#screenshots`.
- Hover (only under `@media (hover:hover)`): `.ia-rt-card:has(.ia-rt-card__link:hover) { background: color-mix(in srgb, var(--ia-surface) 94%, var(--ia-ink)) }`, the `.ia-row-card` tint, and the title underlines.
- Focus: `.ia-rt-card:has(.ia-rt-card__link:focus-visible) { outline: 2px solid var(--ia-accent); outline-offset: 2px }`, and the link's own outline is removed.
- Press: `.ia-rt-card:active > * { opacity: .55 }`. No scale.

**Performance.** Rows at rank ≥ 11 get `content-visibility: auto; contain-intrinsic-size: auto 520px` (and `auto 340px` at `@container rt-list (min-width: 600px)` — Fixer amendment (2026-09-25): the same condition as the wide row layout, not a 760 px viewport, so 640–759 px viewports do not reserve 180 px too much per deferred row).

**Sort emphasis.**
- `.ia-rt-list[data-sort="store"] .ia-rt-meta__star` becomes ink 600.
- `.ia-rt-list[data-sort="ratings"] .ia-rt-meta__count` becomes ink 600.
- The big number is always the review score.

**Leader markup (№1–3)** is `<li id="app-{slug}" data-slug class="ia-rt-lead-item">` containing `<article class="ia-card ia-card--research ia-rt-lead" aria-labelledby>`:

```
┌──────────────────────────────────────────────────────────────┐ r28, shadow, 0.7 stroke ::after
│░ stage --ia-soft pad 20: [s][s][s][s][s]→        ‹ ›       ░│ 260 tall (228 < 600)
├──────────────────────────────────────────────────────────────┤
│ [icon64] (№ 1 по отзывам)                                91  │ Badge tone="accent"; ScoreMeter lg
│          Hevy - Workout Tracker Gym Log            из 100 ▬▬▬ │ h3 Georgia 22/27 link (stretched over the body)
│          4,9★ · 76 767 оценок                                │ meta 13/18
│ Verdict 17/26 ink (--ia-lh-body-relaxed), full               │
│ ┌(👍) Хвалят ────────────┐ ┌(👎) Жалуются ─────────────┐     │ .ia-rt-pc: --ia-paper insets r16 pad 16,
│ │15/20 secondary, 4 lines│ │ 4-line clamp, full in DOM │     │ side by side ≥ 600, stacked below
│ └────────────────────────┘ └───────────────────────────┘     │
│ (👤) Кому: … 15/20 secondary, full                           │ .ia-rt-note--for
│ Открыть разбор приложения                                    │ span, accent 15/600, aria-hidden
└──────────────────────────────────────────────────────────────┘
```

- **Stage.** `RatingStage` with up to 10 shots.
- **No shots** (8 niches have a top-3 app without shots: blood-pressure-log, hiking-trails, pet-care, qr-scanner, step-counter, stock-investing, teleprompter-captions, weight-tracker). The stage becomes `.ia-rt-stage--art`, 160 tall, on `--ia-soft`:
  - `::before` is an accent-soft plate 96×110, radius 18, rotated −15°;
  - `::after` is an `--ia-accent-17` plate 92×110, radius 16, rotated +12°;
  - the `AppIcon` 96 sits centred on top with `box-shadow: var(--ia-shadow-paper)`.
  - It uses the ClarityArt plates without the float animation.
- **Body.** `.ia-rt-lead__body`: padding 22 (18 below 600), `position:relative`, flex column with gap 16.
- **Head grid.**
  - Below 600: columns `56px minmax(0,1fr) auto`; areas `"icon badge score" "title title title" "meta meta meta"`.
  - From 600: columns `64px minmax(0,1fr) auto`; areas `"icon badge score" "icon title score" "icon meta score"`; gap 14.
- **Hover** (only when over the body, and only for hover-capable devices): `.ia-rt-lead:has(.ia-rt-card__link:hover) { transform: translateY(-1px); box-shadow: 0 8px 36px rgb(0 0 0 / .085) }`. There is no transform while swiping the stage.
- **Eager.** Leader №1 loads its icon and first 3 stage shots eagerly; leaders №2–3 are lazy.
- **Dark mode.** Shadows nearly vanish, so the `::after` stroke (`--ia-line-65`) carries the edge.

### 3.7 `RatingMiniRow` (server)

Used by the Top-5 card, alternatives, other niches and the compare picker.

```ts
export function RatingMiniRow(props: {
  href: string; rank?: number; icon?: string | null; iconEager?: boolean;
  title: string; titleLang?: string; meta?: string; score: number | null; locale: Locale;
}): JSX.Element; // <li><a class="ia-rt-mini">…</a></li>
```

- Row grid: columns `[rank 2.2ch] [icon 40] [1fr] [auto]`, gap 12, min-height 60, padding-block 8.
- Title: 17/22 at 500 ink, one-line ellipsis. Meta: 13/18 secondary, one line.
- Score: `ScoreMeter size="sm"` plus `<span class="sr-only">{scoreA11y}</span>`.
- Parent: `ul.ia-rt-minis` inside a `.ia-card--utility` with padding `6px 18px`. Dividers: `li + li` gets a hairline top border inset 52 px (`--ia-line-card`).
- Hover gets the `.ia-row-card` tint; focus-visible gets the accent outline.
- With no `icon` prop, the icon column is dropped. With no `rank`, the rank column is dropped.

### 3.8 `RatingNicheCard` (server): `variant="full"` (catalogue) and `variant="compact"` (related topics)

Markup: `<li><a class="ia-card ia-card--utility ia-row-card ia-rt-niche ia-rt-niche--{full|compact}" href>`. The whole card is one link.

**Full.**
- Grid `[folder 88] [text 1fr]`, gap 16, padding 20, min-height 132.
- Folder `.ia-rt-folder`: 88×88, radius 20, `--ia-soft`, padding 8. A 2×2 grid with gap 6 holds 4 `AppIcon` 33 (the top 4 by rank). It is `aria-hidden`.
- Text column:
  - `h3.ia-rt-niche__name`: Georgia 22/27 ink, 2-line clamp, `lang={nameLang}`.
  - `p.ia-rt-niche__intro`: 15/20 secondary, 2-line clamp, `lang={dataLang}`. Omitted when null.
  - `p.ia-rt-niche__meta`: 13/18 secondary, `format(s.nicheCardMeta, { apps: counted(count, s.appsWord), reviews: counted(totalReviews, s.reviewsWord) })` → «93 приложения · 31 241 отзыв».
  - `p.ia-rt-niche__leader`: 13/18 ink, one-line ellipsis, `format(s.leaderLine, { app: leaders[0].short, score })` → «Лидер: Hevy — 91 из 100».
  - Fixer amendment (2026-09-25): in the leader line only the app name (`span.ia-rt-niche__leader-app`) takes the ellipsis, so the score is never cut (47 of 71 were at 375). The meta line renders the two counts as two nowrap spans; the separator of `nicheCardMeta` hangs in the gap before the second and is clipped when it wraps, so no line ends or starts with «·». The `li` of the grid is itself a grid, so the cards of one row share their height.

**Compact.** Folder 64: padding 6, gap 4, icons 24. Name 17/22 at 600, 2-line clamp. Meta line only. Min-height 96.

### 3.9 `RatingTaskList` (server)

```ts
export function RatingTaskList(props: {
  tasks: RatingTaskCard[]; niche: string; locale: Locale; dataLang?: string;
  variant: "full" | "compact"; exclude?: number;
}): JSX.Element; // <ul class="ia-rt-tasks__list">
```

Each row is `<li><a class="ia-rt-task" href={routes.ratingTask(L, niche, n)}>`:
- **full** (niche page):
  1. `h3.ia-rt-task__job`: 17/22 at 500 ink, 2-line clamp, in the data `lang`.
  2. `p.ia-rt-task__gap`: 15/20 secondary, 2-line clamp, when the gap exists.
  3. `div.ia-rt-task__apps`: `IconStack` (28) of the first 4 rated apps, plus `p` 13/18 secondary with the names.
     - Names are the first 2 short titles joined by ", " (ja "、") plus `format(s.moreApps, { names, n })` when there are more than 3.
     - With 3 or fewer apps they are joined with `Intl.ListFormat(locale, { type: "conjunction" })`.
- **compact** (app and task pages): the job (17/22 at 500, 2 lines) and the audience name (13/18 secondary, 1 line).

List styling:
- Rows: min-height 64, padding-block 16. `li + li` gets a hairline top border.
- Hover: the title underlines. Press: opacity .55.

### 3.10 `RatingSearchRow` (client-safe; used by `RatingCatalog`)

- `li > a.ia-card.ia-card--utility.ia-row-card.ia-rt-hit`.
- Grid `[icon 44] [text] [score md]`, gap 14.
- Text:
  - title 17/22 at 600, 2-line clamp;
  - context 13/18 secondary: `format(s.searchContext, { niche, rank, star })` → «Привычки · № 2 · 4,8★»;
  - summary 15/20 secondary, 2-line clamp.
- It reads strings with `useWeb` and `useLocale`.

### 3.11 Formatting helpers (`format.ts`)

- Keep `starText` («4,8★»).
- Move `reviewScoreValue` and `storeScoreValue` here from `RatedAppRow.tsx` unchanged.
- Add `storeMetaText(locale, storeAvg, ratings)`, which returns `format(s.storeMeta, { star, ratings: counted(ratings, s.ratingsWord) })` and drops the missing part.

---

## 4. Pages

### 4.1 Catalogue `/<L>/rating` (`src/app/(site)/site/[lang]/rating/page.tsx`)

**Desktop (1280):**

```
[Рейтинги]                                                   (DetailToolbar, section root, no Back)
H1  Рейтинг приложений по отзывам                             (Heading, Georgia 30 → 40)
    4 343 приложения в 71 теме: оценка по текстам отзывов, скриншоты, что хвалят и на что жалуются.
[ Приложение или задача                                     ]  (RatingCatalog SearchField, max-width 680)
(Здоровье)(Спорт и активность)(Привычки и спокойствие)(Работа и дела)(Искусственный интеллект)…  (anchor chips)
<div id="rating-niches">
 H2 Здоровье  10
 ┌[folder] Дневник давления ──────┐┌[folder] Дневник веса ──────────┐┌[folder] Интервальное … ┐
 │ Где запись… (2 lines)          ││ …                              ││ …                      │
 │ 52 приложения · 12 047 отзывов ││                                ││                        │
 │ Лидер: … — 88 из 100           ││                                ││                        │
 └────────────────────────────────┘└────────────────────────────────┘└────────────────────────┘
 H2 Спорт и активность  7
 …
</div>
footnote «Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.»
```

**Mobile (375):** one column of full niche cards. The chips scroll horizontally. The H1 wraps to 2 lines. Fixer amendment (2026-09-25): below 760 the chip row runs to the screen edges (negative gutter margin, matching padding), so a cut chip reads as more to scroll.

**Blocks, in order:**
1. `<RatingImageGuard/>` and `preconnect`.
2. JSON-LD (§6.4).
3. `DetailToolbar title={t("Рейтинги")}`.
4. `Heading` (serif, not fixed), `className="ia-rt-catalog__head"` with `max-width: var(--ia-w-catalog)`.
   - Title: `s.catalogTitle`.
   - Subtitle: `format(s.catalogLead, { apps: counted(total, s.appsWord), topics: counted(71, s.topicsInWord) })`, where `total` is the sum of the cards' counts (4,343).
5. `s.dataNote` footnote (de/fr/ja), as today.
6. `<I18nProvider locale strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingStrings[L] }}>` around `<RatingCatalog>`. Its default children:
   - `nav.ia-chips.ia-rt-groups[aria-label=s.groupsLabel]` of `a.ia-chip.ia-chip--surface href="#group-{id}"` with the group name. Add `text-decoration:none` for anchors.
   - `div#rating-niches` holding one `section#group-{id}.ia-rt-group[aria-labelledby]` per group, in `RATING_GROUPS` order:
     - a `.ia-section-head` with `h2.ia-section-title.ia-section-title--bold` (the group name) and `.ia-section-head__count`;
     - `ul.ia-grid.ia-rt-niches` of `RatingNicheCard variant="full"`, alphabetical by displayed name (`compareNames`).
     - The first 6 cards' icons are `eager`.
   - The anchor jump uses the existing `html` scroll-padding.
7. The footnote (existing app key), `.ia-footnote--gap`.

**Search mode (`RatingCatalog`, unchanged behaviour):**
- 200 ms debounce, abort, LRU of 8, `?q=`, 40 results then «Показать остальные N», and the error card.
- Rows become `RatingSearchRow`.
- The results column `.ia-rt-results` gets `max-width: var(--ia-w-catalog)`.
- `RatingSearchHit` gains `rank`, `storeAvg` and `icon`.

**Search API** (`src/app/api/site/rating-search/route.ts`):
- The explicit field map gains `storeAvg`, `rank` and `icon` (compact path or null). Headers are unchanged.
- The order changes to:
  1. titles containing the whole folded query first (`titleContains` in `matches.ts`);
  2. then `realScore` descending, nulls last;
  3. then `compareNames`.

**Dark mode.** Folders use `--ia-soft` #28292f. Icons keep their ring. Cards are surface #1d1e22 on paper #111214. Chips use the existing chip tokens.

### 4.2 Niche `/<L>/rating/<niche>` (`[slug]/page.tsx`): the main surface

**Desktop (1280, column 680):**

```
‹ Назад                               Привычки (revealTitle)                  [🔍 when the field scrolled away]
H1  Лучшие приложения для трекинга привычек                                     (Heading, Georgia 30 → 40)
    Привычки · 93 приложения · 31 241 прочитанный отзыв                         (Georgia 19 secondary)
Где отметка занимает секунду и напоминание приходит вовремя, а где стрик давит.   (intro 17/26, data lang)
Самая высокая оценка по текстам отзывов — у Hevy (91 из 100), Way of Life (88) и Awesome Habits (84).
┌ Топ-5 по оценке отзывов ─────────────────────────────────────────────┐
│ 1  [ic40] Hevy                                    4,9★ · 76 767   91 ▬│   (in-page anchors #app-…)
│ 2  [ic40] Way of Life                                              88 ▬│
│ … 5 rows                                                              │
└──────────────────────────────────────────────────────────────────────┘
[ Найти в этой теме                                                  ]
(По отзывам)(По App Store)(Популярные)(По названию)
ⓘ Место — по оценке текстов отзывов (из 100). ★ — оценка в App Store. Об оценках
H2 Тройка лидеров
 [leader №1 card with stage]  [leader №2]  [leader №3]                        (stacked, gap 24)
┌ Для чего тебе приложение? ───────────────────────────────────────────┐
│ H3 Выстроить повседневную рутину без цикла стыда: отметить…          │
│    Что проверить: … (2 lines)                                         │
│    [ic][ic][ic][ic] Hevy, Way of Life и ещё 3                         │
│ ─────                                                                  │
│ … all tasks (4–5)                                                      │
└────────────────────────────────────────────────────────────────────────┘
H2 Места 4–93
 [row №4] [row №5] … [row №93]                                             (gap 20)
H2 Об оценках           (visible method section)
H2 Похожие темы         2×2 compact niche cards
RowCard Изучить весь разбор (launch niches)   RowCard Отзывы этой темы
footnote
```

**Mobile (375).** The same order.
- The first screen shows the toolbar, the H1 (3 lines), the subtitle, the intro and the top of the Top-5 card with icons.
- The first leader's stage starts at about 1,000 px.
- Rows are about 520 px tall; leaders about 900 px.
- The page is about 50k px tall (the old one was 109k).

**Blocks, in order:**
1. `<RatingImageGuard/>`, `preconnect`, JSON-LD (§6.4).
2. `DetailToolbar`:
   - `leading` = `BackButton` «Назад» with fallback `/rating`;
   - `title={niche.name}` with `revealTitle`;
   - `trailing={<RatingSearchShortcut label={t("Найти в этой теме")} />}`.
3. `Heading` (serif, not fixed):
   - Title: `format(s.nicheH1, { name: h1Name })`, where `h1Name = niche.seoName` for ru/en and `niche.name` for de/fr/ja.
   - Subtitle: `format(s.nicheSubtitle, { name: <span lang={nameLang}>{niche.name}</span>, apps: counted(count, s.appsWord), reviews: counted(totalReviews, s.reviewsReadWord) })`. Render it through a small `formatNodes` helper local to the page that splits on `{…}`.
4. `s.dataNote` footnote (de/fr/ja).
5. `p.ia-rt-intro` (17/26 ink, `--ia-lh-body-relaxed`, max 62ch):
   - `<span lang={dataLang}>{niche.intro}</span>`, when present;
   - then a space and the lead `format(s.nicheLead, { top })`. `top` is the first 3 apps as links to their app pages: the first is `format(s.topFirst, { app: short, score })`, the others `format(s.topNext, …)`, joined with `Intl.ListFormat(locale, { type: "conjunction" }).formatToParts`.
6. `section#rating-top.ia-card.ia-card--utility.ia-rt-top[aria-labelledby]`:
   - `h2.ia-subheading` (17/22 at 600) `format(s.topTitle, { count: 5 })`;
   - `ul.ia-rt-minis` of 5 `RatingMiniRow`, each with `href="#app-{slug}"`, rank, icon (eager), `short`, meta `storeMetaText` and score.
   - The card's own padding is `6px 18px 10px`, with the H2 padded 12 0 4.
7. `<I18nProvider locale strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingStrings[L] }}>` wrapping `<RatingNicheList …/>` (§4.2.1). It renders:
   - the controls;
   - **default view** (`sort === "review"` and the query is empty):
     - `h2#rating-leaders-title` `s.leadersTitle` and `ol#rating-leaders.ia-rt-list.ia-rt-list--leaders` (gap 24) with the 3 leader nodes;
     - the tasks node;
     - `h2#rating-apps-title` `format(s.restTitle, { from: 4, to: count })` and `ol#rating-apps.ia-rt-list[start=4][data-sort="review"]` (gap 16; 20 at ≥ 760) with row nodes for ranks ≥ 4;
   - **flat view** (anything else):
     - `h2#rating-apps-title` `t("Приложения")` with `.ia-section-head__count` (visible matches);
     - `p.ia-search-status[role=status]` `t("Найдено приложений: %1$@")` while a query is active;
     - `ol#rating-apps.ia-rt-list[data-sort]` with row nodes for every app, in the chosen order, non-matches `hidden`;
     - `EmptyCard` (`t("Нет подходящих результатов")`, `t("Попробуй другое название или очисти поиск.")`) when nothing matches.
8. **Tasks node** (passed into the list; shown in the default view only; omitted when the niche has no readable task): `section#rating-tasks.ia-card.ia-card--utility.ia-rt-tasks[aria-labelledby]` with `h2.ia-section-title.ia-section-title--bold` `t("Для чего тебе приложение?")` and `RatingTaskList variant="full"` of **all** readable tasks. No toggle.
9. `RatingMethod` (server, `section#rating-method.ia-rt-method[aria-labelledby]`), gap 16:
   - `h2.ia-section-title.ia-section-title--bold` `t("Об оценках")`;
   - `h3.ia-subheading` `t("Две оценки — два источника")` and `p.ia-search-status` `t("Они помогают сравнивать приложения, но не заменяют проверку своей задачи.")`;
   - two `Card className="ia-rt-method-card"` (the existing site.css class), with the existing h3 and p app keys;
   - `p.ia-search-status` `methodNote(…)` (existing function, moved from the page top);
   - `p.ia-search-status` with the honesty key «Разница между оценками не доказывает накрутку…»;
   - `RowCard` to `routes.reviewsMethodology(L)` with `InfoIcon`, `reviewsStrings.methodology` and `methodologyBody`.
10. `section#rating-related[aria-labelledby]`, only when `relatedNiches` returns 2 or more: `h2` `s.relatedTitle`, then `ul.ia-rt-related` (grid `repeat(auto-fill, minmax(260px, 1fr))`, gap 16) of 4 `RatingNicheCard variant="compact"`.
11. `RowCard` to the research topic (launch niches only), `RowCard` to the niche's reviews, and the footnote `t("Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.")`. All exist today.

**Data passed to the list:**

```tsx
const ranked = niche.apps;                                   // raw order = rank order (D3)
const rows = Object.fromEntries(ranked.map((a) => [a.slug,
  <RatingAppCard key={a.slug} app={a} href={routes.ratingApp(L, slug, a.slug)} locale={L} dataLang={textLang} variant="row" />]));
const leaders = ranked.slice(0, 3).map((a) =>
  <RatingAppCard key={a.slug} app={a} href={…} locale={L} dataLang={textLang} variant="leader" eager={a.rank === 1} />);
<RatingNicheList
  niche={slug}
  items={ranked.map((a) => ({ slug: a.slug, rank: a.rank, title: a.title, realScore: a.realScore, storeAvg: a.storeAvg, ratings: a.ratings }))}
  rows={rows} leaders={leaders} tasks={tasksNode} />
```

#### 4.2.1 `RatingNicheList` (client; replaces `RatingNicheBrowser.tsx`)

**Props:**
- `{ niche: string; items: NicheListItem[]; rows: Record<string, ReactNode>; leaders: ReactNode[]; tasks: ReactNode | null }`
- `NicheListItem = { slug; rank; title; realScore; storeAvg; ratings }`

No text is sent as a prop. The only text in the payload is inside the server-rendered nodes.

**State:**
- `query` and `sort` are read with `useSearchParams` on first render, as today. Sorts are `RATING_SORTS = ["review","store","ratings","name"]`.
- `hiddenSlugs: Set<string>`.

**Controls** (`div.ia-rt-controls`, flex column, gap 12):
- `SearchField id="rating-search"` with the placeholder `t("Найти в этой теме")` and clear `t("Очистить поиск")`.
- `ChipRow label={t("Сортировка")}` of 4 `Chip`s (`aria-pressed`) with labels `s.sortReview`, `s.sortStore`, `s.sortRatings` and `s.sortName`. Fixer amendment (2026-09-25): the row wraps (2 × 2 at 375) instead of scrolling; «По названию» was off-screen.
- `p.ia-rt-legend`: 13/18 secondary, `InfoIcon` 15, `s.legend`, then `<a href="#rating-method">{t("Об оценках")}</a>` in accent. Fixer amendment (2026-09-25): the links of the legend and of the intro are underlined at rest (1 px, 45 % of the link colour; full on hover): colour alone failed axe `link-in-text-block`.

**Order** (`order.ts`, [data]):
- `review`: rank ascending.
- `store`: `storeAvg` descending (nulls last), then rank.
- `ratings`: `ratings` descending, then rank.
- `name`: `compareNames`.
- Always sort a copy.

**Search in the topic:**
- A non-empty query switches to the flat view.
- After the flat list commits, a `useLayoutEffect` builds, once per slug, a haystack `foldSearch(li.textContent, locale)` from `li[data-slug]` inside `#rating-apps`, and caches it in a `useRef(Map)`.
- It then sets `hiddenSlugs` for rows that do not match every token (`matchesFolded`).
- "What you can read is what you can find": title, meta, verdict, praise, complaints and for-whom.
- On a deep link with `?q=`, the server renders the flat view unfiltered (the DOM is needed for folding), and the filter applies in the first layout effect after hydration. `?sort=` alone is correct in the server HTML.

**URL.** Keep the existing debounced `replaceUrl(routes.ratingNiche(L, niche, { q, sort }))`, the capture-phase flush before navigation, and `revealSearchField`.

**Anchors.** A document click listener (capture) on `a[href^="#app-"]`: when the target `li` is missing or `hidden`, clear the query and set the sort to `review`, then `scrollIntoView` after the commit.

**Top-5 and anchors.** The ids `app-{slug}` exist once per view: leaders in the default view, rows otherwise.

**Remove** `readTasksExpanded`, `writeTasksExpanded` and `subscribeNever` from `viewState.ts`.

#### 4.2.2 `RatingSearchShortcut` (client)

- `IconButton variant="circle"` (46 px, with `SearchIcon` 18) and `label` from props. Fixer amendment (2026-09-25): 44 px (`.ia-rt-search-shortcut`, the height of the «Назад» pill): 46 px grew the 60 px sticky toolbar to 62 px each time the shortcut appeared.
- An `IntersectionObserver` on `#rating-search` sets `hidden` while the field is visible or above the sticky bars.
- A click runs `scrollIntoView({ block: "start" })`, then `focus({ preventScroll: true })`.
- It is shown only on the niche page.

**Dark mode.** Tokens only. The stage and folders use `--ia-soft`. The meter is ink on soft. Leader edges come from the 0.7 stroke. The `.ia-rt-inset` is not used on this page.

### 4.3 App `/<L>/rating/<niche>/<app>` (`[slug]/[app]/page.tsx`)

**Desktop (680 column):**

```
‹ Назад                     Приложение
[icon 96]  Hevy - Workout Tracker Gym Log                 (Heading --fixed, Georgia 30)
           № 1 из 93 в теме «Привычки»                     (link to the niche; Georgia 19 secondary, underline on hover)
┌ 91 ▬▬▬▬▬▬▬ │ 4,9          │ 76 767                 │ 328                ┐   .ia-rt-facts (4 cells ≥ 560, 2×2 below)
└ из 100 · отзывы │ из 5 · магазин │ оценок в App Store │ отзывов прочитано ┘
[ Открыть в App Store ↗ ]  [ Сравнить с другим приложением ]    (ink + secondary; stacked full width < 760)
┃ Редакционный анализ сохранённых отзывов                          .ia-rt-inset (accent-soft, 3 px accent bar)
┃ Лучший журнал тренировок в нише… (Georgia 19/27.6)
H2 Скриншоты  10          [s][s][s][s]→  (360 tall, arrows on hover devices; tap → viewer)
H2 Для каких задач используют   whoFor 17/27
┌ (👍) Что хвалят в отзывах ─────┐ ┌ (👎) На что жалуются в отзывах ┐  .ia-rt-pair (2 columns ≥ 600 container)
│ • sentence                     │ │ • sentence                     │
└────────────────────────────────┘ └────────────────────────────────┘
H2 Опыт пользователей    count line + every QuoteBlock (≤ 8)                     (only when quotes exist)
H2 Упоминается в задачах  RatingTaskList compact                                 (only when any)
H2 Другие приложения в теме   mini rows ×≤5  + RowCard «Весь рейтинг: Привычки»
H2 В других рейтингах   mini rows (niche name · «№ 7 из 91 · 79 из 100»)          (only for multi-niche apps)
RowCard Что можно улучшить в этой нише (launch)   RowCard Все отзывы о приложении (hasReviews)
footnote «Это материал из архива inApp…»
```

**Mobile.**
- Hero icon 72 in a row with the H1 (gap 14).
- Facts 2×2.
- Buttons full width and stacked (gap 12).
- Gallery 300 tall, bleeding to the gutters.
- The pair stacks.

**Blocks:**
1. `<RatingImageGuard/>`, `preconnect`, JSON-LD (§6.4). The client parts are wrapped in `<I18nProvider locale strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingStrings[L] }}>`.
2. `DetailToolbar`: Back with fallback to the niche, and `title={t("Приложение")}`.
3. `.ia-rt-hero`:
   - flex row, gap 16 (20 at ≥ 760), `align-items:center`;
   - `AppIcon` 72 (96 at ≥ 760; render 96 and size it with CSS `width/height: 72px` below 760), `eager`, `alt={format(s.iconAlt, { app: short })}`;
   - `Heading className="ia-heading--fixed"`: title = the store title; subtitle = `<Link className="ia-rt-hero__niche" href={nicheHref}>` with `format(s.heroRank, { rank, count, niche: niche.name })`.
4. `s.dataNote` (de/fr/ja).
5. `ul.ia-rt-facts`:
   - Surface, radius 20, hairline `inset 0 0 0 var(--ia-hairline) var(--ia-line-card)`, `overflow:hidden`.
   - Grid `repeat(4,1fr)` at ≥ 560, `repeat(2,1fr)` below. The dividers come from `gap:1px` over `background: var(--ia-line-card)`, with cells on surface.
   - Each cell: padding 16/18; value 22/28 at 700, tabular ink; label 12/16 secondary.
   - Cells:
     1. `ScoreMeter md` without unit, plus label `t("из 100 · отзывы")`;
     2. `storeScoreValue` and `t("из 5 · магазин")`;
     3. the ratings number and `countWord(L, ratings, s.ratingsLabelWord)`;
     4. `reviewsRead` and `countWord(L, reviewsRead, s.reviewsReadLabelWord)`, omitted when null (then 3 cells, `repeat(3,1fr)`).
   - The old W4 line goes.
6. `div.ia-rt-actions`:
   - `Button variant="ink"` «Открыть в App Store» (existing: external, `_blank`, `s.newTab` sr text; only when the id is numeric);
   - `Button variant="secondary" href={routes.ratingCompare(L, slug, app.slug)}` `s.compareButton`.
7. `section.ia-rt-inset` for the verdict (omitted when null):
   - `p.ia-footnote` `t("Редакционный анализ сохранённых отзывов")`;
   - `p.ia-rt-inset__text` Georgia `--ia-fs-body-serif` 19/27.6 ink, `lang={dataLang}`.
   - `.ia-rt-inset` is a copy of `.ia-idea__inset` (`ideas.css:245-272`; ideas.css is not loaded here): accent-soft, radius 12, padding 20 20 20 24, a 3 px accent bar in `::before` inset 20/20, flex column, gap 10.
8. `section#screenshots[aria-labelledby]`, when there are shots:
   - `.ia-section-head` with `h2` `s.shotsTitle` and the count;
   - `RatingGallery paths={app.shots} app={short}`. The first 2 shots are `loading="eager"`; no `fetchpriority`.
9. `section[aria-labelledby]`: `h2.ia-section-title.ia-section-title--bold` `t("Для каких задач используют")`, then `p.ia-rt-prose` (17/27) with whoFor. No card.
10. `div.ia-rt-pair` (container `rt-pair`; 2 columns at ≥ 600, gap 16) of two `Card as="section"`:
    - head: a 32 px `--ia-soft` circle with `PraiseIcon` / `ComplaintIcon` 18 in ink, and `h2.ia-subheading` `t("Что хвалят в отзывах")` / `t("На что жалуются в отзывах")`;
    - body: `points(text, dataLang)` (§8.4). One point renders as `p.ia-rt-prose`; more render as `ul.ia-rt-bullets` (17/26 ink, 5 px secondary dot markers, 10 px apart).
    - A card is omitted when its text is null.
11. `section.ia-rt-proof`, only when `quotes.length > 0` (1,812 apps):
    - `h2` `t("Опыт пользователей")`;
    - the W2 count line (existing);
    - **every** quote as a server-rendered `QuoteBlock` with `lang`. There are at most 8 per app, and there is no "show more".
    - The empty-state sentence is deleted: the section disappears when there are no quotes.
12. `section` `s.appTasksTitle`, only when `appTasks` is not empty: a `Card` holding `RatingTaskList variant="compact"`.
13. `section` `s.alternativesTitle`:
    - a card of `RatingMiniRow` for `nicheNeighbours(niche, app)`: the top 3 plus rank − 1 and rank + 1, minus this app, deduplicated, in rank order, at most 5. Each row has its icon, `short` and meta `storeMetaText`, and links to the app page.
    - Integrator amendment (2026-09-25): where that set has fewer than 5 apps (ranks 1–4 and the last app), it is filled with the next-nearest ranks (rank + 2, rank − 2, rank + 3, …), so every app page shows 5 alternatives as D8 promises (Hevy, № 1, gets № 2–6).
    - Then `RowCard href={nicheHref}` with glyph `RatingIcon`, title `format(s.wholeNicheTitle, { name: niche.name })` and subtitle `format(s.wholeNicheBody, { apps: counted(count, s.appsWord) })`.
14. `section` `s.otherNichesTitle`, only when `ratingAppNiches(L, app.id)` has other niches (342 apps): a card of `RatingMiniRow` with no icon or rank. The title is the niche name (with `lang`); the meta is `format(s.otherNicheLine, { rank, count, score })`; the row links to that niche's app page.
15. The research RowCard (launch niches), the reviews RowCard (`hasReviews`), and the archive footnote (all existing).

**Removed:** `getViewer`, `canRead`, `RatingLockCard`, the `research.css` import, the `.ia-rt-metrics` markup, the quotes empty sentence, and the header comment «No store artwork (rights)».

**Dark mode.** The inset becomes #262d45 with a #94aaff bar. The facts dividers use `--ia-line-card`. The viewer stays black.

### 4.4 Task `/<L>/rating/<niche>/tasks/<n>` (`tasks/[n]/page.tsx`)

1. `<RatingImageGuard/>`, `preconnect`, JSON-LD (§6.4). `DetailToolbar` with Back to the niche and `t("Выбор по задаче")`.
2. `Heading className="ia-heading--fixed"`: title = the job (data `lang`); subtitle = a `Link` to the niche with `niche.name`.
3. `s.dataNote`, then `p.ia-search-status` with the audience name (as today).
4. `section.ia-rt-inset`, only when there is a gap: `h2.ia-rt-inset__title` (Georgia 22/27) `t("Что проверить перед выбором")`, then `p.ia-rt-prose` with the gap. **Public.**
5. `h2#rating-task-apps-title` `t("Какими приложениями пользуются")` and `p.ia-search-status` with the existing honesty key «Эти приложения упомянуты… Порядок списка не означает рейтинг пригодности.».
6. `ol#rating-task-apps.ia-rt-list` of `RatingAppCard variant="row"` in `appIds` order. Rows show the niche rank and the score. When empty, the existing `EmptyCard`.
7. The «также упомянуты» footnote (existing logic, now unconditional).
8. `section` `s.otherTasksTitle`: a card holding `RatingTaskList variant="compact" exclude={n}`.
9. `RowCard` to the niche: `RatingIcon`, `format(s.wholeNicheTitle, …)` and `wholeNicheBody`. Then the research RowCard (existing «Откуда взят этот разбор»).

**Removed:** `getViewer`, `canRead`, the lock branch, and the `research.css` import. Metadata is in §6.1.

Fixer amendment (2026-09-25): the tasks of the 36 non-launch niches exist in Russian only, but the footer language list links the same path in every locale. Their en/de/fr/ja URLs now `redirect()` (307, temporary: English tasks may come later) to that locale's niche page instead of a 404.

### 4.5 Compare (new; `noindex, follow`; not in sitemaps)

**Routes.** Add to `src/site/routing.ts`: `ratingCompare: (l, niche, app, other?) => href(l, "rating", niche, app, "vs", …(other ? [other] : []))`. The proxy already routes every `/rating/**` depth to the new site.

**Picker** `src/app/(site)/site/[lang]/rating/[slug]/[app]/vs/page.tsx`:
- `DetailToolbar`: Back to the app, and `t("Сравнение")`.
- `Heading --fixed`: `t("С чем сравним?")`, subtitle `t("Выбери второе приложение для сравнения с %1$@.", [short])`.
- `<RatingListFilter placeholder={t("Название приложения")} target="rating-compare-list" />` (client; wrapped in the provider).
- `ul#rating-compare-list.ia-rt-minis` inside a card: every other app of the niche, in rank order, as `RatingMiniRow` with rank, icon, `short` and score, linking to `routes.ratingCompare(L, slug, app.slug, other.slug)`.
- Empty filter result: `EmptyCard` with `t("Пока нет подходящих результатов. Попробуй другое название.")`.

**`RatingListFilter`** (client): a `SearchField`. It folds `li.textContent` of `#{target} > li` once and toggles `hidden`. No URL state.

**Compare page** `…/vs/[other]/page.tsx`:
- `notFound()` when `other === app` or either app is missing.
- `DetailToolbar`: Back to the picker, and `t("Два приложения")`.
- `Heading --fixed`: title `t("%1$@\nи %2$@", [shortA, shortB])` with `white-space: pre-line` (`.ia-rt-compare__title`); subtitle `t("Редакционный анализ сохранённых отзывов: задачи, положительный опыт и жалобы пользователей.")`.
- `div.ia-rt-compare__head`: a `Card` with 2 columns and a vertical hairline between them. Each column has `AppIcon` 56, the short title linking to the app page (17/22 at 600), `ScoreMeter md`, and `storeMetaText`.
- Paired `Card`s. Each shows the two apps' texts separated by a divider:
  - «Скриншоты» (`s.shotsTitle`): each app gets its name (15/20 at 600) and `RatingShots` (3 shots);
  - «Для каких задач» (`t("Для каких задач")`), with whoFor;
  - «Что хвалят в отзывах», with loved;
  - «На что жалуются в отзывах», with weak.
  - Layout: at ≥ 680 (container) the apps sit side by side (`grid-template-columns: 1fr 1px 1fr`, gap 16, the middle column is a hairline). Below 680 they stack with a divider.
  - Each block shows the app name (15/600) above the text (17/27).
  - A missing text shows `t("В подборке пока нет описания по этому пункту.")`.
- `h2` `t("Посмотреть основания")`, then 2 RowCards to both app pages (`AppWindowIcon` glyph).
- Metadata:
  - picker: `title = format(s.pickerMetaTitle, { app: short })`;
  - compare: `title = format(s.compareMetaTitle, { a, b })`;
  - both: `robots: { index: false, follow: true }`, `alternates: dataAlternates(L, path)`, and JSON-LD BreadcrumbList only.

---

## 5. Access: every gate removed (D2)

| # | File:line (today) | Change |
|---|---|---|
| G1 | `src/app/(site)/site/[lang]/rating/[slug]/[app]/page.tsx:4, 96` | Drop the `getViewer` import and call (`const t = await getT(locale)`). |
| G2 | same file, `:104-105`, `:197-217`, imports `:6`, `:8`, `:12` | Remove `canRead`, the `RatingLockCard` branch, the `QuotesProof` import and `research.css`. Quotes are server-rendered `QuoteBlock`s (§4.3.11). Rewrite the header comment `:24-30`. |
| G3 | `…/rating/[slug]/tasks/[n]/page.tsx:4, 66, 73-80, 118-160`, import `:6`, `:10` | Remove `getViewer`, `canRead`, the lock branch and `research.css`. Render the gap, apps and «также упомянуты» unconditionally. Rewrite the comment `:20-26`. |
| G4 | same file `:35-37` | Description = `clampDescription(scenario.gap ?? scenario.job, L)`. |
| G5 | same file `:45` | Robots follow §6.1 (`isIndexableTask`). |
| G6 | `src/site/features/rating/RatingLockCard.tsx` | Delete. Its app keys stay (research uses them). The analytics sources `rating_app_locked` / `rating_scenario_locked` disappear with it (no allowlist references them). |
| G7 | `src/site/features/rating/QuotesProof.tsx` | Delete (quotes are rendered on the server, all visible). |
| G8 | `…/rating/[slug]/page.tsx:162-163` | The page passes the full task data (§4.2.8) instead of `{n, job}`. |
| G9 | "GATED (R11)" contracts: `src/site/sitedata/rating.ts:21-23, 47, 74, 88-93, 151, 346, 430, 431`; `src/site/content/rating.ts:10-11`; `src/site/content/rating-types.ts:23, 46, 58-63`; `src/site/features/rating/RatingCatalog.tsx:30`; `src/app/api/site/rating-search/route.ts:9-10`; `content/v2/README.md:71-80` | Rewrite each as "PUBLIC: the whole rating is free (owner, 2026-09-25, spec 11 D2)" so nobody re-adds a gate. |
| — | `src/site/access.ts:75` `canReadResearch` | No change: research and ideas use it. |

---

## 6. SEO

### 6.1 Titles, descriptions, headings, robots

The layout appends « — inApp» (ja «｜inApp»). The width budget is `displayWidth(title) + 8`.

| Page | `<title>` | Description | H1 | Robots |
|---|---|---|---|---|
| Catalogue | `format(s.metaTitle, { topics: counted(71, s.topicsInWord) })`, e.g. «Рейтинг приложений по отзывам: лучшие в 71 теме» | `s.metaDescription` | `s.catalogTitle` | `TOPIC_ROBOTS` (new) |
| Niche | `nicheTitle(L, niche)`: the first of `[s.nicheMetaTitle, s.nicheMetaTitleShort, s.nicheH1]` (each formatted with `{ name: h1Name, count }`) whose width + 8 ≤ **70**; else the last. With the new seoNames: ru 44 full / 27 short / 0 bare; en 70 / 1 / 0. | `clampDescription(format(s.nicheMetaDescription, { apps, count, name: h1Name, reviews: counted(totalReviews, s.reviewsByWord), top: shorts of №1–3 joined by ListFormat }))` | `format(s.nicheH1, { name: h1Name })` | `TOPIC_ROBOTS` (unchanged) |
| App | `format(s.appMetaTitle, { app: short })`. When the app is in 2 or more usable niches (342 apps): `format(s.appMetaTitleNiche, { app: short, niche: niche.name })`. | When a verdict exists and `firstSentence(verdict) + " " + facts` fits `clampDescription` without cutting, use it. Otherwise use the existing `metaDescription(format(s.appMetaDescription, …), verdict)`. `facts = format(s.appMetaFacts, { score, star })`. | The store title, verbatim | `TOPIC_ROBOTS` (new) |
| Task | `taskTitle(L, niche, scenario)`: `format(s.taskMetaTitle, { audience: scenario.name, name: h1Name })`, passed through `clampTitle` when too wide. With no audience name: `clampTitle(job)`. | `clampDescription(gap ?? job)` | The job | `isIndexableTask` → `TOPIC_ROBOTS`, else `{ index:false, follow:true }` |
| Compare | picker `s.pickerMetaTitle`; compare `s.compareMetaTitle` | `clampDescription` of the compare subtitle key | as in §4.5 | `{ index:false, follow:true }` |

Fixer amendment (2026-09-25) to the table:
- **App title.** The niche goes last, «Hevy: отзывы, плюсы и минусы (Привычки)», so a cut in the results drops the niche and not the query words; `appMetaTitleNicheShort` («{app}: отзывы ({niche})») is used when the long form is over the 65 budget, and a trailing parenthetical of the niche name is dropped (no nested brackets). Over 65: ru 423 → 142, en 377 → 123 (long app names themselves); titles stay unique.
- **App description.** The verdict opening (its first sentence, plus the next while shorter than 40 characters) + facts when that fits uncut; otherwise `clampDescription(facts + " " + verdict)`. The template naming the app is used only without a verdict (ru 22, en 32; before, 2,868 / 2,437 pages used it, because the old fallback added the verdict only when a whole sentence fit).
- **Task title.** A de/fr/ja page whose own template does not fit takes the English title of its canonical when that fits, instead of a half-English title cut mid-phrase.
- **Task alternates** (`seo.ts taskAlternates`): indexability is per language, so ru and en are paired only when both copies are indexable (x-default = en when en is); a page whose canonical is noindex declares its canonical only. The page and its sitemap `<url>` use the same helper (51 en tasks named a noindex ru page before).

**`isIndexableTask(L, niche, view)`** is true when all of these hold:
- `scenario.gap` exists;
- `view.apps.length >= 3`;
- `scenario.name` exists;
- `displayWidth(format(s.taskMetaTitle, …)) + 8 <= 65` (the title needs no clamping).

Measured: ru 31 of 312 tasks, en 68 of 157. The en task pages exist only for the 35 launch niches (`dataAlternates(..., { en: isLaunchCategory(slug) })`, unchanged).

**Where the helpers live.** `nicheTitle`, `taskTitle`, `isIndexableTask`, `h1Name` and `dataCanonical` are all in `features/rating/seo.ts`. `NICHE_TITLE_BUDGET = 70`; the task and app budget stays 65.

**H2/H3 outline:**
- Catalogue: H1; H2 per group; H3 per niche.
- Niche: H1; H2 «Топ-5…», «Тройка лидеров» (H3 for each leader app), «Для чего тебе приложение?» (H3 for each task job), «Места 4–N» (H3 for each app), «Об оценках» (H3 for the method cards), «Похожие темы» (H3 for each niche).
- App: H1; H2 for each section.
- Task: H1; H2 «Что проверить…», «Какими приложениями…» (H3 for each app), «Другие задачи…».

**de/fr/ja pages** keep `dataAlternates` (their canonical is en). Their `<title>` and H1 use `niche.name`.

### 6.2 SEO head terms (the `seoName` of both data locales; `scripts/v2/data/rating-seo.json`)

The ru value completes «Лучшие приложения для …» (genitive of a purpose). The en value completes "Best … apps" (never derived with `toLowerCase`, never ending in "app"/"apps").

This fixes:
- 17 English titles with "apps apps";
- the lowercase "ai" and "qr";
- the ungrammatical «для ИИ-решатель…»;
- «для мессенджеров» and «для фоторедакторов», which read as "apps for messengers" and "apps for photo editors".

| niche | ru `seoName` | en `seoName` |
|---|---|---|
| ai-avatars-headshots | создания аватаров с ИИ | AI headshot and avatar |
| ai-chatbot | общения с ИИ-ассистентом | AI assistant |
| ai-companion-roleplay | общения с ИИ-компаньоном | AI companion |
| ai-homework-solver | решения домашних заданий по фото | AI homework helper |
| ai-image-generation | генерации изображений с ИИ | AI image generator |
| ai-photo-restore | восстановления старых фото | photo restoration |
| ai-species-identifier | определения растений и животных | plant and animal identifier |
| ai-writing | написания текстов с ИИ | AI writing |
| astronomy-stargazing | наблюдения за звёздами | stargazing |
| baby-tracking | ухода за малышом | baby tracker |
| blood-pressure-log | контроля давления | blood pressure |
| calendars-tasks | планирования дел и календаря | calendar and to-do list |
| car-maintenance | обслуживания автомобиля | car maintenance |
| cosmetics-ingredient-checker | проверки состава косметики | cosmetic ingredient checker |
| couples-relationship | пар | couples |
| crypto-investing | криптовалют | crypto |
| cycling | велоспорта | cycling |
| dating-apps | знакомств | dating |
| driving-test-prep | подготовки к экзамену на права | driving test |
| faith-prayer-bible | чтения Библии и молитв | Bible and prayer |
| fishing | рыбалки | fishing |
| flashcards | заучивания с карточками | flashcard |
| focus-productivity | концентрации и фокуса | focus timer |
| food-delivery | доставки еды | food delivery |
| guitar-tuner-learn | настройки гитары и обучения | guitar tuner and lesson |
| habit-tracking | трекинга привычек | habit tracker |
| hiking-trails | походов и пеших маршрутов | hiking |
| interior-design | дизайна интерьера | interior design |
| intermittent-fasting | интервального голодания | intermittent fasting |
| invoice-maker | выставления счетов | invoice |
| journaling-mood | ведения дневника и настроения | journal and mood tracker |
| language-learning | изучения языков | language learning |
| meal-prep-grocery | планирования меню и покупок | meal planner and grocery list |
| meditation-mindfulness | медитации | meditation |
| messaging-apps | переписки и звонков | messaging |
| mind-mapping | карт мыслей | mind mapping |
| music-streaming | прослушивания музыки | music streaming |
| notes-pkm | заметок | note-taking |
| nutrition-calories | подсчёта калорий | calorie counter |
| password-manager | хранения паролей | password manager |
| period-cycle | отслеживания цикла | period tracker |
| personal-finance | учёта финансов | budget |
| pet-care | ухода за питомцами | pet care |
| photo-editing | редактирования фото | photo editing |
| plant-care | ухода за растениями | plant care |
| pregnancy-tracker | ведения беременности | pregnancy |
| qr-scanner | сканирования QR-кодов | QR code scanner |
| recipes-meal-planning | рецептов и планирования меню | recipe |
| resume-builder | создания резюме | resume builder |
| ride-hailing | заказа такси | ride-hailing |
| run-tracking | бега | running |
| scanner-pdf | сканирования документов | document scanner |
| shopping-ecommerce | онлайн-покупок | shopping |
| sleep-tracking | отслеживания сна | sleep tracker |
| sobriety | отказа от вредных привычек | sobriety |
| step-counter | подсчёта шагов | step counter |
| stock-investing | инвестиций в акции | stock investing |
| tarot-reading | гадания на таро | tarot |
| teleprompter-captions | телесуфлёра и субтитров | teleprompter |
| translator | перевода | translator |
| travel-planning | планирования путешествий | travel planning |
| video-streaming | просмотра видео | video streaming |
| voice-recorder | записи и расшифровки речи | voice recorder |
| wallpapers-widgets | обоев и виджетов | wallpaper and widget |
| wardrobe-outfit | гардероба и образов | wardrobe and outfit |
| water-hydration | учёта выпитой воды | water tracker |
| weather-apps | прогноза погоды | weather |
| weight-tracker | контроля веса | weight tracker |
| white-noise-sleep-sounds | белого шума и звуков для сна | white noise |
| workout-fitness | тренировок и фитнеса | workout |
| yoga | йоги | yoga |

These are final for the release. The owner may later tune the ru wording against Yandex Wordstat; that is an edit of the JSON file plus a re-import.

### 6.3 Per-niche intro (`intro` in `rating-seo.json`, ru and en; 71 niches)

**Source.** Derive each intro from the old catalogue blurbs `NICHES_RAW[].blurb` / `.blurbEn` in `src/app/(old)/rating/page.tsx:62-133`. That file has 40 trust-wording hits, so the blurbs are never used verbatim. The steps:
1. Strip the `^\d+ (приложени[еяй]|apps?): ` prefix.
2. Remove every trust clause: ru «(,| и| плюс) накрутка…», «(… накручены)», «(x из y)»; en " and reviews are juiced…", ", plus juiced reviews (…)", "(x of y are fake)".
3. Fix the dangling list so the sentence still reads naturally. Use a comma list plus «и» where needed.
4. Capitalize the first letter and end with a period.
5. Keep 60–180 characters.

Examples:
- yoga: «Где практика ведёт в человеческом темпе и встречает новичка, а где инструктор тараторит и база поз скудная.» / "Where the practice guides at a human pace and welcomes a beginner, and where the instructor rushes and the pose library is thin."
- ai-homework-solver: «Где фото распознаётся, ответ верный и с разбором по шагам, а где ошибка в примере и голый ответ.» / "Where the photo reads and the answer is correct and shown step by step, and where the solution is wrong and the answer is bare."

**Checks.** The importer applies `tg()` (ru typography) and `neutralizeTrustLanguage`. The importer and check-content both reject `/накрут|накручен|скам|фейк|juic|fake|scam|inflat/i`. The owner reviews the 142 lines once after the release; wording edits need no code.

### 6.4 JSON-LD (guideline-compliant)

**Catalogue.** Unchanged shape: CollectionPage with a `mainEntity` ItemList of 71 `ListItem { position, name, url }` in the grouped display order, plus BreadcrumbList.

**Niche** (`schema.ts: nicheJsonLd`):

```json
{"@context":"https://schema.org","@graph":[
 {"@type":"ItemList","@id":"{canonical}#list","name":"{H1 text}","numberOfItems":93,
  "itemListOrder":"https://schema.org/ItemListOrderDescending",
  "itemListElement":[{"@type":"ListItem","position":1,"name":"Hevy - Workout Tracker Gym Log",
    "url":"https://inapp.pro/ru/rating/habit-tracking/hevy-workout-tracker-gym-log"}]},
 {"@type":"BreadcrumbList", "…": "inApp › Рейтинги › {niche.name}"}]}
```

- `position` = rank.
- **No nested `SoftwareApplication`.** Without `offers` they are invalid "Software App" items, and apps get no carousel.
- No rating or review markup on lists.

**App** (`schema.ts: appJsonLd`): a BreadcrumbList (unchanged) plus

```json
{"@type":"MobileApplication","@id":"{canonical}#app","name":"{store title}","url":"{canonical}",
 "operatingSystem":"iOS","image":"{iconLd(icon)}","screenshot":["{shotLd(shot1)}","… up to 5"],
 "installUrl":"https://apps.apple.com/app/id{id}","sameAs":"https://apps.apple.com/app/id{id}",
 "review":{"@type":"Review","author":ORGANIZATION,"publisher":{"@id":"https://inapp.pro/#org"},
   "reviewBody":"{verdict}","inLanguage":"{dataLang}",
   "reviewRating":{"@type":"Rating","ratingValue":91,"bestRating":100,"worstRating":0}}}
```

- `ORGANIZATION` is the existing constant in `src/site/features/research/seo.ts:111`, `@id` `https://inapp.pro/#org`, which is also defined by the site layout.
- **Removed:** `aggregateRating`. It is App Store data, and Google says "Don't aggregate reviews or ratings from other websites."
- **Also removed:** the constant `applicationCategory: "MobileApplication"`, which is not a category. A per-niche category would give one app different categories on different URLs.
- `review` is omitted when `verdict` or `realScore` is null.
- `image` and `screenshot` are omitted when there is no icon or no shots.
- There is no `offers` (no price data) and no `datePublished` (no collection date). The item is valid structured data but not eligible for a Software App rich result; that is accepted.
- Fixer amendment (2026-09-25): correction of the line above. Google lists `offers.price` as required for Software App items, so Search Console's "Software apps" report will count these nodes (about 8.7k URLs) as invalid items. That costs no ranking and is the accepted trade-off. Do not invent `price: 0`; add `offers` when the iTunes Lookup price data lands (§11).

**Task.** BreadcrumbList plus `ItemList` of `ListItem { position, name, url }` for the rated apps.

**Compare.** BreadcrumbList only.

**de/fr/ja pages.** Every JSON-LD `url`, `@id` and breadcrumb `item` uses `dataCanonical(L, path)`, the canonical `/en/…` URL. Names stay in the page locale.

### 6.5 Sitemaps, robots, IndexNow, llms

**`src/app/sitemap.ts`:**
- Remove `{ p: "/rating", … }` and the `PEOPLES_RATING_SLUGS` line from `paths`.
- Add `ratingHubEntries()` from `src/site/sitedata/rating-sitemap.ts`. It gives each of ru **and** en its own `<url>` for `/rating` (priority 0.95) and `/rating/<niche>` ×71 (priority 0.9).
- Alternates: `{ ru, en, "x-default": en }`.
- `lastModified`: the niche's `updatedAt`; the hub uses the index `generatedAt`.
- de/fr/ja stay out (their canonical is en).

**New routes** `src/app/sitemap-rating-ru.xml/route.ts` and `src/app/sitemap-rating-en.xml/route.ts`:
- Dotted folders like `feed.xml`, so the locale proxy skips them. `export const dynamic = "force-static"`. `Content-Type: application/xml`.
- Content: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`.
- Entries:
  - every app page of that language: 4,343 each, priority 0.6;
  - every indexable task page: ru 31, en 68, priority 0.5.
- Per entry:
  - `<loc>` (`encodeURI`, then XML-escaped; two slugs contain Cyrillic look-alike letters);
  - `<lastmod>` = the niche's `updatedAt`;
  - `xhtml:link` alternates exactly as the page's own `dataAlternates` gives (ru/en/x-default; ru only for non-launch task pages);
  - `<image:image><image:loc>` for `iconLd(icon)` and `shotLd` of the first 3 shots.
- Size: about 3.5 MB per file, well under 50k URLs / 50 MB.

**`src/app/robots.ts`.** `sitemap` becomes an array: `https://inapp.pro/sitemap.xml`, `https://inapp.pro/sitemap-rating-ru.xml`, `https://inapp.pro/sitemap-rating-en.xml`.

**`src/app/api/indexnow/route.ts`:**
- Replace the `PEOPLES_RATING_SLUGS` line with `ratingIndexNowUrls()`: ru and en hub, niches, app pages and indexable tasks.
- Post in batches of at most 10,000 URLs (the API limit).
- Response: `{ pinged, batches, statuses }`.
- Fixer amendment (2026-09-25): IndexNow asks for added and changed URLs only. `ratingIndexNowUrls({ since })` keeps the pages whose `lastmod` ≥ `since`. By default `since` is the data locale's `generatedAt` (the niches the latest import changed, plus the hubs) for 14 days after that import; later deploys send no rating URLs. `GET /api/indexnow?since=YYYY-MM-DD` or `?since=all` overrides it.

**`src/lib/llms.ts` `buildLlmsIndex()`.** Additive: a section `## App ratings (reviews-based)` with `/en/rating` and one line per niche: `- [Best habit tracker apps](https://inapp.pro/en/rating/habit-tracking): 93 apps; top: Hevy (91/100)`. Nothing else in the file changes.

**Old copies** `src/app/(old)/rating/page.tsx`, `[slug]/page.tsx` and `[slug]/[app]/page.tsx`: `generateMetadata` sets `robots: { index: false, follow: true }` and **removes `alternates`**.
- Today these pages send `x-robots-tag: noindex` together with meta `index, follow` and a canonical to the live URL. Combining noindex with that canonical risks carrying the noindex to the live page.
- The old JSON-LD and body stay.
- This is a documented exception to ARCHITECTURE §5.2 (§9).

### 6.6 Internal links and alt text

**Links:**
- **Catalogue →** 71 niches.
- **Niche →**
  - every app (title links);
  - the top 3 in the lead;
  - every task;
  - 4 related niches (ranked by shared app ids, ties broken by `totalReviews`; filled from the same group, alphabetically);
  - the research topic (launch niches);
  - the niche's reviews;
  - the methodology.
- **App →**
  - the niche (hero link and RowCard);
  - 5 alternatives (a neighbour chain, so all 4,343 pages are crawlable);
  - the same app in other niches;
  - its tasks;
  - compare;
  - its reviews;
  - research;
  - App Store.
- **Task →** its apps, sibling tasks, the niche and research.
- Research and ideas pages still never link the rating (owner rule).

**Alt text:**

| Image | alt |
|---|---|
| Icons in rows, leaders, mini rows, folders, stacks, search rows | `""` (the name sits beside them) |
| App hero icon | `format(s.iconAlt, { app: short })`, e.g. «Иконка Hevy» |
| Every screenshot | `format(s.shotAlt, { app: short, n, count })`, e.g. «Hevy: скриншот 1 из 10» |

### 6.7 Text volume

`/ru/rating/habit-tracking` renders every app's title, meta, verdict, praise, complaints and for-whom, plus the intro, tasks with gaps and the method. That is about 9,900 words of data (measured), against 2,457 today and 11,622 on the old page. Acceptance: **at least 9,000 words** in `document.querySelector("main").innerText`.

---

## 7. Strings

### 7.1 Web strings (`src/site/features/rating/strings.ts`)

**Conventions:**
- Voice: ты / du / tu; ja です・ます.
- Word forms are `one|few|many|other`, used with `counted` / `countWord`.
- **fr:** the fr strings below already contain U+00A0 (no-break space) before `: ; ! ? »` and after `«`. Copy them verbatim or write ` `. `lint-web-strings.mjs` checks this.
- Keys marked "(changed)" replace today's values. Every other key in the current table stays unless it is listed as deleted.

| key | ru | en | de | fr | ja |
|---|---|---|---|---|---|
| metaTitle (changed) | Рейтинг приложений по отзывам: лучшие в {topics} | App ratings from real reviews: the best apps in {topics} | App-Bewertungen aus echten Rezensionen: die besten Apps in {topics} | Classement des apps d’après de vrais avis : les meilleures dans {topics} | 実際のレビューにもとづくアプリ評価：{topics}のおすすめ |
| metaDescription (changed) | До 100 приложений в каждой теме: оценка по текстам отзывов, оценка в App Store, скриншоты, что хвалят и на что жалуются. Бесплатно и без регистрации. | Up to 100 apps per topic: a score from review text, the App Store rating, screenshots, what people praise and what they complain about. Free, no sign-up. | Bis zu 100 Apps pro Thema: Wert aus den Rezensionstexten, App-Store-Bewertung, Screenshots, Lob und Kritik. Kostenlos, ohne Anmeldung. | Jusqu’à 100 apps par thème : note tirée du texte des avis, note de l’App Store, captures d’écran, points forts et reproches. Gratuit, sans inscription. | 各テーマ最大100アプリ。レビュー本文のスコア、App Storeの評価、スクリーンショット、評価点と不満点。無料・登録不要。 |
| topicsInWord | теме\|темах\|темах\|темах | topic\|topics\|topics\|topics | Thema\|Themen\|Themen\|Themen | thème\|thèmes\|thèmes\|thèmes | テーマ |
| catalogTitle | Рейтинг приложений по отзывам | App ratings from real reviews | App-Bewertungen aus echten Rezensionen | Classement des apps d’après de vrais avis | 実際のレビューにもとづくアプリ評価 |
| catalogLead | {apps} в {topics}: оценка по текстам отзывов, скриншоты, что хвалят и на что жалуются. | {apps} in {topics}: a score from review text, screenshots, what people praise and what they complain about. | {apps} in {topics}: ein Wert aus den Rezensionstexten, Screenshots, was gelobt und was bemängelt wird. | {apps} dans {topics} : une note tirée du texte des avis, des captures d’écran, ce qui est salué et ce qui est reproché. | {topics}の{apps}。レビュー本文にもとづくスコア、スクリーンショット、評価されている点と不満点をまとめています。 |
| groupsLabel | Разделы | Sections | Bereiche | Rubriques | カテゴリー |
| reviewsWord | отзыв\|отзыва\|отзывов\|отзыва | review\|reviews\|reviews\|reviews | Rezension\|Rezensionen\|Rezensionen\|Rezensionen | avis\|avis\|avis\|avis | 件のレビュー |
| reviewsByWord | отзыву\|отзывам\|отзывам\|отзыва | review\|reviews\|reviews\|reviews | Rezension\|Rezensionen\|Rezensionen\|Rezensionen | avis\|avis\|avis\|avis | 件のレビュー |
| reviewsReadWord | прочитанный отзыв\|прочитанных отзыва\|прочитанных отзывов\|прочитанного отзыва | review read\|reviews read\|reviews read\|reviews read | gelesene Rezension\|gelesene Rezensionen\|gelesene Rezensionen\|gelesene Rezensionen | avis lu\|avis lus\|avis lus\|avis lus | 件のレビューを分析 |
| nicheCardMeta | {apps} · {reviews} | {apps} · {reviews} | {apps} · {reviews} | {apps} · {reviews} | {apps}・{reviews} |
| leaderLine | Лидер: {app} — {score} из 100 | Top: {app}, {score}/100 | Vorn: {app}, {score}/100 | En tête : {app}, {score}/100 | 1位：{app}（{score}/100） |
| searchContext | {niche} · № {rank} · {star} | {niche} · #{rank} · {star} | {niche} · Platz {rank} · {star} | {niche} · n° {rank} · {star} | {niche}・{rank}位・{star} |
| nicheH1 | Лучшие приложения для {name} | Best {name} apps | Die besten Apps: {name} | Les meilleures applis : {name} | おすすめアプリ：{name} |
| nicheMetaTitle (en/de unchanged form) | Лучшие приложения для {name}: топ-{count} по отзывам | Best {name} apps: top {count} by reviews | Die besten Apps: {name}, Top {count} nach Rezensionen | Meilleures applis : {name}, top {count} d’après les avis | おすすめアプリ：{name}（レビューで選んだトップ{count}） |
| nicheMetaTitleShort | Лучшие приложения для {name}: топ-{count} | Best {name} apps: top {count} | Die besten Apps: {name}, Top {count} | Meilleures applis : {name}, top {count} | おすすめアプリ：{name}（トップ{count}） |
| nicheMetaDescription (changed) | {apps} для {name} по {reviews}. Лидеры: {top}. Для каждого — скриншоты, что хвалят и на что жалуются. | {count} {name} apps ranked from {reviews}. Top: {top}. Screenshots, praise and complaints for each. | {apps} im Thema {name}, bewertet nach {reviews}. Vorn: {top}. Zu jeder App Screenshots, Lob und Kritik. | {apps} du thème {name}, classées d’après {reviews}. En tête : {top}. Pour chaque app : captures d’écran, points forts et reproches. | {name}の{apps}を{reviews}から比較しています。上位は{top}です。各アプリのスクリーンショット、評価点、不満点を掲載しています。 |
| nicheSubtitle | {name} · {apps} · {reviews} | {name} · {apps} · {reviews} | {name} · {apps} · {reviews} | {name} · {apps} · {reviews} | {name}・{apps}・{reviews} |
| nicheLead | Самая высокая оценка по текстам отзывов — у {top}. | The highest review-text scores: {top}. | Die besten Werte aus den Rezensionstexten: {top}. | Les meilleures notes d’après le texte des avis : {top}. | レビュー本文のスコアが高いのは{top}です。 |
| topFirst | {app} ({score} из 100) | {app} ({score}/100) | {app} ({score}/100) | {app} ({score}/100) | {app}（{score}/100） |
| topNext | {app} ({score}) | {app} ({score}) | {app} ({score}) | {app} ({score}) | {app}（{score}） |
| topTitle | Топ-{count} по оценке отзывов | Top {count} by review score | Top {count} nach Wert aus Rezensionen | Top {count} selon la note des avis | レビュースコア上位{count} |
| leadersTitle | Тройка лидеров | Top three | Die ersten drei | Le trio de tête | 上位3アプリ |
| restTitle | Места {from}–{to} | Ranks {from}–{to} | Plätze {from}–{to} | Places {from} à {to} | {from}〜{to}位 |
| sortReview | По отзывам | Review score | Rezensionen | Avis | レビュー |
| sortStore | По App Store | App Store | App Store | App Store | App Store |
| sortRatings | Популярные | Most rated | Meistbewertet | Les plus notées | 評価数 |
| sortName | По названию | Name | Name | Nom | 名前 |
| legend | Место — по оценке текстов отзывов (из 100). ★ — оценка в App Store. | Rank follows the review-text score (out of 100). ★ is the App Store rating. | Der Platz folgt dem Wert aus den Rezensionstexten (von 100). ★ ist die App-Store-Bewertung. | Le rang suit la note tirée du texte des avis (sur 100). ★ est la note de l’App Store. | 順位はレビュー本文のスコア（100点満点）順です。★はApp Storeの評価です。 |
| rankPrefix | №  | # | Nr.  | n°  | (empty) |
| rankSuffix | (empty) | (empty) | (empty) | (empty) | 位 |
| rankA11y | Место {n} | Rank {n} | Platz {n} | Rang {n} | {n}位 |
| rankBadge | № {n} по отзывам | #{n} by reviews | Platz {n} nach Rezensionen | N° {n} d’après les avis | レビュー{n}位 |
| scoreA11y | Оценка по отзывам: {score} из 100 | Review score: {score} out of 100 | Wert aus Rezensionen: {score} von 100 | Note des avis : {score} sur 100 | レビュースコア：{score}/100 |
| outOf100 | из 100 | of 100 | von 100 | sur 100 | /100 |
| storeA11y | Оценка в App Store: | App Store rating: | App-Store-Bewertung: | Note sur l’App Store : | App Storeの評価： |
| storeMeta | {star} · {ratings} | {star} · {ratings} | {star} · {ratings} | {star} · {ratings} | {star}・{ratings} |
| praised | Хвалят: | Praised: | Gelobt: | Points forts : | 評価点： |
| complained | Жалуются: | Complaints: | Kritik: | Reproches : | 不満点： |
| forWhom | Кому: | Best for: | Für wen: | Pour qui : | 向いている人： |
| openApp | Открыть разбор приложения | Open the app breakdown | Analyse der App öffnen | Ouvrir le décryptage de l’app | アプリの分析を開く |
| moreApps | {names} и ещё {n} | {names} and {n} more | {names} und {n} weitere | {names} et {n} autres | {names}ほか{n}件 |
| relatedTitle | Похожие темы | Related topics | Ähnliche Themen | Thèmes proches | 関連するテーマ |
| shotsTitle | Скриншоты | Screenshots | Screenshots | Captures d’écran | スクリーンショット |
| shotsLabel | Скриншоты {app} | {app} screenshots | Screenshots von {app} | Captures d’écran de {app} | {app}のスクリーンショット |
| shotAlt | {app}: скриншот {n} из {count} | {app} screenshot {n} of {count} | {app}: Screenshot {n} von {count} | {app} : capture d’écran {n} sur {count} | {app}のスクリーンショット（{n}/{count}） |
| iconAlt | Иконка {app} | {app} icon | Symbol von {app} | Icône de {app} | {app}のアイコン |
| prevShot | Предыдущий скриншот | Previous screenshot | Vorheriger Screenshot | Capture précédente | 前のスクリーンショット |
| nextShot | Следующий скриншот | Next screenshot | Nächster Screenshot | Capture suivante | 次のスクリーンショット |
| viewerCount | {n} из {count} | {n} of {count} | {n} von {count} | {n} sur {count} | {n}/{count} |
| heroRank | № {rank} из {count} в теме «{niche}» | #{rank} of {count} in {niche} | Platz {rank} von {count} im Thema {niche} | N° {rank} sur {count} dans le thème {niche} | {niche}で{count}件中{rank}位 |
| ratingsLabelWord | оценка в App Store\|оценки в App Store\|оценок в App Store\|оценки в App Store | rating on the App Store\|ratings on the App Store\|ratings on the App Store\|ratings on the App Store | Bewertung im App Store\|Bewertungen im App Store\|Bewertungen im App Store\|Bewertungen im App Store | note sur l’App Store\|notes sur l’App Store\|notes sur l’App Store\|notes sur l’App Store | 件の評価（App Store） |
| reviewsReadLabelWord | отзыв прочитан\|отзыва прочитано\|отзывов прочитано\|отзыва прочитано | review read\|reviews read\|reviews read\|reviews read | Rezension gelesen\|Rezensionen gelesen\|Rezensionen gelesen\|Rezensionen gelesen | avis lu\|avis lus\|avis lus\|avis lus | 件のレビューを分析 |
| compareButton | Сравнить с другим приложением | Compare with another app | Mit einer anderen App vergleichen | Comparer avec une autre app | ほかのアプリと比べる |
| appTasksTitle | Упоминается в задачах | Mentioned for these jobs | Genannt für diese Aufgaben | Citée pour ces besoins | この課題で挙げられています |
| alternativesTitle | Другие приложения в теме | Other apps in this topic | Weitere Apps in diesem Thema | Autres apps de ce thème | このテーマのほかのアプリ |
| wholeNicheTitle | Весь рейтинг: {name} | Full ranking: {name} | Gesamte Rangliste: {name} | Classement complet : {name} | ランキング全体：{name} |
| wholeNicheBody | {apps} со скриншотами и оценками | {apps} with screenshots and scores | {apps} mit Screenshots und Werten | {apps} avec captures et notes | スクリーンショットとスコア付きの{apps} |
| otherNichesTitle | В других рейтингах | In other rankings | In anderen Ranglisten | Dans d’autres classements | ほかのランキング |
| otherNicheLine | № {rank} из {count} · {score} из 100 | #{rank} of {count} · {score}/100 | Platz {rank} von {count} · {score}/100 | N° {rank} sur {count} · {score}/100 | {count}件中{rank}位・{score}/100 |
| otherNicheLine (Fixer amendment (2026-09-25): the row's meter already shows the score) | № {rank} из {count} | #{rank} of {count} | Platz {rank} von {count} | N° {rank} sur {count} | {count}件中{rank}位 |
| otherTasksTitle | Другие задачи в теме | Other jobs in this topic | Weitere Aufgaben in diesem Thema | Autres besoins de ce thème | このテーマのほかの課題 |
| appMetaTitle (changed) | {app}: отзывы, плюсы и минусы | {app} review: pros and cons | {app}: Rezensionen, Vor- und Nachteile | {app} : avis, points forts et points faibles | {app}の評判と長所・短所 |
| appMetaTitleNiche | {app} ({niche}): отзывы, плюсы и минусы | {app} ({niche}) review: pros and cons | {app} ({niche}): Rezensionen, Vor- und Nachteile | {app} ({niche}) : avis, points forts et points faibles | {app}（{niche}）の評判と長所・短所 |
| appMetaTitleNiche (Fixer amendment (2026-09-25), §6.1) | {app}: отзывы, плюсы и минусы ({niche}) | {app} review: pros and cons ({niche}) | {app}: Rezensionen, Vor- und Nachteile ({niche}) | {app} : avis, points forts et points faibles ({niche}) | {app}の評判と長所・短所（{niche}） |
| appMetaTitleNicheShort (new, Fixer amendment (2026-09-25)) | {app}: отзывы ({niche}) | {app} review ({niche}) | {app}: Rezensionen ({niche}) | {app} : avis ({niche}) | {app}の評判（{niche}） |
| appMetaFacts | Оценка по отзывам — {score} из 100, в App Store — {star}. | Review score: {score}/100; App Store: {star}. | Wert aus Rezensionen: {score}/100; App Store: {star}. | Note des avis : {score}/100 ; App Store : {star}. | レビュースコア{score}/100、App Store {star}。 |
| taskMetaTitle | {audience}: приложения для {name} | {audience}: {name} apps | {audience}: Apps im Thema {name} | {audience} : apps du thème {name} | {audience}向け：{name}のアプリ |
| pickerMetaTitle | Сравнить {app} с другим приложением | Compare {app} with another app | {app} mit einer anderen App vergleichen | Comparer {app} avec une autre app | {app}をほかのアプリと比べる |
| compareMetaTitle | {a} и {b}: сравнение | {a} vs {b}: comparison | {a} vs. {b}: Vergleich | {a} ou {b} : comparatif | {a}と{b}の比較 |
| group_health | Здоровье | Health | Gesundheit | Santé | 健康 |
| group_sport | Спорт и активность | Sport and activity | Sport und Bewegung | Sport et activité | スポーツとアクティビティ |
| group_mind | Привычки и спокойствие | Habits and calm | Gewohnheiten und Ruhe | Habitudes et sérénité | 習慣と心の安定 |
| group_work | Работа и дела | Work and tasks | Arbeit und Aufgaben | Travail et tâches | 仕事とタスク |
| group_ai | Искусственный интеллект | AI | KI | IA | AI |
| group_learn | Учёба и языки | Learning and languages | Lernen und Sprachen | Études et langues | 学習と語学 |
| group_money | Деньги | Money | Geld | Argent | お金 |
| group_media | Фото, видео и музыка | Photo, video and music | Foto, Video und Musik | Photo, vidéo et musique | 写真・動画・音楽 |
| group_home | Дом и семья | Home and family | Zuhause und Familie | Maison et famille | 家庭と家族 |
| group_everyday | Покупки, поездки и общение | Shopping, travel and chat | Einkaufen, Reisen und Chat | Achats, trajets et messagerie | 買い物・移動・コミュニケーション |

Notes on the table:
- In `rankPrefix`, "№ " and "Nr. " end with a no-break space, and "n° " is followed by a U+00A0. `(empty)` means the empty string `""`.
- `name` in the niche and task templates is `h1Name`: ru/en `seoName`, de/fr/ja `niche.name`.
- Fixer amendment (2026-09-25): the ru `legend`, `nicheLead` and `leaderLine` carry a no-break space before «—», so no line starts with the dash.

**Kept:**
- `appsWord`, `dataNote`, `methodCounts`, `methodReviewsWord`, `ratingsWord`, `quotesNote`, `quotesWord`, `newTab`, `appRatingTitle`, `appRatingBody`, `nicheRatingTitle`, `nicheRatingBody`. The last four are also used by the review archive.
- `appMetaDescription`, as the fallback in §6.1.

**Deleted:** `nicheAppsWord` (W1) and `ratingsNote` (W4).

### 7.2 App keys for client components (`features/rating/keys.ts`: `RATING_UI_KEYS`)

The final list:
- **Catalogue search:** «Приложение или задача», «Очистить поиск», «Найдено приложений: %1$@», «Пока не нашли», «Попробуй название приложения или тему: например, календарь, фото или привычки.», «Показать остальные %1$@», «Не удалось открыть каталог», «Повторить».
- **Niche list:** «Найти в этой теме», «Приложения», «Сортировка», «Нет подходящих результатов», «Попробуй другое название или очисти поиск.», «Об оценках».
- **Viewer:** «Закрыть».
- **Compare picker filter:** «Название приложения», «Пока нет подходящих результатов. Попробуй другое название.».

**Removed** (the sheet, the menu and the task toggle are gone; the method section, tasks, rows and facts are server-rendered): «из 100 · отзывы», «из 5 · магазин», «Для чего тебе приложение?», «Все задачи (%1$@)», «Свернуть», «Порядок», «По оценке отзывов», «По оценке в магазине», «По названию», « · об оценках», «Готово», and the 5 method-sheet texts.

The `COVER` map in `docs/site-v2/review/check-ui-keys.mjs:221` maps the prefix `src/site/features/rating/` to `RATING_UI_KEYS`, so new client files there are covered with no edit. `src/site/ui/AppIcon.tsx` uses no `t()`.

---

## 8. Data pipeline

### 8.1 Content contract (`src/site/content/rating-types.ts`)

```ts
export interface RatingAppFile {
  … existing (id, title, realScore, storeAvg, ratings, verdict, loved, weak, whoFor, quotes) …;
  /** Short display name: the store title cut at the first " - ", " – ", " — ", ": " or " | " when the
   *  head is 2–40 chars AND unique (case-insensitive) among all apps of the rating; else = title.
   *  Fixer amendment (2026-09-25): a title without such a head but with a dangling separator of a
   *  cut-off source title («To Do List|») loses it under the same uniqueness rule; the pages print
   *  every title and short name through text.ts `displayTitle` (no «Password Manager-»). */
  short: string;
  /** Compact mzstatic path of the 512 px App Store icon (§3.1); null = none. PUBLIC. */
  icon: string | null;
  /** Compact mzstatic paths of the App Store screenshots, store order, unique, ≤ 10; [] = none. */
  shots: string[];
  /** Reviews read for this app (peoplesRating `nrev`, 20–543); null = unknown. */
  reviewsRead: number | null;
}
export interface RatingNicheFile {
  … existing …;
  /** SEO head term in the file's language (§6.2): ru genitive / en noun phrase. Required, both locales. */
  seoName: string;
  /** One editorial sentence, 60–180 chars, file language (§6.3); null only for astrology. */
  intro: string | null;
  /** YYYY-MM-DD (UTC) of the last content change of this file (sitemap lastmod). */
  updatedAt: string;
}
export interface RatingLeaderFile { id: string; title: string; short: string; icon: string | null; realScore: number | null }
export interface RatingIndexEntry {
  slug: string; name: string; nameLang: LocaleCode; count: number;
  totalReviews: number; intro: string | null; updatedAt: string;
  /** Ranks 1–4 (catalogue folder + leader line). */
  leaders: RatingLeaderFile[];
}
export interface RatingIndexFile {
  … existing …;
  /** Max updatedAt of the niches. */
  generatedAt: string;
  stats: { …existing…; appsWithIcon: number; appsWithShots: number; shots: number };
}
```

Every "GATED" comment is replaced by "PUBLIC" (G9).

### 8.2 Importer (`scripts/v2/import-rating.ts`, run through `import-app-content.ts --only=rating`)

**Source types.** `RawApp` (`:84-91`) gains `icon?: string | null; shots?: string[]; nrev?: number`.

**Media:**
- `compactIcon(url)` accepts only `^https://is1-ssl\.mzstatic\.com/image/thumb/(.+)/512x512bb\.jpg$`.
- `compactShot(url)` accepts only `^https://is1-ssl\.mzstatic\.com/image/thumb/(.+)/240x0w\.(?:jpg|png)$`.
- Store group 1. Then check it against `^[A-Za-z0-9][A-Za-z0-9._@/-]*\.(?:png|jpe?g)$` with the `i` flag. The only special characters in today's paths are `/ - _ . @`; extensions are png, jpg, jpeg, PNG and JPG.
- Anything else is an error that names the app id. There are 0 today.
- Shots: deduplicate and keep at most 10 (today: no duplicates, at most 10).
- Emit `icon`, `shots` and `reviewsRead: typeof app.nrev === "number" ? app.nrev : null` identically in `ruAppFiles` (`:342-350`) and `enAppFiles` (`:369-377`).

**Short names.** Before the niche loop, compute `short` from **all** 72 sets (by app id, from peoplesRating titles) with `shortTitle(title)` plus the uniqueness rule. Export `shortTitle` for the test. Today 2,151 of 4,050 unique apps get a short name; 220 fall back because of collisions.

**SEO overrides.**
- Read `scripts/v2/data/rating-seo.json` (new; shape `{ "<slug>": { "seoName": { "ru": string, "en": string }, "intro": { "ru": string, "en": string } } }`, 71 entries).
- ru files get `seoName = entry.seoName.ru`, `intro = tg(neutralizeTrustLanguage(entry.intro.ru, "ru"))`.
- en files get `seoName = entry.seoName.en`, `intro = neutralizeTrustLanguage(entry.intro.en, "en")`.
- A usable niche without an entry is an error. astrology keeps the peoplesRating `seoName` (ru), `nameEn` (en) and `intro: null`.
- Fixer amendment (2026-09-25): an entry may carry `name: { ru?, en? }`, which replaces the displayed topic name of that data locale. It is used for the 9 non-launch topics whose English name was the raw peoplesRating `nameEn` («Food delivery apps», "AI Species Identifier (Plant/Bug/Animal)"); de/fr/ja pages inherit it. The ru name also goes through `tg()`, like every ru text: short words are bound to the next one (no «Концентрация и» left at a line end).
- Intros matching the trust regex (§6.3) are an error.

**`updatedAt`.** For each output niche file, read the existing `content/v2/<L>/rating/<slug>.json`. If it deep-equals the new object ignoring `updatedAt`, keep its `updatedAt`; otherwise use today's UTC date. `generatedAt` in the index is the maximum.

**Index.** Each entry gains `totalReviews`, `intro`, `updatedAt` and `leaders` (the first 4 apps: `id`, `title`, `short`, `icon`, `realScore`).

**Stats and fixed counts.** Add `appsWithIcon`, `appsWithShots` and `shots`. Extend `EXPECTED` (`:137`) with `appsWithIcon: 4443, appsWithShots: 4149, shots: 29656`, all across the 72 files.

**Optional cross-check.** Compare icon and shots with `rich.ru` `dossiers[slug].rating.apps[i]` in the loop at `:281`. A difference is a `warn` (0 today): the web's peoplesRating is the source of truth.

**Unchanged.** The output guard (`import-app-content.ts:1485`) and the stale-file cleanup (`:1504-1514`), because no new file names are added.

**Command** (a human or the [data] agent runs it; it reads `~/projects/app_04_inapp/Inapp/Resources` read-only and writes only `content/v2/<L>/rating/**`):

```
npx tsx scripts/v2/import-app-content.ts --only=rating
npx tsx scripts/v2/import-app-content.ts --only=rating --check
```

**Size.** Compact paths add about 3.2 MB per data locale: ru goes from 7.5 to about 10.9 MB, en from 4.6 to about 8 MB. Each file is read once per process.

### 8.3 Reader (`src/site/sitedata/rating.ts`)

**Types:**
- `RatingAppEntry` gains `rank` (index + 1), `short`, `icon`, `shots`, `reviewsRead`.
- `RatingNiche`:
  - `seoName: string` (both locales);
  - add `intro`, `updatedAt`;
  - keep `titleName` (no longer used by pages).
- `RatingNicheCard` gains `totalReviews`, `intro`, `updatedAt`, `leaders: RatingLeaderFile[]`, `group: RatingGroupId`. It is read from the index only, so the catalogue opens no niche file.
- `RatingSearchItem` gains `rank`, `storeAvg`, `icon`.
- New `RatingTaskCard = { n; name: string | null; job: string; gap: string | null; apps: { id; short; icon }[] /* first 4 */; appCount: number }`.

**New functions (all synchronous and memoised per file identity, like the existing caches):**

| Function | Returns |
|---|---|
| `listRatingGroups(l)` | `{ id: RatingGroupId; cards: RatingNicheCard[] }[]` in `RATING_GROUPS` order, cards alphabetical (`compareNames`) |
| `ratingTaskCards(niche)` | `RatingTaskCard[]` for scenarios with a job, in data order |
| `appTasks(niche, appId)` | the `RatingTaskCard[]` whose apps (all `appIds`, not only the first 4) include the app |
| `nicheNeighbours(niche, app)` | ≤ 5 apps: ranks 1–3 ∪ {rank − 1, rank + 1}, minus self, deduplicated, rank order; filled to 5 with the next-nearest ranks when short (§4.3 item 13 amendment) |
| `ratingAppNiches(l, appId)` | `{ niche, name, nameLang, appSlug, rank, count, realScore }[]` across usable niches (index built together with the search corpus) |
| `relatedNiches(l, slug, 4)` | `RatingNicheCard[]` by shared app-id count descending, then `totalReviews` descending, requiring ≥ 1 shared app; filled up to 4 from the same group, alphabetically |

**Search.** `searchRatingApps` sorts with the tier `titleContains(query)` (new export in `matches.ts`), then `realScore` descending (nulls last), then `compareNames`. Fixer amendment (2026-09-25): equal scores of one niche keep its ranks (D3) before `compareNames`, so «Way of Life · № 2» precedes «HabitKit · № 3».

**Changed.** `getRatingApp(l, niche, slug)` returns `{ niche, app }`; the `place` field is removed (use `app.rank`; no page reads `place` today).

### 8.4 Helpers (`features/rating/text.ts`, pure)

`points(text, lang): string[]`:
- Built on `sentences()` from `src/site/content/text.ts:69` (Intl.Segmenter; it already keeps «0,5 кг», "0.5 kg" and «т. д.» intact).
- It merges any fragment shorter than 12 characters into the previous one.
- Measured: 2,435 ru / 2,774 en of the 8,667 loved/weak texts have 2 or more sentences; 17 / 14 contain a fragment shorter than 12 characters.

`groups.ts`:
- `RATING_GROUPS: readonly RatingGroupId[]` = `health, sport, mind, work, ai, learn, money, media, home, everyday`.
- `GROUP_OF: Record<string, RatingGroupId>` covers all 71 usable niches exactly once:

| group | niches |
|---|---|
| health (10) | blood-pressure-log, cosmetics-ingredient-checker, intermittent-fasting, nutrition-calories, period-cycle, pregnancy-tracker, sleep-tracking, water-hydration, weight-tracker, white-noise-sleep-sounds |
| sport (7) | cycling, fishing, hiking-trails, run-tracking, step-counter, workout-fitness, yoga |
| mind (6) | faith-prayer-bible, habit-tracking, journaling-mood, meditation-mindfulness, sobriety, tarot-reading |
| work (11) | calendars-tasks, focus-productivity, invoice-maker, mind-mapping, notes-pkm, password-manager, qr-scanner, resume-builder, scanner-pdf, teleprompter-captions, voice-recorder |
| ai (7) | ai-avatars-headshots, ai-chatbot, ai-companion-roleplay, ai-image-generation, ai-photo-restore, ai-species-identifier, ai-writing |
| learn (7) | ai-homework-solver, astronomy-stargazing, driving-test-prep, flashcards, guitar-tuner-learn, language-learning, translator |
| money (3) | crypto-investing, personal-finance, stock-investing |
| media (4) | music-streaming, photo-editing, video-streaming, wallpapers-widgets |
| home (9) | baby-tracking, car-maintenance, couples-relationship, interior-design, meal-prep-grocery, pet-care, plant-care, recipes-meal-planning, wardrobe-outfit |
| everyday (7) | dating-apps, food-delivery, messaging-apps, ride-hailing, shopping-ecommerce, travel-planning, weather-apps |

`order.ts`: `RatingSort = "review" | "store" | "ratings" | "name"` with the rules in §4.2.1. The `Sortable` type gains `rank` and `ratings`.

### 8.5 Validation (`scripts/v2/check-content.ts` `checkRating()`, `:249-331`)

Add these checks:
- **Per app:**
  - `short` is non-empty and at most `title.length`;
  - `icon` is null or matches `^[A-Za-z0-9][A-Za-z0-9._@/-]*\.(?:png|jpe?g)$` (flag `i`);
  - `shots` is an array of at most 10 unique entries of the same shape;
  - `reviewsRead` is null or an integer from 1 to 2000.
- **Per file:**
  - apps are sorted by `realScore` descending (the rank contract, D3);
  - `seoName` is non-empty and at most 40 characters; en does not match `/\bapps?$/i`;
  - `intro` is null only for astrology, is 180 characters or fewer, and does not match the trust regex;
  - `updatedAt` matches `^\d{4}-\d{2}-\d{2}$`.
- **ru ↔ en:** equal `short`, `icon`, `shots` and `reviewsRead` per app.
- **Index:**
  - `leaders` equal each file's first 4 apps;
  - `totalReviews`, `intro` and `updatedAt` equal the file's;
  - `generatedAt` is the maximum `updatedAt`;
  - the new stats equal the files' totals.
- **Groups:** every usable niche is in `GROUP_OF` exactly once, and `GROUP_OF` has no unknown slug. Import `groups.ts`, which is pure.

---

## 9. Docs and CI (same change)

**`docs/site-v2/DECISIONS.md`:**
- Under «Web-only sections», add a subsection «Rating: rich and free (owner, 2026-09-25)» with the owner quote, D1–D16 in one line each, and the quotes-overlap consequence.
- In «Clarity redesign of the three sections», mark these bullets for the rating as superseded by spec 11 and state the new rule in one line each:
  - Q1–Q2: scores and `aggregateRating` → an editorial Review, no aggregateRating;
  - Q3: names → keyword H1 plus the topic name in the subtitle;
  - Q4–Q6: order and density → groups, leaders, rows with screenshots;
  - Q7: scenario pages noindex → the §6.1 rule;
  - Q9: gate → public.
- Line 51 («the rating is public») stays true. Add «including quotes and task details».

**`docs/site-v2/ARCHITECTURE.md`:**
- `:96-103` content: rating files carry `short`, `icon`, `shots`, `reviewsRead`, `seoName`, `intro`, `updatedAt` and index `leaders`; «Quotes and scenario details are GATED data» becomes «all rating data is PUBLIC».
- §5: add item 5, "archived rating pages `src/app/(old)/rating/**` are `noindex, follow` without alternates (spec 11 §6.5)", as an exception to §5.2.
- §5.4 smoke markers: add `id="rating-leaders"`, `id="screenshots"` and the sitemap files.
- §6: the rating's app, task and compare pages also wrap their client parts in `I18nProvider` (keys plus `web.rating`). Replace the sentence «Client parts of the rating app/task pages get server-made labels instead (no provider)».
- §7 design paragraph: replace «Store icons, screenshots and «mismatch» colours are gone. The rating catalogue sorts niches alphabetically; niche pages list one card per app.» with the RR1–RR9 summary: icons and screenshots from the Apple CDN; leaders in research-card chrome; rows with 3 screenshots; grouped catalogue grid; no status colours.

**`docs/site-v2/spec/10-web-only-sections-clarity.md`:**
- A note under the title: "Rating: superseded by spec 11 (`11-rating-rich.md`) — §1.1 #3/#4/#6/#7, R2–R4, R6, R7, R9 (method sheet), R11, §3, rating rows of §8–§10."
- The same one-line marker at the top of §3.

**`content/v2/README.md:71-80`:** the new fields; PUBLIC; the sitemap routes read `updatedAt`.

**`.github/workflows/deploy.yml`:**
- Add a CI step after `check-content`: `node --import tsx scripts/v2/test-rating.ts`.
- Smoke (`:221-233`): keep every existing line, then add:

```sh
expect_200 https://inapp.pro/ru/rating
grep -q 'is1-ssl.mzstatic.com' /tmp/smoke-body.html
grep -q 'id="group-health"' /tmp/smoke-body.html
expect_200 https://inapp.pro/ru/rating/dating-apps
grep -q 'id="rating-leaders"' /tmp/smoke-body.html
grep -q 'Лучшие приложения для знакомств' /tmp/smoke-body.html
if grep -q 'ia-rs-lock-card' /tmp/smoke-body.html; then echo "lock card in the rating"; exit 1; fi
expect_200 https://inapp.pro/ru/rating/habit-tracking/hevy-workout-tracker-gym-log
grep -q 'id="screenshots"' /tmp/smoke-body.html
grep -q '"bestRating":100' /tmp/smoke-body.html
if grep -q 'AggregateRating' /tmp/smoke-body.html; then echo "App Store aggregateRating in JSON-LD"; exit 1; fi
expect_200 https://inapp.pro/ru/rating/habit-tracking/way-of-life-habit-tracker
grep -q 'class="ia-quote' /tmp/smoke-body.html
expect_200 https://inapp.pro/ru/rating/habit-tracking/tasks/1
grep -q 'id="rating-task-apps"' /tmp/smoke-body.html
expect_200 'https://inapp.pro/api/site/rating-search?l=en&q=calendar'
grep -q '"icon":' /tmp/smoke-body.html
expect_200 https://inapp.pro/sitemap-rating-en.xml
grep -q '/en/rating/habit-tracking/hevy-workout-tracker-gym-log' /tmp/smoke-body.html
grep -q '<image:loc>' /tmp/smoke-body.html
expect_200 https://inapp.pro/robots.txt
grep -q 'sitemap-rating-ru.xml' /tmp/smoke-body.html
```

**`scripts/v2/test-routing.ts:166`.** Add `"rating/habit-tracking/hevy-workout-tracker-gym-log/vs"` and `"rating/habit-tracking/hevy-workout-tracker-gym-log/vs/way-of-life-habit-tracker"` to the list, so they are new-site and indexable at the proxy level (noindex is set by the page meta). Rewrite the comment at `:164-165`.

**`docs/site-v2/review/check-ui-keys.mjs`.** No edit: the `COVER` prefix covers the new client files. The [docs-ci] agent verifies the report shows 0 missing and 0 not-covered.

---

## 10. Implementation plan (parallel agents, strict file ownership)

Rules for every agent:
- Edit only the files you own. Never run `git stash`, `commit` or `push`.
- Never touch `/Users/artsaverin/projects/app_04_inapp/**` (read-only), `badcomment-v2` or `badcomment`.
- Code against the interfaces in this spec. Report to the integrator (the lead session) anything another owner must change, instead of editing it yourself.
- Run the verification suite (§10.3) on your paths before reporting.

### 10.1 Agents and owned files

**Wave 1 (start together):**

**[data]** data pipeline and reader.

| Owns | Changes |
|---|---|
| `scripts/v2/import-rating.ts` | §8.2 |
| `scripts/v2/data/rating-seo.json` (new) | §6.2 table + §6.3 intros for all 71 niches |
| `scripts/v2/check-content.ts` (`checkRating` only) | §8.5 |
| `src/site/content/rating-types.ts`, `src/site/content/rating.ts` (comments) | §8.1, G9 |
| `src/site/sitedata/rating.ts` | §8.3, G9 |
| `src/site/features/rating/{groups.ts (new), text.ts (new), order.ts, matches.ts}` | §8.4, `titleContains` |
| `src/app/api/site/rating-search/route.ts` | §4.1 field map, G9 comment |
| `content/v2/{ru,en,de,fr,ja}/rating/**` | regenerated by the importer only |
| `scripts/v2/test-rating.ts` (new) | see below |

`test-rating.ts` covers:
- `shortTitle` plus uniqueness on real data;
- `points()` (keeps «0,5 кг», "0.5 kg", «т. д.»; no fragment under 12 characters on all 8,667 texts);
- `GROUP_OF` coverage (71, each once);
- `media.ts` round trips (`iconSrc(p,56)` ends `/128x128bb.webp`, `shotSrc(p,"row")` ends `/9999x440bb.webp`);
- the `rating-seo.json` coverage and trust regex.

Acceptance:
- The importer `--check` passes. The counts are 72 niches / 4,443 apps / 4,443 icons / 4,149 with shots / 29,656 shots.
- `check-content` passes.
- `test-rating.ts` passes.
- `searchRatingApps(ru, "привычки")` returns score order after the title tier.
- `getRatingNiche("ru","habit-tracking").apps[0]` is `{ rank: 1, short: "Hevy", icon: "Purple211/…png", shots.length: 10, reviewsRead: number }`.

**[ui]** shared components, all rating CSS, and strings.

| Owns | Changes |
|---|---|
| `src/site/ui/AppIcon.tsx` (new), `src/site/ui/index.ts` (export), `src/site/ui/icons.tsx` | add `ThumbsUp as PraiseIcon`, `ThumbsDown as ComplaintIcon`, `UsersRound as AudienceIcon` |
| `src/site/styles/site.css` | `.ia-app-icon` block only (§3.2) |
| `src/site/features/rating/media.ts` (new) | §3.1 |
| `src/site/features/rating/format.ts` | §3.11 |
| `src/site/features/rating/score.tsx` (new) | §3.3 |
| `src/site/features/rating/{RatingShots.tsx, RatingStage.tsx, ShotScroller.tsx, RatingGallery.tsx, RatingImageGuard.tsx}` (new) | §3.4 |
| `src/site/features/rating/{RatingAppCard.tsx, RatingMiniRow.tsx, RatingNicheCard.tsx, IconStack.tsx, RatingTaskList.tsx, RatingSearchRow.tsx}` (new) | §3.5–§3.10 |
| `src/site/features/rating/rating.css` | a full rewrite: every `ia-rt-*` class of §3–§4 (including the page-level classes `.ia-rt-intro`, `.ia-rt-top`, `.ia-rt-controls`, `.ia-rt-legend`, `.ia-rt-groups`, `.ia-rt-niches`, `.ia-rt-related`, `.ia-rt-hero`, `.ia-rt-facts`, `.ia-rt-actions`, `.ia-rt-inset`, `.ia-rt-pair`, `.ia-rt-bullets`, `.ia-rt-proof`, `.ia-rt-method`, `.ia-rt-compare*`, `.ia-rt-catalog__head`, `.ia-rt-results`). The header comment becomes RR1–RR9 in short. Delete `.ia-rt-row*`, `.ia-rt-browser`, `.ia-rt-method-link`, `.ia-sheet__body.ia-rt-method-body`, `.ia-rt-metrics*` and `.ia-rt-proof__empty`. Keep `.ia-rt-method-card` in site.css (the review methodology uses it). |
| `src/site/features/rating/strings.ts` | §7.1, all 5 locales |
| `src/site/features/rating/keys.ts` | §7.2 |

Acceptance:
- `tsc` is clean for the owned files.
- `lint-web-strings` stays at the baseline of 15 hits, with no new ones.
- A scratch render of `RatingAppCard` for Hevy produces ≤ 26 elements for a row.
- Light and dark screenshots of one row, one leader and one niche card at 375 and 1280 in the browser pane, through a temporary route that is **not** committed and is deleted after the check.

**[seo]** SEO plumbing.

| Owns | Changes |
|---|---|
| `src/site/features/rating/seo.ts` | `dataCanonical`, `h1Name`, `nicheTitle`, `taskTitle`, `isIndexableTask`, `appTitle`, `appDescription` (§6.1) |
| `src/site/features/rating/schema.ts` (new) | `catalogueJsonLd`, `nicheJsonLd`, `appJsonLd`, `taskJsonLd`, `compareJsonLd` (§6.4) |
| `src/site/sitedata/rating-sitemap.ts` (new, server-only) | `ratingHubEntries()`, `ratingSitemapXml(dl)`, `ratingIndexNowUrls()` |
| `src/app/sitemap.ts`, `src/app/robots.ts` | §6.5 |
| `src/app/sitemap-rating-ru.xml/route.ts`, `src/app/sitemap-rating-en.xml/route.ts` (new) | §6.5 |
| `src/app/api/indexnow/route.ts` | §6.5 |
| `src/lib/llms.ts` | §6.5, additive |
| `src/app/(old)/rating/page.tsx`, `[slug]/page.tsx`, `[slug]/[app]/page.tsx` | `generateMetadata` only (§6.5) |

Acceptance:
- `/sitemap-rating-en.xml` has 4,343 app `<loc>` plus 68 task `<loc>`; `ru` has 4,343 plus 31.
- `/sitemap.xml` lists `/en/rating/habit-tracking` as its own `<url>`.
- `robots.txt` lists 3 sitemaps.
- `/ru/old/rating/habit-tracking` has meta `noindex` and no canonical.
- Unit asserts in `scripts/v2/test-rating.ts` are added through [data]: send the cases to [data].

**[docs-ci]**

| Owns | Changes |
|---|---|
| `docs/site-v2/DECISIONS.md`, `docs/site-v2/ARCHITECTURE.md`, `docs/site-v2/spec/10-web-only-sections-clarity.md` (notes only), `content/v2/README.md`, `.github/workflows/deploy.yml` | §9 |
| `docs/site-v2/review/check-ui-keys.mjs` | verify only; edit only if the report shows a coverage gap |

**Wave 2** (starts once wave 1 compiles, `tsc` clean):

**[niche]** catalogue and niche pages.

| Owns | Changes |
|---|---|
| `src/app/(site)/site/[lang]/rating/page.tsx` | §4.1 (JSON-LD via `schema.ts`, metadata via `seo.ts`) |
| `src/app/(site)/site/[lang]/rating/[slug]/page.tsx` | §4.2, G8 |
| `src/site/features/rating/RatingNicheList.tsx` (new) | §4.2.1 |
| `src/site/features/rating/RatingSearchShortcut.tsx` (new) | §4.2.2 |
| `src/site/features/rating/RatingMethod.tsx` (new, server) | §4.2.9 |
| `src/site/features/rating/RatingCatalog.tsx` | §4.1 search mode, G9 comment |
| `src/site/features/rating/viewState.ts` | remove the task-expansion helpers |
| delete `RatingNicheBrowser.tsx`, `RatedAppRow.tsx`, `RatingMethodSheet.tsx` | — |

**[detail]** app, task and compare pages, and routing.

| Owns | Changes |
|---|---|
| `src/app/(site)/site/[lang]/rating/[slug]/[app]/page.tsx` | §4.3, G1, G2 |
| `src/app/(site)/site/[lang]/rating/[slug]/tasks/[n]/page.tsx` | §4.4, G3–G5 |
| `src/app/(site)/site/[lang]/rating/[slug]/[app]/vs/page.tsx`, `…/vs/[other]/page.tsx` (new) | §4.5 |
| `src/site/features/rating/RatingListFilter.tsx` (new) | §4.5 |
| `src/site/routing.ts` | `ratingCompare` |
| `scripts/v2/test-routing.ts` | §9 |
| delete `RatingLockCard.tsx`, `QuotesProof.tsx` | G6, G7 |

**Wave 3 (integrator, the lead session):** run the full suite (§10.3) and the manual checks (§10.4). Route every failure back to the owning agent.

### 10.2 Per-agent acceptance on pages (wave 2)

- **[niche]**
  - `/ru/rating`: `id="rating-niches"`, 10 `section id="group-…"`, 71 niche cards, ≥ 284 `mzstatic` occurrences; H1 «Рейтинг приложений по отзывам».
  - `/ru/rating/habit-tracking`:
    - H1 «Лучшие приложения для трекинга привычек»;
    - `id="rating-top"`, `id="rating-leaders"` (3 `<li>`), `id="rating-tasks"`, `id="rating-apps"` with `start="4"` and 90 rows, `id="rating-method"`;
    - 0 `ia-rs-lock`;
    - `?sort=store` renders server-side in store order;
    - typing «виджет» filters rows by words that appear only in the praise text.
- **[detail]**
  - Hevy page: an icon with `alt="Иконка Hevy"`, 10 gallery `<a data-rt-shot>`, the viewer opens and supports ← → Esc and Back, `"bestRating":100`, no `aggregateRating`.
  - Way of Life page: 2 `ia-quote` for a signed-out visitor.
  - `/ru/rating/habit-tracking/tasks/3`: an inset with «Что проверить перед выбором» and 3 rows.
  - `…/hevy-workout-tracker-gym-log/vs` lists 92 mini rows.
  - `…/vs/way-of-life-habit-tracker` shows both icons, 2×3 shots and 3 paired cards, with `noindex`.

### 10.3 Verification suite (every agent, and the integrator at the end)

```sh
cd /Users/artsaverin/projects/badcomment-sections
npx tsc --noEmit -p .
npx eslint "src/site/features/rating" "src/site/ui/AppIcon.tsx" "src/site/ui/icons.tsx" "src/site/sitedata/rating.ts" \
  "src/site/sitedata/rating-sitemap.ts" "src/site/content/rating-types.ts" "src/app/(site)/site/[lang]/rating" \
  "src/app/api/site/rating-search" "src/app/sitemap.ts" "src/app/robots.ts" "src/app/sitemap-rating-ru.xml" \
  "src/app/sitemap-rating-en.xml" "src/app/api/indexnow" "src/lib/llms.ts" "src/app/(old)/rating" \
  "scripts/v2/import-rating.ts" "scripts/v2/check-content.ts" "scripts/v2/test-rating.ts" "scripts/v2/test-routing.ts" "src/site/routing.ts"
npm run -s test:v2-routing
node scripts/check-old-links.mjs
npm run -s test:mcp
npx tsx scripts/v2/import-app-content.ts --only=rating --check
node --import tsx scripts/v2/check-content.ts
node --import tsx scripts/v2/test-rating.ts
node docs/site-v2/review/check-ui-keys.mjs      # 0 keys missing, 0 "not in the provider"
node docs/site-v2/review/lint-web-strings.mjs   # baseline 15 hits, none new
```

### 10.4 Manual checks and budgets

The dev server is `http://localhost:3108` (`.claude/launch.json` → `site-sections`). Check at 375×812 and 1280×900, light and dark (theme cookie `ia_theme`).

**Visual:**
- Icons have a visible edge on white and on #1d1e22.
- Screenshots never jump while loading.
- The first screen:
  - mobile niche: H1, intro and the Top-5 card with icons;
  - desktop niche: the Top-5 card and the controls;
  - app page: the icon hero and facts.
- Leaders with no shots (e.g. `/ru/rating/qr-scanner`) show the plate art.

**Interaction:**
- Chips update `?sort=`, bold the sorted metric and keep ranks.
- Back restores `?q=` and `?sort=`.
- Top-5 anchors jump to the right card. They also clear a filter that hid the target.
- The toolbar search shortcut appears after scrolling past the field and focuses it.

**Accessibility (axe in the browser pane):**
- 0 violations.
- Every scroll region is focusable and labelled.
- Each row has exactly one tab stop.

**Budgets on `/ru/rating/dating-apps` (100 apps, dev server):**
- `document.querySelectorAll("*").length` ≤ 3,600;
- `<img>` ≤ 460;
- eager images ≤ 12;
- `curl -s --compressed -o /dev/null -w '%{size_download}'` ≤ 240,000 bytes;
- CLS < 0.02 in a Performance trace;
- the LCP element is text (the H1 or the intro).

**Text:** `/ru/rating/habit-tracking` `main` innerText ≥ 9,000 words.

**Access:** no Plus UI, price or lock anywhere under `/ru/rating/**` for a signed-out visitor.

---

## 11. What was deliberately left out of this release

These are recorded so nobody re-adds them by accident:
- iTunes Lookup refresh of stale mzstatic URLs and `offers`/price data.
- Per-app OG images.
- Moving the layout's cookie and header reads into a dynamic hole so rating pages can be cached.
- Yandex `Clean-param`.
- An editorial flag for off-topic apps in a niche's top 10 (e.g. Hevy, a workout log, is №1 in habit-tracking). This is a data question, not a layout one.
- `AppIcon` in the review archive.

None of them blocks the owner's three complaints.
