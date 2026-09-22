# 06 — Current site infrastructure the new site must reuse or not break

Status: research spec, 2026-09-22. Source repo: `/Users/artsaverin/projects/badcomment-v2` (branch `site-v2`, HEAD `7c0dbf4`), which is a copy of production `inapp.pro`.
All `file:line` references are relative to the repo root unless prefixed with `app:` (= `/Users/artsaverin/projects/app_04_inapp/`).
Where code and comments/docs disagree, the code is described and the discrepancy is listed in §11.

---

## 0. TL;DR — hard constraints for the new site

1. **One Next.js 16.2.6 app, one SQLite DB, one 2 vCPU / 1.9 GB box.** Nothing is built on the box; the GitHub runner builds `.next` and ships a tarball (`.github/workflows/deploy.yml:7-10,50-65`, `deploy/deploy.sh:4-6`).
2. **CI gate** = `npm ci` → `prisma generate` → `tsc --noEmit` (whole repo, `tsconfig.json` includes `**/*.ts(x)`) → `npm run lint` (whole repo) → `test:mcp` → `test:monetization` → `test:market-players` → `next build` (`deploy.yml:43-63`). The monetization test **greps specific files** (`src/app/layout.tsx`, `src/components/PurchaseTracker.tsx`, `src/lib/track.ts`, the two pay routes) — moving/renaming them breaks CI (§10.2).
3. **Schema changes are applied with `prisma db push --accept-data-loss` on every deploy** (`deploy/deploy.sh:23`). Only additive, optional/defaulted changes are safe. Never rename or drop a column/table.
4. **Locale routing lives in `src/proxy.ts`** (Next 16 name for middleware): `/ru|/en/<path>` is rewritten to `/<path>` with `x-locale`; anything else is 307-redirected to `/<locale>/<path>`. Only `ru` and `en` exist (`src/proxy.ts:11-12`). The app ships 5 locales (ru, en, ja, de, fr — `app:Inapp/Resources/locales.json`), so parity needs proxy + i18n changes (§2.4).
5. **Auth = one HMAC-signed httpOnly cookie `ia_session`** (30 days) set by 4 live login methods (Telegram bot, Google redirect, Google GIS, email magic link). A new UI needs only: `GET /api/me`, the login endpoints, `POST /api/auth/logout` (§3.7).
6. **Payments = YooKassa redirect checkout, one SKU: "lifetime" for 990 ₽** (`src/lib/tokenConfig.ts:16-21`). Success sets `User.lifetime = true`. Return URL is hard-coded to `/library?checkout=<uuid>` (`src/app/api/pay/yookassa/route.ts:58`).
7. **"Plus" on the web = `access.unlimited`** = admin ∨ lifetime ∨ friend (`src/data/friends.json`) ∨ `premiumUntil > now` (`src/lib/access.ts:29-34`). Web purchases and App Store purchases are **not linked** (§5.3).
8. **URLs with external consumers** (iOS app, App Store metadata, OAuth providers, YooKassa, MCP clients, search engines, Telegram bot, sent emails) must keep resolving at the same path (§9). This includes `/ru/reviews/<cat>/<appId>`, `/ru/rating/<cat>`, `/ru/segment/<slug>` which the live iOS app links to, and `/en/contacts`, `/en` from App Store Connect.
9. **Data volume**: current `src/data` = 148 MB, `review-data` = 204 MB, `public` = 204 MB, all in git and on the box. App content packs add ~41 MB JSON + 206 MB images (`app:Inapp/Resources`). Big JSON must be read lazily from disk (pattern in `src/lib/reviews.ts:240-277`), never imported into client components (§10.4).

---

## 1. Runtime topology

| Piece | Where | Facts | Source |
|---|---|---|---|
| Web app | systemd `badcomment.service`, `/opt/badcomment`, `npm run start` (= `next start`), `PORT=3000`, `NODE_ENV=production`, `EnvironmentFile=-/opt/badcomment/.env` | Runs from the git checkout on the box; `public/`, `src/data/*` read via `fs`, and `review-data/` come from `git pull`, only `.next` comes from the CI tarball | `deploy/badcomment.service:7-15`, `deploy/deploy.sh:20-33` |
| DB | SQLite `file:/opt/badcomment/data/prod.db` | Shared by web app, Telegram bot, ingest timer, ad-hoc scripts | `deploy/badcomment.service:11`, `bot/bot.mjs:1-4,27` |
| Reverse proxy | nginx → `127.0.0.1:3000`, sets `X-Forwarded-Proto/For`, `Host` | Repo file still says `server_name badcomment.pro` (the real inapp.pro vhost/TLS config is not in the repo) | `deploy/nginx-badcomment.conf:1-17` |
| Telegram bot | separate service `inappbot` (restarted by deploy.sh), `bot/bot.mjs`, raw Bot API + Prisma on the same DB | Binds web logins (`LoginToken`), sells lifetime for 500 ⭐ | `deploy/deploy.sh:36-37`, `bot/bot.mjs:19-21,193-208` |
| Ingest | `badcomment-ingest.timer` daily 04:00 → `npm run ingest` (`INGEST_MAX_REVIEWS=80`) | Writes to prod.db; heavy on the small box | `deploy/badcomment-ingest.service`, `.timer` |
| Box size | 2 vCPU / 1.9 GB RAM | "Береги prod-box" | `SCALE_RUNBOOK.md` §0 rule 8, `next.config.ts:7-10` |

Rendering: 74 page/route files declare `export const dynamic = "force-dynamic"`; only `llms.txt`, `llms-full.txt`, `llms-full.ru.txt`, `feed.xml` are `force-static`. The root layout reads cookies, so every page is SSR per request (`src/app/layout.tsx:49-55`).

---

## 2. Request pipeline (Next 16)

### 2.1 `src/proxy.ts` — locale routing

| Input | Behaviour | Line |
|---|---|---|
| `/ru/<rest>` or `/en/<rest>` | `NextResponse.rewrite` to `/<rest>` (or `/`), request header `x-locale: ru|en`, response cookie `locale=<seg>` (1 year, `SameSite=Lax`, path `/`) | `src/proxy.ts:25-34` |
| any other matched path | 307 redirect to `/<locale><path>` (query string preserved) | `src/proxy.ts:36-39` |
| locale choice | cookie `locale` (ru/en) → first `Accept-Language` tag starts with `ru` → else `en` | `src/proxy.ts:14-19` |
| **Not matched** (no proxy at all) | paths starting with `api`, `_next/static`, `_next/image`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon`, and **any path containing a dot** (`robots.txt`, `sitemap.xml`, `feed.xml`, `llms*.txt`, `/.well-known/*`, all `public/` files) | `src/proxy.ts:47` |

Implications for the new site:
- A new top-level route whose name starts with `api`, `icon`, `apple-icon`, `opengraph-image`, `twitter-image` (e.g. `/icons`, `/apis`) silently skips locale handling. Avoid such names.
- `/old` works for free: `/old/x` → 307 `/<locale>/old/x` → rewrite to `/old/x` with `x-locale`.
- Server code gets the locale from `getLocale()` = `x-locale` header → `locale` cookie → `en` (`src/lib/i18n.server.ts:7-12`). Client code has no locale hook; components receive `locale` as a prop and build links with `lp = ru ? "/ru" : "/en"` (e.g. `src/components/Header.tsx:62`).
- Next 16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:217-219`): proxy always runs on the Node.js runtime; `runtime` config is not allowed in the proxy file.

### 2.2 `next.config.ts`

| Setting | Value | Why | Line |
|---|---|---|---|
| `transpilePackages` | `["@saverin/ui-web"]` | DS ships TS source from `vendor/saverin-ui-web-0.0.0.tgz` | `next.config.ts:4-6`, `package.json:38-39` |
| `typescript.ignoreBuildErrors` | `true` | Type-check runs as a separate CI step; the in-build pass OOM-killed the box as `insights.json` grew | `next.config.ts:7-10` |
| `outputFileTracingIncludes` | `"/segment/*": ["./src/data/marketPlayers/*.json"]` | runtime `fs` reads | `next.config.ts:11-13` |
| `rewrites()` | `/.well-known/oauth-authorization-server[/:path*]` → `/api/mcp/oauth/meta/as`; `/.well-known/oauth-protected-resource[/:path*]` → `/api/mcp/oauth/meta/pr` | App-router folders can't start with a dot | `next.config.ts:17-24` |

### 2.3 Root layout and template

`src/app/layout.tsx` is the **only** layout and wraps every page:
- `metadataBase: https://inapp.pro`, default title/description, RSS alternate `https://inapp.pro/feed.xml` (`:34-42`).
- Self-hosted Inter (latin + cyrillic, weights 500/800) from `public/og-fonts/*.woff` (`:17-32`).
- `<html lang={locale} data-theme={theme} data-brand="saverin">`; theme cookie `theme` — `light` only if the cookie says `light`, **otherwise dark** (`:52,57-61`).
- Head: Yandex Metrika queue shim + `ym(110047715,'init',…)` (`:69-75`), gtag shim + `gtag('config','G-G3J6K8VBD6',{send_page_view:false})` (`:76-82`). Order and exact tokens are asserted by `scripts/test-monetization.ts:29-34`.
- Body: `.atmosphere` div, Organization+WebSite JSON-LD (`:87-123`), `<Header locale loggedIn showOffer={!access.unlimited} theme>` (`:124-129`), `<PageTracker/>` (`:130`), `<FavSync enabled={access.loggedIn}/>` (`:131`), page, `<Footer locale/>` (`:133`), DataFast script (`:135-141`), remote YM + GA loaders (`:143-144`), YM `<noscript>` pixel (`:145-150`).
- `getAccess()` is called in the layout (`:55`) → one DB query per request for the session user (+1 for unlock sets when not unlimited).

`src/app/template.tsx:6-8` wraps each page in `<div className="route-fade">` (re-mounts per navigation).

### 2.4 Serving the old site under `/old` next to a new site

Facts the architect needs:
- Next 16 route groups allow **multiple root layouts**; navigating between different root layouts forces a full page reload; two groups must not resolve to the same URL (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`, "Caveats").
- `scripts/test-monetization.ts:29-34` reads `src/app/layout.tsx` and requires the `ym-metrika` and `ga-gtag` inline scripts, `send_page_view:false`, `defer:true`, and both appearing before `<Script src="https://www.googletagmanager.com`. **Keep a top-level `src/app/layout.tsx` that owns `<html>/<head>` + analytics** and move the old chrome (Header, Footer, FavSync, LaunchOffer) into a nested layout, e.g. `src/app/(old)/old/layout.tsx`. Otherwise update the test in the same PR.
- Old components hard-code locale-prefixed links: ~87 occurrences of `${lp}` / `/${locale}/` / `"/ru/"` in 42 files, plus ~25 plain `href="/…"`/`router.push("/…")` in 17 files (grep counts). Moving old pages to `/old/*` requires a link helper (e.g. `oldHref(lp, path)`) or these links will land on new-site pages.
- `src/components/Header.tsx:85-93` computes the active nav tab from the path; `src/components/LangSwitch.tsx:24-26` swaps the `/ru|/en` prefix — both must learn about `/old`.
- The client pathname seen by `usePathname()` is the browser URL (with `/ru`), e.g. `src/components/Footer.tsx:14` compares `pathname === "/cards"` which never matches a prefixed URL (existing minor bug).
- The top-level catch-all `src/app/[slug]/page.tsx` serves ~270 per-app landing pages at `/<app-slug>` (1,516 entries in `src/data/app-slugs.json`; 404 via `notFound()` otherwise). New top-level routes will shadow/conflict with this; if `[slug]` moves to `/old/[slug]`, redirect `/<locale>/<app-slug>` → `/<locale>/old/<app-slug>` (they are in the sitemap).

---

## 3. Authentication

### 3.1 Session

| Item | Value | Source |
|---|---|---|
| Cookie | `ia_session` = `base64url(JSON{uid,exp}).base64url(HMAC-SHA256)` | `src/lib/session.ts:13,16-20` |
| Flags | `httpOnly`, `SameSite=Lax`, `path=/`, `maxAge=30 days`, `secure` in production | `src/lib/session.ts:38-46` |
| Secret | `SESSION_SECRET`; dev fallback `dev-insecure-secret`; **throws in production if missing** | `src/lib/session.ts:8-12` |
| Read | `getSessionUser()` → verify HMAC with `timingSafeEqual`, check `exp`, `prisma.user.findUnique` (errors → `null`) | `src/lib/session.ts:22-36,65-74` |
| Logout | `clearSession()` deletes the cookie | `src/lib/session.ts:48-50` |
| `SessionUser` type | `id, telegramId, googleId, email, username, firstName, premiumUntil, tokens, lifetime, isAdmin` (note: `vkId`, `passwordHash`, `createdAt` exist on the row but not in the type) | `src/lib/session.ts:52-63` |

There is no server-side session table: logging out on one device does not revoke other devices; rotating `SESSION_SECRET` logs everyone out and also invalidates magic links, MCP client IDs and the bot's internal-grant auth (§3.6).

### 3.2 Login methods

| # | Method | UI status | Endpoints (method → purpose) | Env | Result |
|---|---|---|---|---|---|
| 1 | **Telegram bot handshake** | Live, first button in modal | `POST /api/auth/start` → `{token, url}` where `url = https://telegram.me/<BOT_USERNAME>?start=login_<token>`, token = UUID without dashes, TTL 10 min, row in `LoginToken` (`src/app/api/auth/start/route.ts:10-16`). Bot on `/start login_<token>` stamps `telegramId/username/firstName` (`bot/bot.mjs:193-205`). Client polls `GET /api/auth/poll?token=` → `{pending:true}` \| `{ok:true, premium, user:{username, firstName, isAdmin}}` (sets session) \| 404 `{error:"unknown"}` \| 410 `{error:"expired"}` \| 400 (`src/app/api/auth/poll/route.ts:9-37`) | `BOT_USERNAME` (default `inAppProBot`), `TELEGRAM_BOT_TOKEN` (bot), `ADMIN_TG_IDS` (comma list → `isAdmin` on create) | Upsert by `telegramId`; first user ever or listed TG id → admin |
| 2 | **Google, redirect (Authorization Code)** | Live, shown when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set at build and not in an in-app webview | `GET /api/auth/google/start?return_to=<local path>` → 307 to `accounts.google.com/o/oauth2/v2/auth` (`scope=openid email profile`, `prompt=select_account`), sets `g_oauth_state` + `g_oauth_return` cookies (httpOnly, secure, Lax, 10 min) (`src/app/api/auth/google/start/route.ts:11-33`). `GET /api/auth/google/callback?code&state` → verify state cookie, exchange code at `oauth2.googleapis.com/token` with `redirect_uri=<origin>/api/auth/google/callback`, verify ID token via `tokeninfo` (aud = client id), login, redirect to `return_to` (`src/app/api/auth/google/callback/route.ts:9-57`). Errors → `/?auth=google_error` or `/?auth=google_unconfigured` | `GOOGLE_CLIENT_ID` or `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `APP_ORIGIN` | `loginWithGoogle`: match by `googleId`, then by lower-cased email (merges with email/TG accounts), else create (`src/lib/googleAuth.ts:17-32`) |
| 3 | Google Identity Services (credential) | Endpoint live, **no UI uses it** since the modal switched to redirect (`src/components/AuthModal.tsx:134-141`) | `POST /api/auth/google {credential}` → `{ok:true, premium}` \| 400/401 (`src/app/api/auth/google/route.ts:9-20`) | same | same |
| 4 | **Email magic link** | Live when build var `NEXT_PUBLIC_EMAIL_LOGIN=1` (repo variable `EMAIL_LOGIN_ENABLED`) | `POST /api/auth/email/start {email, return_to, locale:"ru"|"en"}` → `{ok:true}` or `{error}` with 503 `disabled` (no SMTP creds), 400 `bad_email`, 400 `disposable` (36 blocked domains), 429 `rate` (cookie `el_rl`, max 5/day/browser), 502 `send_failed` (`src/app/api/auth/email/start/route.ts:9-41`). Mail contains `<origin>/api/auth/email/verify?token=<signed>&rt=<return_to>`; token = HMAC(`SESSION_SECRET`) `{e, exp:+15min, k:"el"}` (`src/lib/emailAuth.ts:10-30`). `GET /api/auth/email/verify` → login and 307 to `rt` (default `/cards`) or `/?login=expired` (`src/app/api/auth/email/verify/route.ts:8-20`) | `YC_SMTP_HOST` (default `postbox.cloud.yandex.net`), `YC_SMTP_PORT` (587), `YC_SMTP_USER`, `YC_SMTP_PASS`, `MAIL_FROM` (default `inApp <no-reply@inapp.pro>`) (`src/lib/mail.ts:7-13`) | `loginWithEmail`: find by email or create (`src/lib/emailAuth.ts:49-58`). The token is stateless and reusable within 15 min |
| 5 | Email + password | **Dormant** (no UI) | `POST /api/auth/register {email,password,name}` (min 6 chars, 409 if exists) and `POST /api/auth/login {email,password}` (scrypt `scrypt$salt$hash`) → `{ok:true, premium}`; errors are Russian-only strings (`src/app/api/auth/register/route.ts:10-32`, `login/route.ts:8-18`, `src/lib/password.ts`) | — | Session |
| 6 | VK OAuth | **Dormant** (no UI builds the authorize URL) | `GET /api/auth/vk?code` → token exchange, upsert by `vkId`/email, redirect `/` or `/?auth=vk_unconfigured|vk_failed` (`src/app/api/auth/vk/route.ts:11-63`) | `NEXT_PUBLIC_VK_CLIENT_ID`, `VK_CLIENT_SECRET` | Uses `url.origin` for `redirect_uri` (behind nginx this is the internal origin — would fail if revived) |

Account creation rules shared by all methods: the very first user in an empty DB becomes `isAdmin` (`src/lib/emailAuth.ts:51-55`, `src/lib/googleAuth.ts:19,28`, `poll/route.ts:22,30`). No signup bonus is granted (the comment at `src/lib/googleAuth.ts:13-16` says otherwise — stale).

`appOrigin(req)` for redirect URIs = `APP_ORIGIN` → `https://inapp.pro` in production → request origin in dev (`src/lib/googleAuth.ts:7-11`). Payments and MCP use a different helper that honours `SITE_URL` / `x-forwarded-host` (§4.2, `src/lib/mcp/oauth.ts:64-70`).

Redirect targets after login: `return_to`/`rt` must be a local path (`startsWith("/") && !startsWith("//")`). The target is usually unprefixed, so the proxy then adds the locale. Error query params `?auth=google_error|google_unconfigured|vk_unconfigured|vk_failed` and `?login=expired` are **not rendered anywhere** in the current UI (grep finds no consumer) — the new UI should show a toast for them.

### 3.3 The login modal (`src/components/AuthModal.tsx`)

How it's opened: there is **no global event or context**. Each client component keeps `const [auth, setAuth] = useState(false)` and renders `{auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={…} />}` (e.g. `AuthButton.tsx:90`, `BuyButton.tsx:202,234`, `IdeaGrid.tsx:137`, `DossierGate.tsx:48`, `mcp/connect/ConnectClient.tsx:30`). `onSuccess` is usually `location.reload()`. Only the Telegram flow calls `onSuccess`; Google and email leave the page (full redirect) and come back logged in, so any pending action (e.g. the chosen payment method in `BuyButton`) is lost.

`AuthButton` auto-opens the modal on load when `/api/me` says logged-out and `localStorage.inapp_tg_login` holds an unexpired pending Telegram login (`src/components/AuthButton.tsx:36`, `AuthModal.tsx:18,33-46`).

In-app webview detection (Threads/Instagram/FB/Line/Twitter/TikTok/Snapchat/Pinterest/WeChat/GSA/VK/OK UA tokens, Android `wv`, iOS WebKit without Safari) hides Google and shows a notice with «Скопировать ссылку» (`AuthModal.tsx:20-31,366-380`).

States and strings (RU / EN, verbatim):

| State | Strings |
|---|---|
| Start | «Добро пожаловать в inApp» / "Welcome to inApp"; «Войдите, чтобы открыть весь каталог и идеи» / "Sign in to unlock the full catalog and ideas"; buttons «Войти через Telegram» / "Log in with Telegram", «Продолжить с Google» / "Continue with Google"; divider «или по почте» / "or by email"; placeholder «Ваша почта» / "Your email"; submit «Войти по почте» / "Sign in by email" (busy «Отправляем…» / "Sending…") (`:352-438`) |
| Webview notice | «Вы во встроенном браузере (Threads/Instagram и т.п.). Google-вход тут блокируется. Войдите [по почте или ]через Telegram, либо откройте сайт в Safari/Chrome (меню ⋯ вверху → «Открыть в браузере»).» / "You're in an in-app browser (Threads/Instagram, etc.). Google sign-in is blocked here. Use [email or ]Telegram, or open the site in Safari/Chrome (⋯ menu → “Open in browser”)."; «Скопировать ссылку» / "Copy link", «Ссылка скопирована ✓» / "Link copied ✓" (`:366-380`) |
| Telegram instruction | «Вход через Telegram» / "Log in with Telegram"; «Сейчас откроем бота. Нажмите Start в Telegram и вернитесь на эту вкладку.» / "We'll open the bot. Click Start in Telegram, then come back to this tab."; «Начать вход» / "Start login"; «Ссылка действует до {time}» / "Link valid until {time}"; «Отмена» / "Cancel" (`:320-349`) |
| Telegram waiting (polls every 2 s) | «Нажмите Start в Telegram и вернитесь на эту вкладку.» / "Click Start in Telegram, then come back to this tab."; «Жду подтверждения…» / "Waiting for confirmation…"; «Если Telegram не открылся — открыть бота» / "If Telegram didn't open — open the bot" (`:210-243,283-317`) |
| Email sent | «Проверьте почту» / "Check your email"; «Отправили ссылку для входа на {email}. Откройте её на этом устройстве — ссылка действует 15 минут.» / "We sent a sign-in link to {email}. Open it on this device — the link is valid for 15 minutes."; «Не пришло? Загляните в «Спам».» / "Not there? Check your spam folder."; «Использовать другой адрес» / "Use a different address" (`:249-280`) |
| Errors | TG start: «Не удалось начать вход через Telegram» / "Failed to start Telegram login"; TG expiry: «Время истекло. Попробуйте снова.» / "Login expired. Try again."; email: `bad_email` «Проверьте адрес почты.» / "Check the email address."; `disposable` «Временные адреса не поддерживаются. Укажите постоянную почту.» / "Disposable addresses aren't supported. Use a permanent one."; `rate` «Слишком много попыток. Попробуйте позже.» / "Too many attempts. Try again later."; `send_failed` «Не удалось отправить письмо. Попробуйте ещё раз.» / "Couldn't send the email. Try again."; `disabled` «Вход по почте сейчас недоступен.» / "Email sign-in is unavailable right now."; fallback «Что-то пошло не так. Попробуйте ещё раз.» / "Something went wrong. Try again." (`:165-176,186-192`) |

Account menu (`src/components/AuthButton.tsx`): logged-out «Войти» / "Sign in"; avatar = first letter of `firstName || username || «Аккаунт»/"Account"`; status «⭐ Друг» / "⭐ Friend", «⭐ Полный доступ» / "⭐ Full access", else «Открыть доступ» / "Get access"; items «Доступ» / "Access" (sub «Полный доступ» / "Full access" or «Весь сайт навсегда» / "Everything forever") → `/tokens`, «Купленное» / "Library" → `/library`, «Избранное» / "Saved" → `/saved`, «Админка» / "Admin" (admins) → `/admin`, «Выйти» / "Log out" (`:95-225`). `/api/me` is refetched on every pathname change and when the menu opens (`:28-51`).

Magic-link email copy (`src/lib/mail.ts:30-49`): subject «Вход в inApp» / "Sign in to inApp"; button «Войти в inApp» / "Sign in to inApp"; lead «Нажмите кнопку, чтобы войти. Ссылка действует 15 минут.» / "Tap the button to sign in. The link is valid for 15 minutes."

### 3.4 Cookies and browser storage inventory

| Name | Kind | Set by | Purpose |
|---|---|---|---|
| `ia_session` | httpOnly cookie, 30 d | `src/lib/session.ts:39` | Session |
| `locale` | cookie, 1 y | proxy (`src/proxy.ts:32`), `LangSwitch.tsx:21`, `LangMenu.tsx:59` | `ru`/`en` |
| `theme` | cookie, 1 y | `ThemeSwitch.tsx:52`, `LangMenu.tsx:36` | `light`/`dark` |
| `g_oauth_state`, `g_oauth_return` | httpOnly, secure, 10 min | `google/start/route.ts:31-32` | OAuth CSRF + return path |
| `el_rl` | httpOnly, 1 d | `email/start/route.ts:39` | magic-link rate limit (5) |
| `fc` | httpOnly, 30 d | `api/draw/route.ts:28` | anon free card reveals (2) |
| `as_buyer` | cookie, 30 d | `api/dev/buyer-preview/route.ts:32` | owner-only "see gates as a buyer" (removes unlimited) |
| `inapp_tg_login` | localStorage | `AuthModal.tsx:18,199` | pending Telegram login `{token,url,expiresAt,waiting}` |
| `favIdeas`, `favMigrated` | localStorage | `TestCards.tsx:23-81` | idea bookmarks mirror + one-time merge flag |
| `feed:saved` | localStorage | `BuildWizard.tsx:95-104`, `SavedIdeas.tsx:20-31` | legacy saved list, merged once |
| `inapp_purchase:<txnId>` | localStorage | `PurchaseTracker.tsx:37-39` | purchase event de-dupe |
| `inapp_paywall_view:<path>:<source>` | sessionStorage | `src/lib/track.ts:69-75` | paywall_view de-dupe |

### 3.5 Server-side env vars (complete list found in `src/` and `bot/`)

| Var | Used by | Required? |
|---|---|---|
| `DATABASE_URL` | Prisma (`prisma/schema.prisma:5-8`); CI build uses `file:./ci.db` | yes |
| `SESSION_SECRET` | session, magic links (`emailAuth.ts:7`), MCP client-id signing (`mcp/oauth.ts:9-14`), internal grant (`api/internal/grant/route.ts:12`), bot | yes (session throws in prod without it; the other three silently fall back to `dev-insecure-secret`) |
| `BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, `ADMIN_TG_IDS` | Telegram login/bot | yes for TG |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login; `NEXT_PUBLIC_*` is inlined at build from repo variable `GOOGLE_CLIENT_ID` (`deploy.yml:56-59`); secret synced to box `.env` on each deploy (`deploy.yml:92-103`) | for Google |
| `NEXT_PUBLIC_EMAIL_LOGIN` | shows email form (build-time, repo var `EMAIL_LOGIN_ENABLED`) (`deploy.yml:60-63`) | for email |
| `YC_SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | Yandex Cloud Postbox SMTP (`src/lib/mail.ts:7-13`); USER/PASS synced by deploy | for email |
| `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | payments (`src/lib/yookassa.ts:6-12`) — box `.env` only | for payments |
| `SITE_URL` | payment return URL origin, MCP origin, bot → site calls | recommended `https://inapp.pro` |
| `APP_ORIGIN` | OAuth/magic-link origin override | optional |
| `MCP_ALLOWED_ORIGINS` | extra CORS origins for `/api/mcp` | optional |
| `NEXT_PUBLIC_VK_CLIENT_ID`, `VK_CLIENT_SECRET` | dormant VK login | no |
| `YAGPT_API_KEY/FOLDER_ID/MODEL` | `src/lib/*` LLM helper (not part of the UI) | no |
| `PREMIUM_STARS`, `PREMIUM_DAYS` | present in local `.env`, unused in current `src/` | no |

### 3.6 Minimal client API contract for the new UI

```ts
// GET /api/me   (no auth required; never 401)            src/app/api/me/route.ts:7-19
type Me =
  | { user: null; premium: false; friend: false; unlimited: false }          // logged out (no `lifetime` key)
  | { user: { username: string | null; firstName: string | null; isAdmin: boolean; premiumUntil: string | null };
      premium: boolean;   // === unlimited (legacy name)
      friend: boolean;    // listed in src/data/friends.json
      unlimited: boolean; // admin || lifetime || friend || premiumUntil > now  → "Plus"
      lifetime: boolean };

// Telegram
POST /api/auth/start            → { token: string; url: string }            // open url in new tab/app
GET  /api/auth/poll?token=…     → { pending: true } | { ok: true; premium: boolean; user: {...} }
                                   | 404 { error: "unknown" } | 410 { error: "expired" }   // poll every 2 s, stop at 10 min
// Google (full-page navigation, returns to return_to)
GET  /api/auth/google/start?return_to=/ru/…     // errors land on /?auth=google_error|google_unconfigured
// Email magic link
POST /api/auth/email/start { email: string; return_to: string; locale: "ru" | "en" }
     → { ok: true } | { error: "bad_email" | "disposable" | "rate" | "send_failed" | "disabled" }
     // link → /api/auth/email/verify?token&rt → 307 to rt, or /?login=expired
// Logout
POST /api/auth/logout → { ok: true }            // then reload / router.refresh()
```

Server components should call `getAccess()` (`src/lib/access.ts:18`) or `getSessionUser()` directly instead of fetching `/api/me`.

Recommended **additive** extensions (backward compatible with the old UI, which reads only the fields above):
- `/api/me`: add `id`, `email`, `plus` (alias of `unlimited`), `plusSource: "admin" | "lifetime" | "friend" | "premium" | null`, `plusUntil` (= `premiumUntil` when that is the source), and `lifetime: false` for logged-out responses.
- Return `locale` support for `de|fr|ja` in `/api/auth/email/start` and `sendMagicLink` (today anything but `en` becomes `ru`, `email/start/route.ts:20`, `mail.ts:51-52`).
- A shared client helper `openAuth({ reason, onSuccess })` (context or `window` event) so any component can open one modal instance — today every component mounts its own.

---

## 4. Payments (YooKassa)

### 4.1 Products and prices

| SKU | Status | Price | Grant | Source |
|---|---|---|---|---|
| **Lifetime («Весь inApp навсегда»)** | **The only SKU sold on the web** | `ACCESS_PRICE_RUB = LAUNCH_PROMO ? FRIEND_PRICE_RUB (990) : LIFETIME.rub (2990)`; `LAUNCH_PROMO = true` → **990 ₽**; `FRIEND_DISCOUNT_PCT = 70` (not shown in UI anymore) | `User.lifetime = true` | `src/lib/tokenConfig.ts:10,16-21` |
| Lifetime via Telegram Stars | Sold in the bot | **500 ⭐** (`bot/bot.mjs:19-21`); `tokenConfig.LIFETIME.stars = 1500` is stale | `User.lifetime = true` written by the bot directly | `bot/bot.mjs:94-117` |
| Deck 290 ₽ / 150 ⭐, Category 290 ₽ / 150 ⭐ | Historical, only fulfilled for in-flight checkouts | — | `Unlock` rows | `tokenConfig.ts:23-31`, `src/lib/unlocks.ts:35-50` |
| Token packs s/m/l (100/300/700 tokens for 990/2490/4990 ₽) | Legacy, webhook only | — | `User.tokens += n` | `tokenConfig.ts:41-51`, webhook `:60-71` |
| iOS app (for comparison, not web) | App Store | Annual `com.artsaverin.inapp.annual` $39.99 base; Lifetime `com.artsaverin.inapp.lifetime` $79.99 base | StoreKit only | `app:Inapp/Store/Purchases.swift:11-15`, `app:AppStore/Release-2026-09-21/README.md:13-15` |

The CI test pins the web price: `assert.equal(ACCESS_PRICE_RUB, 990)` (`scripts/test-monetization.ts:7`) and the deploy smoke test expects `990` in `/ru/tokens` (`deploy.yml:130-132`).

### 4.2 End-to-end flow

1. **Offer UI** (`src/components/BuyButton.tsx`): on mount `trackPaywallView(source, 990)` (`:64-66`). Trigger button opens a modal (or `inline` card) with two buttons: bank card and СБП (`:162-179`). `source` defaults to the pathname; known values: `header` (`LaunchOffer.tsx:15`), `pricing_page` (`tokens/page.tsx:50`), `mcp_page` (`mcp/page.tsx:247`).
2. **Not signed in** → `trackLoginRequired`, remember method, open `AuthModal`; on Telegram success continue checkout automatically (`BuyButton.tsx:115-132`).
3. **Create checkout** `POST /api/pay/yookassa {kind:"lifetime", method:"bank_card"|"sbp", source}` (`BuyButton.tsx:89-113`). Server (`src/app/api/pay/yookassa/route.ts`):
   - 503 «Оплата картой ещё не подключена» if YooKassa env missing (`:17-19`); 401 «Нужно войти» (`:20-21`); 409 «Полный доступ уже открыт» if `lifetime || isAdmin` (`:22`) — note: friends / `premiumUntil` users are *not* blocked; 400 «Неизвестный товар» unless `kind ∈ {lifetime, friend}` (`:25-27`); 400 «Выберите способ оплаты» (`:28-29`).
   - `checkoutId = crypto.randomUUID()`; insert `PaymentAttempt {id: checkoutId, userId, sku:"lifetime", method, source (sanitised `[a-zA-Z0-9_./:-]{≤160}`), amountRub: 990, status:"created"}` (`:10-14,31-42`).
   - `origin = SITE_URL || x-forwarded-proto://x-forwarded-host || req origin` (`:44-46`).
   - `createPayment({amountRub: 990, description: "inApp — полный доступ навсегда", metadata: {userId, kind:"lifetime", checkoutId, source?}, returnUrl: <origin>/library?checkout=<checkoutId>, idempotenceKey: checkoutId, method})` (`:49-61`) → `POST https://api.yookassa.ru/v3/payments` with Basic auth, `capture: true`, `confirmation: {type:"redirect", return_url}`, `payment_method_data: {type: method}` (`src/lib/yookassa.ts:18-46`). **No `receipt` object is sent.**
   - Missing `confirmation_url` → attempt `failed/missing_confirmation`, 502 «ЮKassa не вернула ссылку» (`:62-66`). Success → `updateMany where status="created"` set `providerPaymentId` + provider status (usually `pending`) (`:67-72`) → `{url, checkout}` (`:73`). Exception → attempt `failed` with message, 502 «Не удалось создать платёж» (`:74-80`).
4. Client `trackPaymentRedirect` then `window.location.assign(url)` (YooKassa hosted page).
5. **Webhook** `POST /api/pay/yookassa/webhook` (`src/app/api/pay/yookassa/webhook/route.ts`): body is never trusted — only `object.id` is read, then `GET /v3/payments/<id>` (`:16-25`; 502 on fetch failure so YooKassa retries). Metadata `userId`, `checkoutId`; `ref = "yk:<id>"`; `amountRub = round(amount.value)` (`:27-32`). Attempt status → `confirming` if provider says succeeded, else provider status (`:34-41`). Unless `status === "succeeded" && paid === true` → 200 (`:42`). Then `grantUnlock(userId, kind, slug, ref, amountRub)` and attempt → `succeeded`, `confirmedAt` (`:49-58`). Any exception → 500 (YooKassa retries) (`:72-74`).
6. **Idempotency**: `grantUnlock` returns early if any `TokenLedger` row already has `ref` (`src/lib/unlocks.ts:24-26`). Lifetime writes `User.lifetime = true` + ledger `{delta:0, reason:"lifetime", ref, amountRub}` (`:29-33`).
7. **Return**: YooKassa sends the browser to `/library?checkout=<uuid>` → proxy → `/<locale>/library?checkout=…`. `src/app/library/page.tsx:16-18` mounts `PurchaseTracker`, which polls `GET /api/pay/status?checkout=<uuid>` once per second up to 30 times (`src/components/PurchaseTracker.tsx:30-57`). Status API: 401 no session, 400 not a UUID, 404 not the owner, else `{status, amountRub?, transactionId?, source}` (amount/txn only when `succeeded`) (`src/app/api/pay/status/route.ts:7-21`). On `succeeded` → `trackPurchase(txn, {id:"lifetime", name:"inApp — полный доступ навсегда", price: amountRub}, source)` once per txn, `router.replace(pathname)` + `router.refresh()`; on `canceled|failed` → failure banner; after 30 tries → "delayed".
   Banner copy: «Проверяем оплату…» / "Confirming payment…"; «Оплата подтверждена. Полный доступ открыт.» / "Payment confirmed. Full access is open."; «Оплата не завершена. Деньги не списаны.» / "Payment wasn't completed. You weren't charged."; «Подтверждение задерживается. Доступ включится автоматически; можно обновить страницу через минуту.» / "Confirmation is taking longer than usual. Access will activate automatically; refresh in a minute." (`PurchaseTracker.tsx:69-74`).

### 4.3 `PaymentAttempt` state machine (`prisma/schema.prisma:317-335`)

```
created ──(create OK)──▶ pending | waiting_for_capture (provider status)
   │                        │
   └─(create error)─▶ failed│
                            ├─(webhook, provider succeeded)──▶ confirming ──(grant OK)──▶ succeeded
                            └─(webhook, provider canceled)───▶ canceled
```
Columns: `id` (UUID = checkoutId, also in YooKassa metadata), `userId`, `providerPaymentId @unique`, `sku` (default `"lifetime"`), `method` (`bank_card|sbp`), `source`, `amountRub`, `status`, `error`, `createdAt`, `updatedAt`, `confirmedAt`. The admin page reads these for the funnel (`src/app/admin/page.tsx:93-98`).

### 4.4 What the webhook grants, by metadata

| `metadata.kind` | Grant | Ledger `reason` |
|---|---|---|
| `lifetime` | `User.lifetime = true` | `lifetime` |
| `deck` (historical) | `Unlock{type:"deck",slug:"all"}` + one `Unlock{type:"idea"}` per deck idea | `buy_deck` |
| `category` + `slug` (historical) | `Unlock{type:"category"}` + ideas + apps of that category | `buy_category` |
| none, `tokens=N` (legacy) | `User.tokens += N` via `grantTokens` | `purchase` |
| none, `lifetime="1"` (legacy) | `User.lifetime = true` | `lifetime` |

`premiumUntil` is **never** set by any payment; it is legacy comp access only.

### 4.5 YooKassa / legal configuration the new site must keep

- Webhook URL configured in the YooKassa dashboard (not in repo; inferred from the route): `https://inapp.pro/api/pay/yookassa/webhook`, event `payment.succeeded` (+ `payment.canceled` is useful for the status UI).
- Required public pages (comments: `src/app/offer/page.tsx:8-9`, `src/app/contacts/page.tsx:7-8`, `src/components/Footer.tsx:7-8`): **public offer** `/offer`, **contacts/requisites** `/contacts`, **pricing** `/tokens`, linked from the footer of every page. Requisites come from `src/data/legal.json` (`brand, site, fullName, selfEmployed, inn, email, phone, updated`) via `src/lib/legal.ts`.
- Offer content (`src/app/offer/page.tsx:16-67`, Russian only, «Редакция от {updated}»): 1 «Общие положения» (seller = self-employed, НПД, ИНН), 2 «Предмет оферты» («Премиум-доступ», digital service), 3 «Стоимость и порядок оплаты» (links «Доступ» `/tokens`, «{990} ₽ за бессрочный доступ ко всем материалам сервиса», card or СБП via ЮKassa (ООО НКО «ЮМани») or Telegram Stars), 4 «Порядок предоставления доступа» (automatic, perpetual), 5 «Возврат средств» (refund only if access wasn't provided; email; 10 working days), 6 «Реквизиты и контакты Исполнителя» (link «Контакты»).
- Contacts content (`src/app/contacts/page.tsx:13-38`): H1 «Контакты и реквизиты»; rows «Исполнитель» (ФИО + «(самозанятый, НПД)»), «ИНН», «E-mail», optional «Телефон», «Сайт»; «Обновлено: {updated}. Публичная оферта — на странице /offer.» **Russian only even at `/en/contacts`**, which is the App Store support URL (§9).
- Receipts: the code sends no 54-ФЗ `receipt` object to YooKassa and generates no receipts; for a self-employed seller the receipt must come from «Мой налог» (manually or via YooKassa's self-employed integration configured outside the code) — see open questions.
- Offer mentions only a perpetual one-time payment. An annual/recurring web Plus would require updating the offer (auto-renewal terms) before selling.

### 4.6 Reusing the flow for a new "Plus" purchase button

Minimal reuse (no server changes): a new `PlusBuyButton` client component that
1. reads `Me` (or server-provided `loggedIn`/`plus`); if `plus` → shows «Полный доступ активен» / "Full access is active" (app string, `ui.en.json`) instead of buying;
2. on click fires `trackOfferOpen(source, loggedIn, 990)` / `trackBeginCheckout(item, source)`;
3. if logged out → `trackLoginRequired(source)` and open the auth modal; after Telegram success continue; after Google/email redirect, persist the intended method in `sessionStorage` (new) and resume on return;
4. `POST /api/pay/yookassa {kind:"lifetime", method, source:"v2_<surface>"}` → handle 401 (open auth), 409 (refresh `Me`), 503/502 (show `data.error`) → `trackAddPaymentInfo` + `trackPaymentRedirect` → `location.assign(url)`;
5. keep a page at **`/library`** (any locale) that mounts `PurchaseTracker` (or an equivalent that keeps the `data.status === "succeeded"`-before-`trackPurchase(` ordering asserted by `scripts/test-monetization.ts:20-24`), or change `returnUrl` in the pay route (the monetization test still requires `paymentAttempt.create`, `checkoutId`, `ACCESS_PRICE_RUB` in that file).

If the web should also sell **annual Plus** (the app's default plan), the smallest server change is: new `kind: "plus_annual"` accepted by the pay route with its own price constant in `tokenConfig.ts`; `PaymentAttempt.sku = "plus_annual"`; webhook branch `premiumUntil = max(now, premiumUntil) + 365 days` with the same `ref` idempotency (add `REASON.plus_annual` to `src/lib/unlocks.ts`). `getAccess`, `/api/me`, MCP access and the admin "Безлимит" column already treat a future `premiumUntil` as unlimited. This is a one-time 1-year purchase, not auto-renewal (YooKassa recurring payments would need saved payment methods + a scheduler; nothing like that exists).

Telegram Stars alternative: deep link `https://telegram.me/<BOT_USERNAME>?start=life_<userId>` makes the bot send a 500 ⭐ invoice and grant lifetime to that user id (`bot/bot.mjs:207-212`; links built in e.g. `src/app/cards/page.tsx:84`).

---

## 5. Access model

### 5.1 Resolution ladder

`getAccess()` (`src/lib/access.ts:18-47`):
1. no session → `{user:null, loggedIn:false, unlimited:false, balance:0, has:()=>false}`;
2. `unlimited = !as_buyer && (isAdmin || lifetime || isFriendIdentity(user) || premiumUntil > now)`; unlimited → `has()` always true;
3. otherwise load all `Unlock` rows into sets by type `app|idea|chapter|category|ideas|apps` (+ `deck` rows read by `ownsDeck`) and answer `has(type, slug)`.

`isFriendIdentity` matches `telegramId`, `username` or `email` (case-insensitive) against `src/data/friends.json` (27 lines; deploy to change) (`src/lib/friends.ts:8-20`). The same ladder is duplicated in `/api/me` (`:11`), `/api/draw` (`:32-33`), MCP `accessForUser` (`src/lib/mcp/access.ts:18-31`) and the admin page (`src/app/admin/page.tsx:34`). `src/lib/premium.ts:16-24` `isPremium()` is an older variant that **omits `lifetime`** and is still used by the home page (`src/app/page.tsx:3,49`).

Per-surface rules on the current site (all `unlimited` bypass):
| Surface | Free rule | Paid rule | Source |
|---|---|---|---|
| Review archive `/reviews/<cat>/<id>` + `GET /api/reviews/<cat>/<id>` | category `dating-apps` | `has(category|chapter, cat)` | `src/lib/reviewAccess.ts:6-19`, `api/reviews/[slug]/[id]/route.ts:16-22` (401 logged-out / 403 logged-in, `{locked:true}`) |
| Idea body `GET /api/idea-depth/<slug>` and design brief `GET /api/design-prompt/<slug>` | none | `has(idea)` ∨ `has(category|chapter, idea.category)` ∨ owns deck | `api/idea-depth/[slug]/route.ts:18-25`, `api/design-prompt/[slug]/route.ts:18-25` |
| Builder `/build` | `flashcards-6` anonymous, `baby-tracking-2` after free sign-in | category/chapter/idea unlock | `src/lib/buildAccess.ts:9-27` |
| Card deck `/cards` via `POST /api/draw` | 2 reveals anon (cookie `fc`), +2 after sign-in | deck owner | `src/lib/tokenConfig.ts:34-35`, `api/draw/route.ts` |
| MCP tools | `list_niches`, `research_niche` sample `dating-apps`, `account_status` | full for unlimited | `scripts/test-mcp.ts:29-47` |
| Legacy "free categories" | `meditation-mindfulness, sleep-audio, sleep-tracking, stretching-mobility-yoga` | — | `src/lib/premium.ts:9-14` |

### 5.2 Mapping to the app's "Plus"

The app (`app:Inapp/Clarity/ClarityContentAccess.swift:5-19`): free = category `interior-design` + ideas `interior-design-1…5`; everything else needs Plus (`purchases.isUnlocked` = current annual or lifetime StoreKit entitlement, `app:Inapp/Store/PurchaseAccess.swift:23-58`). Reading saved items/notes is free; Clarity export is allowed exactly when the idea is readable (`app:Inapp/Clarity/ClarityReader.swift:962`).

Proposed web mapping:
- `isPlus(access) := access.unlimited` (admin, lifetime purchase via YooKassa or Stars, friend, `premiumUntil > now`). Put it in one helper (e.g. `src/lib/plus.ts`) and use it in all new-site gates; do not reuse `isPremium()`.
- Historical partial buyers (`Unlock` rows for a category/deck/idea) are **not** Plus. Decide whether the new UI honours their per-category/per-idea unlocks (the old site does) — open question.
- Free sample differs between web (`dating-apps` archive; `flashcards-6`/`baby-tracking-2` builder) and app (`interior-design` + 5 ideas). Parity implies adopting the app's rule for new-site surfaces while the old site keeps its own.
- App Store purchases cannot unlock the web (no account link; "Совместимость с аккаунтами и покупками сайта не входит в продукт по решению владельца", `app:README.md:106`). Web copy must not promise "restore purchases" from the App Store.

---

## 6. Saved items, notes, compare — persistence

### 6.1 Existing `Favorite` model and `/api/favorites`

Model (`prisma/schema.prisma:153-162`): `Favorite {id, userId → User (cascade), slug /* idea slug */, createdAt; @@unique([userId, slug]); @@index([userId])}`.

API (`src/app/api/favorites/route.ts`):
| Call | Logged in | Guest |
|---|---|---|
| `GET /api/favorites` | `{slugs: string[]}` (DB order, no sort) | `{slugs: []}` |
| `POST {slugs: string[]}` (≤2000) | upsert each, return full union `{slugs}` | `{slugs: []}` |
| `POST {slug, on: boolean}` | `on === false` → delete, else upsert → `{ok:true}`; 400 if no slug | `{slugs: []}` (no-op) |

Client algorithm (`src/components/TestCards.tsx:23-81`, `FavSync.tsx:8-13`, mounted in the root layout when logged in):
- `localStorage.favIdeas` (JSON array) is the instant UI state for everyone; toggles write it and fire-and-forget `POST {slug,on}` (`keepalive`).
- On load for a logged-in user: if `favMigrated !== "1"` and local list non-empty → `POST {slugs: local}` (merge once), else `GET` → replace local with server list, set `favMigrated = "1"`. After the first merge, the server is the source of truth.

Reusability for «Сохранённое»: **idea bookmarks only**. Slugs share the namespace with the app: all 293 app idea IDs (`app:Inapp/Resources/idea-cards.ru.json`) exist in the site's 851-idea `src/data/ideas.json` (same slugs, different editorial titles). Existing favorites may reference ideas outside the app's 293 → the new UI must render or hide unknown slugs gracefully. No `createdAt` ordering is returned; the app shows newest first (`app:Inapp/Store/Shelf.swift:46-54`).

### 6.2 What the app persists locally (the parity target)

| Store (UserDefaults key) | Shape | Rules | Source |
|---|---|---|---|
| `Shelf` (`shelf.saved`, `shelf.exported`) | ordered idea slugs (newest first); exported slugs | save is free, unlimited | `app:Inapp/Store/Shelf.swift:21-54` |
| `StudioNotebook` (`inapp.studio.notebook.v1`) | `saved: [{kind: research|problem, slug}]` (ideas are **not** stored here), `notes: {"<kind>:<slug>": text}`, `decisions: {ideaId: skipped|saved}` | kinds `idea|problem|research`; empty text deletes the note; removing a bookmark never removes its note | `app:Inapp/Studio/StudioNotebook.swift:5-47,49-128` |
| `ClarityAppShelf` (`inapp.clarity.saved-apps.v1`) | `[{category, appID, savedAt}]`, id `category:appID` | newest first | `app:Inapp/Clarity/ClarityAppShelf.swift:4-54` |
| `DeckShelf` (`inapp.decks.reader.v1`) | saved card page ids + `positions {edition: page}` | — | `app:Inapp/Decks/DeckContent.swift:308-348` |
| `StudioWorkspace` (`inapp.studio.workspace.v1`) | `projects: [StudioProject]`, `comparison: [ideaId]` (max 3) | project id = idea slug; stage `exploring|validating|building|parked` («Изучаю»/«Проверяю»/«Делаю»/«Отложил»); fields `note, nextAction?, selectedFeatures (≤3 at start), buyerEvidence, differenceEvidence, feasibilityEvidence, draft, updatedAt` | `app:Inapp/Studio/StudioDomain.swift:84-108,150-201` |
| `StudioPreferences` (`studio.preferences.v1`) | `{completed, goal: discover|research, categories ≤3}` | onboarding | `app:Inapp/Studio/StudioPreferences.swift:4-40` |
| UI prefs | `studio.appearance` (default `light`), `studio.motion` | — | `app:Inapp/Clarity/ClaritySettings.swift:16`, `ClarityStyle.swift:33` |

«Сохранённое» (`app:Inapp/Clarity/ClarityMy.swift`) shows filters «Всё/Разборы/Идеи/Заметки» ("All/…/Ideas/Notes") (`:6`), sections Разборы, Идеи, Заметки, Проблемы, Приложения, Карточки, Проекты, «Сравнение идей» (`:56-59,173-218`), and the footer «Сохранено на этом iPhone» / "Saved on this iPhone" (`:70`).

### 6.3 Proposed additive Prisma schema

All models are new tables (safe under `db push --accept-data-loss`); `Favorite` stays untouched and remains the store for **idea** bookmarks so the old UI and `FavSync` keep working. Add the back-relations to `User`.

```prisma
// Bookmarks other than ideas (ideas stay in Favorite).
model SavedItem {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  kind      String   // "research" | "problem" | "app" | "card"
  ref       String   // niche slug | problem id | "<category>:<appStoreId>" | card page id
  createdAt DateTime @default(now())
  @@unique([userId, kind, ref])
  @@index([userId, createdAt])
}

// Personal notes; survive bookmark removal (app rule).
model Note {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  kind      String   // "idea" | "research" | "problem"
  ref       String   // slug / id
  text      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, kind, ref])
  @@index([userId, updatedAt])
}

// "Проекты" (StudioProject). One per idea.
model Project {
  id                  String   @id @default(cuid())
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId              String
  ideaSlug            String
  stage               String   @default("exploring") // exploring|validating|building|parked
  note                String   @default("")
  nextAction          String?
  selectedFeatures    String   @default("[]")        // JSON string[]; SQLite has no arrays
  buyerEvidence       String   @default("")
  differenceEvidence  String   @default("")
  feasibilityEvidence String   @default("")
  draft               String   @default("")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  @@unique([userId, ideaSlug])
  @@index([userId, updatedAt])
}

// "Сравнение идей": max 3 per user (enforce in the API).
model CompareItem {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  ideaSlug  String
  position  Int
  createdAt DateTime @default(now())
  @@unique([userId, ideaSlug])
  @@index([userId, position])
}

// Onboarding + reader state (optional, one row per user).
model UserPrefs {
  userId     String   @id
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal       String?  // discover|research
  categories String   @default("[]") // JSON, ≤3
  decisions  String   @default("{}") // JSON {ideaSlug: "skipped"|"saved"}
  positions  String   @default("{}") // JSON {edition: page} for cards
  updatedAt  DateTime @updatedAt
}
```

Suggested endpoints (same auth pattern as `/api/favorites`: `getSessionUser()`, guests get empty/no-op, never 500 on bad input):
- `GET /api/saved` → `{ideas: string[] /* from Favorite, newest first */, items: {kind, ref, createdAt}[]}`; `POST /api/saved {kind, ref, on}`; `POST /api/saved/merge {ideas, items}` (one-time guest → account merge, like `favMigrated`).
- `GET/PUT/DELETE /api/notes` keyed by `{kind, ref}` (empty text = delete; cap length, e.g. 20k chars).
- `GET/POST/PATCH/DELETE /api/projects`, `GET/POST /api/compare` (409 when a 4th item is added — the app refuses silently, `StudioDomain.swift:190-199`).
- Guests: mirror the app ("stored on this device") in `localStorage` with the same shapes; merge on sign-in.

SQLite/Prisma notes: `createMany` has no `skipDuplicates` on SQLite — the codebase upserts in a loop (`src/app/api/favorites/route.ts:26-33`, `src/lib/unlocks.ts:46-50`). Keep writes small; the DB is shared with the ingest timer and the bot.

---

## 7. Analytics to keep

| System | ID / config | Where | Notes |
|---|---|---|---|
| Yandex Metrika | counter **110047715**, init `{ssr:true, defer:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true}` | `src/app/layout.tsx:69-75,143,145-150`; `src/lib/track.ts:7` | `defer:true` → no automatic hit; `PageTracker` sends `ym(…,'hit', path, {title, referer})` |
| Google Analytics 4 | **G-G3J6K8VBD6**, `send_page_view:false` | `layout.tsx:76-82,144` | page_view sent manually |
| DataFast | `data-website-id="dfid_PVKv8dyF6ckAxf79RiAsf"`, `data-domain="inapp.pro"`, `https://datafa.st/js/script.js` | `layout.tsx:135-141` | automatic |
| Server page log | `POST /api/track {path, title}` → `PageView` row, logged-in only, skips `/admin*` and `/api*` (the browser path includes `/ru`, so `/ru/admin` is still logged) | `src/app/api/track/route.ts:10-28`, `src/components/PageTracker.tsx:10-29` | powers the admin activity history (`api/admin/ledger/route.ts:16-23`) |

Event vocabulary (`src/lib/track.ts`; each event goes to both `gtag("event", …)` and `ym(…,"reachGoal", …)`, retried 3× while libraries load):
| Event | Params | Fired from |
|---|---|---|
| `page_view` (GA) / `hit` (YM) | `page_path, page_location, page_title` | `PageTracker` on each pathname change (+250 ms) |
| `paywall_view` | `source, currency:"RUB", value` (once per path+source per tab session) | `BuyButton` mount |
| `offer_open` | `source, logged_in, currency, value` | `BuyButton.openOffer` |
| `login_required` | `source` | pay without session |
| `begin_checkout` | GA4 ecommerce `{currency, value, source, items:[{item_id:"lifetime", item_name:"inApp — полный доступ навсегда", price, quantity:1}]}` | offer open (logged in) / after login |
| `add_payment_info` | ecommerce + `payment_type` | method chosen |
| `payment_redirect` | `source, payment_type, currency, value` | before redirect to YooKassa |
| `payment_error` | `source, payment_type, reason` (≤100 chars: `missing_url`, `http_<status>`, `network`) | create failure |
| `purchase` | ecommerce + `transaction_id` (YooKassa payment id) | `PurchaseTracker`, only after server status `succeeded` |
| `review_category_open` / `locked_category_open` | `category` | review archive |

Contract rules enforced by `scripts/test-monetization.ts:26-34`: never push a second legacy YM ecommerce object (`dataLayer().push` forbidden in `track.ts`); keep `send_page_view:false` and YM `defer:true`; shims before remote loaders. New-site events should reuse `track.ts` and add new names (e.g. `save_toggle`, `note_saved`, `compare_add`, `export`) rather than a second library.

---

## 8. SEO and special routes — what they emit today

| Route | Type | Output | Source |
|---|---|---|---|
| `/robots.txt` | `robots.ts` | `User-agent: *` Allow `/` + explicit Allow for 22 search/AI bots (Googlebot, Google-Extended, Bingbot, YandexBot, DuckDuckBot, Applebot(+Extended), GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-CloudVertexBot, Amazonbot, Bytespider, CCBot, cohere-ai, Meta-ExternalAgent, FacebookBot); `Sitemap: https://inapp.pro/sitemap.xml`; `Host: https://inapp.pro`. No Disallow (not even `/api`, `/admin`) | `src/app/robots.ts:7-37` |
| `/sitemap.xml` | `sitemap.ts` | **1,390 URLs**, all `https://inapp.pro/ru…` with `hreflang` alternates `ru`, `en`, `x-default`→`en`; `lastModified = now`, `weekly`. Breakdown: `/reviews/*` 967 (29 niches + 937 apps from `src/data/reviewsIndex.json`), `/rating/*` 73, `/segment/*` 72 (`active-categories.json`), `/ideas`+`/ideas/top`, single-segment 276 (home, `/mcp`, `/reviews`, `/build`, `/rating`, `/most-wanted`, `/cards`, `/apps` + ~268 per-app `/<app-slug>` pages) | `src/app/sitemap.ts:13-61` (counted by executing it) |
| `/llms.txt` | route, force-static | Markdown: title, intro, `## Niches` (one link per active niche → `https://inapp.pro/en/segment/<slug>` + governing thesis), links to `/llms-full.txt` and `/llms-full.ru.txt`, `## About` | `src/app/llms.txt/route.ts`, `src/lib/llms.ts:29-50` |
| `/llms-full.txt`, `/llms-full.ru.txt` | route, force-static | Per niche: page link `/<locale>/segment/<slug>`, scope numbers, thesis, key findings (only pillar 1 dek), competitive read, top 12 observations, opportunity titles only, apps with description / Loved / Pain | `src/lib/llms.ts:53-124` |
| `/feed.xml` | route, force-static | RSS 2.0, English, one `<item>` per active niche: title "<Niche> — what to build, from real reviews", link/guid `https://inapp.pro/en/segment/<slug>`, description = thesis/lead | `src/app/feed.xml/route.ts:18-46` |
| `/opengraph-image` | file convention, static | 1200×630 PNG, dark, Latin-only: "inApp", "Thousands of app reviews into clear conclusions", "…across 65+ niches.", chips "No sign-up / No paywall / Just read" | `src/app/opengraph-image.tsx:7-55` |
| `/api/og` | route (ImageResponse) | `?l=ru|en` brand card; `&slug=<niche>` niche rating card; `?logo=1` 512×512 logo (Organization.logo). `cache-control: public, max-age=86400, immutable`. Pages use `ogImage(ru, slug?)` = `https://inapp.pro/api/og?l=…[&slug=…]&v=<niche count>` | `src/app/api/og/route.tsx:9-11,58`, `src/lib/og.ts:7-12` |
| `/api/post-image` | route | 1080×1080 social carousel slides, **unlimited users only** (403 otherwise) | `src/app/api/post-image/route.tsx:112-117` |
| `/icon` | file convention | 64×64 PNG gradient square + white star | `src/app/icon.tsx` |
| `/apple-icon` | file convention | 180×180 PNG | `src/app/apple-icon.tsx` |
| JSON-LD | root layout | `Organization` (`@id https://inapp.pro/#org`, logo `/api/og?logo=1`, `sameAs` Telegram bot) + `WebSite` with `SearchAction` → `https://inapp.pro/<locale>/search?q={search_term_string}` | `src/app/layout.tsx:87-123` |
| Page metadata pattern | `generateMetadata` | canonical `https://inapp.pro/<ru|en>/…`, `languages {ru, en, x-default: en}`, OG + Twitter `summary_large_image` with `ogImage()`, robots index/follow, `max-image-preview: large` | e.g. `src/app/page.tsx:18-40`; `/saved` is `noindex` (`src/app/saved/page.tsx:15-18`) |
| IndexNow | `GET /api/indexnow` (unauthenticated) | POSTs to `api.indexnow.org` for both locales: `/`, `/build`, `/rating`, `/ideas/top`, `/most-wanted`, `/cards`, `/catalog`, `/apps`, all `/segment/*`, `/rating/*`, `/<app-slug>`; key `b2e3a9978253227e1863da7863ffe80c`, key file `public/b2e3a9978253227e1863da7863ffe80c.txt`; called by CI 60 s after deploy | `src/app/api/indexnow/route.ts:12-41`, `deploy.yml:109-112` |
| Verification files | `public/` | `BingSiteAuth.xml`, `googlefa96452ebeceb3ca.html`, `yandex_2271f30e41706179.html`, IndexNow key | `public/` |

When pages move under `/old`, all of the above that hard-code `/<locale>/segment|rating|reviews|<app-slug>` (sitemap, llms, feed, IndexNow, JSON-LD SearchAction → `/search`) must be updated in the same change, or 308 redirects must exist for every old URL.

---

## 9. URLs that must keep working at the same path

### 9.1 Machine / third-party consumers (must not move)

| Path | Consumer | Handler | Notes |
|---|---|---|---|
| `/api/auth/google/callback` | Google OAuth (registered redirect URI) | `src/app/api/auth/google/callback/route.ts` | origin from `APP_ORIGIN`/`https://inapp.pro` |
| `/api/auth/google/start`, `/api/auth/google` | modal | — | |
| `/api/auth/email/verify` | links already sent in emails (valid 15 min) | `email/verify/route.ts` | |
| `/api/auth/start`, `/api/auth/poll`, `/api/auth/logout`, `/api/me` | UI | — | |
| `/api/auth/vk` | VK redirect URI (dormant) | — | keep or 410 |
| `/api/pay/yookassa/webhook` | **YooKassa notifications** | `pay/yookassa/webhook/route.ts` | must stay; retries on non-2xx |
| `/library?checkout=<uuid>` (→ `/<locale>/library`) | **YooKassa `return_url`** for in-flight and future payments | `src/app/library/page.tsx` + `PurchaseTracker` | if `/library` becomes `/old/library`, keep a `/library` route that polls or change `returnUrl` |
| `/api/pay/yookassa`, `/api/pay/status` | UI; smoke test expects 401 for a zero UUID without session | — | `deploy.yml:141-144` |
| `/api/internal/grant` | Telegram bot (`SITE_URL/api/internal/grant`, secret in body) | `api/internal/grant/route.ts` | `bot/bot.mjs:84` |
| `/api/mcp` | MCP clients (Claude, ChatGPT, Cursor, VS Code…) — JSON-RPC, 401 + `www-authenticate … resource_metadata="<origin>/.well-known/oauth-protected-resource"` | `src/app/api/mcp/route.ts` | smoke test: 401 + `authorization_required` (`deploy.yml:123-129`); MCP resource id = `<origin>/api/mcp` baked into issued tokens |
| `/api/mcp/oauth/{authorize,token,register,revoke}`, `/api/mcp/oauth/meta/{as,pr}`, `/api/mcp/connections` | MCP OAuth (RFC 8414/9728/7591/7009); access token 1 h, refresh 30 d, scope `mcp:read` | `src/app/api/mcp/**`, `src/lib/mcp/authTokens.ts:5-10` | |
| `/.well-known/oauth-authorization-server[/*]`, `/.well-known/oauth-protected-resource[/*]` | MCP discovery | rewrites in `next.config.ts:17-24` | smoke test greps `"refresh_token"` (`deploy.yml:120-122`) |
| `/<locale>/mcp/connect?o=<base64url query>` | MCP authorize redirects signed-out browsers here | `src/app/mcp/connect/page.tsx` | hard-coded in `api/mcp/oauth/authorize/route.ts:97-102` |
| `/<locale>/mcp` | smoke test greps `list_niche_themes`; `/mcp/connect` falls back here | `src/app/mcp/page.tsx` | `deploy.yml:117-119` |
| `/api/og?…` | OG images cached by Telegram/crawlers, JSON-LD logo | `src/app/api/og/route.tsx` | |
| `/api/indexnow` | CI | — | |
| `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/llms.txt`, `/llms-full.txt`, `/llms-full.ru.txt`, `/icon`, `/apple-icon`, `/opengraph-image` | crawlers, LLMs, RSS readers | §8 | |
| `/b2e3a9978253227e1863da7863ffe80c.txt`, `/BingSiteAuth.xml`, `/googlefa96452ebeceb3ca.html`, `/yandex_2271f30e41706179.html` | search consoles | `public/` | |
| `/persona-covers/*.jpg` (317 files, 87 MB) | iOS app content JSON (474 references in `app:Inapp/Resources/rich.{en,ru}.json`) | `public/persona-covers/` | |
| `/idea-covers/<slug>.jpg` (456 files, 115 MB) | iOS app `RemoteEditorialImage` (`app:Inapp/Views/OpportunityViews.swift:73,154`) and the site | `public/idea-covers/` | |
| `/build/<name>.webp` (10 files) | iOS app (`app:Inapp/Views/OpportunityViews.swift:414`) and the site | `public/build/` | a static file, does not conflict with the `/build` page |
| `/badges/app-store.svg` | smoke test on `/segment/*`; market-players test | `public/badges/` | `deploy.yml:151`, `scripts/test-market-players.ts:72` |
| `/og-fonts/*.woff` | `next/font/local` + `ImageResponse` read them by path | `public/og-fonts/` | `layout.tsx:17-32`, `api/og/route.tsx:17` |

### 9.2 Human-facing URLs referenced outside the site

| URL | Referenced by | Requirement |
|---|---|---|
| `https://inapp.pro/en/contacts`, `https://inapp.pro/ru/contacts` | App Store Connect **support URL** (all locales; `app:AppStore/Release-2026-09-21/metadata.json:11,23,35,47,59`), iOS app «Связаться» (`app:Inapp/Strings/Strings.swift:273`) | must keep a contacts page with requisites and a working support e-mail; today the page body is Russian-only |
| `https://inapp.pro/en`, `https://inapp.pro/ru` | App Store **marketing URL** (`metadata.json:12,24,…`) | becomes the new landing |
| `https://inapp.pro/<ru|en>/offer` | iOS app «Условия» (`Strings.swift:272`), footer, BuyButton | keep; required by YooKassa |
| `https://inapp.pro/ru/reviews/<category>/<appStoreId>` | **live iOS app** Clarity compare screen (`app:Inapp/Clarity/ClarityCompareView.swift:136`) | keep at this path (old or new implementation) |
| `https://inapp.pro/ru/rating/<category>` | **live iOS app** (`ClarityCompareView.swift:140`) | keep at this path |
| `https://inapp.pro/ru/segment/<slug>` | iOS Studio screens (`app:Inapp/Studio/StudioDetails.swift:50,337`, `StudioResearchReader.swift:302`); llms/feed/sitemap/IndexNow; smoke test (`deploy.yml:145-153` requires `id="main-players"` and `/badges/app-store.svg`) | keep or 308 |
| `/<locale>/tokens` | smoke test expects `990` (`deploy.yml:130-132`); footer, account menu, offer §3 | keep |
| `/premium` → `/tokens` | old links | `src/app/premium/page.tsx:6-8` |
| `/<locale>/aso`, `/<locale>/workspace`, `/<locale>/workspace/habit-tracking` | smoke test requires **404** | do not create these routes in the new site (`deploy.yml:133-140`) |
| `/cards` | default magic-link return path (`email/start/route.ts:19`, `verify/route.ts:11-12`) | keep a route or change the default |
| `/`, `/?auth=…`, `/?login=expired` | auth error redirects | landing must accept these params |
| All 1,390 sitemap URLs (`/ru|en` × `/reviews/*`, `/rating/*`, `/segment/*`, `/<app-slug>`, `/ideas`, `/ideas/top`, `/most-wanted`, `/cards`, `/apps`, `/build`, `/mcp`) | Google/Yandex/Bing index, LLM citations | if moved to `/old/*`, add permanent (308) redirects old → new path |

### 9.3 Recommended URL plan for "old under /old"

- Canonical old form: `/<locale>/old/<path>` (works with the proxy unchanged). Optionally also accept `/old/<locale>/<path>` via a redirect in the proxy.
- Keep in place (shared, not under `/old`): all `/api/*`, `/.well-known/*`, special routes of §8, `public/*`, `/offer`, `/contacts`, `/tokens` (or a new pricing page at the same path), `/library` (payment return), `/mcp` + `/mcp/connect`, `/admin`.
- Paths with external links (§9.2: `/reviews/<cat>/<id>`, `/rating/<cat>`, `/segment/<slug>`) either keep the old implementation at the same path until the new site has an equivalent, or 308 to the new equivalent — never to `/old/...` without also updating the iOS app.

---

## 10. Deploy constraints and what they imply

### 10.1 Pipeline (`.github/workflows/deploy.yml`)

1. Triggers: push/PR to `main`, manual. Deploy job only on `main` push/dispatch with repo var `DEPLOY_ENABLED=true`, environment `production`, concurrency group `deploy-main` (`:19-28,75-76`).
2. CI job on `ubuntu-latest`, **Node 20**: `npm ci`, `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test:mcp`, `npm run test:monetization`, `npm run test:market-players`, `npm run build` with `DATABASE_URL=file:./ci.db` (no real DB; pages must not query Prisma at build time — only `force-static` routes are pre-rendered), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_EMAIL_LOGIN` (`:36-63`).
3. `tar -czf next-build.tgz --exclude='.next/cache' .next` → artifact (2-day retention) (`:64-70`).
4. Deploy: scp tarball → `/opt/badcomment/next-build.tgz`; rewrite `GOOGLE_CLIENT_SECRET`, `YC_SMTP_USER`, `YC_SMTP_PASS` in `/opt/badcomment/.env`; run `deploy/deploy.sh` (`:87-108`).
5. `deploy.sh` on the box: `git pull --ff-only origin main` → `npm ci` → `prisma generate` → **`prisma db push --accept-data-loss`** → unpack `.next` into `.next.incoming`, atomic swap → `systemctl restart badcomment` and `inappbot` (`deploy/deploy.sh:20-37`).
6. Post-deploy: IndexNow ping, then smoke tests (§9) — a failing smoke test fails the workflow **after** the new build is already live.

### 10.2 CI tests that constrain the new site

| Script | What it pins |
|---|---|
| `scripts/test-monetization.ts` | price 990; checkout route contains `paymentAttempt.create`, `checkoutId`, `ACCESS_PRICE_RUB`; webhook regexes for `succeeded`/`paid`, `confirming`, `status: "succeeded", confirmedAt: new Date()`, `status: 500`; `PurchaseTracker.tsx` checks `data.status === "succeeded"` before `trackPurchase(` and never uses `params.get("bought")`; `track.ts` has no `dataLayer().push`; `src/app/layout.tsx` analytics order (`:7-34`) |
| `scripts/test-mcp.ts` | 16 read-only MCP tools with strict schemas; `list_niches` total **71**; free `research_niche` for `dating-apps`; `get_niche_brief` denied for free users; review ids `rv_*` (`:21-69`) |
| `scripts/test-market-players.ts` | every active category has a market-players snapshot; rendered hrefs are exactly `/${locale}/reviews/${slug}/${appStoreId}`; HTML contains «Основные игроки» / "Main players" and `/badges/app-store.svg` (`:12-73`) — if review pages move under `/old`, this assertion must change together with `NicheMarketPlayers` |

`tsc --noEmit` and ESLint cover the whole repo (`tsconfig.json` `include: ["**/*.ts", "**/*.tsx", …]`; `eslint.config.mjs` only ignores `.next`, `out`, `build`, root `extract*.ts`). Any helper script or generated TS added for the new site must type-check and lint. Note `.gitignore` ignores the root `/build` directory (not `src/app/build`).

### 10.3 Box memory and CPU

- 1.9 GB RAM, 2 vCPU; the same box runs Next, the bot, the daily ingest and SQLite. `typescript.ignoreBuildErrors: true` exists because the type-check OOM-killed builds as `insights.json` grew (`next.config.ts:7-10`).
- `npm ci` runs on the box on every deploy (including dev dependencies); adding heavy dependencies (e.g. `sharp`, big UI kits) costs install time and disk on the box.
- `next/image` is not used anywhere (plain `<img>`); on-the-fly image optimisation on this box would be CPU/RAM-expensive — ship pre-sized WebP/AVIF and serve statically.
- Every page is SSR per request. Heavy pages should avoid per-request work over large JSON; prefer module-level caches built once per process, or Next 16 caching (`use cache`) for locale-independent data.

### 10.4 Data size rules for the app content

Current state: `src/data` 148 MB (largest: `insights.json` 40 MB, `reviewSourceIndex.json` 36 MB, `app-cards.json` 20 MB, `peoplesRating/` 17 MB, `ideas.json` 5.5 MB). Several of these are **statically imported** into server modules (`src/lib/insights.ts:1`, `src/lib/readyApps.ts:1`, `src/lib/reviews.ts:8`, `src/lib/regenCards.ts:2`, `src/lib/ideas.ts:1`, `src/app/page.tsx:8`, `src/components/NicheDossier.tsx:25`), so they are bundled into server chunks and parsed in the Node process. The review archive instead uses runtime `fs` + gzip + a 4-niche LRU (`src/lib/reviews.ts:240-277`) — this is the pattern to copy.

App packs to port (`app:Inapp/Resources`): 41 MB of JSON across 5 locales (`rich.ru.json` 14.7 MB, `facts.json` 4.9 MB, `quote-translations.ru.json` 3.5 MB, `studio.json` 2.5 MB, `text.<lang>.json` 0.9–2.5 MB each, `research-editorial.<lang>.json` 0.6–1.7 MB, `idea-articles.<lang>.json` 0.4–0.6 MB, `ui.<lang>.json` ~0.1 MB) and `Assets.xcassets` 206 MB (1,023 images).

Implications:
1. Never import a content pack in a client component; pass only the per-page slice as props (the old home page learned this: `src/app/api/idea-depth/[slug]/route.ts:9-12`).
2. Split packs at build/import time into per-locale, per-article/per-idea files (e.g. `content/<lang>/ideas/<slug>.json`) and read them with `fs` + a small LRU keyed by `(lang, slug)`; do not statically import the 14.7 MB file.
3. Only `ui.<lang>.json` (~100 KB) is small enough to import; still split per locale so the client gets one locale.
4. Images: export from `Assets.xcassets` to WebP at display sizes into `public/…`; budget disk (git repo + box). `public/` is already 204 MB and `review-data/` 204 MB in git; the box disk size is unknown (open question). `public/` files are served by `next start` from the box checkout (git), not from the `.next` tarball.
5. Keep the `force-dynamic` build free of DB access; if pages are prerendered, they read only files that exist on the runner.

---

## 11. Discrepancies, gotchas and risks found

| # | Finding | Evidence |
|---|---|---|
| 1 | Root layout comment says the default theme is light; code defaults to **dark** unless cookie `theme=light` | `src/app/layout.tsx:50-52` |
| 2 | `googleAuth.ts` comment promises a signup bonus; no grant is made | `src/lib/googleAuth.ts:13-32` |
| 3 | `tokenConfig.LIFETIME.stars = 1500` vs bot sells lifetime for **500 ⭐** | `src/lib/tokenConfig.ts:10`, `bot/bot.mjs:19-21` |
| 4 | `isPremium()` (used on the home page) ignores `lifetime`; `getAccess()` includes it | `src/lib/premium.ts:16-24`, `src/app/page.tsx:49` |
| 5 | Pay route returns 409 only for `lifetime`/`isAdmin`; friends and `premiumUntil` users can still pay | `src/app/api/pay/yookassa/route.ts:22` |
| 6 | `/en/contacts` (App Store support URL) renders Russian-only labels and text | `src/app/contacts/page.tsx:13-38` |
| 7 | Default OG image says "No sign-up / No paywall / Just read" and "65+ niches" — contradicts the paywall | `src/app/opengraph-image.tsx:50-55` |
| 8 | `magic link`, `mcp/oauth` and `internal/grant` fall back to `dev-insecure-secret` even in production if `SESSION_SECRET` is missing (only `session.ts` fails closed) | `src/lib/emailAuth.ts:7`, `src/app/api/internal/grant/route.ts:12` vs `src/lib/session.ts:8-12` |
| 9 | `POST /api/scrape` is unauthenticated and triggers `ingestApp` (network + DB writes) on the small box | `src/app/api/scrape/route.ts:7-33` |
| 10 | VK callback builds `redirect_uri` from `url.origin` (internal origin behind nginx) | `src/app/api/auth/vk/route.ts:15,23` |
| 11 | Auth error params (`?auth=…`, `?login=expired`) are never shown to the user | grep: no consumer in `src/app`, `src/components` |
| 12 | Footer hides itself on `pathname === "/cards"`, but the client pathname is `/ru/cards` | `src/components/Footer.tsx:13-14` |
| 13 | `/api/track` skip-list checks `/admin`, but receives `/ru/admin` | `src/app/api/track/route.ts:20` |
| 14 | Repo nginx conf targets `badcomment.pro`; the live inapp.pro vhost/TLS isn't versioned | `deploy/nginx-badcomment.conf:4` |
| 15 | App docs vs app code: Clarity README says lifetime-only + export quota; code defaults to the annual product and gates export only by readability; paywall strings contain «3 дня бесплатно» while App Store metadata says no trial | `app:Documentation/Clarity/README.md:39`, `app:Inapp/Store/Purchases.swift:11-15`, `app:Inapp/Clarity/ClarityReader.swift:962`, `app:Inapp/Clarity/ClarityPaywall.swift`, `app:AppStore/Release-2026-09-21/README.md:13-14` |
| 16 | Free samples differ: web `dating-apps` (+ builder `flashcards-6`, `baby-tracking-2`), app `interior-design` + `interior-design-1…5`; tokens page copy promises «Полная категория «Знакомства»» | `src/lib/reviewAccess.ts:6`, `src/lib/buildAccess.ts:9-12`, `app:Inapp/Clarity/ClarityContentAccess.swift:6-7`, `src/app/tokens/page.tsx:23-25` |
| 17 | BuyButton benefits hard-code «1 451 072 отзыва» | `src/components/BuyButton.tsx:68-80` |
| 18 | `/api/dev/buyer-preview` is gated by a hard-coded owner e-mail and deletes that account's unlocks/ledger | `src/app/api/dev/buyer-preview/route.ts:13-36` |

---

## 12. Open questions

1. Old site URL shape: `/<locale>/old/<path>` (proxy-native) or `/old/<locale>/<path>` as in the request? Should old per-app `/<app-slug>` pages and the review archive keep their current URLs (external links from the iOS app and search index) instead of moving?
2. Web Plus pricing: keep the single lifetime 990 ₽ SKU (launch promo, pinned by CI) or also sell a 1-year Plus via `premiumUntil`? The App Store sells annual $39.99 and lifetime $79.99 — should web prices align?
3. Should historical partial purchases (`Unlock` rows for deck/category/idea) unlock the matching content in the new UI, or only full Plus (`unlimited`)?
4. Free sample for the new site: the app's `interior-design` + 5 ideas, or the web's `dating-apps`? MCP and CI tests pin `dating-apps` for MCP.
5. Should web saves/notes/projects sync to the account (new Prisma models, §6.3) or stay device-local like the app ("Сохранено на этом iPhone")? For guests, localStorage + merge on sign-in?
6. Locales: the app ships ru/en/ja/de/fr; the site and auth e-mails only ru/en. Is de/fr/ja in scope for the new site (proxy, `Locale` type, magic-link copy, legal pages)?
7. Receipts (54-ФЗ / НПД): are receipts issued via YooKassa's self-employed integration or manually in «Мой налог»? The code sends no receipt data.
8. Box disk budget for adding ~206 MB of app artwork (plus WebP variants) to git and `/opt/badcomment`?
9. Should `/contacts` get an English version, given it is the App Store support URL?
10. Keep the Telegram Stars path (bot deep links) on the new site, or YooKassa only?
