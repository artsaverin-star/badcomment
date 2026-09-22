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
// provides the shell keys, SHELL_UI_KEYS). A key nobody provided falls back to the
// built-in shell strings, then to the Russian key (with a dev warning).

type Ctx = {
  locale: Locale;
  strings: Readonly<Record<string, string>>;
  plurals: Readonly<Record<string, Record<string, string>>>;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  strings,
  plurals,
  children,
}: {
  locale: Locale;
  strings?: Readonly<Record<string, string>>;
  plurals?: Readonly<Record<string, Record<string, string>>>;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo<Ctx>(
    () => ({
      locale,
      strings: parent && parent.locale === locale ? { ...parent.strings, ...strings } : { ...strings },
      plurals: parent && parent.locale === locale ? { ...parent.plurals, ...plurals } : { ...plurals },
    }),
    [locale, strings, plurals, parent],
  );
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

/** Web-only strings of a feature (src/site/features/<f>/strings.ts) for the page locale. */
export function useWebStrings<S>(table: WebStrings<S>): S {
  return table[useCtx().locale];
}
