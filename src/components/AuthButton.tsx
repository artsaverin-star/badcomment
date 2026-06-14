"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@saverin/ui-web";
import AuthModal from "./AuthModal";

type Me = { user: { username: string | null; firstName: string | null; isAdmin: boolean } | null; premium: boolean };

// Auth entry point: opens the login/registration modal (Telegram + Google).
// When signed in, shows the name, premium star, an admin link, and sign-out.
export default function AuthButton({ compact = false }: { compact?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null, premium: false }));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (me === null) return null;

  if (!me.user) {
    return (
      <>
        <Button
          variant={compact ? "secondary" : "primary"}
          size="M"
          onClick={() => setModal(true)}
          className={compact ? "w-full" : ""}
        >
          Войти
        </Button>
        {modal && <AuthModal onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
      </>
    );
  }

  const name = me.user.firstName || me.user.username || "Аккаунт";
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "w-full justify-between" : ""}`}>
      <span className="flex items-center gap-1.5 text-footnote text-[var(--color-text-secondary)]">
        {me.premium && <span title="Премиум">⭐</span>}
        {name}
      </span>
      {me.user.isAdmin && (
        <Link
          href="/admin"
          className="text-caption font-medium text-[var(--color-text-brand)] hover:opacity-80"
        >
          Админка
        </Link>
      )}
      <button
        type="button"
        onClick={logout}
        className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
      >
        Выйти
      </button>
    </div>
  );
}
