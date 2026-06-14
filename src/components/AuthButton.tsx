"use client";

import { useEffect, useState } from "react";
import { Button } from "@saverin/ui-web";

type Me = { user: { username: string | null; firstName: string | null; isAdmin: boolean } | null; premium: boolean };

// "Login with Telegram": start → open bot deep link → poll until the bot binds
// the token → reload so server components pick up the new session.
export default function AuthButton({ compact = false }: { compact?: boolean }) {
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null, premium: false }));
  }, []);

  async function login() {
    setBusy(true);
    try {
      const { token, url } = await fetch("/api/auth/start", { method: "POST" }).then((r) => r.json());
      window.open(url, "_blank");
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const res = await fetch(`/api/auth/poll?token=${token}`).then((r) => r.json());
        if (res.ok) {
          location.reload();
          return;
        }
        if (res.error && res.error !== "unknown") break;
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

  if (me === null) return null;

  if (!me.user) {
    return (
      <Button variant={compact ? "secondary" : "primary"} size="M" onClick={login} className={compact ? "w-full" : ""}>
        {busy ? "Ожидание Telegram…" : "Войти"}
      </Button>
    );
  }

  const name = me.user.firstName || me.user.username || "Аккаунт";
  return (
    <div className={`flex items-center gap-2 ${compact ? "w-full justify-between" : ""}`}>
      <span className="flex items-center gap-1.5 text-footnote text-[var(--color-text-secondary)]">
        {me.premium && <span title="Премиум">⭐</span>}
        {name}
      </span>
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
