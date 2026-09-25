# content/v2 — generated app content for the new site

Everything in this folder (except this README) and everything in `public/media/{ideas,research,welcome}`
plus `public/media/app-icon-*.png` is **generated** from the iOS app bundle
(`app_04_inapp/Inapp/Resources`). Do not edit it by hand — change the app packs and re-import.
Contract: `docs/site-v2/spec/04-content-data-model.md` §7 (types in `src/site/content/types.ts`).

## Regenerate

```bash
# 1. Import + validate + write content/v2 and src/site/manifest.generated.ts
npx tsx scripts/v2/import-app-content.ts
#    validate only, write nothing:
npx tsx scripts/v2/import-app-content.ts --check

# 2. Export the artwork to public/media (WebP; unchanged images are skipped)
node scripts/v2/export-images.mjs            # --force re-encodes everything

# 3. Consistency check of the generated output (no app sources needed; CI-friendly)
npx tsx scripts/v2/check-content.ts

# Rating (web-only section, opt-in step; the full import above does not run it). Writes ONLY
# <locale>/rating/** and never the manifest; also reads the web's src/data/peoplesRating (numbers,
# order, icons, screenshots, reviews read) and scripts/v2/data/rating-seo.json (SEO terms, intros).
npx tsx scripts/v2/import-app-content.ts --only=rating            # --check: validate only
node --import tsx scripts/v2/test-rating.ts                        # rating helpers, rating-seo.json, reader, SEO, sitemaps
```

Environment:

| Variable | Default | Used by |
|---|---|---|
| `APP_RESOURCES` | `~/projects/app_04_inapp/Inapp/Resources` | import (export reads `manifest.source.path` when unset) |
| `APP_GIT_COMMIT` | `git -C $APP_RESOURCES rev-parse HEAD` if it is a checkout | import (recorded in `manifest.source.gitCommit`) |
| `ALLOW_COUNT_CHANGE=1` | off | import: turns the fixed counts (35 topics / 293 ideas / 792 quotes) into warnings when the app's edition changes |
| `EXPORT_CONCURRENCY` | ½ of the CPU cores (2–8) | export |
| `CONTENT_V2_DIR` | `<cwd>/content/v2` | runtime loaders (`src/site/content/index.ts`) |

The importer also reads a few Swift files next to `Resources/` (`Content/LaunchEdition.swift`,
`Clarity/ClarityContentAccess.swift`, `Models/ResearchProduct.swift`) for the launch list, the free
layer and the corpus constants, and drift-checks the hand-coded artwork / onboarding tables it ports
(`ClarityResearchArtwork.swift`, `ClarityWelcomeExamples.swift`). If one of those changed, the import
fails with a "drift" error: update the table in `scripts/v2/import-app-content.ts`.

Validation runs before anything is written; any error exits 1 and leaves the previous output
untouched. A re-run with unchanged sources rewrites nothing (and keeps `contentBuiltAt`).

## What to commit

Commit all of it together, in one change:

- `content/v2/**` (≈ 12 MB: manifest, `_build/used-images.json`, `_build/media-stamp.json`, 5 locales;
  the rating files add ≈ 20 MB since they carry the icon and screenshot paths: ru ≈ 11, en ≈ 8)
- `public/media/**` (≈ 38 MB of WebP + 2 PNG icons)
- `src/site/manifest.generated.ts` (routing manifest imported by the proxy)

The app sources and the 120 MB of source JPEG/PNG stay in the app repo.

## Layout

```
manifest.json                 locales, launch list (35), idea ids (293), free layer, corpus, welcome art,
                              app icon, per-locale stats, source sha256 + resolved pack per locale
_build/used-images.json       input of export-images.mjs (asset → output name, widths, source sha256)
_build/media-stamp.json       export cache (skip unchanged images)
<locale>/                     ru | en | de | fr | ja
  catalog.json                PUBLIC-SAFE: 35 categories (name, summary, cover), 293 ideas (slug, category, rank, free, cover)
  cards.json                  SERVER-ONLY: idea card title + description (strip paid entries for non-Plus)
  search.json                 SERVER-ONLY: normalized haystacks (research bodies include locked text)
  onboarding.json             PUBLIC: 5 article excerpts + 5 free ideas
  ui.json                     PUBLIC: app UI strings (keys = Russian source) + plural forms; ru = identity
  research/<category>.json    GATED except interior-design
  ideas/<id>.json             GATED except interior-design-1…5
ru/, en/rating/index.json     PUBLIC: rating niches (slug, name, nameLang, count, totalReviews, intro,
                              updatedAt, leaders = ranks 1–4 with id, title, short, icon, realScore)
                              + stats (incl. appsWithIcon, appsWithShots, shots) + generatedAt
                              (max updatedAt) + source sha256
ru/, en/rating/<niche>.json   PUBLIC (the whole rating is free, spec 11 D2), read on the server only
                              (size): apps in raw peoplesRating order = rank order (the URL slugs
                              depend on it) with numbers, texts and quotes, plus `short` (display
                              name), `icon` / `shots` (compact mzstatic paths, ≤ 10 shots; URLs via
                              src/site/features/rating/media.ts), `reviewsRead`; the niche's `seoName`
                              (ru: genitive completing «Лучшие приложения для …», lowercase except
                              proper nouns; en: a noun phrase for "Best … apps"), `intro` (one
                              sentence, null only for astrology), `updatedAt`; scenarios
de/, fr/, ja/rating/overlay.json   own launch-topic names + quote translations over the en files
```

The rating files are outside `manifest.contentHash` (their step does not write the manifest);
`check-content.ts` validates them separately. Types: `src/site/content/rating-types.ts`; read them
only through `src/site/sitedata/rating.ts`. `updatedAt` (YYYY-MM-DD, UTC) is kept while a niche
file's content is unchanged and set to the import day otherwise; the sitemap routes read it as
`lastmod` (`/sitemap.xml` for the niches, with the index `generatedAt` for the hub;
`/sitemap-rating-{ru,en}.xml` for app and task pages), so a re-import that changes nothing keeps
them stable (IndexNow gets only the niches the latest import changed). `seoName` and `intro` of the
71 shown niches come from `scripts/v2/data/rating-seo.json` (edit it and re-import to change the
wording), and so does an optional `name` override of a topic name (the 9 non-launch topics whose
English name was a raw «… apps» label); `astrology` (not shown) keeps the peoplesRating name.

Read it only through `src/site/content` (server-only loaders with an LRU); image URLs via
`src/site/content/media.ts`; reading rules (NBSP, reflow, corpus sentence, plurals) via
`src/site/content/text.ts`; catalogue search/ordering via `src/site/content/search.ts`.

## Decisions baked into the import

- Every fallback of the app is resolved at build time (spec 04 §4.2): de/fr/ja use `rich.en` for
  quotes and corpus numbers; quotes show the own-locale translation, else the evidence translation,
  else the original (never another language's translation). Two de/fr/ja quotes have no translation
  and show English, exactly like the app (`run-tracking/pause`, `flashcards/generation`).
- Editorial overrides (ru, sha256-verified) are applied like the app: to `text.ru`, `rich.ru`,
  `studio.json`, and to every rendered text block. Titles and quotes are never rewritten.
- Text keeps its NBSPs; the renderer applies the app's NBSP→space and 430/360 reflow via
  `paragraphs()` in `text.ts`.
- Alt texts: the app's reader labels, localized through `ui.<locale>.json` (all 213 are translated
  there); idea covers are decorative (`alt: ""`), like the app.
- Russian-only `audience`/`buyer` text is in the ru idea search haystack only (spec 09 §5 #25).
- The privacy-sheet hero `ClarityResearch` is exported with the welcome art (spec 09 C4): 511 images.
