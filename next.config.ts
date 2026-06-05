import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @saverin/ui-web ships as TypeScript source (installed from a vendored tarball),
  // so Next must transpile it like first-party app code.
  transpilePackages: ["@saverin/ui-web"],
};

export default nextConfig;
