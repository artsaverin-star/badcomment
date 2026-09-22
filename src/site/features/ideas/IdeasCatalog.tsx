"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Art } from "@/site/content/types";
import { filterIdeas, pickerCategories } from "@/site/content/search";
import { ideaCategorySlug } from "@/site/content/text";
import { useLocale, useT, useWebStrings } from "@/site/i18n/client";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { CheckIcon, FilterIcon, SearchField, Sheet, SheetAction } from "@/site/ui";
import { IdeaCard } from "./IdeaCard";
import { ideasStrings } from "./strings";
import "./ideas.css";

// Tab «Идеи» below the heading (spec 02 §2.4–§2.8): search, the category pill + picker, the
// cards, the empty state. The server hands over an already GATED list in the app's order:
// readable cards carry their copy, locked cards ONLY {slug, cover}; `haystacks` holds search
// text for readable ideas only, so a locked idea can never match a query (spec 09 G10).
// Filtering is instant on the client; the URL keeps ?q=&category= (the server renders the same
// filtered list on a direct load).

export type CatalogCard =
  | { locked: false; slug: string; cover: Art; title: string; description: string; categoryName: string }
  | { locked: true; slug: string; cover: Art };

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

  const results = useMemo(
    () =>
      filterIdeas(
        cards.map((c) => ({ ...c, category: ideaCategorySlug(c.slug) })),
        { query, category, locale, canRead: (slug) => slug in haystacks, haystacks },
      ),
    [cards, haystacks, query, category, locale],
  );

  // Keep the URL shareable without a server round trip (Next integrates history.replaceState).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = routes.ideas(locale, { q: query.trim() ? query : undefined, category: category ?? undefined });
      if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next);
    }, URL_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [locale, query, category]);

  const categoryName = category ? categories.find((c) => c.slug === category)?.name : undefined;
  const pillLabel = categoryName ?? t("Все категории");
  const filtering = query.trim() !== "" || category !== null;

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
          className="ia-ideas__pill"
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
        <ul className="ia-grid ia-ideas-grid ia-ideas__grid" aria-label={s.catalogLabel}>
          {results.map((card, i) => (
            <li key={card.slug}>
              {card.locked ? (
                <IdeaCard
                  locked
                  slug={card.slug}
                  cover={card.cover}
                  paywallSource="ideas_catalog"
                  lockedLabel={t("Идея в Plus")}
                  hint={t("Подробности идеи доступны в Plus.")}
                  eager={i < EAGER_CARDS}
                />
              ) : (
                <IdeaCard
                  locked={false}
                  slug={card.slug}
                  href={routes.idea(locale, card.slug)}
                  cover={card.cover}
                  title={card.title}
                  description={card.description}
                  categoryName={card.categoryName}
                  eager={i < EAGER_CARDS}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <CategoryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={categories}
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

/**
 * ClarityTopicPicker (spec 02 §2.5, 09 G5): «Категория» sheet with «Готово», a filter
 * «Найти категорию» (plain substring on the name), «Все категории» always first, then the 35
 * names sorted with the locale collator; the selected row has a checkmark; a tap selects and closes.
 */
function CategoryPicker({
  open,
  onClose,
  categories,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  categories: CatalogCategoryOption[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const locale = useLocale();
  const t = useT();
  const [filter, setFilter] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFilter("");
  }
  const rows = useMemo(() => pickerCategories(categories, filter, locale), [categories, filter, locale]);

  const row = (slug: string | null, name: string) => {
    const isSelected = slug === selected;
    return (
      <li key={slug ?? "*"}>
        <button
          type="button"
          className="ia-picker__row"
          aria-current={isSelected ? "true" : undefined}
          onClick={() => onSelect(slug)}
        >
          <span>{name}</span>
          {isSelected ? <CheckIcon size={18} strokeWidth={2.4} aria-hidden="true" /> : null}
        </button>
      </li>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("Категория")}
      trailing={<SheetAction onClick={onClose}>{t("Готово")}</SheetAction>}
      size="settings"
      full
    >
      <div className="ia-picker">
        <SearchField
          value={filter}
          onValueChange={setFilter}
          placeholder={t("Найти категорию")}
          clearLabel={t("Очистить поиск")}
        />
        <ul className="ia-picker__list">
          {row(null, t("Все категории"))}
          {rows.map((c) => row(c.slug, c.name))}
        </ul>
      </div>
    </Sheet>
  );
}
