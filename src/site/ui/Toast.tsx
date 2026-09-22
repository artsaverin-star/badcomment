"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";

// Transient confirmations («Скопировано», «Документ сохранён») and soft errors.
// The shell mounts one <ToastHost/>; call toast() from any client code.
//   toast(t("Скопировано"));
//   toast(t("Не удалось сохранить изменения…"), { tone: "error", duration: 4000 });

type ToastItem = { id: number; message: string; tone: "default" | "error"; duration: number };
type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let seq = 0;

export function toast(message: string, opts: { tone?: "default" | "error"; duration?: number } = {}): void {
  const item: ToastItem = { id: ++seq, message, tone: opts.tone ?? "default", duration: opts.duration ?? 2200 };
  listeners.forEach((l) => l(item));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const onToast: Listener = (item) => {
      setItems((list) => [...list.slice(-2), item]);
      const t = window.setTimeout(() => {
        setItems((list) => list.filter((x) => x.id !== item.id));
        timers.delete(t);
      }, item.duration);
      timers.add(t);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div className="ia-toasts" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={cx("ia-toast", item.tone === "error" && "ia-toast--error")}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
