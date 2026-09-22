import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @saverin/ui-web ships as TypeScript source (installed from a vendored tarball),
  // so Next must transpile it like first-party app code.
  transpilePackages: ["@saverin/ui-web"],
  // CI gates on `tsc --noEmit` before the SSH deploy. Re-running the type-check
  // inside `next build` on the 1.9GB prod box OOM-kills it as the bundled
  // insights.json grows, so skip the redundant in-build pass.
  typescript: { ignoreBuildErrors: true },
  // Two root layouts (old site, new site): unmatched URLs render src/app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  outputFileTracingIncludes: {
    "/segment/*": ["./src/data/marketPlayers/*.json"],
  },
  // OAuth discovery for the MCP server. App-router folders can't start with a
  // dot, so the well-known paths are rewritten onto normal API routes. The
  // path-suffixed variant is RFC 9728's per-resource form some clients probe.
  async rewrites() {
    return [
      { source: "/.well-known/oauth-authorization-server", destination: "/api/mcp/oauth/meta/as" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/mcp/oauth/meta/as" },
      { source: "/.well-known/oauth-protected-resource", destination: "/api/mcp/oauth/meta/pr" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/mcp/oauth/meta/pr" },
    ];
  },
  // Files in public/ get `Cache-Control: public, max-age=0` by default, so every view
  // re-validates each image with Node (1,500+ WebP in public/media). These folders
  // change only with a deploy: cache them for a week. Their names are not
  // content-hashed, so to replace an image quickly give it a new file name.
  // Next's static sender keeps a Cache-Control that is already set. nginx serves the
  // same folders with the same value (deploy/nginx-badcomment.conf).
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    // Files only (`name.ext`): an extensionless path there is not a file and must not get
    // the proxy's locale redirect cached for a week.
    return ["media", "brand", "badges"].map((dir) => ({ source: `/${dir}/:file(.+\\.\\w+)`, headers: week }));
  },
};

export default nextConfig;
