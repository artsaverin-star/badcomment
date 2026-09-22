# Review: post-deploy smoke suite (`scripts/v2/smoke.mjs`)

Scope: a new, dependency-free smoke suite for site v2 plus a run against the shared dev server
`http://localhost:3210`. Files (owned by this task): `scripts/v2/smoke.mjs`,
`scripts/v2/smoke.README.md`. No other file was edited.

```sh
node scripts/v2/smoke.mjs [baseUrl=http://localhost:3210] [--only …] [--locales …] [--all] [--json FILE]
node scripts/v2/smoke.mjs --self-test      # 37 offline tests of the parsers and the leak matcher
```

## What the suite checks (280 checks, ~20 s on a warm dev server)

| Group | Checks | Contract |
|---|---:|---|
| routes | 95 | All 19 NEW routes × 5 locales (ARCHITECTURE §1). A 200 must be HTML with `<html lang=L>`, rendered by the NEW root layout, and set `locale=L` (§3). `/L/library` → 307 `/L/saved`. |
| redirects | 50 | `/` negotiation (cookie, then Accept-Language: exact, base, q-order; `en` fallback; query kept), bare paths in one hop, 308 aliases (`research`, `search`, `segment/<slug>/v2`), de/fr/ja → `/en/…` for old-only URLs, `/old…` entry points, internal `/site/…` tree 404. |
| old | 19 | `/ru/old`, `/en/old`, `/ru/old/segment/habit-tracking`: noindex, `data-old-site-banner="old"`, no locale cookie. `/ru|en/segment/qr-scanner`: soon banner, still indexable. `/ru/mcp` → `list_niche_themes`; `/ru/tokens` → `990`. The retired `aso`/`workspace` URLs → 404 (deploy.yml parity). |
| api | 4 | `/api/me` guest JSON; OAuth metadata with `refresh_token`; `POST /api/mcp` → 401 `authorization_required`; `/api/pay/status` → 401. |
| markers | 12 | `id="main-players"` and `/badges/app-store.svg` on `/ru|en/segment/{language-learning,workout-fitness,habit-tracking}`, plus the two old topics that deploy.yml also checks. "Terms of Use" on `/en/offer`; "inApp Support" on `/en/contacts`. |
| apple | 5 | `/en`, `/en/offer`, `/en/contacts`, `/ru/offer`, `/ru/contacts`: no `990`, `₽`, `ЮKassa`, `YooKassa`, `Telegram Stars`, `/tokens` or `offer/payment` in visible text, attributes, scripts or the **inline RSC payload**. React Flight ids and references (`"$990"`, `990:`) are not counted as the price. |
| leak | 95 | For each locale: both catalogs, the locked article, the free article (locked cards 6–8), the free idea, the landing, an idea search and a research search that target paid text, and 10 locked idea pages. Each page is checked as guest HTML and as `RSC: 1`. Also `POST /api/site/export/<locked>` → 401. The needles are 21,387 paid texts from `content/v2/<L>/{cards.json,research/*.json,ideas/*.json}`; anything also in the public corpus is excluded. |

How the leak matcher works: both sides are put in a canonical form, with entities and JSON
escapes decoded, NBSP, quotes and dashes unified, and whitespace removed. Paid texts are cut into
aligned probes of 24 characters (12 for Japanese). So any excerpt of 47 or more characters (23 for
Japanese) is always found, and short titles are matched whole. Lookups use a rolling-hash index,
and every hit is verified exactly.

The matcher was checked three ways:
1. **Positive controls in every run.** The free article must show 24/24 free passages and the free
   idea 2/2 texts, in the HTML and in the RSC payload. Every locale passes.
2. **A mutation test.** Paid text was injected into a real locked page: a 40-character Japanese
   excerpt in the text, a German card title in the RSC props, a French idea block in JSON-LD, 30
   Japanese characters in a meta tag, and a quote only in dev debug rows. All 5 were caught.
3. **A replay of the earlier price leak.** The saved pages from before the fix (finding 1) are
   flagged correctly.

## Results against :3210 (2026-09-23, MSK)

| Time | Result | Notes |
|---|---|---|
| 00:26–00:48 | server down | `ECONNREFUSED`: the shared dev server was stopped and restarted by another session (`next dev -p 3210` restarted at 00:48). Because of this, the suite now waits up to `--wait` seconds (default 30) and gives one clear message. |
| 00:49 | 103/280 pass | Cold compile right after the restart: every failure was an HTTP 500 during compilation. Transient. |
| 00:53 | 270/280 | `/ru/plus`, `/en/plus`, `/ru|en|de/library?checkout=…` returned 500: `Error: [site/i18n] web strings "plus" were not provided (pass web={{ plus: … }} to an I18nProvider)`. This was the plus feature in the middle of an edit; the pages were 200 a minute later. The other 5 failures were a bug in the suite: the self-test counted positions only up to 6, so a title repeated in `<title>`, og and twitter tags masked the RSC occurrence. Fixed with a separate haystack per view. |
| 00:55, 00:57, 00:59 | **280/280 pass** | Node 26. Also 141/141 for `--locales en,ja` on Node 22. |

**Nothing is missing.** Every route in ARCHITECTURE §1 has a page file under
`src/app/(site)/site/[lang]/**`, and all of them answer.

## Findings

### 1. major, fixed during this review: the paywall price was in every page's RSC payload, including Apple-facing pages
- Web side: `src/app/(site)/site/[lang]/layout.tsx:132` mounts `<AccountHosts>`, which renders
  `PaywallHost`. At 00:14 it received the offer as props, so every NEW page shipped
  `{"offer":{"priceRub":990,"priceLabel":"₽990",…}}` in its inline RSC payload: `/en`, `/en/offer`,
  `/en/contacts`, and `"990 ₽"` on `/ru/offer` and `/ru/contacts`. The row ids were `a4`, `1d7`
  and `139` in the captured HTML.
- Source it must match: `docs/site-v2/DECISIONS.md:64-71`. `/offer` must never mention website
  prices, App Review reads it, and there is no price in the chrome of `/offer` and `/contacts`.
- Status: fixed by the plus owner at 00:20. `src/site/features/plus/AccountHosts.tsx:11` now says
  the paywall "fetches its price on first open". The price comes from `GET /api/site/plus/offer`,
  and the `apple` group has been green since.
- Fix to keep: never pass `plusOfferData()` as props from the layout or any shared chrome. Only
  `/L/plus` (`src/app/(site)/site/[lang]/plus/page.tsx:51`) may render it on the server. The
  `apple` group fails on regression, and the report names the RSC row.

### 2. minor, in progress: `/L/plus` and `/L/library?checkout=` briefly returned 500 (web strings `plus` not provided)
- Web side: `src/site/features/plus/*`, owned by the plus agent, mid-edit at 00:53. Log:
  `/tmp/v2-dev.log`.
- Source: `docs/site-v2/ARCHITECTURE.md` §1 (`/L/plus`, `/L/library?checkout=` must be 200).
- Fix: any client component that reads `web.plus` must sit under an `I18nProvider` that receives
  `web={{ plus: plusStrings[lang] }}`: the `/plus` page, `CheckoutReturn` on `/library`, and
  `AccountHosts`. It was fine again at 00:55. Re-run `node scripts/v2/smoke.mjs --only routes`
  after the feature lands.

### 3. minor: deploy.yml does not run the suite yet
- Web side: `.github/workflows/deploy.yml:121-183`. The curl smoke checks only
  `/en`, `/en/contacts`, `/ru/segment/interior-design` and `/ru/old` of the new site.
- Source: `docs/site-v2/ARCHITECTURE.md:134-138` (§5.4: "add smoke checks for the new site").
- Fix, for the integrator: append a step after "Smoke-test production". The runner has the
  checkout, so the leak check finds `content/v2`:
  ```yaml
      - name: Smoke-test site v2
        run: node scripts/v2/smoke.mjs https://inapp.pro --json smoke-v2.json
  ```
  Keep the existing curl block: the suite covers it, but it is cheap.

### 4. minor: known limits of the suite (by design)
- **Guest only.** The suite cannot prove that Plus or legacy per-item buyers do get the content,
  because it holds no credentials. That needs a signed-in session, which is out of scope for an
  unauthenticated smoke.
- **Dev debug rows.** Against `next dev`, a hit found only in React debug rows is labelled
  `(dev debug info)` and still fails. Production does not ship those rows, but paid data reaching a
  guest-rendered component breaks spec 04 §7.6 ("gate before reading").
- **Cookie check.** On production, the `locale=L` cookie assertion expects nginx to pass the
  proxy's `Set-Cookie` through unchanged.
