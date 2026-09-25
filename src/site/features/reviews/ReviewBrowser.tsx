"use client";

import { useEffect, useMemo, useState } from "react";
import { counted } from "@/site/i18n/count";
import { useLocale, useT } from "@/site/i18n/client";
import { INTL_LOCALE } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import {
  Button,
  Card,
  CheckIcon,
  FilterIcon,
  Menu,
  PickerSheet,
  QuoteBlock,
  SearchField,
  type MenuItem,
  type PickerOption,
} from "@/site/ui";
import { cx } from "@/site/ui/cx";
import type { ReviewsStrings } from "./strings";

// Every review of one app (/<L>/reviews/<niche>/<app id>): topic, rating and text filters over
// the complete list. The server renders the first screen (worst first) for readers only; the
// full list comes from GET /api/reviews/<niche>/<id> — the same access rule — once the page is
// idle. Review texts are App Store originals (English, lang="en").
//
// Redesign spec §4.3 (no Swift screen; Clarity blocks only):
//   filters  the topic pill + ClarityTopicPicker sheet (ClarityCatalogs.swift:206-211, 244-273:
//            a tap selects and closes) and the rating pill opening a Menu with a Picker (ticked
//            row, ClarityRatings.swift:196-203).
//   head     «Отзывы» + the bare count (like the Saved section heads, ClarityMy.swift:220-226)
//            and the «Порядок» sort menu at the trailing edge, where the rating puts it
//            (ClarityRatings.swift:195-205); the full «N отзывов» is the live status.
//   list     one ClarityQuoteBlock per review (ClarityReader.swift:870-888) in a grouped box.
//            Web deviation (spec §1.5): a `{n}★` footnote under each quote — the app's quote
//            block ignores `rating`, but the archive filters by it.
//   more     «Показать ещё — осталось N» adds 80 rows (PAGE × 2), not the rest.

export type BrowserTopic = { key: string; label: string; count: number; general: boolean };
export type BrowserReview = { rating: number; text: string; topics: string[] };

const PAGE = 40;

type ApiReview = { rating: number; text: string; theme?: string; themes?: string[] };

function normalize(r: ApiReview): BrowserReview {
  return {
    rating: Math.max(1, Math.min(5, Math.round(r.rating))),
    text: r.text,
    topics: r.themes?.length ? r.themes : r.theme ? [r.theme] : [],
  };
}

/** The tick of a Picker row inside a Menu (an empty slot keeps the labels aligned). */
function tick(on: boolean) {
  return on ? <CheckIcon size={17} strokeWidth={2.4} /> : <span />;
}

export function ReviewBrowser({
  niche,
  id,
  topics,
  total,
  counts,
  initial,
  initialQuery,
  s,
  dataLang,
}: {
  niche: string;
  id: string;
  topics: BrowserTopic[];
  total: number;
  /** Reviews with 1★ … 5★. */
  counts: number[];
  initial: BrowserReview[];
  initialQuery: string;
  s: Pick<
    ReviewsStrings,
    | "topicLabel"
    | "topicSearch"
    | "topicPickerOpen"
    | "allTopics"
    | "ratingLabel"
    | "allRatings"
    | "textSearch"
    | "worstFirst"
    | "bestFirst"
    | "listTitle"
    | "loadingAll"
    | "loadFailed"
    | "showMore"
    | "stars"
    | "reviewsWord"
    | "ratingPill"
    | "optionCount"
    | "emptyBody"
  >;
  /** Language of the topic labels when it is not the page's (de/fr/ja → "en"). */
  dataLang?: string;
}) {
  const locale = useLocale();
  const t = useT();
  const [all, setAll] = useState<BrowserReview[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [worstFirst, setWorstFirst] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const byKey = useMemo(() => new Map(topics.map((tp) => [tp.key, tp])), [topics]);
  const nf = useMemo(() => new Intl.NumberFormat(INTL_LOCALE[locale]), [locale]);

  // The complete list, once the first screen is painted.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(niche)}/${encodeURIComponent(id)}`, {
          credentials: "same-origin",
        });
        const body = res.ok ? ((await res.json()) as { reviews?: ApiReview[] }) : null;
        if (cancelled) return;
        if (Array.isArray(body?.reviews)) setAll(body.reviews.map(normalize));
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void load());
    else window.setTimeout(() => void load(), 300);
    return () => {
      cancelled = true;
    };
  }, [niche, id]);

  const needle = query.trim().toLocaleLowerCase();
  const shown = useMemo(
    () =>
      (all ?? initial)
        .filter(
          (r) =>
            (!topic || r.topics.includes(topic)) &&
            (!stars || r.rating === stars) &&
            (!needle || r.text.toLocaleLowerCase().includes(needle)),
        )
        .sort((a, b) => (worstFirst ? a.rating - b.rating : b.rating - a.rating)),
    [all, initial, topic, stars, needle, worstFirst],
  );

  // Before the full list arrives the counts come from the index, not from the first screen.
  const exact = all !== null;
  const matched = exact
    ? shown.length
    : topic && !stars && !needle
      ? (byKey.get(topic)?.count ?? shown.length)
      : !topic && !stars && !needle
        ? total
        : shown.length;

  const reset = () => setLimit(PAGE);

  // Topic picker: «all», then the concrete topics with their counts, then the general buckets
  // («без конкретной причины»; the index already sorts concrete before general).
  const concrete = topics.filter((tp) => !tp.general);
  const allTopics = format(s.allTopics, { n: nf.format(concrete.length) });
  const topicOptions: PickerOption[] = [
    { value: null, label: allTopics },
    ...[...concrete, ...topics.filter((tp) => tp.general)].map((tp) => ({
      value: tp.key,
      label: format(s.optionCount, { label: tp.label, n: nf.format(tp.count) }),
      lang: dataLang,
    })),
  ];
  const current = topic ? byKey.get(topic) : undefined;
  const topicName = current?.label ?? allTopics;

  const ratingItems: MenuItem[] = [0, 1, 2, 3, 4, 5].map((n) => ({
    label: n ? format(s.optionCount, { label: `${n}★`, n: nf.format(counts[n - 1] ?? 0) }) : s.allRatings,
    checked: stars === n,
    icon: tick(stars === n),
    onSelect: () => {
      setStars(n);
      reset();
    },
  }));
  const sortItems: MenuItem[] = [true, false].map((worst) => ({
    label: worst ? s.worstFirst : s.bestFirst,
    checked: worstFirst === worst,
    icon: tick(worstFirst === worst),
    onSelect: () => {
      setWorstFirst(worst);
      reset();
    },
  }));

  return (
    <>
      <div className="ia-rv-filters">
        <SearchField
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            reset();
          }}
          placeholder={s.textSearch}
          clearLabel={t("Очистить поиск")}
        />
        <div className="ia-rv-controls">
          <button
            type="button"
            className="ia-pill"
            aria-haspopup="dialog"
            aria-label={format(s.topicPickerOpen, { name: topicName })}
            onClick={() => setPickerOpen(true)}
          >
            <span lang={current ? dataLang : undefined}>{topicName}</span>
            <FilterIcon size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <Menu
            className="ia-menu-anchor--tick"
            align="start"
            label={s.ratingLabel}
            // The name contains the visible «3★» (label in name): «Оценка: 3★» / «Все оценки».
            triggerLabel={stars ? format(s.ratingPill, { stars: `${stars}★` }) : s.allRatings}
            triggerClassName="ia-pill"
            trigger={
              <>
                <span>{stars ? `${stars}★` : s.allRatings}</span>
                <FilterIcon size={14} strokeWidth={2.2} aria-hidden="true" />
              </>
            }
            items={ratingItems}
          />
        </div>
      </div>

      <section className="ia-stack" aria-labelledby="reviews-list-title">
        <div className="ia-rv-listhead">
          <div className="ia-section-head ia-section-head--baseline">
            <div className="ia-rv-listhead__title">
              <h2 id="reviews-list-title" className="ia-section-title ia-section-title--bold">
                {s.listTitle}
              </h2>
              <span className="ia-section-head__count" aria-hidden="true">
                {nf.format(matched)}
              </span>
            </div>
            <Menu
              className="ia-menu-anchor--tick"
              align="end"
              label={t("Сортировка")}
              triggerLabel={t("Порядок")}
              triggerClassName="ia-sort-btn"
              trigger={
                <>
                  <FilterIcon size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{t("Порядок")}</span>
                </>
              }
              items={sortItems}
            />
          </div>
          <p className="sr-only" role="status">
            {counted(locale, matched, s.reviewsWord)}
          </p>
          {!exact && !failed ? <p className="ia-footnote">{s.loadingAll}</p> : null}
          {failed ? <p className="ia-footnote">{s.loadFailed}</p> : null}
        </div>

        {shown.length === 0 ? (
          exact ? (
            <Card className="ia-rs-empty">
              <p className="ia-rs-empty__title">{t("Пока ничего не нашлось")}</p>
              <p className="ia-rs-empty__body">{s.emptyBody}</p>
            </Card>
          ) : null
        ) : (
          <Card as="ol" variant="group" className="ia-rv-reviews">
            {shown.slice(0, limit).map((r, i) => (
              <li key={`${i}:${r.rating}:${r.text.slice(0, 32)}`} className="ia-rv-review">
                <QuoteBlock
                  lang="en"
                  captionClassName="ia-rv-review__meta"
                  caption={
                    <>
                      <span className="ia-rv-stars">
                        <span aria-hidden="true">{r.rating}★</span>
                        <span className="sr-only">{format(s.stars, { n: r.rating })}</span>
                      </span>
                      {r.topics.map((key) => {
                        const tp = byKey.get(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            lang={dataLang}
                            className={cx("ia-rv-topic", tp?.general && "ia-rv-topic--general")}
                            aria-pressed={topic === key}
                            onClick={() => {
                              setTopic(topic === key ? null : key);
                              reset();
                            }}
                          >
                            {tp?.label ?? key}
                          </button>
                        );
                      })}
                    </>
                  }
                >
                  {r.text}
                </QuoteBlock>
              </li>
            ))}
          </Card>
        )}

        {shown.length > limit ? (
          <Button variant="text" className="ia-btn--body ia-btn--flush" onClick={() => setLimit((v) => v + PAGE * 2)}>
            {format(s.showMore, { n: nf.format(shown.length - limit) })}
          </Button>
        ) : null}
      </section>

      <PickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={s.topicLabel}
        searchPlaceholder={s.topicSearch}
        options={topicOptions}
        selected={topic}
        onSelect={(key) => {
          setTopic(key);
          setPickerOpen(false);
          reset();
        }}
      />
    </>
  );
}
