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

## Landing and access

9. `/<loc>` shows the **landing to signed-out visitors** and the app home (research catalog) to
   signed-in visitors. Topic and idea pages are public (SEO, sharing) with the app's gates:
   free = topic `interior-design` + ideas `interior-design-1…5`; everything else shows the
   app's locked preview with the Plus offer.
10. Accounts, sessions, logins and payments are **shared with the old site** (same DB, same
    `ia_session` cookie, same YooKassa flow). Plus on the web = `getAccess().unlimited`.
    People who bought on the old site have Plus on the new one.
    **Prices are frozen (owner, 2026-09-22):** the web keeps selling the existing YooKassa
    "lifetime" SKU at the current `ACCESS_PRICE_RUB` (990 ₽), presented as Plus. No annual web
    plan, no price changes, no edits to `tokenConfig.ts` prices or to the offer text.
11. Saved items and notes: local-first for guests (like the app, "stored on this device"),
    synced to the account after sign-in.

## App Store promotion

12. Promote the iOS app everywhere ("Download on the App Store" badge: landing, header, footer,
    every topic and idea page, a mobile "open in app" banner).
13. The app is **in App Review** (app id 6814396315, not live yet). The App Store URL is a single
    constant in one config file. While it is empty, the badge opens a popup: the app is being
    reviewed by Apple and will be available soon; continue on the web. **No automatic polling
    of Apple** — the owner will paste the link manually after approval.

## Legal pages (Apple-facing; hotfix on branch hotfix/apple-legal, 2026-09-22)

- `/<L>/offer` = **Terms of Use** for the app and the site (Apple standard EULA + inApp Plus
  subscription disclosures). It must never mention website prices or web payment methods — the
  iOS app's «Условия использования» row opens it and App Review reads it.
- `/<L>/offer/payment` = the website's **public payment offer** (YooKassa, 990 ₽), text unchanged.
  Footers link both; checkout UI links `/offer/payment`.
- `/<L>/contacts` = **Support** page (App Store support URL `/en/contacts`): English on `/en`,
  contact e-mail, restore/cancel/refund via Apple, seller requisites; no price or buy CTA in the
  chrome of `/offer` and `/contacts`.
- The new site reproduces these pages from the hotfix branch content (all 5 locales).

## Safety

14. Work happens in the worktree `/Users/artsaverin/projects/badcomment-v2`, branch `site-v2`.
    Pushing to `main` deploys to production — only after the owner's explicit OK.
