# `scripts/v2/smoke.mjs` — post-deploy smoke suite for site v2

A dependency-free check of a running inApp server: new-site routes, redirects, the old site,
APIs, CI markers, Apple-facing legal pages and a **paid-content leak check**. Needs Node 20+ (it uses
only the global `fetch` and `node:` built-ins), no `npm install`, no build.

```sh
node scripts/v2/smoke.mjs                          # http://localhost:3210 (the shared dev server)
node scripts/v2/smoke.mjs https://inapp.pro        # production, after a deploy
node scripts/v2/smoke.mjs https://inapp.pro --only routes,apple --locales ru,en
node scripts/v2/smoke.mjs --self-test              # offline tests of the parsers and the leak matcher
```

Exit code: `0` = every check passed (SKIPs allowed), `1` = at least one FAIL, the server did not
answer, or a self-test failed, `2` = bad command line.

Every request is a **fresh guest**: no cookie jar and `redirect: "manual"`, so a 307 is checked as a
307 and not followed. Network errors and 500/502/503/504 are retried (`--retries`, default 2, with
1.5 s / 3 s back-off) because a server that is restarting after a deploy, or a dev server that is
recompiling, answers like that for a moment. Before the checks start, the script waits up to
`--wait` seconds (default 30) for the server to answer at all. GET responses are memoized per URL +
headers, so a page used by several checks is fetched once.

## Output

1. A header: base URL, Node version, and for the leak check the content directory and how many
   paid texts and probes were loaded.
2. A per-group summary table (`CHECKS / PASS / FAIL / SKIP`).
3. `FAILURES AND SKIPS`: one row per failing check with the expectation and the first reason.
   `--all` prints every check instead.
4. `DETAILS`: every failure reason plus context: the snippet around a forbidden string, or the
   leaked paid text with its source file and field and the part of the page where it was found.
5. The verdict line. `--json FILE` also writes all results as JSON (for CI artefacts).

## Groups

| Group | What is checked | Source of truth |
|---|---|---|
| `routes` | Every NEW route for each of `ru en de fr ja`: `/L`, `/L/segment`, `/L/segment/{interior-design,habit-tracking}`, `/L/ideas`, `/L/ideas/{interior-design-1,habit-tracking-1}`, `/L/saved`, `/L/settings`, `/L/settings/about`, `/L/plus`, `/L/welcome`, `/L/login`, `/L/library` (**307 → `/L/saved`** without `?checkout`), `/L/library?checkout=<uuid>`, `/L/contacts`, `/L/offer`, `/L/offer/payment`, `/L/privacy`. A 200 must be `text/html` with `<html lang="L">`, served by the NEW root layout (no `data-old-site-banner`), and must set the `locale=L` cookie. | ARCHITECTURE §1, §3 |
| `redirects` | `/` negotiation (Accept-Language exact/base/q-order, cookie wins, `en` fallback, query kept); bare paths in one hop; `/L/research[/…]` and `/L/search?q=` → **308** `/L/segment…`; `/L/segment/<launch>/v2` → 308; for de/fr/ja, old-only URLs (`/segment/qr-scanner`, `/ideas/top`, `/mcp`, `/old`) → 307 `/en/…`; `/old…` entry points; the internal `/site/…` tree is 404 from outside. | ARCHITECTURE §1, `src/site/routing/decide.ts` |
| `old` | `/ru/old`, `/en/old`, `/ru/old/segment/habit-tracking`: 200, `X-Robots-Tag: noindex`, banner `data-old-site-banner="old"`, no `locale` cookie. `/ru/segment/qr-scanner` and `/en/segment/qr-scanner`: the in-place page with the «Скоро обновление» / "Update coming soon" banner and no noindex. `/ru/mcp` contains `list_niche_themes`; `/ru/tokens` contains `990`; `/ru/aso`, `/ru/workspace`, … are 404 in place and under `/old` (same list as the deploy workflow). | ARCHITECTURE §3, §5.3; `.github/workflows/deploy.yml` |
| `api` | `GET /api/me` is JSON with `user: null, plus: false` for a guest; `/.well-known/oauth-authorization-server` is JSON with `"refresh_token"`; `POST /api/mcp` without a token is 401 `authorization_required`; `GET /api/pay/status` is 401 for a guest. | deploy workflow |
| `markers` | `/ru|en/segment/{language-learning,workout-fitness,habit-tracking}` (NEW pages) and the two old in-place topics from the deploy workflow contain `id="main-players"` and `/badges/app-store.svg`; `/en/offer` contains "Terms of Use"; `/en/contacts` contains "inApp Support". | ARCHITECTURE §5.4, DECISIONS "Legal pages" |
| `apple` | `/en`, `/en/offer`, `/en/contacts`, `/ru/offer`, `/ru/contacts` must not contain `990`, `₽`, `ЮKassa`, `YooKassa`, `Telegram Stars`, `/tokens` or `offer/payment` **anywhere in the response**: visible text, attribute values (`href` included), inline scripts, or the inline RSC payload that ships with the page (for example, the props of a paywall or checkout client component). Each hit is reported with its location and ~50 characters of context. React Flight row ids and references (`"$990"`, `$L990`, `990:`) are not counted as the price. | DECISIONS "Legal pages" (`/offer` = Terms of Use, no web prices or payment methods; no price or buy CTA in the chrome of `/offer` and `/contacts`) |
| `leak` | See below. | spec 04 §7.6, spec 09 G10, ARCHITECTURE §2 rules |

## Leak check

**What counts as paid.** For every locale, the script loads the texts that only Plus may read, as
the import script wrote them to disk:

- `content/v2/<L>/cards.json`: `title` and `description` of every idea that is not free
  (free = `manifest.free.ideas`, `interior-design-1…5`);
- `content/v2/<L>/research/*.json` of every topic that is not free (free = `interior-design`): `lead`,
  audience titles and bodies, section titles and intros, observation titles and passages, review
  quotes, direction (placement) titles and bodies, and the conclusion;
- `content/v2/<L>/ideas/<slug>.json` of every paid idea: title, description and all blocks.

Paragraphs are split on blank lines. Texts shorter than 10 canonical characters are skipped (5 for
mostly-Japanese text, which is denser), and the header counts them. Identical texts in several
locales are merged. Every page is checked against the paid texts of **all** selected locales, so a
German page that shows an English fallback of a paid paragraph is caught too.

**What is public on purpose, and is never reported.** `catalog.json` (names, summaries, cover alt
text), `onboarding.json` (the landing and welcome excerpts), `ui.json`, the free topic, the free ideas
and their cards, and the name, summary and cover alt of every locked topic (the locked preview shows
them, spec 04 §5.6). Any probe (see below) that also occurs in this public corpus is dropped. So an
onboarding excerpt taken from a paid article is fine, and one sentence beyond it is not.

**Where it looks.** Each target page is fetched twice as a guest: as HTML, and with `RSC: 1` (the
payload of a client-side navigation). The HTML is split into visible text, attribute values (meta
description, `alt`, `aria-label`, `title`, `data-*`, …), inline scripts (JSON-LD is parsed), and
the inline React Flight stream (`self.__next_f.push` chunks, reassembled byte for byte and parsed
into rows, including length-prefixed `T` text rows). From the RSC payload only JSON string values
and text rows are used; import and hint rows are skipped.

Targets, for each locale:

| Target | Why |
|---|---|
| `/L/segment` | research catalog: locked topics show name, summary and cover only |
| `/L/ideas` | ideas catalog: a locked card is `{slug, cover}` only |
| `/L/segment/habit-tracking` | the locked article: the preview must not contain the body |
| `/L/segment/interior-design` | the free article embeds the locked cards `interior-design-6…8` |
| `/L/ideas/interior-design-1` | a free idea page (related ideas must stay locked) |
| `/L` | the landing (guest home) |
| `/L/ideas?q=<start of a paid title>` | idea search must exclude locked ideas |
| `/L/segment?q=<first words of a paid lead>` | research search may match locked bodies but must return catalog fields only |
| 10 locked idea pages | default: `habit-tracking-1`, `interior-design-6`, `interior-design-8`, then 7 spread evenly over the paid list; `--ideas a,b,…` overrides |
| `POST /api/site/export/<locked id>` | must be 401 for a guest, and the body must not contain paid text |

The search queries are strict prefixes of the paid text, so the page echoing the query back (input
value, title) can never produce a false hit.

**How it matches.** Both sides go through the same canonical form: HTML entities and JSON escapes
decoded, NFC, lower case, soft hyphens and zero-width characters removed, quote, dash and ellipsis
variants unified, and **all whitespace removed**. NBSP versus space, the 430/360-character reflow
into several `<p>`, `<!-- -->` text separators and tag boundaries then no longer matter. A paid text
up to 24 characters long (12 for Japanese) is one probe. A longer one is cut into aligned
24-character (12 for Japanese) probes, plus the tail. A page leaks a text when any of its
non-public probes occurs in the page. So **any excerpt of 47 or more canonical characters (23 for
Japanese) is always found**: a teaser, a meta description, a search snippet. A short paid title is
found only as a whole. Lookups use a rolling-hash index of the page (10-character windows; shorter
probes use `indexOf`), and every hash hit is verified exactly. With the roughly 21,000 paid texts
of all five locales, the check takes a few tens of milliseconds per page.

**Dev-only debug info.** `next dev` payloads also contain React debug rows (`D` rows and the
component-info objects they reference, including server-component props). A hit that occurs *only*
there is labelled `(dev debug info)`. It still fails: production does not ship these rows, but it
means paid data was read and passed to a component while rendering for a guest, which spec 04 §7.6
forbids ("gate before reading").

**Self-test.** The free article and the free idea page are positive controls. At least 90% of the
free passages must be found in the HTML text **and** in the RSC payload, or the check fails with
"detector or page broken". `--self-test` runs 37 offline unit tests: canonical form, entity
decoding, the hash index against `indexOf`, the Flight parser (byte-length `T` rows, `$$` escapes,
debug rows), the HTML splitter, and detection of reflowed, excerpted, escaped, Japanese and
debug-only text. They also cover the shortest guaranteed excerpt, the `990` pattern and the
search-echo rule.

Content location: by default `content/v2` of the repository that contains the script. Pass
`--content DIR` when running from elsewhere. Without content, the leak group is reported as SKIP.
The leak check reads only public URLs and never needs credentials.

## Options

| Option | Default | |
|---|---|---|
| `baseUrl` (positional) | `http://localhost:3210` | origin, optionally with a path prefix |
| `--only g1,g2` / `--skip g1,g2` | all groups | `routes redirects old api markers apple leak` |
| `--no-leak` | | same as `--skip leak` |
| `--locales ru,en` | `ru,en,de,fr,ja` | per-locale checks and the leak needles; the fixed ru/en checks always run |
| `--content DIR` | `<repo>/content/v2` | where the leak check reads the paid texts |
| `--ideas id,…` | 10 from the manifest | locked idea pages for the leak check |
| `--concurrency N` | 4 | parallel requests (be gentle with a dev server) |
| `--timeout MS` | 60000 | per request; the first hit of a dev route compiles it |
| `--retries N` | 2 | on network errors and 500/502/503/504 |
| `--wait S` | 30 | wait for the server before starting; `0` disables |
| `--all` | | print passing checks too |
| `--json FILE` | | write every result as JSON |
| `--self-test` | | offline tests only |

## Adding it to the deploy workflow

The production smoke step in `.github/workflows/deploy.yml` can call it after the existing curl
checks (the runner checks the repository out, so the leak check finds `content/v2`):

```yaml
      - name: Smoke-test site v2
        run: node scripts/v2/smoke.mjs https://inapp.pro --json smoke-v2.json
```

Against production, the `routes` cookie assertion expects the proxy's `Set-Cookie: locale=<L>` to
pass through the reverse proxy unchanged.
