"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

// Replaces the old energy-spend gate. A premium category is unlocked by ONE ₽
// purchase (the whole category). Non-premium niches aren't sellable yet — they
// show a "waiting for generation" status instead of a buy button.
export default function CategoryGate({
  slug,
  sellable,
  price,
  loggedIn,
  pregenDate,
  locale = "ru",
}: {
  slug: string;
  sellable: boolean;
  price: number;
  loggedIn: boolean;
  pregenDate: string;
  locale?: Locale;
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!sellable) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-5 py-3 text-[14px] font-medium text-[var(--color-text-tertiary)]">
        <span aria-hidden>⏳</span>
        {ru ? `Готовим разбор · ${pregenDate}` : `In preparation · ${pregenDate}`}
      </span>
    );
  }

  async function buy() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "category", slug, method: "bank_card" }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) return window.location.assign(d.url);
      setErr(d.error || (ru ? "Не удалось создать платёж" : "Couldn't create payment"));
    } catch {
      setErr(ru ? "Сеть недоступна" : "Network unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="btn-shimmer inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
      >
        {busy
          ? "…"
          : !loggedIn
            ? ru ? "Войти и открыть" : "Sign in to unlock"
            : ru ? `Открыть всю категорию — ${price} ₽` : `Unlock the whole category — ${price} ₽`}
      </button>
      <p className="mt-2.5 max-w-[42ch] text-caption text-[var(--color-text-tertiary)]">
        {ru
          ? "Одна покупка открывает всё в нише: выводы, все идеи и разбор конкурентов."
          : "One purchase unlocks everything in the niche: findings, all ideas and the competitor teardown."}
      </p>
      {err && <p className="mt-2 text-caption text-[#ff6b6b]">{err}</p>}
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
    </>
  );
}
