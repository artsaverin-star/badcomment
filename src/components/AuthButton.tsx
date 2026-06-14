"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@saverin/ui-web";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

type Me = { user: { username: string | null; firstName: string | null; isAdmin: boolean } | null; premium: boolean };

// Auth entry point. Logged out → "Войти" opens the modal. Logged in → a round
// avatar that opens an account dropdown (name, status, admin, sign-out).
export default function AuthButton({ compact = false, locale = "ru" }: { compact?: boolean; locale?: Locale }) {
  const ru = locale !== "en";
  const [me, setMe] = useState<Me | null>(null);
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Me) => {
        setMe(data);
        if (!data.user && localStorage.getItem("inapp_tg_login")) setModal(true);
      })
      .catch(() => setMe({ user: null, premium: false }));
  }, []);

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
            Войти
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="flex h-9 items-center rounded-full bg-[var(--color-button-primary-bg)] px-5 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
          >
            Войти
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
          {me.premium && <span title="Премиум">⭐</span>}
          {name}
        </span>
        <span className="flex items-center gap-2.5">
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
                {me.premium ? (ru ? "⭐ Премиум" : "⭐ Premium") : ru ? "Бесплатный план" : "Free plan"}
              </span>
            </span>
          </div>
          <div className="border-t border-[var(--color-border-subtle)] p-2">
            {me.user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenu(false)}
                className="flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]">
                  <path d="M10 2.5 3 5.2v4.3c0 3.4 2.7 6.5 7 8 4.3-1.5 7-4.6 7-8V5.2L10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                {ru ? "Админка" : "Admin"}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2.5 text-left text-callout text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]">
                <path d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {ru ? "Выйти" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
