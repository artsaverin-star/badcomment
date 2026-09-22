# Site v2 — phase A audit: consolidated fix list (2026-09-22)

Scope: commits `6a7035e6..HEAD` on `site-v2`: old pages moved into `src/app/(old)`, the proxy
(`src/proxy.ts` + `src/site/routing/decide.ts`), the `oldHref` codemod, and the content pipeline
(`content/v2`, `public/media`). Production (`https://inapp.pro`) still runs `main` @ `5d79cb75`.

Four audits (SEO/sitemap, security, old-site regressions, perf) were merged. Every finding below was
re-checked by reading the code, re-running the check, or requesting the live site (GET only).
Findings that could be refuted are listed in "Dropped", with the reason.

This is a snapshot. Other agents are building the new-site screens right now. On re-check,
`/segment` and `/ideas` had already gained canonical, hreflang and `index` (item A3 is narrowed
accordingly). Re-run the gate before deploying:

```
node scripts/v2/audit/predeploy.mjs            # offline gate (exit 1 = not deployable)
node scripts/v2/audit/predeploy.mjs --built    # + bundle checks after `next build`
node scripts/v2/audit/predeploy.mjs --live URL # + GET-only smoke against a running build
```

## Summary

"Before deploy" means: must land before the first production deploy of site v2 (the merge to `main`).

| ID | Sev | Area | Before deploy | What |
|---|---|---|---|---|
| A1 | blocker | new-site legal; proxy/routing (guard) | **yes** | `/<L>/offer/payment` routes to the new site, which has no page for it → 404 (production 200) |
| A2 | blocker | new-site legal + plus; proxy/routing (interim) | **yes** | `/en/contacts`, `/{ru,en}/offer`, `/<L>/library?checkout=` are TODO placeholders; the payment-return tracker is lost |
| A3 | blocker | new-site screens, sitemap, old code (IndexNow) | **yes** | home, topic and idea pages are `noindex` with no canonical or hreflang; the sitemap and IndexNow are not updated for the new site |
| A4 | major | old code (**owner decision**) | **yes** | the 2,706 indexed in-place old pages link only to their noindexed `/old` copies |
| A5 | major | old code (api/auth) + new routing helper | **yes** | open redirect in Google sign-in `return_to` (live today); `isSafeReturnPath` gaps and a 500 on `?return_to=a&return_to=b` |
| A6 | major | CI | **yes** | the post-deploy smoke test doesn't check the legal or payment-return pages, and its badge check always passes |
| A7 | major | nginx/deploy | **yes** | the first deploy changes the schema: `db push --accept-data-loss` runs with no backup, and the box deploys the tip of `main` instead of the commit CI built |
| A8 | major | new-site library (outside phase A) | **yes** (or owner decision) | ideas users saved on the old site don't appear in the new `/<L>/saved` |
| A9 | major (pre-existing) | old code (**owner decision**) | no | reviews/MCP canonicals have no locale → they 307 to `/en` (1,934 URLs) |
| A10 | minor | old code + proxy/routing | yes (cheap) | old redirect pages send visitors into the noindexed archive; `/<L>/segment/<launch>/v2` 404s |
| A11 | minor | proxy/routing | yes (cheap) | visiting an in-place old page overwrites a de/fr/ja `locale` cookie with `en` |
| A12 | minor | app root / next.config | recommended | unmatched old URLs get Next's bare default 404 (no `lang`, no CSS, `og:image` on localhost) |
| A13 | minor | old code (api/auth) | recommended | the email magic link is sent in Russian to de/fr/ja users |
| A14 | minor | content loaders | recommended | the search helpers have no query cap of their own (the pages already cap `q` at 200 chars) |
| A15 | minor | nginx/deploy (pre-existing) | next.config part recommended | files in `public/`, including 1,528 new WebP images, go through Node with `max-age=0`; HTTP/1.1 only; the nginx config in the repo is stale |
| A16 | minor | proxy/routing | no | a bare link takes 2 redirects for de/fr/ja visitors |
| A17 | minor | content loaders | no | the content root is resolved twice (`CONTENT_V2_DIR` is ignored for `ui.json`); LRU size |
| A18 | minor | nginx/deploy + CI | no | deploy extras: exclude `*.map`, run `npm ci` only when the lockfile changes, `ExecStart` without npm, static-JSON guard |
| A19 | minor | cleanup | no | an empty untracked `src/app/offer/payment/` folder was left by the merge |

---

## Blockers (must land before the first production deploy)

### A1 · blocker · `/<L>/offer/payment` → new-site 404
- **Where:** `src/site/routing/decide.ts:226` (every `offer/*` path goes to the new site) and `:133`
  (`newSiteEquivalent`). There is no `src/app/(site)/site/[lang]/offer/payment/page.tsx`.
- **Evidence:**
  - `node --import tsx scripts/v2/audit/proxy-attack.ts` prints `/ru/offer/payment → /site/ru/offer/payment NO PAGE`.
  - The request falls into `[...missing]` → `notFound()`.
  - Production `curl https://inapp.pro/{ru,en}/offer/payment` returns `200`.
  - This page is the YooKassa public offer (DECISIONS «Legal pages»); the checkout UI links to it.
- **Fix:** add `src/app/(site)/site/[lang]/offer/payment/page.tsx`. Render the legal feature's payment offer
  (`src/site/features/legal/payment.tsx`, in progress) with the text unchanged from
  `src/app/(old)/offer/payment/page.tsx` (hotfix `5d79cb75`), the price from `ACCESS_PRICE_RUB`, all 5
  locales, and a canonical URL.
- **Guard (proxy/routing),** in `scripts/v2/test-routing.ts` (add `existsSync` to the `node:fs` import):
  ```ts
  test("every NEW rewrite target has a page file", () => {
    const PAGES = "src/app/(site)/site/[lang]";
    for (const p of ["/ru", "/ru/segment", "/ru/segment/interior-design", "/ru/ideas", "/ru/ideas/interior-design-1",
      "/ru/saved", "/ru/settings", "/ru/settings/about", "/ru/plus", "/ru/welcome", "/ru/login", "/ru/library",
      "/ru/contacts", "/ru/offer", "/ru/offer/payment", "/ru/privacy"]) {
      const d = decide(p) as RewriteDecision;
      assert.equal(d.site, "new", p);
      const rel = d.pathname.replace(/^\/site\/ru/, "")
        .replace(/^\/segment\/[^/]+$/, "/segment/[slug]").replace(/^\/ideas\/[^/]+$/, "/ideas/[id]");
      assert.ok(existsSync(`${PAGES}${rel}/page.tsx`), `${p} → ${PAGES}${rel}/page.tsx is missing`);
    }
  });
  ```
- **Interim, only if the page isn't ready:** in `decide.ts`, before line 226, add
  `if (a === "offer" && b === "payment") return inPlace(ctx, l, tail);`. Then change
  `scripts/v2/test-routing.ts:114` to `expectRewrite(decide("/en/offer/payment"), "inplace", "/offer/payment")`.

### A2 · blocker · placeholders on URLs that Apple, the app and YooKassa depend on
- **Where:** `src/app/(site)/site/[lang]/contacts/page.tsx:23`, `offer/page.tsx:21`, `library/page.tsx:27`
  (each renders a `TODO · … placeholder` badge).
- **Why it blocks:**
  - `/en/contacts` is the App Store support URL.
  - `/{ru,en}/offer` is opened by the app, which is in App Review now.
  - YooKassa returns buyers to `${origin}/library?checkout=<uuid>` (`src/app/api/pay/yookassa/route.ts:58`).
    The proxy sends that to `/<L>/library`, which is the new placeholder.
  - `PurchaseTracker` (payment confirmation plus the one-time GA4/Metrika purchase event) is now reachable
    only at `/<L>/old/library`. Access itself is still granted, because the webhook is unchanged.
- **Fix:**
  - Build contacts and offer from the hotfix content (`src/app/(old)/{contacts,offer}/page.tsx`) in all 5
    locales, with no price and no buy CTA anywhere on the page or its chrome.
  - Build `library` with the same behaviour as `src/components/PurchaseTracker.tsx`:
    - poll `/api/pay/status?checkout=` up to 30 × 1 s;
    - on `succeeded` with `transactionId` and `amountRub`, fire
      `trackPurchase(txn, {id:"lifetime", name:"inApp — полный доступ навсегда", price:amountRub}, source||"payment_return")`
      once, deduplicated by `localStorage["inapp_purchase:<txn>"]`;
    - then `router.replace(pathname)` and `router.refresh()`;
    - show checking, confirmed, failed or canceled, and delayed states. The old tracker has no 401 state;
      showing sign-in on 401 is an optional improvement.
  - Add assertions for the new page to `scripts/test-monetization.ts`.
- **Interim for `library` only:** in `decide.ts:45`, delete `"library",`. `/<L>/library` then serves the old
  page, with its tracker, in place. Update the tests:
  - `test-routing.ts:119`: expect `"inplace", "/library"`;
  - `:266`: expect `https://inapp.pro/library?checkout=abc`.
- **Don't take contacts or offer back to the old pages as a shortcut.** `abeef62d` removed `isNoCommercePath`
  from the old chrome, so the old header and footer would show web prices on Apple-facing pages.
- **Optional:** a purchase started on `/en/old/tokens` by a browser whose language is Russian returns to
  `/ru/library`, because `/old` never writes the cookie. To fix it:
  - have `BuyButton` send `locale`;
  - build `returnUrl` as `${origin}/${locale}/library?checkout=…` when the locale is one of the 5.

### A3 · blocker · SEO of the 74 indexed URLs that switch to the new site
- **Evidence:**
  - Production today serves `/ru`, `/en`, `/{ru,en}/ideas` and 70 topic URLs as `200`, `index`, with a
    self-canonical (checked: `/ru/segment/habit-tracking`).
  - On the branch, these pages still export `robots: { index: false }` and have no alternates:
    - `src/app/(site)/site/[lang]/page.tsx:14` (home)
    - `segment/[slug]/page.tsx:17`
    - `ideas/[id]/page.tsx:16`
    - legal pages: `contacts:13`, `offer:11`, `privacy:11`
  - `deploy.yml:114-117` pings IndexNow 60 s after deploy, so Bing and Yandex would drop these pages quickly.
  - `node --import tsx scripts/v2/audit/seo-routes.ts --source code --strict` exits 1:
    70 topic URLs are noindex with no canonical, and `/ru/`, `/en/` are 308 hops.
  - Already fixed in the working tree: `/segment` and `/ideas` (`localeAlternates` / `alternatesFor`, `index`).
- **Fix:**
  1. Use one shared helper and delete the duplicate in `ideas/seo.ts`: move
     `src/site/features/research/seo.ts#localeAlternates` to `src/site/seo.ts`. It produces the canonical
     `${SITE_URL}/<l>/<path>`, all 5 locales, and `x-default` pointing to `/en/<path>`.
  2. In home, `segment/[slug]` and `ideas/[id]`, add a `generateMetadata` that returns
     `{ alternates: localeAlternates(lang, <path>), robots: { index: true, follow: true } }`. Use `""` for
     home, `segment/<slug>` for topics and `ideas/<id>` for ideas. Locked previews stay indexable
     (DECISIONS §9).
  3. Legal pages (`contacts`, `offer`, `offer/payment`, `privacy`) get a canonical; `index` is the owner's choice.
  4. Keep `noindex` on `saved`, `settings(/about)`, `library`, `login`, `welcome`, `plus`, `[...missing]`,
     and on any `?q=` variant.
  5. `src/app/sitemap.ts` (another agent owns this file):
     - `:55,59`: drop the trailing slash on home (`${BASE}/ru${p}`).
     - Add every new-site page for all 5 locales, each with 5-locale alternates: `""`, `/segment`, `/ideas`,
       `LAUNCH_CATEGORIES.map(s => "/segment/"+s)` and `LAUNCH_IDEAS.map(id => "/ideas/"+id)`. That is
       328 paths × 5 = 1,640 entries.
     - Keep the in-place old pages as ru/en entries, but drop `""`, `/ideas` and launch topics from the old
       list (`cats.filter(s => !isLaunchCategory(s))`).
     - Never list anything that is `noindex`.
  6. `src/app/api/indexnow/route.ts:16-34`: build `urlList` from the sitemap so the two can't drift. This
     also removes `/catalog`, which only redirects:
     ```ts
     import sitemap from "@/app/sitemap";
     const urlList = [...new Set(sitemap().flatMap((e) => [e.url, ...Object.values(e.alternates?.languages ?? {})]))];
     ```
- **Gate:** `seo-routes.ts --source code --strict` and the `placeholders` check in `predeploy.mjs` pass.

---

## Major

### A4 · major · in-place indexed old pages link only to their noindexed `/old` copies — owner decision
- **Where:** `src/lib/oldHref.ts:38-45` always returns `/<L>/old…`. There are 36 `oldHref(` calls,
  34 `oldLp(` calls and 75 `${lp}/…` templates. Examples:
  - `src/components/NicheAppList.tsx:39` `${lp}/reviews/${slug}/${app.id}`
  - `src/components/AppsList.tsx:20`
  - `src/app/(old)/segment/[slug]/page.tsx:437` `${lp}/rating/${slug}`
  - `src/components/Footer.tsx:42`
- **Evidence:**
  - Production `/ru/segment/qr-scanner` links `href="/ru/reviews/qr-scanner/368494609"`; on `main`,
    `lp = ru ? "/ru" : "/en"`.
  - `seo-routes.ts` reports that 2,706 in-place sitemap URLs are linked only as `/<L>/old/…`, which is
    served with `X-Robots-Tag: noindex`. The reviews section (1,932 URLs), the per-app pages and
    `/rating/*` would lose all internal links.
- **Why it's the owner's call:** DECISIONS §8 says "inside the old site, navigation stays in `/<loc>/old/...`".
  ARCHITECTURE §5.2 says in-place pages "stay indexed".
- **Fix, recommended (option A: link to the URL that is canonical for that content).** An `/old` copy stays
  only for URLs the new site took over:
  ```ts
  // src/lib/oldHref.ts
  import { decideRoute } from "@/site/routing/decide"; // pure, client-safe (manifest + locales only)
  export function oldHref(l: LocaleLike, path: string = "/"): string {
    const loc = oldLocale(l);
    const base = `/${loc}/${OLD_SEGMENT}`;
    let p = path || "/";
    if (p.startsWith("/?") || p.startsWith("/#")) p = p.slice(1);
    if (p[0] !== "/" && p[0] !== "?" && p[0] !== "#") p = `/${p}`;
    const cut = p.search(/[?#]/);
    const pathOnly = cut === -1 ? p : p.slice(0, cut);
    const suffix = cut === -1 ? "" : p.slice(cut);
    if (pathOnly === "" || pathOnly === "/") return base + suffix;
    const d = decideRoute({ pathname: `/${loc}${pathOnly}` });
    return d.type === "rewrite" && d.site === "inplace" ? `/${loc}${pathOnly}${suffix}` : base + pathOnly + suffix;
  }
  ```
  - This was prototyped against the real `decideRoute`:
    - `/reviews/x/1`, `/rating/x`, `/segment/<non-launch>`, `/ideas/top`, `/tokens`, `/mcp` → public URL;
    - `/`, `/segment/<launch>`, `/ideas`, `/library`, `/offer/payment` → `/<L>/old…`.
  - Codemod the 75 `${lp}/…` templates to `oldHref(<locale>, "/…")`. `oldLp` can't see the path, so these
    links would otherwise skip the check.
  - Add a rule to `scripts/check-old-links.mjs`: `{ id: "lp-template", re: /\$\{lp\}\// }`.
  - Update the `oldHref.ts` header comment, ARCHITECTURE §5.2 and DECISIONS §8.
  - Side effect: a link inside the archive to an in-place page leaves `/old` and lands on the same old
    page, now with the in-place banner.
- **Option B, if §8 must hold literally:** make links mode-aware.
  - Server: `oldNavHref()` (see A10).
  - Client: an `OldSiteModeContext` provided in `src/app/(old)/layout.tsx` from `x-ia-site`, read by a
    `useOldHref()` hook.
  - This touches all 58 files that use the helpers.

### A5 · major · return-path validation (sign-in)
- **Where:**
  - `src/app/api/auth/google/start/route.ts:17-18` and `google/callback/route.ts:51-53` use the check
    `startsWith("/") && !startsWith("//")`. The same check is in `email/start/route.ts:18-19` and
    `email/verify/route.ts:11-12`.
  - `src/site/routing.ts:122-125` `isSafeReturnPath` is used by `login/page.tsx:24`,
    `src/site/features/auth/SignInHost.tsx:38`, and `SignInPanel.tsx:206` (→ Google start).
- **Evidence:**
  - `new URL("/\\evil.example","https://inapp.pro")` resolves to `https://evil.example/`.
  - `"/\t/evil.com"` and `"/\n/evil.com"` resolve to `https://evil.com/`.
  - `google/start?return_to=/%5Cevil.example` stores `/\evil.example` in the cookie; the callback then
    redirects there. This is live on production today, and the new sign-in reuses the same endpoint.
  - `isSafeReturnPath("/\t/evil.com") === true`.
  - `?return_to=a&return_to=b` passes an array, so `.startsWith` throws and the page returns 500.
  - The email verify route concatenates `${origin}${rt}`, so it stays on the same origin. It still gets the
    helper for consistency.
- **Fix:** add `src/lib/safeReturn.ts` (tested: rejects backslash, `\t`, `\n`, `\r`, `/.//x`, `//x` and
  arrays; accepts `/ru/segment?q=1#x`):
  ```ts
  export function safeLocalPath(p: unknown, fallback = "/"): string {
    if (typeof p !== "string" || p.length > 2048 || !p.startsWith("/") || p.startsWith("//")) return fallback;
    if (/[\\\u0000-\u001f\u007f]/.test(p)) return fallback;
    try {
      const u = new URL(p, "https://inapp.pro");
      return u.origin === "https://inapp.pro" && !u.pathname.startsWith("//") ? p : fallback;
    } catch { return fallback; }
  }
  ```
  Use it in these places:
  - `google/start:17-18`: `const returnTo = safeLocalPath(new URL(req.url).searchParams.get("return_to"));`
  - `google/callback:51-52`: `const returnTo = safeLocalPath((await cookies()).get("g_oauth_return")?.value);`
  - `email/start:18-19`: `const returnTo = safeLocalPath(body?.return_to, "/cards");`
  - `email/verify:11-12`: `const rt = safeLocalPath(url.searchParams.get("rt"), "/cards");`
  - `src/site/routing.ts:123-125`:
    `export function isSafeReturnPath(p: unknown): p is string { return safeLocalPath(p, "") !== ""; }`.
    If the rule "`src/site` must not import `src/lib`" is enforced, inline a copy instead.
  - Type `login/page.tsx:19` `return_to?: string | string[]`.
  - Add a test to `test-routing.ts`: `["/\\evil.com","/\t/evil.com","/\n/evil.com",["/a","/b"],"//x"]` → `false`.

### A6 · major · CI post-deploy smoke test
- **Where:** `.github/workflows/deploy.yml:158-180`. Another agent is editing this file; coordinate.
- **Evidence:**
  - The new-site footer and top bar render `AppStoreBadge` (`src/site/ui/AppStore.tsx:39`) on every page,
    so `grep -q '/badges/app-store.svg'` always passes on new pages.
  - `expect_200 /en/contacts` passes on a TODO page.
  - Nothing checks `/offer`, `/offer/payment` or the payment return.
  - The smoke test runs after `deploy.sh` has swapped the build, and there is no rollback.
  - `! grep …` does not trip `set -e` in bash, so the new checks below use a helper instead.
- **Fix:**
  - In the market-player loop (`:158-165`), replace the badge grep with a check for a competitor's store
    link: `grep -Eo 'apps\.apple\.com/[a-z]{2}/app/id[0-9]+' /tmp/market-players.html | grep -vq 'id6814396315'`.
  - Keep `id="main-players"`; ARCHITECTURE §5.4 requires it on new topic pages.
  - Append after `:180`:
    ```bash
          expect_absent() { if grep -q "$1" /tmp/smoke-body.html; then echo "unexpected '$1' in $2"; exit 1; fi; }
          for l in ru en; do
            expect_200 "https://inapp.pro/$l/offer";         expect_absent 'TODO' "/$l/offer"; expect_absent '₽' "/$l/offer"
            expect_200 "https://inapp.pro/$l/contacts";      expect_absent 'TODO' "/$l/contacts"; expect_absent '₽' "/$l/contacts"
            grep -q 'mailto:' /tmp/smoke-body.html
            expect_200 "https://inapp.pro/$l/offer/payment"; grep -q 'Публичная оферта' /tmp/smoke-body.html
          done
          ret="$(curl -sS -o /dev/null -w '%{redirect_url}' -H 'Accept-Language: ru' \
            'https://inapp.pro/library?checkout=00000000-0000-0000-0000-000000000000')"
          test "$ret" = "https://inapp.pro/ru/library?checkout=00000000-0000-0000-0000-000000000000"
          expect_200 "$ret"; expect_absent 'TODO' "/ru/library"
    ```
  - Better still, run the same checks before the swap: in the `ci` job, `prisma db push` on `ci.db`, then
    `next start -p 3999 &`, then `node scripts/v2/audit/predeploy.mjs --live http://127.0.0.1:3999`.

### A7 · major · deploy safety for the first v2 deploy (schema change)
- **Where:** `deploy/deploy.sh:20` (`git pull --ff-only origin main`), `:23`
  (`npx prisma db push --accept-data-loss`), and `.github/workflows/deploy.yml:113`.
- **Evidence:**
  - The first deploy adds `SiteSaved` and `SiteNote`. The diff against `5d79cb75` is additive only, but the
    schema is still being edited, and a destructive change would drop data silently.
  - CI builds `.next` from `github.sha`, but the box checks out the tip of `main`.
  - Since phase A, `content/v2` and `public/media` are read from the checkout at runtime, so a merge
    landing mid-deploy pairs `.next` from commit A with content, images and schema from commit B.
- **Fix:**
  - `deploy.yml:113`: `'cd /opt/badcomment && bash deploy/deploy.sh ${{ github.sha }}'`
  - `deploy.sh:20-23`:
    ```bash
    SHA="${1:?usage: deploy/deploy.sh <commit-sha built by CI>}"
    git fetch --quiet origin main
    git merge-base --is-ancestor "$SHA" origin/main || { echo "!! $SHA is not on origin/main" >&2; exit 1; }
    git checkout --quiet -B main "$SHA"
    npm ci
    npx prisma generate
    mkdir -p data/backup
    sqlite3 data/prod.db ".backup 'data/backup/prod-$(date +%F-%H%M%S).db'"   # once: sudo apt-get install -y sqlite3
    npx prisma db push      # no --accept-data-loss: a destructive change now fails the deploy instead of dropping data
    ```
  - Rotate `data/backup/` as disk space allows.

### A8 · major · ideas saved on the old site don't show in the new `/saved` (outside phase A)
- **Evidence:**
  - `/<L>/saved` now belongs to the new site (`decide.ts:40`). The old list lives only at `/<L>/old/saved`.
  - Spec 06 §6.1 and 09 C12 say "`Favorite` stays … the store for idea bookmarks". But the in-progress
    `prisma/schema.prisma` comment says `SiteSaved` is "Separate from the old site's Favorite", and
    `grep -rn Favorite src/app/api/site src/site/features/library` finds nothing.
- **Fix (library owner):** in the account read path (`src/app/api/site/library`, server side), merge in
  the user's `prisma.favorite.findMany({ where: { userId } })` rows whose `slug` passes `isLaunchIdea`, as
  `kind: "idea"` (read-only). Alternatively, copy them once into `SiteSaved` on the first sync. If the owner
  prefers a clean start, record that in DECISIONS §11.

### A9 · major (existing issue, independent of the v2 deploy) · reviews/MCP canonicals have no locale
- **Where:** `src/app/(old)/reviews/[slug]/[id]/page.tsx:29`, `reviews/[slug]/page.tsx:30`, `reviews/page.tsx:22`,
  `reviews/methodology/page.tsx:20`, `mcp/page.tsx:28`.
- **Evidence:** live `/ru/reviews/habit-tracking/1394150432` has
  `canonical=https://inapp.pro/reviews/habit-tracking/1394150432`, and that URL answers `307 → /en/…` for
  Googlebot. So the ru pages point their canonical at the en pages, which conflicts with their hreflang.
  This affects 1,934 URLs.
- **Fix:** use absolute canonicals with the locale. `ru` is already in scope in all 5 files. For example:
  ``canonical: `https://inapp.pro/${ru ? "ru" : "en"}/reviews/${slug}/${id}` ``, and likewise
  `/reviews/${slug}`, `/reviews`, `/reviews/methodology`, `/mcp`. ARCHITECTURE §5.2 freezes old
  canonicals, so this needs the owner's OK. `check-old-links.mjs` still passes with this form.

---

## Minor

### A10 · minor · old redirect pages send visitors into the archive; `/segment/<launch>/v2` 404s
- **Where:**
  - `src/app/(old)/catalog/page.tsx:10`, `categories/page.tsx:12`, `premium/page.tsx:9`,
    `segment/[slug]/v2/page.tsx:10`, `mcp/connect/page.tsx:16,22`, `build/[slug]/[idea]/page.tsx:55`
  - `src/site/routing/decide.ts:215-216`
- **Evidence:**

  | URL | Production | site-v2 |
  |---|---|---|
  | `/ru/catalog` | 307 → `/` | 307 → `/ru/old` |
  | `/ru/premium` | → `/tokens` | → `/ru/old/tokens` |
  | `/ru/segment/habit-tracking/v2` | 307 → the topic | new-site 404 |

  IndexNow also pings `/<L>/catalog`, which A3's sitemap-derived list removes.
- **Fix:**
  - In `src/lib/oldSite.server.ts`, add:
    ```ts
    import { oldHref, publicHref, type LocaleLike } from "./oldHref";
    /** Redirect target from an old page: stays in /<L>/old inside the archive, else the public URL. */
    export async function oldNavHref(l: LocaleLike, path: string): Promise<string> {
      return (await getOldSiteMode()) === "old" ? oldHref(l, path) : publicHref(l, path);
    }
    ```
  - Use it in all six redirects:
    - `redirect(await oldNavHref(locale, "/"))` for catalog and categories;
    - `"/tokens"` for premium;
    - `` `/segment/${slug}` `` for v2;
    - `"/mcp"` for connect (both lines);
    - `` `/build/${slug}` `` for build.
  - Allow-list the file in `scripts/check-old-links.mjs:49-53`:
    `"src/lib/oldSite.server.ts", // oldNavHref: public target outside the archive`.
  - In `decide.ts`, inside `if (a === "segment") {` before line 216, add:
    `if (b !== undefined && tail.length === 3 && tail[2] === "v2") return redirect(308, path(l, "segment", b), ctx.search);`.
    Add a test: `expectRedirect(decide("/ru/segment/habit-tracking/v2?x=1"), 308, "/ru/segment/habit-tracking?x=1")`.

### A11 · minor · in-place old pages overwrite a de/fr/ja `locale` cookie
- **Where:** `src/site/routing/decide.ts:186`.
- **Evidence (`decideRoute` probe):** `/en/spotify` with cookie `de` sets `locale=en`, and `/de/spotify`
  first 307s to `/en/spotify`. New topic pages link to per-app pages (DECISIONS §3), so after one click
  `/` sends a German visitor to `/en` for a year.
- **Fix:**
  ```ts
  cookies: site === "inplace" && !(isLocale(ctx.cookieLocale) && !isOldLocale(ctx.cookieLocale)) ? localeCookie(ctx, l) : [],
  ```
  - Add a test: `/en/spotify` with cookie `de` sets no cookie; with cookie `ru` it sets `en`.
  - Update ARCHITECTURE §3 ("Old in-place pages also set the locale cookie (ru/en)" → "…unless it holds de/fr/ja").

### A12 · minor · unmatched old URLs get Next's bare default 404
- **Evidence:**
  - There is no root `src/app/layout.tsx` any more; two root layouts exist.
  - The built `.next/server/app/_not-found.html` has `<html>` with no `lang`, no old CSS or chrome, and
    `og:image` on `http://localhost:3000/opengraph-image…`.
  - Production renders its 404 inside the old layout. This affects multi-segment unmatched paths such as
    `/ru/foo/bar/baz` and `/ru/old/x/y/z`.
- **Fix** (Next 16 `not-found.md`, "global-not-found (experimental)"):
  - In `next.config.ts`, add `experimental: { globalNotFound: true },`.
  - Add `src/app/global-not-found.tsx`:
    ```tsx
    import type { Metadata } from "next";
    import "@saverin/tokens/css";
    import "./(old)/globals.css";
    export const metadata: Metadata = { metadataBase: new URL("https://inapp.pro"), title: "404 — inApp", robots: { index: false, follow: true } };
    export default function GlobalNotFound() {
      return (
        <html lang="en"><body>
          <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 24px", textAlign: "center" }}>
            <h1>404</h1><p>Страница не найдена · Page not found</p>
            <p><a href="/ru">inApp по-русски</a> · <a href="/en">inApp in English</a></p>
          </main>
        </body></html>
      );
    }
    ```

### A13 · minor · de/fr/ja users get a Russian magic-link email
- **Where:** `src/app/api/auth/email/start/route.ts:20`
  (`locale = body?.locale === "en" ? "en" : "ru"`). The new `SignInPanel.tsx:230` sends the site locale.
- **Fix:** `const locale = body?.locale === "ru" ? "ru" : "en";`. The old `AuthModal.tsx:158` always sends
  `ru` or `en`, so its behaviour is unchanged.

### A14 · minor · search helpers have no query cap of their own (defence in depth)
- **Where:** `src/site/content/text.ts:288-312`, `src/site/content/search.ts:28-31,41-44,82-86`.
- **Evidence:**
  - `bench-search.ts` with an 8 KB `?q=`: `searchResearch` 64 ms, `filterIdeas` 248 ms, against 0.3 ms
    for a normal query (M3 laptop; expect the 2-vCPU box to be 2–4× slower).
  - The rewritten pages already cap the query (`segment/page.tsx:29` takes `.slice(0, 200)` and `q[0]` of
    an array; `ideas/page.tsx:101`). At 200 chars the worst case is 3.7 ms (research) and 13.8 ms (ideas),
    so this is downgraded from major.
- **Fix:** `git apply scripts/v2/audit/search-query-cap.patch` (`git apply --check` passes). It:
  - caps the query at 200 chars and 12 unique tokens;
  - adds `matchesTokens`;
  - tokenizes once per request.

  Then add `node --import tsx scripts/v2/audit/bench-search.ts` to CI; it exits 1 until the patch is applied.

### A15 · minor (existing issue; matters more now with 1,528 WebP) · caching of static files
- **Evidence:**
  - `curl -sI https://inapp.pro/badges/app-store.svg` returns `Cache-Control: public, max-age=0` with a
    weak ETag from Node.
  - The site speaks HTTP/1.1 only.
  - `deploy/nginx-badcomment.conf` is stale: `server_name badcomment.pro`, port 80, a single `location /`.
- **Fix, in the repo now:** in `next.config.ts`, add:
  ```ts
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return ["/media/:path*", "/brand/:path*", "/badges/:path*"].map((source) => ({ source, headers: week }));
  },
  ```
  Next's static sender keeps a `Cache-Control` that is already set (`compiled/send`:
  `_cacheControl&&!a.getHeader("Cache-Control")`).
- **Fix, on the box later:** in the certbot-managed 443 server block:
  - `listen 443 ssl http2;`
  - `gzip` with `gzip_types` covering css, js, json, svg, xml and ttf;
  - `location ^~ /media/`, `/brand/`, `/badges/` with `root /opt/badcomment/public; try_files $uri =404;`
    and the same `Cache-Control`;
  - `location ^~ /_next/static/ { alias /opt/badcomment/.next/static/; add_header Cache-Control "public, max-age=31536000, immutable"; }`;
  - an upstream with `keepalive 16`.

  Repeat any server-level `add_header` (HSTS) inside these locations. Then commit the real file back as
  `deploy/nginx-badcomment.conf`.

### A16 · minor · bare links take 2 hops for de/fr/ja visitors
- **Evidence:** `/segment/sobriety` with Accept-Language `de` → 307 `/de/segment/sobriety` → 307
  `/en/segment/sobriety`. The same happens for `/rating/*` and `/reviews/*`, which the shipped iOS app links
  without a locale.
- **Fix:** replace `decide.ts:255` with:
  ```ts
  if (!isLocale(first)) {
    const l = negotiated();
    const next = decideLocalized(ctx, l, segs);
    return next.type === "redirect" ? { ...next, status: 307 } : redirect(307, path(l, ...segs), ctx.search);
  }
  ```
  Change `scripts/v2/test-routing.ts:72` to expect `/en/segment/x?q=1`.

### A17 · minor · content loaders resolve the content root twice
- **Where:** `src/site/i18n/server.ts:20` hard-codes `content/v2`, while `src/site/content/index.ts:56-58`
  honours `CONTENT_V2_DIR`.
- **Fix:** add `src/site/content/root.ts`:
  ```ts
  import "server-only";
  import path from "node:path";
  export const CONTENT_ROOT = process.env.CONTENT_V2_DIR
    ? path.resolve(process.env.CONTENT_V2_DIR)
    : path.join(process.cwd(), "content", "v2");
  ```
  Import it in both files. Optionally raise `MAX_ENTRIES` (`index.ts:59`) from 200 to 2000 so a crawl of
  5 locales × 328 pages doesn't churn the cache; the whole corpus is about 15 MB.

### A18 · minor · deploy and CI extras (optional)
- **Source maps:** at `deploy.yml:70`, use `tar -czf next-build.tgz --exclude='.next/cache' --exclude='*.map' .next`.
  This drops 491 maps (285 MB) and roughly halves the tarball. The cost is server stack traces that are
  not source-mapped.
- **`npm ci` only when the lockfile changes:** replace `deploy.sh:21` with:
  ```bash
  LOCK_SHA="$(sha256sum package-lock.json | cut -d' ' -f1)"
  if [[ "$(cat node_modules/.lock-sha 2>/dev/null)" != "$LOCK_SHA" ]]; then npm ci --no-audit --no-fund && echo "$LOCK_SHA" > node_modules/.lock-sha; fi
  ```
- **No npm process in memory:** in `deploy/badcomment.service`, set
  `ExecStart=/usr/bin/node /opt/badcomment/node_modules/next/dist/bin/next start`, then run
  `sudo systemctl daemon-reload` on the box.
- **Static-JSON guard:** after "Build (.next) on the runner", add
  `- run: node scripts/v2/audit/check-static-json.mjs`. It exits 0 today and fails if the proxy or a
  new-site page starts bundling old data JSON (`src/site/access.ts → @/lib/access → … → ideas.json` is
  one import away).

### A19 · minor · cleanup
- `src/app/offer/payment/` is an empty, untracked folder left by the merge. If a `page.tsx` were ever put
  there, it would clash with `(old)/offer/payment` at build time. Remove it: `rmdir src/app/offer/payment src/app/offer`.

---

## Dropped (refuted or not actionable)

- **`/<L>/api/**`, `/<L>/old/api/**`, `/<L>/_next/**` rewrites:** these already happen on production.
  `main`'s proxy rewrote `/ru/api/me` to `/api/me` too, and live `/ru/api/me` returns 200. No bypass was
  found and there are no path-based nginx rules, so this is optional hardening only.
- **OldSiteBanner `/segment` target:** refuted. The old site has no `/segment` index page
  (`src/app/(old)/segment/` contains only `[slug]`), so a client-side navigation can never land on `/ru/old/segment`.
- **Archive copies are noindex yet declare a canonical:** by design (ARCHITECTURE §5.2); the
  `X-Robots-Tag: noindex` header decides. With A4 option A, only copies of new-owned pages remain.
- **`public/media/app-icon-{180,512}.png` unused:** refuted. They are referenced by `content/v2/manifest.json`
  (`appIcon`) and `scripts/v2/import-app-content.ts:1499`.
- **Unbounded search as "major":** downgraded to A14, because the pages now cap `q`.
- **"PurchaseTracker shows sign-in on 401":** not in the current tracker (a 401 keeps polling until
  "delayed"); A2's parity requirement is corrected.
- **`locale` cookie without `Secure`:** existing behaviour, identical to the old proxy; low value.
- **Duplicates merged:**
  - offer/payment = sitemap B2 + security R1 + old-regressions F2 → A1.
  - stubs = sitemap m1/m2 + security R6 + old-regressions F5 → A10.
  - in-place links = sitemap M1 + old-regressions F7 → A4.
  - cookie = security R4 + old-regressions F4 → A11.
  - nginx = security R8 + perf F2 → A15.
  - Google plus `isSafeReturnPath` = security R2 + R3 → A5.

## Checked and fine

- **Tests and checks (re-run 2026-09-22):**
  - `npm run test:v2-routing` 31/31;
  - `test:monetization` passed;
  - `test:market-players` 72/72;
  - `node scripts/check-old-links.mjs` (198 files, 0 violations);
  - `scripts/v2/check-content.ts` (1,528 media files consistent);
  - `npx tsc --noEmit` exit 0 (whole repo, including `scripts/v2/audit/*.ts`);
  - `eslint scripts/v2/audit` clean;
  - `check-static-json.mjs` exit 0 on the local build.
- **Proxy:**
  - Incoming `x-locale` and `x-ia-*` headers are deleted before the proxy sets its own.
  - Every redirect `Location` starts with `/<locale>` and keeps the query string; there is no open redirect
    through the proxy (Next normalises `//` and `\` first).
  - `/site` can't be reached through an old rewrite. Dotted paths that skip the proxy can't render a real
    new page, because every dynamic segment is validated against the manifest.
  - The matcher leaves `/api`, `/_next`, `/.well-known`, metadata images and dotted files alone.
  - `X-Robots-Tag: noindex, follow` is set only under `/<L>/old/**`.
  - The locale cookie is never written on `/old` or on redirects.
- **Slugs:** none of the 1,516 app slugs collides with a locale, `old`, `site`, `api` or any new top-level
  segment. `notes` is documented.
- **Old site:**
  - Every `/old` copy of a sitemap URL resolves to an old page with noindex.
  - Canonicals, hreflang and JSON-LD are unchanged from `main`.
  - `/ru/mcp` and `/ru/tokens` are still served in place; `.well-known` OAuth rewrites are intact.
  - Google, Telegram and email sign-in return correctly from `/old` and in-place pages.
  - `?checkout=` survives the bare → `/<L>/library` redirect.
  - The YooKassa webhook and `bot/` are untouched.
- **Feeds and IDs:**
  - The feed and llms topic URLs all resolve.
  - All 592 old idea IDs × 2 locales resolve: launch IDs go to the new page, the rest 308 to their topic.
- **Content cache:** at most 11.5 MB of heap at 200 entries; the proxy bundles no JSON and takes ~0.7 µs
  per decision.
- **Schema:** the Prisma diff against `main` is additive only (`SiteSaved`, `SiteNote`).
- **Caching:** new pages are dynamic (the root layout reads `cookies()`); HTML is sent `private, no-store`.

## Audit tools (untracked, `scripts/v2/audit/`, tsc + eslint clean)

| File | Use |
|---|---|
| `predeploy.mjs` | one gate that runs everything below plus the routing tests, old-link check, content check and a placeholder scan |
| `proxy-attack.ts` | routing attack matrix; NEW rewrites without a page; unsafe return paths |
| `seo-routes.ts` | every sitemap/feed/llms/contract URL through `decideRoute` (`--source code|prod`, `--live`) |
| `old-site-smoke.mjs` | GET-only smoke of old, in-place, legal and payment URLs against a base URL |
| `bench-search.ts` + `search-query-cap.patch` | A14 |
| `check-static-json.mjs` | A18 bundle guard (needs a build) |
| `measure-content-memory.mjs` | content cache heap (`node --expose-gc`) |
