# 03 — First-run onboarding, Plus paywall, access model

Status: research spec, 2026-09-22. Source of truth: the live iOS app `/Users/artsaverin/projects/app_04_inapp/Inapp/` (Clarity shell, release build 3 submitted 2026-09-21).
All `file:line` references are relative to `/Users/artsaverin/projects/app_04_inapp/` unless stated otherwise. When code and docs disagree, this spec follows the code; discrepancies are listed in §5.

Conventions used below:

- **UI strings.** The Russian string is the lookup key (`L("…")`, `Inapp/Strings/UIStrings.swift:51-59`). Translations come from `Inapp/Resources/ui.{en,de,fr,ja}.json` (`strings` map). Russian is the source language and has no pack. A missing key falls back to English and never to Russian (`UIStrings.swift:31-36`). `%1$@`/`%2$@` are positional placeholders, and translators may reorder them.
- **App locales:** `ru, en, ja, de, fr` (`Inapp/Resources/locales.json`). The first launch uses the system language; after that, the user picks it in Settings.
- Non-breaking spaces in fr strings (` ` before `:` `?` `«»`) are part of the translations. Keep them.
- "Web recommendation" marks proposals for the site. Everything else describes the app as shipped.

---

## 0. TL;DR

| Topic | Fact |
|---|---|
| Onboarding | 4 story pages + the paywall as page 5, all in one full-screen flow. It shows on every cold start until finished, and it can be replayed from Settings. |
| Onboarding exits | "Пропустить" or closing the paywall → the free `interior-design` research opens. After a purchase → the research catalog root. |
| Paywall products | `com.artsaverin.inapp.annual` is auto-renewing, 1 year, **$39.99**, **no trial**. `com.artsaverin.inapp.lifetime` is non-consumable, **$79.99**. Annual is selected by default. |
| Free content | The whole research topic `interior-design`, plus exactly the ideas `interior-design-1` … `interior-design-5`. Everything else needs Plus. |
| Locked ideas | Only the artwork and a lock are shown. The title and description are hidden everywhere, including accessibility. |
| Locked research | Cover, title and one-line summary are visible. A lock card offers the paywall or the free sample. |
| Plus | Any valid annual grant, grace period included, or the lifetime product. Lifetime wins. |
| Telemetry | Only RevenueCat in observer mode: purchase results + restore sync. No screen or funnel analytics exist in the app. |

---

## 1. First-run onboarding ("знакомство")

### 1.1 When it is shown, persistence and replay

| Rule | Detail | Source |
|---|---|---|
| Precondition | The library must be loaded. Before that the root shows a spinner "Открываем материалы…" (en "Opening the materials…"). On failure it shows the error state "Не удалось открыть материалы" / "Попробуй загрузить библиотеку ещё раз." + button "Повторить". | `Inapp/Clarity/ClarityRoot.swift:36-44` |
| Shown when | `replayingWelcome == true` OR (`preferences.completed == false` AND not a debug test launch). In Release, `skipWelcome` is always `false`. | `ClarityRoot.swift:32`, `Inapp/Studio/StudioRuntime.swift:15-23` |
| Persisted flag | `UserDefaults["studio.preferences.v1"] = {completed, goal, categories}`. `completed` becomes `true` only in `finish()`. | `Inapp/Studio/StudioPreferences.swift:18,33-39` |
| Current step | Not persisted (`@State step = 0`). If the app is killed mid-flow, the next launch restarts at page 1. | `Inapp/Clarity/ClarityOnboarding.swift:12` |
| On finish (first run) | If not already completed: `preferences.finish(goal: .research, categories: <unchanged>)`, and `clarity.goal = "research"` is written. | `ClarityOnboarding.swift:146-151` |
| Replay entry | Saved tab → Settings → "Знакомство с приложением" (en "App walkthrough", de "App-Rundgang", fr "Découverte de l’app", ja "アプリの紹介"). The Settings sheet dismisses first, then the flow starts with `isReplay = true`. | `Inapp/Clarity/ClaritySettings.swift:51-55,89-93`; `ClarityRoot.swift:86` |
| Replay differences | The top-right button reads "Закрыть" instead of "Пропустить". Any exit calls `onFinish("replay-close")`, which does not change the tab, the navigation stacks or `completed`. The paywall page is still shown as page 5. | `ClarityOnboarding.swift:123-124,147` |

Exit routing (`ClarityRoot.swift:46-55`):

| Marker | Emitted by | Result |
|---|---|---|
| `sample` | "Пропустить" on pages 1–4, OR closing the paywall while **not** unlocked | Tab 0 (Разборы). The stack is replaced with `[research("interior-design")]`, so the free research article opens. |
| `catalog` | Closing the paywall while unlocked, including the auto-close after a purchase | Tab 0, empty stack (research catalog root) |
| `replay-close` | Any exit during replay | No routing change |

Web recommendation: store `onboardingCompleted` in localStorage for anonymous visitors and on the account for signed-in users. Show the flow the first time someone enters the app area (not on the marketing landing). Map `sample` to `/app/research/interior-design` and `catalog` to `/app/research`.

### 1.2 Shell: layout shared by all 5 pages

Top to bottom (`ClarityOnboarding.swift:48-136`):

1. **Nav bar.** Horizontal padding 24, top padding 4, max width 600, centered.
   - Left: circular back button, 44×44. Background is ink at 4.5% opacity, icon `chevron.left` 15pt medium. a11y label "Назад" (en "Back", de "Zurück", fr "Retour", ja "戻る"), id `onboarding-back`. On page 1 it keeps its space but is invisible, disabled and hidden from a11y. (`ClarityWelcomeComponents.swift:86-99`, `ClarityOnboarding.swift:118-121`)
   - Center overlay: the **progress indicator**, 5 capsules with 6pt spacing. The active capsule is 18×5 ink; inactive ones are 5×5 ink at 16%. a11y label "Шаг %1$@ из %2$@" (en "Step %1$@ of %2$@", de "Schritt %1$@ von %2$@", fr "Étape %1$@ sur %2$@", ja "ステップ %1$@／%2$@"). (`ClarityWelcomeComponents.swift:101-115`)
   - Right: text button "Пропустить" (replay: "Закрыть"), 15pt / weight 500, secondary color, min height 44, id `onboarding-skip`.
2. **Scrollable content**, vertically centered in the remaining height. Max width 440, top padding 12, bottom padding 16, 16pt gap between the visual and the copy.
   - The visual: an illustration (pages 1 and 4) or a content-preview carousel (pages 2 and 3).
   - The copy block: title + description, centered, 24 horizontal padding, 10pt gap between them. The description is at most 360pt wide.
3. **Footer.** Horizontal padding 24, top 10, bottom 8, max width 600 (`ClarityWelcomeComponents.swift:44-84`).
   - Primary capsule button "Дальше" + `chevron.right` 13pt semibold. id `onboarding-continue`.
   - Below it, a **reserved invisible row** with min height 44 that holds the hidden text "Остаться с бесплатным разбором". It keeps the button at the same height on story pages and on the paywall (`ClarityWelcomeComponents.swift:70-76`).

Primary button (`ClarityWelcomeComponents.swift:15-42,117-125`): capsule with `ClarityStyle.action` background (#3458DB in both themes) and white text, 17pt / 600. Padding is 27 horizontal / 17 vertical, min label height 24. When busy it shows a white spinner and hides the icon. Disabled means 60% opacity. While pressed: scale 0.98, opacity 0.9, easeOut 0.14s (no scale under reduced motion).

Colors (`Inapp/Studio/StudioStyle.swift:5-21`, `Inapp/Clarity/ClarityStyle.swift:4-15`). The app has light and dark themes. Onboarding and paywall follow the app theme; the forced light theme was removed on 2026-09-20.

| Token | Light | Dark |
|---|---|---|
| paper (screen bg) | #F5F5F7 | #111214 |
| surface (cards) | #FFFFFF | #1D1E22 |
| ink | #191A20 | #F2F2F5 |
| secondary | #666872 | #AAADB8 |
| accent | #3458DB | #94AAFF |
| action (button bg) | #3458DB | #3458DB |
| accentSoft / sky | #EDF1FF | #262D45 |
| line | #DEDFE5 | #383A42 |

Typography (`Inapp/Clarity/ClarityWelcomeTypography.swift:7-89`). The font is **Onest** variable (`Inapp/Resources/Fonts/Onest.ttf`, SIL OFL; weight axis 100–900).

| Role | Size | Weight | Other |
|---|---|---|---|
| Page title | 38 (cap 48 with Dynamic Type) | 900 | tracking −0.75, tight leading (line spacing −4pt), centered |
| Page description | 18 (cap 26) | 450 | line spacing +3, secondary color, max width 360 |
| Buttons | 17 | 600 | — |
| Skip / Close | 15 | 500 | secondary |
| Preview card title | 18 | 900 | — |
| Preview excerpt | 14 | 400 | line spacing 3 (idea descriptions: 2) |
| Preview labels | 10 | 550 (rating 600) | accent color |

### 1.3 Pages in order

| # (step) | a11y id | Visual | Title | Description |
|---|---|---|---|---|
| 1 (0) | `onboarding-welcome` | Illustration "Reviews" (§1.4) | ru «1,4 млн отзывов» · en "1.4M reviews" · de "1,4 Mio. Rezensionen" · fr "1,4 M d’avis" · ja "140万件のレビュー" | ru «Изучили отзывы о 4 623 приложениях: что раздражает людей и чего им не хватает.» · en "We read reviews of 4 623 apps: what annoys people and what they are missing." · de "Wir haben Rezensionen zu 4 623 Apps gelesen: was Menschen stört und was ihnen fehlt." · fr "Nous avons lu les avis de 4 623 apps : ce qui agace les gens et ce qui leur manque." · ja "4,623件のアプリのレビューを調べました。何が人をいら立たせ、何が足りていないのか。" |
| 2 (1) | `onboarding-value` | Carousel of 5 research samples (§1.5) | ru «Разборы отзывов» · en "Review breakdowns" · de "Analysen von Rezensionen" · fr "Décryptages d’avis" · ja "レビューの分析" | ru «В каждом разборе — выводы и отзывы, на которых они основаны.» · en "Every breakdown carries its conclusions and the reviews behind them." · de "Jede Analyse enthält ihre Schlüsse und die Rezensionen, auf denen sie beruhen." · fr "Chaque décryptage porte ses conclusions et les avis sur lesquels elles reposent." · ja "どの分析にも、結論とその裏づけとなるレビューが入っています。" |
| 3 (2) | `onboarding-library` | Carousel of the 5 free ideas, 2 per page (§1.6) | ru «Идеи приложений» · en "App ideas" · de "App-Ideen" · fr "Idées d’apps" · ja "アプリのアイデア" | ru «Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться.» · en "Who the app is for, which job it solves and how people will use it." · de "Für wen die App ist, welche Aufgabe sie löst und wie sie genutzt wird." · fr "À qui l’app s’adresse, quelle tâche elle résout et comment les gens l’utiliseront." · ja "アプリがだれに役立ち、どの課題を解き、どう使われるか。" |
| 4 (3) | `onboarding-updates` | Illustration "Library" (§1.7) | ru «Новые выпуски» · en "New releases" · de "Neue Ausgaben" · fr "Nouveaux numéros" · ja "新しい号" | ru «С обновлениями приложения регулярно добавляем новые темы, разборы и идеи.» · en "With app updates we regularly add new topics, breakdowns and ideas." · de "Mit App-Updates kommen regelmäßig neue Themen, Analysen und Ideen dazu." · fr "Avec les mises à jour de l’app, nous ajoutons régulièrement de nouveaux sujets, décryptages et idées." · ja "アプリの更新にあわせて、新しいテーマ、分析、アイデアを定期的に追加しています。" |
| 5 (4) | `paywall-heading` | The Plus paywall, embedded (§2) with back → page 4 | see §2 | see §2 |

Source: `ClarityOnboarding.swift:18-25`. On page 1 the title's a11y label is the exact count «1 451 072 отзыва» (en "1 451 072 reviews", de "1 451 072 Rezensionen", fr "1 451 072 avis", ja "1,451,072件のレビュー") (`ClarityOnboarding.swift:74`). The numbers 1 451 072 and 4 623 are hardcoded copy.

Navigation (`ClarityOnboarding.swift:101-103,118,138-144`):

- "Дальше" → step + 1. After page 4 it goes to the paywall (step 4).
- Back → step − 1. From the paywall, back → page 4.
- There is **no swipe between pages**. Horizontal swipes on pages 2 and 3 scroll the inner carousel only.
- Step change animation: spring (response 0.55, damping 0.9). The new content enters from `x = +50·dir` with a fade; the old content leaves to `x = −35·dir` with a fade (`ClarityOnboarding.swift:96-99`).

Per-page reveal (`ClarityOnboarding.swift:65-67,75,85-87,107-113`): after 60ms a spring (0.72 / 0.58) runs:

- visual: opacity 0→1, y 16→0, rotation −2°→0
- title: scale 0.72→1 on page 1, 0.90→1 on other pages
- description block: opacity plus y 12→0, easeOut 0.45s with a 0.14s delay

With reduced motion everything is shown immediately.

Visual width: illustrations use `min(354, viewportWidth − 40)` (max 280 at accessibility text sizes). Carousels use `min(420, viewportWidth − 16)` (`ClarityOnboarding.swift:52-62`).

### 1.4 Page 1 visual: "Reviews" illustration

`Inapp/Clarity/ClarityWelcomeIllustration.swift`. Container aspect ratio is 1.1 (w/h) (`:32`). Layers, positions in % of the container:

| Layer | Spec | Source |
|---|---|---|
| Blob | Ellipse 66%×65%, fill accentSoft, rotated −24°, center (47%, 47%) | `:45-52` |
| Main art | Asset **`WelcomeReviews_v7`** (`Inapp/Resources/Assets.xcassets/WelcomeReviews_v7.imageset/illustration.png`, 1254×1254 RGBA PNG). Width 96% of the container, center (50%, 46%), soft shadow. | `:54-64` |
| 3 mini review cards | Each card is 21%×16% of the width: surface background, radius 5, a row of 4 filled stars (6pt, accent) and two accent lines at 24% opacity (one full width, one 26pt). Centers (15%,18%), (48%,9%), (87%,35%); resting angles −13°, 4°, 12°. | `:74-93,158-173` |

Entrance (`:133-155`):

1. t = 80ms → phase 1: blob and main art (spring 0.78 / 0.6). They start at scale 0.7 / 0.72, a 3D tilt of −24°, offset (−24, 52).
2. +210ms → phase 2: the cards (spring 0.72 / 0.58), staggered by 0.13s. They start at scale 0.55, a 3D tilt of −68°, offset (−22, 40).
3. +950ms → ambient mode. Everything floats on a **12-second** sine loop: rise ±, sway ±, card flutter ±8° 3D.

The entrance is not replayed after returning from the background.

### 1.5 Page 2 visual: research samples carousel (real content)

Component: a paged horizontal scroller (`Inapp/Clarity/ClarityWelcomeCarousel.swift`) with 5 pages, autoplay every **7 s**, id `onboarding-articles-carousel` (`Inapp/Clarity/ClarityWelcomeContentPreview.swift:26-30`).

Carousel behaviour (`ClarityWelcomeCarousel.swift:28-74`):

- Native swipe paging.
- The first page is duplicated at the end, so page 5 → page 1 wraps forward without rewinding.
- Touching pauses the timer; after the gesture ends a full new interval starts.
- The advance animation is a spring (1.02 / 0.86).
- There are no arrows, dots or buttons on the carousel.
- a11y value is "i/5".
- Pages are bottom-aligned. The carousel height equals the tallest page, so it does not jump.
- 24pt vertical padding and no clipping, so rotated shadows are not cut.
- Autoplay is off when: motion is off, reduced motion is on, VoiceOver is on, accessibility text size is on, or the app is inactive (`ClarityWelcomeContentPreview.swift:22`). Swipe still works.

Each page ("article composition", `ClarityWelcomeContentPreview.swift:45-114`) is two overlapping "paper" layers with 10 horizontal padding.

**Article card:**
- surface background, radius 6, padding 17 (+9 bottom), hairline border at black 5%, trailing inset 18
- top row: category label (10/550 accent) above the observation title (18/900); on the right, artwork 103×80 with radius 5, hidden at accessibility sizes
- below: an excerpt of whole sentences (14/400, line spacing 3)

**Quote card:**
- overlaps the article card by 6pt, leading inset 44
- accentSoft background, radius 5, padding 15
- a "tape" strip 48×13 in line color at 75%, rotated −8°, centered on the top edge (y −7)
- header row: «Из отзыва пользователя» (en "From a user review", de "Aus einer Nutzerrezension", fr "Extrait d’un avis utilisateur", ja "ユーザーレビューより"), 10/550 accent, and on the right "N ★" (10/600 accent)
- body: the quote wrapped in «…» for **all** locales (14/400)
- **The app name is never shown.**

Sample definitions (`Inapp/Clarity/ClarityWelcomeExamples.swift:100-106`, labels `:70-79`):

| # | category id | observation id | excerpt: skip / count sentences | quote idx / skip / count | Category label (ru · en · de · fr · ja) | Artwork asset |
|---|---|---|---|---|---|---|
| 1 | interior-design | controlled-change | 1 / 1 | 0 / 0 / 1 | Дизайн интерьера · Interior design · Inneneinrichtung · Design d’intérieur · インテリアデザイン | `ResearchInterior_controlled-change` |
| 2 | habit-tracking | pause-correction | 0 / 1 | 0 / 1 / 1 | Привычки · Habits · Gewohnheiten · Habitudes · 習慣 | `ResearchHabits_pause-correction` |
| 3 | personal-finance | couple | 0 / 2 | 0 / 0 / 1 | Личные финансы · Personal finance · Persönliche Finanzen · Finances personnelles · 家計管理 | `ResearchFinance_couple` |
| 4 | nutrition-calories | database | 0 / 1 | 0 / 0 / 1 | Питание · Nutrition · Ernährung · Nutrition · 食事 | `ResearchLaunch_nutrition-calories_database` |
| 5 | calendars-tasks | time | 0 / 1 | 0 / 0 / 1 | Календари и задачи · Calendars and tasks · Kalender und Aufgaben · Calendriers et tâches · カレンダーとタスク | `ResearchLaunch_calendars-tasks_cover` (fallback: `time` has no own image) |

Artwork lookup: `ClarityResearchArtwork.article(for:).observations[obsId] ?? cover` (`ClarityWelcomeContentPreview.swift:50,65`). A hardcoded prefix map exists for interior (`ResearchInterior_`), habits (`ResearchHabits_`) and finance (`ResearchFinance_`). Other categories use `Inapp/Resources/launch-research-artwork.json` (`ResearchLaunch_<cat>_<key>`) (`Inapp/Clarity/ClarityResearchArtwork.swift:21,48-83`). All are 1200×800 JPG.

Data derivation (build-time on the web):

1. `observation = research-editorial.<lang>.json → categories[cat].sections[*].observations[id == obsId]`. The title is `observation.title`. The excerpt is sentences `[skip, skip+count)` of `observation.body`, as whole sentences without rewriting (`ClarityWelcomeExamples.swift:109-123`). **On the web use `Intl.Segmenter(lang, {granularity: 'sentence'})`** to match iOS `.bySentences`.
2. `quotes = observation.quoteRefs → rich.<lang>.json dossiers[cat].findings[findingID].evidence[quoteIndex]`, de-duplicated by (app, quote) (`Inapp/Content/ResearchEditorial.swift:33-51`). `rich.*` exists only for `ru` and `en`; de/fr/ja fall back to `en` (`Inapp/Content/AppLocale.swift:62-70`).
3. Quote text = `quote-translations.<lang>.json[original] ?? evidence.translation ?? original`. There is no cross-language fallback, so en shows the original (`Inapp/Content/QuoteReading.swift:13-25`). Then take sentences `[quoteSkip, quoteSkip+quoteCount)`.

Resulting sample content, computed from the bundle with an approximate sentence splitter. Re-derive with `Intl.Segmenter` before shipping. ja excerpts are the most sensitive to segmentation.

| # | lang | Title | Excerpt | ★ | Quote |
|---|---|---|---|---|---|
| 1 | ru | Узнать свою комнату | Человек приносит фотографию существующего помещения, а вместе с ней — условия, под которые ищет решение. | 2 | Загружаю фотографию своей комнаты, а в ответ получаю совершенно другую. |
| 1 | en | Recognizing your own room | A person brings a photograph of an existing space, and with it the conditions they are looking for a solution within. | 2 | I put a picture in of my room and it comes back with a completely different room. |
| 1 | de | Das eigene Zimmer wiedererkennen | Jemand bringt ein Foto eines vorhandenen Raums mit und damit die Bedingungen, unter denen eine Lösung gesucht wird. | 2 | Ich lade ein Bild von meinem Zimmer rein und bekomme ein völlig anderes Zimmer zurück. |
| 1 | fr | Reconnaître sa propre pièce | On apporte la photo d’un lieu existant, et avec elle les conditions dans lesquelles on cherche une solution. | 2 | J’ai mis une photo de ma pièce et ça me renvoie une pièce complètement différente. |
| 1 | ja | 自分の部屋だと分かること | 人は既存の空間の写真を持ち込み、それと一緒に、その中で答えを探すための条件も持ち込む。 | 2 | 自分の部屋の写真を入れたのに、返ってきたのはまったく別の部屋。 |
| 2 | ru | Различить отдых, пропуск и забытую запись | Пустая клетка может означать разные вещи: действие не состоялось, человек сделал паузу или просто не внёс результат. | 4 | (2nd sentence of the quote) Но одной довольно важной функции не хватает возможности поставить привычки на паузу и не потерять серию. |
| 2 | en | Tell rest, a miss and a forgotten entry apart | An empty square can mean different things: the action didn’t happen, the person took a pause, or they simply didn’t enter the result. | 4 | But there's one pretty significant feature missing, and it's an option to pause habits and not lose your streak. |
| 2 | de | Erholung, Aussetzer und vergessenen Eintrag unterscheiden | Ein leeres Kästchen kann Verschiedenes bedeuten: Die Handlung fand nicht statt, der Mensch machte eine Pause, oder er trug das Ergebnis einfach nicht ein. | 4 | Aber eine ziemlich wichtige Funktion fehlt, nämlich die Möglichkeit, Gewohnheiten zu pausieren, ohne die Serie zu verlieren. |
| 2 | fr | Distinguer le repos, le jour manqué et la saisie oubliée | Une case vide peut vouloir dire plusieurs choses : l’action n’a pas eu lieu, la personne a fait une pause, ou elle n’a simplement pas saisi le résultat. | 4 | Mais il manque une fonction assez importante : une option pour mettre les habitudes en pause sans perdre sa série. |
| 2 | ja | 休み、抜け、記録のし忘れを見分ける | 空のマスは、いくつもの意味を持ちうる。(segmentation-sensitive) | 4 | でも、けっこう大事な機能がひとつ足りない。(segmentation-sensitive) |
| 3 | ru | Двое должны одинаково понимать остаток | В паре бюджет становится договорённостью. Один автор описывает разделение занятий: он ведёт счета, жена чаще совершает покупки. | 5 | Мы с женой годами мучились в поисках лучшего способа согласовывать бюджет. |
| 3 | en | Two people have to understand the balance the same way | In a couple the budget becomes an agreement. One author describes the division of labor: he keeps the accounts, his wife does most of the buying. | 5 | My wife and I struggled for years seeking the best way to communicate our budget. |
| 3 | de | Zwei Menschen müssen den Restbetrag gleich verstehen | In einem Paar wird das Budget zur Absprache. Ein Autor beschreibt die Arbeitsteilung: Er führt die Konten, seine Frau kauft meistens ein. | 5 | Meine Frau und ich haben uns jahrelang abgemüht, den besten Weg zu finden, um über unser Budget zu reden. |
| 3 | fr | Deux personnes doivent comprendre le solde de la même façon | Dans un couple, le budget devient un accord. Un auteur décrit la répartition des rôles : il tient les comptes, sa femme fait la plupart des achats. | 5 | Ma femme et moi on a galéré pendant des années à chercher la meilleure façon de se parler de notre budget. |
| 3 | ja | 二人は残高を同じように理解しなければならない | カップルでは予算が取り決めになる。ある著者は分担を説明している。(segmentation-sensitive) | 5 | 妻と私は、予算をどう伝え合うのがいちばんいいのか、何年も悩んできました。 |
| 4 | ru | Найти еду со своей кухни | Большая база не решает задачу, если в ней трудно найти привычную домашнюю еду, местный продукт или конкретную позицию меню. | 2 | В этом приложении очень мало вариантов продуктов для тех, кто готовит дома. |
| 4 | en | Finding food from your own kitchen | A large database does not solve the job if the usual home-cooked food, a local product or a particular item from a menu is hard to find in it. | 2 | This app gives very few options for foods for a home cook. |
| 4 | de | Essen aus der eigenen Küche finden | Eine große Datenbank löst die Aufgabe nicht, wenn sich das gewohnte selbstgekochte Essen, ein lokales Produkt oder ein bestimmter Posten von einer Speisekarte darin schwer finden lässt. | 2 | Diese App bietet sehr wenige Lebensmittel für jemanden, der zu Hause kocht. |
| 4 | fr | Trouver les aliments de sa propre cuisine | Une grande base ne résout pas la tâche si l’on y trouve difficilement la cuisine maison habituelle, un produit local ou un plat précis d’une carte. | 2 | Cette appli donne très peu d’options d’aliments pour quelqu’un qui cuisine chez lui. |
| 4 | ja | 自分の台所の食事を見つける | 大きなデータベースも、いつもの家庭料理や地元の商品、メニューの特定の品が見つけにくければ、用事を解決しない。 | 2 | このアプリは家で作る人向けの食品の選択肢がとても少ないです。 |
| 5 | ru | Увидеть, что действительно помещается в день | Встречи занимают конкретное время и определяют, что остаётся задачам. | 5 | Мне нравится видеть календарь и задачи на одном экране. |
| 5 | en | See what really fits into the day | Meetings take up specific time and determine what is left for tasks. | 5 | I like seeing my calendar and tasks in one screen. |
| 5 | de | Sehen, was wirklich in den Tag passt | Termine belegen eine konkrete Zeit und bestimmen, was für Aufgaben übrig bleibt. | 5 | Mir gefällt, meinen Kalender und meine Aufgaben auf einem Bildschirm zu sehen. |
| 5 | fr | Voir ce qui tient vraiment dans la journée | Les rendez-vous occupent un temps précis et déterminent ce qui reste aux tâches. | 5 | J’aime bien voir mon calendrier et mes tâches sur un seul écran. |
| 5 | ja | 一日に本当に収まるものを見る | 予定は具体的な時間を占め、タスクに何が残るかを決める。 | 5 | カレンダーとタスクを一つの画面で見られるのがいい。 |

Hidden source apps, for QA only and never rendered: Decor AI: Room & Home Design; HelloHabit - Daily Planner; Goodbudget Budget Planner; Calorie Counter by fatsecret; Pocket Informant.

Note: 4 of the 5 samples come from **paid** research topics. The onboarding shows these fragments regardless of access, as intended.

### 1.6 Page 3 visual: free ideas carousel

- Ideas shown are `ClarityWelcomeExamples.ideaSlugs = ClarityContentAccess.freeIdeaIDs` = `interior-design-1 … interior-design-5` (`ClarityWelcomeExamples.swift:6`, `Inapp/Clarity/ClarityContentAccess.swift:7`).
- Pages = ceil(5/2) = **3**: [1, 2], [3, 4], [5]. The last page has a single card at full width.
- Autoplay every **6 s**, id `onboarding-ideas-carousel` (`ClarityWelcomeContentPreview.swift:31-35`).

Card (`ClarityWelcomeContentPreview.swift:116-147`):

- Layout: pair side by side with 10 spacing; the second card is pushed down 25pt. At accessibility sizes the cards stack vertically. Horizontal padding 20.
- Card: surface background, radius 9, border black 6%.
- Top: the idea cover at aspect 1.5 (asset `EditorialIdeaCover_<slug>` if present, else `IdeaCover_<slug>`, else the category object on the `soft` background; `Inapp/Clarity/ClarityIdeaCardArt.swift:36-44`). For these 5 ideas the cover is `IdeaCover_interior-design-N` (1200×800 JPG).
- Below: title 18/900 and description 14/400 in secondary color, padding 12.
- The card is passive: no tap, no link. a11y combines "title. description"; id `onboarding-inline-idea-<slug>`.

Copy source: an onboarding-only teaser if one exists (`ClarityWelcomeExamples.swift:8-49`); otherwise the idea card copy `idea-cards.<lang>.json → ideas[slug].{title,description}` (`ClarityIdeaCardArt.swift:4-16`). Of the 5 free ideas, only `interior-design-1` has a teaser. The descriptions are always shown in full, free or not.

| slug | lang | Title | Description |
|---|---|---|---|
| interior-design-1 (teaser) | ru | Новая комната. Те же стены. | Новая мебель и отделка на фото твоей комнаты. Стены, окна и двери остаются на месте. |
| | en | A new room. The same walls. | New furniture and finishes on a photo of your room. Walls, windows and doors stay where they are. |
| | de | Ein neuer Raum. Dieselben Wände. | Neue Möbel und Oberflächen auf dem Foto deines Raums. Wände, Fenster und Türen bleiben, wo sie sind. |
| | fr | Une nouvelle pièce. Les mêmes murs. | De nouveaux meubles et de nouvelles finitions sur la photo de ta pièce. Les murs, les fenêtres et les portes restent en place. |
| | ja | 新しい部屋。同じ壁。 | 自分の部屋の写真に、新しい家具と内装。壁、窓、ドアはそのままです。 |
| interior-design-2 | ru | План с точными размерами | Планировщик, где размеры можно вводить числами и уточнять вручную. После правки стены видно, что изменилось рядом, а неудачный шаг можно отменить. |
| | en | A plan with exact dimensions | A planner where dimensions can be entered as numbers and refined by hand. After a wall is edited you can see what changed around it, and a bad step can be undone. |
| | de | Ein Grundriss mit genauen Maßen | Ein Planer, in dem sich Maße als Zahlen eingeben und von Hand nachbessern lassen. Nach der Änderung einer Wand ist zu sehen, was sich daneben geändert hat, und ein misslungener Schritt lässt sich rückgängig machen. |
| | fr | Un plan avec des cotes exactes | Un planificateur où les dimensions se saisissent en chiffres et se corrigent à la main. Après la modification d’un mur, on voit ce qui a changé autour, et une étape ratée peut être annulée. |
| | ja | 正確な寸法の間取り図 | 寸法を数値で入力し、手で詰められるプランナー。壁を編集したあと、周りで何が変わったかが見え、まずい一歩は取り消せる。 |
| interior-design-3 | ru | Поместится ли новый диван? | Расстановка мебели в реальных габаритах до покупки или переезда. Добавляешь размеры комнаты и вещей, сравниваешь варианты и проверяешь свободные проходы. |
| | en | Will the new sofa fit? | Arranging furniture at its real dimensions before a purchase or a move. You add the dimensions of the room and the items, compare layouts and check the walkways. |
| | de | Passt das neue Sofa? | Möbel in echten Maßen aufstellen, bevor gekauft oder umgezogen wird. Du trägst die Maße des Zimmers und der Stücke ein, vergleichst Varianten und prüfst die Laufwege. |
| | fr | Le nouveau canapé rentrera-t-il ? | Disposer les meubles à leurs dimensions réelles avant un achat ou un déménagement. Tu ajoutes les dimensions de la pièce et des objets, tu compares les agencements et tu vérifies les passages. |
| | ja | 新しいソファは入るか？ | 購入や引っ越しの前に、実寸で家具を並べる。部屋と品の寸法を入れ、配置案を比べ、通路を確かめる。 |
| interior-design-4 | ru | Из картинки — в список покупок | Подбор интерьера с переходом к реальным товарам. У каждого предмета — похожие варианты, актуальная цена и ссылка на магазин, чтобы собрать свой список покупок. |
| | en | From a picture to a shopping list | Interior selection that leads on to real products. Every item comes with similar options, a current price and a link to a store, so you can put your own shopping list together. |
| | de | Vom Bild zur Einkaufsliste | Einrichtungsauswahl mit Übergang zu echten Produkten. Zu jedem Stück gibt es ähnliche Varianten, einen aktuellen Preis und einen Link zum Shop, damit du deine eigene Einkaufsliste zusammenstellen kannst. |
| | fr | De l’image à la liste d’achats | Une sélection d’intérieur qui mène à de vrais produits. Chaque objet s’accompagne d’options similaires, d’un prix à jour et d’un lien vers une boutique, pour composer sa propre liste d’achats. |
| | ja | 絵から買い物リストへ | 実在の商品につながるインテリアのセレクション。どの品にも似た候補と、いまの価格と、店へのリンクが付き、自分の買い物リストを組める。 |
| interior-design-5 | ru | Примерить цвет до ремонта | Примерка конкретной краски или обоев на фотографии стены. Сравниваешь варианты в своей комнате, сохраняя расположение окна, мебели и других деталей. |
| | en | Try the color before the renovation | Trying a specific paint or wallpaper on a photo of the wall. You compare options in your own room, with the window, the furniture and the other details staying where they are. |
| | de | Die Farbe vor der Renovierung ausprobieren | Eine bestimmte Farbe oder Tapete auf dem Foto der Wand ausprobieren. Du vergleichst Varianten im eigenen Zimmer, während Fenster, Möbel und andere Details an ihrem Platz bleiben. |
| | fr | Essayer la couleur avant les travaux | Essayer une peinture ou un papier peint précis sur la photo du mur. Tu compares les options dans ta propre pièce, la fenêtre, les meubles et les autres détails restant en place. |
| | ja | リフォームの前に色を試す | 壁の写真の上で、特定の塗料や壁紙を試す。窓も家具もほかの細部もそのままの自分の部屋で、案を比べる。 |

Dead code: teasers for 9 other ideas (`habit-tracking-1`, `personal-finance-2`, `calendars-tasks-5`, `notes-pkm-8`, `nutrition-calories-3`, `workout-fitness-1`, `teleprompter-captions-1`, `car-maintenance-2`, `astronomy-stargazing-3`) remain in `ClarityWelcomeExamples.swift:13-48` with translations, but are no longer displayed. Do not port them unless the owner re-enables them (see §5).

### 1.7 Page 4 visual: "Library" illustration

Same component as §1.4 with `isReviews = false` (`ClarityWelcomeIllustration.swift:95-131`):

- Blob rotated +26°, centered (57%, 47%).
- Main art **`WelcomeLibrary_v7`** (1254×1254 PNG), 86% wide, center (51%, 49%).
- 3 floating topic chips instead of review cards:

| Chip | ru | en | de | fr | ja | pos | angle |
|---|---|---|---|---|---|---|---|
| 1 | Интерьер | Interior | Einrichtung | Intérieur | インテリア | (19%,15%) | −8° |
| 2 | Привычки | Habits | Gewohnheiten | Habitudes | 習慣 | (82%,43%) | +5° |
| 3 | Личные финансы | Personal finance | Persönliche Finanzen | Finances personnelles | 家計管理 | (29%,85%) | −4° |

Chip style: text 12/600 ink, padding 12×10, accentSoft background with radius 4, shadow. On the left edge sits a white 80% "tape" strip 10×19 rotated −8°. Chips enter staggered by 0.16s.

The chip group has one a11y label: «Разборы и идеи: интерьер, привычки, личные финансы» (en "Breakdowns and ideas: interior, habits, personal finance", de "Analysen und Ideen: Einrichtung, Gewohnheiten, persönliche Finanzen", fr "Décryptages et idées : intérieur, habitudes, finances personnelles", ja "分析とアイデア：インテリア、習慣、家計管理").

### 1.8 Motion details (for CSS/JS parity)

Paper layers on pages 2 and 3 (`ClarityWelcomeContentPreview.swift:154-229`). Each layer enters separately when its page becomes active:

| Layer | Resting angle | Entrance angle | Entrance offset (x, y) | Delay | 3D tilt axis / anchor |
|---|---|---|---|---|---|
| article | −3° | −14° | (−24, −48) | 0.12s | X axis, top |
| quote | +3° | +17° | (+28, +76) | 0.29s | X axis, bottom |
| first idea | −3° | −17° | (−24, +66) | 0.12s | Y axis, bottom |
| second idea | +3° | +18° | (+28, +94) | 0.29s | Y axis, bottom |

- Entrance: scale 0.84→1, opacity 0→1, a 3D tilt of 24°, spring (0.88 / 0.59).
- Shadow while entering: black 14%, radius 21, y 19. At rest: black 8.5%, radius 10, y 7.
- Leaving a page: easeIn 0.34s back to the entrance pose.
- At rest: slow drift on a 12s sine (±2px y, ±0.45° rotation).
- Artwork inside cards "breathes" on a 12s sine (scale 1.025–1.075, ±2px) (`:232-246`).
- Flat mode (no rotation) at accessibility text sizes.

Global motion switch (`animates`): user setting `studio.motion` (default true; the Settings toggle was removed) AND not reduced motion AND not VoiceOver AND not accessibility text size AND the scene is active.

Web recommendation: `prefers-reduced-motion: reduce` disables entrances, ambient loops and autoplay. Pause autoplay on `document.hidden`, on hover or focus, and on pointerdown.

### 1.9 Debug-only hooks (do not port)

`-clarityWelcomeStep N` jumps to a step (`ClarityOnboarding.swift:40-44`). `-clarityScreen onboarding|paywall` (`ClarityRoot.swift:111-112`). The old `Views/OnboardingFlowView.swift` is only reachable through the DEBUG `DebugScreenHost` (`Inapp/App/RootView.swift:47-48`).

---

## 2. Plus paywall (`ClarityPaywallView`)

Source: `Inapp/Clarity/ClarityPaywall.swift`. Reference screenshots: `AppStore/Release-2026-09-21/review/annual.png`, `.../review/lifetime.png` (ru, USD storefront).

### 2.1 Entry points and presentation

| Entry | Presentation | `onFinish` / `onBack` | Source |
|---|---|---|---|
| Onboarding page 5 | Inline full screen, progress (5/5) + back button in the header | both set; close → finish route (§1.1) | `ClarityOnboarding.swift:29-33` |
| Tap on a locked idea card (Ideas catalog, related ideas inside a research article) | Modal sheet | none → `dismiss()` | `Inapp/Clarity/ClarityIdeaCard.swift:21,73`; `Inapp/Clarity/ClarityReader.swift:300,413` |
| Locked preview → "Открыть все материалы" | Modal sheet | none | `ClarityContentAccess.swift:59,90` |
| Settings → Plus card ("Открыть Plus" / "О моём Plus") | Modal sheet | none | `ClaritySettings.swift:87,201` |
| DEBUG `-clarityScreen paywall` | Sheet | — | `ClarityRoot.swift:87,112` |

`Inapp/Studio/StudioPaywall.swift` and `Inapp/Views/PaywallView.swift` only wrap `ClarityPaywallView` for legacy callers and are not reachable in Release.

Opening the paywall **never** starts a purchase. On appear, if either product or the entitlement state is not loaded yet, it calls `purchases.start()` (`ClarityPaywall.swift:70-72`). The app also preloads products at launch, after the library (`Inapp/App/InappApp.swift:31-43`).

Web recommendation: route `/app/plus` (or `?paywall=1`) as a modal on desktop and a full-screen sheet on mobile, with a `source` param for analytics (§4).

### 2.2 Layout, top to bottom

Background is paper, foreground ink. Content max width 440, centered, vertically centered when shorter than the viewport. Horizontal padding 24, 16pt gap between blocks (`ClarityPaywall.swift:34-69`).

1. **Header** (`:132-149`):
   - Onboarding only: the back button (44 circle) on the left and the progress indicator (step 5 of 5) as a centered overlay.
   - Always: a text button on the right, «Закрыть» (15/500 secondary, id `paywall-close`), which calls close().
2. **Artwork** (`:151-189`), a11y-hidden. Height: 110 at accessibility sizes; otherwise `clamp(110, viewportHeight − 400, 210)`.

   | Layer | Asset | Size (of box) | Final center / rotation | Enters at |
   |---|---|---|---|---|
   | left | `WelcomeResearch_v7` | 45% w × 74% h | (20%, 37%), −12° | stage 2 |
   | right | `WelcomeProduct_v7` | 43% w × 70% h | (81%, 40%), +9° | stage 3 |
   | center (front) | `WelcomeLibrary_v7` | 81% w × 100% h | (50%, 52%) | stage 1 |

   All three assets are 1254×1254 RGBA PNGs. Stages (`:80-94`), from scale 0.6 with a 3D tilt:
   - stage 1 at 80ms, spring (0.9 / 0.55)
   - stage 2 at +190ms, spring (1.05 / 0.56)
   - stage 3 at +140ms, spring (1.0 / 0.57)

   After that: a 12s ambient float (±3° rotation, ±6–7px).
3. **Title** (38/900, same style as onboarding; id `paywall-heading`):
   - unlocked → «Доступ открыт»
   - trial eligible and annual selected → «3 дня бесплатно»
   - otherwise → «Полный доступ» (`:29-32`)
4. **Description**, always: «Все разборы и идеи, новые выпуски и экспорт материалов.» (`:47`).
5. **Plans**, only if not unlocked (`:97-130`). Two stacked selectable rows with 8pt spacing:
   - Row: radio icon (21pt; filled when selected), then title (16/650) with a detail line under it (12/400 secondary), then the price on the right (15/600, right-aligned).
   - Padding 14, radius 18. Selected: background primary at 5.5%, border 65% at 1.5pt. Unselected: border 15% at 1pt.
   - Rows are disabled while busy. ids `paywall-plan-annual`, `paywall-plan-lifetime`; `aria-selected` equivalent.
   - **Default selection: annual** (`:20`).

   | Row | Title | Detail | Price text |
   |---|---|---|---|
   | annual | «На год» | trial-eligible: «Первые 3 дня бесплатно»; else «Продлевается автоматически» | «%1$@ в год» with the store price, or «Загружаем цену» while loading or missing |
   | lifetime | «Навсегда» | «Один платёж. Без продления.» | the store price (plain), or «Загружаем цену» |
6. **Status lines** (`:191-212`), each shown if its condition holds. The order below is the render order.
   - unlocked → «Полный доступ активен» (15/600, id `purchase-unlocked`)
   - `lastError` → the error text in **red**, 13pt (id `purchase-error`)
   - pending → «Покупка ожидает подтверждения Apple. Доступ откроется после подтверждения.» (13 secondary)
   - selected product unavailable AND not loading AND not unlocked → «Цена пока недоступна. Попробуй загрузить её снова.» (13 secondary, id `paywall-price-unavailable`)
7. **Legal block** (`:278-301`):
   - «Отменить подписку можно в настройках App Store.» (12 secondary). It is shown always, even with lifetime selected or when unlocked.
   - A row of 3 plain text buttons, 12/550 with 18 spacing (vertical at accessibility sizes), each at least 44 tall:
     - «Восстановить» (a11y label «Восстановить покупки», id `restore-access`) → restore()
     - «Условия» → external link `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` (Apple standard EULA)
     - «Приватность» (id `paywall-privacy`) → privacy sheet `StudioPrivacyView`
8. **Footer**, same component and geometry as onboarding (`:214-238`):
   - **Disclosure**, only when not unlocked AND the selected product price is loaded. Line 1 is 15/600; line 2 is 12 secondary.
     - lifetime: «%1$@ один раз» / «Пожизненный доступ. Без подписки.» (id `paywall-lifetime-price`)
     - annual with trial: «3 дня бесплатно, затем %1$@ в год» / «Годовая подписка. Продлевается автоматически.»
     - annual: «%1$@ в год» / «Годовая подписка. Продлевается автоматически.» (id `paywall-annual-price`)
   - **Primary button**: label, id, spinner and disabled state follow §2.3. The spinner shows when `busy || isLoadingProducts`.
   - **Secondary text button** (13/500, id `paywall-free`): «Остаться с бесплатным разбором» when not unlocked, «Закрыть» when unlocked. Both call close().

### 2.3 Primary-button state machine

Evaluated top-down; the first match wins (`ClarityPaywall.swift:240-276`):

| # | Condition | Label (ru) | id | Enabled? | Action |
|---|---|---|---|---|---|
| 1 | unlocked | «Открыть библиотеку» | `purchase-done` | yes | close() |
| 2 | pending | «Проверить статус» | `purchase-check-status` | yes (unless busy) | set requestedAccess; spinner; `purchases.refresh()` |
| 3 | loading products | «Загружаем цену» | `purchase-access` | **no** (spinner) | — |
| 4 | selected product missing | «Загрузить цену снова» | `reload-price` | yes | `purchases.start()` (refetch) |
| 5 | lifetime selected | «Купить навсегда» | `purchase-access` | if `canPurchaseLifetime` | `buyLifetime()` |
| 6 | annual, checking trial eligibility | «Проверяем предложение» | `purchase-access` | no | — |
| 7 | annual, trial eligible | «Начать 3 дня бесплатно» | `purchase-access` | if `canPurchaseAnnual` | `buyAnnual()` |
| 8 | annual | «Оформить подписку на год» | `purchase-access` | if `canPurchaseAnnual` | `buyAnnual()` |

- `busy = isWorking || checkingStatus`. Busy disables the button, the plan rows and Restore.
- `canPurchaseAnnual` = product loaded ∧ entitlements read ∧ ¬unlocked ∧ ¬loading ∧ ¬checking trial ∧ ¬working ∧ ¬pending. `canPurchaseLifetime` is the same minus the trial check (`Inapp/Store/Purchases.swift:215-223`).
- Every primary action except "open library" sets `requestedAccess = true`, and so does Restore.

### 2.4 Purchase, restore and success behaviour

| Flow | Behaviour | Source |
|---|---|---|
| Buy | Sets `isWorking` and clears `lastError`, then opens the system purchase sheet (StoreKit applies an eligible intro offer on its own). **success + verified + same product** → refresh entitlements and finish the transaction; if still not unlocked, set error «App Store принял покупку, но доступ пока не подтверждён. Попробуй восстановить покупки.» **success but unverified** → «Apple не подтвердила покупку. Доступ не открыт.» **userCancelled** (returned or thrown) → silent, no error. **pending** → `isPending = true`. **unknown result** → «App Store пока не подтвердил покупку. Попробуй проверить её статус позже.» **other thrown error** → the system `localizedDescription`. | `Purchases.swift:235-273`, `Inapp/Strings/Strings.swift:221-224` |
| Restore | `AppStore.sync()` (may prompt for Apple ID), then a RevenueCat sync, then refresh. If still locked → «На этом Apple ID покупок не нашлось.» Cancelling the Apple ID prompt is silent. Ignored while working. | `Purchases.swift:276-298`, `Strings.swift:225-228` |
| Catalogue load | Fetches both products. Annual is accepted only if it is auto-renewable with a 1-year period; lifetime only if non-consumable. Errors set `catalogueError`: «App Store пока не вернул годовую подписку. Попробуй ещё раз позже.» / «Не удалось подключиться к App Store. Проверь соединение и попробуй ещё раз.» **`catalogueError` is not rendered anywhere in the Clarity paywall**; the user sees the generic «Цена пока недоступна…» line instead. | `Purchases.swift:110-132` |
| **Success** | Whenever `isUnlocked` flips to true and `requestedAccess` is true, the paywall closes itself (`close()`): the onboarding finishes with the `catalog` route, and a sheet dismisses. Locked previews also close their paywall sheet and render the full content in place, on the same route (`ClarityContentAccess.swift:63-65`). There is **no separate success screen, toast or confetti**. The "Доступ открыт / Полный доступ активен / Открыть библиотеку" state only appears when the paywall is opened while already unlocked, e.g. from Settings. | `ClarityPaywall.swift:73-75,303-305` |
| Close | «Закрыть» (header), «Остаться с бесплатным разбором» / «Закрыть» (footer) and system swipe-down on sheets never change access. Closing from a locked preview returns to the same preview. | `ClarityPaywall.swift:138,220-223` |
| Auto refresh | Entitlements are re-read on StoreKit transaction updates, on subscription status updates, whenever the app becomes active, and at the known expiration boundary (+0.5s), or every 300s if no date is known. | `Purchases.swift:84-107,326-338` |

### 2.5 All paywall strings (ru key → en / de / fr / ja)

| ru | en | de | fr | ja | Source |
|---|---|---|---|---|---|
| Доступ открыт | Access unlocked | Zugang freigeschaltet | Accès ouvert | アクセスが開放されました | `:30` |
| 3 дня бесплатно | 3 days free | 3 Tage gratis | 3 jours gratuits | 3日間無料 | `:31` |
| Полный доступ | Full access | Voller Zugang | Accès complet | フルアクセス | `:31` |
| Все разборы и идеи, новые выпуски и экспорт материалов. | Every breakdown and idea, new releases and material export. | Alle Analysen und Ideen, neue Ausgaben und Material-Export. | Tous les décryptages et toutes les idées, les nouveaux numéros et l’export des contenus. | すべての分析とアイデア、新しい号、資料のエクスポート。 | `:47` |
| На год | Annual | Jährlich | Annuel | 年間 | `:99` |
| %1$@ в год | %1$@ a year | %1$@ pro Jahr | %1$@ par an | 年額%1$@ | `:100,227` |
| Первые 3 дня бесплатно | First 3 days free | Die ersten 3 Tage kostenlos | 3 premiers jours gratuits | 最初の3日間は無料 | `:101` |
| Продлевается автоматически | Renews automatically | Verlängert sich automatisch | Renouvellement automatique | 自動更新 | `:101` |
| Навсегда | Lifetime | Lebenslang | À vie | 買い切り | `:102` |
| Один платёж. Без продления. | One payment. No renewals. | Einmal zahlen. Keine Verlängerung. | Un seul paiement. Sans renouvellement. | 一度のお支払い。更新なし。 | `:103` |
| Загружаем цену | Loading the price | Preis wird geladen | Chargement du prix | 価格を読み込んでいます | `:118,243` |
| Закрыть | Close | Schließen | Fermer | 閉じる | `:138,220` |
| Полный доступ активен | Full access is active | Voller Zugang ist aktiv | L’accès complet est actif | フルアクセスが有効です | `:193` |
| Покупка ожидает подтверждения Apple. Доступ откроется после подтверждения. | The purchase is waiting for Apple to confirm. Access opens once it does. | Der Kauf wartet auf die Bestätigung von Apple. Danach wird der Zugang freigeschaltet. | L’achat attend la confirmation d’Apple. L’accès s’ouvrira ensuite. | 購入はAppleの確認待ちです。確認後にアクセスが開きます。 | `:202` |
| Цена пока недоступна. Попробуй загрузить её снова. | The price isn’t available yet. Try loading it again. | Der Preis ist noch nicht verfügbar. Versuch, ihn noch einmal zu laden. | Le prix n’est pas encore disponible. Essaie de le recharger. | 価格はまだ取得できていません。もう一度読み込んでみてください。 | `:207` |
| Остаться с бесплатным разбором | Stay with the free breakdown | Bei der kostenlosen Analyse bleiben | Rester sur le décryptage gratuit | 無料の分析のままにする | `:220` |
| %1$@ один раз | %1$@ once | Einmalig %1$@ | %1$@ en une fois | %1$@ の一括払い | `:227` |
| 3 дня бесплатно, затем %1$@ в год | 3 days free, then %1$@ a year | 3 Tage gratis, dann %1$@ pro Jahr | 3 jours gratuits, puis %1$@ par an | 3日間無料、その後は年額%1$@ | `:227` |
| Годовая подписка. Продлевается автоматически. | Annual subscription. Renews automatically. | Jahresabo. Verlängert sich automatisch. | Abonnement annuel. Renouvellement automatique. | 年額サブスクリプション。自動更新されます。 | `:230` |
| Пожизненный доступ. Без подписки. | Lifetime access. No subscription. | Dauerhafter Zugang. Kein Abo. | Accès à vie. Sans abonnement. | 永久アクセス。サブスクリプションなし。 | `:230` |
| Открыть библиотеку | Open the library | Bibliothek öffnen | Ouvrir la bibliothèque | ライブラリを開く | `:241` |
| Проверить статус | Check the status | Status prüfen | Vérifier le statut | 状況を確認 | `:242` |
| Загрузить цену снова | Load the price again | Preis erneut laden | Recharger le prix | 価格を再読み込み | `:244` |
| Купить навсегда | Buy lifetime access | Lebenslang freischalten | Acheter l’accès à vie | 買い切りで購入 | `:245` |
| Проверяем предложение | Checking the offer | Angebot wird geprüft | Vérification de l’offre | 提供内容を確認しています | `:246` |
| Начать 3 дня бесплатно | Start 3 days free | 3 Tage gratis starten | Commencer les 3 jours gratuits | 3日間無料で始める | `:247` |
| Оформить подписку на год | Subscribe for a year | Jahresabo abschließen | S’abonner pour un an | 年間プランに登録 | `:247` |
| Отменить подписку можно в настройках App Store. | You can cancel the subscription in App Store settings. | Das Abo kannst du in den Einstellungen des App Store kündigen. | Tu peux annuler l’abonnement dans les réglages de l’App Store. | サブスクリプションはApp Storeの設定で解約できます。 | `:280` |
| Восстановить | Restore | Wiederherstellen | Restaurer | 復元 | `:287` |
| Восстановить покупки (a11y) | Restore purchases | Käufe wiederherstellen | Restaurer les achats | 購入を復元 | `:292` |
| Условия | Terms | Bedingungen | Conditions | 規約 | `:294` |
| Приватность | Privacy | Datenschutz | Confidentialité | プライバシー | `:296` |
| App Store принял покупку, но доступ пока не подтверждён. Попробуй восстановить покупки. | The App Store accepted the purchase, but access isn’t confirmed yet. Try restoring purchases. | Der App Store hat den Kauf angenommen, der Zugang ist aber noch nicht bestätigt. Versuch, die Käufe wiederherzustellen. | L’App Store a accepté l’achat, mais l’accès n’est pas encore confirmé. Essaie de restaurer les achats. | App Storeは購入を受け付けましたが、アクセスはまだ確認されていません。購入の復元をお試しください。 | `Purchases.swift:259` |
| App Store пока не подтвердил покупку. Попробуй проверить её статус позже. | The App Store hasn’t confirmed the purchase yet. Check its status later. | Der App Store hat den Kauf noch nicht bestätigt. Prüf den Status später. | L’App Store n’a pas encore confirmé l’achat. Vérifie son statut plus tard. | App Storeがまだ購入を確認していません。あとで状況を確認してください。 | `Purchases.swift:266` |
| Apple не подтвердила покупку. Доступ не открыт. | Apple could not verify the purchase. Access was not granted. | Apple konnte den Kauf nicht bestätigen. Der Zugang wurde nicht freigeschaltet. | Apple n’a pas pu vérifier l’achat. L’accès n’a pas été ouvert. | Appleが購入を確認できませんでした。アクセスは開放されていません。 | `Strings.swift:221` |
| На этом Apple ID покупок не нашлось. | No purchases found for this Apple ID. | Für diese Apple-ID wurden keine Käufe gefunden. | Aucun achat trouvé pour cet identifiant Apple. | このApple IDでは購入が見つかりませんでした。 | `Strings.swift:225` |
| App Store пока не вернул годовую подписку. Попробуй ещё раз позже. (not rendered) | The App Store hasn’t returned the annual subscription yet. Try again later. | Der App Store hat das Jahresabo noch nicht geliefert. Versuch es später noch einmal. | L’App Store n’a pas encore renvoyé l’abonnement annuel. Réessaie plus tard. | App Storeがまだ年額サブスクリプションを返していません。しばらくしてからもう一度お試しください。 | `Purchases.swift:124` |
| Не удалось подключиться к App Store. Проверь соединение и попробуй ещё раз. (not rendered) | Couldn’t connect to the App Store. Check your connection and try again. | Keine Verbindung zum App Store. Prüf deine Verbindung und versuch es noch einmal. | Impossible de se connecter à l’App Store. Vérifie ta connexion et réessaie. | App Storeに接続できませんでした。通信を確認してもう一度お試しください。 | `Purchases.swift:129` |

Trial strings (rows with «3 дня…») exist in code but **never render in production**, because the trial was removed from App Store Connect (§2.6). Do not show them on the web.

### 2.6 Products and prices

| Field | Annual | Lifetime |
|---|---|---|
| Product id | `com.artsaverin.inapp.annual` (`Purchases.swift:11`) | `com.artsaverin.inapp.lifetime` (`Purchases.swift:12`) |
| ASC id | subscription 6814404493, group 22401038 "inApp Plus", level 1 (`asc-subscription.json`, `asc-subscription-group.json`) | IAP 6814411627 (`asc-lifetime.json`) |
| Type | Auto-renewable subscription, `ONE_YEAR` | `NON_CONSUMABLE` |
| Family sharing | no | no |
| Base price (USD) | **$39.99 / year** (`Tools/asc_release.py:132-133`; `AppStore/Release-2026-09-21/README.md:13`) | **$79.99 one-time** (`Tools/asc_release.py:216`; README:14) |
| Other storefronts | Apple equalization of the USD point across **175** territories (`pricing-audit.json → annual_prices`, 175 entries, all `planType: UPFRONT`) | USA manual; **174** territories automatic (`pricing-audit.json → lifetime_manual` (1, USA), `lifetime_automatic` (174)). Price-point ids: USA/GBR `10417`, DEU/FRA `10447`, RUS `10491`. |
| RUB / EUR local price | **Not recorded in the repo.** `pricing-audit.json` holds only price-point references, not `customerPrice`. | **Not recorded** (same reason) |
| Intro offer / trial | **None.** All 175 intro offers were removed (`removed-introductory-offers.json`; `trial-removal-verified.json`: removed 175, remaining 0; `pricing-audit.json → annual_trials: []`). The code still supports a 3-day free trial if one is configured (`Purchases.swift:200-213`). | n/a |
| Local StoreKit test config | `Products.storekit`: 39.99 / "Полный доступ на год" / "Все разборы и идеи. Оплата раз в год, без пробного периода." | `Products.storekit`: 79.99 / "Plus навсегда" / "Все разборы, идеи и экспорт без ограничений. Одна покупка, без подписки." |
| RevenueCat | product `proda89a589828`, entitlement `plus` | product `proddc7bb467f6`, entitlement `plus` (`AppStore/Release-2026-09-21/revenuecat.json`) |
| Review state | WAITING_FOR_REVIEW (submitted 2026-09-21 12:58 MSK) | same (README:6) |

Displayed price formatting comes from the store (`Product.displayPrice`), e.g. `$39.99`, localized per storefront (`Purchases.swift:300-301`). The historical local-StoreKit value «990,00 ₽» (`Documentation/Clarity/LOCAL-STOREKIT-PRICE.txt`) was a test config for the old lifetime-only build. It is not a production price.

For comparison, not an app fact: the current website sells web lifetime at **990 ₽** (launch promo "Друг проекта", regular 2 990 ₽) through YooKassa and Telegram Stars (`/Users/artsaverin/projects/badcomment-v2/src/lib/tokenConfig.ts:9-21`). This conflicts with the app's price ladder; see open questions.

### 2.7 Web adaptation notes (recommendations)

- StoreKit wording must be replaced on the web. Candidates: «Отменить подписку можно в настройках App Store.» → a web equivalent (cancel in account settings); «Условия» → `https://inapp.pro/<ru|en>/offer` (the app's Settings already links there: `Strings.swift:269-276`); «Восстановить» → "log in to restore" or an account-linking flow; the "Apple pending" copy → payment-provider pending copy.
- Keep: the two plans, annual pre-selected, the price shown on the row and repeated above the CTA, the CTA wording per plan, the secondary "stay with free breakdown" link, auto-close on success, and no success screen.
- Price must come from the server (single source) and never be hardcoded in the component. Keep the «Загружаем цену» / «Загрузить цену снова» states for API failures.

---

## 3. Access model

### 3.1 Entitlement resolution (`Inapp/Store/PurchaseAccess.swift:23-58`)

Input: verified StoreKit records only, never user defaults or purchase history alone (`PurchaseAccess.swift:3-4`). Each record has a kind (lifetime | annual), `isCurrent` (from `Transaction.currentEntitlements`), expiration, revoked, upgraded, subscription state and grace expiration.

1. Discard records that are revoked or upgraded.
2. If any **lifetime** record is current → `unlocked`, `hasLifetimeAccess = true`, no expiration. Lifetime wins over everything.
3. For each annual record, by state:

   | State | Grants access? | Grace flag |
   |---|---|---|
   | `subscribed` | if expiration > now | no |
   | `grace` (billing grace period) | if graceExpiration > now; or, with no grace date, if the record is current | yes |
   | `expired`, `billingRetry`, `revoked`, `unknown` | no | — |
   | status unavailable (offline) | if current (Apple's current entitlements already include subscribed + grace) | yes if the stored expiration ≤ now |
4. Any grant → `unlocked`. `expiration` = the max known date. `isInGracePeriod` = all grants are grace. Multiple statuses (e.g. family) → any valid one wins.
5. No grant → locked.

Note: billing retry after grace **locks** content. Expiry relocks content in place (verified: `AppStore/Release-2026-09-21/README.md:25-27`).

Product → kind: `productID == "com.artsaverin.inapp.lifetime"` → `legacyLifetime`, otherwise annual (`Purchases.swift:316-324`). `legacyLifetimeProductID` **is the same id** as the currently sold lifetime product (`Purchases.swift:13`).

### 3.2 What is free vs Plus

Constants (`Inapp/Clarity/ClarityContentAccess.swift:5-20`):

```swift
static let freeCategory = "interior-design"
static let freeIdeaIDs = ["interior-design-1", "interior-design-2", "interior-design-3", "interior-design-4", "interior-design-5"]
canReadIdea(id)    = isUnlocked || freeIdeaIDs.contains(id)      // ideas: by exact slug, NOT by category
canRead(category)  = isUnlocked || category == "interior-design" // research, observations, legacy category surfaces
```

The published collection is 35 categories (`Inapp/Content/LaunchEdition.swift:6-18`) and 293 ideas. `interior-design` has 8 ideas: 1–5 are free; **6, 7 and 8 are Plus**, even though their category is free.

| Content | Free user | Plus |
|---|---|---|
| Research `interior-design` (full article, quotes, sections, notes) | **full** | full |
| Research, other 34 categories: `habit-tracking, personal-finance, calendars-tasks, notes-pkm, nutrition-calories, workout-fitness, sleep-tracking, language-learning, photo-editing, travel-planning, meal-prep-grocery, voice-recorder, focus-productivity, plant-care, pet-care, guitar-tuner-learn, scanner-pdf, weather-apps, wardrobe-outfit, run-tracking, hiking-trails, flashcards, journaling-mood, invoice-maker, meditation-mindfulness, mind-mapping, car-maintenance, ai-writing, teleprompter-captions, password-manager, translator, astronomy-stargazing, resume-builder, music-streaming` | catalog card fully visible (cover, title, summary) + lock icon; opening it shows the locked preview (§3.4) | full |
| Ideas `interior-design-1…5` | **full** (card, article, export) | full |
| All other ideas (288), including `interior-design-6/7/8` | **artwork only** + lock badge; tap → paywall | full |
| Observation / "problem" pages | by the observation's category (free only for interior-design) | full |
| Legacy app/scenario/category readers, compare, old deck cards | category gate | full |
| Export "Скачать документ" (.txt with full category research + idea + note) | only for the 5 free ideas (the export sheet is itself gated; every action re-checks access) | all ideas |
| Bookmarks (save/unsave) | free, unlimited, any material the user can open | same |
| Personal notes | free; can be written even on locked materials ("Моя заметка к материалу") | same |
| Onboarding samples (§1.5–1.6) | shown to everyone | same |

Sources: `ClarityReader.swift:92` (research gate), `:465-470` (idea gate), `:663-666` (problem gate), `:962-973,1032-1044` (export gate); `Documentation/ContentAccessContract.md:15-23`.

What Plus unlocks (marketing copy): «Все разборы и идеи, новые выпуски и экспорт материалов.» (paywall); Settings: «Подробные исследования, идеи приложений и экспорт материалов.»; ASC review note: "all 35 research topics, 293 app ideas and unlimited export".

### 3.3 Surface-by-surface behaviour for a free user

| Surface | Behaviour | Source |
|---|---|---|
| Research catalog card | Always shows cover, title and summary. A `lock` icon sits next to the title for locked topics (a11y «Полный разбор в Plus», id `clarity-research-lock-<cat>`). Only `interior-design` gets the mint chip «Бесплатный разбор» (id `clarity-free-research-badge`; a11y label «%1$@. Бесплатный разбор.»). Locked a11y hint: «%1$@ Полный разбор в Plus.» (summary + suffix). Tap → pushes the research route, which renders the locked preview. | `Inapp/Clarity/ClarityCatalogs.swift:62,121-141,154-155` |
| Ideas catalog header | Subtitle: free → «5 идей бесплатно. Остальные — в Plus.»; Plus → «Что можно создать или улучшить.» | `ClarityCatalogs.swift:190` |
| Ideas catalog order | Free users see the 5 free ideas first, in `freeIdeaIDs` order, then the rest by rank. | `ClarityCatalogs.swift:176-180` |
| Ideas search | With a non-empty query, **locked ideas are excluded from the results** (their text is not searchable). The category filter still lists locked (art-only) cards. | `ClarityCatalogs.swift:168-174` |
| Locked idea card (catalog, research "related ideas") | Only `ClarityIdeaCardArt` (1.5 aspect), with a lock badge bottom-right: `lock.fill` in accent inside a surface circle, padding 14, inset 16. **No title, description or category text.** a11y label «Идея в Plus», hint «Подробности идеи доступны в Plus.» Tap → **paywall sheet directly**, not the locked preview. | `ClarityIdeaCard.swift:18-34,35-56,70-73` |
| Unlocked idea card | Art + title (Georgia 22) + description + category caption; tap → the idea in a sheet. | `ClarityIdeaCard.swift:35-56,74-90` |
| Idea reached via a link (related "Связанное решение", saved list, stored project, deep route) | Locked preview (§3.4). A related-idea link title reads «Идея в Plus» when locked. | `ClarityReader.swift:531-539` |
| Saved tab rows | Locked idea row: title «Идея в Plus», empty detail. Old deck card: «Идея в Plus». Stored project heading: «Идея в Plus», and the selected features are hidden. The user's own fields and notes stay visible. | `Inapp/Clarity/ClarityMy.swift:237-253,316-322` |
| Research «Читать разбор категории» from an idea | Pushes the research route → category gate. | `ClarityReader.swift:545-548` |
| Settings → «О материалах» → «Бесплатный раздел» | «Разбор интерьеров и 5 идей доступны бесплатно. Остальные идеи и полные разборы открываются с Plus.» | `ClaritySettings.swift:300` |

### 3.4 Locked preview screen (`ClarityContentGate`)

The full reader is **not built** when access is denied: no blur over real text, and nothing locked in the DOM or the a11y tree (`ClarityContentAccess.swift:22-23,51-58`). Web: render locked pages server-side without the protected body. Never ship it hidden with CSS.

Layout (`ClarityContentAccess.swift:68-122`): scrollable, padding 22, max width 640, 24pt vertical gap, app background. The nav bar title is «Разбор» for research and observations, «Идея» for ideas; the tab bar is hidden.

1. Visual. Idea: the idea artwork (a11y-hidden). Research/observation: the category cover artwork, if available.
2. Heading, **research/observation only** (id `clarity-locked-title`): title (Georgia 30) + subtitle (Georgia 19, secondary).
   - research → the niche name + the niche summary (`research-editorial.<lang>.json → summary`, fallback to a short built-in summary; `ClarityReader.swift:18-30`)
   - observation → `problem.displayTitle` + «Наблюдение из разбора «<category>».»
   - **Ideas show no title.**
3. Lock card (`clarityCard`: surface, radius 20, padding 22, hairline border), 16pt gap:
   - Label with a `lock` icon (headline): research «Полный материал в Plus» / idea «Идея доступна в Plus»
   - Body (secondary, line spacing 4): research «Все разборы и идеи — в одной подписке.» / idea «Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом.»
   - Full-width capsule button «Открыть все материалы» (id `clarity-content-paywall`) → paywall sheet
   - Text link «Сначала прочитать бесплатный разбор» (subheadline medium, min height 44, id `clarity-content-free-sample`) → pushes `research("interior-design")`
4. If the material has a reference (research/idea/observation): a row button with a `square.and.pencil` icon, «Моя заметка к материалу» (id `clarity-locked-note`). It opens the note editor; the note title for a locked idea is «Идея в Plus».

After unlocking (a purchase from this screen, or a restore anywhere), the same route re-renders the full content and the paywall sheet closes (`:63-65`).

Strings:

| ru | en | de | fr | ja |
|---|---|---|---|---|
| Полный материал в Plus | Full material in Plus | Vollständiges Material in Plus | Contenu complet dans Plus | 資料の全文はPlusで |
| Идея доступна в Plus | The idea is available in Plus | Die Idee ist in Plus verfügbar | L’idée est disponible dans Plus | このアイデアはPlusで読めます |
| Все разборы и идеи — в одной подписке. | Every breakdown and idea — in one subscription. | Alle Analysen und Ideen — in einem Abo. | Tous les décryptages et toutes les idées — dans un seul abonnement. | すべての分析とアイデアを、一つのサブスクリプションで。 |
| Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом. | Open the solution, the evidence behind it and the full category breakdown. All of it saves as one document. | Öffne die Lösung, ihre Belege und die vollständige Kategorie-Analyse. Alles lässt sich als ein Dokument speichern. | Ouvre la description de la solution, ses preuves et le décryptage complet de la catégorie. Tout s’enregistre en un seul document. | 解決策の説明、その根拠、カテゴリーの分析全文を開けます。すべてを一つの文書として保存できます。 |
| Открыть все материалы | Unlock all materials | Alle Materialien freischalten | Ouvrir tous les contenus | すべての資料を開放する |
| Сначала прочитать бесплатный разбор | Read the free breakdown first | Zuerst die kostenlose Analyse lesen | Lire d’abord le décryptage gratuit | まず無料の分析を読む |
| Моя заметка к материалу | My note on the material | Meine Notiz zum Material | Ma note sur le contenu | 資料への自分のメモ |
| Идея в Plus | Idea in Plus | Idee in Plus | Idée dans Plus | アイデアはPlusで |
| Подробности идеи доступны в Plus. (a11y hint) | The details of the idea are in Plus. | Die Details der Idee gibt es in Plus. | Les détails de l’idée sont dans Plus. | アイデアの詳細はPlusで読めます。 |
| Полный разбор в Plus (a11y) | Full breakdown in Plus | Vollständige Analyse in Plus | Décryptage complet dans Plus | 分析の全文はPlusで |
| %1$@ Полный разбор в Plus. (a11y hint) | %1$@ The full breakdown is in Plus. | %1$@ Die vollständige Analyse gibt es in Plus. | %1$@ Le décryptage complet est dans Plus. | %1$@ 完全な分析はPlusで読めます。 |
| Бесплатный разбор | Free breakdown | Kostenlose Analyse | Décryptage gratuit | 無料の分析 |
| %1$@. Бесплатный разбор. (a11y) | %1$@. Free breakdown. | %1$@. Kostenlose Analyse. | %1$@. Décryptage gratuit. | %1$@。無料の分析。 |
| 5 идей бесплатно. Остальные — в Plus. | 5 ideas for free. The rest with Plus. | 5 Ideen kostenlos. Alle weiteren mit Plus. | 5 idées gratuites. Les autres avec Plus. | 5つのアイデアを無料で。残りはPlusで。 |
| Что можно создать или улучшить. | What could be built or improved. | Was sich bauen oder verbessern lässt. | Ce qu’on peut créer ou améliorer. | 何をつくれるか、何を良くできるか。 |
| Разбор (nav title) | Breakdown | Analyse | Décryptage | 分析 |
| Идея (nav title) | Idea | Idee | Idée | アイデア |
| Наблюдение из разбора « + name + ». | Observation from the breakdown « … | Beobachtung aus der Analyse « … | Observation du décryptage « … | 分析からの所見 « … |
| Бесплатный раздел | Free section | Kostenloser Bereich | Section gratuite | 無料の範囲 |
| Разбор интерьеров и 5 идей доступны бесплатно. Остальные идеи и полные разборы открываются с Plus. | The interior design breakdown and 5 ideas are free. Plus unlocks the other ideas and full breakdowns. | Die Analyse zur Raumgestaltung und 5 Ideen sind kostenlos. Plus öffnet die übrigen Ideen und vollständigen Analysen. | L’analyse sur l’aménagement intérieur et 5 idées sont gratuites. Plus donne accès aux autres idées et aux analyses complètes. | インテリアの分析と5つのアイデアは無料です。残りのアイデアと分析全文はPlusで読めます。 |

Note: the observation subtitle is built by string concatenation (`L("Наблюдение из разбора «") + name + "»."`), so the closing «». is not localized (`ClarityReader.swift:665`). On the web, use a single template string.

### 3.5 Access status display (Settings → Plus card)

`ClaritySettings.swift:22-33,199-281`. The card header is the literal "inApp PLUS" (not localized); when unlocked it adds a check label «Активен». Art: `WelcomeLibrary_v7` at height 112. Title «Все разборы и идеи»; text «Подробные исследования, идеи приложений и экспорт материалов.»; action row «Открыть Plus» (locked) or «О моём Plus» (unlocked) → the paywall sheet.

Caption under the action (first match wins):

| Condition | Caption ru (en) |
|---|---|
| locked and entitlements read | annual price «%1$@ в год», else «Годовая подписка» ("Annual subscription") |
| DEBUG preview mode | «Plus · режим просмотра» |
| entitlements not read yet | «Проверяем доступ…» ("Checking access…") |
| lifetime | «Бессрочный доступ» ("Lifetime access") |
| grace period | «Проверь способ оплаты в App Store» ("Check your payment method in the App Store") |
| annual with a date | «Доступ до %1$@» ("Access until %1$@"), date as `d MMMM yyyy` in the UI locale |
| otherwise unlocked | «Все разборы, идеи и экспорт» ("Every breakdown, idea and export") |

Below the card:

- «Управление подпиской» → `https://apps.apple.com/account/subscriptions`. Shown only for unlocked annual, not lifetime.
- «Восстановить покупки» / «Восстанавливаем…». Result line: `lastError` ?? «Plus активен на этом устройстве.» ("Plus is active on this device.") ?? «Доступ Plus не подтверждён. Можно повторить восстановление.» ("Plus access isn’t confirmed. You can try restoring again.")

### 3.6 Legacy handling

| Legacy item | Current behaviour | Source |
|---|---|---|
| Earlier lifetime buyers (the pre-subscription app sold one lifetime product, "Разовая покупка") | Same product id `com.artsaverin.inapp.lifetime` → permanent Plus (`hasLifetimeAccess`). No expiry, no "Manage subscription" link, Settings shows «Бессрочный доступ». | `Purchases.swift:12-13,316-324`; `PurchaseAccess.swift:25-27`; `Documentation/Clarity/README.md:39` |
| Old free-export allowance (`Shelf.freeExports = 2`, `shelf.exported` slugs) and `StudioAccess.openExamples` | **No longer grant any access in Clarity.** Counters are kept and neither reset nor consumed. Export is decided by `canReadIdea` only. | `Inapp/Store/Shelf.swift:21,58-71`; `Documentation/ContentAccessContract.md:33` |
| Bookmarks, notes, projects, comparisons, old deck cards | Never deleted when access changes. Losing access hides editorial text only. | `ContentAccessContract.md:29-31` |
| Onboarding categories / goal | `preferences.categories` (≤ 3) persist but grant nothing. | `ContentAccessContract.md:5`; `StudioPreferences.swift:33-39` |
| DEBUG access preview (`debug.accessPreview` = appStore/free/plus) | Developer menu only, compiled out of Release. Purchases and restore are refused with «Сейчас включён режим просмотра…». | `Purchases.swift:40-70,236-239,277-280` |
| **Web legacy** (not in the app) | The current site stores `User.lifetime` (web lifetime at 990/2990 ₽) and per-item `Unlock` rows (`app/idea/chapter/category/ideas/apps`), plus a free anonymous card meter (2+2 reveals) (`/Users/artsaverin/projects/badcomment-v2/prisma/schema.prisma:125-177`, `src/lib/tokenConfig.ts:9-35`). | see open questions |

Security boundary: the app's gate is a UI gate over bundled content; it is not encryption or server auth (`ContentAccessContract.md:59-61`). **Web must enforce access on the server.** Locked research/idea bodies, quotes and export files must never be sent to unentitled clients. That includes RSC payloads, JSON props and search indexes.

---

## 4. Telemetry (PurchaseMetrics) and the web analytics mirror

### 4.1 What the app actually sends

`Inapp/Store/PurchaseMetrics.swift`. This is the only analytics in the app (checked: no other SDK; `Inapp.xcodeproj/project.pbxproj` has a single package, RevenueCat).

| Call | When | Payload | Source |
|---|---|---|---|
| `start()` | App init. Release builds on device only, with an `appl_` key from Info.plist `RevenueCatPublicSDKKey`. | Configures RevenueCat in **observer mode** (`purchasesAreCompletedBy: .myApp`, StoreKit 2), `automaticDeviceIdentifierCollectionEnabled = false`, log level warn. Anonymous RC app user id; no custom attributes. | `:7-26`; `InappApp.swift:17` |
| `record(result)` | After **every** `product.purchase()` that returns a result: success, userCancelled or pending. **Thrown errors are not recorded.** | `RevenueCat.recordPurchase(result)`, fire-and-forget; an outage never blocks access | `:28-33`; `Purchases.swift:246-247` |
| `sync()` | After a successful `AppStore.sync()` (Restore) | `RevenueCat.syncPurchases()` | `:35-39`; `Purchases.swift:286-287` |

RevenueCat project config: `AppStore/Release-2026-09-21/revenuecat.json` (project, app, products, entitlement `plus` with both product ids, `trackNewPurchasesFromServerNotifications: true`). The privacy sheet declares this use: RevenueCat gets a random install id and purchase/trial/renewal data, but no notes, bookmarks or reading history (`Inapp/Studio/StudioPrivacy.swift:21-24`).

The app has **no** screen, onboarding, paywall-view or funnel events.

### 4.2 Web analytics to mirror (recommendation)

The site already sends events to Yandex Metrika (`ym 110047715`) and GA4 (`G-G3J6K8VBD6`) through `/Users/artsaverin/projects/badcomment-v2/src/lib/track.ts` (`paywall_view`, `offer_open`, `login_required`, `begin_checkout`, `add_payment_info`, `payment_redirect`, `payment_error`, `purchase`, `locked_category_open`, `review_category_open`). Reuse those names where they fit, so historical funnels stay comparable, and add the rest.

| Event | Params | Mirrors app moment |
|---|---|---|
| `onboarding_step_view` | `step` 1–5, `step_id` (`onboarding-welcome` / `-value` / `-library` / `-updates` / `paywall`), `replay` bool | each page shown |
| `onboarding_skip` | `step`, `replay` | «Пропустить» / «Закрыть» |
| `onboarding_complete` | `route` (`sample` / `catalog` / `replay-close`) | `finish()` |
| `paywall_view` (existing) | `source` (`onboarding`, `idea_card`, `locked_research`, `locked_idea`, `locked_observation`, `settings`), `currency`, `value` of the default plan | paywall appears |
| `paywall_plan_select` | `plan` (`annual` / `lifetime`) | radio tap |
| `paywall_close` | `source`, `via` (`header` / `stay_free` / `back` / `esc`) | close() |
| `price_unavailable` / `price_reload` | `plan` | «Цена пока недоступна» / «Загрузить цену снова» |
| `begin_checkout` (existing) | `item_id` = product id, `plan`, `value`, `currency` | CTA tap = `product.purchase()` |
| `purchase` (existing) | `transaction_id`, `item_id`, `plan`, `value`, `currency` | verified success = RC `recordPurchase` success. Fire only after server confirmation, as `PurchaseTracker` already does. |
| `purchase_pending` | `plan` | `.pending` |
| `purchase_cancel` | `plan` | `.userCancelled` |
| `payment_error` (existing) | `plan`, `reason` | `lastError` set |
| `restore_start` / `restore_result` | `found` bool | Restore = RC `syncPurchases` |
| `locked_category_open` (existing) / `review_category_open` (existing) | `category` | locked/free research preview |
| `locked_idea_open` | `idea`, `category` | locked idea preview or card tap |
| `free_sample_click` | `from` (`locked_preview`) | «Сначала прочитать бесплатный разбор» |

If the web adopts RevenueCat Web Billing (or reports web purchases to RC), map both web products to the same `plus` entitlement so cross-platform dashboards line up.

---

## 5. Code vs. docs discrepancies (code wins)

| Topic | Docs say | Code says (shipped) |
|---|---|---|
| Free ideas | `ContentAccessContract.md:7`: every idea with category `interior-design` (1…8) is free | Only `interior-design-1…5` (`ClarityContentAccess.swift:7`). Release README and review notes agree with the code. |
| Locked idea metadata | `ContentAccessContract.md:8`: cover, title and short description of any material are public. `LibraryRefresh-2026-09-20/README.md:80` + screenshot `paid-idea-card-free-dark.png`: locked cards show title, category and a "Plus" chip | Locked idea cards show **art + lock only**; the locked idea preview shows **no title** (`ClarityIdeaCard.swift:35`, `ClarityContentAccess.swift:79-82`). Research previews still show title and summary. |
| Onboarding ideas | `EditorialOnboarding-2026-09-16/README.md:11,31` and `LibraryRefresh README:100`: 10 ideas from 10 topics in 5 pairs. UI tests (`InappUITests/ClaritySubscriptionVisualUITests.swift:245-283,361`) expect `habit-tracking-1` etc. | 5 free interior ideas in 3 pages (`ClarityWelcomeExamples.swift:6`, modified 2026-09-21, after the tests of 2026-09-20). The tests are stale. |
| Page 4 title | EditorialOnboarding README: «Библиотека идей» | «Новые выпуски» (`ClarityOnboarding.swift:18`); LibraryRefresh README:98 agrees with the code |
| Typography | EditorialOnboarding README:15: title 34 / description 15, width 340 | 38 (cap 48) / 18 (cap 26, weight 450), width 360 (`ClarityWelcomeTypography.swift:8-13`) |
| Onboarding structure | `Documentation/Clarity/README.md:17`: 3 steps (promise → pick up to 3 categories → first material) | 4 story pages + paywall; no category picking (`ClarityOnboarding.swift`) |
| Monetization | `Documentation/Clarity/README.md:39`: lifetime only, "no new subscription", free exports | Annual + lifetime; export is gated by idea access; free-export counters are unused |
| Trial | The code has a full 3-day-trial path and copy | Trial removed in ASC for all 175 territories; the path never activates in prod |
| Onboarding palette | Earlier docs: forced light theme | Follows the app theme (LibraryRefresh README:7) |

---

## 6. QA / test ids to keep as `data-testid`

Onboarding: `onboarding-welcome`, `onboarding-value`, `onboarding-library`, `onboarding-updates`, `onboarding-story-description`, `onboarding-back`, `onboarding-skip`, `onboarding-continue`, `onboarding-articles-carousel`, `onboarding-ideas-carousel`, `onboarding-inline-article-title`, `onboarding-inline-article-excerpt`, `onboarding-inline-quote-source`, `onboarding-inline-quote`, `onboarding-inline-idea-<slug>`.

Paywall: `paywall-content`, `paywall-heading`, `paywall-close`, `paywall-plan-annual`, `paywall-plan-lifetime`, `paywall-annual-price`, `paywall-lifetime-price`, `paywall-price-unavailable`, `purchase-access`, `purchase-done`, `purchase-check-status`, `reload-price`, `purchase-unlocked`, `purchase-error`, `restore-access`, `paywall-privacy`, `paywall-free`.

Access: `clarity-content-locked`, `clarity-locked-title`, `clarity-content-paywall`, `clarity-content-free-sample`, `clarity-locked-note`, `clarity-free-research-badge`, `clarity-research-lock-<cat>`, `clarity-idea-<slug>` (card), `clarity-open-plus`, `clarity-settings-restore`, `clarity-settings-restore-result`, `clarity-restart-onboarding`.

Stable fixtures (`ContentAccessContract.md:57`): free `interior-design`, `interior-design-1`; paid `calendars-tasks`, `habit-tracking-1`. Add `interior-design-6` as a "free category but paid idea" fixture.
