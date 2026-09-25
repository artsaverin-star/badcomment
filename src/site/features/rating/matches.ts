// Search matching of the rating (spec §3.0 «Search matching»). Client-safe and pure: the server
// search (sitedata/rating.ts searchRatingApps), the niche page's client filter and the importer
// (scripts/v2/import-rating.ts, normalizedTitle) share it.
//
//   matches(query, fields, L)        StudioContent.matches (Studio/StudioDomain.swift:79-82): every
//                                    whitespace token of the query is contained in some field,
//                                    case- and diacritic-insensitively (localizedStandardContains).
//                                    An empty query matches everything.
//   titleContains(query, L)          the search's first tier (spec 11 §4.1): a predicate "the
//                                    title contains the whole trimmed, folded query".
//   normalizedTitle(s)               ClarityRatingData.normalized (:41-43): lowercased letters,
//                                    marks and digits only (CharacterSet.alphanumerics). Joins
//                                    review quotes and scenario app names to rated apps.
//
// Folding reuses the app-wide search port (content/text.ts normalizeForSearch): NFKC, locale
// lowercase, marks removed — the same fold the research and ideas searches use.

import { matchesTokens, normalizeForSearch, queryTokens } from "../../content/text";

/** The folded form of a haystack or a query (case-, width- and diacritic-insensitive). */
export function foldSearch(text: string, locale: string): string {
  return normalizeForSearch(text, locale);
}

/** Folded, de-duplicated query tokens (split on whitespace). No tokens = match everything. */
export function searchTokens(query: string, locale: string): string[] {
  return queryTokens(query, locale);
}

/** Every token is contained in some field; `foldedFields` must come from foldSearch. */
export function matchesFolded(tokens: readonly string[], foldedFields: readonly string[]): boolean {
  return matchesTokens(tokens, foldedFields);
}

/** StudioContent.matches over raw fields (null/undefined fields are skipped). */
export function matches(query: string, fields: readonly (string | null | undefined)[], locale: string): boolean {
  const tokens = searchTokens(query, locale);
  if (tokens.length === 0) return true;
  return matchesFolded(
    tokens,
    fields.filter((f): f is string => !!f).map((f) => foldSearch(f, locale)),
  );
}

/**
 * "The title contains the whole trimmed query" (`localizedStandardContains`), folded like every
 * search here; memoised per title. An empty query contains nothing (no tier).
 */
export function titleContains(query: string, locale: string): (title: string) => boolean {
  const q = foldSearch(query.trim(), locale);
  const hit = new Map<string, boolean>();
  return (title) => {
    let v = hit.get(title);
    if (v === undefined) {
      v = q !== "" && foldSearch(title, locale).includes(q);
      hit.set(title, v);
    }
    return v;
  };
}

/** ClarityRatingData.normalized: `lowercased()` keeping only letters, marks and digits. */
export function normalizedTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}
