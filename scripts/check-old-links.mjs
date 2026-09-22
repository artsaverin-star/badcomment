#!/usr/bin/env node
// Static gate for the old-site relocation (docs/site-v2/spec/07-old-relocation-audit.md §10.4,
// adapted to the owner's URL decisions in docs/site-v2/DECISIONS.md §6–8 and ARCHITECTURE.md §5).
//
// The old site now lives at /<ru|en>/old/<path>, and navigation inside it must stay there.
// This gate fails when OLD code (src/app/(old), src/components, src/lib) still produces a
// navigation URL that would leave the old site:
//   locale-literal    a string that starts with "/ru" or "/en" but not "/ru/old" / "/en/old"
//                     (e.g. `const lp = ru ? "/ru" : "/en"`, redirect("/ru"))
//   locale-template   a template that starts with a locale expression: `/${lp}/…`, `/${locale}/…`,
//                     `/${ru ? "ru" : "en"}/…`
//   strip-regex       the legacy pathname strip `.replace(/^\/(ru|en)…/` (use splitOldPath/oldRestPath)
//   bare-nav          a bare internal path handed to a navigation sink: href / fallback / backHref /
//                     moreHref / reviewHref / hrefBack / hrefNiches, router.push/replace/prefetch,
//                     redirect / permanentRedirect, location = / location.assign|replace, window.open
//                     (the proxy would send it to the NEW site). /api/, /_next/ and static files are fine.
//   public-exit       publicHref() — a deliberate exit to the NEW site / in-place URL — outside the
//                     reviewed places listed in PUBLIC_EXIT_FILES.
//   canonical-old     the reverse mistake: an absolute https://inapp.pro URL built from the old-site
//                     prefix (`${lp}`, oldLp(), oldHref(), "/ru/old") — canonicals must stay public.
//
// Allow-list (deliberately NOT checked):
//   • Absolute https://inapp.pro/… URLs: canonicals, hreflang, og:url, JSON-LD, SearchAction, MCP tool
//     texts. The owner decided they keep the ORIGINAL public URLs so in-place pages stay indexed
//     (ARCHITECTURE.md §5.2). None of the rules above can match an absolute URL, because every rule
//     requires the path to start right after the opening quote. Run with --list-absolute to review them.
//   • src/lib/oldHref.ts (the helpers themselves) and anything under src/app/api (shared APIs).
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
const SKIP_FILES = new Set(["src/lib/oldHref.ts"]);
const SKIP_DIRS = ["src/app/api/"];
const EXT = /\.(tsx?|jsx?|mjs)$/;
// Reviewed exits from the old site to public (new or in-place) URLs.
const PUBLIC_EXIT_FILES = new Set([
  "src/components/Header.tsx", // logo → new home
  "src/components/OldSiteBanner.tsx", // banner links to the new site
  "src/app/(old)/ideas/[slug]/page.tsx", // in-place 308 must target an indexable public URL
]);

const Q = "[\"'`]";
const RULES = [
  {
    id: "locale-literal",
    re: new RegExp(`${Q}/(?:ru|en)(?=[/"'\`?#])(?!/old(?:[/"'\`?#]))`),
  },
  {
    id: "locale-template",
    re: /`\/\$\{[^}]*(?:\b(?:lp|locale|localePrefix|lang|loc|next|ru)\b|"(?:ru|en)")[^}]*\}/,
  },
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

if (LIST_ABSOLUTE) {
  console.log(`Allow-listed absolute same-site URLs (canonical/JSON-LD/MCP, unchanged by design): ${absolute.length}`);
  for (const a of absolute) console.log(`  ${a}`);
}
if (violations.length) {
  console.error(`check-old-links: ${violations.length} navigation URL(s) in old code leave /<L>/old:`);
  for (const v of violations) console.error(`  ${v}`);
  console.error("Use oldLp()/oldHref() from src/lib/oldHref.ts (or mark a reviewed exception with `// old-links: allow`).");
  process.exit(1);
}
console.log(
  `check-old-links: OK — ${files} files scanned, 0 violations` +
    (allowed ? `, ${allowed} marked "${ALLOW}"` : "") +
    `, ${absolute.length} absolute inapp.pro URLs left unchanged by design.`,
);
