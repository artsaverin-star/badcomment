"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@/site/i18n/locales";
import { buttonClass } from "@/site/ui/Button";
import { PulseCard } from "./PulseCard";
import { endPhrase, loadedPhrase, type PulseFeedItem, type PulseFeedStrings } from "./query";

// The «Пульс» feed list with auto-loading (owner, 2026-09-26: «неудобно пагинация, пусть
// автоподгрузка будет»; docs/site-v2/PULSE.md «Auto-loading»).
//
// • The page renders its cards on the server and hands them in as `children` (the same <li>s
//   as before); this component only appends. When a sentinel on the list's bottom edge comes within
//   ~1000 px of the viewport it fetches the next page from GET /api/site/pulse (the same
//   selection, 24 per page, the current category and search) and renders those needs with the
//   same PulseCard, so an appended card is the server's card. Only the slim card fields travel
//   (PulseFeedItem); the file never reaches the client.
// • Without JavaScript nothing changes: the «← Назад · 1 / 25 · Дальше →» links are in the HTML
//   (crawlers, no-JS), and ?page=N renders that page. Once hydrated the counter and «Дальше» go
//   away (a later page keeps its «← Назад»); the list grows by itself instead.
// • Loading: three skeleton cards in the grid and aria-busy on the list; a failure shows
//   «Не удалось загрузить продолжение» with «Повторить» (no automatic retries); the end is one
//   quiet line, «Это все 585 болей». Every arrival is announced politely («Загружены ещё 24
//   боли. Показано 48 из 585.»); focus is never moved, except to the first new card after a
//   «Повторить» that was pressed (its button goes away).
// • The list only keeps growing by itself while the view stays put (a screen taller than the
//   list). If the view moved with the list as a page went in, loading waits for the reader to
//   scroll: otherwise whatever held the view at the list's end (scroll anchoring) would pull in
//   page after page on its own.
// • Back: the appended cards and the scroll position are kept in sessionStorage (`ia2:pulse.feed`,
//   30 minutes, with the data version) under this history entry's own id (history.state.iaPulseFeed
//   = { key: locale + filters + first page, entry: a random id }, set on mount), and restored only
//   in that entry — Back/Forward and reload. A fresh visit through a link or a tab gets a new id,
//   so it never picks up another visit's list or position.

const ROOT_MARGIN = "0px 0px 1000px 0px";
const STORE_KEY = "ia2:pulse.feed";
const HISTORY_KEY = "iaPulseFeed";
const TTL_MS = 30 * 60 * 1000;
/** Lists kept for Back (the last few history entries); ≤ 585 slim cards each. */
const MAX_SNAPSHOTS = 3;
/** Skeleton cards while a page loads: a full row at three columns (CSS shows two below 1280 px). */
const SKELETONS = 3;

type Page = { version: string; page: number; pages: number; total: number; items: PulseFeedItem[] };
type Feed = {
  /** Cards appended after the server's page, in feed order, without the server's ids. */
  items: PulseFeedItem[];
  /** The last page on screen. */
  loaded: number;
  pages: number;
  total: number;
  /** How many of `items` came back from sessionStorage (they do not fade in). */
  restored: number;
};
/** A history entry's mark: the list it shows (locale|category|q|page) and the entry's own id. */
type Mark = { key: string; entry: string };
type Snapshot = Omit<Feed, "restored"> & Mark & { version: string; at: number; y: number };

async function fetchPage(locale: Locale, category: string, q: string, page: number, signal: AbortSignal): Promise<Page> {
  const params = new URLSearchParams({ l: locale, page: String(page) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  const res = await fetch(`/api/site/pulse?${params}`, { signal });
  if (!res.ok) throw new Error(`pulse ${res.status}`);
  const body = (await res.json()) as Page;
  if (!Array.isArray(body?.items)) throw new Error("pulse: malformed page");
  return body;
}

function readSnapshots(): Snapshot[] {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const value = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(value)
      ? (value as Snapshot[]).filter((s) => s && typeof s.key === "string" && typeof s.entry === "string" && Array.isArray(s.items))
      : [];
  } catch {
    return [];
  }
}

/** Keep `snapshot` for its history entry (null: forget the entry's list); drops expired lists and the oldest beyond MAX_SNAPSHOTS. */
function writeSnapshot(entry: string, snapshot: Snapshot | null): void {
  try {
    const now = Date.now();
    const others = readSnapshots().filter((s) => s.entry !== entry && now - s.at < TTL_MS);
    const next = snapshot ? [snapshot, ...others].slice(0, MAX_SNAPSHOTS) : others;
    try {
      if (next.length) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(next));
      else window.sessionStorage.removeItem(STORE_KEY);
    } catch {
      // Over the quota: keep this list alone.
      if (snapshot) window.sessionStorage.setItem(STORE_KEY, JSON.stringify([snapshot]));
    }
  } catch {
    // storage unavailable (private mode): Back then shows the first page
  }
}

/** This history entry's mark, if the feed has marked it before (Back/Forward and reload keep history.state). */
function entryMark(): Mark | null {
  const state = window.history.state as Record<string, unknown> | null;
  const mark = state && typeof state === "object" ? (state[HISTORY_KEY] as Partial<Mark> | null | undefined) : null;
  return mark && typeof mark === "object" && typeof mark.key === "string" && typeof mark.entry === "string" ? { key: mark.key, entry: mark.entry } : null;
}

function markEntry(mark: Mark): void {
  try {
    const state = window.history.state as Record<string, unknown> | null;
    window.history.replaceState({ ...(state && typeof state === "object" ? state : {}), [HISTORY_KEY]: mark }, "");
  } catch {
    // history can be locked down in sandboxed frames; Back then shows the first page
  }
}

/** A new history entry's id (randomUUID needs a secure context; plain http falls back). */
function newEntryId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const noSubscribe = () => () => {};
/** False while the server's HTML is being hydrated (and on the server), true afterwards. */
const useHydrated = () =>
  useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

export function PulseFeed({
  locale,
  category,
  q,
  page,
  pages,
  total,
  version,
  ids,
  prevHref,
  nextHref,
  strings: s,
  children,
}: {
  locale: Locale;
  category: string;
  q: string;
  /** The page the server rendered (?page=N, clamped). */
  page: number;
  pages: number;
  /** Needs matching the filters. */
  total: number;
  /** pulseDataVersion of the file the server page was rendered from. */
  version: string;
  /** Ids of the server-rendered cards, in order. */
  ids: readonly string[];
  prevHref: string | null;
  nextHref: string | null;
  strings: PulseFeedStrings;
  /** The server-rendered cards: one <li> each. */
  children?: ReactNode;
}) {
  const key = `${locale}|${category}|${q}|${page}`;
  const hydrated = useHydrated();
  const [feed, setFeed] = useState<Feed>({ items: [], loaded: page, pages, total, restored: 0 });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const scrollY = useRef(0);
  const restoreY = useRef<number | null>(null);
  /** After a «Повторить» that held the focus: the index (in `items`) of the first new card. */
  const focusFrom = useRef<number | null>(null);
  /** A page came from a newer file than the server's page (a deploy mid-scroll): keep nothing for Back. */
  const mixed = useRef(false);
  /** This history entry's id (set on mount): the key of the list kept for Back. */
  const entry = useRef<string | null>(null);
  /** scrollY as the last page went in, until the new observer's first look (then null). */
  const settledY = useRef<number | null>(null);
  /** The view moved with the list as a page went in: no loading until the reader scrolls. */
  const [held, setHeld] = useState(false);
  const heldY = useRef(0);

  const done = feed.loaded >= feed.pages;
  const shown = ids.length + feed.items.length;

  /** Keep the appended cards and the scroll position for Back (nothing to keep before a page arrives). */
  const save = () => {
    if (!entry.current || !feed.items.length || mixed.current) return;
    writeSnapshot(entry.current, {
      key,
      entry: entry.current,
      version,
      at: Date.now(),
      items: feed.items,
      loaded: feed.loaded,
      pages: feed.pages,
      total: feed.total,
      y: scrollY.current,
    });
  };
  const persist = useEffectEvent(save);

  // Mount: a history entry this feed has marked before (Back/Forward, reload) keeps its id; any
  // other visit gets a new one. In a marked entry, when a fresh list of the same data is kept
  // under its id, put the appended cards back and, once they are in the DOM, the scroll
  // position. Once per mount (StrictMode runs mount effects twice).
  const restore = useEffectEvent(() => {
    if (entry.current) return;
    const mark = entryMark();
    const back = mark !== null && mark.key === key;
    entry.current = back ? mark.entry : newEntryId();
    markEntry({ key, entry: entry.current });
    scrollY.current = window.scrollY;
    if (!back) return;
    const saved = readSnapshots().find((x) => x.entry === entry.current && x.key === key);
    if (!saved || saved.version !== version || Date.now() - saved.at >= TTL_MS) return;
    const known = new Set(ids);
    const items = saved.items.filter((item) => item && typeof item.id === "string" && !known.has(item.id) && known.add(item.id));
    if (!items.length) return;
    restoreY.current = typeof saved.y === "number" ? saved.y : null;
    setFeed({ items, loaded: Math.max(page, Math.min(saved.loaded, saved.pages)), pages: saved.pages, total: saved.total, restored: items.length });
  });
  useLayoutEffect(() => {
    // The list kept for Back lives in sessionStorage and history.state, which the server cannot
    // read: it can only be put back after hydration, in one extra render before paint.
    restore();
  }, []);

  // The restored position, once the restored cards are laid out (not in the mount commit: on the
  // server's short page the position would be clamped, and scroll anchoring would then follow the
  // footer down as the cards go in above it).
  useLayoutEffect(() => {
    const y = restoreY.current;
    if (y === null || !feed.restored) return;
    restoreY.current = null;
    window.scrollTo(0, y);
    scrollY.current = window.scrollY;
  }, [feed]);

  // The scroll position is tracked as it changes and saved when the reader leaves: a card
  // click, a full navigation (pagehide) or the unmount of a client navigation. The listener goes
  // in a layout cleanup, before the next page's scroll to the top can reach it.
  useLayoutEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
    };
    const onHide = () => persist();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      persist();
    };
  }, []);

  // Every page that arrives is kept for Back at once.
  useEffect(() => {
    if (feed.items.length > feed.restored) persist();
  }, [feed]);

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  const loadNext = () => {
    if (request.current || done) return;
    const next = feed.loaded + 1;
    const ac = new AbortController();
    request.current = ac;
    setLoading(true);
    fetchPage(locale, category, q, next, ac.signal).then(
      (res) => {
        if (ac.signal.aborted) return;
        request.current = null;
        if (res.version !== version && !mixed.current) {
          mixed.current = true;
          if (entry.current) writeSnapshot(entry.current, null);
        }
        settledY.current = window.scrollY;
        const known = new Set([...ids, ...feed.items.map((item) => item.id)]);
        const fresh = res.items.filter((item) => !known.has(item.id) && known.add(item.id));
        const pagesNow = Math.max(page, res.pages);
        if (errorRef.current?.contains(document.activeElement)) focusFrom.current = feed.items.length;
        setFeed({ ...feed, items: [...feed.items, ...fresh], loaded: res.items.length ? Math.min(next, pagesNow) : pagesNow, pages: pagesNow, total: res.total });
        setFailed(false);
        setLoading(false);
        setAnnouncement(loadedPhrase(locale, s, fresh.length, shown + fresh.length, res.total));
      },
      () => {
        if (ac.signal.aborted) return;
        request.current = null;
        setFailed(true);
        setLoading(false);
        setAnnouncement(s.loadError);
      },
    );
  };
  // The observer's first look after a page went in. With the view where it was, the screen is
  // taller than the list and the next page loads. If the view moved with the list (scroll
  // anchoring held something below the list in place, or the reader was mid-scroll), loading
  // waits for the reader to scroll, so at most one page arrives per scroll.
  const onNearEnd = useEffectEvent((near: boolean, first: boolean) => {
    const settled = settledY.current;
    if (first) settledY.current = null;
    if (!near) return;
    if (first && settled !== null && Math.abs(window.scrollY - settled) >= 1) {
      heldY.current = window.scrollY;
      setHeld(true);
      return;
    }
    loadNext();
  });

  // The sentinel: a new observer after every page (its first callback re-checks the distance,
  // so a tall screen keeps loading until the list reaches past it); none while loading, after
  // a failure (until «Повторить»), while held or at the end.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || loading || failed || held || typeof IntersectionObserver === "undefined") return;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        onNearEnd(
          entries.some((e) => e.isIntersecting),
          first,
        );
        first = false;
      },
      { rootMargin: ROOT_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, loading, failed, held, feed.loaded]);

  // Held: the reader's own scroll (the position changes — not the anchoring's adjustment, which
  // is already in heldY — or a wheel, touch or key at the bottom of the page) lets the observer
  // look again.
  useEffect(() => {
    if (!held) return;
    const release = () => setHeld(false);
    const onScroll = () => {
      if (Math.abs(window.scrollY - heldY.current) >= 1) release();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchmove", release);
      window.removeEventListener("keydown", release);
    };
  }, [held]);

  // After «Повторить»: the button is gone, so its focus goes on to the first new card.
  useEffect(() => {
    const from = focusFrom.current;
    if (from === null) return;
    focusFrom.current = null;
    listRef.current?.children[ids.length + from]?.querySelector<HTMLElement>("a")?.focus();
  }, [feed, ids.length]);

  const skeletons = loading && !failed;
  const end = done && page === 1 && feed.pages > 1 ? endPhrase(locale, s, feed.total) : null;

  return (
    <>
      <ul ref={listRef} className="ia-grid ia-pulse-grid" aria-busy={loading || undefined} data-pulse-feed="" data-pages={feed.pages} onClickCapture={save}>
        {children}
        {feed.items.map((item, i) => (
          <li key={item.id} className={i >= feed.restored ? "ia-pulse-grid__new" : undefined}>
            <PulseCard need={item} categoryName={item.categoryName} locale={locale} strings={s} />
          </li>
        ))}
        {skeletons
          ? Array.from({ length: SKELETONS }, (_, i) => (
              <li key={`skeleton-${i}`} className={i === 2 ? "ia-pulse-skeleton ia-pulse-skeleton--third" : "ia-pulse-skeleton"} aria-hidden="true">
                <span className="ia-pulse-card ia-pulse-card--skeleton">
                  <span className="ia-skeleton ia-pulse-skeleton__category" />
                  <span className="ia-skeleton ia-pulse-skeleton__title" />
                  <span className="ia-skeleton ia-pulse-skeleton__title ia-pulse-skeleton__title--short" />
                  <span className="ia-pulse-skeleton__gauge">
                    <span className="ia-skeleton ia-pulse-skeleton__dial" />
                    <span className="ia-skeleton ia-pulse-skeleton__level" />
                  </span>
                  <span className="ia-skeleton ia-pulse-skeleton__counts" />
                </span>
              </li>
            ))
          : null}
        {/* Out of the grid flow, at the list's bottom edge (pulse.css). */}
        {done ? null : <li ref={sentinelRef} className="ia-pulse-sentinel" aria-hidden="true" data-pulse-sentinel="" />}
      </ul>
      {failed ? (
        <div ref={errorRef} className="ia-pulse-more" data-pulse-error="">
          <p className="ia-pulse-more__text">{s.loadError}</p>
          <button
            type="button"
            className={buttonClass({ variant: "secondary", size: "sm" })}
            aria-disabled={loading || undefined}
            onClick={() => {
              if (!loading) loadNext();
            }}
          >
            {loading ? <span className="ia-spinner" aria-hidden="true" /> : null}
            {s.retry}
          </button>
        </div>
      ) : null}
      {end ? (
        <p className="ia-pulse-end" data-pulse-end="">
          {end}
        </p>
      ) : null}
      {/* Always in the accessibility tree, so the first arrival is announced too. */}
      <p className="ia-pulse-sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {pages > 1 && (!hydrated || prevHref) ? (
        <nav className="ia-pulse-pagination" aria-label={s.pages} data-pulse-pagination="">
          {prevHref ? <Link href={prevHref}>← {s.previous}</Link> : <span />}
          {hydrated ? null : (
            <span>
              {page} / {pages}
            </span>
          )}
          {nextHref && !hydrated ? <Link href={nextHref}>{s.next} →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}
