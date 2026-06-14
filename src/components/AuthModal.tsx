"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Login / registration modal: Telegram (deep-link + poll) and Google (GSI
// one-tap credential). Both create the account on first use.
export default function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [tgBusy, setTgBusy] = useState(false);
  const googleDiv = useRef<HTMLDivElement>(null);
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const init = () => {
      if (!window.google || !googleDiv.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: { credential: string }) => {
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ credential: resp.credential }),
          }).then((x) => x.json());
          if (r.ok) onSuccess();
        },
      });
      window.google.accounts.id.renderButton(googleDiv.current, {
        theme: "outline",
        size: "large",
        width: 296,
        text: "continue_with",
        shape: "pill",
      });
    };
    if (window.google) return init();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [CLIENT_ID, onSuccess]);

  async function telegram() {
    setTgBusy(true);
    try {
      const { token, url } = await fetch("/api/auth/start", { method: "POST" }).then((r) => r.json());
      window.open(url, "_blank");
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await sleep(2000);
        const res = await fetch(`/api/auth/poll?token=${token}`).then((r) => r.json());
        if (res.ok) return onSuccess();
        if (res.error && res.error !== "unknown") break;
      }
    } finally {
      setTgBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 [animation:sheet-backdrop-in_.2s_ease] sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 [animation:sheet-up_.25s_cubic-bezier(0.32,0.72,0,1)] sm:w-[360px] sm:rounded-[var(--radius-2xl)]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">Вход в inApp</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex size-8 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mb-5 text-callout text-[var(--color-text-secondary)]">
          Войдите или зарегистрируйтесь, чтобы открыть весь каталог и идеи.
        </p>

        <button
          type="button"
          onClick={telegram}
          disabled={tgBusy}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#229ED9] px-5 py-3 text-callout font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1 .5l.36-5.1L17.9 6.2c.4-.36-.09-.56-.62-.2L6.7 12.9l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6l19.46-7.5c.9-.33 1.69.2 1.49 1.06Z" />
          </svg>
          {tgBusy ? "Ожидание Telegram…" : "Войти через Telegram"}
        </button>

        {CLIENT_ID ? (
          <>
            <div className="my-4 flex items-center gap-3 text-caption text-[var(--color-text-tertiary)]">
              <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />или<span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            </div>
            <div ref={googleDiv} className="flex justify-center" />
          </>
        ) : null}

        <p className="mt-5 text-caption text-[var(--color-text-tertiary)]">
          Оплата премиума — через Telegram Stars в боте.
        </p>
      </div>
    </div>
  );
}
