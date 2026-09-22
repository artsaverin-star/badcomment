"use client";

import { useRef } from "react";
import { useT } from "@/site/i18n/client";
import { BookmarkIcon, BookmarkFilledIcon, IconButton, Sheet, SheetAction, toast } from "@/site/ui";
import { saveNote, toggleSaved, useIsSaved, useNote, type MaterialKind } from "./store";

// CONTRACT used by the research and ideas features (the library feature owns and
// polishes these; keep names and props stable):
//   <BookmarkButton kind slug />            — toolbar icon button, toggles the bookmark
//   <NoteSheet open onClose kind slug title /> — the app's note editor (spec 01 §5.7, 02 §5.2)
//   LIBRARY_UI_KEYS                         — app UI keys these components need; include them in
//                                             the page's <I18nProvider strings={t.pick([...])}>

export const LIBRARY_UI_KEYS = [
  "Сохранить",
  "Убрать из сохранённого",
  "Моя заметка",
  "Отмена",
  "Готово",
] as const;

export function BookmarkButton({ kind, slug }: { kind: MaterialKind; slug: string }) {
  const t = useT();
  const saved = useIsSaved(kind, slug);
  return (
    <IconButton
      label={saved ? t("Убрать из сохранённого") : t("Сохранить")}
      pressed={saved}
      onClick={() => {
        const next = toggleSaved(kind, slug);
        toast(next ? t("Сохранить") : t("Убрать из сохранённого"));
      }}
    >
      {saved ? <BookmarkFilledIcon size={17} /> : <BookmarkIcon size={17} />}
    </IconButton>
  );
}

export function NoteSheet({
  open,
  onClose,
  kind,
  slug,
  title,
}: {
  open: boolean;
  onClose: () => void;
  kind: MaterialKind;
  slug: string;
  title: string;
}) {
  const t = useT();
  const stored = useNote(kind, slug);
  const field = useRef<HTMLTextAreaElement>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("Моя заметка")}
      paper="reading"
      leading={<SheetAction onClick={onClose}>{t("Отмена")}</SheetAction>}
      trailing={
        <SheetAction
          onClick={() => {
            saveNote(kind, slug, field.current?.value ?? stored);
            onClose();
          }}
        >
          {t("Сохранить")}
        </SheetAction>
      }
    >
      <p className="ia-caption">{title}</p>
      {open ? (
        <textarea ref={field} className="ia-note-textarea" defaultValue={stored} rows={10} autoFocus />
      ) : null}
    </Sheet>
  );
}
