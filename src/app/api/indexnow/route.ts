import { NextResponse } from "next/server";
import active from "@/data/active-categories.json";

export const dynamic = "force-dynamic";

// IndexNow — instantly notify Bing & Yandex of the canonical pages (both locales)
// so content changes get crawled fast. Pinged automatically after each deploy.
const KEY = "b2e3a9978253227e1863da7863ffe80c";
const HOST = "inapp.pro";

export async function GET() {
  const cats = active as string[];
  const urlList: string[] = [];
  for (const loc of ["ru", "en"]) {
    urlList.push(`https://${HOST}/${loc}`, `https://${HOST}/${loc}/catalog`);
    cats.forEach((s) => urlList.push(`https://${HOST}/${loc}/segment/${s}`));
  }
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
  }).catch(() => null);
  return NextResponse.json({ pinged: urlList.length, indexnowStatus: res?.status ?? null });
}
