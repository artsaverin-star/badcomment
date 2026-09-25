import { isLocale } from "@/site/i18n/locales";
import { RATING_SEARCH_PAGE, searchRatingApps } from "@/site/sitedata/rating";

// GET /api/site/rating-search?l=<ru|en|de|fr|ja>&q=<query>&offset=<n>&limit=<40|all>
//   → { total, items: [{ niche, nicheName, nicheLang, slug, rank, title, icon, realScore, storeAvg,
//       summary, summaryLang }] }
// The rating catalogue's search (RatingCatalog; ClarityRatingData.catalogue, ClarityRatings.swift:
// 24-39): apps of every niche whose title, niche name or «для каких задач» text contains every
// word of the query, each app once; titles containing the whole query first, then the review
// score, then the title (spec 11 §4.1). `icon` is a compact Apple CDN path (features/rating/
// media.ts builds the URL) or null. The first page is 40 rows; «Показать остальные N» asks for
// `offset=<shown>&limit=all`. PUBLIC: the whole rating is free (owner, 2026-09-25, spec 11 D2);
// the fields are listed explicitly so the payload stays small. nginx has no proxy cache, so a
// browser max-age is all there is.

const HEADERS = { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" };
const MAX_QUERY = 80;

function bad(error: string): Response {
  return Response.json({ error }, { status: 400, headers: { "X-Robots-Tag": "noindex" } });
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const l = params.get("l");
  let q = (params.get("q") ?? "").slice(0, MAX_QUERY);
  if (/[\uD800-\uDBFF]$/.test(q)) q = q.slice(0, -1); // never half of a surrogate pair
  if (!isLocale(l)) return bad("l must be one of ru, en, de, fr, ja");
  if (!q.trim()) return bad("q must not be empty");

  const rawOffset = params.get("offset") ?? "0";
  if (!/^\d{1,5}$/.test(rawOffset)) return bad("offset must be a non-negative integer");
  const rawLimit = params.get("limit") ?? String(RATING_SEARCH_PAGE);
  if (rawLimit !== "all" && rawLimit !== String(RATING_SEARCH_PAGE)) return bad(`limit must be ${RATING_SEARCH_PAGE} or all`);

  const { total, items } = searchRatingApps(l, q, Number(rawOffset), rawLimit === "all" ? "all" : RATING_SEARCH_PAGE);
  return Response.json(
    {
      total,
      items: items.map((item) => ({
        niche: item.niche,
        nicheName: item.nicheName,
        nicheLang: item.nicheLang,
        slug: item.slug,
        rank: item.rank,
        title: item.title,
        icon: item.icon,
        realScore: item.realScore,
        storeAvg: item.storeAvg,
        summary: item.summary,
        summaryLang: item.summaryLang,
      })),
    },
    { headers: HEADERS },
  );
}
