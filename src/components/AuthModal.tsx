"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

function ModalShell({ onClose, ru, children }: { onClose: () => void; ru: boolean; children: React.ReactNode }) {
  // Render into <body> via a portal. The header has backdrop-filter, which makes
  // it a containing block for position:fixed — without the portal the modal
  // anchors to the header and flies to the top instead of centering.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 [animation:sheet-backdrop-in_.2s_ease] sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 [animation:sheet-up_.25s_cubic-bezier(0.32,0.72,0,1)] sm:my-8 sm:w-[384px] sm:rounded-[var(--radius-2xl)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={ru ? "Закрыть" : "Close"}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Login modal — social sign-in only: Google and VK.
export default function AuthModal({
  onClose,
  onSuccess,
  locale = "ru",
}: {
  onClose: () => void;
  onSuccess: () => void;
  locale?: Locale;
}) {
  const ru = locale !== "en";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleInited, setGoogleInited] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const VK_CLIENT_ID = process.env.NEXT_PUBLIC_VK_CLIENT_ID;

  // Lock scroll + Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // ── Google Identity Services ────────────────────────────────────────
  const initGoogle = useCallback(() => {
    if (!CLIENT_ID || !window.google?.accounts?.id || googleInited) return false;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (resp: { credential: string }) => {
        setError(null);
        setLoading(true);
        try {
          const r = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ credential: resp.credential }),
          }).then((x) => x.json());
          if (r.ok) onSuccess();
          else setError(ru ? "Не удалось войти через Google" : "Google login failed");
        } finally {
          setLoading(false);
        }
      },
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, { type: "icon", size: "large", width: 1 });
    }
    setGoogleInited(true);
    return true;
  }, [CLIENT_ID, googleInited, onSuccess, ru]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const ensure = () => {
      if (initGoogle()) return;
      if (window.google) return;
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => {
        const iv = setInterval(() => initGoogle() && clearInterval(iv), 200);
      };
      document.head.appendChild(s);
    };
    ensure();
    const iv = setInterval(() => initGoogle() && clearInterval(iv), 200);
    return () => clearInterval(iv);
  }, [CLIENT_ID, initGoogle]);

  function handleGoogleClick() {
    if (!googleInited) return;
    window.google.accounts.id.prompt((n: any) => {
      if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) {
        const btn =
          (googleBtnRef.current?.querySelector('[role="button"]') as HTMLElement) ||
          (googleBtnRef.current?.querySelector("div[style]") as HTMLElement) ||
          (googleBtnRef.current?.querySelector("iframe")?.parentElement as HTMLElement);
        if (btn) btn.click();
        else setError(ru ? "Google недоступен. Обновите страницу." : "Google Sign-In unavailable. Refresh the page.");
      }
    });
  }

  // ── VK ID (OAuth redirect) ──────────────────────────────────────────
  function handleVkClick() {
    if (!VK_CLIENT_ID) return;
    const redirectUri = `${window.location.origin}/api/auth/vk`;
    // Remember where to come back to after the round-trip.
    try {
      sessionStorage.setItem("vk_return", window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
    const url =
      `https://oauth.vk.com/authorize?client_id=${encodeURIComponent(VK_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email&display=page&v=5.199`;
    window.location.assign(url);
  }

  const btnBase =
    "flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-3 text-callout font-semibold transition-opacity disabled:opacity-60";

  return (
    <ModalShell onClose={onClose} ru={ru}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] text-[22px] font-bold text-[var(--color-text-primary)] [font-family:var(--brand-font-family)]">
          iA
        </div>
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {ru ? "Добро пожаловать в inApp" : "Welcome to inApp"}
        </h2>
        <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">
          {ru ? "Войдите, чтобы открыть весь каталог и идеи" : "Sign in to unlock the full catalog and ideas"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* hidden GSI button GIS renders into; we proxy clicks to it */}
        <div
          ref={googleBtnRef}
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }}
        />

        {CLIENT_ID && (
          <button
            onClick={handleGoogleClick}
            disabled={loading || !googleInited}
            className={`${btnBase} border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]`}
          >
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {ru ? "Продолжить с Google" : "Continue with Google"}
          </button>
        )}

        {VK_CLIENT_ID && (
          <button onClick={handleVkClick} disabled={loading} className={`${btnBase} bg-[#0077FF] text-white hover:opacity-90`}>
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.16 18.94c-6.84 0-10.74-4.69-10.9-12.49h3.43c.11 5.73 2.64 8.16 4.64 8.66V6.45h3.23v4.94c1.98-.21 4.06-2.46 4.76-4.94h3.23c-.54 3.06-2.79 5.31-4.39 6.24 1.6.75 4.16 2.71 5.13 6.25h-3.56c-.76-2.36-2.66-4.19-5.17-4.44v4.44z" />
            </svg>
            {ru ? "Продолжить с VK" : "Continue with VK"}
          </button>
        )}

        {error && <p className="text-center text-footnote text-[#e5484d]">{error}</p>}
      </div>
    </ModalShell>
  );
}
