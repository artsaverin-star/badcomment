"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { plural } from "@/lib/format";
import { marketPlayerKeywords, marketPlayerRows, type MarketMode, type MarketSnapshot } from "@/lib/marketPlayers";

export default function MarketPlayersList({ data, locale }: { data: MarketSnapshot; locale: Locale }) {
  const ru = locale === "ru";
  const language = ru ? "ru-RU" : "en-US";
  const [mode, setMode] = useState<MarketMode>("search");
  const [term, setTerm] = useState(data.leaderTerm);
  const [limit, setLimit] = useState(5);
  const keyword = data.keywords.find((row) => row.term === (mode === "leaders" ? data.leaderTerm : term))!;
  const rows = marketPlayerRows(data, mode, term);
  const shown = rows.slice(0, limit);
  const leaderCount = data.keywords.find((row) => row.term === data.leaderTerm)!.results.length;
  const nf = (n: number) => n.toLocaleString(language);
  const compact = (n: number) => new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const date = (value: string) => new Date(value).toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const selectMode = (value: MarketMode) => { setMode(value); setLimit(5); };

  return (
    <section id="main-players" aria-labelledby="main-players-heading" className="mt-24 scroll-mt-24">
      <h2 id="main-players-heading" className="text-title2 text-[var(--color-text-primary)]">{ru ? "Основные игроки" : "Main players"}</h2>
      <p className="mt-4 text-callout text-[var(--color-text-tertiary)]">App Store · {ru ? "США" : "United States"} · {date(data.collectedAt)}</p>

      <div className="mt-7 flex justify-center" role="group" aria-label={ru ? "Порядок приложений" : "App ordering"}>
        <div className="inline-flex rounded-full border border-[var(--color-border-subtle)] p-0.5">
          {(["search", "leaders"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => selectMode(value)} className={`rounded-full px-5 py-2 text-footnote transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${mode === value ? "bg-[var(--color-text-primary)] font-medium text-[var(--color-bg-page)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}>
              {value === "search" ? (ru ? "Топ выдачи" : "Search results") : (ru ? "Лидеры ниши" : "Niche leaders")}
            </button>
          ))}
        </div>
      </div>

      {mode === "search" ? (
        <div className="mt-6">
          <div role="group" aria-label={ru ? "Ключевые слова" : "Keywords"} className="flex flex-wrap gap-2">
            {data.keywords.map((row) => (
              <button key={row.term} type="button" aria-pressed={term === row.term} onClick={() => { setTerm(row.term); setLimit(5); }} className={`rounded-[10px] border px-3 py-2 text-footnote transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${term === row.term ? "border-[var(--color-text-primary)] bg-[var(--color-bg-muted)] font-medium text-[var(--color-text-primary)]" : "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}>{row.term}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-footnote text-[var(--color-text-tertiary)]">
            <span>{ru ? `${nf(keyword.results.length)} ${plural(keyword.results.length, "приложение", "приложения", "приложений")} в выборке` : `${keyword.results.length} apps in this sample`}</span>
            <span>{ru ? "Порядок поиска App Store" : "App Store search order"}</span>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-footnote text-[var(--color-text-tertiary)]">{ru ? `По числу оценок среди ${leaderCount} приложений из выдачи «${data.leaderTerm}».` : `By rating count among ${leaderCount} apps found for “${data.leaderTerm}”.`}</p>
      )}

      <p className="sr-only" role="status" aria-live="polite">{mode === "search" ? term : (ru ? "Лидеры ниши" : "Niche leaders")} · {shown.length} / {rows.length}</p>
      {rows.length === 0 && <p className="mt-5 rounded-[20px] border border-[var(--color-border-subtle)] p-5 text-callout text-[var(--color-text-tertiary)]">{ru ? "В сохранённой выдаче по этому запросу нет приложений." : "No apps were returned for this query in the saved snapshot."}</p>}
      <ol className="mt-5 flex flex-col gap-4" aria-label={mode === "search" ? (ru ? `Выдача по запросу ${term}` : `Results for ${term}`) : (ru ? "Приложения по числу оценок" : "Apps by rating count")}>
        {shown.map(({ app, ranking }) => {
          const keywords = marketPlayerKeywords(data, app.appStoreId);
          const storeUrl = `https://apps.apple.com/${data.store}/app/id${app.appStoreId}`;
          return (
            <li key={app.appStoreId} data-app-id={app.appStoreId} className="card-min min-w-0 overflow-hidden rounded-[20px] p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={app.iconUrl} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[12px] object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-callout font-semibold leading-snug text-[var(--color-text-primary)] sm:text-body"><a href={storeUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{app.name}<span className="sr-only">{ru ? " — App Store, новая вкладка" : " — App Store, new tab"}</span></a></h3>
                  <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">{app.averageRating?.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? "—"} ★ · {app.ratingCount === null ? (ru ? "нет числа оценок" : "rating count unavailable") : `${nf(app.ratingCount)} ${ru ? plural(app.ratingCount, "оценка", "оценки", "оценок") : (app.ratingCount === 1 ? "rating" : "ratings")}`}</p>
                </div>
                <div className="shrink-0 text-right" title={mode === "leaders" && app.ratingCount !== null ? nf(app.ratingCount) : undefined}>
                  <span className="block text-title3 font-bold tabular-nums text-[var(--color-text-primary)]">{mode === "search" ? `#${ranking}` : app.ratingCount === null ? "—" : compact(app.ratingCount)}</span>
                  <span className="block text-caption text-[var(--color-text-tertiary)]">{mode === "search" ? (ru ? "в выдаче" : "in search") : (ru ? "оценок" : "ratings")}</span>
                </div>
              </div>
              {app.subtitle && <p className="mt-3 text-footnote text-[var(--color-text-secondary)]">{app.subtitle}</p>}

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" role="group" aria-label={ru ? `Скриншоты ${app.name}` : `${app.name} screenshots`} tabIndex={0}>
                {app.screenshots.length ? app.screenshots.map((src, index) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block shrink-0 overflow-hidden rounded-[12px] bg-[var(--color-bg-muted)] focus-visible:outline-2 focus-visible:outline-offset-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={ru ? `${app.name}: скриншот ${index + 1}, открыть полностью` : `${app.name}: screenshot ${index + 1}, open full size`} loading="lazy" decoding="async" className="h-[180px] w-auto max-w-none object-contain sm:h-[216px]" />
                  </a>
                )) : <p className="py-4 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Скриншоты пока недоступны" : "Screenshots not available yet"}</p>}
              </div>

              <div className="mt-3">
                <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Ключи в выборке" : "Keywords in this sample"}</p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {keywords.map((key) => <li key={key.term} className="text-footnote text-[var(--color-text-secondary)]">{key.term} <span className="ml-1 font-semibold tabular-nums text-[var(--color-text-primary)]">#{key.ranking}</span></li>)}
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border-subtle)] pt-3 text-footnote font-medium text-[var(--color-text-secondary)]">
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-2.5" aria-label={ru ? `${app.name} в App Store, новая вкладка` : `${app.name} on the App Store, new tab`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/badges/app-store.svg" alt={ru ? "Загрузите в App Store" : "Download on the App Store"} width={120} height={40} className="h-10 w-auto" />
                </a>
                {app.reviewHref && <a href={app.reviewHref} className="underline-offset-4 hover:underline">{ru ? "Наш разбор отзывов →" : "Our review analysis →"}</a>}
              </div>
            </li>
          );
        })}
      </ol>
      {limit < rows.length && <button type="button" onClick={() => setLimit((value) => value + 5)} className="mt-4 w-full rounded-full border border-[var(--color-border-subtle)] py-3 text-footnote font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]">{ru ? `Показать ещё ${Math.min(5, rows.length - limit)}` : `Show ${Math.min(5, rows.length - limit)} more`}</button>}

      <details className="mt-5 text-caption text-[var(--color-text-tertiary)]">
        <summary className="cursor-pointer py-2">{ru ? "Данные и источники" : "Data & sources"}</summary>
        <div className="space-y-2 pt-1">
          <p>{ru ? `Поиск App Store: ${date(data.collectedAt)} · ${data.keywords.length} ${plural(data.keywords.length, "запрос", "запроса", "запросов")} · ${data.apps.length} ${plural(data.apps.length, "приложение", "приложения", "приложений")}. Ключи у приложения — только найденные позиции в этой выборке.` : `App Store search: ${date(data.collectedAt)} · ${data.keywords.length} queries · ${data.apps.length} apps. An app’s keywords show only positions found in this sample.`}</p>
          <p>{ru ? "Позиции соответствуют ответу Apple Search API и могут отличаться от выдачи на устройстве. Число оценок не равно установкам или доле рынка." : "Positions follow Apple’s Search API response and may differ from results on a device. Rating counts are not installs or market share."}</p>
          <p>{ru ? "Скриншоты — из App Store США. Данные сохранены при сборе и не обновляются при открытии страницы." : "Screenshots come from the US App Store. Data is a saved snapshot, not a live feed."}</p>
          <a href={keyword.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block underline underline-offset-4">{ru ? "Источник выдачи ↗" : "Search data source ↗"}</a>
        </div>
      </details>
    </section>
  );
}
