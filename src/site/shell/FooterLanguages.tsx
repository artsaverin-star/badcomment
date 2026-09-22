"use client";

import { useLocale } from "../i18n/client";
import { LOCALE_NAMES, LOCALES } from "../i18n/locales";
import { useLocaleHref } from "./HeaderParts";

/** Language picker of the footer: the same page in each of the 5 locales (plain links). */
export function FooterLanguages({ label }: { label: string }) {
  const locale = useLocale();
  const localeHref = useLocaleHref();
  return (
    <nav aria-label={label}>
      <ul className="ia-footer__langs">
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={localeHref(l)} lang={l} hrefLang={l} aria-current={l === locale ? "true" : undefined}>
              {LOCALE_NAMES[l]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
