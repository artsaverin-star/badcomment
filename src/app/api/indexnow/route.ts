import { NextResponse } from "next/server";
import { getManifest } from "@/site/content";
import { LOCALES } from "@/site/i18n/locales";
import { FREE_IDEAS, isLaunchCategory, LAUNCH_CATEGORIES } from "@/site/manifest.generated";
import { LEGACY_APPS, LEGACY_TOPICS } from "@/site/routing/legacy.generated";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { ratingIndexNowUrls } from "@/site/sitedata/rating-sitemap";

export const dynamic = "force-dynamic";

// IndexNow — tell Bing, Yandex and the other participating engines (Copilot answers from Bing's
// index) which URLs were added, changed or retired, so they are recrawled fast. Pinged after each
// deploy (.github/workflows/deploy.yml). IndexNow asks for changed URLs only, so every group is
// sent while its change is recent (INDEXNOW_DAYS), not on every deploy:
//   • the retired old site's URLs (they answer 301 since RETIRED_AT: the engines move their
//     signals to the new pages sooner when told);
//   • pages made from the app content (home, research, free ideas) after a content build;
//   • «Пульс» pages after a Pulse data build;
//   • the rating's changed pages (rating-sitemap.ts ratingIndexNowUrls).
// `?since=YYYY-MM-DD` sends the groups changed on or after that day, `?since=all` everything.

const KEY = "b2e3a9978253227e1863da7863ffe80c";
const HOST = "inapp.pro";
/** The API takes at most 10,000 URLs per request. */
const BATCH = 10_000;
const INDEXNOW_DAYS = 14;
/** The old site was removed and its URLs started answering 301 (owner, 2026-09-27). */
const RETIRED_AT = "2026-09-27";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** "" = everything, a day = changes on or after it, undefined = the recent window. */
function sinceParam(request: Request): string | undefined {
  const since = new URL(request.url).searchParams.get("since");
  if (since === "all") return "";
  return since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : undefined;
}

/** The old site's public URLs (ru/en): per-app pages, old topics, its own sections. */
function retiredUrls(): string[] {
  const paths = [
    ...Object.keys(LEGACY_APPS),
    ...[...LEGACY_TOPICS].filter((s) => !isLaunchCategory(s)).map((s) => `segment/${s}`),
    ...[...LEGACY_TOPICS].map((s) => `best/${s}`),
    "build",
    "ideas/top",
    "most-wanted",
    "cards",
    "apps",
    "catalog",
    "categories",
    "tokens",
    "premium",
    "old",
  ];
  return ["ru", "en"].flatMap((l) => paths.map((p) => `https://${HOST}/${l}/${p}`));
}

export async function GET(request: Request) {
  const since = sinceParam(request);
  const from = since ?? daysAgo(INDEXNOW_DAYS);
  const recent = (date: string | undefined) => !!date && date.slice(0, 10) >= from;
  const [manifest, pulse] = await Promise.all([getManifest(), getPulseDemand()]);
  const inAllLocales = (paths: string[]) => LOCALES.flatMap((l) => paths.map((p) => `https://${HOST}/${l}${p}`));

  const urlList: string[] = [];
  if (recent(RETIRED_AT)) urlList.push(...retiredUrls());
  if (recent(manifest.contentBuiltAt)) {
    urlList.push(...inAllLocales(["", "/segment", ...LAUNCH_CATEGORIES.map((s) => `/segment/${s}`), "/ideas", ...FREE_IDEAS.map((id) => `/ideas/${id}`)]));
  }
  if (recent(pulse.generatedAt)) urlList.push(...inAllLocales(["/pulse", ...pulse.needs.map((need) => `/pulse/${need.id}`)]));
  urlList.push(...ratingIndexNowUrls({ since }));
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
