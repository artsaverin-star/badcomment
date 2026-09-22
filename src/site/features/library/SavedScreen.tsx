"use client";

import { BookmarkX, NotebookText } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { LocaleCode } from "@/site/content/types";
import { useT, useWebStrings } from "@/site/i18n/client";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { openSignIn } from "@/site/shell/actions";
import { useViewer } from "@/site/shell/ViewerContext";
import {
  AlertIcon,
  ArrowRightIcon,
  BookmarkIcon,
  Button,
  Chip,
  ChipRow,
  ChevronRightIcon,
  DocumentIcon,
  EmptyState,
  Heading,
  IdeasIcon,
  Menu,
  NoteIcon,
  SearchField,
  SettingsIcon,
  Skeleton,
  SkeletonText,
} from "@/site/ui";
import { NoteSheet } from "./components";
import type { MaterialKind } from "./protocol";
import { buildSavedView, parseSavedFilter, type SavedFilter, type SavedIndex, type SavedRow } from "./saved-model";
import { setSaved, useLibrary, useLibraryHydrated } from "./store";
import { libraryStrings } from "./strings";
import { useLibrarySync, useLibrarySyncState } from "./sync";
import "./library.css";

// «Сохранённое» (ClarityMyView, spec 02 §6): local-first library + account sync. The server
// passes a public index (topic names, thumbnails, titles of readable ideas only); the
// library itself lives in the browser (./store) and is rendered after hydration.
// Filter and query mirror ?filter=&q= with history.replaceState (no server round trip).

type Props = {
  locale: Locale;
  index: SavedIndex;
  initialFilter: SavedFilter;
  initialQuery: string;
};

type NoteTarget = { kind: MaterialKind; slug: string; title: string; returnTo: HTMLElement | null };

const FILTER_LABELS: Record<SavedFilter, string> = {
  all: "Всё",
  research: "Разборы",
  ideas: "Идеи",
  notes: "Заметки",
};
const SECTION_TITLES = { research: "Разборы", ideas: "Идеи", notes: "Заметки" } as const;

/**
 * Local filter/query state mirrored into the URL. Our own replaceState writes come back
 * through useSearchParams a little later; anything else (a link to /saved) is adopted.
 */
function useSavedUrlState(locale: Locale, initialFilter: SavedFilter, initialQuery: string) {
  const params = useSearchParams();
  const urlFilter = parseSavedFilter(params.get("filter"));
  const urlQuery = params.get("q") ?? "";
  const urlKey = `${urlFilter}\u0000${urlQuery}`;
  const [state, setState] = useState({
    filter: initialFilter,
    query: initialQuery,
    seen: urlKey,
    written: [] as string[],
  });
  let current = state;
  if (urlKey !== state.seen) {
    const i = state.written.lastIndexOf(urlKey);
    current =
      i === -1
        ? { filter: urlFilter, query: urlQuery, seen: urlKey, written: [] }
        : { ...state, seen: urlKey, written: state.written.slice(i + 1) };
    setState(current);
  }
  const write = (filter: SavedFilter, query: string) => {
    setState((prev) => ({ ...prev, filter, query, written: [...prev.written, `${filter}\u0000${query}`].slice(-100) }));
    window.history.replaceState(null, "", routes.saved(locale, { filter, q: query }));
  };
  return {
    filter: current.filter,
    query: current.query,
    setFilter: (filter: SavedFilter) => write(filter, current.query),
    setQuery: (query: string) => write(current.filter, query),
  };
}

export function SavedScreen({ locale, index, initialFilter, initialQuery }: Props) {
  useLibrarySync();
  const t = useT();
  const s = useWebStrings(libraryStrings);
  const viewer = useViewer();
  const library = useLibrary();
  const hydrated = useLibraryHydrated();
  const sync = useLibrarySyncState();
  const { filter, query, setFilter, setQuery } = useSavedUrlState(locale, initialFilter, initialQuery);

  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const labels = useMemo(
    () => ({
      research: t("Разбор"),
      idea: t("Идея"),
      ideaLocked: t("Идея в Plus"),
      ideaMissing: t("Идея недоступна"),
      researchMissing: t("Разбор недоступен"),
    }),
    [t],
  );
  const view = useMemo(
    () => buildSavedView(library, index, { filter, query, locale: locale as LocaleCode, labels, plus: viewer.plus }),
    [library, index, filter, query, locale, labels, viewer.plus],
  );

  const libraryEmpty = library.research.length === 0 && library.idea.length === 0 && Object.keys(library.notes).length === 0;
  // Signed in on a fresh browser: wait for the account copy instead of flashing "nothing saved".
  const waitingForAccount =
    viewer.loggedIn && !sync.ready && (sync.status === "off" || sync.status === "syncing") && libraryEmpty;
  const loading = !hydrated || waitingForAccount;
  const empty = !loading && view.total === 0;

  const openNote = (row: SavedRow, returnTo: HTMLElement | null) => {
    setNoteTarget({ kind: row.kind, slug: row.slug, title: row.title, returnTo });
    setNoteOpen(true);
  };
  const closeNote = () => {
    setNoteOpen(false);
    const back = noteTarget?.returnTo;
    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      if (back?.isConnected && (!active || active === document.body)) back.focus({ preventScroll: true });
    });
  };

  const subtitle = loading ? (
    <span className="ia-lib__subtitle-placeholder" aria-hidden="true">
      {t("Материалы и личные заметки")}
    </span>
  ) : empty ? (
    t("Твоя библиотека")
  ) : (
    t("Материалы и личные заметки")
  );

  return (
    <div className="ia-page ia-page--library">
      <div className="ia-lib">
        <Heading
          variant="large"
          title={t("Сохранённое")}
          subtitle={subtitle}
          trailing={
            <Link href={routes.settings(locale)} className="ia-icon-btn ia-icon-btn--circle" aria-label={t("Настройки")} title={t("Настройки")}>
              <SettingsIcon size={20} strokeWidth={2} aria-hidden="true" />
            </Link>
          }
        />

        {loading ? (
          <LoadingRows label={s.loading} />
        ) : empty ? (
          <EmptyState
            icon={<BookmarkIcon size={30} strokeWidth={1.5} />}
            title={t("Пока нет сохранённого")}
            body={t("Нажми закладку в разборе или идее — материал появится здесь. Заметки к нему тоже.")}
            action={
              <Button href={routes.research(locale)} variant="rect" block leadingIcon={<ArrowRightIcon size={18} aria-hidden="true" />}>
                {t("Открыть разборы")}
              </Button>
            }
          />
        ) : (
          <>
            <div className="ia-lib__controls">
              <SearchField
                value={query}
                onValueChange={setQuery}
                placeholder={t("Найти в сохранённом")}
                clearLabel={t("Очистить поиск")}
              />
              <ChipRow label={s.filterLabel}>
                {(Object.keys(FILTER_LABELS) as SavedFilter[]).map((f) => (
                  <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
                    {t(FILTER_LABELS[f])}
                  </Chip>
                ))}
              </ChipRow>
            </div>

            {view.sections.length === 0 ? (
              <div className="ia-lib-noresults" role="status">
                <h2 className="ia-lib-noresults__title">
                  {query.trim() ? t("Ничего не найдено") : t("Здесь пока пусто")}
                </h2>
                <p className="ia-lib-noresults__body">
                  {query
                    ? t("Попробуй другое название или слово из заметки.")
                    : filter === "notes"
                      ? t("Заметки к материалам появятся здесь, даже если убрать закладку.")
                      : t("Сохрани материал этого раздела или посмотри всю библиотеку.")}
                </p>
                <Button variant="text" onClick={query ? () => setQuery("") : () => setFilter("all")}>
                  {query ? t("Сбросить поиск") : t("Показать всё")}
                </Button>
              </div>
            ) : (
              view.sections.map((section) => (
                <section key={section.id} className="ia-lib-section" aria-labelledby={`saved-${section.id}`}>
                  <h2 className="ia-lib-section__title" id={`saved-${section.id}`}>
                    {t(SECTION_TITLES[section.id])}
                    <span className="ia-lib-section__count">{t.number(section.rows.length)}</span>
                  </h2>
                  <ul className="ia-lib-group">
                    {section.rows.map((row) =>
                      section.id === "notes" ? (
                        <NoteRow key={row.key} row={row} onOpen={openNote} />
                      ) : (
                        <MaterialRow key={row.key} row={row} locale={locale} onEditNote={openNote} />
                      ),
                    )}
                  </ul>
                </section>
              ))
            )}

            {view.sections.length > 0 ? (
              <footer className="ia-lib-footer">
                {viewer.loggedIn ? (
                  <p>{s.savedInAccount}</p>
                ) : (
                  <>
                    <p>{s.savedInBrowser}</p>
                    <Button variant="text" onClick={() => openSignIn({ reason: "saved" })}>
                      {s.signIn}
                    </Button>
                  </>
                )}
              </footer>
            ) : null}
            {viewer.loggedIn && sync.status === "error" ? (
              <p className="ia-lib-error" role="status">
                <AlertIcon size={15} aria-hidden="true" />
                <span>{s.syncError}</span>
              </p>
            ) : null}
          </>
        )}
      </div>

      {noteTarget ? (
        <NoteSheet
          open={noteOpen}
          onClose={closeNote}
          kind={noteTarget.kind}
          slug={noteTarget.slug}
          title={noteTarget.title}
        />
      ) : null}
    </div>
  );
}

function rowLabel(t: ReturnType<typeof useT>, row: SavedRow): string {
  const base = row.detail ? `${row.title}. ${row.detail}` : row.title;
  return row.note ? t("%1$@. Есть твоя заметка. %2$@", [base, row.note]) : base;
}

function RowVisual({ row, glyph }: { row: SavedRow; glyph?: "note" }) {
  if (!glyph && row.thumb) {
    // Pre-encoded WebP (public/media); decorative — the title is next to it.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ia-lib-row__thumb" src={row.thumb} alt="" width={88} height={66} loading="lazy" decoding="async" />;
  }
  const Icon = glyph === "note" ? NotebookText : row.kind === "idea" ? IdeasIcon : DocumentIcon;
  return (
    <span className="ia-lib-row__glyph" aria-hidden="true">
      <Icon size={19} strokeWidth={2} />
    </span>
  );
}

function RowText({ row }: { row: SavedRow }) {
  return (
    <span className="ia-lib-row__text">
      <span className="ia-lib-row__title">{row.title}</span>
      {row.detail ? <span className="ia-lib-row__detail">{row.detail}</span> : null}
      {row.note ? <span className="ia-lib-row__note">{row.note}</span> : null}
    </span>
  );
}

/** Research / idea bookmark: opens the material; «⋯» = note + remove (no confirmation, no undo). */
function MaterialRow({
  row,
  locale,
  onEditNote,
}: {
  row: SavedRow;
  locale: Locale;
  onEditNote: (row: SavedRow, returnTo: HTMLElement | null) => void;
}) {
  const t = useT();
  const li = useRef<HTMLLIElement>(null);
  const href = row.kind === "research" ? routes.topic(locale, row.slug) : routes.idea(locale, row.slug);
  return (
    <li ref={li} className="ia-lib-row ia-lib-row--menu">
      <Link href={href} className="ia-lib-row__main" aria-label={rowLabel(t, row)}>
        <RowVisual row={row} />
        <RowText row={row} />
      </Link>
      <div className="ia-lib-row__more">
        <Menu
          label={t("Действия: %1$@", [row.title])}
          triggerClassName="ia-lib-row__more-btn"
          items={[
            {
              label: row.note ? t("Редактировать заметку") : t("Добавить заметку"),
              icon: <NoteIcon size={17} />,
              onSelect: () => onEditNote(row, li.current?.querySelector<HTMLElement>(".ia-lib-row__more-btn") ?? null),
            },
            {
              label: t("Убрать из сохранённого"),
              icon: <BookmarkX size={17} />,
              danger: true,
              onSelect: () => setSaved(row.kind, row.slug, false),
            },
          ]}
        />
      </div>
    </li>
  );
}

/** A note (spec 02 §6.6): the whole row opens the editor, with a chevron. */
function NoteRow({ row, onOpen }: { row: SavedRow; onOpen: (row: SavedRow, returnTo: HTMLElement | null) => void }) {
  const t = useT();
  return (
    <li className="ia-lib-row">
      <button type="button" className="ia-lib-row__main" aria-label={rowLabel(t, row)} onClick={(e) => onOpen(row, e.currentTarget)}>
        <RowVisual row={row} glyph="note" />
        <RowText row={row} />
        <ChevronRightIcon className="ia-lib-row__chevron" size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <ul className="ia-lib-group" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="ia-lib-row ia-lib-skeleton-row">
            <Skeleton width={88} height={66} radius={12} />
            <span className="flex-1 pt-1">
              <SkeletonText lines={2} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
