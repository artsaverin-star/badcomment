import type { NextConfig } from "next";
import slugs from "./src/data/app-slugs.json";

// Map any inbound legacy /product/<productId>/... or /product/<productId> URL
// back to the new /<slug> path. Old segment querystrings (/?seg=<slug>) are
// rewritten to /segment/<slug> below.
const productRedirects = Object.entries(slugs as Record<string, string>).flatMap(([slug, id]) => [
  { source: `/product/${id}/insights`, destination: `/${slug}`, permanent: true },
  { source: `/product/${id}`, destination: `/${slug}`, permanent: true },
]);

const nextConfig: NextConfig = {
  // @saverin/ui-web ships as TypeScript source (installed from a vendored tarball),
  // so Next must transpile it like first-party app code.
  transpilePackages: ["@saverin/ui-web"],
  async redirects() {
    return [
      ...productRedirects,
      { source: "/", has: [{ type: "query", key: "seg", value: "(?<slug>.*)" }], destination: "/segment/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
