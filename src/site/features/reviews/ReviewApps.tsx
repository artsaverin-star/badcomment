"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { matchesTokens, normalizeForSearch, queryTokens } from "@/site/content/text";
import { useLocale, useT } from "@/site/i18n/client";
import { AppWindowIcon, Card, ChevronRightIcon, SearchField } from "@/site/ui";

// The apps of a review category (/<L>/reviews/<niche>), filtered by app name or topic as you
// type. Public catalogue fields only (the page renders this list only for readers).
// Redesign spec §4.2: the Saved section pattern (ClarityMy.swift:220-231) — a 17/600 title with
// the count 8 to its right, 12 above a surface group (radius 18, no stroke; the count follows
// the filter, so there is no visible «Найдено» line, only an sr-only live status) — and its row
// (ClaritySavedRow, :272-306): a 19 pt accent glyph in 26 × 28, title body medium, detail
// caption secondary 6 below, chevron caption medium secondary; padding 16, dividers inset 58
// (library.css). The page imports library.css.

export type ReviewAppItem = {
  id: string;
  href: string;
  title: string;
  /** "12 тем · 500 отзывов" (formatted on the server). */
  meta: string;
  /** Topic labels (search haystack). */
  topicNames: string[];
};

export function ReviewApps({ apps, placeholder }: { apps: ReviewAppItem[]; /** s.appSearch */ placeholder: string }) {
  const locale = useLocale();
  const t = useT();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  // StudioContent.matches over [title, …topics]: every query word is in some field.
  const folded = useMemo(
    () => apps.map((a) => [a.title, ...a.topicNames].map((field) => normalizeForSearch(field, locale))),
    [apps, locale],
  );
  const tokens = useMemo(() => queryTokens(deferred, locale), [deferred, locale]);
  const shown = useMemo(
    () => (tokens.length ? apps.filter((_, i) => matchesTokens(tokens, folded[i])) : apps),
    [apps, folded, tokens],
  );

  return (
    <>
      <SearchField value={query} onValueChange={setQuery} placeholder={placeholder} clearLabel={t("Очистить поиск")} />
      <p className="sr-only" role="status" aria-live="polite">
        {tokens.length ? t("Найдено: %1$@", [t.number(shown.length)]) : ""}
      </p>
      {shown.length === 0 ? (
        <Card className="ia-rs-empty">
          <p className="ia-rs-empty__title">{t("Пока ничего не нашлось")}</p>
          <p className="ia-rs-empty__body">{t("Попробуй другое название или очисти поиск.")}</p>
        </Card>
      ) : (
        <section className="ia-lib-section" aria-labelledby="review-apps-title">
          <h2 id="review-apps-title" className="ia-lib-section__title">
            {t("Приложения")}
            <span className="ia-lib-section__count">{t.number(shown.length)}</span>
          </h2>
          <ul id="review-apps" className="ia-lib-group">
            {shown.map((app) => (
              <li key={app.id} className="ia-lib-row">
                <Link className="ia-lib-row__main" href={app.href}>
                  <span className="ia-lib-row__glyph" aria-hidden="true">
                    <AppWindowIcon size={19} strokeWidth={2} />
                  </span>
                  <span className="ia-lib-row__text">
                    <span className="ia-lib-row__title">{app.title}</span>
                    <span className="ia-lib-row__detail">{app.meta}</span>
                  </span>
                  <ChevronRightIcon className="ia-lib-row__chevron" size={13} strokeWidth={2.5} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
