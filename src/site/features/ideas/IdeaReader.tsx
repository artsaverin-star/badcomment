"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookmarkButton, NoteSheet } from "@/site/features/library/components";
import { useLocale, useT } from "@/site/i18n/client";
import { routes } from "@/site/routing";
import { openPaywall } from "@/site/shell/actions";
import {
  BackButton,
  Button,
  DetailToolbar,
  DocumentIcon,
  LockIcon,
  Menu,
  NoteIcon,
  ResearchIcon,
  ToolbarPill,
} from "@/site/ui";
import "./ideas.css";

// Client chrome of the idea reader (spec 02 §3.3, §3.6; 05 §3.6 J): the toolbar (Назад →
// the ideas tab; bookmark; ⋯ «Действия с идеей»: «Записать мысль», «Скачать документ»), the
// footer actions (ClarityReader.swift:543-565), the note editor and the export sheet. The
// article itself (`children`) is rendered on the server after the gate.

// The export sheet opens on demand: its code loads with the first open.
const ExportSheet = dynamic(() => import("./ExportSheet").then((m) => m.ExportSheet), { ssr: false });

export function IdeaReader({
  slug,
  category,
  title,
  promo,
  children,
}: {
  slug: string;
  category: string;
  /** Card/article title: the note editor title (spec 09 C18) and the export subtitle/file name. */
  title: string;
  /** App Store promo (server-rendered). */
  promo?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const [noteOpen, setNoteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  // Mounted from the first open on, so closing still returns focus to the opener.
  const [exportMounted, setExportMounted] = useState(false);
  const openExport = () => {
    setExportMounted(true);
    setExportOpen(true);
  };

  return (
    <>
      <DetailToolbar
        leading={<BackButton label={t("Назад")} fallbackHref={routes.ideas(locale)} />}
        title={t("Идея")}
        trailing={
          <ToolbarPill icons>
            <BookmarkButton kind="idea" slug={slug} />
            <Menu
              label={t("Действия с идеей")}
              items={[
                { label: t("Записать мысль"), icon: <NoteIcon size={17} />, onSelect: () => setNoteOpen(true) },
                { label: t("Скачать документ"), icon: <DocumentIcon size={17} />, onSelect: openExport },
              ]}
            />
          </ToolbarPill>
        }
      />
      <article className="ia-page ia-page--reading ia-idea">
        {children}
        {/* Buttons that open dialogs + one link: a group, not a <nav> (a11y m11). */}
        <div className="ia-idea__actions" role="group" aria-label={t("Действия с идеей")}>
          <Link href={routes.topic(locale, category)} className="ia-idea__action">
            <ResearchIcon size={20} aria-hidden="true" />
            <span className="ia-idea__action-text">
              <span className="ia-idea__action-label">{t("Читать разбор категории")}</span>
            </span>
          </Link>
          <button type="button" className="ia-idea__action" aria-haspopup="dialog" onClick={() => setNoteOpen(true)}>
            <NoteIcon size={20} aria-hidden="true" />
            <span className="ia-idea__action-text">
              <span className="ia-idea__action-label">{t("Записать свою мысль")}</span>
            </span>
          </button>
          <button type="button" className="ia-idea__action" aria-haspopup="dialog" onClick={openExport}>
            <DocumentIcon size={20} aria-hidden="true" />
            <span className="ia-idea__action-text">
              <span className="ia-idea__action-label">{t("Скачать документ")}</span>
              <span className="ia-idea__action-sub">
                {t("Полный разбор категории, идея и твоя заметка — в одном файле.")}
              </span>
            </span>
          </button>
        </div>
        {promo}
      </article>
      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} kind="idea" slug={slug} title={title} />
      {exportMounted ? (
        <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} slug={slug} title={title} />
      ) : null}
    </>
  );
}

/**
 * The app's locked idea preview (ClarityContentGate, spec 02 §3.2, 03 §3.4): the artwork only
 * (`art`, server-rendered), the lock card «Идея доступна в Plus» with «Открыть все материалы»
 * (paywall, source "idea_locked") and «Сначала прочитать бесплатный разбор», then «Моя заметка
 * к материалу» (notes are allowed on locked items; the editor title is «Идея в Plus»).
 * No title, description, category or bookmark (DECISIONS §9: locked stays locked, like the app).
 */
export function LockedIdea({
  slug,
  art,
  freeTopicHref,
  promo,
}: {
  slug: string;
  art: ReactNode;
  /** The free breakdown (routes.topic(L, FREE_CATEGORY)), passed by the page so the client
   *  bundle does not pull in the generated manifest. */
  freeTopicHref: string;
  promo?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    // A block wrapper: the sticky toolbar must span the column (it shrinks as a direct flex child of <main>).
    <div>
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.ideas(locale)} />} title={t("Идея")} />
      <div className="ia-page ia-page--reading ia-idea-gate">
        {art}
        <section className="ia-card ia-card--utility ia-idea-gate__card" aria-labelledby="ia-idea-gate-title">
          <h1 className="ia-idea-gate__label" id="ia-idea-gate-title">
            <LockIcon size={18} strokeWidth={2.2} aria-hidden="true" />
            {t("Идея доступна в Plus")}
          </h1>
          <p className="ia-idea-gate__body">
            {t("Открой описание решения, его основания и полный разбор категории. Всё можно сохранить одним документом.")}
          </p>
          <Button variant="primary" onClick={() => openPaywall({ source: "idea_locked" })}>
            {t("Открыть все материалы")}
          </Button>
          <Link href={freeTopicHref} className="ia-idea-gate__link">
            {t("Сначала прочитать бесплатный разбор")}
          </Link>
        </section>
        <button type="button" className="ia-idea-gate__note" aria-haspopup="dialog" onClick={() => setNoteOpen(true)}>
          <NoteIcon size={19} aria-hidden="true" />
          {t("Моя заметка к материалу")}
        </button>
        {promo}
      </div>
      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} kind="idea" slug={slug} title={t("Идея в Plus")} />
    </div>
  );
}
