"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { cx } from "./cx";

// Sheets & modals (spec 05 §3.6 N, spec 09 §2.1 / G6), on the native <dialog> (showModal):
// top layer, inert background (real focus trap), Escape → onClose, focus returns to the
// opener. Mobile (< 760): bottom sheet, top radius 38, grab handle. ≥ 760: centered modal,
// radius 28, max-height min(90vh, 900px), internal scroll. variant="dialog": small centered
// dialog on every width.
//
// History: while open, the sheet owns one history entry (same URL), so the browser Back
// button closes the top sheet. Closing from the UI pops that entry again; following a link
// inside the sheet keeps it (the link's navigation proceeds normally).
//
//   const [open, setOpen] = useState(false);
//   <Sheet open={open} onClose={() => setOpen(false)} title={t("Содержание")}
//          trailing={<SheetAction onClick={() => setOpen(false)}>{t("Готово")}</SheetAction>}>
//     …
//   </Sheet>

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  /** Top-leading slot of the inline nav bar (e.g. «Готово» on the idea sheet, «Отмена»). */
  leading?: ReactNode;
  /** Top-trailing slot («Готово», «Сохранить»). */
  trailing?: ReactNode;
  /** Sticky bottom action area (export sheet). */
  footer?: ReactNode;
  children?: ReactNode;
  /** Desktop width: reading 640+44 (default), settings 660, paywall 440+48. */
  size?: "reading" | "settings" | "paywall";
  variant?: "sheet" | "dialog";
  /** Background: app paper (default) or the brighter reading paper. */
  paper?: "paper" | "reading";
  /** Fixed tall height instead of fitting the content. */
  full?: boolean;
  /** Close when the backdrop is clicked (default true). */
  dismissible?: boolean;
  /** Push a history entry so Back closes the sheet (default true). */
  history?: boolean;
  className?: string;
  bodyClassName?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  label,
  leading,
  trailing,
  footer,
  children,
  size = "reading",
  variant = "sheet",
  paper = "paper",
  full,
  dismissible = true,
  history = true,
  className,
  bodyClassName,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const followingLink = useRef(false);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mirror `open` onto the native dialog.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      followingLink.current = false;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
      if (opener.current?.isConnected && !followingLink.current) opener.current.focus({ preventScroll: true });
    }
  }, [open]);

  // Unmounting while open (route change) must not leave the document inert.
  useEffect(() => {
    const d = ref.current;
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  // One history entry per open sheet: Back closes it.
  useEffect(() => {
    if (!open || !history) return;
    const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    let pushed = false;
    let popped = false;
    const onPop = () => {
      if ((window.history.state as { iaSheet?: string } | null)?.iaSheet !== token) {
        popped = true;
        onCloseRef.current();
      }
    };
    // Deferred so React StrictMode's mount → unmount → mount does not push twice.
    const timer = window.setTimeout(() => {
      window.history.pushState({ ...(window.history.state ?? {}), iaSheet: token }, "");
      pushed = true;
      window.addEventListener("popstate", onPop);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      const ours = (window.history.state as { iaSheet?: string } | null)?.iaSheet === token;
      if (pushed && !popped && ours && !followingLink.current) window.history.back();
    };
  }, [open, history]);

  const onCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault(); // Escape / close gesture: let the owner decide (keeps React state in sync)
    onCloseRef.current();
  };

  // Not every engine turns Escape into a `cancel` event (close-watcher rules), so handle it here too.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    e.preventDefault();
    onCloseRef.current();
  };

  const onClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (!dismissible || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) onCloseRef.current();
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLDialogElement>) => {
    const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    followingLink.current = true;
  };

  const hasHeader = title !== undefined || leading !== undefined || trailing !== undefined;

  return (
    <dialog
      ref={ref}
      className={cx(
        "ia-sheet",
        variant === "dialog" && "ia-sheet--dialog",
        paper === "reading" && "ia-sheet--reading",
        `ia-sheet--w-${size}`,
        full && "ia-sheet--full",
        className,
      )}
      aria-labelledby={title !== undefined ? titleId : undefined}
      aria-label={title === undefined ? label : undefined}
      onCancel={onCancel}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onClickCapture={onClickCapture}
    >
      {open ? (
        <>
          {variant === "sheet" ? <div className="ia-sheet__grab" aria-hidden="true" /> : null}
          {hasHeader ? (
            <div className="ia-sheet__header">
              <div>{leading}</div>
              {title !== undefined ? (
                <h2 className="ia-sheet__title" id={titleId}>
                  {title}
                </h2>
              ) : (
                <span />
              )}
              <div>{trailing}</div>
            </div>
          ) : null}
          <div className={cx("ia-sheet__body", bodyClassName)}>{children}</div>
          {footer ? <div className="ia-sheet__footer">{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}

/**
 * Text action in a sheet's nav bar: glass pill, 17 pt, ink (sheets tint ink,
 * ClarityReader.swift:225,892,938). `emphasis`: "strong" (default, 600) for confirmation
 * actions «Готово» / «Сохранить» (`.confirmationAction`, `.fontWeight(.semibold)`),
 * "regular" (400) for the cancellation action «Отмена» (`.cancellationAction`, :925).
 */
export function SheetAction({
  className,
  tone = "ink",
  emphasis = "strong",
  children,
  ...rest
}: {
  tone?: "ink" | "accent";
  emphasis?: "strong" | "regular";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        "ia-glass-pill",
        emphasis === "regular" ? "ia-glass-pill--regular" : "ia-glass-pill--strong",
        tone === "accent" && "ia-glass-pill--accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
