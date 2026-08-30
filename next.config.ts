import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @saverin/ui-web ships as TypeScript source (installed from a vendored tarball),
  // so Next must transpile it like first-party app code.
  transpilePackages: ["@saverin/ui-web"],
  // CI gates on `tsc --noEmit` before the SSH deploy. Re-running the type-check
  // inside `next build` on the 1.9GB prod box OOM-kills it as the bundled
  // insights.json grows, so skip the redundant in-build pass.
  typescript: { ignoreBuildErrors: true },
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
};

export default nextConfig;
