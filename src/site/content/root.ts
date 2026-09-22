// The one place that resolves the generated app content root (content/v2), for every
// server-side reader: the content loaders (./index) and the UI strings (../i18n/server).
// CONTENT_V2_DIR overrides it (resolved against the process cwd); see content/v2/README.md.

import "server-only";

import path from "node:path";

export const CONTENT_ROOT = process.env.CONTENT_V2_DIR
  ? path.resolve(process.env.CONTENT_V2_DIR)
  : path.join(process.cwd(), "content", "v2");
