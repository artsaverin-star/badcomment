"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useT, useWeb } from "../../i18n/client";
import { format } from "../../i18n/strings";
import { INTL_LOCALE } from "../../i18n/locales";
import { routes } from "../../routing";
import { Button } from "../../ui/Button";
import { AlertIcon, AppMark, CopyIcon, MailIcon } from "../../ui/icons";
import { leadFor } from "./copy";
import type { AuthStrings } from "./strings";
import { loadPendingTelegram, storeTelegram, TG_TTL_MS, type TgState } from "./telegram";
import "./auth.css";

// The one sign-in UI of the new site (spec 06 §3.2–3.6), shared by the dialog (SignInHost)
// and the /<L>/login page. Methods, exactly as the old modal offers them:
//   • Telegram: POST /api/auth/start → open the bot link → poll /api/auth/poll every 2 s
//     (10 min). Success sets the session cookie → onSuccess() (the caller refreshes).
//   • Google: full-page GET /api/auth/google/start?return_to=<public path> (only when
//     NEXT_PUBLIC_GOOGLE_CLIENT_ID is set at build and not inside an in-app webview).
//   • E-mail magic link: POST /api/auth/email/start {email, return_to, locale} (only when
//     NEXT_PUBLIC_EMAIL_LOGIN=1).
// A pending Telegram login survives reloads (./telegram.ts), so the dialog can resume polling
// after the user comes back. Strings: the page locale's row of authStrings, handed down by the
// server (useWeb("auth")); the dialog host loads this panel on demand.

const GOOGLE_ON = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const EMAIL_ON = process.env.NEXT_PUBLIC_EMAIL_LOGIN === "1";

const TG_POLL_MS = 2000;

// Google refuses embedded webviews (`disallowed_useragent`): same detection as the old modal.
function isInAppWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/(Threads|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|TikTok|Snapchat|Pinterest|MicroMessenger|GSA\/|VKClient|OdklApp)/i.test(ua)) return true;
  if (/\bwv\b/.test(ua) || /; wv\)/.test(ua)) return true;
  if (/(iPhone|iPod|iPad)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua) && !/(CriOS|FxiOS|EdgiOS)/.test(ua)) return true;
  return false;
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function TelegramGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export type SignInPanelProps = {
  /** Public path to land on after Google / the e-mail link (validated by the caller). */
  returnTo: string;
  /** Why sign-in is needed: picks the lead line ("plus", "saved", "checkout", …). */
  reason?: string | null;
  /** A message to show on top (e.g. ?auth=google_error). */
  notice?: string | null;
  /** Telegram finished: the session cookie is set. */
  onSuccess: () => void;
  /** "h1" on the /login page, "h2" in the dialog. */
  headingLevel?: "h1" | "h2";
};

export function SignInPanel({ returnTo, reason, notice, onSuccess, headingLevel = "h2" }: SignInPanelProps) {
  const s = useWeb<AuthStrings>("auth");
  const t = useT();
  const locale = useLocale();
  const Heading = headingLevel;
  const emailId = useId();
  const errorId = useId();

  const [tg, setTg] = useState<TgState | null>(null);
  const [tgBusy, setTgBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  // Client-only facts (no SSR/hydration drift): webview detection and a pending Telegram login.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInApp(isInAppWebView());
      const pending = loadPendingTelegram();
      if (pending) setTg(pending);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Poll while waiting for the bot to bind the token.
  useEffect(() => {
    if (!tg?.waiting) return;
    let cancelled = false;
    const { token, expiresAt } = tg;
    void (async () => {
      while (!cancelled) {
        if (Date.now() > expiresAt) {
          storeTelegram(null);
          setTg(null);
          setError(s.errTgExpired);
          return;
        }
        try {
          const res = await fetch(`/api/auth/poll?token=${encodeURIComponent(token)}`, { cache: "no-store" });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; pending?: boolean; error?: string };
          if (cancelled) return;
          if (data.ok) {
            storeTelegram(null);
            onSuccessRef.current();
            return;
          }
          if (data.error && data.error !== "unknown") {
            storeTelegram(null);
            setTg(null);
            setError(s.errTgExpired);
            return;
          }
        } catch {
          /* network blip: keep polling */
        }
        await sleep(TG_POLL_MS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tg, s.errTgExpired]);

  async function startTelegram() {
    setError(null);
    setTgBusy(true);
    try {
      const res = await fetch("/api/auth/start", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { token?: string; url?: string };
      if (!res.ok || !data.token || !data.url) {
        setError(s.errTgStart);
        return;
      }
      setTg({ token: data.token, url: data.url, expiresAt: Date.now() + TG_TTL_MS, waiting: false });
    } catch {
      setError(s.errTgStart);
    } finally {
      setTgBusy(false);
    }
  }

  function openBot() {
    if (!tg) return;
    const next = { ...tg, waiting: true };
    storeTelegram(next);
    setTg(next);
    window.open(tg.url, "_blank", "noopener");
  }

  function cancelTelegram() {
    storeTelegram(null);
    setTg(null);
  }

  function google() {
    window.location.assign(`/api/auth/google/start?return_to=${encodeURIComponent(returnTo)}`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the ⋯ menu still works */
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || emailBusy) return;
    setError(null);
    setEmailError(null);
    setEmailBusy(true);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, return_to: returnTo, locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setEmailSent(addr.toLowerCase());
        return;
      }
      const byCode: Record<string, string> = {
        bad_email: s.errBadEmail,
        disposable: s.errDisposable,
        rate: s.errRate,
        send_failed: s.errSendFailed,
        disabled: s.errDisabled,
      };
      setEmailError((data.error && byCode[data.error]) || s.errGeneric);
    } catch {
      setEmailError(s.errSendFailed);
    } finally {
      setEmailBusy(false);
    }
  }

  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });

  // ── E-mail: link sent ────────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="ia-auth" role="status">
        <span className="ia-auth__badge ia-auth__badge--mail" aria-hidden="true">
          <MailIcon size={26} strokeWidth={1.8} />
        </span>
        <Heading className="ia-auth__title">{s.emailSentTitle}</Heading>
        <p className="ia-auth__lead">{format(s.emailSentBody, { email: emailSent })}</p>
        <p className="ia-auth__fine">{s.emailSpam}</p>
        <Button variant="text" onClick={() => setEmailSent(null)}>
          {s.emailOther}
        </Button>
      </div>
    );
  }

  // ── Telegram: instruction / waiting ──────────────────────────────────
  if (tg) {
    return (
      <div className="ia-auth">
        <span className="ia-auth__badge ia-auth__badge--tg" aria-hidden="true">
          <TelegramGlyph />
        </span>
        <Heading className="ia-auth__title">{s.tgTitle}</Heading>
        {tg.waiting ? (
          <>
            <p className="ia-auth__lead">{s.tgWaiting}</p>
            <p className="ia-auth__status" role="status" aria-live="polite">
              <span className="ia-spinner" aria-hidden="true" />
              {s.tgWaitingStatus}
            </p>
            <a className="ia-auth__link" href={tg.url} target="_blank" rel="noopener noreferrer">
              {s.tgReopen}
            </a>
          </>
        ) : (
          <>
            <p className="ia-auth__lead">{s.tgIntro}</p>
            <button type="button" className="ia-auth__method ia-auth__method--tg" onClick={openBot}>
              <TelegramGlyph />
              {s.tgOpen}
            </button>
          </>
        )}
        <p className="ia-auth__fine">{format(s.tgValidUntil, { time: time(tg.expiresAt) })}</p>
        <Button variant="text" onClick={cancelTelegram}>
          {t("Отмена")}
        </Button>
      </div>
    );
  }

  // ── Start ────────────────────────────────────────────────────────────
  const showGoogle = GOOGLE_ON && !inApp;
  return (
    <div className="ia-auth">
      <span className="ia-auth__mark" aria-hidden="true">
        <AppMark size={56} />
      </span>
      <Heading className="ia-auth__title">{s.title}</Heading>
      <p className="ia-auth__lead">{leadFor(s, reason)}</p>

      {notice ? (
        <p className="ia-auth__notice" role="alert">
          <AlertIcon size={17} strokeWidth={2} aria-hidden="true" />
          <span>{notice}</span>
        </p>
      ) : null}

      {inApp ? (
        <div className="ia-auth__webview">
          <p>{EMAIL_ON ? s.webviewWithEmail : s.webviewNoEmail}</p>
          <Button variant="secondary" size="sm" onClick={copyLink} leadingIcon={<CopyIcon size={15} aria-hidden="true" />}>
            {copied ? s.linkCopied : s.copyLink}
          </Button>
        </div>
      ) : null}

      <div className="ia-auth__methods">
        <button
          type="button"
          className="ia-auth__method ia-auth__method--tg"
          onClick={startTelegram}
          disabled={tgBusy}
          aria-busy={tgBusy || undefined}
        >
          {tgBusy ? <span className="ia-spinner" aria-hidden="true" /> : <TelegramGlyph />}
          {s.telegram}
        </button>
        {showGoogle ? (
          <button type="button" className="ia-auth__method ia-auth__method--google" onClick={google}>
            <GoogleGlyph />
            {s.google}
          </button>
        ) : null}
        {error ? (
          <p className="ia-auth__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {EMAIL_ON ? (
        <>
          <div className="ia-auth__divider" aria-hidden="true">
            <span>{s.orEmail}</span>
          </div>
          <form className="ia-auth__form" onSubmit={submitEmail} noValidate>
            <label className="sr-only" htmlFor={emailId}>
              {s.emailLabel}
            </label>
            <input
              id={emailId}
              className="ia-auth__input"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={s.emailPlaceholder}
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? errorId : undefined}
            />
            <button
              type="submit"
              className="ia-auth__method ia-auth__method--plain"
              disabled={emailBusy || !email.trim()}
              aria-busy={emailBusy || undefined}
            >
              {emailBusy ? s.emailBusy : s.emailSubmit}
            </button>
            {emailError ? (
              <p id={errorId} className="ia-auth__error" role="alert">
                {emailError}
              </p>
            ) : null}
          </form>
        </>
      ) : null}

      <p className="ia-auth__fine">{s.readWithoutAccount}</p>
      <p className="ia-auth__legal">
        <Link href={routes.offer(locale)}>{t("Условия использования")}</Link>{" "}
        <Link href={routes.privacy(locale)}>{t("Конфиденциальность")}</Link>
      </p>
    </div>
  );
}
