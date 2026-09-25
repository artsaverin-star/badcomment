"use client";

import { createElement, useDeferredValue, useMemo, useState } from "react";
import { matchesTokens, normalizeForSearch, queryTokens } from "@/site/content/text";
import { useLocale, useT } from "@/site/i18n/client";
import { Badge, Card, categoryGlyph, LockBadge, ROW_GLYPH, RowCard, SearchField } from "@/site/ui";

// The categories of the review archive (/<L>/reviews), filtered as you type (public names), in
// the page's alphabetical order. Redesign spec §4.1. No Swift screen: built from the Clarity
// blocks — the rating catalogue's search + «Выбери тему» head + one RowCard per category
// (ClarityRatings.swift:82-101; while searching the «Найдено» line replaces the head, :86-102), the
// lock glyph beside a locked title (ClarityCatalogs.swift:121-126) and the free badge under the
// text (:134-139; W9 is shown to everyone, Plus included, like `isFree`).

export type ReviewNicheItem = {
  slug: string;
  href: string;
  name: string;
  /** Language of `name` (the rating's niche name: ru, en or a de/fr/ja launch-topic name). */
  nameLang: string;
  /** "100 приложений · 47 280 отзывов" (formatted on the server). */
  meta: string;
  /** The viewer cannot read this category (!viewer.canReadReviews). */
  locked: boolean;
  /** The open sample category (FREE_REVIEW_NICHE). */
  free: boolean;
};

export function ReviewNiches({
  niches,
  s,
}: {
  niches: ReviewNicheItem[];
  /** reviewsStrings[L]: `locked` = the lock glyph's name, `freeBadge` = W9. */
  s: { locked: string; freeBadge: string };
}) {
  const locale = useLocale();
  const t = useT();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  // StudioContent.matches over the name (localizedStandardContains: case- and diacritic-insensitive).
  const folded = useMemo(() => niches.map((n) => normalizeForSearch(n.name, locale)), [niches, locale]);
  const tokens = useMemo(() => queryTokens(deferred, locale), [deferred, locale]);
  const shown = useMemo(
    () => (tokens.length ? niches.filter((_, i) => matchesTokens(tokens, [folded[i]])) : niches),
    [niches, folded, tokens],
  );

  const searching = tokens.length > 0;

  return (
    <>
      <SearchField value={query} onValueChange={setQuery} placeholder={t("Найти категорию")} clearLabel={t("Очистить поиск")} />
      <p className="ia-search-status" role="status" aria-live="polite">
        {searching ? t("Найдено: %1$@", [t.number(shown.length)]) : ""}
      </p>
      {shown.length === 0 ? (
        <Card className="ia-rs-empty">
          <p className="ia-rs-empty__title">{t("Пока ничего не нашлось")}</p>
          <p className="ia-rs-empty__body">{t("Попробуй название категории или более короткий запрос.")}</p>
        </Card>
      ) : (
        <>
          {/* While searching the head is only for assistive tech (the rows are h3s under it);
              the «Найдено» line above carries the count. */}
          <div className={searching ? "sr-only" : "ia-section-head"}>
            <h2 id="review-topics-title" className="ia-section-title ia-section-title--bold">
              {t("Выбери тему")}
            </h2>
            {searching ? null : <span className="ia-section-head__count">{t.number(shown.length)}</span>}
          </div>
          <ul id="review-niches" className="ia-stack" aria-labelledby="review-topics-title">
            {shown.map((niche) => (
              <li key={niche.slug}>
                <RowCard
                  href={niche.href}
                  glyph={createElement(categoryGlyph(niche.slug), ROW_GLYPH)}
                  titleAs="h3"
                  title={niche.name}
                  titleLang={niche.nameLang === locale ? undefined : niche.nameLang}
                  subtitle={niche.meta}
                  trailing={niche.locked ? <LockBadge variant="inline" label={s.locked} /> : null}
                >
                  {niche.free ? <Badge className="ia-row__badge">{s.freeBadge}</Badge> : null}
                </RowCard>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
