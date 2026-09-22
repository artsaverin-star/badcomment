"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cx } from "./cx";
import { MoreIcon } from "./icons";

// Popover menu for «⋯», the account button and the language menu (spec 05 §3.6 J: surface,
// radius 14, items 44 px with a leading glyph). Keyboard: ↑/↓/Home/End move, Escape closes
// and returns focus to the trigger; a click outside or Tab closes it.
//
//   <Menu label={t("Ещё")} items={[
//     { label: t("Заметка к разбору"), icon: <NoteIcon size={17} />, onSelect: openNote },
//     { type: "separator" },
//     { label: t("Убрать из сохранённого"), danger: true, onSelect: remove },
//   ]} />

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: ReactNode;
      onSelect?: () => void;
      /** Navigate instead of calling onSelect (next/link unless `external`). */
      href?: string;
      external?: boolean;
      danger?: boolean;
      /** Radio-style item (language, theme): renders aria-checked. */
      checked?: boolean;
      lang?: string;
    }
  | { type: "separator" }
  | { type: "label"; label: string };

export function Menu({
  label,
  items,
  align = "end",
  direction = "down",
  trigger,
  triggerClassName,
  triggerLabel,
  className,
}: {
  /** Accessible name of the menu (and of the default «⋯» trigger). */
  label: string;
  items: MenuItem[];
  align?: "start" | "end";
  direction?: "down" | "up";
  /** Content of the trigger button. Default: the «⋯» glyph in a 38×44 icon button. */
  trigger?: ReactNode;
  /** Class of the trigger button (default "ia-icon-btn"). */
  triggerClassName?: string;
  /** Accessible name of the trigger when it differs from `label`. */
  triggerLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const focusables = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    const items = focusables();
    (items.find((el) => el.getAttribute("aria-checked") === "true") ?? items[0])?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = focusables();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") close(false);
  };

  return (
    <div ref={anchorRef} className={cx("ia-menu-anchor", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName ?? "ia-icon-btn"}
        aria-label={triggerLabel ?? label}
        title={trigger ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger ?? <MoreIcon size={18} strokeWidth={2} aria-hidden="true" />}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label={label}
          className={cx("ia-menu", align === "end" ? "ia-menu--end" : "ia-menu--start", direction === "up" && "ia-menu--up")}
          onKeyDown={onKeyDown}
        >
          {items.map((item, i) => {
            if (item.type === "separator") return <div key={i} role="separator" className="ia-menu__sep" />;
            if (item.type === "label")
              return (
                <div key={i} className="ia-menu__label" role="presentation">
                  {item.label}
                </div>
              );
            const role = item.checked === undefined ? "menuitem" : "menuitemradio";
            const cls = cx("ia-menu__item", item.danger && "ia-menu__item--danger");
            const content = (
              <>
                {item.icon !== undefined ? <span className="ia-menu__icon" aria-hidden="true">{item.icon}</span> : null}
                <span className="flex-1">{item.label}</span>
              </>
            );
            const select = () => {
              setOpen(false);
              item.onSelect?.();
            };
            if (item.href) {
              return item.external ? (
                <a
                  key={i}
                  href={item.href}
                  role={role}
                  aria-checked={item.checked}
                  tabIndex={-1}
                  className={cls}
                  lang={item.lang}
                  hrefLang={item.lang}
                  onClick={select}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={i}
                  href={item.href}
                  role={role}
                  aria-checked={item.checked}
                  tabIndex={-1}
                  className={cls}
                  lang={item.lang}
                  onClick={select}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role={role}
                aria-checked={item.checked}
                tabIndex={-1}
                className={cls}
                lang={item.lang}
                onClick={select}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
