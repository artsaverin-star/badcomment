"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useT, useWebStrings } from "@/site/i18n/client";
import { useViewer } from "@/site/shell/ViewerContext";
import { BookmarkFilledIcon, BookmarkIcon, Button, IconButton, Sheet, SheetAction, toast } from "@/site/ui";
import { NOTE_MAX } from "./protocol";
import { saveNote, toggleSaved, useIsSaved, useNote, type MaterialKind } from "./store";
import { libraryStrings } from "./strings";
import { useLibrarySync } from "./sync";
import "./library.css";

// CONTRACT used by the research and ideas features (the library feature owns and
// polishes these; keep names and props stable):
//   <BookmarkButton kind slug />            — toolbar icon button, toggles the bookmark
//   <NoteSheet open onClose kind slug title /> — the app's note editor (spec 01 §5.7, 02 §5.2)
//   LIBRARY_UI_KEYS                         — app UI keys these components need; include them in
//                                             the page's <I18nProvider strings={t.pick([...])}>.
//                                             SERVER components: import it from "./keys" — this
//                                             file is "use client", so there it is only a reference.
// Both components also start the account sync (./sync.tsx) for signed-in viewers, so a
// bookmark or note made on any page reaches the account.

export { LIBRARY_UI_KEYS } from "./keys";

/**
 * Bookmark toggle (spec 01 §5.6, 02 §5.4): outline ↔ filled, label «Сохранить» /
 * «Убрать из сохранённого», aria-pressed. Ideas can be bookmarked even when locked.
 * The app confirms with a haptic; the web says it in a polite toast instead.
 */
export function BookmarkButton({ kind, slug }: { kind: MaterialKind; slug: string }) {
  useLibrarySync();
  const t = useT();
  const s = useWebStrings(libraryStrings);
  const saved = useIsSaved(kind, slug);
  return (
    <IconButton
      label={saved ? t("Убрать из сохранённого") : t("Сохранить")}
      pressed={saved}
      onClick={() => {
        const next = toggleSaved(kind, slug);
        toast(next ? t("Закладка сохранена") : s.bookmarkRemoved);
      }}
    >
      {saved ? <BookmarkFilledIcon size={17} /> : <BookmarkIcon size={17} />}
    </IconButton>
  );
}

const fieldSizingSupported = () =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content");

/**
 * The note editor (ClarityMaterialNote). «Отмена» closes, asking «Не сохранять изменения?»
 * when the text changed — so do Esc, the backdrop and the browser Back button. «Сохранить»
 * writes the note (blank deletes it) and bookmarks the material if it wasn't; if the browser
 * refuses to store it, the sheet stays open with the app's error text.
 * `title` = the material's title (card title for ideas, topic name for research).
 */
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
  useLibrarySync();
  const t = useT();
  const s = useWebStrings(libraryStrings);
  const { loggedIn } = useViewer();
  const stored = useNote(kind, slug);
  const footnoteId = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const confirmBox = useRef<HTMLDivElement>(null);

  // Pre-filled once per opening with the stored note (spec 02 §5.2).
  const [wasOpen, setWasOpen] = useState(open);
  const [initial, setInitial] = useState(open ? stored : "");
  const [text, setText] = useState(open ? stored : "");
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setInitial(stored);
      setText(stored);
      setFailed(false);
    }
    setConfirming(false);
  }
  const dirty = text !== initial;

  /** Close unless there are unsaved changes; then ask. Returns true when it closed. */
  const requestClose = (): boolean => {
    if (confirming) {
      setConfirming(false); // Back / Esc while asking = keep editing
      return false;
    }
    if (dirty) {
      setConfirming(true);
      return false;
    }
    onClose();
    return true;
  };
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // One history entry while open, so the browser Back button closes the editor — or asks
  // first when there are changes (then the entry is put back). The Sheet's own history
  // handling is off because it cannot veto a Back.
  useEffect(() => {
    if (!open) return;
    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    let armed = false;
    const ours = () => (window.history.state as { iaNote?: string } | null)?.iaNote === token;
    const arm = () => {
      window.history.pushState({ ...(window.history.state ?? {}), iaNote: token }, "");
      armed = true;
    };
    const onPop = () => {
      if (ours()) return;
      armed = false;
      if (!requestCloseRef.current()) arm();
    };
    const timer = window.setTimeout(() => {
      arm();
      window.addEventListener("popstate", onPop);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      if (armed && ours()) window.history.back();
    };
  }, [open]);

  // The discard question focuses the safe choice (Enter never throws the text away). This
  // effect runs after the confirmation <Sheet>'s own effect has called showModal().
  useEffect(() => {
    if (open && confirming) confirmBox.current?.querySelector<HTMLElement>("[data-keep-editing]")?.focus({ preventScroll: true });
  }, [open, confirming]);

  // Focus the text (caret at the end) once the dialog is shown.
  useEffect(() => {
    if (!open) return;
    const el = field.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open]);

  // 9 lines minimum, grows to 24, then scrolls — CSS field-sizing where supported, else here.
  useLayoutEffect(() => {
    const el = field.current;
    if (!open || !el || fieldSizingSupported()) return;
    el.style.height = "auto";
    const cs = window.getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || 26;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const min = 9 * line + pad;
    const max = 24 * line + pad;
    el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`;
  }, [open, text]);

  const save = () => {
    const ok = saveNote(kind, slug, text);
    if (!ok) {
      setFailed(true);
      return;
    }
    setInitial(text);
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={() => void requestClose()}
        history={false}
        title={t("Моя заметка")}
        paper="reading"
        full
        leading={<SheetAction onClick={() => void requestClose()}>{t("Отмена")}</SheetAction>}
        trailing={
          <SheetAction className="ia-lib-save" onClick={save}>
            {t("Сохранить")}
          </SheetAction>
        }
      >
        <div className="ia-lib-note">
          <p className="ia-lib-note__title">{title}</p>
          <textarea
            ref={field}
            className="ia-lib-note__field"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (failed) setFailed(false);
            }}
            placeholder={t("Что хочется запомнить или проверить?")}
            aria-label={`${t("Моя заметка")}: ${title}`}
            aria-describedby={footnoteId}
            maxLength={NOTE_MAX}
            rows={9}
            spellCheck
          />
          {failed ? (
            <p className="ia-lib-note__error" role="alert">
              {t("Не удалось сохранить изменения. Текст остаётся на экране — попробуй ещё раз.")}
            </p>
          ) : null}
          <p className="ia-lib-note__footnote" id={footnoteId}>
            {loggedIn ? s.noteFootnoteAccount : s.noteFootnoteBrowser}
          </p>
        </div>
      </Sheet>
      <Sheet
        open={open && confirming}
        onClose={() => setConfirming(false)}
        history={false}
        variant="dialog"
        title={t("Не сохранять изменения?")}
      >
        <div className="ia-lib-confirm" ref={confirmBox}>
          <Button
            variant="secondary"
            block
            className="ia-lib-confirm__discard"
            onClick={() => {
              setConfirming(false);
              onClose();
            }}
          >
            {t("Не сохранять")}
          </Button>
          <Button variant="secondary" block data-keep-editing="" onClick={() => setConfirming(false)}>
            {t("Продолжить редактирование")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
