"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useT, useWeb } from "@/site/i18n/client";
import { format } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { Chip, ChipRow } from "@/site/ui/Badge";
import { EmptyCard } from "@/site/ui/EmptyCard";
import { InfoIcon } from "@/site/ui/icons";
import { SearchField } from "@/site/ui/SearchField";
import { foldSearch, matchesFolded, searchTokens } from "./matches";
import { RATING_SORTS, sortRatedApps, type RatingSort } from "./order";
import { revealSearchField } from "./reveal";
import { rankVars } from "./score";
import type { RatingClientStrings } from "./strings";
import { replaceUrl } from "./viewState";

// The niche page's list (spec 11 §4.2.1; replaces the app's «Порядок» menu and the method sheet
// of ClarityCategoryRatingViewContent, ClarityRatings.swift:144-232). Client. Top to bottom:
//   controls  the search «Найти в этой теме» (#rating-search, the toolbar shortcut's target),
//             the sort chips «По отзывам · По App Store · Популярные · По названию» and the
//             legend with its link to «Об оценках» (#rating-method);
//   default   (review order, no query): «Тройка лидеров» (#rating-leaders), the tasks card, then
//             «Места 4–N» (#rating-apps, rows from rank 4);
//   flat      (another order or a query): «Приложения» with the visible count and every row in
//             the chosen order (#rating-apps); rows that do not match the query are `hidden`.
// Every card is rendered on the server (RatingAppCard) and handed over as a node: no text travels
// as a prop, only the sort keys (`items`). The query matches what the reader can read — title,
// store meta, verdict, praise, complaints, for whom — folded from the rendered rows once per app.
// A deep link with ?q= renders the flat view unfiltered on the server (the rows are the
// haystack); the filter applies in the first layout effect after hydration. ?sort= alone is
// right in the server HTML. The query and the order survive Back like the app's @State
// (:156-159): ?q= and ?sort= in the URL (viewState.ts), debounced, flushed before any click
// navigates. Top-5 anchors (#app-<slug>) whose card is hidden or not in this view reset the list
// to the default view first, then jump.

/** The sort keys of one app (no texts): the rows are server-rendered nodes. */
export type NicheListItem = {
  slug: string;
  /** Raw data index + 1 (D3): the review order and the leaders. */
  rank: number;
  title: string;
  realScore: number | null;
  storeAvg: number | null;
  ratings: number;
};

const URL_DEBOUNCE_MS = 250;

function parseSort(value: string | null): RatingSort {
  return RATING_SORTS.find((sort) => sort === value) ?? "review";
}

/**
 * The text a reader sees in a row, word-separated: every text node except the sr-only sentence
 * («Место 4. Оценка по отзывам…»), the note labels («Хвалят:») and aria-hidden parts (the rank
 * and the score), which every row shares and would make any query match everything.
 */
function readableText(li: Element): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(".sr-only, strong, [aria-hidden='true']")) continue;
    const text = node.nodeValue?.trim();
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function RatingNicheList({
  niche,
  items,
  rows,
  leaders,
  tasks,
}: {
  niche: string;
  /** Every app in rank order. */
  items: NicheListItem[];
  /** RatingAppCard variant="row" per app slug (the <li>). */
  rows: Record<string, ReactNode>;
  /** RatingAppCard variant="leader" for ranks 1–3 (the <li>s). */
  leaders: ReactNode[];
  /** The tasks card, shown in the default view only; null = none. */
  tasks: ReactNode | null;
}) {
  const locale = useLocale();
  const t = useT();
  const s = useWeb<RatingClientStrings>("rating");
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [sort, setSort] = useState<RatingSort>(() => parseSort(params.get("sort")));
  /** Slugs of the rows the query hides (flat view). */
  const [hiddenSlugs, setHiddenSlugs] = useState<ReadonlySet<string>>(() => new Set());
  const fieldRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /** Folded readable text per app slug, built once from the rendered rows. */
  const haystacks = useRef(new Map<string, string>());
  /** A Top-5 anchor to jump to once the list is back in the default view. */
  const jumpTo = useRef<string | null>(null);
  const urlTimer = useRef<number | undefined>(undefined);
  const pendingUrl = useRef("");

  const blank = query.trim() === "";
  const flat = !blank || sort !== "review";
  const url = routes.ratingNiche(locale, niche, { q: blank ? undefined : query, sort: sort === "review" ? undefined : sort });

  // ?q=&sort= in the URL, debounced.
  useEffect(() => {
    pendingUrl.current = url;
    const id = window.setTimeout(() => {
      urlTimer.current = undefined;
      replaceUrl(url);
    }, URL_DEBOUNCE_MS);
    urlTimer.current = id;
    return () => window.clearTimeout(id);
  }, [url]);

  // One capture listener on the document: flush the pending URL before any link navigates
  // (it runs before the link's own handler), and catch Top-5 anchors whose target is hidden by
  // the query or not in this view (#app-<slug> exists once per view: leaders in the default
  // view, rows otherwise).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (urlTimer.current !== undefined) {
        window.clearTimeout(urlTimer.current);
        urlTimer.current = undefined;
        replaceUrl(pendingUrl.current);
      }
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href^="#app-"]') : null;
      const id = link?.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target && !target.hidden) return; // the browser jumps
      e.preventDefault();
      jumpTo.current = id;
      setQuery("");
      setSort("review");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // The filter: hide the rows that do not match every token, after the rows are in the DOM
  // (the first layout effect after hydration for a ?q= deep link). Rows keep their DOM node
  // across re-sorting and view changes, so every run sets `hidden` on every row.
  useLayoutEffect(() => {
    const tokens = searchTokens(query, locale);
    const next = new Set<string>();
    for (const li of listRef.current?.querySelectorAll<HTMLElement>(":scope > li[data-slug]") ?? []) {
      const slug = li.dataset.slug ?? "";
      let hide = false;
      if (tokens.length > 0) {
        let folded = haystacks.current.get(slug);
        if (folded === undefined) {
          folded = foldSearch(readableText(li), locale);
          haystacks.current.set(slug, folded);
        }
        hide = !matchesFolded(tokens, [folded]);
      }
      li.hidden = hide;
      if (hide) next.add(slug);
    }
    // A DOM measurement, like a layout read from a ref: what matches is only known from the
    // rendered rows. One extra render per query change, before paint; an equal set is kept.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the rows' text lives in the DOM
    setHiddenSlugs((prev) => (sameSet(prev, next) ? prev : next));
  }, [query, sort, locale]);

  // The app scrolls to the top after every query change (:227): measure after the DOM update
  // (the leaders and the tasks card above the rows come and go with the query).
  const revealed = useRef(query);
  useLayoutEffect(() => {
    if (revealed.current === query) return;
    revealed.current = query;
    revealSearchField(fieldRef.current);
  }, [query]);

  // A Top-5 anchor that reset the list: jump once the default view is in the DOM.
  useLayoutEffect(() => {
    const id = jumpTo.current;
    if (!id) return;
    jumpTo.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  });

  const ordered = useMemo(() => sortRatedApps(items, sort, locale), [items, sort, locale]);
  const shown = flat ? ordered : ordered.filter((item) => item.rank > leaders.length);
  const visible = flat ? items.length - hiddenSlugs.size : shown.length;

  const sortLabel: Record<RatingSort, string> = {
    review: s.sortReview,
    store: s.sortStore,
    ratings: s.sortRatings,
    name: s.sortName,
  };

  return (
    <>
      <div className="ia-rt-controls">
        <SearchField
          ref={fieldRef}
          id="rating-search"
          value={query}
          onValueChange={setQuery}
          placeholder={t("Найти в этой теме")}
          clearLabel={t("Очистить поиск")}
        />
        <ChipRow label={t("Сортировка")}>
          {RATING_SORTS.map((value) => (
            <Chip key={value} selected={value === sort} onClick={() => setSort(value)}>
              {sortLabel[value]}
            </Chip>
          ))}
        </ChipRow>
        <p className="ia-rt-legend">
          <InfoIcon size={15} strokeWidth={2} aria-hidden="true" />
          {s.legend}
          {locale === "ja" ? "" : " "}
          <a href="#rating-method">{t("Об оценках")}</a>
        </p>
      </div>
      {/* Always in the accessibility tree (an empty one is clipped, not display:none), so the
          first count is announced too. */}
      <p className="ia-search-status" role="status" aria-live="polite">
        {blank ? "" : t("Найдено приложений: %1$@", [t.number(visible)])}
      </p>

      {!flat && leaders.length > 0 ? (
        <h2 id="rating-leaders-title" className="ia-section-title ia-section-title--bold">
          {s.leadersTitle}
        </h2>
      ) : null}
      {!flat && leaders.length > 0 ? (
        <ol id="rating-leaders" className="ia-rt-list ia-rt-list--leaders" aria-labelledby="rating-leaders-title">
          {leaders}
        </ol>
      ) : null}
      {/* Keyed: the server streams this node separately, and an element that resolves after the
          list rendered is key-checked as a member of this fragment's children. */}
      {!flat && tasks ? <Fragment key="tasks">{tasks}</Fragment> : null}

      {flat ? (
        <div className="ia-section-head">
          <h2 id="rating-apps-title" className="ia-section-title ia-section-title--bold">
            {t("Приложения")}
          </h2>
          <span className="ia-section-head__count">{t.number(visible)}</span>
        </div>
      ) : shown.length > 0 ? (
        <h2 id="rating-apps-title" className="ia-section-title ia-section-title--bold">
          {format(s.restTitle, { from: leaders.length + 1, to: items.length })}
        </h2>
      ) : null}
      {/* The same <ol> in both views, so the rows keep their DOM node (and the filter its work).
          The narrow rank label («№ 4») is set once here, not on every row (score.tsx rankVars). */}
      <ol
        ref={listRef}
        id="rating-apps"
        className="ia-rt-list"
        style={rankVars(s.rankShort)}
        start={flat ? undefined : leaders.length + 1}
        data-sort={flat ? sort : "review"}
        aria-labelledby="rating-apps-title"
        hidden={visible === 0}
      >
        {shown.map((item) => (
          <Fragment key={item.slug}>{rows[item.slug]}</Fragment>
        ))}
      </ol>
      {flat && !blank && visible === 0 ? (
        <EmptyCard title={t("Нет подходящих результатов")} body={t("Попробуй другое название или очисти поиск.")} />
      ) : null}
    </>
  );
}
