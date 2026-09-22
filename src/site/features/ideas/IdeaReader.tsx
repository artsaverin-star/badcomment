"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BookmarkButton, NoteSheet } from "@/site/features/library/components";
import { useLocale, useT } from "@/site/i18n/client";
import { FREE_CATEGORY } from "@/site/manifest.generated";
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
import { ExportSheet } from "./ExportSheet";
import "./ideas.css";

// Client chrome of the idea reader (spec 02 §3.3, §3.6; 05 §3.6 J): the toolbar (Назад →
// the ideas tab; bookmark; ⋯ «Действия с идеей»: «Записать мысль», «Скачать документ»), the
// footer actions, the note editor and the export sheet. The article itself (`children`) is
// rendered on the server after the gate.

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
                { label: t("Скачать документ"), icon: <DocumentIcon size={17} />, onSelect: () => setExportOpen(true) },
              ]}
            />
          </ToolbarPill>
        }
      />
      <article className="ia-page ia-page--reading ia-idea">
        {children}
        <nav className="ia-idea__actions" aria-label={t("Действия с идеей")}>
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
          <button type="button" className="ia-idea__action" aria-haspopup="dialog" onClick={() => setExportOpen(true)}>
            <DocumentIcon size={20} aria-hidden="true" />
            <span className="ia-idea__action-text">
              <span className="ia-idea__action-label">{t("Скачать документ")}</span>
              <span className="ia-idea__action-sub">
                {t("Полный разбор категории, идея и твоя заметка — в одном файле.")}
              </span>
            </span>
          </button>
        </nav>
        {promo}
      </article>
      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} kind="idea" slug={slug} title={title} />
      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} slug={slug} title={title} />
    </>
  );
}

/**
 * The app's locked idea preview (ClarityContentGate, spec 02 §3.2, 03 §3.4): the artwork only
 * (`art`, server-rendered), the lock card «Идея доступна в Plus» with «Открыть все материалы»
 * (paywall, source "idea_locked") and «Сначала прочитать бесплатный разбор», then «Моя заметка
 * к материалу» (notes are allowed on locked items; the editor title is «Идея в Plus»).
 * No title, description, category or bookmark.
 */
export function LockedIdea({ slug, art, promo }: { slug: string; art: ReactNode; promo?: ReactNode }) {
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
          <Link href={routes.topic(locale, FREE_CATEGORY)} className="ia-idea-gate__link">
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
