import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Locale URL routing (Next 16 calls this "proxy", formerly middleware).
//   /ru/<path>  → rewrite to /<path>, locale forced to ru (header + cookie)
//   /en/<path>  → rewrite to /<path>, locale forced to en
//   /<path>     → redirect to /<locale>/<path> so every URL is shareable with
//                 its language (locale from cookie, then Accept-Language).
// API, _next and static files are excluded by the matcher below.

const LOCALES = ["ru", "en"] as const;
const DEFAULT = "en";

function pickLocale(req: NextRequest): string {
  const cookie = req.cookies.get("locale")?.value;
  if (cookie === "ru" || cookie === "en") return cookie;
  const first = (req.headers.get("accept-language") || "").split(",")[0]?.toLowerCase() || "";
  return first.startsWith("ru") ? "ru" : DEFAULT;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const seg = pathname.split("/")[1];

  if ((LOCALES as readonly string[]).includes(seg)) {
    const rest = pathname.slice(seg.length + 1) || "/";
    const url = req.nextUrl.clone();
    url.pathname = rest;
    const headers = new Headers(req.headers);
    headers.set("x-locale", seg);
    const res = NextResponse.rewrite(url, { request: { headers } });
    res.cookies.set("locale", seg, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  }

  const locale = pickLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except API routes, Next internals and files with an
  // extension (favicon, images, etc.).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
