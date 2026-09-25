import type { ReactNode } from "react";
import { cx } from "./cx";
import { QuoteOpeningIcon } from "./icons";

// ClarityQuoteBlock (ClarityReader.swift:870-888): the filled `quote.opening` glyph (caption,
// secondary) above the quote in Georgia 20 + lineSpacing 7, 12 apart. No app name and no stars:
// the app receives both and renders neither. Server- and client-safe.
//   <QuoteBlock lang={q.lang}>{q.text}</QuoteBlock>
// `caption` becomes a <figcaption> under the quote (the review archive's stars + topics row).

export function QuoteBlock({
  children,
  lang,
  caption,
  captionClassName,
  className,
  id,
  tabIndex,
}: {
  children: ReactNode;
  /** `lang` of the quote text (data locale / original language). */
  lang?: string;
  caption?: ReactNode;
  captionClassName?: string;
  className?: string;
  id?: string;
  /** -1 lets a «Показать остальные» button move focus to a revealed quote. */
  tabIndex?: number;
}) {
  return (
    <figure className={cx("ia-quote", className)} id={id} tabIndex={tabIndex}>
      <QuoteOpeningIcon className="ia-quote__glyph" />
      <blockquote className="ia-quote__text" lang={lang}>
        {children}
      </blockquote>
      {caption ? <figcaption className={captionClassName}>{caption}</figcaption> : null}
    </figure>
  );
}
