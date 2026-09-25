"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useT } from "@/site/i18n/client";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { Button, EmptyCard, SearchField } from "@/site/ui";
import { RatingSearchRow } from "./RatingSearchRow";
import { revealSearchField } from "./reveal";
import { replaceUrl } from "./viewState";

// The rating catalogue's search (ClarityRatingsView, ClarityRatings.swift:67-123; spec 11 §4.1).
// Default mode shows `children` — the server-rendered group chips and the grid of niche cards;
// typing switches to apps from every niche (title, niche name, «для каких задач»), one
// RatingSearchRow each (icon, title, «Привычки · № 2 · 4,8★», summary, score). The corpus is
// ~4,400 apps, so matching runs on the server (GET /api/site/rating-search): debounced, the
// previous request cancelled, the previous results kept on screen (dimmed) until the next ones
// arrive. The first 40 results come at once; «Показать остальные N» loads the rest (the app
// lists everything, spec 10 §1.5). A failed request replaces the list with the app's
// «Не удалось открыть каталог» card (:84-85) and a retry.
// The query survives Back like the app's @State (:69): it is mirrored into ?q= (viewState.ts),
// read back through useSearchParams on mount, and the last results are kept in memory for the
// session, so returning from an app shows the same list at once.
// Needs <I18nProvider strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(L) }}> (the
// rows read the web strings).

const DEBOUNCE_MS = 200;
const URL_DEBOUNCE_MS = 250;
/** = RATING_SEARCH_PAGE of sitedata/rating.ts (server-only). */
const FIRST_PAGE = 40;

/**
 * One row of GET /api/site/rating-search (spec 11 §4.1). PUBLIC: the whole rating is free
 * (owner, 2026-09-25, spec 11 D2).
 */
export type RatingSearchHit = {
  niche: string;
  nicheName: string;
  nicheLang: string;
  slug: string;
  /** The app's rank in that niche. */
  rank: number;
  title: string;
  /** Compact Apple CDN path of the icon (media.ts), or null. */
  icon: string | null;
  realScore: number | null;
  storeAvg: number | null;
  summary: string | null;
  summaryLang: string;
};

type Page = { total: number; items: RatingSearchHit[] };
type Results = Page & { q: string };

async function fetchPage(locale: Locale, q: string, offset: number, limit: number | "all", signal: AbortSignal): Promise<Page> {
  const params = new URLSearchParams({ l: locale, q, offset: String(offset), limit: String(limit) });
  const res = await fetch(`/api/site/rating-search?${params}`, { signal });
  if (!res.ok) throw new Error(`rating-search ${res.status}`);
  return (await res.json()) as Page;
}

// The results of the last queries in this browser session (client only: fetches never run on
// the server, so a server render always starts empty and hydration matches).
const MEMORY_SIZE = 8;
const memory = new Map<string, Results>();
const memoryKey = (locale: Locale, q: string) => `${locale}\u0000${q}`;
function remember(locale: Locale, results: Results): void {
  const key = memoryKey(locale, results.q);
  memory.delete(key);
  memory.set(key, results);
  if (memory.size > MEMORY_SIZE) memory.delete(memory.keys().next().value as string);
}

export function RatingCatalog({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = useT();
  const params = useSearchParams();
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [results, setResults] = useState<Results | null>(() => memory.get(memoryKey(locale, query.trim())) ?? null);
  // A query from the URL without remembered results loads on mount.
  const [pending, setPending] = useState(() => query.trim() !== "" && results === null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const urlTimer = useRef<number | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  /** The trimmed query of the results on screen or on their way. */
  const wanted = useRef(query.trim());
  /** After «Показать остальные» the button is gone: focus the first appended row. */
  const focusFrom = useRef<number | null>(null);

  const q = query.trim();
  const searching = q !== "";

  const cancel = () => {
    window.clearTimeout(timer.current);
    request.current?.abort();
    request.current = null;
    setLoadingMore(false);
  };

  /** Fetch the first page of `trimmed` now (state updates only in the callbacks). */
  const load = (trimmed: string) => {
    const ac = new AbortController();
    request.current = ac;
    fetchPage(locale, trimmed, 0, FIRST_PAGE, ac.signal).then(
      (page) => {
        if (ac.signal.aborted) return;
        const next = { q: trimmed, ...page };
        remember(locale, next);
        setResults(next);
        setPending(false);
      },
      () => {
        if (ac.signal.aborted) return;
        setPending(false);
        setFailed(true);
      },
    );
  };

  const search = (text: string, force = false) => {
    const trimmed = text.trim();
    if (!force && trimmed === wanted.current) return; // only whitespace changed
    cancel();
    wanted.current = trimmed;
    setFailed(false);
    if (!trimmed) {
      setResults(null);
      setPending(false);
      return;
    }
    const known = force ? undefined : memory.get(memoryKey(locale, trimmed));
    if (known) {
      setResults(known);
      setPending(false);
      return;
    }
    setPending(true);
    timer.current = window.setTimeout(() => load(trimmed), DEBOUNCE_MS);
  };

  // Mount: a query restored from the URL (Back, a shared link) without remembered results.
  const loadRestored = useEffectEvent(() => {
    if (wanted.current && pending) load(wanted.current);
  });
  useEffect(() => {
    loadRestored();
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(urlTimer.current);
      request.current?.abort();
    };
  }, []);

  // The query in the URL (?q=), debounced; flushed before a result link navigates away (a
  // capture listener runs before the link's own click handler).
  useEffect(() => {
    const id = window.setTimeout(() => {
      urlTimer.current = undefined;
      replaceUrl(routes.rating(locale, { q: q || undefined }));
    }, URL_DEBOUNCE_MS);
    urlTimer.current = id;
    return () => window.clearTimeout(id);
  }, [locale, q]);
  const flushUrl = () => {
    if (urlTimer.current === undefined) return;
    window.clearTimeout(urlTimer.current);
    urlTimer.current = undefined;
    replaceUrl(routes.rating(locale, { q: q || undefined }));
  };

  // The app scrolls to the top after every query change (:106): measure after the DOM update.
  const revealed = useRef(q);
  useLayoutEffect(() => {
    if (revealed.current === q) return;
    revealed.current = q;
    revealSearchField(fieldRef.current);
  }, [q]);

  useEffect(() => {
    const from = focusFrom.current;
    if (from === null) return;
    focusFrom.current = null;
    listRef.current?.children[from]?.querySelector<HTMLElement>("a")?.focus();
  }, [results]);

  const showRest = () => {
    if (!results || loadingMore) return;
    const base = results;
    cancel();
    const ac = new AbortController();
    request.current = ac;
    setLoadingMore(true);
    fetchPage(locale, base.q, base.items.length, "all", ac.signal).then(
      (page) => {
        if (ac.signal.aborted) return;
        focusFrom.current = base.items.length;
        const next = { q: base.q, total: page.total, items: [...base.items, ...page.items] };
        remember(locale, next);
        setResults(next);
        setLoadingMore(false);
      },
      () => {
        if (ac.signal.aborted) return;
        setLoadingMore(false);
        setFailed(true);
      },
    );
  };

  const failure = searching && failed;
  // The results on screen: this query's, or the previous query's (dimmed) while the next load.
  const shown = searching && !failed ? results : null;
  // «Показать остальные» only for this query's own, settled results.
  const rest = shown && shown.q === q && !pending ? shown.total - shown.items.length : 0;
  // A failure is announced here but shown by the card below (the line itself is hidden then).
  const status = failure ? t("Не удалось открыть каталог") : shown ? t("Найдено приложений: %1$@", [t.number(shown.total)]) : "";

  return (
    <>
      <SearchField
        ref={fieldRef}
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          search(value);
        }}
        placeholder={t("Приложение или задача")}
        clearLabel={t("Очистить поиск")}
        className="ia-rt-catalog__search"
      />
      {/* Always in the accessibility tree (an empty one is clipped, not display:none), so the
          first count is announced too. */}
      <p className={failure ? "sr-only" : "ia-search-status"} role="status" aria-live="polite">
        {status}
      </p>
      <div className="ia-rt-results" aria-busy={pending || loadingMore || undefined} onClickCapture={flushUrl}>
        {failure ? (
          <EmptyCard title={t("Не удалось открыть каталог")}>
            <Button variant="text" className="ia-btn--flush" onClick={() => search(query, true)}>
              {t("Повторить")}
            </Button>
          </EmptyCard>
        ) : shown ? (
          shown.total === 0 ? (
            <EmptyCard
              title={t("Пока не нашли")}
              body={t("Попробуй название приложения или тему: например, календарь, фото или привычки.")}
            />
          ) : (
            <>
              {/* The rows are h3s; without the group heads the list needs its own h2. */}
              <h2 id="rating-results-title" className="sr-only">
                {t("Приложения")}
              </h2>
              <ol ref={listRef} className="ia-stack" aria-labelledby="rating-results-title">
                {shown.items.map((item) => (
                  <RatingSearchRow key={`${item.niche}/${item.slug}`} hit={item} href={routes.ratingApp(locale, item.niche, item.slug)} />
                ))}
              </ol>
              {rest > 0 ? (
                <Button variant="text" className="ia-btn--body ia-btn--flush" busy={loadingMore} onClick={showRest}>
                  {t("Показать остальные %1$@", [t.number(rest)])}
                </Button>
              ) : null}
            </>
          )
        ) : (
          // Default mode — and the first results of a query still on their way.
          children
        )}
      </div>
    </>
  );
}
