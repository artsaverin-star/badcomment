// Isomorphic translation core (server + client). The loaders live in ./server.ts
// (fs, content/v2/<L>/ui.json) and ./client.tsx (React context); both build a T with makeT().
//
// App UI strings are keyed by the Russian source string (spec 04 §4.4, ARCHITECTURE §6):
//   t("Разборы") → "Breakdowns" in en; ru is the identity.
// Fallback: own locale → base language → en → the Russian key (the app's UIStrings chain;
// with today's five locales "base" is the locale itself).
// Placeholders: the app's positional "%1$@" (and plain "%@"), plus named "{name}".

// BUILTIN_UI (./builtin.ts, all locales) is NOT imported here: this module ships to the
// browser (useT, format). The server passes it to makeT (./server.ts); the client only ever
// translates keys the server already resolved with t.pick() (performance review P2).
import { INTL_LOCALE, type Locale } from "./locales";

/** Built-in fallback tables (./builtin.ts BUILTIN_UI shape). */
export type BuiltinUI = Partial<Record<Locale, Readonly<Record<string, string>>>>;

export type UIPack = {
  version: 1;
  locale: Locale;
  strings: Record<string, string>;
  plurals?: Record<string, Record<string, string>>;
};

export type Vars = ReadonlyArray<string | number> | Readonly<Record<string, string | number>>;

export type T = {
  locale: Locale;
  /** Translate an app UI string by its Russian source; `vars` fill %1$@ / %@ / {name}. */
  (ru: string, vars?: Vars): string;
  /** The word for `n` (no number): plural("отзыв", 5) → "отзывов" / "reviews". */
  plural: (key: string, n: number, fallback?: string) => string;
  /** Number + word in the locale's number format: "18 442 отзыва", "18,442 reviews". */
  count: (key: string, n: number, fallback?: string) => string;
  /** Locale-aware number formatting. */
  number: (n: number) => string;
  /** Plain object of translations for `keys` (to hand to a client I18nProvider). */
  pick: (keys: Iterable<string>) => Record<string, string>;
};

/** CLDR plural category exactly as the app computes it (Strings/UIStrings.swift, Plural.category). */
export function pluralCategory(locale: Locale, count: number): "one" | "few" | "many" | "other" {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  switch (locale) {
    case "ja":
      return "other";
    case "en":
    case "de":
      return n === 1 ? "one" : "other";
    case "fr":
      return n === 0 || n === 1 ? "one" : "other";
    case "ru":
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
      return "many";
  }
}

/** Russian plural forms the ru pack may lack (the app hard-codes them as fallbacks). */
const RU_PLURALS: Record<string, Record<string, string>> = {
  отзыв: { one: "отзыв", few: "отзыва", many: "отзывов" },
  идея: { one: "идея", few: "идеи", many: "идей" },
  наблюдение: { one: "наблюдение", few: "наблюдения", many: "наблюдений" },
  "наблюдение в отзывах": {
    one: "наблюдение в отзывах",
    few: "наблюдения в отзывах",
    many: "наблюдений в отзывах",
  },
  приложение: { one: "приложение", few: "приложения", many: "приложений" },
};

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  if (Array.isArray(vars)) {
    const list = vars as ReadonlyArray<string | number>;
    let seq = 0;
    return template
      .replace(/%(\d+)\$@/g, (m, i: string) => {
        const v = list[Number(i) - 1];
        return v === undefined ? m : String(v);
      })
      .replace(/%@/g, (m) => {
        const v = list[seq++];
        return v === undefined ? m : String(v);
      });
  }
  const named = vars as Readonly<Record<string, string | number>>;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in named ? String(named[k]) : m));
}

/**
 * "Label: value" with the locale's punctuation: French puts a no-break space before the colon
 * (the app packs do: "Résultats : %1$@"), Japanese uses the full-width colon without spaces.
 *   labelValue("fr", "Langue", "Français") → "Langue : Français"
 */
export function labelValue(locale: Locale, label: string, value: string): string {
  if (locale === "fr") return `${label}\u00a0: ${value}`;
  if (locale === "ja") return `${label}：${value}`;
  return `${label}: ${value}`;
}

export function makeT(
  locale: Locale,
  own: UIPack | null,
  english: UIPack | null,
  extra?: Readonly<Record<string, string>>,
  /** Server only: the built-in shell strings used when a pack lacks a key. */
  builtin?: BuiltinUI,
): T {
  const lookup = (key: string): string => {
    if (extra && key in extra) return extra[key];
    if (locale === "ru") return key;
    return (
      own?.strings[key] ??
      builtin?.[locale]?.[key] ??
      english?.strings[key] ??
      builtin?.en?.[key] ??
      key
    );
  };

  const numberFormat = new Intl.NumberFormat(INTL_LOCALE[locale]);

  // Plural.word: forms from the pack chain (own → en; ru → its own forms), category of the
  // page locale, then `other`, then the caller's fallback.
  const plural = (key: string, n: number, fallback?: string): string => {
    const forms =
      own?.plurals?.[key] ?? (locale === "ru" ? RU_PLURALS[key] : english?.plurals?.[key]);
    if (!forms) return fallback ?? key;
    return forms[pluralCategory(locale, n)] ?? forms.other ?? fallback ?? key;
  };

  const t = ((ru: string, vars?: Vars) => format(lookup(ru), vars)) as T;
  t.locale = locale;
  t.plural = plural;
  t.number = (n: number) => numberFormat.format(n);
  t.count = (key, n, fallback) => `${numberFormat.format(n)} ${plural(key, n, fallback)}`;
  t.pick = (keys) => {
    const out: Record<string, string> = {};
    for (const k of keys) out[k] = lookup(k);
    return out;
  };
  return t;
}
