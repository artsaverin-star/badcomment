"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@saverin/ui-web";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

type Me = {
  user: { username: string | null; firstName: string | null; isAdmin: boolean; premiumUntil?: string | null } | null;
  premium: boolean;
  friend?: boolean;
  unlimited?: boolean;
};

// Auth entry point. Logged out → "Войти" opens the modal. Logged in → a round
// avatar that opens an account dropdown (name, status, admin, sign-out).
export default function AuthButton({ compact = false, locale = "ru" }: { compact?: boolean; locale?: Locale }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const [me, setMe] = useState<Me | null>(null);
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Refetch on every navigation (no-store) so the balance is never stale.
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Me) => {
        if (!alive) return;
        setMe(data);
        if (!data.user && localStorage.getItem("inapp_tg_login")) setModal(true);
      })
      .catch(() => alive && setMe({ user: null, premium: false }));
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Also refresh the balance whenever the dropdown is opened.
  useEffect(() => {
    if (!menu) return;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Me) => setMe(data))
      .catch(() => {});
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (me === null) return null;

  if (!me.user) {
    return (
      <>
        {compact ? (
          <Button variant="secondary" size="M" onClick={() => setModal(true)} className="w-full">
            {ru ? "Войти" : "Sign in"}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="flex h-9 items-center rounded-full bg-[var(--color-button-primary-bg)] px-5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
          >
            {ru ? "Войти" : "Sign in"}
          </button>
        )}
        {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
      </>
    );
  }

  const name = me.user.firstName || me.user.username || (ru ? "Аккаунт" : "Account");
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  // Compact (mobile sheet): keep the inline name + actions, no dropdown.
  if (compact) {
    return (
      <div className="flex w-full items-center justify-between gap-2.5">
        <span className="flex items-center gap-2 text-footnote text-[var(--color-text-secondary)]">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-caption font-bold text-[var(--brand-color-on-primary,#fff)]">
            {initial}
          </span>
          {me.unlimited && <span title={me.friend ? "Друг" : "Полный доступ"}>⭐</span>}
          {name}
        </span>
        <span className="flex items-center gap-2.5">
          <Link href={`${lp}/library`} className="text-caption font-medium text-[var(--color-text-secondary)]">
            {ru ? "Купленное" : "Library"}
          </Link>
          <Link href={`${lp}/saved`} className="text-caption font-medium text-[var(--color-text-secondary)]">
            {ru ? "Избранное" : "Saved"}
          </Link>
          <Link href={`${lp}/tokens`} className="text-caption font-medium text-[var(--color-text-brand)]">
            {ru ? "Доступ" : "Access"}
          </Link>
          {me.user.isAdmin && (
            <Link href={`${lp}/admin`} className="text-caption font-medium text-[var(--color-text-brand)]">
              {ru ? "Админка" : "Admin"}
            </Link>
          )}
          <button type="button" onClick={logout} className="text-caption text-[var(--color-text-tertiary)]">
            {ru ? "Выйти" : "Log out"}
          </button>
        </span>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={ru ? "Аккаунт" : "Account"}
        aria-expanded={menu}
        onClick={() => setMenu((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-callout font-bold text-[var(--brand-color-on-primary,#fff)] ring-2 ring-transparent transition-[box-shadow] hover:ring-[var(--color-border-strong)]"
      >
        {initial}
      </button>

      {menu && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[240px] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-brand)] text-lead font-bold text-[var(--brand-color-on-primary,#fff)]">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-callout font-semibold text-[var(--color-text-primary)]">{name}</span>
              <span className="text-caption text-[var(--color-text-tertiary)]">
                {me.unlimited
                  ? me.friend
                    ? ru ? "⭐ Друг" : "⭐ Friend"
                    : ru ? "⭐ Полный доступ" : "⭐ Full access"
                  : ru ? "Открыть доступ" : "Get access"}
              </span>
            </span>
          </div>
          <div className="border-t border-[var(--color-border-subtle)] p-2">
            <Link
              href={`${lp}/tokens`}
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-brand)]">
                <path d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" />
              </svg>
              <span className="flex min-w-0 flex-col">
                <span>{ru ? "Доступ" : "Access"}</span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  {me.unlimited
                    ? ru ? "Полный доступ" : "Full access"
                    : ru ? "Весь сайт навсегда" : "Everything forever"}
                </span>
              </span>
            </Link>
            <Link
              href={`${lp}/library`}
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" />
              </svg>
              {ru ? "Купленное" : "Library"}
            </Link>
            <Link
              href={`${lp}/saved`}
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0Z" />
              </svg>
              {ru ? "Избранное" : "Saved"}
            </Link>
            {me.user.isAdmin && (
              <Link
                href={`${lp}/admin`}
                onClick={() => setMenu(false)}
                className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                  <path d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" />
                </svg>
                {ru ? "Админка" : "Admin"}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-left text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 0 0 6 5.25v13.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V15a.75.75 0 0 1 1.5 0v3.75a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V5.25a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3V9A.75.75 0 0 1 15 9V5.25a1.5 1.5 0 0 0-1.5-1.5h-6Zm10.72 4.72a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l1.72-1.72H9a.75.75 0 0 1 0-1.5h10.94l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              {ru ? "Выйти" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
