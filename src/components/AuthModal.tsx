"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Logo from "./Logo";
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

// Google OAuth refuses embedded webviews (Threads/Instagram/FB/etc.) with
// `disallowed_useragent`. Detect them so we can steer the user to Telegram or to
// their real browser instead of a dead-end 403.
function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/(Threads|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|TikTok|Snapchat|Pinterest|MicroMessenger|GSA\/|VKClient|OdklApp)/i.test(ua)) return true;
  if (/\bwv\b/.test(ua) || /; wv\)/.test(ua)) return true; // Android WebView
  // iOS in-app webview: WebKit without the Safari/Chrome/Firefox tokens.
  if (/(iPhone|iPod|iPad)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua) && !/(CriOS|FxiOS|EdgiOS)/.test(ua)) return true;
  return false;
}

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

const TG_ICON = (
  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Login modal — social sign-in only: Telegram and Google.
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
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tg, setTg] = useState<TgState | null>(() => (typeof window === "undefined" ? null : loadTg()));
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null); // address we mailed a link to
  const [emailError, setEmailError] = useState<string | null>(null); // shown under the email input, not at the bottom
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const EMAIL_ON = process.env.NEXT_PUBLIC_EMAIL_LOGIN === "1";

  // Detect the embedded-webview case on the client (avoids SSR/hydration drift).
  // Deferred so we don't setState synchronously inside the effect body.
  useEffect(() => {
    const t = setTimeout(() => setInApp(isInAppWebView()), 0);
    return () => clearTimeout(t);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the user can still use the ⋯ menu */
    }
  }

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

  // ── Google sign-in ──────────────────────────────────────────────────
  // Clean server redirect flow for everyone: a plain top-level navigation to
  // Google → back, logged in. Works with content blockers (Wipr) and avoids
  // Google's confusing corner One-Tap popup that used to overlap our modal.
  function handleGoogleClick() {
    const rt = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/auth/google/start?return_to=${rt}`;
  }

  // ── Email magic link ────────────────────────────────────────────────
  // Works everywhere, including in-app webviews where Google is blocked. We
  // POST the address, the server mails a 15-minute link, the user clicks it.
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || emailBusy) return;
    setError(null);
    setEmailError(null);
    setEmailBusy(true);
    try {
      const returnTo = window.location.pathname + window.location.search;
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, return_to: returnTo, locale: ru ? "ru" : "en" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setEmailSent(addr.toLowerCase());
        return;
      }
      const messages: Record<string, { ru: string; en: string }> = {
        bad_email: { ru: "Проверьте адрес почты.", en: "Check the email address." },
        disposable: { ru: "Временные адреса не поддерживаются. Укажите постоянную почту.", en: "Disposable addresses aren't supported. Use a permanent one." },
        rate: { ru: "Слишком много попыток. Попробуйте позже.", en: "Too many attempts. Try again later." },
        send_failed: { ru: "Не удалось отправить письмо. Попробуйте ещё раз.", en: "Couldn't send the email. Try again." },
        disabled: { ru: "Вход по почте сейчас недоступен.", en: "Email sign-in is unavailable right now." },
      };
      const m = messages[data.error as string];
      setEmailError(m ? (ru ? m.ru : m.en) : ru ? "Что-то пошло не так. Попробуйте ещё раз." : "Something went wrong. Try again.");
    } catch {
      setEmailError(ru ? "Не удалось отправить письмо. Попробуйте ещё раз." : "Couldn't send the email. Try again.");
    } finally {
      setEmailBusy(false);
    }
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

  const btnBase =
    "flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-3 text-callout font-semibold transition-opacity disabled:opacity-60";

  // ── Email: link-sent confirmation ──────────────────────────────────
  if (emailSent) {
    return (
      <ModalShell onClose={onClose} ru={ru}>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-[var(--brand-color-on-primary,#fff)]">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 7.5 12 13l9-5.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lead font-semibold text-[var(--color-text-primary)]">
            {ru ? "Проверьте почту" : "Check your email"}
          </h3>
          <p className="text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {ru ? (
              <>Отправили ссылку для входа на <strong className="text-[var(--color-text-primary)]">{emailSent}</strong>. Откройте её на этом устройстве — ссылка действует 15 минут.</>
            ) : (
              <>We sent a sign-in link to <strong className="text-[var(--color-text-primary)]">{emailSent}</strong>. Open it on this device — the link is valid for 15 minutes.</>
            )}
          </p>
          <p className="text-caption text-[var(--color-text-tertiary)]">
            {ru ? "Не пришло? Загляните в «Спам»." : "Not there? Check your spam folder."}
          </p>
          <button
            onClick={() => { setEmailSent(null); setError(null); }}
            className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {ru ? "Использовать другой адрес" : "Use a different address"}
          </button>
        </div>
      </ModalShell>
    );
  }

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

  // ── Sign-in: Telegram + Google ──────────────────────────────────────
  return (
    <ModalShell onClose={onClose} ru={ru}>
      <div className="mb-6 text-center">
        <div className="mb-4 flex justify-center">
          <Logo iconSize={40} textClassName="text-[30px]" />
        </div>
        <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {ru ? "Добро пожаловать в inApp" : "Welcome to inApp"}
        </h2>
        <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">
          {ru ? "Войдите, чтобы открыть весь каталог и идеи" : "Sign in to unlock the full catalog and ideas"}
        </p>
      </div>

      {inApp && (
        <div className="mb-4 rounded-2xl border border-[color-mix(in_srgb,#f5a623_40%,var(--color-border-subtle))] bg-[color-mix(in_srgb,#f5a623_10%,transparent)] p-4 text-left">
          <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">
            {ru
              ? `Вы во встроенном браузере (Threads/Instagram и т.п.). Google-вход тут блокируется. Войдите ${EMAIL_ON ? "по почте или " : ""}через Telegram, либо откройте сайт в Safari/Chrome (меню ⋯ вверху → «Открыть в браузере»).`
              : `You're in an in-app browser (Threads/Instagram, etc.). Google sign-in is blocked here. Use ${EMAIL_ON ? "email or " : ""}Telegram, or open the site in Safari/Chrome (⋯ menu → “Open in browser”).`}
          </p>
          <button
            onClick={copyLink}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-1.5 text-caption font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
          >
            {copied ? (ru ? "Ссылка скопирована ✓" : "Link copied ✓") : (ru ? "Скопировать ссылку" : "Copy link")}
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button onClick={handleTelegramClick} disabled={loading} className={`${btnBase} bg-[#2AABEE] text-white hover:opacity-90`}>
          {TG_ICON}
          {ru ? "Войти через Telegram" : "Log in with Telegram"}
        </button>

        {CLIENT_ID && !inApp && (
          <button
            onClick={handleGoogleClick}
            disabled={loading}
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

        {error && <p className="text-center text-footnote text-[#e5484d]">{error}</p>}
      </div>

      {EMAIL_ON && (
        <div className="my-3 flex items-center gap-3 text-caption text-[var(--color-text-tertiary)]">
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          {ru ? "или по почте" : "or by email"}
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
        </div>
      )}

      {EMAIL_ON && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ru ? "Ваша почта" : "Your email"}
            className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-5 py-3 text-callout text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
          />
          <button
            type="submit"
            disabled={emailBusy || !email.trim()}
            className={`${btnBase} border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]`}
          >
            {emailBusy ? (ru ? "Отправляем…" : "Sending…") : ru ? "Войти по почте" : "Sign in by email"}
          </button>
          {emailError && <p className="px-1 text-center text-footnote text-[#e5484d]">{emailError}</p>}
        </form>
      )}
    </ModalShell>
  );
}
