"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type InputHTMLAttributes } from "react";
import { cx } from "./cx";
import { ClearIcon, SearchIcon } from "./icons";

// ClaritySearch (spec 05 §3.6 B): min-height 56, radius 16, surface, no border/shadow;
// magnifier 18 secondary; clear button (x-circle 18 in a 32×32 hit) when non-empty.
// Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
// Placeholders are app strings: «Категория или потребность», «Идея или потребность»,
// «Найти в сохранённом», «Найти категорию». `clearLabel` = t("Очистить поиск").

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name when there is no visible label (defaults to the placeholder). */
  label?: string;
  clearLabel: string;
  className?: string;
};

export const SearchField = forwardRef<HTMLInputElement, Props>(function SearchField(
  { value, defaultValue, onValueChange, label, clearLabel, placeholder, className, ...rest },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  const [inner, setInner] = useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  const set = (v: string) => {
    if (!controlled) setInner(v);
    onValueChange?.(v);
  };

  return (
    <div className={cx("ia-search", className)} role="search">
      <SearchIcon size={18} strokeWidth={2} className="ia-search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="ia-search__input"
        value={current}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        {...rest}
      />
      {current ? (
        <button
          type="button"
          className="ia-search__clear"
          aria-label={clearLabel}
          onClick={() => {
            set("");
            inputRef.current?.focus();
          }}
        >
          <ClearIcon size={18} fill="currentColor" stroke="var(--ia-surface)" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});
