import { NextResponse } from "next/server";
import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";

export const dynamic = "force-dynamic";

// IndexNow — instantly notify Bing & Yandex of the canonical pages (both locales)
// so content changes get crawled fast. Pinged automatically after each deploy.
const KEY = "b2e3a9978253227e1863da7863ffe80c";
const HOST = "inapp.pro";

export async function GET() {
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
    urlList.push(`https://${HOST}/${loc}`, `https://${HOST}/${loc}/catalog`, `https://${HOST}/${loc}/apps`);
    cats.forEach((s) => urlList.push(`https://${HOST}/${loc}/segment/${s}`));
    appSlugs.forEach((s) => urlList.push(`https://${HOST}/${loc}/${s}`));
  }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  }).catch(() => null);
  return NextResponse.json({ pinged: urlList.length, indexnowStatus: res?.status ?? null });
}
