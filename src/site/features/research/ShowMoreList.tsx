"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { format } from "@/site/i18n/translate";

// An ordered list that shows the first `initial` rows and reveals `step` more per click
// («Показать ещё N»). Every row is in the server HTML: rows past the limit carry `hidden`, so
// crawlers and find-in-page see the whole list while the page looks the same (review seo S1).
// Focus moves to the first newly shown row.

export type ShowMoreItem = { key: string; content: ReactNode };

export function ShowMoreList({
  items,
  initial,
  step,
  moreTemplate,
  label,
  className,
  itemClassName,
  buttonClassName,
}: {
  items: ReadonlyArray<ShowMoreItem>;
  initial: number;
  step: number;
  /** e.g. "Показать ещё {n}". */
  moreTemplate: string;
  label: string;
  className?: string;
  /** Class of every <li> (the row layout; give `[hidden]` a display: none if it sets display). */
  itemClassName?: string;
  buttonClassName?: string;
}) {
  const [limit, setLimit] = useState(initial);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (focusFrom === null) return;
    const row = list.current?.children[focusFrom] as HTMLElement | undefined;
    row?.querySelector<HTMLElement>("a, button")?.focus();
  }, [focusFrom]);

  const rest = items.length - limit;
  return (
    <>
      <ol ref={list} className={className} aria-label={label}>
        {items.map((item, i) => (
          <li key={item.key} className={itemClassName} hidden={i >= limit || undefined}>
            {item.content}
          </li>
        ))}
      </ol>
      {rest > 0 ? (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => {
            setFocusFrom(limit);
            setLimit((v) => v + step);
          }}
        >
          {format(moreTemplate, { n: Math.min(step, rest) })}
        </button>
      ) : null}
    </>
  );
}
