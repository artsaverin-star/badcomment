// Library sync contract of the new site (Saved + notes; docs/site-v2 DECISIONS §11, spec 02 §5–§6).
// Run: node --import tsx scripts/v2/test-library-api.ts
//
// Pure functions only (no DB, no server): the validation behind /api/site/library and
// /api/site/library/merge, the op/merge semantics shared by server and client, and the
// Saved screen's sections/filters/search model.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyOps,
  combineNotes,
  MAX_OPS,
  NOTE_MAX,
  opKey,
  parseNoteKey,
  sameLibrary,
  type LibraryState,
} from "../../src/site/features/library/protocol";
import { isKnownMaterial, parseMergeBody, parseOps } from "../../src/site/features/library/validate";
import { buildSavedView, describeMaterial, parseSavedFilter, type SavedIndex } from "../../src/site/features/library/saved-model";

describe("isKnownMaterial — launch edition only", () => {
  test("35 topics and 293 ideas are accepted", () => {
    assert.equal(isKnownMaterial("research", "interior-design"), true);
    assert.equal(isKnownMaterial("research", "habit-tracking"), true);
    assert.equal(isKnownMaterial("idea", "habit-tracking-10"), true);
    assert.equal(isKnownMaterial("idea", "interior-design-1"), true);
  });
  test("unknown slugs, wrong kinds and junk are rejected", () => {
    assert.equal(isKnownMaterial("research", "qr-scanner"), false, "non-launch topic");
    assert.equal(isKnownMaterial("idea", "habit-tracking-99"), false);
    assert.equal(isKnownMaterial("idea", "interior-design"), false, "topic slug as idea");
    assert.equal(isKnownMaterial("research", "interior-design-1"), false, "idea id as topic");
    assert.equal(isKnownMaterial("problem", "interior-design"), false, "legacy kind");
    assert.equal(isKnownMaterial("research", ""), false);
    assert.equal(isKnownMaterial("research", 42), false);
    assert.equal(isKnownMaterial("idea", "x".repeat(500)), false);
  });
});

describe("parseOps — POST /api/site/library", () => {
  test("malformed bodies are a 400", () => {
    for (const body of [null, 1, "x", [], {}, { ops: "no" }, { ops: {} }]) {
      const r = parseOps(body);
      assert.equal(r.ok, false, JSON.stringify(body));
    }
  });
  test(`more than ${MAX_OPS} ops is a 400; exactly ${MAX_OPS} is fine`, () => {
    const op = { type: "saved", kind: "idea", slug: "habit-tracking-1", saved: true };
    assert.equal(parseOps({ ops: Array(MAX_OPS + 1).fill(op) }).ok, false);
    const r = parseOps({ ops: Array(MAX_OPS).fill(op) });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.ops.length, MAX_OPS);
  });
  test("valid ops pass through in order, normalized", () => {
    const r = parseOps({
      ops: [
        { type: "saved", kind: "research", slug: "habit-tracking", saved: true, extra: 1 },
        { type: "note", kind: "idea", slug: "interior-design-2", text: "мысль" },
        { type: "saved", kind: "idea", slug: "interior-design-2", saved: false },
        { type: "note", kind: "research", slug: "habit-tracking", text: "" },
      ],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.rejected, []);
    assert.deepEqual(r.ops, [
      { type: "saved", kind: "research", slug: "habit-tracking", saved: true },
      { type: "note", kind: "idea", slug: "interior-design-2", text: "мысль" },
      { type: "saved", kind: "idea", slug: "interior-design-2", saved: false },
      { type: "note", kind: "research", slug: "habit-tracking", text: "" },
    ]);
  });
  test("bad ops are skipped and reported by index; the rest still apply", () => {
    const r = parseOps({
      ops: [
        { type: "saved", kind: "idea", slug: "habit-tracking-1", saved: true },
        { type: "saved", kind: "idea", slug: "not-an-idea", saved: true },
        { type: "saved", kind: "idea", slug: "habit-tracking-2", saved: "yes" },
        { type: "note", kind: "idea", slug: "habit-tracking-3", text: "a".repeat(NOTE_MAX + 1) },
        { type: "note", kind: "idea", slug: "habit-tracking-3", text: "a".repeat(NOTE_MAX) },
        { type: "delete", kind: "idea", slug: "habit-tracking-3" },
        { type: "note", kind: "problem", slug: "x", text: "t" },
        { type: "note", kind: "idea", slug: "habit-tracking-4", text: 5 },
        "junk",
      ],
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(
      r.ops.map((o) => opKey(o)),
      ["saved:idea:habit-tracking-1", "note:idea:habit-tracking-3"],
    );
    assert.deepEqual(
      r.rejected.map((x) => x.index),
      [1, 2, 3, 5, 6, 7, 8],
    );
    assert.match(r.rejected[0].reason, /unknown slug/);
    assert.match(r.rejected[2].reason, /longer than/);
  });
});

describe("parseMergeBody — POST /api/site/library/merge", () => {
  test("shape errors are a 400", () => {
    assert.equal(parseMergeBody(null).ok, false);
    assert.equal(parseMergeBody([]).ok, false);
    assert.equal(parseMergeBody({ research: "x" }).ok, false);
    assert.equal(parseMergeBody({ notes: [] }).ok, false);
    assert.equal(parseMergeBody({ idea: Array(1001).fill("habit-tracking-1") }).ok, false);
  });
  test("missing parts default to empty", () => {
    const r = parseMergeBody({});
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.state, { research: [], idea: [], notes: {} });
  });
  test("unknown entries are dropped, duplicates keep the newest (first) position, notes are cut", () => {
    const r = parseMergeBody({
      research: ["habit-tracking", "qr-scanner", "habit-tracking", "interior-design"],
      idea: ["interior-design-1", 7, "old-idea-1", "interior-design-1", "habit-tracking-2"],
      notes: {
        "idea:interior-design-1": "keep",
        "research:habit-tracking": "  ",
        "idea:old-idea-1": "dropped",
        "problem:x": "dropped",
        nokey: "dropped",
        "research:interior-design": "b".repeat(NOTE_MAX + 50),
        "idea:habit-tracking-2": 12,
      },
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.state.research, ["habit-tracking", "interior-design"]);
    assert.deepEqual(r.state.idea, ["interior-design-1", "habit-tracking-2"]);
    assert.deepEqual(Object.keys(r.state.notes).sort(), ["idea:interior-design-1", "research:interior-design"]);
    assert.equal(r.state.notes["research:interior-design"].length, NOTE_MAX);
    assert.equal(r.dropped, 7);
  });
});

describe("protocol helpers", () => {
  test("parseNoteKey", () => {
    assert.deepEqual(parseNoteKey("idea:habit-tracking-1"), { kind: "idea", slug: "habit-tracking-1" });
    assert.deepEqual(parseNoteKey("research:a:b"), { kind: "research", slug: "a:b" });
    assert.equal(parseNoteKey("problem:x"), null);
    assert.equal(parseNoteKey("idea:"), null);
    assert.equal(parseNoteKey(":x"), null);
  });

  test("applyOps mirrors the store: newest first, re-save keeps place, blank note deletes", () => {
    const base: LibraryState = { research: ["b"], idea: ["i1", "i2"], notes: { "idea:i1": "n" } };
    const next = applyOps(base, [
      { type: "saved", kind: "research", slug: "a", saved: true },
      { type: "saved", kind: "idea", slug: "i2", saved: true },
      { type: "saved", kind: "idea", slug: "i1", saved: false },
      { type: "note", kind: "idea", slug: "i1", text: "  " },
      { type: "note", kind: "research", slug: "a", text: "new" },
    ]);
    assert.deepEqual(next, { research: ["a", "b"], idea: ["i2"], notes: { "research:a": "new" } });
    assert.deepEqual(base, { research: ["b"], idea: ["i1", "i2"], notes: { "idea:i1": "n" } }, "input not mutated");
  });

  test("combineNotes never loses text", () => {
    assert.equal(combineNotes(undefined, undefined), null);
    assert.equal(combineNotes("  ", ""), null);
    assert.equal(combineNotes(undefined, "local"), "local");
    assert.equal(combineNotes("account", undefined), "account");
    assert.equal(combineNotes("same", "same"), "same");
    assert.equal(combineNotes("long account text", "account"), "long account text");
    assert.equal(combineNotes("short", "short and more"), "short and more");
    assert.equal(combineNotes("A", "B"), "A\n\nB");
    assert.equal(combineNotes("a".repeat(NOTE_MAX), "b")?.length, NOTE_MAX);
  });

  test("sameLibrary", () => {
    const a: LibraryState = { research: ["x"], idea: [], notes: { "idea:y": "1" } };
    assert.equal(sameLibrary(a, { research: ["x"], idea: [], notes: { "idea:y": "1" } }), true);
    assert.equal(sameLibrary(a, { research: ["x"], idea: [], notes: { "idea:y": "2" } }), false);
    assert.equal(sameLibrary(a, { research: [], idea: [], notes: { "idea:y": "1" } }), false);
  });
});

describe("Saved screen model (spec 02 §6.4–§6.8, 09 G12)", () => {
  const index: SavedIndex = {
    topics: {
      "habit-tracking": { name: "Трекеры привычек", thumb: "/media/h.webp" },
      "interior-design": { name: "Дизайн интерьера", thumb: "/media/i.webp" },
    },
    ideas: {
      "interior-design-1": { category: "interior-design", thumb: "/media/i1.webp", title: "Новая комната" },
      "habit-tracking-3": { category: "habit-tracking", thumb: "/media/h3.webp" }, // locked for this viewer
    },
  };
  const labels = {
    research: "Разбор",
    idea: "Идея",
    ideaLocked: "Идея в Plus",
    ideaMissing: "Идея недоступна",
    researchMissing: "Разбор недоступен",
  };
  const library = {
    research: ["habit-tracking", "gone-topic"],
    idea: ["habit-tracking-3", "interior-design-1"],
    notes: {
      "research:interior-design": "про цвет стен",
      "idea:interior-design-1": "проверить план",
      "idea:habit-tracking-3": "секретная мысль",
    },
  };
  const view = (filter: "all" | "research" | "ideas" | "notes", query = "", plus = false) =>
    buildSavedView(library, index, { filter, query, locale: "ru", labels, plus });

  test("rows: locked idea = art + «Идея в Plus», no category; unknown topic = «Разбор недоступен», no art", () => {
    assert.deepEqual(describeMaterial("idea", "habit-tracking-3", index, labels, false), {
      title: "Идея в Plus",
      detail: "",
      thumb: "/media/h3.webp",
      locked: true,
    });
    assert.deepEqual(describeMaterial("idea", "interior-design-1", index, labels, false), {
      title: "Новая комната",
      detail: "Дизайн интерьера",
      thumb: "/media/i1.webp",
      locked: false,
    });
    assert.equal(describeMaterial("research", "gone-topic", index, labels, false).title, "Разбор недоступен");
    assert.equal(describeMaterial("research", "gone-topic", index, labels, false).thumb, null);
    assert.equal(describeMaterial("idea", "unknown-1", index, labels, false).title, "Идея в Plus");
    assert.equal(describeMaterial("idea", "unknown-1", index, labels, true).title, "Идея недоступна");
  });

  test("«Всё»: bookmarks newest first + only loose notes; total counts loose notes", () => {
    const v = view("all");
    assert.equal(v.total, 5); // 2 research + 2 ideas + 1 loose note (research:interior-design)
    assert.deepEqual(
      v.sections.map((s) => [s.id, s.rows.map((r) => r.slug)]),
      [
        ["research", ["habit-tracking", "gone-topic"]],
        ["ideas", ["habit-tracking-3", "interior-design-1"]],
        ["notes", ["interior-design"]],
      ],
    );
    const notesRow = v.sections[2].rows[0];
    assert.equal(notesRow.detail, "Разбор");
    assert.equal(notesRow.thumb, null);
    assert.equal(v.sections[1].rows[1].note, "проверить план", "bookmarked material shows its note preview");
  });

  test("«Заметки»: every note, sorted by key (idea:* before research:*)", () => {
    const v = view("notes");
    assert.deepEqual(
      v.sections.map((s) => [s.id, s.rows.map((r) => `${r.kind}:${r.slug}`)]),
      [["notes", ["idea:habit-tracking-3", "idea:interior-design-1", "research:interior-design"]]],
    );
    assert.equal(v.sections[0].rows[0].title, "Идея в Plus");
    assert.equal(v.sections[0].rows[0].detail, "Идея");
  });

  test("«Разборы» / «Идеи» show one section", () => {
    assert.deepEqual(view("research").sections.map((s) => s.id), ["research"]);
    assert.deepEqual(view("ideas").sections.map((s) => s.id), ["ideas"]);
  });

  test("search: every token in some field (title, detail, note); case-insensitive; locked ideas only by their label or note", () => {
    assert.deepEqual(
      view("all", "ПЛАН").sections.map((s) => [s.id, s.rows.map((r) => r.slug)]),
      [["ideas", ["interior-design-1"]]],
    );
    assert.deepEqual(
      view("all", "интерьера новая").sections.map((s) => s.rows.map((r) => r.slug)),
      [["interior-design-1"]],
    );
    assert.deepEqual(
      view("ideas", "секретная").sections.map((s) => s.rows.map((r) => r.slug)),
      [["habit-tracking-3"]],
    );
    assert.deepEqual(view("ideas", "привычек").sections, [], "locked idea does not match its category");
    assert.deepEqual(view("all", "нет-такого").sections, []);
  });

  test("parseSavedFilter", () => {
    assert.equal(parseSavedFilter("notes"), "notes");
    assert.equal(parseSavedFilter(["ideas", "x"]), "ideas");
    assert.equal(parseSavedFilter("NOTES"), "all");
    assert.equal(parseSavedFilter(undefined), "all");
  });
});
