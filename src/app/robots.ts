import type { MetadataRoute } from "next";

// /robots.txt — contains a dot, so the locale proxy (matcher excludes `.*\..*`)
// skips it and Next serves this generated file directly. We explicitly welcome
// the major search + AI crawlers (so the research gets indexed AND cited by
// LLMs), and point them at the sitemap.
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "YandexBot",
  "DuckDuckBot",
  "Applebot",
  "Applebot-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-CloudVertexBot",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "FacebookBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }, ...AI_AND_SEARCH_BOTS.map((ua) => ({ userAgent: ua, allow: "/" }))],
    sitemap: "https://inapp.pro/sitemap.xml",
    host: "https://inapp.pro",
  };
}
