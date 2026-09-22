// The export document: one UTF-8 text with the full category breakdown, the whole idea and
// the viewer's note — a byte-for-byte port of the app's ClarityExportDocument.text
// (spec 02 §7.3, spec 04 §5.10) and of its filename rule (spec 02 §7.4).
//
// Pure and client-safe (no server imports). The GATED inputs (IdeaFile, ResearchFile) are
// loaded by the export route only after the viewer passed canReadIdea — see
// src/app/api/site/export/[id]/route.ts. The site's client asks for parts 1–2 only and adds
// the browser's note with withNote() (spec 09 G10: the note stays on the device).
//
// Format:
//   parts joined by one blank line ("\n\n"), then a final "\n";
//   inside a part, a title and its body are separated by a single "\n";
//   add(title, body) skips a part whose body is blank;
//   quotes are wrapped in «» in every locale (spec 09 G14);
//   research text is used raw (no reflow, NBSPs kept), exactly like the app.

import type { IdeaFile, ResearchFile } from "@/site/content/types";

/** App UI translator keyed by the Russian source (getT(L) on the server). */
export type Translate = (ru: string) => string;

/**
 * Research input: the full article when the viewer may read the category, otherwise only the
 * public summary (web-only safeguard for legacy single-idea unlocks: the app has no such case).
 */
export type ExportResearch = { kind: "full"; article: ResearchFile } | { kind: "summary"; summary: string } | null;

const quoted = (text: string) => `«${text}»`;

/** EditorialContent.document → IdeaArticles.document (article layout; note passed as nil). */
export function ideaDocument(idea: Pick<IdeaFile, "title" | "categoryName" | "description" | "blocks">): string {
  const paragraphs = [idea.title, idea.categoryName, idea.description];
  for (const block of idea.blocks) {
    switch (block.kind) {
      case "paragraph":
      case "heading":
        paragraphs.push(block.text);
        break;
      case "idea":
        paragraphs.push(`${block.title}\n${block.text}`);
        break;
      case "quote":
        paragraphs.push(quoted(block.quote.text));
        break;
    }
  }
  return paragraphs.join("\n\n");
}

/** ClarityExportDocument.text(idea:library:audience:note:). */
export function exportDocument({
  idea,
  research,
  note,
  t,
}: {
  idea: Pick<IdeaFile, "title" | "categoryName" | "description" | "blocks">;
  research: ExportResearch;
  note: string;
  t: Translate;
}): string {
  const parts: string[] = [t("inApp · Идея и разбор категории"), t("1. РАЗБОР КАТЕГОРИИ"), idea.categoryName];
  const add = (title: string, body: string) => {
    if (body.trim() === "") return;
    parts.push(title === "" ? body : `${title}\n${body}`);
  };

  if (research?.kind === "full") {
    const a = research.article;
    add("", a.summary);
    add("", a.lead);
    if (a.audiences.length > 0) parts.push(t("КАКИЕ ЗАДАЧИ РЕШАЮТ ЛЮДИ"));
    for (const audience of a.audiences) add(audience.title, audience.body);
    for (const section of a.sections) {
      parts.push(section.title);
      add("", section.intro);
      for (const observation of section.observations) {
        add(observation.title, observation.passages.join("\n\n"));
        for (const quote of observation.quotes) add("", quoted(quote.text));
        for (const placement of observation.placements) add(placement.title, placement.body);
      }
    }
    for (const placement of a.remainingDirections) add(placement.title, placement.body);
    if (a.conclusion) add(a.conclusion.title, a.conclusion.body);
  } else if (research?.kind === "summary") {
    add("", research.summary);
  } else {
    parts.push(t("Разбор этой архивной категории отсутствует в текущем сборнике."));
  }

  parts.push(t("2. ИДЕЯ"));
  parts.push(ideaDocument(idea));
  return withNote(parts.join("\n\n") + "\n", note, t);
}

/**
 * Part 3 «3. МОЯ ЗАМЕТКА» appended to a finished document (parts 1–2, ending in "\n"):
 * the same bytes as ClarityExportDocument.text with the note (ClarityExportDocument.swift:61-62).
 */
export function withNote(doc: string, note: string, t: Translate): string {
  if (note.trim() === "") return doc;
  return `${doc.endsWith("\n") ? doc.slice(0, -1) : doc}\n\n${t("3. МОЯ ЗАМЕТКА")}\n${note}\n`;
}

const graphemes = (text: string): string[] => {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
};

/**
 * ClarityExportDocument.filename + ".txt": "inApp — " + the first 100 characters of the
 * article title with / \ : * ? " < > | and line breaks replaced by a space. The double dot
 * after a title ending in "." is the app's behaviour (spec 02 §7.4).
 */
export function exportFilename(title: string): string {
  const clean = title.replace(/[/\\:*?"<>|\n\r]/g, " ");
  return `inApp — ${graphemes(clean).slice(0, 100).join("")}.txt`;
}

/**
 * RFC 6266 Content-Disposition: the UTF-8 name, plus `fallback` (ASCII, e.g. "inApp-<id>.txt")
 * for old clients when the name is not plain ASCII.
 */
export function contentDisposition(filename: string, fallback = "inApp.txt"): string {
  const ascii = /^[\x20-\x7e]*$/.test(filename) ? filename.replace(/["\\]/g, " ") : fallback;
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
