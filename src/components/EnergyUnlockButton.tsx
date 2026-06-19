"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import type { UnlockType } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const ENERGY_COLORS = ["#ff7a1a", "#ffb347", "#ffd9a8", "#ffcf5c", "#ffffff"];

// Fire a bolt-confetti salute from a point (viewport-normalized 0..1).
async function fireSalute(x: number, y: number) {
  const confetti = (await import("canvas-confetti")).default;
  // A lightning-bolt shape from emoji when supported, plus bright circles.
  const bolt = typeof confetti.shapeFromText === "function" ? confetti.shapeFromText({ text: "⚡", scalar: 2.2 }) : "star";
  const base = { origin: { x, y }, disableForReducedMotion: true, ticks: 160, gravity: 0.85 };
  confetti({ ...base, particleCount: 26, spread: 75, startVelocity: 38, scalar: 1.7, shapes: [bolt], flat: true });
  confetti({ ...base, particleCount: 50, spread: 95, startVelocity: 30, scalar: 0.9, colors: ENERGY_COLORS });
  confetti({ ...base, particleCount: 18, spread: 130, startVelocity: 22, scalar: 1.2, colors: ENERGY_COLORS });
}

// Lightweight per-item unlock button. Spends «энергия» via /api/unlock, plays a
// confetti salute + pop-out, then refreshes so the content reveals.
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const [auth, setAuth] = useState(false);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
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
    // Salute + pop-out immediately on tap, from the button's centre.
    const el = btnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      void fireSalute((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight);
    }
    setDone(true);
    setWorking(true);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, slug }),
      });
      if (res.status === 402) {
        router.push("/tokens");
        return;
      }
      if (!res.ok) {
        setWorking(false);
        setDone(false);
        return;
      }
      setTimeout(() => router.refresh(), 560);
    } catch {
      setWorking(false);
      setDone(false);
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={unlock}
        disabled={working}
        className={`btn-shimmer inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:cursor-default ${done ? "btn-pop-out" : ""}`}
      >
        {!loggedIn ? (
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
      </button>
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => router.refresh()} />}
    </>
  );
}
