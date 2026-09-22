import "server-only";

import type { Viewer } from "@/site/access";
import { getCatalog, getIdea, getResearch } from "@/site/content";
import type { Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isLaunchIdea } from "@/site/manifest.generated";
import { exportDocument, exportFilename, type ExportResearch } from "./document";

// Server side of «Скачать документ» (spec 02 §7, spec 09 G10). The gate runs BEFORE any
// gated file is read: export is allowed iff the idea is readable (the app has no quota).

/** Largest accepted note (the library's cap, spec 09 G10). */
export { NOTE_MAX as EXPORT_NOTE_MAX } from "@/site/features/library/protocol";

export type ExportResult =
  /** `research`: what part 1 holds — the full breakdown, only the public summary, or nothing. */
  | { ok: true; text: string; filename: string; research: "full" | "summary" | "none" }
  | { ok: false; status: 401 | 403 | 404; error: string };

/** `note` is optional: the site's client appends it itself (withNote), so it never leaves the browser. */
export async function buildIdeaExport(
  locale: Locale,
  id: string,
  viewer: Viewer,
  note = "",
): Promise<ExportResult> {
  if (!isLaunchIdea(id)) return { ok: false, status: 404, error: "unknown idea" };
  if (!viewer.canReadIdea(id)) {
    return viewer.loggedIn
      ? { ok: false, status: 403, error: "the idea is in Plus" }
      : { ok: false, status: 401, error: "sign in or unlock Plus to export this idea" };
  }
  const idea = await getIdea(locale, id);
  if (!idea) return { ok: false, status: 404, error: "unknown idea" };

  // The whole category breakdown goes into the file (app parity). A viewer who can read this
  // idea but not its category (a legacy single-idea unlock) gets only the public summary.
  let research: ExportResearch = null;
  if (viewer.canReadResearch(idea.category)) {
    const article = await getResearch(locale, idea.category);
    if (article) research = { kind: "full", article };
  } else {
    const catalog = await getCatalog(locale);
    const summary = catalog.categories.find((c) => c.slug === idea.category)?.summary;
    if (summary) research = { kind: "summary", summary };
  }

  const t = await getT(locale);
  return {
    ok: true,
    text: exportDocument({ idea, research, note, t: (s) => t(s) }),
    filename: exportFilename(idea.title),
    research: research?.kind ?? "none",
  };
}
