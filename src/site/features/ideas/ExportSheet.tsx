"use client";

import { useCallback, useEffect, useState } from "react";
import { useNote } from "@/site/features/library/store";
import { useLocale, useT, useWebStrings } from "@/site/i18n/client";
import { Button, CheckIcon, CopyIcon, DownloadIcon, ShareIcon, Sheet, SheetAction, Skeleton, SkeletonText } from "@/site/ui";
import { exportFilename, withNote } from "./document";
import { ideasStrings } from "./strings";
import "./ideas.css";

// «Готовый документ» (ClarityExportSheet, ClarityReader.swift:966-1055; spec 02 §7.2; web
// mapping §7.5, 09 §5 #16): hero «Весь контекст. И твоя идея.», what's included (1 breakdown,
// 2 idea, 3 the note — only when there is one), the .txt info line, and the preview = the exact
// text of the file. The server builds parts 1–2 (POST /api/site/export/<id>, gated); the note
// never leaves the browser — part 3 is appended here, exactly as the app does on the device
// (spec 09 G10, ClarityExportDocument.swift:61-62).
// Pinned actions: «Скачать документ» (Blob download → «Документ сохранён»), «Копировать» →
// «Скопировано», «Поделиться» only where the browser can share files. Errors use the app's
// alert «Документ не сохранён» + «Понятно» (spec 02 §7.6, 09 G13).

type State =
  | { status: "loading" }
  | { status: "ready"; text: string; summaryOnly: boolean }
  | { status: "error"; forbidden: boolean };

export function ExportSheet({
  open,
  onClose,
  slug,
  title,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  /** Article title: the subtitle and the file name. */
  title: string;
}) {
  const t = useT();
  const s = useWebStrings(ideasStrings);
  const locale = useLocale();
  const note = useNote("idea", slug);
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  /** One persistent live region for the sheet (a11y m9): written, never re-created. */
  const [announcement, setAnnouncement] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const filename = exportFilename(title);

  // A fresh document every time the sheet opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setState({ status: "loading" });
      setSaved(false);
      setCopied(false);
      setAlert(null);
      setAnnouncement("");
    }
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/site/export/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: locale }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          setState({ status: "error", forbidden: res.status === 401 || res.status === 403 });
          return;
        }
        const text = await res.text();
        setState({ status: "ready", text, summaryOnly: res.headers.get("X-Export-Research") === "summary" });
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setState({ status: "error", forbidden: false });
      });
    return () => controller.abort();
  }, [open, slug, locale, attempt]);

  // The file = the server's parts 1–2 + this browser's note (part 3).
  const text = state.status === "ready" ? withNote(state.text, note, t) : null;

  const makeFile = useCallback(
    (body: string) => new File([body], filename, { type: "text/plain;charset=utf-8" }),
    [filename],
  );

  useEffect(() => {
    if (text === null) return;
    let ok = false;
    try {
      ok = typeof navigator.canShare === "function" && navigator.canShare({ files: [makeFile(text)] });
    } catch {
      ok = false;
    }
    const timer = window.setTimeout(() => setCanShare(ok), 0);
    return () => window.clearTimeout(timer);
  }, [text, makeFile]);

  const download = () => {
    if (text === null) return;
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setSaved(true);
      setAnnouncement(t("Документ сохранён"));
    } catch {
      setAlert(t("Не удалось сохранить документ. Попробуй ещё раз или поделись файлом."));
    }
  };

  const copy = async () => {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setAnnouncement(t("Скопировано"));
    } catch {
      setAlert(t("Не удалось подготовить файл. Попробуй ещё раз."));
    }
  };

  const share = async () => {
    if (text === null) return;
    try {
      await navigator.share({ files: [makeFile(text)], title });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setAlert(t("Не удалось подготовить файл. Попробуй ещё раз."));
    }
  };

  const hasNote = note.trim() !== "";
  const items: Array<[string, string]> = [
    [t("Разбор категории"), t("Полный текст: задачи людей, наблюдения, цитаты и выводы.")],
    [t("Идея целиком"), t("Весь материал об идее, включая основания и проверку решения.")],
    ...(hasNote ? ([[t("Твоя заметка"), t("Сохранённая мысль к этой идее.")]] as Array<[string, string]>) : []),
  ];

  // ClarityReader.swift:1029-1054: VStack(8) { primary; HStack(20) { Copy | Share } ink; footnote }.
  const footer = (
    <div className="ia-export__actions">
      <Button
        variant="primary"
        block
        disabled={text === null}
        onClick={download}
        icon={<DownloadIcon size={16} strokeWidth={2.4} aria-hidden="true" />}
      >
        {t("Скачать документ")}
      </Button>
      <div className="ia-export__row">
        <Button
          variant="text"
          size="sm"
          disabled={text === null}
          onClick={() => void copy()}
          leadingIcon={copied ? <CheckIcon size={16} aria-hidden="true" /> : <CopyIcon size={16} aria-hidden="true" />}
        >
          {copied ? t("Скопировано") : t("Копировать")}
        </Button>
        {canShare ? (
          <Button
            variant="text"
            size="sm"
            disabled={text === null}
            onClick={() => void share()}
            leadingIcon={<ShareIcon size={16} aria-hidden="true" />}
          >
            {t("Поделиться")}
          </Button>
        ) : null}
      </div>
      {saved ? (
        <p className="ia-export__done" aria-hidden="true">
          {t("Документ сохранён")}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={t("Готовый документ")}
        trailing={<SheetAction onClick={onClose}>{t("Готово")}</SheetAction>}
        paper="reading"
        full
        footer={footer}
      >
        <div className="ia-export">
          <p className="sr-only" role="status">
            {state.status === "loading" ? s.exportLoading : announcement}
          </p>
          <div className="ia-export__hero">
            <p className="ia-export__title">{t("Весь контекст.\nИ твоя идея.")}</p>
            <p className="ia-export__subtitle">{title}</p>
          </div>
          <div className="ia-export__included">
            <ol className="ia-export__list">
              {items.map(([name, detail], i) => (
                <li key={name} className="ia-export__item">
                  <span className="ia-export__num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="ia-export__item-text">
                    <span className="ia-export__item-title">{name}</span>
                    <span className="ia-export__item-detail">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="ia-export__info">
              {t("Один текстовый файл (.txt). Можно читать, редактировать или передать в ИИ вместе со своим вопросом.")}
            </p>
            {state.status === "ready" && state.summaryOnly ? <p className="ia-export__info">{s.exportSummaryOnly}</p> : null}
          </div>
          <div className="ia-export__preview-group">
            <h3 className="ia-export__preview-title">{t("Предпросмотр документа")}</h3>
            {text !== null ? (
              <div className="ia-export__preview" role="region" tabIndex={0} aria-label={t("Предпросмотр документа")}>
                {text}
              </div>
            ) : state.status === "loading" ? (
              <div className="ia-export__status" aria-busy="true">
                <Skeleton width="66%" height={22} />
                <SkeletonText lines={8} lineHeight={27} className="w-full" />
              </div>
            ) : (
              <div className="ia-export__status" role="alert">
                <p className="m-0">
                  {state.status === "error" && state.forbidden ? s.exportForbidden : t("Не удалось подготовить файл. Попробуй ещё раз.")}
                </p>
                {state.status === "error" && state.forbidden ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setState({ status: "loading" });
                      setAttempt((n) => n + 1);
                    }}
                  >
                    {t("Повторить")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Sheet>
      <Sheet
        open={open && alert !== null}
        onClose={() => setAlert(null)}
        history={false}
        variant="dialog"
        title={t("Документ не сохранён")}
      >
        <div className="ia-export__alert">
          <p>{alert}</p>
          <Button variant="primary" onClick={() => setAlert(null)} autoFocus>
            {t("Понятно")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
