# Review: the old site after the move (banner, logo, language switch, in-place pages)

Date: 2026-09-23. Scope: the old site as served by the branch `site-v2` on the shared dev server
(`http://localhost:3210`), compared with production `https://inapp.pro` (still `main` @ `5d79cb75`).
This is a report only. No code was changed.

Files reviewed: `src/components/OldSiteBanner.tsx`, `src/components/Header.tsx`,
`src/components/Footer.tsx`, `src/components/LangMenu.tsx`, `src/components/LangSwitch.tsx`,
`src/lib/oldHref.ts`, `src/lib/oldSite.server.ts`, `src/app/(old)/layout.tsx`,
`src/site/routing/decide.ts`, `src/proxy.ts`, and the old redirect stubs under `src/app/(old)/`.

Rules checked against: `DECISIONS.md` §4 and §6–8, `ARCHITECTURE.md` §1, §3 and §5, and the
owner's decision A4 option A in `AUDIT-PHASE-A.md`.

## Verdict

The move itself is clean:
- **Content parity with production:** 100% on every old page compared. Headings, images and word
  counts match, and the only extra link is the banner.
- **SEO signals:** canonical, hreflang, robots and og:url are unchanged. The one difference is an
  intended improvement: the reviews and MCP canonicals are now localized (audit A9).
- **Routing:** redirects, the `noindex` header on `/old` pages and the cookie rules all behave
  as the spec says.

There are **no blockers**, **1 major**, **5 minor** and **1 pre-existing** issue.

The major issue: visitors who use the new site in de, fr or ja are pushed onto the English
new site when they leave the old site. The logo and the banner links are hard-coded to
`/en/…`, and the new site then overwrites their `locale` cookie.

## Findings

### M1 · major · de/fr/ja visitors lose their language when they leave the old site through the logo or banner

**Where**
- `src/components/Header.tsx:109`: `href={publicHref(locale)}`.
- `src/components/OldSiteBanner.tsx:69-72`: `publicHref(locale)`, `publicHref(locale, "/segment")`,
  and `target` taken from `x-ia-new-path`, which is always `/<ru|en>/…`.
- `src/lib/oldHref.ts:146-149`: `publicHref` can only produce `/ru` or `/en`.

**Source it should match**
- `src/site/routing/decide.ts:153-163`, in the comment on `inPlaceCookie`: the old page must
  never overwrite a de/fr/ja choice, because "'/' must keep sending them to their own locale".
- `DECISIONS.md` §3 and `ARCHITECTURE.md` §1: de/fr/ja topics and catalogs link into old
  in-place pages.

**Evidence (dev)**
1. `/de/segment/habit-tracking` links `/en/reviews/habit-tracking/<id>`, `/en/old/segment/habit-tracking`
   and `/en/old`. The de catalog `/de/segment` links its 36 «Скоро в новом формате» topics as
   `/en/segment/<slug>`.
2. With cookie `locale=de`, the in-place page `/en/habitify-habit-tracker` correctly writes no cookie.
3. The page's logo and «New inApp →» both point to `/en`. The «New breakdowns» link on the 37 old
   topics points to `/en/segment`.
4. `curl -b locale=de /en` answers `set-cookie: locale=en` (`decide.ts:179`, `rewriteNew`).
5. Result: one click on the logo or the banner switches a German visitor to the English new
   site, and keeps them there for a year.

**Fix**
1. Pass the visitor's new-site locale from the old root layout. In
   `src/app/(old)/layout.tsx:54`, reuse the cookie jar:
   ```ts
   const jar = await cookies();
   const theme = jar.get("theme")?.value === "light" ? "light" : "dark";
   const siteLocale = jar.get("locale")?.value ?? null; // may be de/fr/ja (new-site preference)
   ```
   Then add `siteLocale={siteLocale}` to both `<OldSiteBanner …>` and `<Header …>` (`layout.tsx:128-140`).
2. Extend `publicHref` in `src/lib/oldHref.ts:146`. Keeping the same name means the gate in
   `scripts/check-old-links.mjs:95` (`public-exit`) still covers every call:
   ```ts
   export function publicHref(l: LocaleLike, path: string = "/", siteLocale?: string | null): string {
     const p = !path || path === "/" ? "" : path[0] === "/" ? path : `/${path}`;
     const o = oldLocale(l);
     // An English old page keeps a de/fr/ja visitor in their language on the NEW site.
     const loc = o === "en" && (siteLocale === "de" || siteLocale === "fr" || siteLocale === "ja") ? siteLocale : o;
     return `/${loc}${p}`;
   }
   ```
   `oldNavHref` (the redirects to old pages) keeps calling it without the third argument.
3. `Header.tsx`: add the prop `siteLocale?: string | null`. Line 109 becomes
   `href={publicHref(locale, "/", siteLocale)}`.
4. `OldSiteBanner.tsx`: add the prop `siteLocale?: string | null`. Lines 69-72 become:
   ```ts
   mode === "old"
     ? [t.old, t.oldLink, publicHref(locale, target ? splitOldPath(target).rest : "/", siteLocale)]
     : isSoon
       ? [t.soon, t.soonLink, publicHref(locale, "/segment", siteLocale)]
       : [t.inplace, t.inplaceLink, publicHref(locale, "/", siteLocale)];
   ```
   Import `splitOldPath` from `@/lib/oldHref`. `splitOldPath("/en/segment/x").rest` is
   `"/segment/x"`. Every `x-ia-new-path` target exists in all 5 locales (`decide.ts:123-140`).
5. Add a test to `scripts/v2/test-routing.ts`:
   - `publicHref("en", "/segment", "de") === "/de/segment"`;
   - `publicHref("ru", "/", "de") === "/ru"`;
   - `publicHref("en", "/", "en") === "/en"`.

### m1 · minor · The English "soon" banner says "analysis"; the app's word is "breakdown"

- **Where:** `src/components/OldSiteBanner.tsx:31`.
- **Current text:** `soon: "Update coming soon · this is the previous version of the analysis"`. The
  link next to it already says "New breakdowns" (`:32`).
- **Source:** the app glossary, `app_04_inapp/Inapp/Resources/ui.en.json:19` (`"Разбор": "Breakdown"`)
  and `:608` (`"Разборы": "Breakdowns"`). The new catalog's copy for the same 37 topics,
  `src/site/features/research/strings.ts:37`, reads "These breakdowns still open in the previous
  version of the site."
- **Fix:** `soon: "Update coming soon · this is the previous version of the breakdown"`.

### m2 · minor · English link text of the archive banner is awkward

- **Where:** `src/components/OldSiteBanner.tsx:30`, `oldLink: "Go to the new one"`.
- **Source:** `DECISIONS.md:35` gives «Перейти на новую», which elides «версию» / «сайта». English
  needs the noun.
- **Fix:** `oldLink: "Go to the new site"`.

### m3 · minor · Only one of the three banner links has an arrow, and the arrow is read aloud

- **Where:** `src/components/OldSiteBanner.tsx:26` («Новый inApp →») and `:34` ("New inApp →").
  The other links (`:22`, `:24`, `:30`, `:32`) have no arrow. The glyph sits inside the link
  text, so screen readers announce "right arrow".
- **Source:** `ARCHITECTURE.md:132` («Новый inApp →»). The arrow is decoration and should be
  treated the same way on every exit link.
- **Fix:**
  1. Drop "→" from both strings: `inplaceLink: "Новый inApp"` and `"New inApp"`.
  2. Render the arrow once in markup for all three modes, inside the `<a>` at `:84-91`, after
     `{linkText}`:
     ```tsx
     <span aria-hidden="true" className="ml-0.5">→</span>
     ```

### m4 · minor · The archive copy of an old-format topic sends «Перейти на новую» to the home page

- **Where:** `src/site/routing/decide.ts:127-130`. `newSiteEquivalent` returns `null` for a
  non-launch slug, so `x-ia-new-path` falls back to `/<L>`.
- **Evidence:** dev `/ru/old/segment/qr-scanner` shows banner `old` with the link `/ru`.
- **Source:** `DECISIONS.md:16-18` (§4). The new catalog lists these topics at the bottom under
  «Скоро в новом формате», so the catalog is their new-site equivalent.
- **Fix:** at `decide.ts:129`, change it to
  ```ts
  return isLaunchCategory(b) ? `/${l}/segment/${b}` : `/${l}/segment`;
  ```
  The in-place "soon" banner already links to `/segment`, so its behaviour doesn't change. Low
  traffic: `oldHref()` never produces this URL, so it is reached only by typing it.

### m5 · minor · `/ru/cards` lost its footer, a visible change from production (needs a decision)

- **Where:** `src/components/Footer.tsx:17`, `if (oldRestPath(pathname) === "/cards") return null;`.
- **Evidence:**
  - Production `/ru/cards` renders the footer with 12 links, including «Условия использования»,
    «Оферта» and «Контакты». Production's check `pathname === "/cards"` never matched, because
    `usePathname()` returns `/ru/cards`.
  - Dev renders no footer at all (8 links on the page against production's 19).
- **Source:** the comment at `Footer.tsx:10-11` says the footer keeps the legal pages reachable
  "from every page" for ЮKassa, while `:15` says the swipe feed should have no footer.
- **Fix:** either decision is fine:
  - keep it hidden, since that was the original intent, and the paywall's `BuyButton` still links
    «Условия» and «Поддержка»;
  - or restore production's look by deleting line 17.

  Record the choice in `ARCHITECTURE.md` §5.

### P1 · pre-existing (not a regression) · Links to `astrology` return 404

The same URLs return 404 on production:
- `/{ru,en}/segment/astrology`, linked from the related niches on `/{ru,en}/segment/sobriety` and
  `/ru/old/segment/habit-tracking`;
- `/ru/rating/astrology` and 5 app pages under it (`/ru/rating/astrology/<app>`), linked from `/ru/apps`.

Out of scope for the move. The fix is to filter `hidden-categories.json` or `astrology` out of those
lists, or to restore the topic.

## Verified OK

**OldSiteBanner wording and targets**
- `/ru/old` and `/en/old` read «Это прежняя версия сайта · Перейти на новую» / "This is the previous
  version of the site · Go to the new one", with the link `/ru` or `/en`.
- `/ru/old/segment/habit-tracking` links to `/ru/segment/habit-tracking` (the new topic), and
  `/ru/old/ideas` links to `/ru/ideas`. `/ru/old/contacts` → `/ru/contacts`, `/ru/old/offer` → `/ru/offer`.
- In-place pages (per-app, `/reviews/**`, `/rating/**`, `/mcp`, `/tokens`, `/build`, `/apps`,
  `/most-wanted`, `/cards`, `/ideas/top`) show the quiet «Этот раздел пока в прежнем дизайне ·
  Новый inApp →» linking to `/<L>`.
- The Tailwind classes are compiled into the old CSS, and every token the banner uses exists in
  `@saverin/tokens`.
- A soft navigation between `/old` and in-place pages re-derives the banner mode through
  `decideRoute`. The logic was traced; it could not be clicked through (see "Not verified").

**«Скоро обновление» on the old-format topics**
- All 36 reachable old-format topics carry the banner in both ru and en: 72 of 72 pages, each
  `data-old-site-banner="inplace"` with «Скоро обновление · пока прежняя версия разбора · Новые
  разборы» and a link to `/<L>/segment`.
- The 37th topic, `astrology`, is 404 on production too.
- Each page matches production exactly: same headings and image counts, and +1 link (the banner).

**Header logo**
- It is a plain `<a href="/ru|/en">`, which is right because it crosses root layouts.
- Every target returned 200: `/ru`, `/en`, `/ru/segment`, `/en/segment`,
  `/ru/segment/habit-tracking`, `/ru/ideas`, `/ru/contacts`, `/ru/offer`, `/ru/offer/payment`.
- `/ru` answered 500 once, then 200 on three retries. That is a transient on the new home, which
  another agent owns.

**Language switch** (`LangMenu`, `LangSwitch` → `switchOldLocale`, probed with tsx)
- `/ru/old/x` → `/en/old/x` and `/ru/old` → `/en/old`; an in-place `/ru/rating` → `/en/rating`.
- The cookie is written only outside `/old`. «Поиск» → `/ru/old/search` (200).

**Proxy behaviour**
- `X-Robots-Tag: noindex, follow` appears only under `/<L>/old/**`.
- In-place pages set `locale=ru|en`.
- `/de|fr|ja/<old>` → 307 `/en/<old>`, and `/old…` → `/ru/old…`.
- Bare `/segment/qr-scanner`, `/reviews` and `/rating/…` → 307 to the localized URL.

**Content and link parity with production**
- **Pages compared** (dev → prod): `/ru/old` → `/ru`, `/en/old`, `/{ru,en}/segment/qr-scanner`,
  `/{ru,en}/duolingo-language-lessons`, `/{ru,en}/reviews`, `/{ru,en}/rating`,
  `/ru/rating/language-learning`, `/ru/reviews/dating-apps`, `/ru/reviews/methodology`, `/ru/mcp`,
  `/ru/tokens`, `/ru/build`, `/ru/ideas/top`, `/ru/old/ideas`, `/ru/apps`, `/ru/most-wanted`,
  `/ru/cards`, `/ru/old/contacts`, `/ru/old/offer`.
- **What differs:** only the link rewrites:
  - in-place targets keep their public URL;
  - pages the new site took over become `/<L>/old/…`.
- **Link check:** 688 unique internal links sampled from these pages. 680 returned 200; the 8 that
  failed are all P1.
- **Gates:** `npm run test:v2-routing` passes 34/34, and `node scripts/check-old-links.mjs` reports
  0 violations.

## Not verified

- **Dev routes:** the shared dev server stopped answering (`000`) partway through this review and
  was still down about 12 minutes later. I did not restart it. These routes were therefore only
  code-reviewed on dev (`oldNavHref` redirects), with production statuses recorded:
  - `/ru/duolingo-language-lessons/test`
  - `/{ru,en}/best/language-learning`
  - `/ru/exp/calm`
  - `/ru/mcp/connect`
  - `/ru/categories`, `/ru/catalog`, `/ru/premium`
  - `/ru/segment/<slug>/v2`
- **Client-side behaviour:** browser automation of localhost was denied, so these were checked by
  reading code and running `decideRoute` / `switchOldLocale` probes, not by clicking:
  - the soft-navigation banner switch;
  - the language-switch clicks.

## By design (owner decisions, noted for context)

- **A4 option A:** indexed in-place pages link launch topics to their noindexed `/old` copies. For
  example, `/ru/duolingo-language-lessons` links `/ru/old/segment/language-learning` twice. The new
  topic pages therefore get no internal links from about 900 per-app pages. This is the owner's
  call, not a defect.
- **Old `/offer` and `/contacts`:** the archive copies (`/ru/old/offer`, `/ru/old/contacts`) now carry
  the full old header and footer, including prices. This is acceptable because they are noindex and
  not Apple-facing; the Apple-facing URLs are served by the new site.
