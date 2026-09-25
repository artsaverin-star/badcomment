import { createElement, Fragment, type ReactNode } from "react";
import { counted } from "@/site/i18n/count";
import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import type { RatingStrings } from "./strings";

// Small formatters of the rating pages (spec 11 §3.11). Client-safe: no string table is
// imported at runtime (only its type), so a client component that needs one of these does not
// ship the five locales of strings.ts — callers pass the page locale's row (`ratingStrings[L]`
// on the server, `useWeb<RatingClientStrings>("rating")` on the client).

const oneDecimal = new Map<Locale, Intl.NumberFormat>();

function decimal(locale: Locale): Intl.NumberFormat {
  let nf = oneDecimal.get(locale);
  if (!nf) {
    nf = new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    oneDecimal.set(locale, nf);
  }
  return nf;
}

/** "4,8★" / "4.8★" — one decimal in the page locale's number format. */
export function starText(locale: Locale, value: number): string {
  return `${decimal(locale).format(value)}★`;
}

/** The review score as the pages print it (`String(realScore)`, «—» when missing). */
export function reviewScoreValue(realScore: number | null): string {
  return realScore === null ? "—" : String(realScore);
}

/**
 * The store average with one decimal in the page locale («4,7» in ru; the app prints «4.7»
 * with String(format: "%.1f") — a deliberate web deviation, spec 10 §1.5), «—» when missing.
 */
export function storeScoreValue(locale: Locale, storeAvg: number | null): string {
  return storeAvg === null ? "—" : decimal(locale).format(storeAvg);
}

/**
 * «4,8★ · 12 345 оценок» (`s.storeMeta`), dropping the missing part: no star without a store
 * average, no count when there are no ratings; "" when both are missing. `s` is the page
 * locale's row of ratingStrings (a parameter, so this module stays free of the string table).
 */
export function storeMetaText(
  locale: Locale,
  storeAvg: number | null,
  ratings: number,
  s: Pick<RatingStrings, "storeMeta" | "ratingsWord">,
): string {
  const star = storeAvg !== null && storeAvg > 0 ? starText(locale, storeAvg) : "";
  const count = ratings > 0 ? counted(locale, ratings, s.ratingsWord) : "";
  if (star && count) return format(s.storeMeta, { star, ratings: count });
  return star || count;
}

/**
 * format() for templates whose values are nodes: «{name} · {apps}» with `name` a
 * <span lang="en">. Splits on `{key}`; a key without a value stays as written. The parts are
 * the fragment's static children (no keys needed, none sent), and empty parts are dropped: a
 * row's meta line is in the RSC payload of every niche page once per app.
 */
export function formatNodes(template: string, vars: Readonly<Record<string, ReactNode>>): ReactNode {
  const parts = template.split(/(\{\w+\})/).filter((part) => part !== "");
  return createElement(
    Fragment,
    null,
    ...parts.map((part) => {
      const key = /^\{(\w+)\}$/.exec(part)?.[1];
      return key !== undefined && key in vars ? vars[key] : part;
    }),
  );
}
