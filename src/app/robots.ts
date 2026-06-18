import type { MetadataRoute } from "next";

// /robots.txt — contains a dot, so the locale proxy (matcher excludes `.*\..*`)
// skips it and Next serves this generated file directly.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://inapp.pro/sitemap.xml",
    host: "https://inapp.pro",
  };
}
