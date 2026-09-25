// The rating in the sitemaps and IndexNow (spec 11 §6.5, D16). Server-only.
//
//   ratingHubEntries()      /sitemap.xml: /rating and /rating/<niche> ×71, one <url> per ru AND en
//                           page (their own canonicals), alternates ru/en/x-default
//   ratingSitemapXml(dl)    /sitemap-rating-{ru,en}.xml: every app page (4,343 per data locale) and
//                           every indexable task page (seo.ts isIndexableTask), with hreflang and
//                           the App Store icon + first 3 screenshots as <image:image>
//   ratingIndexNowUrls()    the URLs above whose content changed lately, ru and en (src/app/api/indexnow)
//
// de/fr/ja rating pages stay out: their canonical is the English page (seo.ts dataAlternates).
// A page is listed only under its own canonical URL, with the alternates the page itself
// declares (a task page's hreflang pairs ru and en only when both are indexable: seo.ts
// taskAlternates). <lastmod> is the niche file's `updatedAt` (the importer keeps it while the
// content is unchanged); the hub uses the index's `generatedAt`.

import "server-only";

import type { MetadataRoute } from "next";
import { getRatingIndex } from "../content/rating";
import { iconLd, shotLd } from "../features/rating/media";
import { dataAlternates, taskAlternates, taskIndex } from "../features/rating/seo";
import { OLD_LOCALES, type OldLocale } from "../i18n/locales";
import { isLaunchCategory } from "../manifest.generated";
import { getRatingNiche, getRatingScenario, listRatingNiches, type RatingDataLang } from "./rating";

/** Screenshots per app page in the image sitemap (the row cards show the same 3). */
const SITEMAP_SHOTS = 3;

type RatingPage = {
  /** Absolute URL, not yet percent-encoded (app slugs may hold Cyrillic look-alike letters). */
  url: string;
  lastmod: string;
  priority: number;
  /** hreflang → absolute URL, exactly as the page's own dataAlternates. */
  languages: Record<string, string>;
  /** Absolute image URLs (image sitemap). */
  images: string[];
};

/** The alternates of a page when it is its own canonical in `dl` (they name it), else null. */
function ownLanguages(dl: OldLocale, alternates: ReturnType<typeof dataAlternates>): Record<string, string> | null {
  const own = (alternates.languages ?? {}) as Record<string, string>;
  return alternates.canonical === own[dl] ? own : null;
}

/** The page's alternates when the path is its own canonical in `dl`, else null (not listed). */
function selfAlternates(dl: OldLocale, path: string) {
  return ownLanguages(dl, dataAlternates(dl, path));
}

/** The hub of one data locale: /rating and every niche page. */
function hubPages(dl: RatingDataLang): RatingPage[] {
  const niches = listRatingNiches(dl);
  const newest = niches.reduce((max, n) => (n.updatedAt > max ? n.updatedAt : max), "");
  const pages: RatingPage[] = [];
  const hub = selfAlternates(dl, "rating");
  if (hub) {
    const lastmod = getRatingIndex(dl)?.generatedAt ?? newest;
    pages.push({ url: hub[dl], lastmod, priority: 0.95, languages: hub, images: [] });
  }
  for (const n of niches) {
    const languages = selfAlternates(dl, `rating/${n.slug}`);
    if (languages) pages.push({ url: languages[dl], lastmod: n.updatedAt, priority: 0.9, languages, images: [] });
  }
  return pages;
}

/** The app pages (priority 0.6) and indexable task pages (0.5) of one data locale. */
function detailPages(dl: RatingDataLang): RatingPage[] {
  const pages: RatingPage[] = [];
  for (const card of listRatingNiches(dl)) {
    const niche = getRatingNiche(dl, card.slug);
    if (!niche) continue;
    for (const app of niche.apps) {
      const languages = selfAlternates(dl, `rating/${niche.slug}/${app.slug}`);
      if (!languages) continue;
      const images = [
        ...(app.icon ? [iconLd(app.icon)] : []),
        ...app.shots.slice(0, SITEMAP_SHOTS).map(shotLd),
      ];
      pages.push({ url: languages[dl], lastmod: niche.updatedAt, priority: 0.6, languages, images });
    }
    // Indexable task pages, with the alternates the page itself declares (a non-launch niche's
    // tasks exist in Russian only).
    const launch = isLaunchCategory(niche.slug);
    for (const scenario of niche.scenarios) {
      if (!scenario.job) continue;
      const index = taskIndex(getRatingScenario("ru", niche.slug, scenario.n), launch ? getRatingScenario("en", niche.slug, scenario.n) : null);
      if (!index[dl]) continue;
      const languages = ownLanguages(dl, taskAlternates(dl, `rating/${niche.slug}/tasks/${scenario.n}`, index));
      if (languages) pages.push({ url: languages[dl], lastmod: niche.updatedAt, priority: 0.5, languages, images: [] });
    }
  }
  return pages;
}

/** /sitemap.xml entries of the rating hub: ru and en /rating and /rating/<niche>, each its own <url>. */
export function ratingHubEntries(): MetadataRoute.Sitemap {
  return OLD_LOCALES.flatMap((dl) =>
    hubPages(dl).map((p) => ({
      url: p.url,
      lastModified: p.lastmod,
      changeFrequency: "weekly" as const,
      priority: p.priority,
      alternates: { languages: p.languages },
    })),
  );
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A URL as a sitemap value: percent-encoded (encodeURI), then XML-escaped. */
function loc(url: string): string {
  return xmlEscape(encodeURI(url));
}

/**
 * /sitemap-rating-<dl>.xml: every app page and indexable task page of the data locale, with
 * xhtml:link alternates and image:image entries (about 3.5–5 MB; far under 50k URLs / 50 MB).
 */
export function ratingSitemapXml(dl: RatingDataLang): string {
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ];
  for (const p of detailPages(dl)) {
    let entry = `<url><loc>${loc(p.url)}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority.toFixed(1)}</priority>`;
    for (const [hreflang, href] of Object.entries(p.languages)) {
      entry += `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${loc(href)}"/>`;
    }
    for (const image of p.images) entry += `<image:image><image:loc>${loc(image)}</image:loc></image:image>`;
    out.push(`${entry}</url>`);
  }
  out.push("</urlset>", "");
  return out.join("\n");
}

/** Days after an import during which the deploys keep telling IndexNow about its changes. */
const INDEXNOW_DAYS = 14;

/** YYYY-MM-DD `days` before today (UTC). */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The indexable rating URLs of ru and en (hub, niches, app pages, tasks) whose `lastmod` is on or
 * after `since` (YYYY-MM-DD), percent-encoded. IndexNow wants added and changed URLs, not the
 * whole site on every deploy: by default `since` is the data locale's latest import
 * (`generatedAt`: the niches it changed, and the hub), for INDEXNOW_DAYS after it; later deploys
 * send no rating URLs. The importer keeps `updatedAt` while a niche is unchanged. `since: ""`
 * lists every URL.
 */
export function ratingIndexNowUrls({ since }: { since?: string } = {}): string[] {
  return OLD_LOCALES.flatMap((dl) => {
    const generated = getRatingIndex(dl)?.generatedAt ?? "";
    const window = daysAgo(INDEXNOW_DAYS);
    const from = since ?? (generated >= window ? generated : "9999-12-31");
    return [...hubPages(dl), ...detailPages(dl)].filter((p) => p.lastmod >= from).map((p) => encodeURI(p.url));
  });
}
