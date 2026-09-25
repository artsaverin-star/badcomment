// Counted words for web-only strings whose word has no plural entry in the app packs.
// A table keeps the forms as "one|few|many|other" (the app's CLDR categories, ./translate.ts):
//
//   counted("ru", 4623, "приложение|приложения|приложений|приложения")  → "4 623 приложения"
//   counted("ja", 12, "件")                                              → "12件"
//
// Japanese has one form and no space between the number and the counter.

import { INTL_LOCALE, type Locale } from "./locales";
import { pluralCategory } from "./translate";

const ORDER = { one: 0, few: 1, many: 2, other: 3 } as const;

/** The word for `n` from "one|few|many|other" forms (missing forms fall back to the last one). */
export function countWord(locale: Locale, n: number, forms: string): string {
  const list = forms.split("|");
  return list[ORDER[pluralCategory(locale, n)]] ?? list[list.length - 1];
}

/**
 * Locale-formatted number + its word ("18 442 отзыва", "18,442 reviews", "18,442件"), joined by
 * a no-break space so the pair never wraps apart.
 */
export function counted(locale: Locale, n: number, forms: string): string {
  const number = new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
  const word = countWord(locale, n, forms);
  return locale === "ja" ? `${number}${word}` : `${number}\u00a0${word}`;
}
