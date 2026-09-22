import { headers } from "next/headers";

// Server-only view of the proxy contract for OLD pages (docs/site-v2/ARCHITECTURE.md §3).
// The proxy sets these request headers when it rewrites a public URL to an old page:
//   x-ia-site         "old" (under /<L>/old/…) | "inplace" (old page at its original URL)
//   x-ia-public-path  the public path that was requested
//   x-ia-new-path     public URL of the new-site equivalent, else /<L>
//   x-ia-soon         "1" for an in-place /segment/<slug> of a topic not yet in the new format
// Missing headers (local dev without the new proxy) → site null: render nothing extra.

export type OldSiteMode = "old" | "inplace";

export type OldSiteContext = {
  site: OldSiteMode | null;
  publicPath: string | null;
  newPath: string | null;
  soon: boolean;
};

/** Accepts only same-origin absolute paths ("/x", never "//host" or "https://…"). */
function safePath(v: string | null): string | null {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

export async function getOldSiteContext(): Promise<OldSiteContext> {
  const h = await headers();
  const s = h.get("x-ia-site");
  return {
    site: s === "old" || s === "inplace" ? s : null,
    publicPath: safePath(h.get("x-ia-public-path")),
    newPath: safePath(h.get("x-ia-new-path")),
    soon: h.get("x-ia-soon") === "1",
  };
}

export async function getOldSiteMode(): Promise<OldSiteMode | null> {
  return (await getOldSiteContext()).site;
}
