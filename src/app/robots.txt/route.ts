import { SITE_URL } from "@/site/config";

export const dynamic = "force-static";

// /robots.txt — a route (not robots.ts) because it needs Yandex's Clean-param, which Next's
// MetadataRoute.Robots cannot express. Contains a dot, so the locale proxy skips it.
//
// Search engines and AI assistants are welcome: everything public may be crawled, indexed,
// quoted and cited (the owner wants inApp to be found by people and by neural networks).
// ONE group for every robot on purpose: a robot that finds a group naming it ignores the `*`
// group (RFC 9309; Yandex says the same), so per-bot groups would silently drop the Disallow
// lines. The list names the crawlers that matter (search, AI search/answers, AI training) so the
// welcome is explicit; tokens retired by their vendors (anthropic-ai, Claude-Web) are gone.
// Disallowed: machine endpoints (the OG card images stay open for link previews) and pages that
// only make sense for one visitor. Retired old-site URLs answer 301, so they stay crawlable.

const ROBOTS = [
  "*",
  // Search engines
  "Googlebot",
  "Bingbot",
  "Yandex",
  "YandexBot",
  "DuckDuckBot",
  "Applebot",
  // AI search and answers (they cite the page they read)
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "YandexAdditional",
  "DuckAssistBot",
  "MistralAI-User",
  "MistralAI-Index",
  "Meta-WebIndexer",
  "Amzn-SearchBot",
  "Amzn-User",
  "YouBot",
  // AI training (so the models know inApp)
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "CCBot",
  "Google-CloudVertexBot",
];

const SITEMAPS = ["/sitemap.xml", "/sitemap-rating-ru.xml", "/sitemap-rating-en.xml"];

// Tracking parameters that never change a page (Yandex folds such URLs into one).
const TRACKING = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid", "fbclid", "_openstat"];

export function GET() {
  const body = [
    "# inApp — app categories through their reviews: a free app rating, «Pulse» (user needs",
    "# scored by pain), research breakdowns and ideas. Crawling, indexing and citing are welcome.",
    "# A map of the site for language models: " + `${SITE_URL}/llms.txt`,
    "",
    ...ROBOTS.map((ua) => `User-agent: ${ua}`),
    "Allow: /",
    "Allow: /api/og",
    "Disallow: /api/",
    "Disallow: /*/app-auth",
    "Disallow: /*/admin",
    "",
    `Clean-param: ${TRACKING.join("&")}`,
    "",
    ...SITEMAPS.map((p) => `Sitemap: ${SITE_URL}${p}`),
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
