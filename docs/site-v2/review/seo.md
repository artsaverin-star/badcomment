# Site v2 — SEO review (key: `seo`)

Reviewed 2026-09-22 to 2026-09-23 against the shared dev server `http://localhost:3210` (branch `site-v2`, working tree
in flux) and the code. This is a report only: I did not edit any files.

**How I checked**
- I curled every indexable new URL: 46 paths × 5 locales = 230 URLs. For each one I checked:
  - the status code;
  - `<title>` and `<meta name="description">` (lengths);
  - `robots` (meta and `X-Robots-Tag`);
  - canonical and hreflang;
  - OG and Twitter tags;
  - that the JSON-LD parses.
- I also curled:
  - the old archive (`/<L>/old/**`);
  - in-place old pages (`/rating`, `/reviews`, per-app pages, non-launch topics);
  - every redirect shape in ARCHITECTURE §1;
  - `robots.txt`, `sitemap.xml`, `feed.xml`, `llms.txt`, `/api/og?logo=1`, `/opengraph-image`;
  - the live production site, for two pages only.
- `docs/site-v2/AUDIT-PHASE-A.md` covers part of this area. Its status today:
  - **A3 (noindex / no canonical on new pages): fixed.** All 230 URLs return 200 with `index, follow`, a
    self-canonical, and exactly 6 hreflang links (ru, en, de, fr, ja, x-default → `/en/…`). Every JSON-LD block
    parses.
  - **A4 (in-place pages linked only to `/old`): fixed with option A** (`src/lib/oldHref.ts`). Evidence:
    `/ru/rating/habit-tracking` now links 93× `/ru/reviews/habit-tracking/…` in place (earlier today it was 95×
    `/ru/old/reviews/…`).
  - **A9 (reviews/MCP canonicals without a locale): fixed.** `/ru/reviews/habit-tracking/1458862350` has the
    canonical `https://inapp.pro/ru/reviews/habit-tracking/1458862350`.
  - **A10 (stubs sending visitors into the archive): fixed.**
    - `/ru/categories` and `/ru/catalog` → 307 `/ru`.
    - `/ru/premium` → 307 `/ru/tokens`.
    - `/ru/segment/habit-tracking/v2` → 308 `/ru/segment/habit-tracking`.
  - **A3 step 5 (sitemap plan) has an error.** It lists `LAUNCH_IDEAS` (293 ideas) in the sitemap, but 288 of them are
    `noindex`. See S4.
- **Not written yet, or in progress, while I reviewed.** For a while, every route returned 500:
  - `src/site/features/landing/landing.css` was missing;
  - later, `src/site/i18n/server.ts:21` had a duplicate `CONTENT_ROOT`.

  Both cleared on their own. Everything below was re-checked after that.

---

## Summary

| # | Severity | Finding |
|---|---|---|
| S1 | **blocker (owner decision)** | Crawlers see 34 of the 35 launch topics (`/ru|en/segment/<slug>`, now ranking) as locked previews with about 10× less text than the pages they replace. |
| S2 | major | Topic `<title>` drops the ranking keywords («Идеи приложений: … — что построить в нише 2026» → «Привычки — Разбор — inApp»). |
| S3 | major | Catalog titles and descriptions are 10–19 and 17–64 characters long. `/ru/ideas` loses its keyword title (priority 0.95 in the sitemap today). |
| S4 | major | The sitemap has no new URLs (de/fr/ja, `/segment`, free ideas, legal pages), lists `/ru/`, which redirects, and declares 2-language hreflang for topics that now have 5. Exact plan below. |
| S5 | major | Open Graph images: catalogs and legal pages have none. Pages without `openGraph` inherit the old «No paywall · 65+ niches» card. The landing uses a 1200×800 WebP instead of the composed 1200×630 card. A nested `opengraph-image.tsx` would be broken by the proxy. |
| S6 | minor | Two different logos for one `Organization` `@id`: `/api/og?logo=1` (old gradient star) and `/brand/app-icon-256.png` (iOS icon). |
| S7 | minor | `og:locale` is `ru` instead of `ru_RU`, and `og:url` is missing on ideas and legal pages (100 tag problems over 45 URLs). The ideas catalog uses the large Twitter card with no image. |
| S8 | minor | `max-image-preview:large` / `max-snippet:-1` dropped from topic and idea pages (the old topic pages had them). |
| S9 | minor | JSON-LD is valid, but: Article has no dates, `author` is a bare `@id`, there is no BreadcrumbList, and the idea Article has no author and no `@id`. MobileApplication will show as an invalid "Software app" item. |
| S10 | minor | Topic descriptions longer than 160 characters: de 27 of 35, fr 23, en 9, ru 1. |
| S11 | minor | Free idea titles («Новая комната. Те же стены. — inApp») carry no "app idea" or topic context. |
| S12 | minor (owner) | `/old` copies are `noindex` (header) but keep `index` meta, a canonical to the public URL, and hreflang. These signals conflict. |
| S13 | minor (owner) | In-place old pages link launch topics as their `/old` copies («Похожие ниши», rating → topic), not the new topic pages. |
| S14 | minor | 288 idea URLs that used to 308 to their topic are now `noindex` dead ends with no link to the topic. |
| S15 | minor | IndexNow pings ru/en old URLs only. `llms.txt` and `feed.xml` describe launch-topic URLs with the old dossier text. |
| S16 | minor | `/en|de|fr|ja/offer/payment` combines `noindex` with a canonical to `/ru/offer/payment`. |

Redirects, robots.txt, hreflang consistency and duplicate content are covered after the findings; no other defects
were found there.

---

## S1 · blocker (owner decision) · locked topic pages are about 10× thinner than the pages they replace

- **Web:**
  - `src/app/(site)/site/[lang]/segment/[slug]/page.tsx:83-113`: the locked branch renders `LockedPreview` and
    `TopicExtras`.
  - `src/site/features/research/TopicExtras.tsx:16,136-144`: `INITIAL_APPS = 8`.
  - `src/site/features/research/ShowMoreList.tsx:41`: `items.slice(0, limit)`. Rows 9 and later are **not in
    the HTML**. They exist only in the RSC payload.
- **Source:**
  - App parity: the preview has only cover, name, summary and the lock card (`Inapp/Clarity/ClarityContentAccess.swift:68-122`).
  - Spec 09 G9 (`spec/09-critic-gaps.md:306`): locked previews are indexed with public fields only.
  - DECISIONS §3 (`DECISIONS.md:12-15`) allows site-only blocks: apps with icons, ratings and store links, market
    players, review counts, and links to per-app pages.
- **Evidence (Googlebot = a guest; visible text of the whole page, chrome included):**

  | `/ru/segment/<slug>` | new (locked) | old version (now `/ru/old/…`, noindex) |
  |---|---|---|
  | habit-tracking | 1,500 chars | 15,287 chars |
  | language-learning | 1,613 chars / 257 words | 16,085 chars / 2,404 words |
  | workout-fitness | 1,552 / 254 | 14,665 / 2,206 |
  | personal-finance | 1,497 / 251 | 16,118 / 2,397 |
  | sleep-tracking | 1,707 / 275 | 15,058 / 2,303 |
  | notes-pkm | 1,481 / 247 | 15,322 / 2,263 |

  Only `interior-design` (free) grows, from 15k to 17.5k characters. The same URLs keep their equity, but Google
  re-evaluates them against about 250 words, most of it boilerplate. So 68 indexed URLs (34 × ru/en) are likely to
  lose positions or drop to "Crawled – currently not indexed".
- **Fix, within DECISIONS §3 (no paid text, no owner decision needed):**
  1. Render every market-player row in the HTML. In `ShowMoreList.tsx:40-42`, render all items and hide the rest
     with the `hidden` attribute:
     ```tsx
     <ol ref={list} className={className} aria-label={label}>
       {items.map((item, i) => (i < limit ? item : <li key={i} hidden>{item}</li>))}
     </ol>
     ```
     Rows are `<li>` already, so the cleaner version is to pass `hidden={i >= limit}` into `AppRow`, and the focus
     logic can stay. That adds about 8 more app names, developers, ratings and links per topic.
  2. Add a review-count line under «Приложения в этой теме», from old-site data that is already loaded server-side
     (`getSegmentSummary(slug)` in `src/lib/segmentSummary.ts:44`: `appsCount`, `reviewsScanned`).
     - Copy: ru «По этой теме на прежней версии сайта разобрано {apps} приложений и {reviews} отзывов.»
     - en: "The previous version of this breakdown covered {apps} apps and {reviews} reviews."
     - Link the sentence to «Все отзывы по теме».
     - Label it as the previous version. The new article is built on a different corpus, so do not present these
       numbers as the new article's basis.
  3. Keep linking the per-app pages (`pageHref`) and the per-app review pages (already done).
- **Owner options (these go beyond app parity, spec 09 O5 (c)):**
  - (a) A server-rendered «Что внутри разбора» list of the article's section headings (`research.toc` titles). This
    shows the structure, not the paid text.
  - (b) A 2–3 sentence public lead per topic. It could reuse the old site's public `summary.lead`, labelled
    «Из прежней версии разбора».
  - (c) Accept the ranking risk.

  Even with the fixes above and (a), a locked page stays at about 500–700 words.
- **Before deploy:**
  - Export a Search Console baseline (queries, clicks, positions) for the 70 URLs `/ru|en/segment/<launch>`, plus
    `/ru|en` and `/ru|en/ideas`.
  - Compare 2 and 4 weeks after launch.

## S2 · major · topic titles drop the ranking keywords

- **Web:** `src/app/(site)/site/[lang]/segment/[slug]/page.tsx:43`
  `const title = \`${category.name} — ${t("Разбор")}\``. The template «%s — inApp» comes from
  `src/app/(site)/site/[lang]/layout.tsx:34`.
- **Source:**
  - Spec 09 G9 (`spec/09-critic-gaps.md:305`) proposed `{category name} — {L("Разбор")} — inApp`. That proposal
    ignored the titles now ranking.
  - Old title: `src/app/(old)/segment/[slug]/page.tsx:116-117`, «Идеи приложений: ${catName} — что построить в нише
    2026» / "App ideas: ${catName} — what to build in this niche 2026".
- **Evidence:**
  - Old: «Идеи приложений: Привычки и стрики — что построить в нише 2026» (62) and "App ideas: Habit tracking — what to
    build in this niche 2026" (60).
  - New: «Привычки — Разбор — inApp» (25) and "Habits — Breakdown — inApp" (26).
  - The shortest title is «Бег — Разбор — inApp» (20).
  - The en H1 also changed from "Habit tracker" to "Habits".
- **Fix:** keep the H1 as the app's name (parity). Change only the `<title>`, `og:title` and `twitter:title`, which
  are web-only strings in `src/site/features/research/strings.ts`, with a fallback when the title exceeds 60
  characters.

  | L | `seoTitle` (layout appends the brand) | `seoTitleShort` (when `name + seoTitle + brand` > 60 chars) |
  |---|---|---|
  | ru | `{name}: разбор отзывов и идеи приложений` | `{name}: разбор приложений` |
  | en | `{name}: app review breakdown and ideas` | `{name}: app review breakdown` |
  | de | `{name}: App-Analyse aus Bewertungen` | `{name}: App-Analyse` |
  | fr | `{name} : décryptage des avis d’apps` (U+202F before «:», as in the fr strings) | `{name} : décryptage` |
  | ja | `{name}アプリの口コミ分析` | same |

  I measured these against the real 35 names:
  - ru 45–60 characters, de 43–60, ja 19–31;
  - en 46–63 and fr 42–65 (2 titles over 60 in each, acceptable).

  Example: «Привычки: разбор отзывов и идеи приложений — inApp».

  Brand separator: spec 08 §5 (`spec/08-landing-brief.md:612-616`) uses «—» for ru/en and «–» for de/fr/ja, and the
  landing follows it, while `layout.tsx:34` uses «—» for every locale. Make the template per-locale:
  `template: lang === "ru" || lang === "en" ? "%s — inApp" : "%s – inApp"`.

## S3 · major · catalog titles and descriptions are too short; `/ru/ideas` loses its keyword title

- **Web:**
  - `src/app/(site)/site/[lang]/segment/page.tsx:35-36`
  - `src/app/(site)/site/[lang]/ideas/page.tsx:31-32`
- **Source:**
  - Spec 09 G9 (`spec/09-critic-gaps.md:304,307`).
  - Old `/ru|en/ideas`: `src/app/(old)/ideas/page.tsx:28`, «Идеи приложений под реальный спрос из отзывов» / "App
    ideas backed by real demand from reviews", descriptions of 138/129 characters. It is in today's sitemap with
    priority 0.95.
- **Evidence (title / description lengths):**
  - `/segment`: ru 15/51, en 18/57, de 16/53, fr 19/64, ja 10/25.
  - `/ideas`: ru 12/31 «Идеи — inApp» / «Что можно создать или улучшить.», en 13/32, de 13/37, fr 13/33, ja 12/17.
- **Fix:** keep the H1 and subtitle from the app. Add web-only `metaTitle` and `metaDescription` to the research
  and ideas `strings.ts`. Fill the numbers from data (`catalog.categories.length`, `catalog.ideas.length`,
  `FREE_IDEAS.length`), not literals.

  | L | `/segment` title | `/segment` description | `/ideas` title | `/ideas` description |
  |---|---|---|---|---|
  | ru | Разборы ниш приложений по отзывам | {35} тем: что людям важно в приложениях и чего им не хватает — по реальным отзывам из App Store. Один полный разбор — бесплатно. | Идеи приложений из реальных отзывов | {293} идеи приложений из разборов отзывов по {35} темам: что можно создать или улучшить. {5} идей открыты бесплатно. |
  | en | App niche breakdowns from real reviews | {35} topics: what matters to people in apps and what they are missing, drawn from real App Store reviews. One complete breakdown is free. | App ideas from real user reviews | {293} app ideas from review breakdowns across {35} topics: what could be built or improved. {5} ideas are free to read. |
  | de | App-Nischen-Analysen aus echten Bewertungen | {35} Themen: Was Menschen an Apps wichtig ist und was ihnen fehlt – aus echten App-Store-Bewertungen. Eine komplette Analyse ist kostenlos. | App-Ideen aus echten Nutzerbewertungen | {293} App-Ideen aus Analysen von Bewertungen in {35} Themen: was sich bauen oder verbessern lässt. {5} Ideen sind kostenlos. |
  | fr | Décryptages de niches d’apps tirés des avis | {35} thèmes : ce qui compte pour les gens dans les apps et ce qui leur manque, d’après de vrais avis de l’App Store. Un décryptage complet est gratuit. | Idées d’applications tirées de vrais avis | {293} idées d’applications issues de décryptages d’avis dans {35} thèmes : ce qu’on peut créer ou améliorer. {5} idées sont gratuites. |
  | ja | 口コミから読むアプリ市場の分析 | {35}分野。アプリで人が大切にしていることと足りないものを、App Storeの実際の口コミから分析。ひとつの分野は無料で読めます。 | 口コミから生まれたアプリのアイデア | {35}分野の口コミ分析から生まれた{293}のアプリアイデア。何をつくれるか、何を良くできるか。{5}つのアイデアは無料で読めます。 |

  In ru, «{5} идей» needs the plural helper: 5 идей, 1 идея, 2 идеи. The same wording («один полный разбор —
  бесплатно») is already in the landing's approved description (spec 08 §5), so it adds no price claim.

## S4 · major · sitemap: exact additions (`src/app/sitemap.ts` is shared; not edited)

- **Web:** `src/app/sitemap.ts:33-60`.
- **Source:**
  - Spec 09 G9 (`spec/09-critic-gaps.md:313-316`), updated to five-locale legal pages per DECISIONS «Legal pages».
  - Spec 07 §5.9 / §7.1 (`spec/07-old-relocation-audit.md:453-454,544`).
- **Evidence (live `/sitemap.xml`):**
  - 1,390 `<url>`, all `/ru…`, with ru/en/x-default alternates.
  - Home is `<loc>https://inapp.pro/ru/</loc>`, and `/ru/` answers **308 → `/ru`** (the canonical is
    `https://inapp.pro/ru`).
  - The 35 launch topics declare 2 languages, while their HTML declares 5.
  - It contains no `/<de|fr|ja>/…`, no `/segment`, no free ideas and no legal pages.
- **Plan:**
  1. **Old in-place block.** Keep the existing code, with these changes:
     - `:46` → `...cats.filter((s) => !isLaunchCategory(s)).map(…)` (37 in-place topics stay).
     - Remove `{ p: "" }` (`:34`) and `{ p: "/ideas" }` (`:40`) from `paths`. The new block owns them.
     - `:55` and `:59`: `${BASE}/ru${p}` / `${BASE}/en${p}`. Never `${p || "/"}` (no trailing slash).
     - Keep `/ideas/top`, `/rating/*`, `/reviews/*`, per-app pages, `/mcp`, `/build`, `/most-wanted`, `/cards`,
       `/apps` as they are (ru `<loc>` plus ru/en/x-default alternates).
  2. **New block**, one `<url>` per locale, each with the full 5-locale cluster and an honest `lastmod`:
     ```ts
     import { FREE_IDEAS, isLaunchCategory, LAUNCH_CATEGORIES } from "@/site/manifest.generated";
     import { LOCALES } from "@/site/i18n/locales";
     import { getManifest } from "@/site/content";          // server-only, fs + LRU (no static JSON import)

     export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
       const built = new Date((await getManifest()).contentBuiltAt);
       const NEW_PATHS = [
         { p: "", priority: 1 },
         { p: "/segment", priority: 0.95 },
         ...LAUNCH_CATEGORIES.map((s) => ({ p: `/segment/${s}`, priority: 0.9 })),
         { p: "/ideas", priority: 0.95 },
         ...FREE_IDEAS.map((id) => ({ p: `/ideas/${id}`, priority: 0.7 })),   // NOT LAUNCH_IDEAS: 288 are noindex
         { p: "/privacy", priority: 0.3 },
         { p: "/contacts", priority: 0.3 },
         { p: "/offer", priority: 0.3 },
       ];
       const cluster = (p: string) => ({
         ...Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}${p}`])),
         "x-default": `${BASE}/en${p}`,
       });
       const fresh: MetadataRoute.Sitemap = NEW_PATHS.flatMap(({ p, priority }) =>
         LOCALES.map((l) => ({ url: `${BASE}/${l}${p}`, lastModified: built, changeFrequency: "weekly" as const,
                               priority, alternates: { languages: cluster(p) } })));
       // One-language document: ru only, no alternates (the other locales are noindex).
       fresh.push({ url: `${BASE}/ru/offer/payment`, lastModified: built, changeFrequency: "yearly", priority: 0.1 });
       return [...fresh, ...oldEntries /* step 1 */];
     }
     ```
     - That is 46 paths × 5 locales + 1 = **231 new URLs**, plus the old in-place entries.
     - The old block drops 1 + 1 + 35 = 37 entries.
     - Total ≈ 1,390 − 37 + 231 = **1,584**, well under 50,000, so a single file is fine.
  3. **Never list:** `/old`, locked ideas, `/segment?q=`, `/saved`, `/settings*`, `/plus`, `/welcome`, `/login`,
     `/library`, `/<de|fr|ja>/offer/payment`, `/<de|fr|ja>/segment/<non-launch>` (these 307 to `/en`).
  4. `lastModified` for the old block can stay `new Date()` (existing behaviour). For new URLs, use `contentBuiltAt`
     so Google can trust `lastmod`.
  5. Correction to AUDIT-PHASE-A A3 step 5: replace `LAUNCH_IDEAS` with `FREE_IDEAS` (its own rule says "never list
     anything that is noindex"). The count becomes 231, not 1,640.

## S5 · major · Open Graph images

- **Web:**
  - `src/app/(site)/site/[lang]/segment/page.tsx:42-49` and `src/app/(site)/site/[lang]/ideas/page.tsx:37-38`:
    `openGraph` has no `images`.
  - `src/site/features/legal/meta.ts:34-42`: images only when a caller passes one; none does.
  - `src/app/opengraph-image.tsx:47-55` (root file convention) says "Thousands of app reviews…", "across 65+
    niches", and "No sign-up / No paywall / Just read".
  - The landing (`src/site/features/landing/seo.ts:19-22`) uses `ResearchInterior_cover-1200.webp` (1200×800).
- **Source:**
  - Spec 09 G9 (`spec/09-critic-gaps.md:304,307,310`): "08 §5 composed OG" for `/segment`, `/ideas` and legal pages.
  - Spec 08 §5 (`spec/08-landing-brief.md:636-638`): 1200×630 per locale.
  - Spec 06 (`spec/06-site-infra.md:599` #7): the default card contradicts the paywall.
- **Evidence:**
  - The 230-URL batch finds no `og:image` on `/segment`, `/ideas`, `/privacy`, `/contacts`, `/offer` in all 5
    locales (25 URLs).
  - `/ru/plus`, `/ru/saved`, `/ru/login`, `/ru/library` and the new 404 inherit `/opengraph-image`, the old dark card
    that says "No paywall". `/plus` is the page people share.
- **Trap (verified):** a file-based `opengraph-image.tsx` (or `twitter-image`, `icon`) placed under
  `src/app/(site)/site/[lang]/**` gets the URL `/site/<L>/…/opengraph-image`.
  - The proxy matcher (`src/proxy.ts:52`) only skips `opengraph-image` at the start of the path.
  - Evidence: `curl /site/ru/opengraph-image` → **307 `/en/site/ru/opengraph-image`**, which lands on the new
    site's 404.
  - So do not use the file convention inside the new tree.
- **Fix:**
  1. Generate static, composed PNGs (1200×630) per locale with a `scripts/v2/` step. Keep PNG, not WebP: LinkedIn
     and some messengers do not accept WebP for `og:image`.
     - `public/og/<L>/home.png`, `public/og/<L>/research.png`, `public/og/<L>/ideas.png`, `public/og/<L>/legal.png`
       (fonts Onest plus Hiragino/Noto for ja).
     - Or a route under `src/app/api/site/og/` (owned by the api/site agent). `/api` is outside the proxy matcher.
  2. Set them explicitly:
     - `segment/page.tsx` and `ideas/page.tsx`: `openGraph.images: [{ url: \`${SITE_URL}/og/${lang}/research.png\`, width: 1200, height: 630, alt }]`,
       plus `twitter.images`.
     - `legal/meta.ts`: default `image` = `/og/<L>/legal.png`.
     - `landing/seo.ts:19-22`: `/og/<L>/home.png`.
  3. Stop inheriting the old card. In the new root layout's `generateMetadata`, add a default
     `openGraph: { siteName: "inApp", images: [\`${SITE_URL}/og/${lang}/home.png\`] }` so pages without their own
     `openGraph` use the new card. Or change the copy of `src/app/opengraph-image.tsx`: the old site's pages set their
     own images, so only 404s and the new pages without `openGraph` use this card.
  4. Topic and idea covers (1200×800, 3:2) can stay. Twitter and Facebook crop them to 1.91:1 around the centre. If
     the crop cuts the artwork, add 1200×630 PNG exports next to the WebP set.

## S6 · minor · Organization logo and brand identity disagree

- **Web:**
  - `src/app/(site)/site/[lang]/layout.tsx:105`: `logo: \`${SITE_URL}/api/og?logo=1\``. That URL returns a
    512×512 PNG of the **old** gradient-star logo.
  - `src/site/features/landing/LandingPage.tsx:67`: `MobileApplication.image` = `/brand/app-icon-256.png`, the
    **iOS icon** (yellow star on cobalt).
  - `src/app/(old)/layout.tsx` declares the same `@id https://inapp.pro/#org` with the old logo and
    `sameAs: ["https://telegram.me/inAppProBot"]`.
- **Fix:**
  - One logo for the entity: point `Organization.logo` and `image` in both layouts to a new-icon PNG of at least
    112 px. `/brand/app-icon-256.png` works. Better: a 512 px `public/brand/app-icon-512.png`, since
    `public/media/app-icon-512.png` already exists (manifest `appIcon`).
  - Or make `/api/og?logo=1` render the new icon (old code; not in the forbidden list).
  - Keep `sameAs` identical in both layouts, and add the App Store URL when `APP_STORE_URL` is set.
  - In the WebSite node (`layout.tsx:112`), use `inLanguage: ["ru","en","de","fr","ja"]`, so the same `@id` does
    not carry a different language on each page.

## S7 · minor · OG and Twitter tag hygiene

- **Web:**
  - `src/app/(site)/site/[lang]/ideas/page.tsx:37`: `locale: lang`, no `url`, no image; `:38` uses
    `summary_large_image` with no image.
  - `src/app/(site)/site/[lang]/ideas/[id]/page.tsx:45` and `:55-63`: `locale: lang`, no `url`.
  - `src/site/features/legal/meta.ts:39`: `locale`.
- **Evidence (batch):**
  - 45 URLs with `og:locale` = `ru|en|de|fr|ja` instead of `ru_RU` and the like.
  - 30 URLs without `og:url`: `/ideas` and the 5 free ideas, in 5 locales.
- **Fix:**
  - Use `OG_LOCALE[lang]` from `src/site/features/research/seo.ts:17-23`. Better: move it with
    `localeAlternates` to one `src/site/seo.ts`, as A3 step 1 suggests.
  - Add `url: alternates.canonical`.
  - On `/ideas`, use `twitter.card: "summary"` until the image from S5 exists.

## S8 · minor · large image previews dropped

- **Web:**
  - `src/app/(site)/site/[lang]/segment/[slug]/page.tsx:66` `robots: { index: true, follow: true }`.
  - `ideas/[id]/page.tsx:54`.
- **Source:** old topic pages `src/app/(old)/segment/[slug]/page.tsx:140`
  `robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }` (and spec 06
  `spec/06-site-infra.md:483`).
- **Fix:** use the same object on topic pages and free idea pages:
  - `{ index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }` for those pages.
  - `{ index: false, follow: true }` stays for locked ideas.
- **Why:** the 1200 px covers can then appear in Discover and image-rich results.

## S9 · minor · JSON-LD refinements (everything already parses)

- **Topic Article** (`segment/[slug]/page.tsx:137-151`) and **idea Article** (`ideas/[id]/page.tsx:128-142`):
  - Add `"datePublished"` and `"dateModified"`. Take them from `getManifest()`: `collectionDate` for
    published, `contentBuiltAt` for modified.
  - Inline `author` and `publisher` as `{ "@type": "Organization", "@id": "https://inapp.pro/#org", name: "inApp",
    url: "https://inapp.pro" }`. Today they are only `{ "@id" }`; Google's Rich Results Test does not always resolve
    references across `<script>` blocks.
  - The idea Article also needs `"@id": \`${url}#article\`` and `author`.
- **BreadcrumbList** (new, both page types), for example ru:
  `inApp › Разборы › {name}` (`/ru` → `/ru/segment` → `/ru/segment/<slug>`), and
  `inApp › Идеи › {title}` for free ideas.
- **MobileApplication** (`src/site/features/landing/seo.ts:73-86`):
  - Google's "Software app" type requires `offers` and `aggregateRating` or `review`, so Search Console will list
    it as invalid. That does not hurt rankings.
  - When `APP_STORE_URL` is set, add `offers: { "@type": "Offer", price: 0, priceCurrency: "USD" }` (a free
    download) and `applicationCategory` once the App Store Connect category is confirmed (spec 08
    `spec/08-landing-brief.md:633-634`). Add a rating only from real App Store data.
- **FAQPage:** checked. 10 questions in ld+json, and all 10 questions and answers are visible in every locale.
  There are no FAQ rich results for this kind of site (restricted since 2023), but the markup is harmless.
- **Plus viewers of paid topics** get `isAccessibleForFree: false` without `hasPart` (`:147`). Crawlers never
  see this branch, so it is fine. Do not add paywall markup (spec 09 `:319`).

## S10 · minor · long descriptions

- **Web:** `segment/[slug]/page.tsx:53` passes `category.summary` unchanged.
- **Evidence:** topic descriptions go up to de 230, fr 209 and en 185 characters. Over 160: de 27, fr 23, en 9,
  ru 1. Free ideas reach de 214 and fr 192. Every ja description is 46–77 characters, which is fine.
- **Fix:** add `clampDescription(text, locale)`:
  - limit 155 (ja: 80);
  - cut at the last sentence end within the limit, otherwise at the last space, then add «…»;
  - use it for `description`, `og:description` and `twitter:description` only (JSON-LD keeps the full text).

## S11 · minor · free idea titles lack context

- **Web:** `ideas/[id]/page.tsx:50` `title: idea.title`.
- **Evidence:** «Новая комната. Те же стены. — inApp», «План с точными размерами — inApp».
- **Fix:** `title: \`${idea.title} — ${s.ideaSuffix}\``. `ideaSuffix`: ru «идея приложения», en "app idea",
  de «App-Idee», fr «idée d’app», ja «アプリのアイデア». The H1 stays the card title.

## S12 · minor (owner) · `/old` copies send mixed signals

- **Web:**
  - `src/site/routing/decide.ts:199` sets `X-Robots-Tag: noindex, follow` for `site === "old"`.
  - The old page metadata stays unchanged by design (ARCHITECTURE §5.2). Example:
    `src/app/(old)/segment/[slug]/page.tsx:131-140`.
- **Evidence:** `/ru/old/segment/habit-tracking`:
  - header `noindex, follow`;
  - `<meta name="robots" content="index, follow, max-image-preview:large…">`;
  - `rel=canonical https://inapp.pro/ru/segment/habit-tracking`, which is now the **new**, different page;
  - hreflang ru/en pointing to the new pages.
- **Source:**
  - Spec 07 §7.1 (`spec/07-old-relocation-audit.md:541-543`) recommended a self-canonical and no hreflang on `/old`.
  - AUDIT-PHASE-A dropped this as "by design".
- **Risk:**
  - Google applies the most restrictive robots rule, so the copy is not indexed.
  - But `noindex` plus a canonical to another URL is the combination Google advises against. In the worst case the
    `noindex` is associated with the canonical target.
  - With A4 option A, only copies of new-owned URLs (launch topics, home, `/ideas`) are still linked, so exposure is
    small.
- **Fix, if the owner agrees:**
  - A helper `archiveMetadata(meta)` in `src/lib/oldSite.server.ts`. When `getOldSiteMode() === "old"`:
    - canonical = `https://inapp.pro/<L>/old<path>`;
    - delete `alternates.languages`;
    - `robots: { index: false, follow: true }`.
  - Wrap the `generateMetadata` of the old pages that have alternates: the 19 files listed in spec 07 §5.7 M7.
  - In-place responses are unaffected.

## S13 · minor (owner) · in-place pages link launch topics as `/old` copies

- **Web:** `src/lib/oldHref.ts` (option A: a new-owned path → `/<L>/old…`).
- **Evidence:**
  - `/ru/segment/qr-scanner` (in place) links «Похожие ниши» to `/ru/old/segment/{password-manager, scanner-pdf,
    translator, voice-recorder, weather-apps}`.
  - `/ru/rating/habit-tracking` links `/ru/old/segment/habit-tracking`.
  - These are exactly the internal links the new topic pages would have inherited.
- **Fix, if the owner agrees:** in in-place mode, link `/segment/<launch>` to the public URL (`publicHref`), the same
  exit the old header logo and `OldSiteBanner` already use.
  - Server components can pass `getOldSiteMode()`.
  - Client components need the mode through context (A4 option B).
  - Links inside `/old` stay in `/old`.

## S14 · minor · locked idea URLs no longer pass equity to their topic

- **Web:** `src/app/(site)/site/[lang]/ideas/[id]/page.tsx:81-120` (locked branch: artwork, lock card, promo).
- **Source:**
  - On production, `/ru|en/ideas/<id>` returns 308 to `/…/segment/<category>` (`src/app/(old)/ideas/[slug]/page.tsx`).
  - The app's locked idea preview shows the artwork only (`Inapp/Clarity/ClarityContentAccess.swift:71-73`).
- **Evidence:** `/ru/ideas/habit-tracking-1` is now 200 and `noindex, follow`, with no link to
  `/ru/segment/habit-tracking`. Any backlink to the 288 locked idea URLs stops at a `noindex` page.
- **Fix (site-only; the category is already public in the slug and in the catalog):** under the lock card, add one
  plain link: «Разбор темы: {category name}» → `routes.topic(lang, category)`. en "Topic breakdown: {name}", de
  «Analyse zum Thema: {name}», fr «Décryptage du thème : {name}», ja «テーマの分析：{name}».

## S15 · minor · IndexNow, `llms.txt`, `feed.xml`

- **Web:**
  - `src/app/api/indexnow/route.ts:28-33` pings `ru` and `en` only: the old topics (including the 35 launch
    topics), `/ideas/top`, `/rating/*` and per-app pages. No de/fr/ja, no `/segment`, no free ideas.
  - `llms.txt` and `feed.xml` list 28 `/en/segment/<slug>` URLs with the **old** dossier text (for example
    calendars-tasks, a launch topic). The header of `llms.txt` says "Bilingual (Russian / English)".
- **Source:** spec 09 G9 (`spec/09-critic-gaps.md:320-322`).
- **Fix:**
  - Build the IndexNow `urlList` from the sitemap in S4 (the snippet in A3 step 6 works as is, so the lists can't
    drift).
  - Regenerate the launch-topic entries of `llms.txt` and `feed.xml` from public fields (name + summary + URL, all 5
    locales), and change the header to list the 5 languages.

## S16 · minor · `offer/payment` non-ru locales: `noindex` plus a cross-canonical

- **Web:** `src/app/(site)/site/[lang]/offer/payment/page.tsx:23-29`.
- **Fix:** pick one signal:
  - either keep `noindex` with a self-canonical;
  - or, preferred, drop `noindex` and keep the canonical to `/ru/offer/payment`. It is the same Russian document,
    and the canonical alone consolidates it.

---

## Redirect status codes (307 vs 308): correct as built

| Request | Status → target | Verdict |
|---|---|---|
| `/` | 307 → `/<negotiated>` (checked with `en` and `ru` Accept-Language) | correct. Negotiation must stay temporary. Google crawls with no cookie → `/en` = x-default. Same as production. |
| bare paths (`/segment/x`, `/ideas`, `/offer`, `/contacts`) | 307 → `/<negotiated>/…` | correct, the same as production's proxy. |
| `/<L>/research[/…]`, `/<L>/search?q=` | 308 → `/<L>/segment[/…]` (query kept) | correct. These are permanent aliases, and `/search` was the old SearchAction target. |
| `/<de|fr|ja>/segment/<non-launch>`, `/<de|fr|ja>/<old-only>` | 307 → `/en/…` | correct. They become real pages when the topics are rewritten (DECISIONS §4), so they must not be cached. |
| `/<L>/ideas/<non-launch id>` | 308 → `/<L>/segment/<category>` (in place) | correct, unchanged from production. |
| `/<L>/segment/<launch>/v2` | 308 → topic | correct. |
| `/ru/`, `/en/` | 308 → `/ru`, `/en` (Next trailing slash) | correct. The sitemap must stop listing the slash form (S4). |
| `/<L>` signed in | 307 → `/<L>/segment` | correct. Crawlers are signed out. |
| `/ru/library` without `?checkout` | 307 → `/ru/saved` | fine (both noindex). |
| `/old…`, `/<de|fr|ja>/old/…` | 307 → `/<ru|en>/old/…` | fine (noindex target). |

Spec 07 §7.2's plan to move 307 to 308 after 2–4 weeks no longer applies: nothing indexed redirects into `/old`.
Keep the 307s above as they are.

## robots.txt: no change needed

- Live output: `Allow: /` for `*` and 22 named bots, `Host: https://inapp.pro`, and
  `Sitemap: https://inapp.pro/sitemap.xml` (`src/app/robots.ts:32-37`). It is correct.
- **Do not add** `Disallow: /old`. Crawlers must see its `noindex` (spec 07 `:545`).
- **Do not add** `Disallow: /api/`. The Organization logo `/api/og?logo=1` and the old pages' OG images live there.
- `/site/<L>/…` is unreachable from outside (it 307s to `/<L>/site/…`, which is a 404), so no rule is needed.
- `Host` is ignored by Yandex since 2018. It is harmless.

## hreflang consistency

- **New pages** (230 URLs): every page lists the same 6 links, and every target returns 200 with a self-canonical,
  so the clusters are reciprocal.
- **Noindex new pages** (`/saved`, `/settings*`, `/plus`, `/login`, `/library`, locked ideas) also carry hreflang.
  Google ignores hreflang on noindex pages; the tags could be dropped, but that is optional.
- **In-place old pages** (37 non-launch topics, `/rating`, `/reviews`, per-app pages): ru/en/x-default → `/en/…`,
  unchanged from production. The de/fr/ja variants of these URLs 307 to `/en`, and no hreflang or new-site link
  points at them. The de catalog links `/en/segment/<old>` directly, with `hreflang="en"`.
- **Same URL, bigger cluster:** `/ru|en`, `/ru|en/ideas` and the 35 `/ru|en/segment/<launch>` go from 2 languages
  (production) to 5. That is fine; update the sitemap (S4) so it does not declare a 2-language cluster.
- **`/old` copies** still declare ru/en hreflang to public URLs that don't link back. Google ignores these as
  non-reciprocal. See S12.

## Duplicate content: new vs `/old`

- `/<L>/segment/<launch>` (new) and `/<L>/old/segment/<launch>` are **not duplicates**. They have different text
  (new app editorial vs old dossier; for example 1.5k vs 15.3k characters), and every `/old` response carries
  `X-Robots-Tag: noindex, follow`. The only issue is the mixed signals in S12.
- `/<L>/segment/<non-launch>` (in place) and its `/old` copy are exact duplicates. The copy is `noindex`, its
  canonical points to the in-place URL, and after A4 it is linked only from inside the archive. This is fine.
- `/<de|fr|ja>/offer/payment` duplicates `/ru/offer/payment` (the Russian text). It is `noindex` with a canonical to
  ru; see S16.
- Search and filter variants:
  - `/<L>/segment?q=` is `noindex` with a canonical to `/<L>/segment`;
  - `/<L>/ideas?q=&category=` keeps `index` with a canonical to `/<L>/ideas`.

  Both are fine.
- The ideas catalog repeats the hidden hint «Подробности идеи доступны в Plus.» 288 times in the HTML
  (`src/site/features/ideas/IdeasCatalog.tsx:127` → `IdeaCard` hint). This is boilerplate text for crawlers. Render
  it once, with an `id`, and point `aria-describedby` at it from each locked card.

## Current rankings: what could drop `/ru|en/segment/<slug>` and `/ru|en/ideas/<id>`

- **`/ru|en/segment/<launch>` (70 URLs):** in order of impact:
  - S1: content;
  - S2: title and keywords;
  - S13: fewer internal links from in-place pages;
  - S8: image previews;
  - S12: archive signals.

  URL, status, self-canonical and indexability are all preserved.
- **`/ru|en/segment/<non-launch>` (74 URLs, in place):** unchanged. The metadata is identical to production; they
  gain links from the new catalog («Скоро в новом формате») and lose none (A4 fixed).
- **`/ru|en/ideas/<id>`:** today every old idea slug (851) 308s to its topic, so none is indexed. There is nothing
  to lose. After launch:
  - 5 free ideas × 5 locales become new indexable pages;
  - 288 locked ideas are `noindex` (S14: add the topic link so backlinks keep flowing);
  - the other 558 old ids keep the 308 to their topic.
- **`/ru|en/ideas`:** S3.
- **`/ru|en`:** the new keyword title and description follow spec 08 §5 (ru 50/152, en 52/157, de 54/160, fr 54/149,
  ja 34/85). The body is server-rendered text (11k characters) and links all 35 topics.

## Verification after fixes

1. Run `node --import tsx scripts/v2/audit/seo-routes.ts --source code --strict`. Expect exit 0 once S4 lands.
2. After the integrator's build:
   ```
   curl -s http://127.0.0.1:3000/ru/plus | grep og:image
   ```
   It must show `https://inapp.pro/…`, not `localhost`. In dev, file-based OG images always resolve against
   localhost (`next/dist/lib/metadata/resolvers/resolve-url.js:63-64`), so dev can't prove this.
3. Re-run the 230-URL batch. Expect 0 problems in:
   - status, canonical, hreflang, robots, `og:image`, `og:url`, `og:locale`;
   - JSON-LD parsing.
4. Run Google's Rich Results Test on these pages (ru and ja):
   - `/ru/segment/interior-design` (Article + Breadcrumb);
   - `/ru/segment/habit-tracking` (WebPage);
   - `/ru/ideas/interior-design-1`;
   - `/ru` (WebSite, MobileApplication, FAQPage).
