"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import type { UnlockType } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// Energy-salute particles — bolts burst out of the button on a successful unlock.
// Deterministic spread (no Math.random → no hydration mismatch).
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const dist = 44 + (i % 3) * 16;
  return {
    tx: Math.round(Math.cos(a) * dist),
    ty: Math.round(Math.sin(a) * dist) - 10,
    rot: (i % 2 ? 1 : -1) * (30 + (i % 4) * 12),
    size: 12 + (i % 3) * 4,
    delay: (i % 4) * 25,
  };
});

// Lightweight per-item unlock button. Spends «энергия» via /api/unlock, plays a
// bolt salute, then refreshes so the content reveals inline.
export default function EnergyUnlockButton({
  type,
  slug,
  cost,
  loggedIn,
  balance,
  label,
  locale = "ru",
}: {
  type: UnlockType;
  slug: string;
  cost: number;
  loggedIn: boolean;
  balance: number;
  label: string;
  locale?: Locale;
}) {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [working, setWorking] = useState(false);
  const [burst, setBurst] = useState(false);
  const ru = locale !== "en";
  const short = loggedIn && balance < cost;

  async function unlock() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    if (short) {
      router.push("/tokens");
      return;
    }
    setWorking(true);
    try {
      const r = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, slug }),
      });
      if (r.status === 402) {
        router.push("/tokens");
        return;
      }
      if (!r.ok) {
        setWorking(false);
        return;
      }
      // Salute, then reveal — give the burst time to play before the refresh.
      setBurst(true);
      setTimeout(() => router.refresh(), 620);
    } catch {
      setWorking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={unlock}
        disabled={working}
        className="btn-shimmer relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-80"
      >
        {working ? (
          ru ? "Открываем…" : "Unlocking…"
        ) : !loggedIn ? (
          ru ? "Войти и открыть" : "Sign in to unlock"
        ) : short ? (
          ru ? "Пополнить энергию" : "Top up energy"
        ) : (
          <>
            {label}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 2 4.5 13.2c-.42.55-.03 1.3.66 1.3H11l-1.4 7.6c-.13.7.78 1.1 1.2.5L19.5 11.4c.42-.55.03-1.3-.66-1.3H13l1.4-7.7c.13-.7-.78-1.08-1.2-.5z" />
            </svg>
            <span className="tabular-nums">{cost}</span>
          </>
        )}

        {burst && (
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10">
            {PARTICLES.map((p, i) => (
              <svg
                key={i}
                width={p.size}
                height={p.size}
                viewBox="0 0 24 24"
                fill="#ffe6c2"
                className="energy-particle absolute drop-shadow-[0_0_6px_rgba(255,180,90,0.8)]"
                style={{ ["--tx" as string]: `${p.tx}px`, ["--ty" as string]: `${p.ty}px`, ["--rot" as string]: `${p.rot}deg`, animationDelay: `${p.delay}ms` }}
              >
                <path d="M13 2 4.5 13.2c-.42.55-.03 1.3.66 1.3H11l-1.4 7.6c-.13.7.78 1.1 1.2.5L19.5 11.4c.42-.55.03-1.3-.66-1.3H13l1.4-7.7c.13-.7-.78-1.08-1.2-.5z" />
              </svg>
            ))}
          </span>
        )}
      </button>
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => router.refresh()} />}
    </>
  );
}
