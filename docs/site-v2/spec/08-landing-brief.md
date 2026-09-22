# 08 — Landing brief (signed-out front door at `https://inapp.pro/<locale>`)

Status: research brief, 2026-09-22. Scope: content, structure, assets and SEO for the new landing shown to
signed-out visitors at `/<locale>` (`ru`, `en`, `de`, `fr`, `ja`). The App Store "marketing URL" points here
(`AppStore/Release-2026-09-21/metadata/<loc>/marketing_url.txt`: `ru` → `https://inapp.pro/ru`, every other
locale incl. `de-DE`, `fr-FR`, `ja` → `https://inapp.pro/en`).

Path abbreviations used below:

| Abbrev. | Absolute path |
|---|---|
| `APP/` | `/Users/artsaverin/projects/app_04_inapp/Inapp/` (the live iOS app; UI = `APP/Clarity/*`) |
| `RES/` | `/Users/artsaverin/projects/app_04_inapp/Inapp/Resources/` |
| `XCA/` | `/Users/artsaverin/projects/app_04_inapp/Inapp/Resources/Assets.xcassets/` |
| `REL/` | `/Users/artsaverin/projects/app_04_inapp/AppStore/Release-2026-09-21/` |
| `ASO/` | `/Users/artsaverin/projects/app_04_inapp/aso/store-2026-09-16/` |
| `OLD/` | `/Users/artsaverin/projects/badcomment-v2/src/` (current site, moves under `/old`) |

Source-tag legend for every copy line: **[store]** = App Store metadata (`REL/metadata/<loc>/*.txt`, identical to
`REL/metadata.json`); **[ui]** = verbatim in-app string (Russian key in Swift + value in `RES/ui.<lang>.json`);
**[shot]** = App Store screenshot poster text (`/Users/artsaverin/projects/app_04_inapp/Tools/render_storefront.swift:14-25`);
**[content]** = editorial content pack (`RES/*.json`); **[new]** = written for this landing (needs native review
for `de`/`fr`/`ja`).

---

## 0. TL;DR for implementers

1. The landing is the web counterpart of the app's 4-page onboarding (`APP/Clarity/ClarityOnboarding.swift:18-24`)
   plus its paywall (`APP/Clarity/ClarityPaywall.swift`). Every section below maps to a real screen or string.
2. Hero CTAs: **"Open web version"** (primary) + **official App Store badge** (secondary) + text link
   **"Read the free breakdown first"** (tertiary, verbatim in-app string, `APP/Clarity/ClarityContentAccess.swift:95`).
3. App Store id **6814396315** (`REL/asc-app.json` → `data[0].id`; `REL/README.md:3`). Link:
   `https://apps.apple.com/app/id6814396315`. As of `REL/README.md:6` the app, annual subscription, lifetime purchase
   and subscription group are all **WAITING_FOR_REVIEW** (submitted 2026-09-21 09:58 UTC) → ship behind a flag
   (`APP_STORE_LIVE=false` ⇒ show "Coming soon to the App Store" text, no badge, no link, no Smart App Banner).
4. True numbers only: **35** breakdowns, **293** ideas, **1** free breakdown (Interior design) + **5** free ideas,
   **744 775** reviews of **2 356** apps behind the 35 published breakdowns, **18 442** reviews of **61** apps behind
   the free one, **5** languages, snapshot **August–September 2026**. See §3 for provenance and the 1.4M caveat.
5. Never show titles/descriptions of paid ideas (only their artwork) — parity with `APP/Clarity/ClarityIdeaCard.swift:3`
   ("Paid ideas expose only artwork. Their text is not in the view or accessibility tree.") and `REL/README.md:12`.
   Breakdown (topic) names and one-line summaries are public in-app (catalog card, `APP/Clarity/ClarityCatalogs.swift:43-66`).
6. No free trial anywhere (removed in App Store Connect: `REL/trial-removal-verified.json` → `removed: 175, remaining: 0`;
   `REL/README.md:13-14`). The app still contains dormant trial copy — do not copy it (§10).
7. Keep `/<ru|en>/contacts` and `/<ru|en>/offer` at the root (NOT under `/old`): they are hard-coded in the shipped
   binary (`APP/Strings/Strings.swift:270-273`) and in App Store metadata (`support_url.txt`).

---

## 1. Positioning — one sentence per locale (from store metadata)

Built from description line 1 + paragraph 2 of `REL/metadata/<loc>/description.txt` (lines 1-3). The audience is
"app developers and founders" (`REL/review-notes.txt:1`).

| Locale | Positioning sentence | Source |
|---|---|---|
| ru | Найди идею приложения в задачах, о которых люди уже пишут в отзывах: inApp — 35 редакторских разборов и 293 идеи приложений на основе открытых отзывов. | [store] ru/description.txt:1,3 |
| en | Find your next app idea in the problems people already describe: inApp brings together 35 editorial breakdowns and 293 app ideas drawn from public app reviews. | [store] en-US/description.txt:1,3 (en-GB/AU/CA identical) |
| de | Finde deine nächste App-Idee in den Problemen, die Menschen bereits beschreiben: inApp vereint 35 redaktionelle Analysen und 293 App-Ideen auf Grundlage öffentlicher App-Bewertungen. | [store] de-DE/description.txt:1,3 |
| fr | Trouve ta prochaine idée d’application dans les problèmes que les gens décrivent déjà : inApp réunit 35 analyses éditoriales et 293 idées d’applications tirées d’avis publics. | [store] fr-FR/description.txt:1,3 (fr-CA identical) |
| ja | 次のアプリのアイデアを、すでに語られているユーザーの悩みから見つけよう。inAppには、公開されているアプリの口コミをもとに編集した35分野の分析と293のアプリアイデアを収録しています。 | [store] ja/description.txt:1,3 |

What inApp is NOT (use as guard-rails, `REL/review-notes.txt:1`): "It does not generate apps, track App Store ranks
or promise revenue." Store wording (ru/description.txt:6): «Это наблюдения и гипотезы для проверки, а не обещания
спроса или дохода.»

Store listing reference (for tone and keywords; do not copy names verbatim into H1):

| Locale | App Store name | Subtitle | Promotional text |
|---|---|---|---|
| ru | Идеи приложений и ниши: inApp | 35 разборов, 744 775 отзывов | 35 разборов и 293 идеи приложений. Пойми потребности за реальными отзывами, сохрани находки и выбери следующий шаг. Один полный разбор — бесплатно. |
| en-US | App Ideas & Niches: inApp | 35 dossiers, 744,775 reviews | 35 breakdowns. 293 app ideas. Discover the needs behind real reviews, save your findings and take the next step. One complete topic is free. |
| en-GB (primary locale, `REL/asc-app.json` `primaryLocale`) | Niche Research & Ideas: inApp | 35 markets, 744,775 reviews | same as en-US |
| en-AU / en-CA | App Ideas & Niche Gaps: inApp / Find App Ideas & Niches: inApp | Market research from reviews | same as en-US |
| de-DE | App-Ideen & Marktlücken: inApp | Nischen, Bewertungen, Probleme | 35 Analysen und 293 App-Ideen. Verstehe die Bedürfnisse hinter echten Bewertungen und halte deine Erkenntnisse fest. Ein ganzes Thema ist kostenlos. |
| fr-FR | Avis et idées de niche : inApp | Étude de marché pour startup | 35 analyses et 293 idées d’applications. Comprends les besoins derrière les avis et garde tes découvertes. Un thème complet est gratuit. |
| fr-CA | Avis, idées et marché : inApp | Recherche, plaintes, prix, PME | same as fr-FR |
| ja | アプリ市場調査とアイデア図鑑: inApp | 口コミから探る35分野と293のアイデア | 35分野の分析と293のアプリアイデア。実際の口コミからニーズを読み解き、発見を保存して次の一歩へ。ひとつの分野を無料で読めます。 |

Owner convention (memory `aso-house-conventions.md`): brand goes at the END ("<keyword part>: inApp"). Apply the same to
`<title>` tags (§5).

---

## 2. Routing and audience rules (landing-specific)

| Rule | Recommendation | Evidence / reason |
|---|---|---|
| Who sees it | Signed-out visitors (and crawlers) at `/<locale>`. | User request. |
| Signed-in visitor at `/<locale>` | 307 → web app home (`/<locale>/research`, the web twin of the first tab "Разборы"). Keep the landing reachable for them via the footer link "О приложении" (optional). | App root = catalog tab 0 (`APP/Clarity/ClarityRoot.swift:57-61`). |
| Bare `/` | Redirect to `/<locale>` by cookie → `Accept-Language` among `ru,en,de,fr,ja` → default `en`. | App default language is `en` (`RES/locales.json` → `"default": "en"`, `available: [ru,en,ja,de,fr]`). Old proxy did the same for ru/en (`OLD/proxy.ts:5-8`). |
| `/en` visited from a de/fr/ja App Store page | Serve English (explicit locale in URL wins); show a dismissible one-line hint "Deutsch · Français · 日本語 available" if `Accept-Language` prefers another supported locale. Never auto-redirect an explicit locale. | de/fr/ja marketing URLs point to `/en` (`REL/metadata/{de-DE,fr-FR,ja}/marketing_url.txt`). |
| "Open web version" target | `/<locale>/research` (catalog). | Web twin of the app's first screen. Parity alternative: free readers land on the free breakdown after onboarding (`ClarityRoot.swift:49-50`: `"sample"` → `.research(freeCategory)`); that is what the tertiary link does. |
| "Read the free breakdown first" target | `/<locale>/research/interior-design` | `ClarityContentAccess.swift:6` `freeCategory = "interior-design"`; same label in-app `:95`. |
| Old site link | Footer "Previous version of the site" → `/old` (+`/ru` for ru, `/en` for others; old site only has ru/en: `OLD/lib/i18n.ts:5`). | User request. |
| Must stay at root | `/ru/contacts`, `/en/contacts`, `/ru/offer`, `/en/offer`. | Hard-coded in the shipped binary: `APP/Strings/Strings.swift:270-273` (`Links.terms`, `Links.contact`, prefix only `ru`/`en`), used by Settings "Написать разработчику" / "Условия использования" (`APP/Clarity/ClaritySettings.swift:57,71`); App Store `support_url` = `https://inapp.pro/<ru|en>/contacts`. |

Route names `/research`, `/ideas`, `/research/<slug>`, `/ideas/<slug>` are placeholders — align with the routing spec.

---

## 3. Numbers you may print (and where they come from)

| Claim | Value | Provenance | Verified how |
|---|---|---|---|
| Published breakdowns (topics) | **35** | `APP/Content/LaunchEdition.swift:6-18` (35 slugs); catalog filters by it (`APP/Clarity/ClarityCatalogs.swift:24-26`) | counted |
| Published ideas | **293** | `RES/idea-cards.{ru,en,de,fr,ja}.json` → 293 entries each; `REL/README.md:11` | counted |
| Free breakdown | **1** — Interior design and floor plans | `APP/Clarity/ClarityContentAccess.swift:6` | code |
| Free ideas | **5** — `interior-design-1…5` | `APP/Clarity/ClarityContentAccess.swift:7` | code |
| Paid ideas | **288** (293 − 5) | derived | arithmetic; prefer the in-app phrasing «Остальные — в Plus» instead of printing 288 |
| Reviews behind the 35 breakdowns | **744 775** reviews of **2 356** apps | sum of `corpusReviews` / `corpusApps` over the 35 slugs in `RES/rich.ru.json` and `RES/rich.en.json` (both give 744 775 / 2 356); each breakdown shows its own number in-app via `APP/Clarity/ClarityReader.swift:424-437` ("Мы изучили %1$@ %2$@ о работе %3$@ %4$@."); same number is the live App Store subtitle | recomputed today |
| Free breakdown corpus | **18 442** reviews of **61** apps | `RES/rich.*.json` → `interior-design`; visible on screenshot `REL/raw/store-en-02-research.png` ("We studied 18,442 reviews about how 61 apps work.") | recomputed + screenshot |
| Whole research archive | **1 451 072** reviews of **4 623** apps ("1,4 млн отзывов") | Onboarding page 1: `APP/Clarity/ClarityOnboarding.swift:18,20,74`; = sums over all 72 bundled categories | recomputed. **Caveat:** only 35 of the 72 categories are published. ASO rules (`ASO/README.md` §3, lines ~131-160) allow it only as "the archive the research is built on", printed next to "35 breakdowns". Recommendation: headline uses 744 775; 1.4M appears only in the FAQ with the archive framing (open question Q3). |
| Languages | **5** — ru, en, de, fr, ja | `RES/locales.json`; `REL/README.md:10`; store description para "Читай на своём языке" | file |
| Snapshot date | August/September 2026, "not a live market feed" | `REL/review-notes.txt:9`; collection built 2026-09-05 (`RES/studio.json` `builtAt`; shown in-app as «Сборник от …», `APP/Clarity/ClaritySettings.swift:303`) | file |
| Interior design breakdown structure | 3 parts, 7 observations, 3 audiences, 8 directions, 8 ideas (5 free) | `RES/research-editorial.<lang>.json` → `categories["interior-design"]` | counted (optional to print) |
| Coming next | Cycling, yoga, identifying plants and animals | `APP/Clarity/ClarityCatalogs.swift:69-71` | code |

Forbidden (from `ASO/README.md` lines 10-12, 50-60, 155-162 and code): "72 niches", "592 ideas" (bundle, not
published), "160 problems" (no such screen in release), "ratings/top/worst apps" (Guideline 3.2.2(i)), any demand or
revenue promise, "free trial", "Pain Index", superlatives, third-party app icons or app names next to quotes (the in-app
quote block renders text only: `APP/Clarity/ClarityReader.swift:858-876`; onboarding shows only "From a user review" +
star rating: `ClarityWelcomeContentPreview.swift:89-94`). Do not claim "App Store and Google Play" as sources (legacy
string `APP/Strings/Strings.swift:257`; the 160 traced quote sources in `RES/quote-sources.json` are all `store: apple`)
— say "public app reviews" / «открытые отзывы» as the store description does.

Number formatting: use `Intl.NumberFormat(locale)` → ru `744 775` (NBSP), en `744,775`, de `744.775`, fr `744 775`
(narrow NBSP), ja `744,775`. Russian plurals must follow CLDR (`отзыва`/`отзывов`, `приложения`/`приложений`), exactly
like `ClarityReader.swift:432-443`.

---

## 4. Section list, final copy and assets

Onboarding → landing mapping (the landing replaces the app's pre-paywall story for web visitors):

| App onboarding page (`ClarityOnboarding.swift:18-24`) | Visual in app | Landing section |
|---|---|---|
| 0 «1,4 млн отзывов» / «Изучили отзывы о 4 623 приложениях…» | `WelcomeReviews_v7` + 3 animated review cards (`ClarityWelcomeIllustration.swift:54,74-93`) | S2 Numbers (with 744 775 headline, see §3) |
| 1 «Разборы отзывов» / «В каждом разборе — выводы и отзывы, на которых они основаны.» | Carousel of 5 article+quote "papers" (`ClarityWelcomeContentPreview.swift:27-30`, `ClarityWelcomeExamples.swift:100-106`) | S1 hero visual + S5 Inside the breakdowns |
| 2 «Идеи приложений» / «Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться.» | Carousel of the 5 free ideas, 2 per page (`ClarityWelcomeContentPreview.swift:31-35`) | S4 Five free ideas |
| 3 «Новые выпуски» / «С обновлениями приложения регулярно добавляем новые темы, разборы и идеи.» | `WelcomeLibrary_v7` + topic stickers «Интерьер», «Привычки», «Личные финансы» (`ClarityWelcomeIllustration.swift:95-106`) | S7 35 topics + coming next |
| 4 Paywall «Полный доступ» | `WelcomeResearch_v7` + `WelcomeProduct_v7` + `WelcomeLibrary_v7` (`ClarityPaywall.swift:151-189`) | S10 Plus |

Page order: **S0 Header → S1 Hero → S2 Numbers → S3 Free breakdown → S4 Five free ideas → S5 Inside the breakdowns →
S6 How it works → S7 35 topics → S8 How we treat reviews → S9 Web + iPhone → S10 Plus → S11 FAQ → S12 Final CTA →
S13 Footer.** Anchors: `#research`, `#ideas`, `#plus`, `#faq`.

Design tokens to reuse (so the landing and the web app feel like the iOS app): palette from
`APP/Studio/StudioStyle.swift:5-20` and `Documentation/LibraryRefresh-2026-09-20/README.md` table — background
`#F5F5F7`/`#111214`, surface `#FFFFFF`/`#1D1E22`, ink `#191A20`/`#F2F2F5`, secondary `#666872`/`#AAADB8`,
accent `#3458DB`/`#94AAFF`, selected `#EDF1FF`/`#262D45`, line `#DEDFE5`/`#383A42`; primary buttons = white on
`#3458DB`. Marketing/onboarding type = **Onest** variable (`APP/Clarity/ClarityWelcomeTypography.swift:15-32`,
file `RES/Fonts/Onest.ttf`, OFL `Onest-LICENSE.txt`), titles weight 900; reading/excerpt type = **Georgia** serif
(`APP/Clarity/ClarityReadingStyle.swift:4,15,18`). Neither covers Japanese → `ja` falls back to system sans
(Hiragino Sans / Noto Sans JP) and serif (Hiragino Mincho / Noto Serif JP). Poster colours of the App Store
screenshots (`Tools/render_storefront.swift:27`): `#204AF0→#557CF8`, `#F7C955→#FFF1CC`, `#81D1AC→#E7F6E8`,
`#C1ABEF→#F0EAFB`, `#8FB6EF→#EBF3FE` — usable for section tints / OG image. Motion: gentle float/"paper landing"
like the app, disabled under `prefers-reduced-motion` (app disables under Reduce Motion:
`ClarityWelcomeContentPreview.swift:22`).

### S0. Header (sticky, signed-out variant)

| Element | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| Logo | app icon (star) + wordmark "inApp" | ← | ← | ← | ← | icon: `XCA/AppIcon.appiconset/icon-rating-paper-cobalt-1024.png` (the one referenced by `Contents.json`; `icon-editorial-v2-1024.png` in the same folder is unused) |
| Nav: breakdowns | Разборы | Breakdowns | Analysen | Décryptages | 分析 | [ui] tab label `ClarityFloatingTabBar.swift:12` |
| Nav: ideas | Идеи | Ideas | Ideen | Idées | アイデア | [ui] `ClarityFloatingTabBar.swift:13` |
| Nav: Plus | Plus | Plus | Plus | Plus | Plus | [ui] |
| Nav: FAQ | Вопросы | FAQ | Fragen | Questions | よくある質問 | [new] |
| Sign in (only if the web app has accounts — Q1) | Войти | Sign in | Anmelden | Se connecter | ログイン | [new] |
| Primary button | Открыть веб-версию | Open web version | Web-Version öffnen | Ouvrir la version web | Web版を開く | [new] |
| Language switcher | Русский · English · Deutsch · Français · 日本語 | | | | | [new]; links to the same section on `/<other-locale>` |

### S1. Hero

Layout: two columns on desktop (copy left, visual right), stacked on mobile (copy → CTAs → visual). Reference:
Oku hero (serif editorial headline + web CTA + App Store badge + "Already a member? Sign in") —
https://mobbin.com/sites/sections/13234fca-475c-4254-8856-fc85132b1dd8 ; ElevenReader hero (phone with reading content
+ floating fragments) — https://mobbin.com/sites/sections/cb5257de-b069-49e7-b058-b00f0d6798dd.

| Slot | ru | en | Source |
|---|---|---|---|
| Eyebrow | 35 тем. Реальные отзывы. Новые возможности. | 35 topics. Real reviews. New possibilities. | [shot] caption 1 (`render_storefront.swift:21-22`) |
| H1 | Найди идею приложения в задачах, о которых люди уже пишут в отзывах. | Find your next app idea in the problems people already describe. | [store] description.txt:1 |
| Lead | 35 редакторских разборов и 293 идеи приложений на основе открытых отзывов. Узнай, что люди пытаются сделать, где им мешают существующие продукты и какие вопросы стоит проверить до начала разработки. | 35 editorial breakdowns and 293 app ideas drawn from public app reviews. Read what people are trying to do, where existing products let them down, and which questions are worth testing before you build. | [store] description.txt:3 (prefix «inApp —» / "inApp brings together" removed) |
| CTA 1 (button) | Открыть веб-версию | Open web version | [new] |
| CTA 2 | Official "Загрузите в App Store" badge | Official "Download on the App Store" badge | Apple Marketing Tools localized badge SVG (do not type the text) |
| CTA 2 before approval | Скоро в App Store | Coming soon to the App Store | [new]; plain text, no badge |
| Tertiary link | Сначала прочитать бесплатный разбор → | Read the free breakdown first → | [ui] `ClarityContentAccess.swift:95` |
| Microcopy | Один полный разбор — бесплатно. | One complete topic is free. | [store] promotional_text.txt (last sentence) |

| Slot | de | fr | ja |
|---|---|---|---|
| Eyebrow [shot] | 35 Themen. Echte Bewertungen. Neue Möglichkeiten. | 35 thèmes. De vrais avis. De nouvelles pistes. | 35の分野。実際の口コミ。新たな可能性。 |
| H1 [store] | Finde deine nächste App-Idee in den Problemen, die Menschen bereits beschreiben. | Trouve ta prochaine idée d’application dans les problèmes que les gens décrivent déjà. | 次のアプリのアイデアを、すでに語られているユーザーの悩みから見つけよう。 |
| Lead [store] | 35 redaktionelle Analysen und 293 App-Ideen auf Grundlage öffentlicher App-Bewertungen. Erfahre, was Menschen erreichen möchten, wo bestehende Produkte sie im Stich lassen und welche Fragen du vor der Entwicklung prüfen solltest. | 35 décryptages éditoriaux et 293 idées d’applications tirés d’avis publics. Découvre ce que les gens cherchent à faire, ce qui les bloque dans les produits existants et les questions à vérifier avant de développer. *(store says «analyses éditoriales»; normalised to the UI term «décryptages», see §10-5)* | 公開されているアプリの口コミをもとに編集した35分野の分析と293のアプリアイデア。人々が何をしたいのか、既存の製品のどこで困っているのか、開発を始める前に何を確かめるべきかを読み解けます。 |
| CTA 1 [new] | Web-Version öffnen | Ouvrir la version web | Web版を開く |
| CTA 2 | "Laden im App Store" badge | "Télécharger dans l’App Store" badge | "App Storeからダウンロード" badge |
| CTA 2 pre-approval [new] | Bald im App Store | Bientôt sur l’App Store | App Storeで近日公開 |
| Tertiary [ui] | Zuerst die kostenlose Analyse lesen → | Lire d’abord le décryptage gratuit → | まず無料の分析を読む → |
| Microcopy [store] | Ein ganzes Thema ist kostenlos. | Un thème complet est gratuit. | ひとつの分野を無料で読めます。 |

**Hero visual** — two overlapping "papers" rendered as real HTML text (not a screenshot), exactly like onboarding
page 1 (`ClarityWelcomeContentPreview.swift:45-114`): an article card (tilt −3°) and a quote card (tilt +3°, offset
right/down, a "tape" strip on top). Content = the Interior design example (`ClarityWelcomeExamples.swift:101`:
observation `controlled-change`, 2nd sentence of the body, quote #0 of the observation):

| Field | ru | en | de | fr | ja |
|---|---|---|---|---|---|
| Category label (accent, 10-11px) | Дизайн интерьера | Interior design | Inneneinrichtung | Design d’intérieur | インテリアデザイン |
| Article title (Onest 900) | Узнать свою комнату | Recognizing your own room | Das eigene Zimmer wiedererkennen | Reconnaître sa propre pièce | 自分の部屋だと分かること |
| Excerpt (Georgia) | Человек приносит фотографию существующего помещения, а вместе с ней — условия, под которые ищет решение. | A person brings a photograph of an existing space, and with it the conditions they are looking for a solution within. | Jemand bringt ein Foto eines vorhandenen Raums mit und damit die Bedingungen, unter denen eine Lösung gesucht wird. | On apporte la photo d’un lieu existant, et avec elle les conditions dans lesquelles on cherche une solution. | 人は既存の空間の写真を持ち込み、それと一緒に、その中で答えを探すための条件も持ち込む。 |
| Thumbnail (103×80, radius 5) | `XCA/ResearchInterior_controlled-change.imageset/illustration.jpg` | ← | ← | ← | ← |
| Quote label + rating | Из отзыва пользователя · 2 ★ | From a user review · 2 ★ | Aus einer Nutzerrezension · 2 ★ | Extrait d’un avis utilisateur · 2 ★ | ユーザーレビューより · 2 ★ |
| Quote (first sentence) | «Загружаю фотографию своей комнаты, а в ответ получаю совершенно другую.» | “I put a picture in of my room and it comes back with a completely different room.” | „Ich lade ein Bild von meinem Zimmer rein und bekomme ein völlig anderes Zimmer zurück.“ | « J’ai mis une photo de ma pièce et ça me renvoie une pièce complètement différente. » | 「自分の部屋の写真を入れたのに、返ってきたのはまったく別の部屋。」 |

Sources: labels [ui] (`ClarityWelcomeExamples.swift:72`, `ClarityWelcomeContentPreview.swift:89`); titles/excerpts
[content] `RES/research-editorial.<lang>.json` → `categories["interior-design"].sections[0].observations[1]`; quote
[content] `RES/rich.en.json` → `interior-design-finding-1.evidence[0]` (original, rating 2) and translations in
`RES/quote-translations.<lang>.json`. Generate at build time from the packs with `Intl.Segmenter(locale,
{granularity:'sentence'})` to mirror `ClarityWelcomeExamples.excerpt()` (`:109-123`); the table shows expected output.
Quote marks: the app hard-codes «» for every language (`ClarityWelcomeContentPreview.swift:96`); on the web use
locale-correct marks (ru/fr « », de „ “, en “ ”, ja 「」).

Optional hero backdrop on wide screens: `XCA/WelcomeReviews_v7.imageset/illustration.png` (1254², transparent;
two hands holding review bubbles) behind the papers at ~40% size.

### S2. Numbers strip

Four equal stat tiles + one footnote line. Art: `WelcomeReviews_v7` (small, left) — it is the art of onboarding
page 0.

| Tile | ru | en | de | fr | ja |
|---|---|---|---|---|---|
| 1 | **35** разборов | **35** breakdowns | **35** Analysen | **35** décryptages | **35**分野の分析 |
| 2 | **293** идеи приложений | **293** app ideas | **293** App-Ideen | **293** idées d’applications | **293**のアプリアイデア |
| 3 | **744 775** отзывов о 2 356 приложениях | **744,775** reviews of 2,356 apps | **744.775** Bewertungen zu 2.356 Apps | **744 775** avis sur 2 356 apps | 2,356アプリの**744,775**件の口コミ |
| 4 | **5** языков | **5** languages | **5** Sprachen | **5** langues | **5**言語 |
| Footnote | Срез отзывов — август–сентябрь 2026 года, а не живая лента рынка. | Review snapshot from August–September 2026, not a live market feed. | Datenstand August–September 2026, kein Live-Marktfeed. | Données d’août–septembre 2026, pas un flux de marché en direct. | 2026年8〜9月時点の口コミデータです。リアルタイムの市場情報ではありません。 |

Tags: tiles [new] built on §3 numbers; footnote [new] paraphrasing `REL/review-notes.txt:9`. Tile 3 in ru reads as the
basis of the 35 breakdowns — add `title`/tooltip: «Столько отзывов изучено для 35 опубликованных разборов.» /
"Reviews studied for the 35 published breakdowns." (de: „So viele Bewertungen stecken in den 35 veröffentlichten
Analysen.“; fr: « Avis étudiés pour les 35 décryptages publiés. »; ja: 「公開中の35分野の分析のために調べた口コミの数です。」).

### S3. Free breakdown spotlight (`#research`)

Layout: large card — cover left (3:2), text right. Reference: in-app catalog card (`ClarityCatalogs.swift:94-150`) and
screenshot `REL/raw/store-<lang>-02-research.png`.

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| Kicker badge (mint/sky pill) | Бесплатный разбор | Free breakdown | Kostenlose Analyse | Décryptage gratuit | 無料の分析 | [ui] `ClarityCatalogs.swift:135` |
| H2 | Попробуй полный разбор бесплатно | Try a complete breakdown for free | Eine vollständige Analyse kostenlos | Essaie un décryptage complet gratuitement | まずは無料で、ひとつの分野をじっくり | [store] section heading, description.txt:14 (fr normalised from «une analyse complète») |
| Card title | Дизайн интерьера и планировка | Interior design and floor plans | Inneneinrichtung und Grundrisse | Design d’intérieur et plans d’aménagement | インテリアデザインと間取り図 | [content] `RES/text.<lang>.json` → `categories["interior-design"]` |
| Summary | Как выбрать изменения для своей комнаты, проверить размеры и довести понравившийся вариант до покупки или ремонта. | How to choose the changes for your own room, check the dimensions and carry the version you like through to a purchase or a renovation. | Wie man die Veränderungen für den eigenen Raum auswählt, die Maße prüft und die Variante, die gefällt, bis zum Kauf oder zur Renovierung weiterführt. | Comment choisir les changements pour sa propre pièce, vérifier les dimensions et mener la version qui plaît jusqu’à un achat ou une rénovation. | 自分の部屋に合う変更をどう選び、寸法をどう確かめ、気に入った案をどう購入やリフォームまで運ぶか。 | [content] `research-editorial.<lang>.json` `.summary` (catalog uses it: `ClarityReader.swift:18-19`) |
| Corpus sentence | Мы изучили 18 442 отзыва о работе 61 приложения. | We studied 18,442 reviews about how 61 apps work. | Wir haben 18.442 Rezensionen über die Arbeit von 61 Apps untersucht. | Nous avons étudié 18 442 avis sur le fonctionnement de 61 apps. | 61件のアプリがどう使われているかについて、18,442件のレビューを調べました。 | [ui] `ClarityReader.swift:435` + plural packs (`ui.<lang>.json` → `plurals`) |
| "Inside" label | В разборе | Inside | Darin | Au sommaire | 内容 | [new] |
| Part 1 | Сначала — увидеть своё решение | First — see your own decision | Zuerst – die eigene Entscheidung sehen | D’abord — voir sa propre décision | まず——自分の決定を見る | [content] `sections[0].title` |
| Part 2 | Затем — сверить с реальным помещением | Then — check it against the real space | Dann – mit dem realen Raum abgleichen | Ensuite — confronter à l’espace réel | 次に——実際の空間と突き合わせる | [content] `sections[1].title` |
| Part 3 | И наконец — воспользоваться сделанным | And finally — put the result to use | Und schließlich – das Gemachte nutzen | Et enfin — se servir de ce qui a été fait | そして最後に——できたものを使う | [content] `sections[2].title` |
| Optional meta line | 3 части · 7 наблюдений · 8 идей | 3 parts · 7 observations · 8 ideas | 3 Teile · 7 Beobachtungen · 8 Ideen | 3 parties · 7 observations · 8 idées | 3部構成・7つの所見・8つのアイデア | [new], counts from content pack |
| CTA | Читать бесплатно | Read for free | Kostenlos lesen | Lire gratuitement | 無料で読む | [new] → `/<locale>/research/interior-design` |

Assets: cover `XCA/ResearchInterior_cover.imageset/illustration.jpg` (1200×800; alt [ui] `ClarityResearchArtwork.swift:50`
— ru «Двое людей сравнивают образцы цвета в комнате, держа развёрнутый план будущего интерьера.», en "Two people compare
color samples in a room, holding an unfolded plan of the future interior.", de/fr/ja from `ui.<lang>.json`). Part
thumbnails (optional, 3:2): part 1 `ResearchInterior_controlled-change`, part 2 `ResearchInterior_measure`, part 3
`ResearchInterior_saved-work` (alts at `ClarityResearchArtwork.swift:53,54,57`).

### S4. Five free ideas (`#ideas`)

Layout: 3+2 grid of idea cards (art 3:2 on top, title + description + category caption) + a 6th locked tile.
Card anatomy = `ClarityIdeaCard.swift:22-56` (art `ClarityIdeaCardArt`, aspect 1.5, `ClarityIdeaCardArt.swift:37-41`).

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| H2 | Начни с 5 бесплатных идей | Start with 5 free ideas | Starte mit 5 kostenlosen Ideen | Commence avec 5 idées gratuites | まずは5つの無料アイデアから | [shot] caption 3 |
| Sub | Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться. | Who the app is for, which job it solves and how people will use it. | Für wen die App ist, welche Aufgabe sie löst und wie sie genutzt wird. | À qui l’app s’adresse, quelle tâche elle résout et comment les gens l’utiliseront. | アプリがだれに役立ち、どの課題を解き、どう使われるか。 | [ui] onboarding page 2, `ClarityOnboarding.swift:22` |
| Grid caption | 5 идей бесплатно. Остальные — в Plus. | 5 ideas for free. The rest with Plus. | 5 Ideen kostenlos. Alle weiteren mit Plus. | 5 idées gratuites. Les autres avec Plus. | 5つのアイデアを無料で。残りはPlusで。 | [ui] `ClarityCatalogs.swift:190` |
| Card caption (category) | Дизайн интерьера и планировка | Interior design and floor plans | Inneneinrichtung und Grundrisse | Design d’intérieur et plans d’aménagement | インテリアデザインと間取り図 | [content] |
| 6th tile label (art only + lock) | Идея в Plus | Idea in Plus | Idee in Plus | Idée dans Plus | アイデアはPlusで | [ui] `ClarityContentAccess.swift:61`; art `XCA/IdeaCover_interior-design-6…` — **no title/description** |
| CTA | Все идеи | All ideas | Alle Ideen | Toutes les idées | すべてのアイデア | [new] → `/<locale>/ideas` |

The five cards (titles and descriptions verbatim from `RES/idea-cards.<lang>.json`; art
`XCA/IdeaCover_interior-design-N.imageset/illustration.jpg`, 1200×800; there is no `EditorialIdeaCover_` variant for
these, and `ClarityIdeaCardArt.swift:40-41` prefers `EditorialIdeaCover_` then `IdeaCover_`). Each links to
`/<locale>/ideas/interior-design-N`.

| # | ru title | ru description | en title | en description |
|---|---|---|---|---|
| 1 | Новая комната. Те же стены. | Примерять мебель и отделку на фотографии своей комнаты, заранее отмечая, что должно остаться на месте. | A new room. The same walls. | Try furniture and finishes on a photo of your own room, marking in advance what has to stay where it is. |
| 2 | План с точными размерами | Планировщик, где размеры можно вводить числами и уточнять вручную. После правки стены видно, что изменилось рядом, а неудачный шаг можно отменить. | A plan with exact dimensions | A planner where dimensions can be entered as numbers and refined by hand. After a wall is edited you can see what changed around it, and a bad step can be undone. |
| 3 | Поместится ли новый диван? | Расстановка мебели в реальных габаритах до покупки или переезда. Добавляешь размеры комнаты и вещей, сравниваешь варианты и проверяешь свободные проходы. | Will the new sofa fit? | Arranging furniture at its real dimensions before a purchase or a move. You add the dimensions of the room and the items, compare layouts and check the walkways. |
| 4 | Из картинки — в список покупок | Подбор интерьера с переходом к реальным товарам. У каждого предмета — похожие варианты, актуальная цена и ссылка на магазин, чтобы собрать свой список покупок. | From a picture to a shopping list | Interior selection that leads on to real products. Every item comes with similar options, a current price and a link to a store, so you can put your own shopping list together. |
| 5 | Примерить цвет до ремонта | Примерка конкретной краски или обоев на фотографии стены. Сравниваешь варианты в своей комнате, сохраняя расположение окна, мебели и других деталей. | Try the color before the renovation | Trying a specific paint or wallpaper on a photo of the wall. You compare options in your own room, with the window, the furniture and the other details staying where they are. |

| # | de title | fr title | ja title |
|---|---|---|---|
| 1 | Ein neues Zimmer. Dieselben Wände. | Une nouvelle pièce. Les mêmes murs. | 新しい部屋。同じ壁。 |
| 2 | Ein Grundriss mit genauen Maßen | Un plan avec des cotes exactes | 正確な寸法の間取り図 |
| 3 | Passt das neue Sofa? | Le nouveau canapé rentrera-t-il ? | 新しいソファは入るか？ |
| 4 | Vom Bild zur Einkaufsliste | De l’image à la liste d’achats | 絵から買い物リストへ |
| 5 | Die Farbe vor der Renovierung ausprobieren | Essayer la couleur avant les travaux | リフォームの前に色を試す |

de/fr/ja descriptions: read from `RES/idea-cards.{de,fr,ja}.json` → `ideas["interior-design-N"].description` at build
time (full strings were verified to exist; e.g. de #1 "Möbel und Oberflächen auf dem Foto des eigenen Zimmers
ausprobieren und vorab markieren, was an seinem Platz bleiben muss.", fr #1 "Essayer des meubles et des finitions sur
la photo de sa propre pièce, en indiquant à l’avance ce qui doit rester en place.", ja #1 「自分の部屋の写真で家具と仕上げを試す。動かしてはいけないものは、あらかじめ印を付けておく。」).

Note: onboarding shows a shorter teaser for idea 1 only (`ClarityWelcomeExamples.swift:9-12`): ru «Новая мебель и
отделка на фото твоей комнаты. Стены, окна и двери остаются на месте.» / en "New furniture and finishes on a photo of
your room. Walls, windows and doors stay where they are." The landing grid uses the catalog copy (above) so it matches
the idea page; the teaser may be used in the OG image or hero if a shorter line is needed. The other teasers in that
file (`habit-tracking-1`, `personal-finance-2`, …, `:13-48`) are for PAID ideas and are not shown by the app
(`ideaSlugs = freeIdeaIDs`, `:6`) — do not use them on the landing.

### S5. Inside the breakdowns (carousel)

Layout: horizontal carousel of 5 "paper pairs" (article card + quote card), autoplay 7 s like the app
(`ClarityWelcomeContentPreview.swift:27-28`), pauses on hover/focus, disabled with reduced motion; arrows + dots;
each pair links to its breakdown (locked ones open the public preview/paywall page). Reference: Harvest pull-quote +
article cards — https://mobbin.com/sites/sections/28658418-1234-4cf4-a8e1-1be650c268be.

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| H2 | Разборы отзывов | Review breakdowns | Analysen von Rezensionen | Décryptages d’avis | レビューの分析 | [ui] `ClarityOnboarding.swift:18` |
| Sub | В каждом разборе — выводы и отзывы, на которых они основаны. | Every breakdown carries its conclusions and the reviews behind them. | Jede Analyse enthält ihre Schlüsse und die Rezensionen, auf denen sie beruhen. | Chaque décryptage porte ses conclusions et les avis sur lesquels elles reposent. | どの分析にも、結論とその裏づけとなるレビューが入っています。 | [ui] `ClarityOnboarding.swift:21` |

Slides = `ClarityWelcomeExamples.articles` (`ClarityWelcomeExamples.swift:100-106`), content from
`RES/research-editorial.<lang>.json` + `RES/rich.en.json` quotes + `RES/quote-translations.<lang>.json`. Label
("Из отзыва пользователя") and rating as in S1. Expected ru/en output:

| # | Category label ru / en | Art | Title ru / en | Excerpt ru / en | Quote (★) ru / en |
|---|---|---|---|---|---|
| 1 | Дизайн интерьера / Interior design | `ResearchInterior_controlled-change` | Узнать свою комнату / Recognizing your own room | (see S1) | (2★) see S1 |
| 2 | Привычки / Habits | `ResearchHabits_pause-correction` | Различить отдых, пропуск и забытую запись / Tell rest, a miss and a forgotten entry apart | Пустая клетка может означать разные вещи: действие не состоялось, человек сделал паузу или просто не внёс результат. / An empty square can mean different things: the action didn’t happen, the person took a pause, or they simply didn’t enter the result. | (4★) «Но одной довольно важной функции не хватает возможности поставить привычки на паузу и не потерять серию.» / “But there's one pretty significant feature missing, and it's an option to pause habits and not lose your streak.” |
| 3 | Личные финансы / Personal finance | `ResearchFinance_couple` | Двое должны одинаково понимать остаток / Two people have to understand the balance the same way | В паре бюджет становится договорённостью. Один автор описывает разделение занятий: он ведёт счета, жена чаще совершает покупки. / In a couple the budget becomes an agreement. One author describes the division of labor: he keeps the accounts, his wife does most of the buying. | (5★) «Мы с женой годами мучились в поисках лучшего способа согласовывать бюджет.» / “My wife and I struggled for years seeking the best way to communicate our budget.” |
| 4 | Питание / Nutrition | `ResearchLaunch_nutrition-calories_database` | Найти еду со своей кухни / Finding food from your own kitchen | Большая база не решает задачу, если в ней трудно найти привычную домашнюю еду, местный продукт или конкретную позицию меню. / A large database does not solve the job if the usual home-cooked food, a local product or a particular item from a menu is hard to find in it. | (2★) «В этом приложении очень мало вариантов продуктов для тех, кто готовит дома.» / “This app gives very few options for foods for a home cook.” |
| 5 | Календари и задачи / Calendars and tasks | `ResearchLaunch_calendars-tasks_cover` (no `time` asset → cover fallback, `ClarityWelcomeContentPreview.swift:65`) | Увидеть, что действительно помещается в день / See what really fits into the day | Встречи занимают конкретное время и определяют, что остаётся задачам. / Meetings take up specific time and determine what is left for tasks. | (5★) «Мне нравится видеть календарь и задачи на одном экране.» / “I like seeing my calendar and tasks in one screen.” |

Category labels de/fr/ja [ui] (`ClarityWelcomeExamples.swift:70-78`): Inneneinrichtung / Design d’intérieur /
インテリアデザイン; Gewohnheiten / Habitudes / 習慣; Persönliche Finanzen / Finances personnelles / 家計管理; Ernährung /
Nutrition / 食事; Kalender und Aufgaben / Calendriers et tâches / カレンダーとタスク. de/fr/ja titles (verified):
2 «Erholung, Aussetzer und vergessenen Eintrag unterscheiden» / «Distinguer le repos, le jour manqué et la saisie oubliée» /
「休み、抜け、記録のし忘れを見分ける」; 3 «Zwei Menschen müssen den Restbetrag gleich verstehen» / «Deux personnes doivent
comprendre le solde de la même façon» / 「二人は残高を同じように理解しなければならない」; 4 «Essen aus der eigenen Küche finden» /
«Trouver les aliments de sa propre cuisine» / 「自分の台所の食事を見つける」; 5 «Sehen, was wirklich in den Tag passt» /
«Voir ce qui tient vraiment dans la journée» / 「一日に本当に収まるものを見る」. Excerpts and quotes for de/fr/ja: generate
from the packs with the sentence rule (`excerptSkip/excerptCount/quoteIndex/quoteSkip` per slide in
`ClarityWelcomeExamples.swift:101-105`; slide 2 uses `quoteSkip: 1`, slide 3 `excerptCount: 2`, slide 1 `excerptSkip: 1`).

Parity note: these excerpts come from 4 PAID breakdowns, but the app shows them to free users in onboarding, so
showing them on the landing does not leak more than the app does. Show only this curated set.

### S6. How it works

Layout: 4 alternating rows (text + phone screenshot). Screens: raw captures without the poster frame
(`REL/raw/store-<lang>-0N-*.png`, 1320×2868), shown in a CSS device frame (radius ~72/1320 of width, like
`render_storefront.swift:38-51`). Use the visitor's locale set (`ru`, `en`, `de`, `fr`, `ja`).

| Step | Title ru / en | Body ru / en | Screenshot | Source |
|---|---|---|---|---|
| 1 | Пойми потребность за отзывом / Explore the need behind the review | Каждый разбор связывает повторяющиеся ситуации с выбранными цитатами из отзывов и возможными улучшениями. / Each breakdown connects recurring situations with selected review quotes and possible improvements. | `store-<lang>-02-research.png` (+ `02b-reading.png` on hover) | [store] description.txt:5-6 |
| 2 | Изучи идею и её основания / See the reasons behind each idea | Изучи конкретное решение: для кого оно, какую задачу решает и на чём основано. / Explore concrete ideas, their intended audience, the problem they address and the reasons behind them. | `store-<lang>-04-idea.png` | title [shot] caption 4; body [store] :9 |
| 3 | Сохраняй находки и свои мысли / Keep your findings in one place | Ищи по коллекции, сохраняй полезное и добавляй свои заметки. / Search the collection, save useful material and add your own notes. | `store-<lang>-05-saved.png` | title [shot] caption 5; body [store] :9 (trimmed) |
| 4 | Экспортируй идею вместе с её основаниями / Export an idea with its supporting context | Полный разбор категории, идея и твоя заметка — в одном файле. Один текстовый файл (.txt): можно читать, редактировать или передать в ИИ вместе со своим вопросом. / The full category breakdown, the idea and your note — in one file. One text file (.txt): you can read it, edit it or hand it to an AI with your question. | ru: `/Users/artsaverin/projects/app_04_inapp/Documentation/LibraryRefresh-2026-09-20/Screenshots/export-complete-document.png`; other locales: render a document mock in HTML | title [store] :9; body [ui] `ClarityReader.swift:558,983` |

| Step | de title / body | fr title / body | ja title / body |
|---|---|---|---|
| 1 | Verstehe das Bedürfnis hinter der Bewertung / Jede Analyse verbindet wiederkehrende Situationen mit ausgewählten Zitaten und möglichen Verbesserungen. | Comprends le besoin derrière l’avis / Chaque décryptage relie des situations récurrentes à des citations choisies et à des pistes d’amélioration. | 口コミの奥にあるニーズを知る / 各分析では、繰り返し現れる状況を、選び抜いた口コミの引用や改善案と結び付けています。 |
| 2 | Lies, was hinter einer Idee steckt / Entdecke konkrete Ideen, ihre Zielgruppe, das Problem und die Belege dahinter. | Découvre ce qui fonde chaque idée / Explore des idées concrètes, leur public, le problème à résoudre et leurs fondements. | アイデアの理由を深く知ろう / 誰のためのアイデアなのか、どんな課題を解決するのか、その根拠は何かを確認できます。 |
| 3 | Sammle Ideen und eigene Notizen / Durchsuche die Sammlung, speichere hilfreiche Inhalte und ergänze eigene Notizen. | Garde tes idées et tes notes / Recherche dans la collection, enregistre les contenus utiles et ajoute tes notes. | 発見とメモをひとつの場所に / コレクション内を検索し、役立つ内容を保存し、自分のメモを加えられます。 |
| 4 | Exportiere eine Idee mit ihrem Hintergrund / Die vollständige Kategorie-Analyse, die Idee und deine Notiz — in einer Datei. Eine Textdatei (.txt): Du kannst sie lesen, bearbeiten oder zusammen mit deiner Frage an eine KI geben. | Exporte une idée avec son contexte / Le décryptage complet de la catégorie, l’idée et ta note — dans un seul fichier. Un seul fichier texte (.txt) : tu peux le lire, le modifier ou le donner à une IA avec ta question. | アイデアを背景情報と一緒に書き出す / カテゴリーの分析全文、アイデア、自分のメモを一つのファイルに。テキストファイル一つ（.txt）。読むことも、編集することも、質問といっしょにAIに渡すこともできます。 |

H2 for the section [new]: Как это работает / How it works / So funktioniert es / Comment ça marche / 使い方.
Export parity: free readers may export the 5 free ideas; Plus = unlimited (`ClarityReader.swift:962` `allowed =
canReadIdea`; store: «inApp Plus открывает всю коллекцию и экспорт без ограничений»).

### S7. The 35 breakdowns + what's next

Layout: grid of 35 compact cards (cover 3:2 + name; lock icon on 34, "Free breakdown" pill on Interior design),
order = `LaunchEdition.categories` (catalog order, `ClarityCatalogs.swift:14-21`). Each links to
`/<locale>/research/<slug>`. Collapsed to 9 cards + "Show all 35" on mobile.

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| Kicker | 35 разборов | 35 breakdowns | 35 Analysen | 35 décryptages | 35分野の分析 | [new] |
| H2 | Что людям важно в приложениях и чего им не хватает. | What matters to people in apps and what they are missing. | Was Menschen an Apps wichtig ist und was ihnen fehlt. | Ce qui compte pour les gens dans les apps et ce qui leur manque. | 人がアプリに何を求め、何が足りないと感じているか。 | [ui] `ClarityCatalogs.swift:43` |
| Coming-next heading | Готовим следующие разборы | Next breakdowns in progress | Nächste Analysen in Arbeit | Prochains décryptages en préparation | 次の分析を準備中 | [ui] `ClarityCatalogs.swift:69` |
| Coming-next body | Велоспорт, йога и определение растений и животных. | Cycling, yoga and identifying plants and animals. | Radsport, Yoga und das Bestimmen von Pflanzen und Tieren. | Vélo, yoga et identification des plantes et des animaux. | サイクリング、ヨガ、植物と動物の判別。 | [ui] `ClarityCatalogs.swift:71` |
| New releases line | С обновлениями приложения регулярно добавляем новые темы, разборы и идеи. | With app updates we regularly add new topics, breakdowns and ideas. | Mit App-Updates kommen regelmäßig neue Themen, Analysen und Ideen dazu. | Avec les mises à jour de l’app, nous ajoutons régulièrement de nouveaux sujets, décryptages et idées. | アプリの更新にあわせて、新しいテーマ、分析、アイデアを定期的に追加しています。 | [ui] `ClarityOnboarding.swift:23` |
| Art | `WelcomeLibrary_v7` next to the coming-next block | | | | | onboarding page 3 |

Topic names (read at build time from `RES/text.<lang>.json` → `categories[slug]`; cover asset per slug: Interior /
Habits / Finance are hand-mapped in `ClarityResearchArtwork.swift:47-86` → `ResearchInterior_cover`,
`ResearchHabits_cover`, `ResearchFinance_cover`; the other 32 → `ResearchLaunch_<slug>_cover` from
`RES/launch-research-artwork.json`; all JPEG 1200×800):

| # | slug | ru | en | de | fr | ja |
|---|---|---|---|---|---|---|
| 1 | interior-design | Дизайн интерьера и планировка | Interior design and floor plans | Inneneinrichtung und Grundrisse | Design d’intérieur et plans d’aménagement | インテリアデザインと間取り図 |
| 2 | habit-tracking | Привычки | Habits | Gewohnheiten | Habitudes | 習慣 |
| 3 | personal-finance | Личные финансы | Personal finance | Persönliche Finanzen | Finances personnelles | 家計管理 |
| 4 | calendars-tasks | Календари и задачи | Calendars and tasks | Kalender und Aufgaben | Calendriers et tâches | カレンダーとタスク |
| 5 | notes-pkm | Заметки и база знаний | Notes and knowledge base | Notizen und Wissensdatenbank | Notes et base de connaissances | メモとナレッジベース |
| 6 | nutrition-calories | Калории и питание | Calories and nutrition | Kalorien und Ernährung | Calories et nutrition | カロリーと栄養 |
| 7 | workout-fitness | Тренировки и фитнес | Workouts and fitness | Training und Fitness | Entraînements et fitness | トレーニングとフィットネス |
| 8 | sleep-tracking | Трекеры сна и будильники | Sleep trackers and alarms | Schlaftracker und Wecker | Trackers de sommeil et réveils | 睡眠トラッカーとアラーム |
| 9 | language-learning | Изучение языков | Language learning | Sprachenlernen | Apprentissage des langues | 語学学習 |
| 10 | photo-editing | Фоторедакторы | Photo editors | Fotoeditoren | Éditeurs photo | 写真編集アプリ |
| 11 | travel-planning | Планирование путешествий | Travel planning | Reiseplanung | Planification de voyages | 旅行の計画 |
| 12 | meal-prep-grocery | Меню и списки покупок | Menus and shopping lists | Menüs und Einkaufslisten | Menus et listes de courses | 献立と買い物リスト |
| 13 | voice-recorder | Запись и расшифровка речи | Recording and transcribing speech | Sprachaufnahme und Transkription | Enregistrement et transcription de la parole | 音声録音と文字起こし |
| 14 | focus-productivity | Концентрация и продуктивность | Focus and productivity | Konzentration und Produktivität | Concentration et productivité | 集中と生産性 |
| 15 | plant-care | Уход за растениями | Plant care | Pflanzenpflege | Soin des plantes | 植物の世話 |
| 16 | pet-care | Уход за питомцами | Pet care | Haustierpflege | Soin des animaux | ペットの世話 |
| 17 | guitar-tuner-learn | Гитара: тюнер и обучение | Guitar: tuner and learning | Gitarre: Stimmgerät und Lernen | Guitare : accordeur et apprentissage | ギター：チューナーと練習 |
| 18 | scanner-pdf | Сканеры документов | Document scanners | Dokumentenscanner | Scanners de documents | ドキュメントスキャナー |
| 19 | weather-apps | Погода | Weather | Wetter | Météo | 天気 |
| 20 | wardrobe-outfit | Гардероб и образы | Wardrobe & outfits | Kleiderschrank und Outfits | Garde-robe et tenues | ワードローブとコーディネート |
| 21 | run-tracking | Бег | Running | Laufen | Course à pied | ランニング |
| 22 | hiking-trails | Походы и маршруты | Hikes and routes | Wanderungen und Routen | Randonnées et itinéraires | ハイキングとルート |
| 23 | flashcards | Учебные карточки | Study flashcards | Lernkarten | Cartes mémoire pour apprendre | 暗記カード |
| 24 | journaling-mood | Дневники и настроение | Journaling and mood | Tagebücher und Stimmung | Journal et humeur | 日記と気分 |
| 25 | invoice-maker | Счета для клиентов | Invoices for clients | Rechnungen für Kunden | Factures pour les clients | 顧客への請求書 |
| 26 | meditation-mindfulness | Медитация и осознанность | Meditation and mindfulness | Meditation und Achtsamkeit | Méditation et pleine conscience | 瞑想とマインドフルネス |
| 27 | mind-mapping | Карты мыслей | Mind maps | Mindmaps | Cartes mentales | マインドマップ |
| 28 | car-maintenance | Обслуживание автомобиля | Car maintenance | Autowartung | Entretien de la voiture | 車のメンテナンス |
| 29 | ai-writing | ИИ-помощники для текста | AI writing assistants | KI-Schreibassistenten | Assistants d’écriture IA | 文章のAIアシスタント |
| 30 | teleprompter-captions | Телесуфлёр и субтитры | Teleprompter and captions | Teleprompter und Untertitel | Téléprompteur et sous-titres | テレプロンプターと字幕 |
| 31 | password-manager | Менеджеры паролей | Password managers | Passwortmanager | Gestionnaires de mots de passe | パスワード管理アプリ |
| 32 | translator | Переводчики | Translators | Übersetzer | Traducteurs | 翻訳アプリ |
| 33 | astronomy-stargazing | Звёздное небо и астрономия | Night sky and astronomy | Sternenhimmel und Astronomie | Ciel nocturne et astronomie | 星空と天文 |
| 34 | resume-builder | Конструкторы резюме | Resume builders | Lebenslauf-Baukästen | Créateurs de CV | 履歴書作成 |
| 35 | music-streaming | Прослушивание музыки | Listening to music | Musikhören | Écoute de la musique | 音楽を聴く |

Card lock label (a11y): ru «Полный разбор в Plus» / en "Full breakdown in Plus" / de "Vollständige Analyse in Plus" /
fr "Décryptage complet dans Plus" / ja 「分析の全文はPlusで」 [ui] `ClarityCatalogs.swift:125`. Optionally show the
one-line summary on hover (public in-app; `research-editorial.<lang>.json` `.summary`).

### S8. How we treat the reviews (trust block)

Three short bullets with a small icon each; no numbers beyond §3.

| # | ru | en | Source |
|---|---|---|---|
| H2 | Как мы работаем с отзывами | How we treat the reviews | [new] |
| 1 | Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы. | The materials are built from app reviews. The quotes inside breakdowns show what the conclusions rest on. | [ui] `ClaritySettings.swift:298` |
| 2 | Это наблюдения и гипотезы для проверки, а не обещания спроса или дохода. | These are research observations and ideas to investigate, not promises of demand or revenue. | [store] description.txt:6 |
| 3 | inApp не создаёт приложения, не отслеживает позиции в App Store и не обещает доход. Срез отзывов — август–сентябрь 2026 года. | inApp does not generate apps, track App Store ranks or promise revenue. The review snapshot is from August–September 2026. | [new] from `REL/review-notes.txt:1,9` |

| # | de | fr | ja |
|---|---|---|---|
| H2 | Wie wir mit Bewertungen arbeiten | Notre façon de lire les avis | 口コミの扱い方 |
| 1 [ui] | Die Materialien entstehen aus Rezensionen zu Apps. Die Zitate in den Analysen zeigen, worauf die Schlüsse beruhen. | Les contenus sont construits à partir des avis sur les apps. Les citations dans les décryptages montrent sur quoi reposent les conclusions. | 資料はアプリのレビューをもとにつくられています。分析の中の引用は、結論が何にもとづくかを示します。 |
| 2 [store] | Es sind Beobachtungen und Ideen zum Überprüfen, keine Versprechen über Nachfrage oder Einnahmen. | Ce sont des observations et des idées à tester, sans promesse de demande ou de revenus. | 掲載内容は検証のための観察とアイデアであり、需要や収益を保証するものではありません。 |
| 3 [new] | inApp erstellt keine Apps, verfolgt keine App-Store-Rankings und verspricht keine Einnahmen. Der Datenstand ist August–September 2026. | inApp ne crée pas d’applications, ne suit pas les classements de l’App Store et ne promet aucun revenu. Les données datent d’août–septembre 2026. | inAppはアプリを自動生成せず、App Storeの順位も追跡せず、収益も約束しません。口コミデータは2026年8〜9月時点のものです。 |

Art: `WelcomeResearch_v7` (open book with magnifier and review cards).

### S9. Web and iPhone

Layout: two columns — browser mock (web version screenshot, to be captured once built) and phone frame
(`REL/raw/store-<lang>-01-catalog.png`). Reference: Oku "Track your reading…" web + phone side by side —
https://mobbin.com/sites/sections/1932de4e-f3ff-40c6-968d-88311aaf6d49.

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| H2 | Читай в браузере или на iPhone | Read in your browser or on iPhone | Lies im Browser oder auf dem iPhone | Lis dans ton navigateur ou sur iPhone | ブラウザでも、iPhoneでも | [new] |
| Web column title | Веб-версия | Web version | Web-Version | Version web | Web版 | [new] |
| Web column body | Те же разборы и идеи в любом браузере. | The same breakdowns and ideas in any browser. | Dieselben Analysen und Ideen in jedem Browser. | Les mêmes décryptages et idées dans n’importe quel navigateur. | 同じ分析とアイデアを、どのブラウザでも。 | [new] — extend once web auth/sync is decided (Q1/Q2) |
| iPhone column title | Читай на своём языке и офлайн | Read in your language, even offline | Lies in deiner Sprache, auch offline | Lis dans ta langue, même hors ligne | 日本語で、オフラインでも読める | [store] section heading, description.txt:11 |
| iPhone column body | Тексты и иллюстрации включены в приложение. Аккаунт не нужен. Закладки и заметки хранятся на твоём устройстве; в inApp нет рекламного отслеживания. | Articles and illustrations are included in the app. No account is needed. Bookmarks and notes stay on your device; inApp has no advertising tracking. | Texte und Illustrationen sind in der App enthalten. Du brauchst kein Konto. Lesezeichen und Notizen bleiben auf deinem Gerät. inApp enthält kein Werbetracking. | Les textes et les illustrations sont inclus dans l’application. Aucun compte n’est nécessaire. Tes favoris et tes notes restent sur ton appareil. inApp ne contient aucun suivi publicitaire. | 文章とイラストはアプリに含まれているため、読書に通信は不要です。アカウント登録も不要。ブックマークとメモは端末内に保存されます。広告目的の追跡はありません。 | [store] description.txt:12 (RevenueCat sentence omitted here; keep it in the privacy policy) |
| iPhone CTA | App Store badge / pre-approval text as in S1 | | | | | |

Important: offline / no account / on-device notes are **iPhone-app facts** (`REL/review-notes.txt:3`; project has no
sync: «Синхронизации между устройствами нет», `ClaritySettings.swift:301`). Do not attribute them to the web version.

### S10. inApp Plus (`#plus`)

Layout: heading + 2 columns (Free / Plus), Plus column lists the two plans exactly like the paywall
(`ClarityPaywall.swift:97-105`). Visual: the paywall trio — `WelcomeResearch_v7` (left, −12°), `WelcomeLibrary_v7`
(centre, larger), `WelcomeProduct_v7` (right, +9°), positions per `ClarityPaywall.swift:159-182`. Reference: Sketch
"Standard subscription vs Mac-only license" (subscription vs one-time) —
https://mobbin.com/sites/sections/312580d5-9c82-48fd-9ef4-dbc6275c3768.

| Slot | ru | en | Source |
|---|---|---|---|
| Kicker | inApp PLUS | inApp PLUS | [ui] `ClaritySettings.swift:205` (literal) |
| H2 | Все разборы и идеи | Every breakdown and idea | [ui] `ClaritySettings.swift:222` («Все разборы\nи идеи») |
| Sub | Все разборы и идеи, новые выпуски и экспорт материалов. | Every breakdown and idea, new releases and material export. | [ui] `ClarityPaywall.swift:47` |
| Free column title | Бесплатно | Free | [new] |
| Free bullets | Разбор «Дизайн интерьера и планировка» целиком · 5 идей из этого разбора · Каталог всех 35 разборов и поиск · Закладки и заметки · Экспорт бесплатных идей | The full “Interior design and floor plans” breakdown · 5 ideas from it · Catalog of all 35 breakdowns and search · Bookmarks and notes · Export of the free ideas | [new] from `ClarityContentAccess.swift:6-7`, `ClarityCatalogs.swift` (catalog/search visible to all), `ClarityContentAccess.swift:102-110` (notes even on locked items), `ClarityReader.swift:962` |
| Free CTA | Читать бесплатно | Read for free | [new] |
| Plus column title | Plus | Plus | [ui] |
| Plus bullets | Все 35 разборов и 293 идеи · Экспорт без ограничений · Новые выпуски | All 35 breakdowns and 293 ideas · Unlimited export · New releases | [store] description.txt:15 + [ui] `ClarityPaywall.swift:47` |
| Plan 1 | На год — Продлевается автоматически | Annual — Renews automatically | [ui] `ClarityPaywall.swift:99-101` |
| Plan 2 | Навсегда — Один платёж. Без продления. | Lifetime — One payment. No renewals. | [ui] `ClarityPaywall.swift:102-103` |
| Terms line | Оба варианта оплачиваются сразу, без пробного периода. Актуальная цена показана перед покупкой. | Both options start with a paid purchase, without a free trial. The local price is shown before purchase. | [store] description.txt:18 |
| Plus CTA | Открыть Plus | Open Plus | [ui] `ClaritySettings.swift:232` |
| Legal line (App Store purchases) | Отменить подписку можно в настройках App Store. | You can cancel the subscription in App Store settings. | [ui] `ClarityPaywall.swift:280` |

| Slot | de | fr | ja |
|---|---|---|---|
| H2 [ui] | Alle Analysen und Ideen | Tous les décryptages et les idées | すべての分析とアイデア |
| Sub [ui] | Alle Analysen und Ideen, neue Ausgaben und Material-Export. | Tous les décryptages et toutes les idées, les nouveaux numéros et l’export des contenus. | すべての分析とアイデア、新しい号、資料のエクスポート。 |
| Free title [new] | Kostenlos | Gratuit | 無料 |
| Free bullets [new] | Die vollständige Analyse „Inneneinrichtung und Grundrisse“ · 5 Ideen daraus · Katalog aller 35 Analysen und Suche · Lesezeichen und Notizen · Export der kostenlosen Ideen | Le décryptage complet « Design d’intérieur et plans d’aménagement » · 5 idées qui en sont tirées · Catalogue des 35 décryptages et recherche · Signets et notes · Export des idées gratuites | 「インテリアデザインと間取り図」の分析全文・そこからの5つのアイデア・35分野すべての目録と検索・ブックマークとメモ・無料アイデアの書き出し |
| Free CTA [new] | Kostenlos lesen | Lire gratuitement | 無料で読む |
| Plus bullets | Alle 35 Analysen und 293 Ideen · Unbegrenzter Export · Neue Ausgaben | Les 35 décryptages et 293 idées · Export illimité · Nouveaux numéros | 35分野すべての分析と293のアイデア・書き出し無制限・新しい号 |
| Plan 1 [ui] | Jährlich — Verlängert sich automatisch | Annuel — Renouvellement automatique | 年間 — 自動更新 |
| Plan 2 [ui] | Lebenslang — Einmal zahlen. Keine Verlängerung. | À vie — Un seul paiement. Sans renouvellement. | 買い切り — 一度のお支払い。更新なし。 |
| Terms [store] | Beide Optionen sind ab dem Kauf kostenpflichtig, ohne kostenlose Testphase. Der örtliche Preis wird vor dem Kauf angezeigt. | Les deux options sont payantes dès l’achat, sans essai gratuit. Le prix local est affiché avant l’achat. | どちらのプランも購入時から有料で、無料体験はありません。地域ごとの価格は購入前に表示されます。 |
| Plus CTA [ui] | Plus öffnen | Ouvrir Plus | Plusを開く |
| Legal [ui] | Das Abo kannst du in den Einstellungen des App Store kündigen. | Tu peux annuler l’abonnement dans les réglages de l’App Store. | サブスクリプションはApp Storeの設定で解約できます。 |

Prices: the app never hard-codes prices — it shows StoreKit's localized `displayPrice` («%1$@ в год», «%1$@ один
раз», `ClarityPaywall.swift:100,227`). App Store base prices are **$39.99/year** and **$79.99 lifetime** (USD,
`REL/README.md:13-14`). Recommendation: print numbers only if the web checkout (Q2) provides them for the visitor's
currency; otherwise keep the verbatim store line «Актуальная цена показана перед покупкой.» Never show "3 days free".
Russia: App Store payments are disabled in the Russian storefront (`ASO/README.md:238`) — the ru landing must sell the
free layer first and must not suggest buying via the App Store works in Russia; web payment path for RU is Q2.

### S11. FAQ (`#faq`)

Accordion, 10 items (show first 6, "More questions" expands the rest). Emit FAQPage JSON-LD with the same text
(pattern: `OLD/components/FaqSection.tsx:56-67`). **Do not reuse the old FAQ answers** (`OLD/components/FaqSection.tsx:10-54`
promise "demand score", "confirmed paying audience", "one payment forever" — none of that exists in the new product).

| # | Q ru | A ru | Source |
|---|---|---|---|
| 1 | Что такое inApp? | Библиотека редакторских разборов и идей приложений на основе открытых отзывов: 35 разборов и 293 идеи. Узнай, что люди пытаются сделать, где им мешают существующие продукты и какие вопросы стоит проверить до начала разработки. | [store] :3 |
| 2 | Откуда берутся разборы и идеи? | Материалы составлены по отзывам о приложениях. Цитаты внутри разборов помогают понять, на чём основаны выводы. 35 разборов опираются на 744 775 отзывов о 2 356 приложениях; весь архив исследования — 1 451 072 отзыва о 4 623 приложениях. Срез собран в августе–сентябре 2026 года, это не живая лента рынка. Оригиналы цитат — на английском, на других языках показан перевод. | [ui] `ClaritySettings.swift:298` + §3 + `REL/review-notes.txt:9` + `APP/Content/QuoteReading.swift:11-13` |
| 3 | Это гарантия, что идея заработает? | Нет. Это наблюдения и гипотезы для проверки, а не обещания спроса или дохода. inApp не создаёт приложения, не отслеживает позиции в App Store и не обещает доход. | [store] :6 + review-notes:1 |
| 4 | Что доступно бесплатно? | Разбор «Дизайн интерьера и планировка» и 5 идей доступны без подписки. inApp Plus открывает всю коллекцию и экспорт без ограничений. | [store] :15 (topic name aligned with the in-app title) |
| 5 | Как устроен Plus? | Plus доступен по годовой подписке с автоматическим продлением или навсегда за один платёж без продления. Оба варианта оплачиваются сразу, без пробного периода. Актуальная цена показана перед покупкой. | [store] :18 |
| 6 | Что внутри экспорта? | Один текстовый файл (.txt): полный разбор категории, идея целиком и твоя заметка. Его можно читать, редактировать или передать в ИИ вместе со своим вопросом. | [ui] `ClarityReader.swift:980-983` |
| 7 | На каких языках? | Интерфейс и редакторские материалы доступны на русском, английском, немецком, французском и японском. | [store] :12 |
| 8 | Можно ли читать без интернета? | В приложении для iPhone — да: тексты и иллюстрации входят в приложение. Для покупки и восстановления доступа нужно подключение к App Store. | [ui] `ClaritySettings.swift:299` |
| 9 | Нужен ли аккаунт и где хранятся заметки? | В приложении для iPhone аккаунт не нужен. Закладки и заметки хранятся на устройстве, синхронизации между устройствами нет. В inApp нет рекламного отслеживания. *(web answer to be added after Q1)* | [store] :12 + [ui] `ClaritySettings.swift:301` |
| 10 | Как отменить подписку? | При покупке в App Store: если не отменить подписку минимум за 24 часа до конца текущего периода, она продлится по указанной годовой цене. Управлять подпиской и отменить её можно в настройках аккаунта App Store. | [store] :18 |

| # | Q en | A en |
|---|---|---|
| 1 | What is inApp? | A library of editorial breakdowns and app ideas drawn from public app reviews: 35 breakdowns and 293 ideas. Read what people are trying to do, where existing products let them down, and which questions are worth testing before you build. |
| 2 | Where do the breakdowns and ideas come from? | The materials are built from app reviews. The quotes inside breakdowns show what the conclusions rest on. The 35 breakdowns draw on 744,775 reviews of 2,356 apps; the whole research archive holds 1,451,072 reviews of 4,623 apps. The snapshot was collected in August–September 2026; it is not a live market feed. Quotes are shown in their original English; other languages show a translation. |
| 3 | Does this prove an idea will make money? | No. These are research observations and ideas to investigate, not promises of demand or revenue. inApp does not generate apps, track App Store ranks or promise revenue. |
| 4 | What is free? | The Interior design and floor plans breakdown and 5 ideas are available without a subscription. inApp Plus unlocks the full collection and unlimited export. |
| 5 | How does Plus work? | Choose an auto-renewing annual subscription or lifetime access with a single purchase and no renewal. Both options start with a paid purchase, without a free trial. The local price is shown before purchase. |
| 6 | What is in an export? | One text file (.txt): the full category breakdown, the whole idea and your note. You can read it, edit it or hand it to an AI with your question. |
| 7 | Which languages? | The interface and editorial collection are available in English, Russian, German, French and Japanese. |
| 8 | Can I read offline? | In the iPhone app, yes: texts and illustrations ship with the app. Buying and restoring access needs an App Store connection. |
| 9 | Do I need an account, and where are my notes? | The iPhone app needs no account. Bookmarks and notes are kept on the device; there is no syncing between devices. inApp has no advertising tracking. *(web answer after Q1)* |
| 10 | How do I cancel? | For App Store purchases: unless cancelled at least 24 hours before the current period ends, the subscription renews at the displayed annual price. Manage or cancel it in your App Store account settings. |

| # | Q de / A de | Q fr / A fr | Q ja / A ja |
|---|---|---|---|
| 1 | Was ist inApp? / Eine Bibliothek redaktioneller Analysen und App-Ideen auf Grundlage öffentlicher App-Bewertungen: 35 Analysen und 293 Ideen. Erfahre, was Menschen erreichen möchten, wo bestehende Produkte sie im Stich lassen und welche Fragen du vor der Entwicklung prüfen solltest. | Qu’est-ce qu’inApp ? / Une bibliothèque de décryptages éditoriaux et d’idées d’applications tirés d’avis publics : 35 décryptages et 293 idées. Découvre ce que les gens cherchent à faire, ce qui les bloque dans les produits existants et les questions à vérifier avant de développer. | inAppとは？ / 公開されているアプリの口コミをもとに編集した、35分野の分析と293のアプリアイデアのライブラリです。人々が何をしたいのか、既存の製品のどこで困っているのか、開発を始める前に何を確かめるべきかを読み解けます。 |
| 2 | Woher stammen die Analysen und Ideen? / Die Materialien entstehen aus Rezensionen zu Apps. Die Zitate in den Analysen zeigen, worauf die Schlüsse beruhen. Die 35 Analysen stützen sich auf 744.775 Bewertungen zu 2.356 Apps; das gesamte Recherche-Archiv umfasst 1.451.072 Bewertungen zu 4.623 Apps. Der Datenstand ist August–September 2026, kein Live-Marktfeed. Die Zitate stammen aus englischen Originalen und werden übersetzt angezeigt. | D’où viennent les décryptages et les idées ? / Les contenus sont construits à partir des avis sur les apps. Les citations dans les décryptages montrent sur quoi reposent les conclusions. Les 35 décryptages s’appuient sur 744 775 avis portant sur 2 356 apps ; l’archive complète compte 1 451 072 avis sur 4 623 apps. Les données datent d’août–septembre 2026 ; ce n’est pas un flux de marché en direct. Les citations viennent d’originaux en anglais et sont affichées traduites. | 分析とアイデアはどこから来ていますか？ / 資料はアプリのレビューをもとにつくられています。分析の中の引用は、結論が何にもとづくかを示します。35分野の分析は2,356アプリについての744,775件の口コミにもとづき、調査アーカイブ全体では4,623アプリの1,451,072件になります。データは2026年8〜9月時点のもので、リアルタイムの市場情報ではありません。引用の原文は英語で、日本語訳を表示しています。 |
| 3 | Ist das ein Beweis, dass sich eine Idee lohnt? / Nein. Es sind Beobachtungen und Ideen zum Überprüfen, keine Versprechen über Nachfrage oder Einnahmen. inApp erstellt keine Apps, verfolgt keine App-Store-Rankings und verspricht keine Einnahmen. | Est-ce une garantie qu’une idée rapportera ? / Non. Ce sont des observations et des idées à tester, sans promesse de demande ou de revenus. inApp ne crée pas d’applications, ne suit pas les classements de l’App Store et ne promet aucun revenu. | アイデアが収益になる保証はありますか？ / いいえ。掲載内容は検証のための観察とアイデアであり、需要や収益を保証するものではありません。inAppはアプリを自動生成せず、App Storeの順位も追跡せず、収益も約束しません。 |
| 4 | Was ist kostenlos? / Die Analyse „Inneneinrichtung und Grundrisse“ und 5 Ideen sind ohne Abo verfügbar. inApp Plus öffnet die gesamte Sammlung und unbegrenzten Export. | Qu’est-ce qui est gratuit ? / Le décryptage « Design d’intérieur et plans d’aménagement » et 5 idées sont accessibles sans abonnement. inApp Plus donne accès à toute la collection et à l’exportation illimitée. | 無料で読めるのは？ / 「インテリアデザインと間取り図」の分析と5つのアイデアは、サブスクリプションなしで読めます。inApp Plusでは、すべての分野とアイデアを閲覧でき、書き出しも無制限になります。 |
| 5 | Wie funktioniert Plus? / Plus ist als Jahresabo mit automatischer Verlängerung oder als lebenslanger Zugang mit einmaliger Zahlung erhältlich. Beide Optionen sind ab dem Kauf kostenpflichtig, ohne kostenlose Testphase. Der örtliche Preis wird vor dem Kauf angezeigt. | Comment fonctionne Plus ? / Plus est disponible par abonnement annuel à renouvellement automatique ou en accès à vie avec un paiement unique, sans renouvellement. Les deux options sont payantes dès l’achat, sans essai gratuit. Le prix local est affiché avant l’achat. | Plusのプランは？ / Plusは自動更新の年間サブスクリプション、または一括払いの買い切りプランから選べます。どちらのプランも購入時から有料で、無料体験はありません。地域ごとの価格は購入前に表示されます。 |
| 6 | Was steckt im Export? / Eine Textdatei (.txt): die vollständige Kategorie-Analyse, die ganze Idee und deine Notiz. Du kannst sie lesen, bearbeiten oder zusammen mit deiner Frage an eine KI geben. | Que contient l’export ? / Un seul fichier texte (.txt) : le décryptage complet de la catégorie, l’idée en entier et ta note. Tu peux le lire, le modifier ou le donner à une IA avec ta question. | 書き出しには何が入りますか？ / テキストファイル一つ（.txt）に、カテゴリーの分析全文、アイデアの全文、あなたのメモが入ります。読むことも、編集することも、質問といっしょにAIに渡すこともできます。 |
| 7 | In welchen Sprachen? / Oberfläche und redaktionelle Inhalte sind auf Deutsch, Englisch, Russisch, Französisch und Japanisch verfügbar. | Dans quelles langues ? / L’interface et les contenus éditoriaux sont disponibles en français, anglais, russe, allemand et japonais. | 対応言語は？ / 画面と編集記事は日本語、英語、ロシア語、ドイツ語、フランス語に対応しています。 |
| 8 | Kann ich offline lesen? / In der iPhone-App ja: Texte und Illustrationen gehören zur App. Für Kauf und Wiederherstellung des Zugangs ist eine Verbindung zum App Store nötig. | Puis-je lire hors ligne ? / Dans l’app iPhone, oui : les textes et les illustrations sont inclus dans l’app. L’achat et la restauration de l’accès nécessitent une connexion à l’App Store. | オフラインで読めますか？ / iPhoneアプリなら読めます。本文と図版はアプリに同梱されています。購入とアクセスの復元にはApp Storeへの接続が必要です。 |
| 9 | Brauche ich ein Konto, und wo liegen meine Notizen? / Die iPhone-App braucht kein Konto. Lesezeichen und Notizen bleiben auf dem Gerät; zwischen Geräten wird nichts synchronisiert. inApp enthält kein Werbetracking. | Faut-il un compte, et où sont mes notes ? / L’app iPhone ne demande aucun compte. Les signets et les notes restent sur l’appareil ; il n’y a pas de synchronisation entre appareils. inApp ne contient aucun suivi publicitaire. | アカウントは必要？メモはどこに保存されますか？ / iPhoneアプリではアカウントは不要です。ブックマークとメモは端末に保存され、端末間の同期はありません。広告目的の追跡はありません。 |
| 10 | Wie kündige ich? / Bei Käufen im App Store: Wenn du nicht spätestens 24 Stunden vor Ablauf kündigst, verlängert sich das Abo zum angezeigten Jahrespreis. Du kannst es in deinen App Store-Accounteinstellungen verwalten oder kündigen. | Comment résilier ? / Pour les achats sur l’App Store : sans annulation au moins 24 heures avant la fin de la période en cours, l’abonnement est renouvelé au prix annuel indiqué. Tu peux le gérer ou l’annuler dans les réglages de ton compte App Store. | 解約するには？ / App Storeで購入した場合、現在の期間が終わる24時間前までに解約しないと、表示された年額で自動更新されます。管理や解約はApp Storeのアカウント設定から行えます。 |

If Q3 is decided "no archive number on the site", delete the archive clause from answer 2 in all locales.

### S12. Final CTA band

Background: storefront poster blue `#204AF0→#557CF8` (`render_storefront.swift:27`), white text (as poster 1).

| Slot | ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|---|
| H2 | Найди идею для приложения | Find your next app idea | Finde deine nächste App-Idee | Trouve ta prochaine idée d’application | 次のアプリのアイデアを見つけよう | [shot] caption 1 |
| Sub | Начни с 5 бесплатных идей | Start with 5 free ideas | Starte mit 5 kostenlosen Ideen | Commence avec 5 idées gratuites | まずは5つの無料アイデアから | [shot] caption 3 |
| Buttons | Открыть веб-версию + App Store badge (as S1) | | | | | |

### S13. Footer

Reference: Aqua footer sitemap (Privacy / Terms / Contact / FAQ columns) —
https://mobbin.com/sites/sections/03f083e3-7838-429b-8800-3d25fad9310b.

| Link | ru | en | de | fr | ja | Target |
|---|---|---|---|---|---|---|
| Breakdowns | Разборы | Breakdowns | Analysen | Décryptages | 分析 | `/<locale>/research` |
| Ideas | Идеи | Ideas | Ideen | Idées | アイデア | `/<locale>/ideas` |
| Plus | Plus | Plus | Plus | Plus | Plus | `#plus` |
| FAQ | Вопросы | FAQ | Fragen | Questions | よくある質問 | `#faq` |
| Contact | Написать разработчику | Contact the developer | Dem Entwickler schreiben | Écrire au développeur | 開発者に連絡する | `/<ru|en>/contacts` — label [ui] `ClaritySettings.swift:57` |
| Privacy | Конфиденциальность | Privacy | Datenschutz | Confidentialité | プライバシー | `https://artsaverin-star.github.io/legal/inapp/privacy.html` (`Strings.swift:275`; store `privacy_url.txt`) — label [ui] `ClaritySettings.swift:68` |
| Terms | Условия использования | Terms of use | Nutzungsbedingungen | Conditions d’utilisation | 利用規約 | `/<ru|en>/offer` (`Strings.swift:272`) + note "App Store purchases: Apple standard EULA" → `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` (`ClarityPaywall.swift:294`; store description line 21) — label [ui] `ClaritySettings.swift:71` |
| Old site | Старая версия сайта | Previous version of the site | Frühere Version der Website | Ancienne version du site | 旧バージョンのサイト | `/old/ru` (ru) or `/old/en` (others) — [new] |
| App Store | badge / pre-approval text | | | | | `https://apps.apple.com/app/id6814396315` |
| Copyright | © 2026 inApp | | | | | as old footer `OLD/components/Footer.tsx:31` |
| Language switcher | Русский · English · Deutsch · Français · 日本語 | | | | | |

Contacts page note: the requisites (self-employed name, INN, e-mail) live in `OLD/data/legal.json` and are rendered by
`OLD/app/contacts/page.tsx:13-19`; that page is Russian-only even at `/en/contacts` (`:21-24` hard-coded Russian) — the
new contacts page must be localized (at least ru/en; de/fr/ja app users are sent to `/en/…` by `Strings.swift:270`).

---

## 5. SEO per locale

| Locale | `<title>` (brand at end) | chars | `<meta name="description">` | chars | `og:locale` |
|---|---|---|---|---|---|
| ru | Идеи приложений и ниши из реальных отзывов — inApp | 50 | 35 редакторских разборов и 293 идеи приложений на основе открытых отзывов. Пойми, что нужно людям, до начала разработки. Один полный разбор — бесплатно. | 152 | ru_RU |
| en | App Ideas & Niche Research from Real Reviews — inApp | 52 | 35 editorial breakdowns and 293 app ideas drawn from public app reviews. Discover the needs behind real reviews before you build. One complete topic is free. | 157 | en_US (alt en_GB) |
| de | App-Ideen & Marktlücken aus echten Bewertungen – inApp | 54 | 35 redaktionelle Analysen und 293 App-Ideen aus öffentlichen Bewertungen. Verstehe, was Menschen brauchen, bevor du entwickelst. Ein ganzes Thema ist kostenlos. | 160 | de_DE |
| fr | Idées d’applications et niches tirées des avis – inApp | 54 | 35 décryptages éditoriaux et 293 idées d’applications tirées d’avis publics. Comprends les besoins avant de développer. Un thème complet est gratuit. | 149 | fr_FR |
| ja | アプリ市場調査とアイデア図鑑｜口コミから探る35分野 – inApp | 34 | 公開されているアプリの口コミをもとに編集した35分野の分析と293のアプリアイデア。開発を始める前に、実際の口コミからニーズを読み解けます。ひとつの分野を無料で読めます。 | 85 | ja_JP |

Wording reuse: ru/en/de/fr/ja titles echo the App Store names ("Идеи приложений и ниши", "App Ideas & Niches" /
"Niche Research", "App-Ideen & Marktlücken", "idées de niche", "アプリ市場調査とアイデア図鑑"); descriptions reuse the
promotional text. ASO found no search demand for the topic in the App Store (memory `inapp-aso-2026-09-16.md`), so web
SEO is the main organic channel — keep the H1 and first paragraph text-rich and server-rendered.

Technical:

- `alternates.canonical = https://inapp.pro/<locale>`; `hreflang`: `ru`, `en`, `de`, `fr`, `ja`, `x-default → /en`
  (old site only declared ru/en: `OLD/app/page.tsx:32-35`).
- Render statically per locale (the old page is `force-dynamic`, `OLD/app/page.tsx:16`; the landing has no per-user
  data for signed-out visitors).
- `robots: index, follow, max-image-preview: large`. `/old/**` should be `noindex` (its copy contradicts the new product,
  e.g. `OLD/components/Landing.tsx:260-268` "Find a pain people already pay to solve … demand-backed idea").
- JSON-LD: `WebSite` + `MobileApplication` { name "inApp", operatingSystem "iOS", `installUrl`/`url`
  `https://apps.apple.com/app/id6814396315` (only when live), `inLanguage` [ru,en,de,fr,ja] } + `FAQPage` (S11 text).
  No `aggregateRating` (none exists). Add `offers` only if prices are displayed. Category in ASC was not found in the
  release snapshot (`REL/asc-appinfos.json` has no primary/secondary category) — omit `applicationCategory` or confirm.
- Smart App Banner after approval: `<meta name="apple-itunes-app" content="app-id=6814396315">`.
- OG image 1200×630 per locale: left = [shot] caption 1 (e.g. «Найди идею для приложения» + «35 тем. Реальные отзывы.
  Новые возможности.»), right = `WelcomeReviews_v7` or a cropped `store-<lang>-01-catalog` phone; background poster
  blue `#204AF0→#557CF8`. Replace the old generated icons (`OLD/app/icon.tsx`, `apple-icon.tsx`) with the new star icon.

---

## 6. Asset map (what to show where)

All app art lives in `XCA/<Name>.imageset/illustration.(png|jpg)`. Convert to WebP/AVIF with 1×/2× variants at build
time (the transparent PNGs are 1.2–1.3 MB each). Suggested public names in brackets; align with the content-pipeline
spec if it defines artwork paths.

| Section | Asset (source) | Size / format | Alt / role | Why |
|---|---|---|---|---|
| Favicon, header logo, apple-touch-icon | `XCA/AppIcon.appiconset/icon-rating-paper-cobalt-1024.png` | 1024², PNG | "inApp" | Active icon per `Contents.json`; matches build (`REL/review-notes.txt:9`) |
| S1 hero papers | `ResearchInterior_controlled-change` (+ HTML text) | 1200×800 JPG, shown 103×80 | decorative (`aria-hidden`), text is real | = onboarding page 1 slide 1 |
| S1 backdrop (optional), S2 | `WelcomeReviews_v7` [`/landing/welcome-reviews`] | 1254², PNG alpha | decorative | onboarding page 0 art (`ClarityWelcomeIllustration.swift:54`) |
| S3 cover | `ResearchInterior_cover` | 1200×800 JPG | [ui] alt `ClarityResearchArtwork.swift:50` | catalog/research cover |
| S3 part thumbs | `ResearchInterior_controlled-change`, `_measure`, `_saved-work` | 1200×800 JPG | alts `ClarityResearchArtwork.swift:53-57` | per-part art in reader |
| S4 idea cards | `IdeaCover_interior-design-1…5` | 1200×800 JPG | decorative (title is text) | `ClarityIdeaCardArt.swift:40-41` |
| S4 locked tile | `IdeaCover_interior-design-6` + lock glyph | 1200×800 JPG | "Idea in Plus" | locked cards show art only (`ClarityIdeaCard.swift:24-34`) |
| S5 slides | `ResearchInterior_controlled-change`, `ResearchHabits_pause-correction`, `ResearchFinance_couple`, `ResearchLaunch_nutrition-calories_database`, `ResearchLaunch_calendars-tasks_cover` | 1200×800 JPG | decorative | onboarding carousel (`ClarityWelcomeContentPreview.swift:65`) |
| S6 phones | `REL/raw/store-<lang>-02-research.png`, `-02b-reading.png`, `-04-idea.png`, `-05-saved.png` (and `-03-ideas.png` spare) | 1320×2868 PNG | "inApp on iPhone: <screen>" | real captures, 5 locales |
| S6 export | `Documentation/LibraryRefresh-2026-09-20/Screenshots/export-complete-document.png` (ru) | PNG | "Export document preview" | only ru capture exists |
| S7 grid | `ResearchInterior_cover`, `ResearchHabits_cover`, `ResearchFinance_cover`, `ResearchLaunch_<slug>_cover` ×32 | 1200×800 JPG | topic name | all 35 topics have a cover |
| S7 coming next | `WelcomeLibrary_v7` | 1254² PNG alpha | decorative | onboarding page 3 art |
| S8 | `WelcomeResearch_v7` | 1254² PNG alpha | decorative | book + magnifier |
| S9 | `REL/raw/store-<lang>-01-catalog.png` + future web screenshot | 1320×2868 PNG | "inApp catalog on iPhone" | |
| S10 | `WelcomeResearch_v7` + `WelcomeLibrary_v7` + `WelcomeProduct_v7` | 1254² PNG alpha | decorative | paywall composition (`ClarityPaywall.swift:159-182`) |
| OG | composed (see §5) | 1200×630 | | |
| Posters (optional gallery "See it on the App Store") | `REL/screenshots/<lang>/01-05.png` | 1320×2868 | poster headline text as alt | only if a store-style gallery is wanted; prefer raw captures |

Do NOT use: third-party app icons/screenshots (the old hero floats them: `OLD/components/Landing.tsx:220-257`; the app
removed them), `XCA/StudioObject_*`, `Welcome*_v3/_v5`, `ClarityWelcome/ClarityResearch/ClarityIdeas/ClarityChoose`
(`illustration-v1.png`, older generation; only `ClarityArt(role: .research)` loading placeholder uses one:
`ClarityRoot.swift:38,43`), `icon-editorial-v2-1024.png`.

---

## 7. Behaviour details

- Language of content blocks (S1, S3, S4, S5, S7) must be generated from the same content packs the web app uses, so
  landing text never drifts from the reader. Hard-coded strings = only the [new]/[store]/[ui] chrome in this brief.
- Links from S4/S5/S7 into locked items open the web equivalent of `ClarityContentGate` preview (art + title +
  «Полный материал в Plus» / «Идея доступна в Plus» + «Открыть все материалы» + «Сначала прочитать бесплатный разбор»,
  `ClarityContentAccess.swift:68-121`) — never a blurred article.
- Analytics events (suggested): `landing_cta_web`, `landing_cta_appstore`, `landing_free_research`,
  `landing_idea_open{slug}`, `landing_topic_open{slug}`, `landing_plus_open`, `landing_faq_open{n}`, `landing_lang{to}`,
  `landing_old_site`.
- Mobile: hero visual below CTAs; S5 carousel swipeable (the app uses paging with wrap-around,
  `ClarityWelcomeCarousel.swift:28-67`); S7 collapsed; sticky bottom bar with "Open web version" after scrolling past
  the hero.
- A11y: stat numbers as text; carousel with `aria-roledescription="carousel"` and pause control; quote cards include
  the rating as text ("2 of 5 stars").

---

## 8. Mobbin references (content/editorial-app landings)

| # | Site / section | Link | Use for |
|---|---|---|---|
| 1 | Oku — hero: serif headline, "Join for free" + App Store badge, "Already a member? Sign in" | https://mobbin.com/sites/sections/13234fca-475c-4254-8856-fc85132b1dd8 | S1 CTA trio and quiet editorial tone |
| 2 | Oku — "Track your reading and build your library": web app + phone side by side | https://mobbin.com/sites/sections/1932de4e-f3ff-40c6-968d-88311aaf6d49 | S9 web + iPhone |
| 3 | ElevenReader — hero with a phone showing a reading screen and floating UI fragments | https://mobbin.com/sites/sections/cb5257de-b069-49e7-b058-b00f0d6798dd | S1 visual (floating papers) |
| 4 | Harvest — pull quote next to editorial cards | https://mobbin.com/sites/sections/28658418-1234-4cf4-a8e1-1be650c268be | S5 excerpt + quote pairing |
| 5 | Sketch — subscription vs one-time license columns | https://mobbin.com/sites/sections/312580d5-9c82-48fd-9ef4-dbc6275c3768 | S10 annual vs lifetime |
| 6 | Aqua — minimal hero + sitemap footer (Privacy, Terms, Contact, FAQ) | https://mobbin.com/sites/sections/03f083e3-7838-429b-8800-3d25fad9310b | S13 footer |

---

## 9. What to take from the old landing (reference only)

| Old element | File | Keep? |
|---|---|---|
| `generateMetadata` with canonical + hreflang + OG/Twitter | `OLD/app/page.tsx:18-40` | Keep pattern, extend to 5 locales |
| CollectionPage JSON-LD with niche ItemList | `OLD/app/page.tsx:83-98` | Replace with WebSite/MobileApplication/FAQPage (§5) |
| Hero "Найди боль, за решение которой уже платят" + "готовую идею под спрос, оценённую под соло-фаундера" | `OLD/components/Landing.tsx:258-269` | **Drop** — contradicts store copy ("not promises of demand or revenue") |
| Floating third-party app icons | `OLD/components/Landing.tsx:220-257` | **Drop** |
| 72-niche card grid with "apps · reviews · observations" and "накрутка" blurbs | `OLD/components/Landing.tsx:71-206` | **Drop**; S7 shows only the 35 published topics without counts/ratings |
| FAQ accordion + FAQPage JSON-LD component | `OLD/components/FaqSection.tsx:56-85` | Keep component pattern; replace all Q&A text |
| Footer with legal pages reachable everywhere (ЮKassa requirement) | `OLD/components/Footer.tsx:7-42` | Keep the principle (contacts/offer on every page) |
| Per-app insight long-read with histogram | `OLD/components/InsightLanding.tsx` | Not part of the landing (ratings/histograms are out of scope for the new product) |

---

## 10. Discrepancies found (code wins)

1. **Review count.** Onboarding says «1,4 млн отзывов» / «Изучили отзывы о 4 623 приложениях»
   (`ClarityOnboarding.swift:18,20,74`) = the 72-category archive; the store subtitle says 744 775 (the 35 published).
   Both are true of different sets; the landing headline uses 744 775 (§3, Q3).
2. **Trial.** Paywall code still has a 3-day-trial branch («3 дня бесплатно», «Начать 3 дня бесплатно»,
   `ClarityPaywall.swift:25-31,101,227,247`; `Store/Purchases.swift:201-211`), and `ASO/README.md:12,282-290,326` says
   the trial exists; but introductory offers were removed in ASC (`REL/trial-removal-verified.json`, `REL/README.md:13`,
   `REL/review-notes.txt:5`). The branch is dormant → **no trial on the site**.
3. **Project README is stale** (`/Users/artsaverin/projects/app_04_inapp/README.md` top: one-time StoreKit purchase,
   "reading free, Plus opens export"); code has annual + lifetime (`Store/Purchases.swift:11-12`) gating content.
4. **Clarity README is stale** (`Documentation/Clarity/README.md`: 3-step onboarding with category choice, mint/peach
   palette); code has 4 story pages + paywall (`ClarityOnboarding.swift:18-33`) and the neutral palette
   (`StudioStyle.swift:5-20`, LibraryRefresh README).
5. **French term.** UI says «Décryptage(s)» (`ui.fr.json` for «Разборы»/«Разбор»), store/screenshot captions say
   «analyse(s)». Landing normalises to «décryptage» (matches the web app UI); confirm (Q6).
6. **Free topic name in de/fr/ja store copy** («Raumgestaltung», «aménagement intérieur», 「インテリアの分析記事」) differs
   from the in-app title («Inneneinrichtung und Grundrisse», «Design d’intérieur et plans d’aménagement»,
   「インテリアデザインと間取り図」, `RES/text.<lang>.json`). Landing uses the in-app title when naming the topic.
7. **Quote marks.** App uses «» for every language (`ClarityWelcomeContentPreview.swift:96`); landing uses locale marks.
8. **Terms link.** Settings "Terms of use" → `https://inapp.pro/<ru|en>/offer` (`Strings.swift:272`,
   `ClaritySettings.swift:71`) which today is the old site's ЮKassa/Telegram-Stars public offer for web payments in RUB
   (`OLD/app/offer/page.tsx:8,39,53`); the paywall and store use Apple's standard EULA. The new `/offer` needs terms that
   cover the new product.
9. **Locale prefix in app links** is only ru/en (`Strings.swift:270`) — de/fr/ja users land on `/en/contacts` and
   `/en/offer`; `/en/contacts` currently renders Russian (`OLD/app/contacts/page.tsx:21-24`).
10. **Onboarding teaser vs card copy** for `interior-design-1` differ (`ClarityWelcomeExamples.swift:9-12` vs
    `idea-cards.<lang>.json`) — both are real; landing uses card copy.
11. **Source stores.** Legacy `Strings.sourceNote` says "App Store and Google Play" (`Strings.swift:257`, not used by
    Clarity); traced quote sources are 160/160 Apple. Landing says "public app reviews" only.

---

## 11. Open questions

- **Q1 Web access model.** Can signed-out visitors read the free breakdown/ideas in the web version (parity with the
  no-account iPhone app), or does "Open web version" require sign-in? What does a signed-in visitor get at `/<locale>`?
  (Affects S0 "Sign in", S9, FAQ 9.)
- **Q2 Web Plus.** Does the web sell Plus (old site used ЮKassa + Telegram Stars in RUB), at which prices/currencies,
  and does an App Store purchase unlock the web (the app has no account, so there is nothing to link)? Needed for S10
  prices and FAQ 5/10; critical for `ru` because App Store payments are disabled in Russia (`ASO/README.md:238`).
- **Q3 Headline number.** 744 775 reviews of 2 356 apps (published, = store subtitle) vs the onboarding's 1,4 млн /
  4 623 apps (archive). Brief uses 744 775 in the strip and mentions the archive only in FAQ 2.
- **Q4 App Store go-live.** App is WAITING_FOR_REVIEW (`REL/README.md:6`); ship the badge/link/Smart Banner behind a
  flag. Is the app available in the Russian storefront (`REL/asc-availability.json` snapshot has an empty territory
  list)?
- **Q5 Legal pages.** Confirm `/ru|en/contacts` and `/ru|en/offer` stay at the root (binary-hard-coded) and that `/offer`
  gets new-product terms; add `/de|fr|ja/contacts`? Show the self-employed requisites in the footer?
- **Q6 French noun** «décryptage» (UI) vs «analyse» (store).
- **Q7** After launch, update ASC `marketing_url` for de/fr/ja from `/en` to `/de`, `/fr`, `/ja`?
- **Q8** OK to show the 4 paid-breakdown excerpts (S5) on a public, indexable page? The app shows them to free users
  in onboarding, but they become crawlable.
- **Q9** Web screenshots for S9 do not exist yet — capture after the web app is built, or launch S9 with the phone only.
