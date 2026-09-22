// Client-safe ports of the app's catalogue search and ordering
// (ClarityCatalogs.swift; spec 04 §3.3–§3.4, spec 01 §4, spec 02 §2.2–§2.4).
//
// Research search runs on the SERVER (its haystack contains locked article
// text; spec 09 G10). Idea search may run on the client over an
// entitlement-scoped haystack (readable ideas only).

import { compareNames, matchesQuery, normalizeForSearch } from "./text";
import type { CatalogCategory, CatalogIdea, LocaleCode, SearchFile } from "./types";

/**
 * Research catalogue results for `query` (slugs).
 * Empty query → catalogue order. Otherwise: matches over [name, summary, ...body],
 * sorted by relevance (0 = name matches, 1 = summary matches, 2 = other), then
 * by name with the locale collator.
 */
export function searchResearch(
  index: Pick<SearchFile, "research">,
  categories: readonly Pick<CatalogCategory, "slug" | "name">[],
  query: string,
  locale: LocaleCode,
): string[] {
  if (query.trim() === "") return categories.map((c) => c.slug);
  const results: { slug: string; name: string; relevance: number }[] = [];
  for (const category of categories) {
    const entry = index.research[category.slug];
    if (!entry) continue;
    if (!matchesQuery(query, [entry.name, entry.summary, ...entry.body], locale)) continue;
    const relevance = matchesQuery(query, [entry.name], locale)
      ? 0
      : matchesQuery(query, [entry.summary], locale)
        ? 1
        : 2;
    results.push({ slug: category.slug, name: category.name, relevance });
  }
  results.sort((a, b) => a.relevance - b.relevance || compareNames(a.name, b.name, locale));
  return results.map((r) => r.slug);
}

/** True when an idea haystack (from search.json, already normalized) matches `query`. */
export function ideaMatches(haystack: readonly string[] | undefined, query: string, locale: LocaleCode): boolean {
  if (query.trim() === "") return true;
  return !!haystack && matchesQuery(query, haystack, locale);
}

/**
 * Ideas catalogue order: for viewers without Plus the free ideas come first in
 * FREE order; then rank ascending, slug as the tie-break.
 */
export function orderIdeas<T extends Pick<CatalogIdea, "slug" | "rank">>(
  ideas: readonly T[],
  options: { plus: boolean; freeIdeas: readonly string[] },
): T[] {
  const free = options.freeIdeas;
  return [...ideas].sort((a, b) => {
    if (!options.plus) {
      const left = free.indexOf(a.slug);
      const right = free.indexOf(b.slug);
      if (left !== right && (left >= 0 || right >= 0)) {
        return (left < 0 ? Number.MAX_SAFE_INTEGER : left) - (right < 0 ? Number.MAX_SAFE_INTEGER : right);
      }
    }
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

/**
 * Ideas catalogue filter: category filter AND (empty query OR (readable AND
 * matches)). Locked ideas never match a non-empty query.
 */
export function filterIdeas<T extends Pick<CatalogIdea, "slug" | "category">>(
  ideas: readonly T[],
  options: {
    query: string;
    category?: string | null;
    locale: LocaleCode;
    canRead: (slug: string) => boolean;
    haystacks: Readonly<Record<string, readonly string[]>>;
  },
): T[] {
  const q = options.query.trim();
  return ideas.filter(
    (idea) =>
      (!options.category || idea.category === options.category) &&
      (q === "" || (options.canRead(idea.slug) && ideaMatches(options.haystacks[idea.slug], q, options.locale))),
  );
}

/** Category picker rows: the 35 names sorted with the locale collator, filtered by a plain substring. */
export function pickerCategories<T extends Pick<CatalogCategory, "slug" | "name">>(
  categories: readonly T[],
  filter: string,
  locale: LocaleCode,
): T[] {
  const sorted = [...categories].sort((a, b) => compareNames(a.name, b.name, locale));
  const f = normalizeForSearch(filter.trim(), locale);
  if (!f) return sorted;
  return sorted.filter((c) => normalizeForSearch(c.name, locale).includes(f));
}
