"use client";

import { useMemo, useState } from "react";
import { capQuery, normalizeForSearch } from "../content/text";
import { useLocale, useT } from "../i18n/client";
import { CheckIcon } from "./icons";
import { SearchField } from "./SearchField";
import { Sheet, SheetAction } from "./Sheet";

// ClarityTopicPicker (ClarityCatalogs.swift:244-273; spec 02 §2.5, 09 G5): a tall sheet with a
// «Готово» action, a search field and one grouped list. The FIRST option is the "all" row
// («Все категории»): it is always listed; the other rows keep the caller's order and are
// filtered by a case- and diacritic-insensitive substring of their label
// (`localizedStandardContains`). The selected row carries a checkmark; a tap selects (the
// caller closes the sheet). Opened from a `.ia-pill` (ideas category, review topic).
//
//   <PickerSheet open={open} onClose={close} title={t("Категория")}
//     searchPlaceholder={t("Найти категорию")} selected={category} onSelect={pick}
//     options={[{ value: null, label: t("Все категории") }, ...sorted]} />

export type PickerOption = { value: string | null; label: string; lang?: string };

export function PickerSheet({
  open,
  onClose,
  title,
  searchPlaceholder,
  options,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  searchPlaceholder: string;
  /** options[0] is the "all" row (always shown); the rest in display order. */
  options: readonly PickerOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  const locale = useLocale();
  const t = useT();
  const [filter, setFilter] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFilter("");
  }

  const rows = useMemo(() => {
    const [all, ...rest] = options;
    const f = normalizeForSearch(capQuery(filter.trim()), locale);
    const shown = f ? rest.filter((o) => normalizeForSearch(o.label, locale).includes(f)) : rest;
    return all ? [all, ...shown] : shown;
  }, [options, filter, locale]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      trailing={<SheetAction onClick={onClose}>{t("Готово")}</SheetAction>}
      size="settings"
      full
    >
      <div className="ia-picker">
        <SearchField
          value={filter}
          onValueChange={setFilter}
          placeholder={searchPlaceholder}
          clearLabel={t("Очистить поиск")}
        />
        <ul className="ia-picker__list">
          {rows.map((option) => {
            const isSelected = option.value === selected;
            return (
              <li key={option.value ?? "*"}>
                <button
                  type="button"
                  className="ia-picker__row"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(option.value)}
                >
                  <span lang={option.lang}>{option.label}</span>
                  {isSelected ? <CheckIcon size={18} strokeWidth={2.4} aria-hidden="true" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
