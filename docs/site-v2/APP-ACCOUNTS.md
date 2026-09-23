# inApp accounts across the iOS app and the website (plan + API contract, 2026-09-23)

Owner decisions (verbatim intent): buy on the website AND in the app, data synced; follow Apple's
rules strictly; web payment matters only for Russia (App Store payments don't work there) — so
**no "buy on the website" link anywhere in the app, in any storefront**; sign-in lives **only in
the app's Settings** (not in onboarding, not in the paywall).

Apple rules this relies on (App Review Guidelines): 3.1.3(b) Multiplatform Services — content bought
on the website may be accessed in the app because Plus is also sold as IAP in the app; 3.1.1 — the
app must not steer to other purchase methods (outside the US storefront; we don't use the US
exception); 4.8 — Google/Telegram login ⇒ also offer Sign in with Apple; 5.1.1(v) — account
deletion inside the app; TN3194 — revoke Sign in with Apple tokens on deletion.

## Identity

- One account system = the website's `User` (Telegram, Google, e-mail magic link, + new Apple).
- App sign-in options (Settings → «Аккаунт»):
  1. **Sign in with Apple** (native, AuthenticationServices) → `POST /api/app/auth/apple`.
  2. **«Другой способ входа»** (Telegram, Google, e-mail) → `ASWebAuthenticationSession` opens
     `https://inapp.pro/api/app/auth/handoff/start?locale=<L>`; the user signs in on the website;
     the site redirects to `inapp://auth?code=<one-time code>`; the app calls
     `POST /api/app/auth/exchange`. Same account as on the website ⇒ web purchases apply.
- Apple sign-in links to an existing website account when Apple returns a verified, non-relay
  e-mail equal to that account's e-mail; otherwise it creates a new account.
- App copy never mentions purchases on the website. Allowed wording: «Если у тебя уже есть аккаунт
  inApp, войди тем же способом».

## Server (site repo) — contract

Additive Prisma changes: `User.appleId String? @unique`, `User.appleRefreshToken String?`
(encrypted), `User.appLinkedAt DateTime?`, `User.appPlusUntil DateTime?`, `User.appLifetime Boolean
@default(false)`, `User.appCheckedAt DateTime?`; models `AppSession {id, userId→User cascade,
tokenHash @unique, createdAt, lastUsedAt, deviceLabel?}` and `AppLoginCode {id, codeHash @unique,
userId→User cascade, expiresAt, usedAt?}`.

App auth = `Authorization: Bearer <token>` (random 32 bytes, base64url; only its SHA-256 is stored;
no expiry, revoked by sign-out/deletion). All responses `Cache-Control: private, no-store`.

| Method + path | Auth | Request | Response |
|---|---|---|---|
| `POST /api/app/auth/apple` | — | `{identityToken, authorizationCode?, rawNonce, fullName?: {givenName?, familyName?}}` | `200 {token, user}` / `400 {error}` / `401 {error:"invalid_token"}` |
| `GET /api/app/auth/handoff/start?locale=ru\|en\|de\|fr\|ja` | — | — | 302 → `/<L>/login?app=1&return_to=/<L>/app-auth` (or straight to `/<L>/app-auth` if already signed in) |
| page `/<L>/app-auth` (new site) | web session | — | mints a one-time code (5 min) → 302 `inapp://auth?code=…`; guest → back to login |
| `POST /api/app/auth/exchange` | — | `{code}` | `200 {token, user}` / `400 {error:"invalid_code"}` |
| `POST /api/app/auth/logout` | Bearer | — | `200 {ok:true}` (deletes this AppSession) |
| `GET /api/app/me` | Bearer | — | `200 {user, plus}` / `401` |
| `POST /api/app/entitlements/refresh` | Bearer | — | `200 {plus}` (re-reads RevenueCat now; call after an in-app purchase/restore) |
| `DELETE /api/app/account` | Bearer | `{confirm:"DELETE"}` | `200 {ok:true, appleRevoked: boolean}` |
| `POST /api/site/account/delete` | web session | form/JSON `{confirm:"DELETE"}` | `200 {ok:true}` (website Settings) |
| `GET/POST /api/site/library`, `POST /api/site/library/merge` | web session **or Bearer** | unchanged | unchanged |

**PKCE binding of the hand-off code (added 2026-09-23 after the security review; `src/lib/appFlow.ts`).**
The app creates a random `verifier` (RFC 7636: 43–128 chars of `A-Z a-z 0-9 - . _ ~`; the server
accepts ≥ 32) and sends `challenge = SHA-256(verifier)` — base64url without padding (43 chars) or
lowercase hex (64 chars) — as `GET /api/app/auth/handoff/start?locale=<L>&challenge=<challenge>`
(alias `code_challenge`; malformed → `400 {error:"bad_challenge"}`). The server keeps it in the
`ia_app_pkce` cookie (30 min) and `/<L>/app-auth` stores it on the code (`AppLoginCode.challenge`,
additive column); for the e-mail link it rides in the link's return path and the verify route turns
it back into the cookie. `POST /api/app/auth/exchange {code, verifier}` (alias `code_verifier`):
a code bound to a challenge needs the matching verifier, a verifier never redeems an unbound code,
a wrong verifier does not burn the code (all → `400 invalid_code`). Until the app sends a challenge,
unbound codes still work without a verifier; `APP_HANDOFF_PKCE=required` (server env) makes the
verifier mandatory — switch it on once the app build with PKCE is the one in review.

Failed web sign-ins inside the sheet (Google cancel/error, expired e-mail link) land on
`/<L>/login?app=1&auth=…|login=expired`, never on the landing page. `/<L>/login?app=1` and
`/<L>/app-auth` load no analytics (proxy header `x-ia-app-flow: 1`).

`user = {id, name: string|null, email: string|null, methods: ("apple"|"telegram"|"google"|"email")[]}`
`plus = {active: boolean, lifetime: boolean, until: string|null, sources: ("web_lifetime"|"web_premium"|"friend"|"admin"|"app")[]}`

Plus on the server = today's `getAccess().unlimited` OR app entitlement (`appLifetime` or
`appPlusUntil > now`). App entitlement comes from RevenueCat: `GET
https://api.revenuecat.com/v1/subscribers/<userId>` with the app's public SDK key (env
`REVENUECAT_PUBLIC_KEY`, default = the key in the iOS app), entitlement `plus`
(`expires_date: null` = lifetime). Only for users with `appLinkedAt` (they signed in in the app);
cached on User, refreshed when older than 15 min (and on `/entitlements/refresh`).

Account deletion: revoke Apple tokens when `SIWA_KEY_ID` + `SIWA_PRIVATE_KEY` + `APPLE_TEAM_ID`
(D8GNCMFXH8) are configured (client secret ES256, `sub` = bundle id `com.artsaverin.inapp`);
otherwise return `appleRevoked:false` and the app tells the user how to stop using Apple ID with
inApp (Settings → Apple ID → Sign in with Apple). Then delete the User (cascade: sessions,
saved, notes, favorites, unlocks, app codes → SetNull, payment attempts). The app warns first
that access bought with this account is lost.

## iOS app (app repo `app_04_inapp/Inapp`)

- Settings: new section «Аккаунт» — signed out: short text + native «Sign in with Apple» button +
  «Другой способ входа»; signed in: name/e-mail + method, «Синхронизация: закладки и заметки»,
  «Выйти», «Удалить аккаунт» (confirmation + warning). Nothing in onboarding or the paywall.
- `AccountStore` (@Observable): token in Keychain; `GET /api/app/me` on launch/foreground;
  `Purchases.logIn(userId)` after sign-in, `logOut()` on sign-out/deletion;
  `purchases.isUnlocked = StoreKit entitlement || server plus` (server plus cached for offline).
- Library sync: on sign-in merge local bookmarks/notes into the account (`/api/site/library/merge`),
  then push local changes (`POST /api/site/library` ops) and pull on launch.
- Info.plist URL scheme `inapp`; entitlement `com.apple.developer.applesignin = [Default]`
  (capability already enabled on the App ID via the ASC API). Debug-only launch argument
  `-apiBaseURL <url>` for local testing. Version 1.1.
- PrivacyInfo.xcprivacy + App Store privacy answers: e-mail address, name, user ID — linked to the
  user, app functionality, not tracking.

## Owner steps (cannot be automated)

1. Create a **Sign in with Apple private key** (developer.apple.com → Certificates, IDs & Profiles
   → Keys → + → Sign in with Apple → primary App ID com.artsaverin.inapp), download the .p8, tell
   the orchestrator its Key ID and file path.
2. Update **App Privacy** in App Store Connect with the answers the orchestrator prepares.
3. (Pending) import the lifetime codes in `/ru/admin`.
