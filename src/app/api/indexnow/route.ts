import { NextResponse } from "next/server";
import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { ratingIndexNowUrls } from "@/site/sitedata/rating-sitemap";

export const dynamic = "force-dynamic";

// IndexNow — instantly notify Bing & Yandex of the canonical pages (both locales)
// so content changes get crawled fast. Pinged automatically after each deploy.
const KEY = "b2e3a9978253227e1863da7863ffe80c";
const HOST = "inapp.pro";
/** The API takes at most 10,000 URLs per request; the rating alone has ~8,900. */
const BATCH = 10_000;

/**
 * `?since=YYYY-MM-DD` sends the rating URLs changed on or after that day, `?since=all` all of
 * them; without it, the changes of the latest rating import for two weeks after it (the deploy
 * step's call: rating-sitemap.ts ratingIndexNowUrls).
 */
function ratingSince(request: Request): string | undefined {
  const since = new URL(request.url).searchParams.get("since");
  if (since === "all") return "";
  return since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : undefined;
}

export async function GET(request: Request) {
  const cats = active as string[];
  // every indexed per-app landing slug
  const appSlugs = new Set<string>();
  for (const cs of cats) {
    const cat = getCategoryBySlug(cs, "en");
    if (!cat) continue;
    for (const a of cat.apps) {
      if (!a.productId || !hasInsight(a.productId)) continue;
      const s = getSlugByProductId(a.productId);
      if (s) appSlugs.add(s);
    }
  }
  const urlList: string[] = [];
  for (const loc of ["ru", "en"]) {
    urlList.push(`https://${HOST}/${loc}`, `https://${HOST}/${loc}/build`, `https://${HOST}/${loc}/ideas/top`, `https://${HOST}/${loc}/most-wanted`, `https://${HOST}/${loc}/cards`, `https://${HOST}/${loc}/apps`);
    cats.forEach((s) => urlList.push(`https://${HOST}/${loc}/segment/${s}`));
    appSlugs.forEach((s) => urlList.push(`https://${HOST}/${loc}/${s}`));
  }
  // The rating (spec 11 §6.5): ru and en hub, niches, app pages and indexable task pages — only
  // those the latest import changed (8,900 unchanged URLs on every deploy is what IndexNow asks
  // hosts not to send).
  urlList.push(...ratingIndexNowUrls({ since: ratingSince(request) }));
  const urls = [...new Set(urlList)];

  const statuses: (number | null)[] = [];
  for (let i = 0; i < urls.length; i += BATCH) {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + BATCH) }),
    }).catch(() => null);
    statuses.push(res?.status ?? null);
  }
  return NextResponse.json({ pinged: urls.length, batches: statuses.length, statuses });
}
