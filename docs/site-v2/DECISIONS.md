# Site v2 — owner decisions (2026-09-22)

Binding for every implementer. Where a spec in `spec/` disagrees, this file wins.

## Scope

1. **The whole public site gets the new design** (the iOS app's Clarity look), built from scratch
   in the same Next.js app. Old UI code is not reused for new pages; old *data* libraries may be
   reused read-only.
2. **Content updated now:** the app's 35 launch-edition topics (`LaunchEdition.categories`) and
   all 293 app ideas, in all 5 app locales (ru, en, de, fr, ja), with the app's texts and artwork.
3. **Site-only richness stays.** The iOS app may not name competitor apps or show their icons;
   the web may. New topic pages add blocks the app does not have: apps in the topic with icons,
   ratings and store links, market players, review counts, links to per-app pages. Data comes
   from the existing site data (`src/data/**`, `src/lib/**` loaders).
4. **The other 37 topics are not rewritten now.** Their URLs keep serving the *previous* version
   of the analysis with a banner «Скоро обновление · пока прежняя версия разбора». The new
   research catalog lists them at the bottom as «Скоро в новом формате».

## URLs

5. **Same URLs, new content.** A URL that has a new equivalent renders the new site:
   `/<loc>/segment/<slug>` (35 topics), `/<loc>/ideas/<id>` (293 ideas, ids like
   `habit-tracking-1` — old site uses the same slug format), `/<loc>` (home), `/<loc>/ideas`,
   `/<loc>/saved`, `/<loc>/library` (payment return), `/<loc>/contacts`, `/<loc>/offer`.
6. **The old version of any page lives at `/<loc>/old/<path>`** (e.g.
   `/ru/old/segment/qr-scanner`). Old site locales are ru and en only.
7. **Old-only routes keep serving at their original URL** (per-app pages `/<loc>/<app-slug>`,
   `/reviews/**`, `/rating/**`, `/mcp`, `/tokens`, `/build/**`, …): nothing external may break
   (App Store support URL `/en/contacts`, the shipped iOS app links `/offer`, `/contacts`,
   `/reviews/<cat>/<appId>`, `/rating/<cat>`, `/segment/<slug>`; OAuth callbacks; YooKassa
   webhook; MCP; search engines).
8. **Old site is hidden, not deleted.** No navigation links to it from the new site except: the
   footer/settings link «Старая версия сайта», and «прежняя версия» links on pages that have one.
   Every old page shows a thin banner «Это прежняя версия сайта · Перейти на новую».
   Inside the old site, links to pages that have a NEW version stay in `/<loc>/old/...`; links to
   old-only pages (apps, reviews, rating, …) use their original public URL, where the same old page
   is served in place (AUDIT-PHASE-A A4 — keeps ~2 700 indexed pages linked to each other).

## Web-only sections in the new design (owner, 2026-09-24)

«На сайт надо добавить разделы рейтинг, отзывы и MCP, но в новом дизайне, и чтобы всё открывалось
сразу в новом дизайне.» This supersedes §7 for these three sections:

- **Rating** (`/<L>/rating/**`), **the review archive** (`/<L>/reviews/**`) and **MCP**
  (`/<L>/mcp`, `/<L>/mcp/connect`) are new-site pages at the same URLs, in all five locales. The
  navigation shows them next to the app's three tabs (top bar, the mobile ☰ menu, the footer).
- **Everything opens in the new design:** old pages (the archive and the pages still served in
  place — per-app pages, the 37 old topics, …) link these sections at their public URL. The previous
  versions live only at `/<ru|en>/old/…` (reachable by typing the address; their banner leads here).
- Same data, same rules: the rating is public, including quotes and task details («Rating: rich
  and free» below); the archive keeps its open sample category (`dating-apps`) and needs Plus for
  the rest — the same check as `GET /api/reviews/…`; MCP stays part of Plus (the page names no
  price; the Plus sheet does).
- The rating and archive data exist in ru/en only: de/fr/ja pages have translated chrome and copy
  with the English data, and declare the English page canonical. The MCP page and the review
  methodology are fully translated (canonical in every locale).
- **Site only** (owner, 2026-09-25: «рейтинг, отзывы и МСП в апп тащить не надо»). The iOS app
  gets none of the three sections, and the pages that mirror the app (research articles, ideas,
  saved, settings) do not link them; only the site chrome and the three sections link each other.

### Clarity redesign of the three sections (2026-09-25)

The sections are rebuilt in the app's Clarity style (`spec/10-web-only-sections-clarity.md`; layout
rules in ARCHITECTURE §7). The rating started from the app's own — dormant — ClarityRatings screens;
the review archive and MCP have no app screen and use only Clarity blocks. Answers to the spec's §10
questions, as applied in this implementation. **For the rating, «Rating: rich and free» below
(`spec/11-rating-rich.md`) supersedes the bullets marked so; the review archive and MCP keep them.**

- **Scores stay on the web** (Q1): the rating shows the inApp review score (/100) and the App Store
  rating (/5) although the release app shows no rankings.
- **Structured data** (Q2), *superseded by spec 11 D10*: the app page's JSON-LD carries an editorial
  `Review` by inApp on a 0–100 scale and no `aggregateRating` (it was App Store data, and Google's
  rules forbid marking up ratings aggregated from other sites); lists (catalogue, niche, task) are
  `ListItem`s only, with no rating markup.
- **Names** (Q3, Q13): review pages use the app's topic names in H1s and rows (`ratingNicheName`).
  *Rating superseded by spec 11 D4/D10*: a keyword H1 («Лучшие приложения для {seoName}» / "Best
  {seoName} apps"; de/fr/ja use the topic name) with the topic name in the subtitle.
- **Order and density** (Q4–Q6), *superseded by spec 11 D3–D7*: the catalogue is a grid of niche
  cards in 10 groups; a niche page shows a Top-5 card, the 3 leaders with a screenshot stage, then
  rows with a visible rank, icon and 3 screenshots (up to 100 per niche). The category glyphs (the
  exact port of `StudioStyle.categorySymbol`) stay in the review archive.
- **Scenario pages** `/<L>/rating/<niche>/tasks/<n>` («Выбор по задаче», Q7), *superseded by spec 11
  D11*: indexable when the page has gap text, ≥ 3 rated apps, an audience name and a title that fits
  without clamping (spec 11 §6.1; then listed in `/sitemap-rating-<ru|en>.xml`), otherwise
  `noindex, follow`. No bookmark on the web app page (Q8).
- **Gate** (Q9), *superseded by spec 11 D2*: nothing under `/rating/**` is gated. Quotes, a
  scenario's «что проверить», its app list and «также упомянуты» are public; no lock card, Plus UI
  or price anywhere in the rating.
- The store rating uses the locale's decimal separator («4,7» in ru; Q10). No Pulse block on the
  rating pages (Q11). `astrology` stays out: no review corpus, 71 rating niches (Q12).
- **Navigation** (Q14): quiet section links beside the logo (no accent pill; the «Ещё разделы» menu
  on narrow desktops, ☰ on mobile); no «⋯» menu. The shell label is «Рейтинги» (the app's key).
- **Data**: the rating's texts, quotes and tasks come from the app bundle, imported with `npx tsx
  scripts/v2/import-app-content.ts --only=rating` into `content/v2/<L>/rating` (ru texts; English
  for en/de/fr/ja, with de/fr/ja launch-topic names and quote translations). Numbers and the raw app
  order (the URL slugs) stay the web's peoplesRating. The catalogue search runs on the server
  (`GET /api/site/rating-search`, first 40 results, then the rest on request). Since spec 11 (D13)
  the import also carries each app's icon, screenshots and reviews-read count from peoplesRating,
  and each niche's SEO head term and intro from `scripts/v2/data/rating-seo.json`.
- MCP keeps listing every server tool in the server-rendered page; its Plus card is the Settings
  one (`features/plus/PlusCard.tsx`).

### Rating: rich and free (owner, 2026-09-25)

«а что-то из рейтинга пропали все скрины, и смотреть неудобно, дизайн/UX плоский, и вся часть
рейтингов у нас бесплатная — она для SEO больше нужна». The binding spec is
`spec/11-rating-rich.md`; it supersedes the rating parts of spec 10 (the review archive and MCP keep
spec 10 and their access rules). The rating stays in the Clarity language (calm, monochrome, one
accent, the 680 column, Georgia titles) but becomes visual and scannable:

- **D1** Artwork is back, on the site only: the App Store icon of every app everywhere in the
  rating, 3 screenshots per niche row, up to 10 on the leaders' stage, the full gallery with a viewer
  on the app page. Hotlinked from `is1-ssl.mzstatic.com` as CDN-sized WebP in real `<img>` tags
  (Scope §3 lets the web show them; `MECHANICS-REDESIGN.md:68` binds only the iOS app).
- **D2** The whole rating is free: no `canReadResearch`, lock card, Plus button or price under
  `/rating`; quotes, a task's «что проверить», its app list and «также упомянуты» are public.
- **D3** The rank is visible: raw data index + 1 (the peoplesRating files are sorted by `realScore`;
  ties keep data order). Re-sorting the list never changes it.
- **D4** Niche page: keyword H1, a one-sentence intro, a Top-5 jump card with icons, visible
  controls, «Тройка лидеров» (leader cards with a screenshot stage), the tasks inline, then «Места
  4–N» as visual row cards.
- **D5** Rows show everything by default: rank, icon, title, store star and count, the score with a
  meter, 3 screenshots, the verdict, «Хвалят», «Жалуются», «Кому». No `<details>`; long texts are
  clamped with CSS only and stay whole in the DOM.
- **D6** Sorting is visible chips «По отзывам · По App Store · Популярные · По названию» (the
  «Порядок» menu is gone); the search field stays visible, plus a toolbar shortcut once it scrolls
  away.
- **D7** The catalogue is a grid of niche cards in 10 groups (an App Library–style folder of the
  top-4 icons, the name, the intro, counts and the leader), with anchor chips to the groups.
- **D8** App page: icon hero, facts strip, «Открыть в App Store», verdict inset, screenshot gallery
  with a viewer, «Для каких задач», praise and complaints as a pair of cards, every public quote,
  the tasks that name the app, 5 alternatives and the same app in other niches.
- **D9** Deferred by the lead session (see the override at the top of spec 11); nothing of it ships
  in this release.
- **D10** SEO: keyword H1s, the full per-app text in the server HTML, unique app titles, an own
  `<url>` per language. JSON-LD follows Google's rules: no App Store `aggregateRating`, lists are
  `ListItem`s only, app pages carry an editorial `Review` by inApp on a 0–100 scale.
- **D11** Task pages are public; indexable when they have gap text, ≥ 3 rated apps and a title that
  fits the budget (spec 11 §6.1: ru 31, en 68 pages), otherwise `noindex, follow`.
- **D12** The method is a visible «Об оценках» section at the bottom of the niche page (no sheet);
  the honesty copy stays word for word.
- **D13** The data carries media: the importer copies `icon`, `shots` and `nrev` from peoplesRating
  into `content/v2/{ru,en}/rating` as compact CDN paths and adds the SEO head terms, per-niche
  intros, short app names, leaders and `updatedAt` dates.
- **D14** No new tokens, no status colours, no trust wording: the accent only marks the leader rank
  badge, the verdict/gap inset bar, selected chips, links and focus; no green/amber/red; no
  «накрутка», «витринная звезда» or «наш балл» (the method keeps the app's honesty sentence).
- **D15** No `next/image`: plain `<img>` with CDN size variants, explicit `width`/`height`, native
  lazy loading and one `preconnect`; screenshots are never mounted by an IntersectionObserver.
- **D16** One `/sitemap.xml` stays (hub and niches, ru and en each with their own `<url>`); the app
  and indexable task pages go into the image sitemaps `/sitemap-rating-ru.xml` and
  `/sitemap-rating-en.xml`, both listed in `robots.txt`.

Accepted consequence of D2: some rating quotes also appear in the paid research articles (in
habit-tracking, 22 of 45 open with the same 60 characters). Research articles and ideas pages still
never link the rating (the «Site only» rule above).

## Landing and access

9. `/<loc>` shows the **landing to signed-out visitors** and the app home (research catalog) to
   signed-in visitors. Topic and idea pages are public (SEO, sharing) with the app's gates:
   free = topic `interior-design` + ideas `interior-design-1…5`; everything else shows the
   app's locked preview with the Plus offer.
10. Accounts, sessions, logins and payments are **shared with the old site** (same DB, same
    `ia_session` cookie, same YooKassa flow). Plus on the web = `getAccess().unlimited`.
    People who bought on the old site have Plus on the new one.
    **Prices are frozen (owner, 2026-09-22):** the web keeps selling the existing YooKassa
    "lifetime" SKU at the current `ACCESS_PRICE_RUB`, presented as Plus. **Price: 1499 ₽ since
    2026-09-23** (owner; was 990 ₽; `FRIEND_PRICE_RUB` in `src/lib/tokenConfig.ts`). No annual web
    plan; the price changes only on the owner's word.
11. Saved items and notes: local-first for guests (like the app, "stored on this device"),
    synced to the account after sign-in.

## App Store promotion

12. Promote the iOS app everywhere ("Download on the App Store" badge: landing, header, footer,
    every topic and idea page, a mobile "open in app" banner).
13. The app is **in App Review** (app id 6814396315, not live yet). The App Store URL is a single
    constant in one config file. While it is empty, the badge opens a popup: the app is being
    reviewed by Apple and will be available soon; continue on the web. **No automatic polling
    of Apple** — the owner will paste the link manually after approval.

## Web purchases in the iOS app (2026-09-23)

- Plus bought on the website (Russia only, YooKassa 1499 ₽) reaches the iOS app **through the
  inApp account** (Guideline 3.1.3(b), docs/site-v2/APP-ACCOUNTS.md): the buyer signs in to the
  same account in the app's Settings → Account (app 1.1+). The website shows this as the card
  «Plus и в приложении для iPhone» (Settings, payment return; `AppAccessCard.tsx`).
- **No App Store offer codes for web buyers.** Tried and withdrawn the same day: the Apple DPLA,
  Schedule 2, forbids accepting any payment or compensation in connection with distributing offer
  codes. The ASC offer "Web lifetime buyers", its one-time batch and the custom code INAPPWEB are
  deactivated; the GitHub secret APP_OFFER_CODES is deleted; the `AppStoreCode` table is unused.

## Owner notifications and Telegram Stars (2026-09-23)

- Every new paid purchase pings the owner in Telegram through the site's bot (@inAppProBot):
  product, amount, payment method, checkout source, today's ₽ payments (Moscow day) and the
  number of lifetime users — no buyer personal data (`src/lib/purchaseNotify.ts`). Recipients:
  `PURCHASE_NOTIFY_TG_IDS`, else admins with a linked Telegram. One ping per payment ref.
  The server (Russia) loses connections to api.telegram.org now and then, so each message is
  retried with backoff for ~30 min and also tried via the Bot API addresses directly.
- **Telegram Stars sales are off** (owner). The bot sends no invoices, declines pre-checkout of
  old invoices and points `/start`, `/buy` and old buy links to `/ru/plus`; the payment offer no
  longer mentions Stars. The bot still finishes a Stars payment that was already under way.

## Legal pages (Apple-facing; hotfix on branch hotfix/apple-legal, 2026-09-22)

- `/<L>/offer` = **Terms of Use** for the app and the site (Apple standard EULA + inApp Plus
  subscription disclosures). It must never mention website prices or web payment methods — the
  iOS app's «Условия использования» row opens it and App Review reads it.
- `/<L>/offer/payment` = the website's **public payment offer** (YooKassa, price from `ACCESS_PRICE_RUB`; edition date bumped with each price change).
  Footers link both; checkout UI links `/offer/payment`.
- `/<L>/contacts` = **Support** page (App Store support URL `/en/contacts`): English on `/en`,
  contact e-mail, restore/cancel/refund via Apple, seller requisites; no price or buy CTA in the
  chrome of `/offer` and `/contacts`.
- The new site reproduces these pages from the hotfix branch content (all 5 locales).

## Safety

14. Work happens in the worktree `/Users/artsaverin/projects/badcomment-v2`, branch `site-v2`.
    Pushing to `main` deploys to production — only after the owner's explicit OK.
