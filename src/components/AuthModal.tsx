"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TgState = { token: string; url: string; expiresAt: number; waiting: boolean };
const TG_KEY = "inapp_tg_login";

function loadTg(): TgState | null {
  try {
    const raw = localStorage.getItem(TG_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TgState;
    if (s.expiresAt < Date.now()) {
      localStorage.removeItem(TG_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function ModalShell({ onClose, ru, children }: { onClose: () => void; ru: boolean; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 [animation:sheet-backdrop-in_.2s_ease] sm:items-center"
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
    </div>
  );
}

const TG_ICON = (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Login / registration modal — full provider set (Telegram + Google + email),
// mirroring the phenom-adapt flow including Telegram's instruction / waiting
// states with localStorage resume.
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lazy init resumes a pending Telegram login (e.g. tab reopened). The modal
  // only mounts client-side (after hydration), so reading localStorage here is
  // safe — no SSR mismatch.
  const [tg, setTg] = useState<TgState | null>(() => (typeof window === "undefined" ? null : loadTg()));
  const [googleInited, setGoogleInited] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  // ── Telegram ────────────────────────────────────────────────────────
  async function handleTelegramClick() {
    setError(null);
    try {
      const { token, url } = await fetch("/api/auth/start", { method: "POST" }).then((r) => r.json());
      if (!token) {
        setError(ru ? "Не удалось начать вход через Telegram" : "Failed to start Telegram login");
        return;
      }
      setTg({ token, url, expiresAt: Date.now() + 10 * 60 * 1000, waiting: false });
    } catch {
      setError(ru ? "Не удалось начать вход через Telegram" : "Telegram login failed");
    }
  }

  function handleStartTg() {
    if (!tg) return;
    const s = { ...tg, waiting: true };
    localStorage.setItem(TG_KEY, JSON.stringify(s));
    setTg(s);
    window.open(tg.url, "_blank");
  }

  function cancelTg() {
    localStorage.removeItem(TG_KEY);
    setTg(null);
  }

  // Poll while waiting for the bot to bind the token.
  useEffect(() => {
    if (!tg?.waiting) return;
    let cancelled = false;
    (async () => {
      while (!cancelled) {
        if (Date.now() > tg.expiresAt) {
          localStorage.removeItem(TG_KEY);
          setTg(null);
          setError(ru ? "Время истекло. Попробуйте снова." : "Login expired. Try again.");
          return;
        }
        try {
          const res = await fetch(`/api/auth/poll?token=${tg.token}`).then((r) => r.json());
          if (res.ok) {
            localStorage.removeItem(TG_KEY);
            onSuccess();
            return;
          }
          if (res.error && res.error !== "unknown") {
            localStorage.removeItem(TG_KEY);
            setTg(null);
            setError(ru ? "Время истекло. Попробуйте снова." : "Login expired. Try again.");
            return;
          }
        } catch {
          /* network blip, retry */
        }
        await sleep(2000);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tg?.waiting, tg?.token, tg?.expiresAt, onSuccess, ru]);

  // ── Email ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      }).then((x) => x.json());
      if (r.ok) onSuccess();
      else setError(r.error || (ru ? "Что-то пошло не так" : "Something went wrong"));
    } catch {
      setError(ru ? "Что-то пошло не так" : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const btnBase =
    "flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-3 text-callout font-semibold transition-opacity disabled:opacity-60";

  // ── Telegram: waiting state ─────────────────────────────────────────
  if (tg?.waiting) {
    const expiry = new Date(tg.expiresAt).toLocaleTimeString();
    return (
      <ModalShell onClose={onClose} ru={ru}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#2AABEE] text-white">{TG_ICON}</div>
          <h3 className="text-lead font-semibold text-[var(--color-text-primary)]">
            {ru ? "Вход через Telegram" : "Log in with Telegram"}
          </h3>
          <p className="text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {ru ? (
              <>Нажмите <strong>Start</strong> в Telegram и вернитесь на эту вкладку.</>
            ) : (
              <>Click <strong>Start</strong> in Telegram, then come back to this tab.</>
            )}
          </p>
          <div className="flex items-center gap-2 text-[#2AABEE]">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
            <span className="text-callout font-medium">{ru ? "Жду подтверждения…" : "Waiting for confirmation…"}</span>
          </div>
          <p className="text-caption text-[var(--color-text-tertiary)]">
            {ru ? `Ссылка действует до ${expiry}` : `Link valid until ${expiry}`}
          </p>
          <a href={tg.url} target="_blank" rel="noreferrer" className="text-footnote text-[#2AABEE] hover:underline">
            {ru ? "Если Telegram не открылся — открыть бота" : "If Telegram didn't open — open the bot"}
          </a>
          <button onClick={cancelTg} className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            {ru ? "Отмена" : "Cancel"}
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Telegram: instruction state ─────────────────────────────────────
  if (tg) {
    const expiry = new Date(tg.expiresAt).toLocaleTimeString();
    return (
      <ModalShell onClose={onClose} ru={ru}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#2AABEE] text-white">{TG_ICON}</div>
          <h3 className="text-lead font-semibold text-[var(--color-text-primary)]">
            {ru ? "Вход через Telegram" : "Log in with Telegram"}
          </h3>
          <p className="text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {ru ? (
              <>Сейчас откроем бота. Нажмите <strong>Start</strong> в Telegram и вернитесь на эту вкладку.</>
            ) : (
              <>We&apos;ll open the bot. Click <strong>Start</strong> in Telegram, then come back to this tab.</>
            )}
          </p>
          <button onClick={handleStartTg} className={`${btnBase} bg-[#2AABEE] text-white hover:opacity-90`}>
            {TG_ICON}
            {ru ? "Начать вход" : "Start login"}
          </button>
          <p className="text-caption text-[var(--color-text-tertiary)]">
            {ru ? `Ссылка действует до ${expiry}` : `Link valid until ${expiry}`}
          </p>
          <button onClick={cancelTg} className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            {ru ? "Отмена" : "Cancel"}
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Normal login / registration form ────────────────────────────────
  return (
    <ModalShell onClose={onClose} ru={ru}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--color-text-brand)] text-[22px] font-bold text-white [font-family:var(--brand-font-family)]">
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
        <button onClick={handleTelegramClick} disabled={loading} className={`${btnBase} bg-[#2AABEE] text-white hover:opacity-90`}>
          {TG_ICON}
          {ru ? "Войти через Telegram" : "Log in with Telegram"}
        </button>

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

        <div className="flex w-full items-center gap-3 py-1">
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          <span className="text-caption uppercase text-[var(--color-text-tertiary)]">{ru ? "или" : "or"}</span>
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2.5">
          {mode === "register" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ru ? "Имя" : "Name"}
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3 text-callout text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-brand)]"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3 text-callout text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-brand)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={ru ? "Пароль" : "Password"}
            required
            minLength={6}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-3 text-callout text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-brand)]"
          />
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className={`${btnBase} bg-[var(--color-text-brand)] text-white hover:opacity-90`}
          >
            {loading ? "…" : mode === "register" ? (ru ? "Создать аккаунт" : "Create account") : ru ? "Войти" : "Sign in"}
          </button>
        </form>

        {error && <p className="text-center text-footnote text-[#e5484d]">{error}</p>}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="text-footnote text-[var(--color-text-brand)] hover:underline"
        >
          {mode === "login"
            ? ru
              ? "Нет аккаунта? Зарегистрироваться"
              : "Don't have an account? Sign up"
            : ru
              ? "Уже есть аккаунт? Войти"
              : "Already have an account? Sign in"}
        </button>
      </div>

      <p className="mt-6 text-center text-caption text-[var(--color-text-tertiary)]">
        {ru ? "Оплата премиума — через Telegram Stars в боте." : "Premium is paid via Telegram Stars in the bot."}
      </p>
    </ModalShell>
  );
}
