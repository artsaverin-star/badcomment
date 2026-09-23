"use client";

import { Trash2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useLocale, useT, useWebStrings } from "@/site/i18n/client";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { Button, buttonClass } from "@/site/ui/Button";
import { Sheet } from "@/site/ui/Sheet";
import { settingsStrings } from "./strings";
import "./settings.css";

// «Удалить аккаунт» in the account box of Settings (signed in only; App Review 5.1.1(v) asks the
// app for it, the website offers the same). Two steps: the row opens a dialog that says what is
// lost (bookmarks, notes, page history, purchases tied to the account) and asks to type a
// confirmation word; then POST /api/site/account/delete {confirm:"DELETE"}
// (docs/site-v2/APP-ACCOUNTS.md), sign out, and a full load of the home page as a guest (the
// library sync then clears this browser's copy of the account's bookmarks and notes).

/** The typed word matches the locale's word (or DELETE): trimmed, width- and case-insensitive. */
function matches(typed: string, word: string): boolean {
  const norm = (v: string) => v.normalize("NFKC").trim().toLocaleUpperCase();
  const t = norm(typed);
  return t !== "" && (t === norm(word) || t === "DELETE");
}

export function DeleteAccountRow({ rowClassName, iconSize = 19 }: { rowClassName: string; iconSize?: number }) {
  const s = useWebStrings(settingsStrings);
  const t = useT();
  const locale = useLocale();
  const inputId = useId();
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setFailed(false);
  };

  const confirmed = matches(typed, s.deleteWord);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/site/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) throw new Error(`delete ${res.status}`);
    } catch {
      setBusy(false);
      setFailed(true);
      return;
    }
    // The account is gone; drop the session cookie too (best effort) and start over as a guest.
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    window.location.assign(routes.home(locale));
  }

  // One wrapper element: the box draws its dividers between direct children, and the <dialog>
  // must not become one of them (it would get the divider and `position: relative`).
  return (
    <div>
      <button type="button" className={rowClassName} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ia-set-row__icon" aria-hidden="true">
          <Trash2 size={iconSize} strokeWidth={2} />
        </span>
        <span className="ia-set-row__text">
          <span className="ia-set-row__title">{s.deleteAccount}</span>
        </span>
      </button>
      <Sheet
        open={open}
        onClose={close}
        variant="dialog"
        dismissible={!busy}
        title={s.deleteTitle}
      >
        <form className="ia-set-delete" onSubmit={submit} noValidate>
          <p className="ia-set-delete__text">{s.deleteBody}</p>
          <ul className="ia-set-delete__list">
            <li>{s.deletePurchases}</li>
            <li>{s.deleteAppStore}</li>
          </ul>
          <label className="ia-set-delete__label" htmlFor={inputId}>
            {format(s.deleteConfirmLabel, { word: s.deleteWord })}
          </label>
          <input
            id={inputId}
            className="ia-set-delete__input"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            disabled={busy}
            aria-describedby={failed ? errorId : undefined}
          />
          {failed ? (
            <p id={errorId} className="ia-set-delete__error" role="alert">
              {s.deleteFailed}
            </p>
          ) : null}
          <button
            type="submit"
            className={buttonClass({ variant: "rect", block: true, className: "ia-set-delete__submit" })}
            disabled={!confirmed || busy}
            aria-busy={busy || undefined}
          >
            {busy ? <span className="ia-spinner" aria-hidden="true" /> : null}
            {busy ? s.deleteBusy : s.deleteSubmit}
          </button>
          <Button variant="secondary" block onClick={close} disabled={busy}>
            {t("Отмена")}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
