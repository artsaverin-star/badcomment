import { isLocale } from "@/site/i18n/locales";
import { parsePulseQuery, PULSE_PAGE_SIZE, pulseDataVersion, pulseFeedItem, selectPulseNeeds } from "@/site/features/pulse/query";
import { getPulseCategoryNames, getPulseDemand } from "@/site/sitedata/pulse";

// GET /api/site/pulse?l=<ru|en|de|fr|ja>&category=<slug>&q=<words>&page=<n>
//   → { version, page, pages, total, items: [{ id, categoryName, title: { <l>: text }, score,
//       reviewCount, appCount, categoryAppCount }] }
// The next page of the «Пульс» feed for its auto-loading (PulseFeed, docs/site-v2/PULSE.md
// «Auto-loading»): the same selection as the page (parsePulseQuery → selectPulseNeeds, file
// order), PULSE_PAGE_SIZE per page, the same category names. Unlike the page, `page` is not
// clamped: past the last page `items` is empty, so the client knows it has reached the end.
// The items carry only what a card shows (PulseCardNeed) — no summary, no quotes, no kind —
// and the client renders them with the very PulseCard the page renders on the server.
// `version` fingerprints the file (pulseDataVersion), so the client can drop a list it kept
// for Back once the data changes. PUBLIC (the feed is public); nginx has no proxy cache, so a
// short browser max-age is all there is.

const HEADERS = { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" };

function bad(error: string): Response {
  return Response.json({ error }, { status: 400, headers: { "X-Robots-Tag": "noindex" } });
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const l = params.get("l");
  if (!isLocale(l)) return bad("l must be one of ru, en, de, fr, ja");
  const rawPage = params.get("page") ?? "1";
  if (!/^\d{1,5}$/.test(rawPage) || Number(rawPage) < 1) return bad("page must be a positive integer");
  const page = Number(rawPage);
  const query = parsePulseQuery({ category: params.get("category") ?? undefined, q: params.get("q") ?? undefined });

  const data = await getPulseDemand();
  const names = await getPulseCategoryNames(l, data);
  const results = selectPulseNeeds(data.needs, query, l);
  const pages = Math.max(1, Math.ceil(results.length / PULSE_PAGE_SIZE));
  const items = results
    .slice((page - 1) * PULSE_PAGE_SIZE, page * PULSE_PAGE_SIZE)
    .map((need) => pulseFeedItem(need, l, names.get(need.categoryId) ?? need.categoryId));
  return Response.json({ version: pulseDataVersion(data), page, pages, total: results.length, items }, { headers: HEADERS });
}
