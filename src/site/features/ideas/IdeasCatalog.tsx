"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { filterIdeas, pickerCategories } from "@/site/content/search";
import { ideaCategorySlug } from "@/site/content/text";
import { useLocale, useT, useWebStrings } from "@/site/i18n/client";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { FilterIcon, PickerSheet, SearchField, type PickerOption } from "@/site/ui";
import { IdeaCard } from "./IdeaCard";
import { ideasStrings } from "./strings";
import "./ideas.css";

// Tab «Идеи» below the heading (spec 02 §2.4–§2.8): search, the category pill + picker, the
// cards, the empty state. The server hands over an already GATED list in the app's order:
// readable cards carry their copy, locked cards ONLY {slug}; the cover is derived from the slug
// (IdeaCard → ideaCover); `haystacks` holds search text for readable ideas only, so a locked
// idea can never match a query (spec 09 G10). Filtering runs on a deferred query (the input
// stays responsive with 293 cards); the URL keeps ?q=&category= (the server renders the same
// filtered list on a direct load).

export type CatalogCard =
  | { locked: false; slug: string; title: string; description: string; categoryName: string }
  | { locked: true; slug: string };

export type CatalogCategoryOption = { slug: string; name: string };

const URL_DEBOUNCE_MS = 250;
const EAGER_CARDS = 4;

export function IdeasCatalog({
  cards,
  haystacks,
  categories,
  initialQuery,
  initialCategory,
}: {
  cards: CatalogCard[];
  haystacks: Record<string, string[]>;
  categories: CatalogCategoryOption[];
  initialQuery: string;
  initialCategory: string | null;
}) {
  const locale = useLocale();
  const t = useT();
  const s = useWebStrings(ideasStrings);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [pickerOpen, setPickerOpen] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const lockedHintId = useId();
  const deferredQuery = useDeferredValue(query);

  const withCategory = useMemo(() => cards.map((c) => ({ ...c, category: ideaCategorySlug(c.slug) })), [cards]);
  const results = useMemo(
    () =>
      filterIdeas(withCategory, {
        query: deferredQuery,
        category,
        locale,
        canRead: (slug) => slug in haystacks,
        haystacks,
      }),
    [withCategory, haystacks, deferredQuery, category, locale],
  );
  const hasLocked = results.some((c) => c.locked);

  // Keep the URL shareable without a server round trip (Next integrates history.replaceState).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = routes.ideas(locale, { q: query.trim() ? query : undefined, category: category ?? undefined });
      if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next);
    }, URL_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [locale, query, category]);

  const pickerOptions = useMemo<PickerOption[]>(
    () => [
      { value: null, label: t("Все категории") },
      ...pickerCategories(categories, "", locale).map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories, locale, t],
  );

  const categoryName = category ? categories.find((c) => c.slug === category)?.name : undefined;
  const pillLabel = categoryName ?? t("Все категории");
  const filtering = deferredQuery.trim() !== "" || category !== null;

  const scrollToTop = () => {
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  };

  return (
    <div className="ia-ideas" ref={top}>
      <div className="ia-ideas__controls">
        <SearchField
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            scrollToTop();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder={t("Идея или потребность")}
          clearLabel={t("Очистить поиск")}
          name="q"
        />
        <button
          type="button"
          className="ia-pill"
          aria-haspopup="dialog"
          aria-label={format(s.categoryPickerOpen, { name: pillLabel })}
          onClick={() => setPickerOpen(true)}
        >
          <span>{pillLabel}</span>
          <FilterIcon size={14} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {filtering ? t("Найдено: %1$@", [results.length]) : ""}
      </p>

      {results.length === 0 ? (
        <div className="ia-card ia-card--utility ia-ideas__empty">
          <h2 className="ia-ideas__empty-title">{t("Пока ничего не нашлось")}</h2>
          <p className="ia-ideas__empty-body">{t("Попробуй название категории или более короткий запрос.")}</p>
        </div>
      ) : (
        <ul className="ia-grid ia-grid--ideas ia-ideas-grid ia-ideas__grid" aria-label={s.catalogLabel}>
          {results.map((card, i) => (
            <li key={card.slug}>
              {card.locked ? (
                <IdeaCard
                  locked
                  slug={card.slug}
                  paywallSource="ideas_catalog"
                  lockedLabel={t("Идея в Plus")}
                  describedBy={lockedHintId}
                  eager={i < EAGER_CARDS}
                />
              ) : (
                <IdeaCard
                  locked={false}
                  slug={card.slug}
                  href={routes.idea(locale, card.slug)}
                  title={card.title}
                  description={card.description}
                  categoryName={card.categoryName}
                  label={t("%1$@. %2$@", [card.title, card.description])}
                  titleAs="h2"
                  eager={i < EAGER_CARDS}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {/* One shared hint for every locked card (not 288 copies in the HTML). */}
      {hasLocked ? (
        <span id={lockedHintId} hidden>
          {t("Подробности идеи доступны в Plus.")}
        </span>
      ) : null}

      {/* ClarityTopicPicker (spec 02 §2.5, 09 G5): «Категория» sheet with «Готово», a filter
          «Найти категорию» (plain substring on the name), «Все категории» always first, then the
          35 names sorted with the locale collator; a tap selects and closes. */}
      <PickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("Категория")}
        searchPlaceholder={t("Найти категорию")}
        options={pickerOptions}
        selected={category}
        onSelect={(slug) => {
          setCategory(slug);
          setPickerOpen(false);
          scrollToTop();
        }}
      />
    </div>
  );
}
