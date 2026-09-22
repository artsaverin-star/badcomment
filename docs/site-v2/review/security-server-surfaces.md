# Security review — new server surfaces (site-v2)

Reviewer: security subagent. Date: 2026-09-22 (clock rolled to 09-23 mid-run).
Scope: `src/app/api/site/**`, `src/app/api/me`, auth/plus client + API flows, gating of paid
content (HTML/RSC/metadata/JSON-LD/OG/list pages), rate/payload limits, Prisma queries, error
leakage, proxy header handling. Live exploit attempts run against the shared dev server on
`http://localhost:3210` (guest, i.e. no `ia_session`). No state-changing git/deploy/dev-server
actions were taken.

Verdict summary: **gating is solid** — no locked idea/topic prose leaked in any guest HTML, RSC
(`RSC: 1`, prefetch, `Next-Action`), metadata, JSON-LD, OG, sitemap, feed, or `llms*.txt`
response across all five locales (0 hits over ~700 probes/locale). The library sync API's authz
and CSRF posture is correct. **One real open-redirect** exists in the return-path validators, plus
a few minor/by-design items.

---

## BLOCKER
(none)

## MAJOR

### M1. Open redirect via `return_to` — control-char / backslash bypass of both validators
Web sinks:
- `src/site/routing.ts:123` `isSafeReturnPath` — only rejects `//` and a leading `/\`. It does
  **not** strip/reject tab (`\t`), newline, CR, or other control chars.
- `src/app/api/auth/google/start/route.ts:18` and `src/app/api/auth/google/callback/route.ts:52`
  — validate with `rawReturn.startsWith("/") && !rawReturn.startsWith("//")`; this does **not**
  reject a leading `/\` (backslash) either.
- Dangerous resolution sinks: `src/app/api/auth/google/callback/route.ts:53`
  `NextResponse.redirect(new URL(returnTo, origin))` and client `router.replace(returnTo)` in
  `src/site/features/auth/LoginScreen.tsx:21` (fed by `src/app/(site)/site/[lang]/login/page.tsx:50-54`).

Spec source it should match: spec 06 §3.6 / line 118 — "`return_to`/`rt` must be a local path".

Exploit (verified). The WHATWG URL parser strips leading tab/newline/CR and treats `\` as `/`, so
these paths pass the checks yet resolve off-site:
```
node: new URL("/\\evil.example",  "https://inapp.pro") -> https://evil.example/
node: new URL("/\t/evil.example", "https://inapp.pro") -> https://evil.example/
```
- `isSafeReturnPath("/\t/evil.example")` returns **true** (tab not blocked).
- google/start & callback accept **both** `/\evil.example` and `/%09/evil.example`
  (`startsWith("//")` is false for each).
- Live: `GET /ru/login?return_to=/%09/evil.example` echoes `"returnTo":"/\t/evil.example"` into the
  page (the `segments[0] !== "login"` guard doesn't catch it because `segments[0]` is `"\t"`), so a
  logged-in victim's `router.replace` / server `redirect()` lands on `evil.example`.
  (`/%5Cevil.example` is instead normalized to `/ru/segment` by the login page because
  `isSafeReturnPath` *does* block leading `/\` — but the Google flow does not, so it stays exploitable
  there.)

Impact: classic pre-auth OAuth open redirect. Attacker sends victim to
`/api/auth/google/start?return_to=/\evil.example`; after a normal Google sign-in the callback
302s to `https://evil.example/`. Phishing / consent-laundering vector.
(Google is unconfigured on the dev box so I could not capture the final live 302; confirmed by
code path + URL-parser PoC. `email/verify` uses string concatenation `${origin}${rt}`, which keeps
the host = inapp.pro, so that sink is **not** affected.)

Fix: make one shared validator and reject control chars and backslashes before the sink, e.g.
```ts
export function isSafeReturnPath(p?: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//")
    && !/[\\\u0000-\u001f\u007f]/.test(p);   // no backslash, no C0/DEL controls
}
```
and route google/start, google/callback, email/start, email/verify, the login page and
`SignInHost`/`LoginScreen` through it (not the ad-hoc `startsWith` checks). Optionally
canonicalize with `new URL(p, SITE_URL)` and require `.origin === SITE_URL` before redirecting.

---

## MINOR

### m1. Research search is a substring oracle over locked article bodies (by design, but note)
`src/app/(site)/site/[lang]/segment/page.tsx:63` → `searchResearch` (`src/site/content/search.ts:17`)
matches `?q=` against `search.json` haystacks that include **locked** article bodies
(`getSearchIndex`), returning matching topic slugs to guests. Spec 09 G10 explicitly mandates
server-side matching over locked bodies returning slugs only, so this is intended and no prose is
returned. But it is a working binary oracle: a guest can confirm arbitrary substrings exist in a
paid topic's body. Verified:
```
/en/segment?q=penalties  -> habit-tracking, interior-design   (word is only in habit-tracking's locked body)
/en/segment?q=penaltiex  -> interior-design only              (negative control)
```
Over many queries this leaks fragments of paid prose. Recommend accepting the risk (matches spec)
or, if undesired, rate-limit `?q=` and/or restrict the haystack to public fields for guests.
No web-side fix required to meet spec.

### m2. Export route has no same-origin / content-type check (low risk, read-only)
`src/app/api/site/export/[id]/route.ts:24` accepts cross-site `POST` with `text/plain` and no
Origin check. It is not exploitable: the `ia_session` cookie is `SameSite=Lax`
(`src/lib/session.ts:42`) so a cross-site fetch carries no session → the viewer is a guest and only
free ideas export; the response has no `Access-Control-Allow-Origin`, so a cross-origin page cannot
read it. Payload limits are correct (verified: 20 MB chunked body → 413 in 0.16 s;
`Content-Length > 256000` → 413; note > 20 000 → 413; traversal id `..%2F..%2Fpackage` → 404;
`lang=__proto__` → 400). Consider adding the same `guard(req,true)` same-origin check used by the
library route for defense in depth.

### m3. Dev-mode stack/paths in error responses (dev only)
While `src/site/i18n/server.ts` was mid-edit by another agent, `GET /api/site/library` and
`/<L>/settings` returned a Next **dev** error page embedding absolute file paths and a stack in
`__NEXT_DATA__` (e.g. `"the name CONTENT_ROOT is defined multiple times … /Users/…/.next/dev/…"`).
This is the Next dev overlay, not the production surface; production builds strip it and the
route's own errors are generic JSON. Informational — confirm prod `next build` output does not leak
stacks. The site error boundary (`error.tsx`) does `console.error(error)` client-side and renders a
generic `ErrorView`, which is fine.

---

## Things checked and found correct (no action)

- **Library sync authz/CSRF** (`src/app/api/site/library/{route,merge/route}.ts`,
  `src/site/features/library/http.ts`). Guest `GET` → 401; guest/cross-origin `POST` → 403
  `cross-origin request` (evil `Origin`, `Origin: null`, subdomain Origin, and evil Origin +
  spoofed `X-Forwarded-Host: evil.example` all blocked — the forwarded host only *widens* the
  allow-list to the real proxied host, it cannot match an attacker Origin unless it already equals
  `Host`); forged/alg-stripped `ia_session` → 401 (HMAC + `timingSafeEqual`, `src/lib/session.ts:22`).
  Bounds enforced: body ≤ 5 MB, ops ≤ 200, note ≤ 20 000, merge lists ≤ 1000 / notes ≤ 2000.
  `SameSite=Lax` session + Origin check = solid CSRF posture.
- **Prisma queries** (`src/site/features/library/server.ts`, `src/app/api/pay/status/route.ts`).
  All parameterized; every read/write is scoped by `userId` from the verified session
  (`where:{userId}`, `userId_kind_slug`). Pay status also checks `attempt.userId !== user.id` → 404.
  Inputs validated by `validate.ts`/manifest allow-list before reaching the DB. No injection or IDOR.
- **Gating of paid content.** Guest HTML + RSC (`RSC:1`, `+Next-Router-Prefetch`,
  `+Next-Router-Segment-Prefetch`, `Next-Action`) for locked ideas and topics leaked **0** of the
  gated title/description/lead/section probes across ru/en/de/fr/ja. Locked idea metadata is the
  generic "Idea in Plus" with `robots:noindex`; JSON-LD for locked pages is `WebPage` only. List
  pages (`/`, `/segment`, `/segment?q=`, `/ideas`, `/ideas?category=`, `/ideas?q=`, `/saved`,
  `/plus`, `/welcome`, `/login`, `/library`) and `sitemap.xml`/`feed.xml`/`llms.txt`/`llms-full.txt`
  showed 0 hits over ~700 card+topic probes/locale. The app names appearing on locked topic pages
  come from the public market-players block (`TopicExtras`, DECISIONS §3 site-only richness), not
  the gated article body — confirmed the article `lead`/section prose is absent.
- **`/api/me`** (`src/app/api/me/route.ts`) returns only the caller's own fields; guest response is
  all-false. GET, own data, not CORS-readable.
- **Proxy header handling** (`src/proxy.ts`, `src/site/routing/decide.ts:53` `PROXY_REQUEST_HEADERS`).
  Client-supplied `x-ia-*`/`x-locale` are deleted before the proxy sets its own (verified: spoofed
  `x-ia-new-path` on a rewritten old page → 0 reflection). `getOldSiteContext` `safePath`
  (`src/lib/oldSite.server.ts:20`) rejects `//` and backslash. Internal `/site/**` tree is
  unreachable publicly (`/site/en/ideas/…`, `/en/site/…`, `/ru/old/site/…`, dotted variants all 404
  with no leak). Subrequest-bypass headers (`x-middleware-subrequest`, `x-nextjs-rewrite`) → 400.
  Note (informational): the proxy matcher excludes any path containing a `.`, so a dotted path skips
  header stripping — but such paths 404 and `safePath` still constrains the banner link to
  same-origin, so impact is nil.
- **JSON-LD / XSS.** `jsonLd()` escapes `<`; JSON-LD data is author content, no user input. `?q=` is
  React-escaped (no `dangerouslySetInnerHTML`). Export `.txt` returns `text/plain` with a note
  containing `</script>` rendered inertly. Filename via RFC 6266 `filename*`.
- **Payments/Telegram** (`/api/pay/yookassa` source regex-validated; return URL origin from
  `SITE_URL` first; `/api/auth/poll` deletes the one-time token) — unchanged old surfaces, no new
  issue.
