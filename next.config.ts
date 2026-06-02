import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@saverin/ui-web"],
  // @saverin/* live in the sibling `portfolio` repo and are linked via `file:`
  // symlinks. Lift the Turbopack root to the shared parent so it can resolve
  // and watch those out-of-tree packages.
  turbopack: {
    root: join(import.meta.dirname, ".."),
  },
};

export default nextConfig;
