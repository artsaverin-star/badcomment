#!/usr/bin/env node
// Static gate for the old-site relocation (docs/site-v2/spec/07-old-relocation-audit.md §10.4,
// adapted to the owner's URL decisions in docs/site-v2/DECISIONS.md §6–8 and ARCHITECTURE.md §5).
//
// The link rule (owner decision, docs/site-v2/AUDIT-PHASE-A.md A4 option A): a link from old code
// to a page that is served IN PLACE at its original public URL (/<L>/reviews/…, /<L>/rating/…,
// per-app pages, old topics, /mcp, /tokens, …) uses that public URL; a link to a page whose URL
// the NEW site took over (/, /ideas, /segment/<launch topic>, /saved, /library, /offer, …) goes
// to its /<L>/old/… copy, so the old site never links into the new one. Only oldHref() (and
// oldNavHref() for redirects) in src/lib/oldHref.ts can tell the two apart — it asks the proxy's
// decideRoute() — so every navigation URL in OLD code (src/app/(old), src/components, src/lib)
// must come from it. This gate fails on anything that builds the URL by hand:
//   locale-literal    a string that starts with "/ru" or "/en" but not "/ru/old" / "/en/old"
//                     (e.g. `const lp = ru ? "/ru" : "/en"`, redirect("/ru"))
//   old-literal       a hard-coded archive path "/ru/old…" / "/en/old…" (it would send an in-place
//                     target into the noindexed archive)
//   locale-template   a template that starts with a locale expression: `/${lp}/…`, `/${locale}/…`,
//                     `/${ru ? "ru" : "en"}/…`
//   lp-template       a `${lp}…` template (the old `lp` prefix cannot see the path; absolute
//                     https://inapp.pro/${lp}/… canonicals, where lp = "ru" | "en", are fine)
//   old-prefix        oldLp() — the bare archive prefix; use oldHref(locale, path)
//   strip-regex       the legacy pathname strip `.replace(/^\/(ru|en)…/` (use splitOldPath/oldRestPath)
//   bare-nav          a bare internal path handed to a navigation sink: href / fallback / backHref /
//                     moreHref / reviewHref / hrefBack / hrefNiches, router.push/replace/prefetch,
//                     redirect / permanentRedirect, location = / location.assign|replace, window.open
//                     (the proxy would send it to the NEW site). /api/, /_next/ and static files are fine.
//   public-exit       publicHref() — a deliberate exit to the NEW site / in-place URL — outside the
//                     reviewed places listed in PUBLIC_EXIT_FILES.
//   canonical-old     the reverse mistake: an absolute https://inapp.pro URL built from the old-site
//                     prefix (`${lp}`, oldLp(), oldHref(), "/ru/old") — canonicals must stay public.
// Plus one contract check on the helper itself: src/lib/oldHref.ts must route through the proxy's
// decideRoute() (scripts/v2/test-routing.ts covers its behaviour).
//
// Allow-list (deliberately NOT checked):
//   • Absolute https://inapp.pro/… URLs: canonicals, hreflang, og:url, JSON-LD, SearchAction, MCP tool
//     texts. The owner decided they keep the ORIGINAL public URLs so in-place pages stay indexed
//     (ARCHITECTURE.md §5.2). None of the rules above can match an absolute URL, because every rule
//     requires the path to start right after the opening quote. Run with --list-absolute to review them.
//   • src/lib/oldHref.ts (the helpers themselves), src/lib/safeReturn.ts (the shared return-path
//     validator of the sign-in routes, not navigation) and anything under src/app/api (shared APIs).
//   • Comment lines, and any line carrying the marker `old-links: allow` (on it or on the line above).
//
// Usage:
//   node scripts/check-old-links.mjs                  # exit 1 on violations
//   node scripts/check-old-links.mjs --list-absolute  # also print the allow-listed absolute URLs
//   node scripts/check-old-links.mjs --root <dir>     # scan another checkout (e.g. an exported HEAD)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 ? args[rootArg + 1] : fileURLToPath(new URL("..", import.meta.url));
const LIST_ABSOLUTE = args.includes("--list-absolute");

const SCAN = ["src/app/(old)", "src/components", "src/lib"];
const SKIP_FILES = new Set(["src/lib/oldHref.ts", "src/lib/safeReturn.ts"]);
const SKIP_DIRS = ["src/app/api/"];
const EXT = /\.(tsx?|jsx?|mjs)$/;
// Reviewed exits from the old site to public (new or in-place) URLs.
const PUBLIC_EXIT_FILES = new Set([
  "src/components/Header.tsx", // logo → new home
  "src/components/OldSiteBanner.tsx", // banner links to the new site
]);
// Redirects issued by old pages use oldNavHref(): the public URL when served in place, the
// archive inside /<L>/old (it calls publicHref() inside the skipped helper file).

const Q = "[\"'`]";
const RULES = [
  {
    id: "locale-literal",
    re: new RegExp(`${Q}/(?:ru|en)(?=[/"'\`?#])(?!/old(?:[/"'\`?#]))`),
  },
  { id: "old-literal", re: new RegExp(`${Q}/(?:ru|en)/old(?=[/"'\`?#])`) },
  {
    id: "locale-template",
    re: /`\/\$\{[^}]*(?:\b(?:lp|locale|localePrefix|lang|loc|next|ru)\b|"(?:ru|en)")[^}]*\}/,
  },
  // `${lp}…` except in an absolute canonical (`https://inapp.pro/${lp}/…`, lp = "ru" | "en").
  { id: "lp-template", re: /(?<!inapp\.pro\/)\$\{\s*lp\s*\}/ },
  { id: "old-prefix", re: /\boldLp\(/ },
  { id: "strip-regex", re: /\.replace\(\s*\/\^\\\/\(ru\|en\)/ },
  {
    id: "bare-nav",
    re: new RegExp(
      "(?:\\b(?:href|fallback|backHref|moreHref|reviewHref|hrefBack|hrefNiches)\\s*[:=]\\s*\\{?\\s*" +
        "|\\b(?:push|replace|prefetch|redirect|permanentRedirect|assign|open)\\(\\s*" +
        "|\\blocation(?:\\.href)?\\s*=\\s*)" +
        `${Q}(/(?!/)[^"'\`]*)`,
    ),
    // Match group 1 is the path; shared APIs, Next internals and static files are not navigation.
    ok: (m) => /^\/(?:api|_next)\//.test(m[1]) || /^\/[^?#]*\.[a-z0-9]{2,5}(?:[?#].*)?$/i.test(m[1]),
  },
  { id: "public-exit", re: /\bpublicHref\(/, ok: (_m, file) => PUBLIC_EXIT_FILES.has(file) },
  // The reverse mistake: an absolute canonical/JSON-LD URL built from the old-site prefix
  // (`lp` is oldLp() everywhere in old code) would publish /old URLs to search engines.
  { id: "canonical-old", re: /inapp\.pro\$\{\s*(?:lp\b|old(?:Lp|Href)\()|inapp\.pro\/(?:ru|en)\/old\b/ },
];
const ABSOLUTE = /https?:\/\/(?:www\.)?inapp\.pro(?:\/(?:\$\{[^}]*\}|[\w./-])*)?/g;
const ALLOW = "old-links: allow";

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (EXT.test(name)) yield p;
  }
}

const isComment = (line) => /^\s*(?:\/\/|\/\*|\*|\{\s*\/\*)/.test(line);

const violations = [];
const absolute = [];
let files = 0;
let allowed = 0;
for (const base of SCAN) {
  for (const abs of walk(join(ROOT, base))) {
    const file = relative(ROOT, abs).split(sep).join("/");
    if (SKIP_FILES.has(file) || SKIP_DIRS.some((d) => file.startsWith(d))) continue;
    files++;
    const lines = readFileSync(abs, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (isComment(line)) return;
      for (const m of line.matchAll(ABSOLUTE)) absolute.push(`${file}:${i + 1}  ${m[0]}`);
      for (const rule of RULES) {
        const m = rule.re.exec(line);
        if (!m || rule.ok?.(m, file)) continue;
        if (line.includes(ALLOW) || (i > 0 && lines[i - 1].includes(ALLOW))) {
          allowed++;
          continue;
        }
        violations.push(`${file}:${i + 1}  [${rule.id}]  ${line.trim().slice(0, 160)}`);
      }
    });
  }
}

// The helper must keep asking the proxy's decision, or in-place pages lose their public links.
const HELPER = "src/lib/oldHref.ts";
let helper = "";
try {
  helper = readFileSync(join(ROOT, HELPER), "utf8");
} catch {
  // reported below
}
if (!/from\s+["'][^"']*site\/routing\/decide["']/.test(helper) || !/\bdecideRoute\(/.test(helper)) {
  violations.push(`${HELPER}  [helper-contract]  oldHref() must use decideRoute() so in-place targets keep their public URL`);
}

if (LIST_ABSOLUTE) {
  console.log(`Allow-listed absolute same-site URLs (canonical/JSON-LD/MCP, unchanged by design): ${absolute.length}`);
  for (const a of absolute) console.log(`  ${a}`);
}
if (violations.length) {
  console.error(`check-old-links: ${violations.length} navigation URL(s) in old code bypass oldHref():`);
  for (const v of violations) console.error(`  ${v}`);
  console.error("Use oldHref()/oldNavHref() from src/lib/oldHref.ts (or mark a reviewed exception with `// old-links: allow`).");
  process.exit(1);
}
console.log(
  `check-old-links: OK — ${files} files scanned, 0 violations` +
    (allowed ? `, ${allowed} marked "${ALLOW}"` : "") +
    `, ${absolute.length} absolute inapp.pro URLs left unchanged by design.`,
);
