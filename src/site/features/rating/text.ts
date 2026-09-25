import { sentences } from "../../content/text";

// Text helpers of the rating (spec 11 §8.2, §8.4). Client-safe and pure: the importer
// (scripts/v2/import-rating.ts, short names), the app page (praise and complaints as points)
// and scripts/v2/test-rating.ts share them.

// ---------------------------------------------------------------------------------------------
// Points: «Что хвалят» / «На что жалуются» as a list
// ---------------------------------------------------------------------------------------------

/** A sentence shorter than this is a fragment («Нет.», "E.g.") and joins its neighbour. */
const MIN_POINT = 12;

/**
 * The sentences of an editorial text as display points (one point = one `p`, more = a list).
 * Built on the app-wide sentence split (Intl.Segmenter keeps «0,5 кг», "0.5 kg" and «т. д.»
 * intact); a fragment shorter than 12 characters is merged into the previous point (the first
 * one into the next), so no point is a stray word.
 */
export function points(text: string, lang: string): string[] {
  const out: string[] = [];
  let pending = "";
  for (const sentence of sentences(text, lang)) {
    if (sentence.length < MIN_POINT) {
      if (out.length) out[out.length - 1] = `${out[out.length - 1]} ${sentence}`;
      else pending = pending ? `${pending} ${sentence}` : sentence;
      continue;
    }
    out.push(pending ? `${pending} ${sentence}` : sentence);
    pending = "";
  }
  if (pending) out.push(pending);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Short app names
// ---------------------------------------------------------------------------------------------

/** Separators between an app's name and its store keywords («Hevy - Workout Tracker Gym Log»). */
const TITLE_SEPARATORS = [" - ", " – ", " — ", ": ", " | "] as const;
const SHORT_MIN = 2;
const SHORT_MAX = 40;
/**
 * A separator left dangling at the end of a store title the source cut off («Password Manager-»,
 * «To Do List|», «Intermittent Fasting Tracker:»). Periods stay: some titles end in a sentence.
 */
const DANGLING = /[\s:|,\-–—]+$/u;

/**
 * A store title (or a short name) as the pages print it: without a dangling separator at the
 * end; the title itself when nothing else would be left. The data keeps the verbatim title (the
 * URL slugs, the quote and task matching and the <title>s' uniqueness rule are built on it).
 */
export function displayTitle(title: string): string {
  return title.replace(DANGLING, "") || title;
}

/**
 * The name part of a store title: the text before the first " - ", " – ", " — ", ": " or " | ",
 * trimmed, when it is 2–40 characters long; null when the title has no such head. Uniqueness is
 * the caller's rule (see `shortTitles`).
 */
export function shortTitle(title: string): string | null {
  let at = -1;
  for (const sep of TITLE_SEPARATORS) {
    const i = title.indexOf(sep);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return null;
  const head = title.slice(0, at).trim();
  return head.length >= SHORT_MIN && head.length <= SHORT_MAX ? head : null;
}

/**
 * Short display names of every app of the rating (id → store title, all niches): the head of
 * `shortTitle` — or, for a title without one, the title without its dangling separator
 * (`displayTitle`) — when no OTHER app's head or full title equals it case-insensitively (two
 * apps must never share a displayed name); else the full title. Keyed by app id.
 */
export function shortTitles(titles: ReadonlyMap<string, string>): Map<string, string> {
  const key = (s: string) => s.toLowerCase();
  // Every name an app could be shown under → the ids that could show it.
  const owners = new Map<string, Set<string>>();
  const claim = (name: string, id: string) => {
    const k = key(name);
    let set = owners.get(k);
    if (!set) owners.set(k, (set = new Set()));
    set.add(id);
  };
  const heads = new Map<string, string | null>();
  for (const [id, title] of titles) {
    const clean = displayTitle(title);
    const head = shortTitle(title) ?? (clean !== title ? clean : null);
    heads.set(id, head);
    claim(title, id);
    if (head) claim(head, id);
  }
  const out = new Map<string, string>();
  for (const [id, title] of titles) {
    const head = heads.get(id);
    out.set(id, head && owners.get(key(head))!.size === 1 ? head : title);
  }
  return out;
}
