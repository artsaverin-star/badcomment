// «Сохранённое» as data: rows, sections, filters and search (spec 02 §6.4–§6.8, spec 09 G12).
// Pure and client-safe; the screen (./SavedScreen.tsx) renders what this returns.

import { matchesQuery } from "../../content/text";
import type { LocaleCode } from "../../content/types";
import type { SavedFilter } from "../../routing";
import type { MaterialKind } from "./protocol";

export type { SavedFilter };
export const SAVED_FILTERS: readonly SavedFilter[] = ["all", "research", "ideas", "notes"];

export function parseSavedFilter(value: string | string[] | null | undefined): SavedFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return (SAVED_FILTERS as readonly string[]).includes(v ?? "") ? (v as SavedFilter) : "all";
}

/**
 * Compact public index the server hands to the Saved screen. Every launch topic and idea
 * has a thumbnail; `title` exists ONLY for ideas this viewer can read (paid text never
 * reaches a viewer without access — spec 04 §7.6, spec 09 G10).
 */
export type SavedIndex = {
  topics: Record<string, { name: string; thumb: string }>;
  ideas: Record<string, { category: string; thumb: string; title?: string }>;
};

/** Translated labels the rows need (app strings). */
export type SavedLabels = {
  research: string; // «Разбор» (detail of research rows, kind of note rows)
  idea: string; // «Идея»
  ideaLocked: string; // «Идея в Plus»
  ideaMissing: string; // «Идея недоступна»
  researchMissing: string; // «Разбор недоступен»
};

export type SavedRow = {
  /** Unique within the screen. */
  key: string;
  kind: MaterialKind;
  slug: string;
  title: string;
  /** "" = none (locked ideas show no category). */
  detail: string;
  /** Thumbnail URL, or null → the kind glyph. */
  thumb: string | null;
  /** The user's note ("" = none). */
  note: string;
  /** Locked idea (art + «Идея в Plus»). */
  locked: boolean;
};

export type SavedSectionId = "research" | "ideas" | "notes";
export type SavedSection = { id: SavedSectionId; rows: SavedRow[] };

type Library = {
  research: readonly string[];
  idea: readonly string[];
  notes: Readonly<Record<string, string>>;
};

export type SavedView = {
  /** Bookmarks + loose notes (the app's `total`, without the legacy stores). 0 → empty library. */
  total: number;
  /** Visible sections in order, non-empty only. */
  sections: SavedSection[];
};

/** Title/detail/thumb of a material (spec 02 §6.6, G12 for unknown slugs). */
export function describeMaterial(
  kind: MaterialKind,
  slug: string,
  index: SavedIndex,
  labels: SavedLabels,
  plus: boolean,
): { title: string; detail: string; thumb: string | null; locked: boolean } {
  if (kind === "research") {
    const topic = index.topics[slug];
    return topic
      ? { title: topic.name, detail: labels.research, thumb: topic.thumb, locked: false }
      : { title: labels.researchMissing, detail: labels.research, thumb: null, locked: false };
  }
  const idea = index.ideas[slug];
  if (!idea) {
    // The app: canReadIdea ? (cardTitle ?? «Идея недоступна») : «Идея в Plus».
    return { title: plus ? labels.ideaMissing : labels.ideaLocked, detail: "", thumb: null, locked: !plus };
  }
  if (idea.title === undefined) return { title: labels.ideaLocked, detail: "", thumb: idea.thumb, locked: true };
  return { title: idea.title, detail: index.topics[idea.category]?.name ?? "", thumb: idea.thumb, locked: false };
}

export function buildSavedView(
  library: Library,
  index: SavedIndex,
  opts: { filter: SavedFilter; query: string; locale: LocaleCode; labels: SavedLabels; plus: boolean },
): SavedView {
  const { labels, plus } = opts;
  const noteOf = (kind: MaterialKind, slug: string) => library.notes[`${kind}:${slug}`] ?? "";

  const material = (kind: MaterialKind, slug: string, prefix = ""): SavedRow => ({
    key: `${prefix}${kind}:${slug}`,
    kind,
    slug,
    note: noteOf(kind, slug),
    ...describeMaterial(kind, slug, index, labels, plus),
  });

  const research = library.research.map((slug) => material("research", slug));
  const ideas = library.idea.map((slug) => material("idea", slug));

  // Notes: sorted by "<kind>:<slug>" ascending (idea:* before research:*), not by recency.
  const noteRows: { row: SavedRow; loose: boolean }[] = [];
  for (const key of Object.keys(library.notes).sort()) {
    if (!library.notes[key]?.trim()) continue;
    const i = key.indexOf(":");
    const kind = key.slice(0, i);
    const slug = key.slice(i + 1);
    if (kind !== "research" && kind !== "idea") continue;
    const row = material(kind, slug, "note:");
    // Note rows: detail = the kind («Идея» / «Разбор»), the note glyph instead of art.
    row.detail = kind === "idea" ? labels.idea : labels.research;
    row.thumb = null;
    noteRows.push({ row, loose: !library[kind].includes(slug) });
  }
  const looseNotes = noteRows.filter((n) => n.loose).map((n) => n.row);
  const allNotes = noteRows.map((n) => n.row);

  const total = research.length + ideas.length + looseNotes.length;
  const q = opts.query;
  const match = (row: SavedRow) => matchesQuery(q, [row.title, row.detail, row.note], opts.locale, true);

  const candidates: SavedSection[] =
    opts.filter === "research"
      ? [{ id: "research", rows: research }]
      : opts.filter === "ideas"
        ? [{ id: "ideas", rows: ideas }]
        : opts.filter === "notes"
          ? [{ id: "notes", rows: allNotes }]
          : [
              { id: "research", rows: research },
              { id: "ideas", rows: ideas },
              { id: "notes", rows: looseNotes },
            ];

  const sections = candidates
    .map((s) => ({ id: s.id, rows: q.trim() ? s.rows.filter(match) : s.rows }))
    .filter((s) => s.rows.length > 0);

  return { total, sections };
}
