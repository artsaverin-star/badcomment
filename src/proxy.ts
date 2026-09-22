import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decideRoute, PROXY_REQUEST_HEADERS } from "@/site/routing/decide";
import { LOCALE_COOKIE } from "@/site/i18n/locales";

// Public URL routing for the new site, the old site in place and the hidden archive
// (Next 16 calls this file "proxy", formerly middleware). Every rule lives in the pure
// decideRoute() (src/site/routing/decide.ts, tested by scripts/v2/test-routing.ts);
// this file only turns the decision into a NextResponse.
//
// NextResponse.rewrite propagates the RSC headers upstream, so client navigations and
// prefetches go through exactly the same logic as full page loads.

export function proxy(req: NextRequest) {
  const decision = decideRoute({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.search,
    cookies: { locale: req.cookies.get(LOCALE_COOKIE)?.value ?? null },
    acceptLanguage: req.headers.get("accept-language"),
  });

  if (decision.type === "redirect") {
    const url = req.nextUrl.clone();
    const q = decision.location.indexOf("?");
    url.pathname = q === -1 ? decision.location : decision.location.slice(0, q);
    url.search = q === -1 ? "" : decision.location.slice(q);
    return NextResponse.redirect(url, decision.status);
  }

  const url = req.nextUrl.clone();
  url.pathname = decision.pathname;
  url.search = decision.search;

  const headers = new Headers(req.headers);
  for (const name of PROXY_REQUEST_HEADERS) headers.delete(name);
  for (const [name, value] of Object.entries(decision.requestHeaders)) headers.set(name, value);

  const res = NextResponse.rewrite(url, { request: { headers } });
  for (const [name, value] of Object.entries(decision.responseHeaders)) res.headers.set(name, value);
  for (const c of decision.cookies) {
    res.cookies.set(c.name, c.value, { path: c.path, maxAge: c.maxAge, sameSite: c.sameSite });
  }
  return res;
}

export const config = {
  // Everything except: API routes, Next internals, generated metadata image routes (no file
  // extension, so they would otherwise get a locale redirect), /.well-known/* and any path
  // with a file extension (public files, sitemap.xml, robots.txt, feed.xml, llms*.txt).
  // Segment-exact (`api/`, `icon$`…) so pages like /icons or /apis are still routed.
  matcher: [
    "/((?!api(?:/|$)|_next/|\\.well-known(?:/|$)|icon(?:/|$)|apple-icon(?:/|$)|opengraph-image|twitter-image|.*\\..*).*)",
  ],
};
