import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @saverin/ui-web ships as TypeScript source (installed from a vendored tarball),
  // so Next must transpile it like first-party app code.
  transpilePackages: ["@saverin/ui-web"],
  // CI gates on `tsc --noEmit` before the SSH deploy. Re-running the type-check
  // inside `next build` on the 1.9GB prod box OOM-kills it as the bundled
  // insights.json grows, so skip the redundant in-build pass.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
