// Web-only strings (ARCHITECTURE §6): landing, sign-in, payments, App Store popup and the
// web wording deltas that the app packs do not have. Each feature keeps its own table in
// src/site/features/<f>/strings.ts (the shell's is src/site/shell/strings.ts):
//
//   import { defineStrings } from "@/site/i18n/strings";
//   export const strings = defineStrings({
//     ru: { title: "Войти в inApp" },
//     en: { title: "Sign in to inApp" },
//     de: { title: "Bei inApp anmelden" },
//     fr: { title: "Se connecter à inApp" },
//     ja: { title: "inAppにログイン" },
//   });
//
//   server: strings[L].title            client: useWebStrings(strings).title
//
// All five locales are required by the type, keyed by the same ids as `ru` (the source).
// Voice: informal «ты» / du / tu; Japanese follows the app's ui.ja.json (です・ます).
// Placeholders use {name}; fill them with format() from ./translate.

import type { Locale } from "./locales";

export type WebStrings<S> = Readonly<Record<Locale, S>>;

/** Identity helper that type-checks a 5-locale table: every locale has exactly the same ids. */
export function defineStrings<K extends string>(
  table: Record<Locale, Record<K, string>>,
): WebStrings<Record<K, string>> {
  return table;
}

export { format } from "./translate";
