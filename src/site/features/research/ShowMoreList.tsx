"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { format } from "@/site/i18n/translate";

// An ordered list that shows the first `initial` server-rendered rows and reveals `step`
// more per click («Показать ещё N»). Focus moves to the first newly shown row.

export function ShowMoreList({
  items,
  initial,
  step,
  moreTemplate,
  label,
  className,
  buttonClassName,
}: {
  items: ReactNode[];
  initial: number;
  step: number;
  /** e.g. "Показать ещё {n}". */
  moreTemplate: string;
  label: string;
  className?: string;
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
        {items.slice(0, limit)}
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
