"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./locales";
import { makeT, type T, type UIPack } from "./translate";
import type { WebStrings } from "./strings";

// Client-side strings. The server picks the keys a subtree needs and hands them down:
//
//   // server component
//   const t = await getT(L);
//   <I18nProvider locale={L} strings={t.pick(MY_KEYS)} plurals={…optional}>
//     <MyClientThing />
//   </I18nProvider>
//
//   // client component
//   const t = useT();  t("Готово")
//
// Providers nest: an inner provider adds keys to the ones from above (the root layout
// provides the shell keys, SHELL_UI_KEYS). A key nobody provided falls back to the Russian
// key (with a dev warning) — the built-in shell table stays on the server.
//
// Web-only strings (features/<f>/strings.ts) the same way: the server picks the page
// locale's table and hands it down by name, so the other four locales never reach the
// browser (performance review P2):
//
//   // server                                            // client
//   <I18nProvider locale={L} web={{ auth: authStrings[L] }}>   const s = useWeb<AuthStrings>("auth");
//
// (`useWebStrings(table)` still works, but bundles all five locales of `table`.)

type WebTables = Readonly<Record<string, unknown>>;

type Ctx = {
  locale: Locale;
  strings: Readonly<Record<string, string>>;
  plurals: Readonly<Record<string, Record<string, string>>>;
  web: WebTables;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  strings,
  plurals,
  web,
  children,
}: {
  locale: Locale;
  strings?: Readonly<Record<string, string>>;
  plurals?: Readonly<Record<string, Record<string, string>>>;
  /** Web-only string tables of the page locale, by name (read with useWeb(name)). */
  web?: WebTables;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo<Ctx>(() => {
    const same = parent !== null && parent.locale === locale;
    return {
      locale,
      strings: same ? { ...parent.strings, ...strings } : { ...strings },
      plurals: same ? { ...parent.plurals, ...plurals } : { ...plurals },
      web: same ? { ...parent.web, ...web } : { ...web },
    };
  }, [locale, strings, plurals, web, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider> (the new root layout provides one)");
  return ctx;
}

/** The page locale (ru | en | de | fr | ja). */
export function useLocale(): Locale {
  return useCtx().locale;
}

/** Translator for app UI strings keyed by the Russian source (same API as the server getT). */
export function useT(): T {
  const { locale, strings, plurals } = useCtx();
  return useMemo(() => {
    const pack: UIPack = { version: 1, locale, strings: {}, plurals: { ...plurals } };
    const t = makeT(locale, pack, null, strings);
    if (process.env.NODE_ENV !== "production" && locale !== "ru") {
      const wrapped = ((ru: string, vars?: Parameters<T>[1]) => {
        if (!(ru in strings)) console.warn(`[site/i18n] "${ru}" was not provided to the client (${locale})`);
        return t(ru, vars);
      }) as T;
      return Object.assign(wrapped, t, { locale });
    }
    return t;
  }, [locale, strings, plurals]);
}

/**
 * Web-only strings of a feature (src/site/features/<f>/strings.ts) for the page locale.
 * Imports the whole 5-locale table into the client bundle; prefer useWeb(name).
 */
export function useWebStrings<S>(table: WebStrings<S>): S {
  return table[useCtx().locale];
}

/**
 * A web-only string table handed down by a server <I18nProvider web={{ [name]: table[L] }}>.
 * Type it with the table's row type: `useWeb<ShellStrings>("shell")`.
 */
export function useWeb<S>(name: string): S {
  const table = useCtx().web[name];
  if (table === undefined) {
    throw new Error(`[site/i18n] web strings "${name}" were not provided (pass web={{ ${name}: … }} to an I18nProvider)`);
  }
  return table as S;
}
