# Review: localization quality (de · fr · ja, plus ru/en sanity)

Reviewer key: `i18n-quality` · checked 2026-09-23 against the shared dev server `:3210` and the working tree of
`site-v2`. Report only: no product files were edited.

**Result: 0 blockers · 3 major · 24 minor.** No app UI key is missing in any pack. No Russian leaks onto
de/fr/ja/en pages, apart from two intended cases. Most findings are typography and terminology drift in the
web-only copy.

**Files in progress during the review.** These were still changing: `settings/keys.ts`, `settings/format.ts`,
`settings/SettingsScreen.tsx`, `welcome/WelcomeFlow.tsx`, `welcome/keys.ts`, `ui/strings.ts` and
`legal/strings.ts` (`supportTitle` was added while the review ran). They are reviewed as they stood at the end
of the review. Every feature folder listed in ARCHITECTURE §2 exists. `welcome` has no web-only strings table,
which is correct because it uses only app keys. Re-run the scripts below once the other agents finish.

## Tools (in this folder, read-only unless stated)

| Script | What it does | Result now |
|---|---|---|
| `node docs/site-v2/review/check-ui-keys.mjs [--json]` | Uses the TypeScript AST to extract every `t("…")`, `t.count/plural("…")`, `t(MAP[x])` (resolved) and every `*_KEYS` literal in `src/site/**` and `src/app/(site)/**`. It checks each key against `content/v2/<L>/ui.json` (strings/plurals). It shows what the fallback chain would render for a missing key, and checks that every client `t()` key is handed down by the `t.pick(…)` provider that wraps that file. It also lists Cyrillic literals outside tables. Exits 1 on a leak, so it can be used as a CI gate. | **172 unique keys, 487 uses; 0 missing in ru/en/de/fr/ja; 0 client keys missing from their provider.** 3 dynamic calls are covered: `document.ts` literals, `WelcomeFlow` `CHIPS` (in `WELCOME_UI_KEYS`) and `client.tsx` itself. |
| `python3 docs/site-v2/review/scan-rendered.py [de fr ja en ru]` | Fetches 20 routes per locale from `:3210`. Strips scripts. Reports Cyrillic in text, attributes, `<title>` and meta, the `<html lang>`, and locale typography. | See the "Leaks" section. |
| `node docs/site-v2/review/lint-web-strings.mjs` | Lints typography and register of every `defineStrings` table per locale. | 83 hits, all covered below. |
| `node docs/site-v2/review/fr-nbsp-codemod.mjs [--write]` | AST codemod for M1. It touches only string/JSX literals inside `fr` blocks. The default is a dry run. | 86 literals in 9 files would change. |

Also verified:
- The `content/v2/<L>/ui.json` files are identical to `Inapp/Resources/ui.<L>.json` (755 strings and 5 plural keys each).
- `BUILTIN_UI` (`src/site/i18n/builtin.ts`) equals the pack values verbatim.
- Placeholders match across all 5 locales: `{x}` in 1024 web-string pairs and `%n$@` in 4×755 pack strings.
- No de/fr/ja web string is left in English or is empty, except "Support", "Filter", "SBP" and the "App Store · {region} · {date}" template, which are legitimate.

## Leaks: Russian or English on de/fr/ja pages (rendered)

- **Cyrillic:** none, except two intended cases:
  1. The native name "Русский" in the language picker (`LOCALE_NAMES`, as in the app's `AppLocale.swift`).
  2. The Russian-only payment offer on `/<L>/offer/payment`. It is correct as built: `lang="ru"` on the article, a localized note in the page language, `noindex` and a canonical to `/ru`.
- **JSON-LD:** no Cyrillic. `inLanguage` is correct. `<html lang>` is correct on every route. hreflang covers the 5 locales plus `x-default=en`.
- **English on de/fr/ja pages:** only proper nouns (app names, developer names, the Almaty address) and the 37 "Скоро в новом формате" topic names from the old site. Those names are correctly marked `lang="en" hrefLang="en"`, and the page adds a localized "(auf Englisch) / (en anglais) / （英語）" note.
- **ru and en:** clean. ru uses «ты» throughout. The only «вы» is Apple's official badge text «Загрузите в App Store», which is correct.

## Tone (vs the app packs)

- **de "du", fr "tu":** 100 % in the web copy, including the legal documents. (The "Sie erhalten…" in the de privacy policy is the plural "they", not the formal "you".)
- **ja register:** the app is polite です・ます. In `ui.ja.json`, ください appears 30 times, いただく 0, ございます 0, and the casual だよ/しよう 0.
  - ARCHITECTURE §6 says "casual Japanese". That wording is wrong, but the code comment in `i18n/strings.ts:17` is right.
  - **Doc fix (ARCHITECTURE §6):** replace "du / tu / casual Japanese" with "du / tu / plain polite Japanese (です・ます like ui.ja.json — no いただく/ご〜いただけます/ございます, no だ/よ)".

---

## MAJOR

### M1. fr: the web copy has no no-break space before `: ; ! ? »` and after `«`, but the app pack does
- **Source:** `Inapp/Resources/ui.fr.json` uses U+00A0 344 times, for example `:417 "Résultats : %1$@"` and `:118 "Actions : %1$@"`.
- **Why it matters:** on the same screen, app strings carry the NBSP and web strings don't. On narrow widths the web strings can wrap a lone `?`, `:` or `»` onto the next line. This shows on the landing (the FAQ questions "Qu’est-ce qu’inApp ?" and so on), sign-in, the paywall, the topic pages and the legal pages.
- **Web locations:**
  - 86 literals in these files:
    - `auth/strings.ts:152,165,167,176,179`
    - `ideas/strings.ts:50,53,57`
    - `landing/strings.ts` (21 entries: 385, 422, 423, 443, 456–484)
    - `plus/strings.ts:156,157,178,182`
    - `research/strings.ts:91,97`
    - `legal/strings.ts:53,61`
    - `legal/terms.tsx` fr (24, lines 694–899), `legal/privacy.tsx` fr (14, lines 298–390), `legal/support.tsx` fr (11, lines 167–204)
  - Code that builds the text itself:
    - `src/site/features/landing/parts.tsx:38` returns `` `« ${text} »` `` with plain spaces.
    - `src/site/shell/HeaderParts.tsx:57` builds `` `${label}: ${LOCALE_NAMES[locale]}` ``, which renders "Langue: Français" and "言語: 日本語".
    - `src/site/features/landing/LandingPage.tsx:289` builds `` `${s.openBreakdown}: ${a.label}` ``.
    - `src/site/features/library/components.tsx:210` builds `` `${t("Моя заметка")}: ${title}` ``.
    - `src/site/features/ideas/IdeaArticle.tsx:41` builds `` `${s.categoryLabel}: ${idea.categoryName}` ``.
    - `src/app/(site)/site/[lang]/contacts/page.tsx:51` hard-codes `<span>E-mail: </span>` for every locale.
- **Fix:**
  1. Run `node docs/site-v2/review/fr-nbsp-codemod.mjs --write`. It replaces ` [:;!?»]` → ` $1` and `« ` → `« ` inside `fr` blocks only. Owners run it.
  2. In `parts.tsx:38`, change the return to `` `« ${text} »` ``.
  3. Add this helper to `src/site/i18n/translate.ts` and use it at the 5 code sites above:
     ```ts
     export function labelValue(locale: Locale, label: string, value: string): string {
       return locale === "fr" ? `${label} : ${value}` : locale === "ja" ? `${label}：${value}` : `${label}: ${value}`;
     }
     ```
  4. For the contacts page, use `labelValue(lang, "E-mail", …)` (ja: `メール`), or move the label into `supportDoc`.

### M2. ja: the paywall benefit line is ungrammatical ("293 アイデアの詳細")
- **Web:**
  - `src/site/features/plus/server.ts:45` passes `t.count("идея", 293)`, which renders "293 アイデア" in the app's Plural.text shape, number + space + word.
  - `plus/strings.ts:195` wraps it in `"{ideas}の詳細"`.
  - The rendered result is "293 アイデアの詳細". The line next to it renders "35件の分析をすべて — 発見とレビューの引用つき", with a Western dash inside Japanese.
- **Source:** `UIStrings.swift:167-170` (`Plural.text`) is meant for "N word" labels, not for embedding in a Japanese phrase. The app writes counted Japanese phrases with 件, e.g. `ui.ja.json` "%3$@件の%4$@…%1$@件の%2$@".
- **Fix:**
  - In `server.ts:45`:
    ```ts
    const ideas = locale === "ja" ? `${t.number(LAUNCH_IDEAS.length)}件のアイデア` : t.count("идея", LAUNCH_IDEAS.length);
    ```
  - `plus/strings.ts:195` ja: `benefitIdeas: "{ideas}を詳しく"`, which renders "293件のアイデアを詳しく".
  - `plus/strings.ts:194` ja: `benefitTopics: "{topics}をすべて（発見とレビューの引用つき）"`.

### M3. de: the landing uses "Bewertungen" for reviews (отзывы), but the app uses "Rezensionen" and keeps "Bewertung" for star ratings
- **Source:**
  - `ui.de.json:774` plural `"отзыв" → Rezension/Rezensionen` (30 strings).
  - "Bewertung" appears only for оценка/рейтинг, e.g. `"Оценка магазина · до 5" → "Store-Bewertung · bis 5"`.
- **Web:** `landing/strings.ts` lines 253, 255, 258, 261, 271, 272, 294, 310, 340 and 343. In 343 (faq2A), both terms appear in one paragraph: "entstehen aus Rezensionen … stützen sich auf {reviews} Bewertungen". Also `plus/strings.ts:104` "Zitaten aus Bewertungen".
- **Why it matters:** on the landing, review quote cards say "Bewertung: 4 von 5 Sternen" right next to "Echte Bewertungen". A German reader cannot tell reviews from ratings.
- **Note:** spec 08 took the metaTitle and metaDescription from the de App Store listing for ASO. Keep those two if the owner wants (owner call). Change the body copy:
  - 258 `heroEyebrow: "35 Themen. Echte Rezensionen. Neue Möglichkeiten."`
  - 261 and 340: "…auf Grundlage öffentlicher App-Rezensionen."
  - 271 `statReviews: "Rezensionen zu {apps} Apps"`
  - 272 `statReviewsHint: "So viele Rezensionen stecken in den {topics} veröffentlichten Analysen."`
  - 294 `step1Title: "Verstehe das Bedürfnis hinter der Rezension"`
  - 310 `trustTitle: "Wie wir mit Rezensionen arbeiten"`
  - 343: "…stützen sich auf {reviews} Rezensionen zu {apps} Apps; das gesamte Recherche-Archiv umfasst {archiveReviews} Rezensionen zu {archiveApps} Apps. … Die meisten Zitate stammen aus englischsprachigen Rezensionen; …"
  - `plus/strings.ts:104`: `"{topics} komplett — mit Erkenntnissen und Zitaten aus Rezensionen"`

---

## MINOR

### Japanese
1. **Keigo, which the app never uses.** Replacements:
   - `auth/strings.ts:234` → `"現在、メールでのログインは利用できません。"`
   - `auth/strings.ts:237` → `"現在、Googleでのログインは利用できません。別の方法を選んでください。"`
   - `plus/strings.ts:201` → `"お支払いの前にログインしてください。アクセスはあなたのアカウントに紐づきます。"`
   - `plus/strings.ts:206` → `"現在お支払いは利用できません。しばらくしてからお試しください。"`
   - `plus/strings.ts:214` → `"iPhoneアプリのPlusは、App Storeで別に購入できます。サイトでの購入とApp Storeのサブスクリプションは連携しておらず、相互に復元することはできません。"`
   - `plus/strings.ts:224` → `"…料金が請求された場合はサポートに連絡してください。"`
   - `ui/strings.ts:43` → `"…それまではWeb版を使えます。"`
2. **Counter つ** is only valid for 1–9. The values are data-driven and happen to be ≤ 9 today (7/8/5):
   - `landing/strings.ts:515` → `"{parts}部構成・所見{observations}件・アイデア{ideas}件"`
   - `:561` → `"そこから{n}件のアイデア"`
   - `:584` → `"「{topic}」の分析と{n}件のアイデアは、…"`
3. **Terms differ from the app.**
   - The app uses エクスポート (4×, e.g. `ui.ja.json:78`) and never 書き出し. The app uses 端末 (11×, e.g. `:172`) and never デバイス. The app prefers 文書 (7×) over ドキュメント.
   - Replace in `landing/strings.ts`:
     - 537 `"アイデアを背景情報と一緒にエクスポート"`
     - 564 `"無料アイデアのエクスポート"`
     - 566 `"エクスポート無制限"`
     - 584 `"…エクスポートも無制限になります。"`
     - 588 `"エクスポートには何が入りますか？"`
   - `plus/strings.ts:196` → `"資料を文書にエクスポート"`.
   - `auth/strings.ts:200` → `"…どの端末からでも使えます。"`
   - `auth/strings.ts:225` → `"{email}にログイン用リンクを送りました。この端末で開いてください。…"`
   - The landing's 口コミ / 分野 come from the ja store copy (spec 08 l.61/78, ASO). The app says レビュー / テーマ. Keep them in the meta and hero if the owner wants. At minimum, `landing/strings.ts:578` (faq2A) mixes レビュー and 口コミ in one paragraph: use 口コミ throughout, or レビュー throughout.
4. **Spaces between Japanese and Latin text.** The app puts no space there (`"%1$@と比べる…"`).
   - `ideas/strings.ts:64` → `"{app}へのレビュー"`
   - `shell/strings.ts:82` → `"inAppホーム"`
   - `ui/strings.ts:41` → `"iPhone版inApp"`
   - `auth/strings.ts:225` (see item 3)
   - `plus/strings.ts:189`: see item 13 ("Plus 買い切り").
5. **Western dashes and title separators.**
   - `landing/strings.ts:490` → `"アプリ市場調査とアイデア図鑑｜口コミから探る35分野｜inApp"`
   - `:493` → `"inApp｜口コミの分析とアプリのアイデア"`
   - Page titles use `title.template: "%s — inApp"` (`src/app/(site)/site/[lang]/layout.tsx:34`). For ja, use `"%s｜inApp"`.
6. **Casual volitional form.** `landing/strings.ts:533` → `"アイデアの根拠を知る"`, a noun phrase like steps 1, 3 and 4. heroTitle and finalTitle ("見つけよう") are store copy, so keep them.
7. **Newline replaced with a space.** `settings/client.tsx:84` does `t("Все разборы\nи идеи").replace(/\n/g, " ")`, which renders "すべての分析 とアイデア". The app has the same defect (`ClaritySettings.swift:222`). Fix: `.replace(/\n/g, locale === "ja" ? "" : " ")`, and the same in Swift.
8. **Space between two Japanese sentences.** `LandingPage.tsx:519` renders `{s.plusTerms} {t("Отменить подписку…")}` with a space. For ja, join with `""`.
9. **Japanese serif fallback.** `src/site/styles/tokens.css:108` has no "Noto Serif JP". On Android and Windows without Hiragino or Yu Mincho, Japanese reading text falls back to sans. Append `"Noto Serif JP"` after `"Yu Mincho"`.

### German
10. **Dash style.**
    - The app's de pack uses spaced em dash `—` (10×) and never `–`. The web de copy uses `–` in 16 strings: auth 106–108, 131, 137, 144; landing 253, 256, 317, 362; legal privacyDescription; plus 104, 111, 134; research 84; shell 48. Two other de strings already use `—` (library syncError, landing step4Body).
    - Fix: replace ` – ` with ` — ` in de blocks.
11. **Hyphenation.** `landing/strings.ts:366` "App Store-Accounteinstellungen" → "App-Store-Kontoeinstellungen". The app says "Konto".
12. **Ellipsis spacing.** `ideas/strings.ts:42` → `"Das Dokument wird zusammengestellt…"`, like the app's "Materialien werden geöffnet…" (`builtin.ts:74`).
13. **Lifetime wording.** The app says "dauerhaft" / "Lebenslang" (`ui.de.json:40` "Plus dauerhaft"; paywall plan `ClarityPaywall.swift:102` `L("Навсегда")` → "Lebenslang").
    - `landing/strings.ts:352` "als lebenslanger Zugang" → "als dauerhafter Zugang".
    - `landing/strings.ts:349` "inApp Plus öffnet die gesamte Sammlung und unbegrenzten Export." → "inApp Plus schaltet die gesamte Sammlung und den unbegrenzten Export frei."
    - `landing/strings.ts:277` `freeInside: "Darin"` → `"In der Analyse"`.

### French
14. `landing/strings.ts:440` "Tes favoris et tes notes" → "Tes signets et tes notes". "signets" is the app's term (`ui.fr.json`) and is used everywhere else on the site.
15. The landing says "application(s)" 9× (metaTitle, hero, faq). The app pack uses "app" 52× and "application" 2×. The landing wording is store/ASO copy, so this is an owner call. The body copy could switch to "app(s)".

### English and all locales
16. **Missing quotes in en.** `landing/strings.ts:230` renders "The Interior design and floor plans breakdown and 5 ideas…". Fix: `faq4A: "The “{topic}” breakdown and {n} ideas are available without a subscription. inApp Plus unlocks the full collection and unlimited export."`
17. **"topic", not "category".** ru says «в этой теме»/«по теме». The app translates тема as topic / Thema / sujet / テーマ (`ui.*.json:84` "Выбери тему"). Fix in `research/strings.ts`:
    - 38 `"Apps in this topic"`, 48 `"All reviews on this topic"`
    - 64 `"Apps zu diesem Thema"`, 74 `"Alle Rezensionen zu diesem Thema"`
    - 90 `"Les apps de ce sujet"`, 100 `"Tous les avis sur ce sujet"`
    - 115 `"このテーマのアプリ"`, 125 `"このテーマのレビューをすべて見る"`
18. **Paywall plan title differs from the app.** `plus/strings.ts:11/55/99/144/189` ("Plus навсегда", "Plus for life", "Plus für immer", "Plus à vie", "Plus 買い切り") vs the app's `ClarityPaywall.swift:102` `L("Навсегда")` → "Lifetime", "Lebenslang", "À vie", "買い切り". Fix: in `PlusOffer.tsx:197` render `{t("Навсегда")}`, add `"Навсегда"` to `PLUS_UI_KEYS` (`plus/server.ts:11`), and drop `planTitle`.
19. **Shell duplicates an app key.** `shell/strings.ts:81` ja "Plusは有効です" vs the app's "Plusが有効です" (`ui.ja.json:28`). Fix: in `HeaderParts.tsx:86` use `t("Plus активен")` (add it to `SHELL_UI_KEYS`) and drop `plusActive`.
20. **One page, three names.** The same page (`/offer/payment`) is named differently in different places:

    | | legal.paymentTitle and settings.paymentOffer | plus.offerLink |
    |---|---|---|
    | en | Public offer | Payment offer |
    | de | Öffentliches Angebot | Zahlungsangebot |
    | fr | Offre publique | Offre de paiement |
    | ja | 公開オファー | 支払いに関する規約 |

    Fix: use one label per locale:
    - `plus/strings.ts:76/120/165` → `"Public offer"` / `"Öffentliches Angebot"` / `"Offre publique"`.
    - ja: all three → `"ウェブ決済の規約"`. This covers `legal/strings.ts` ja `paymentTitle`, `settings/strings.ts:98` and `plus/strings.ts:210`. "公開オファー" is a calque that Japanese readers won't recognise.
21. **Unclear status texts in en and fr.**
    - `plus/strings.ts:91` `doneTitle: "Plus is open"` → `"Plus is unlocked"`
    - `:86` `"Payment confirmed. Full access is open."` → `"Payment confirmed. You now have full access."`
    - `:181` `"Plus est ouvert"` → `"Plus est débloqué"`
    - `:175` `"…L’accès complet est ouvert."` → `"…L’accès complet est activé."`
22. **`og:locale` is the bare language code** (`de`, not `de_DE`). This happens in:
    - `src/app/(site)/site/[lang]/ideas/page.tsx:37`
    - `src/app/(site)/site/[lang]/ideas/[id]/page.tsx:45`
    - `src/site/features/legal/meta.ts:39`, which affects settings, about, welcome, contacts, offer and privacy.

    Fix: `locale: OG_LOCALE[lang]`. The map already exists in `research/seo.ts` and `landing/strings.ts:614`. The landing and topic pages are already correct.
23. **The App Store badge art is US-English on every locale.** `config.ts:30` points to `/badges/app-store.svg` ("Download_on_the_App_Store_Badge_US-UK"), while its alt text is localized (`ui/strings.ts`).
    - Apple publishes localized badges. Add `/badges/app-store-{ru,de,fr,ja}.svg`.
    - Pick the badge per locale in `ui/AppStore.tsx:39`.
    - Keep `/badges/app-store.svg` in use on topic pages: the CI smoke test greps for it (ARCHITECTURE §5.4).
24. **Small items.**
    - ru `auth/strings.ts:24,26` «и т. п.» → «и т. п.».
    - Latent risk: in production, a client `t()` key that no provider picked falls straight to the Russian key (`client.tsx:70` passes `english=null` → `translate.ts:97-102`). There are no cases today. Add `node docs/site-v2/review/check-ui-keys.mjs` (exit 1 on leak) next to `tsc` in the verification gate.

## Formatting via Intl: OK, matches the app
- **Numbers:** ru "744 775" (U+00A0), en "744,775", de "744.775", fr "744 775" (U+202F), ja "744,775".
- **Compact counts:** ja "74.6万件の評価", fr "745,6 k notes".
- **Ratings:** "4,9" in de/fr/ru, "4.9" in en/ja.
- **Dates:** "30. August 2026", "30 août 2026", "2026年8月30日"; ru drops «г.»; the collection date matches the app key.
- **Region names:** via `Intl.DisplayNames`.
- **Currency:** "990 ₽" / "₽990" via `Intl.NumberFormat` (RUB).
- **Plurals:** follow the app's CLDR rules (`translate.ts:37` = `UIStrings.swift:74`).
- **Remaining issue:** the only hand-built plurals left are latent. The ru landing hard-codes forms: `freeMeta` "{parts} части · {observations} наблюдений · {ideas} идей" and `heroLead`/`plusAll1` "{ideas} идеи". These are correct for 3/7/8/293 today. If the data changes, build them with `Intl.PluralRules` forms, as `research/strings.ts` `ratingsOne/Few/Many` already does.

## Out of scope, noticed
- DECISIONS "Legal pages" says "Footers link both" (`/offer` and `/offer/payment`). `src/site/shell/Footer.tsx:47-61` links only `/offer`.
- fr content: `applyNbspPolicy("space")` (`content/text.ts:20`, mirroring `ClarityReader.swift:45` / `EditorialTheme.swift:37`) strips the authored NBSP before « : ? » in fr research, idea and quote texts. The landing does not apply the policy. For fr, the owner could map U+00A0 before `[:;!?»]` and after `«` to U+202F instead of a plain space.
