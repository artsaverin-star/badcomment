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
          <Link href="/library" className="text-caption font-medium text-[var(--color-text-secondary)]">
            {ru ? "Купленное" : "Library"}
          </Link>
          <Link href="/saved" className="text-caption font-medium text-[var(--color-text-secondary)]">
            {ru ? "Избранное" : "Saved"}
          </Link>
          <Link href="/tokens" className="text-caption font-medium text-[var(--color-text-brand)]">
            {ru ? "Доступ" : "Access"}
          </Link>
          {me.user.isAdmin && (
            <Link href="/admin" className="text-caption font-medium text-[var(--color-text-brand)]">
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
              href="/tokens"
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-brand)]">
                <path d="M9.4 2.1c.5 3.6 1.3 4.4 4.9 4.9-3.6.5-4.4 1.3-4.9 4.9-.5-3.6-1.3-4.4-4.9-4.9 3.6-.5 4.4-1.3 4.9-4.9Z" />
                <path d="M15.2 11.4c.26 1.5.66 1.9 2.16 2.16-1.5.26-1.9.66-2.16 2.16-.26-1.5-.66-1.9-2.16-2.16 1.5-.26 1.9-.66 2.16-2.16Z" />
              </svg>
              <span className="flex min-w-0 flex-col">
                <span>{ru ? "Доступ" : "Access"}</span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  {me.unlimited
                    ? ru ? "Полный доступ" : "Full access"
                    : ru ? "Колода и Lifetime" : "Deck & Lifetime"}
                </span>
              </span>
            </Link>
            <Link
              href="/library"
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="M5 2.5h10A1.5 1.5 0 0 1 16.5 4v13.1a.65.65 0 0 1-.99.55L10 14.4l-5.51 3.25a.65.65 0 0 1-.99-.55V4A1.5 1.5 0 0 1 5 2.5Z" />
              </svg>
              {ru ? "Купленное" : "Library"}
            </Link>
            <Link
              href="/saved"
              onClick={() => setMenu(false)}
              className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z" />
              </svg>
              {ru ? "Избранное" : "Saved"}
            </Link>
            {me.user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenu(false)}
                className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                  <path d="M10 2.5 3 5.2v4.3c0 3.4 2.7 6.5 7 8 4.3-1.5 7-4.6 7-8V5.2L10 2.5Z" />
                </svg>
                {ru ? "Админка" : "Admin"}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-left text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="M4.5 2.5h4.2a1 1 0 0 1 1 1 .8.8 0 0 1-.8.8H6.2a1.2 1.2 0 0 0-1.2 1.2v9a1.2 1.2 0 0 0 1.2 1.2h2.7a.8.8 0 0 1 .8.8 1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 16.5v-12.5A1.5 1.5 0 0 1 4.5 2.5Z" />
                <path d="M13.4 6.2 16.8 9.5a.7.7 0 0 1 0 1l-3.4 3.3a.7.7 0 0 1-1.2-.5v-1.9H8.6a.8.8 0 0 1 0-1.6h3.6V6.7a.7.7 0 0 1 1.2-.5Z" />
              </svg>
              {ru ? "Выйти" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
