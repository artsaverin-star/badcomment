"use client";

import { useRef, useState } from "react";
import { ArrowRightIcon, SearchIcon } from "@/site/ui/icons";

// Compact feed controls (SPEC «Лента»): the category picker and an optional title search — the
// only controls (the kind switch was removed on 2026-09-25). A plain GET form over the page's
// query params (?category=&q=), so it works without JavaScript;
// with it, picking a category with the pointer submits at once. A keyboard change never leaves
// the page by itself (WCAG 3.2.2: arrow keys on a closed <select> fire `change` in Chrome/Firefox
// on Windows and Linux): it shows a «Показать» button instead, and Enter on the select submits.
// Receives names and interface strings only.

export type PulseFilterStrings = {
  category: string;
  allCategories: string;
  search: string;
  searchPlaceholder: string;
  searchSubmit: string;
  apply: string;
};

export function PulseFilters({
  action,
  category,
  query,
  options,
  strings: s,
}: {
  action: string;
  category: string;
  query: string;
  options: { id: string; name: string }[];
  strings: PulseFilterStrings;
}) {
  const form = useRef<HTMLFormElement>(null);
  // Whether the select's latest interaction was a key press (true) or a pointer press (false).
  const keyboard = useRef(false);
  const [pending, setPending] = useState(false);
  return (
    <form ref={form} action={action} method="get" className="ia-pulse-filters" role="search">
      <label className="ia-pulse-select">
        <span className="ia-pulse-sr-only">{s.category}</span>
        <select
          name="category"
          defaultValue={category}
          onPointerDown={() => {
            keyboard.current = false;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") form.current?.requestSubmit();
            else if (event.key !== "Tab") keyboard.current = true;
          }}
          onChange={(event) => {
            if (keyboard.current) setPending(event.currentTarget.value !== category);
            else form.current?.requestSubmit();
          }}
        >
          <option value="">{s.allCategories}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      {pending ? (
        <button type="submit" className="ia-pulse-filters__apply">
          {s.apply}
        </button>
      ) : null}
      <details className="ia-pulse-search" open={query !== "" || undefined}>
        <summary>
          <SearchIcon size={16} aria-hidden="true" />
          <span>{s.search}</span>
        </summary>
        <div className="ia-pulse-search__field">
          <label>
            <span className="ia-pulse-sr-only">{s.search}</span>
            <input name="q" type="search" defaultValue={query} placeholder={s.searchPlaceholder} maxLength={200} />
          </label>
          <button type="submit" aria-label={s.searchSubmit}>
            <ArrowRightIcon size={17} aria-hidden="true" />
          </button>
        </div>
      </details>
      <noscript>
        <button type="submit" className="ia-pulse-filters__apply">
          {s.apply}
        </button>
      </noscript>
    </form>
  );
}
