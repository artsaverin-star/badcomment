"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import type { UnlockType } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// Button-coloured shards so it reads as the button itself crumbling.
const SHARD_COLORS = ["#ff7a1a", "#ff922b", "#ffb347", "#ffd9a8", "#ffffff"];

// Disintegrate the button into particles: small shards burst from several points
// across its width (so the whole bar crumbles), plus a few energy bolts on top.
async function fireDisintegrate(rect: DOMRect) {
  const confetti = (await import("canvas-confetti")).default;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const y = (rect.top + rect.height / 2) / H;
  const N = 7;
  for (let i = 0; i < N; i++) {
    const x = (rect.left + (rect.width * (i + 0.5)) / N) / W;
    confetti({
      particleCount: 12,
      startVelocity: 18,
      spread: 58,
      origin: { x, y },
      colors: SHARD_COLORS,
      scalar: 0.62,
      ticks: 85,
      gravity: 1.25,
      shapes: ["square", "circle"],
      disableForReducedMotion: true,
    });
  }
  const bolt = typeof confetti.shapeFromText === "function" ? confetti.shapeFromText({ text: "⚡", scalar: 1.8 }) : "star";
  confetti({
    particleCount: 12,
    spread: 100,
    startVelocity: 30,
    origin: { x: (rect.left + rect.width / 2) / W, y },
    shapes: [bolt],
    scalar: 1.4,
    ticks: 120,
    gravity: 0.7,
    colors: ["#ff9a3c"],
    disableForReducedMotion: true,
  });
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
  // Survives the Google sign-in full-page redirect: we stash the intended unlock,
  // then auto-resume it once the user lands back logged-in.
  const PENDING_KEY = "inapp_pending_unlock";

  // The actual spend (logged-in, has-balance path): confetti + /api/unlock + reveal.
  const spend = useCallback(async () => {
    const el = btnRef.current;
    if (el) void fireDisintegrate(el.getBoundingClientRect());
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
      setTimeout(() => router.refresh(), 680);
    } catch {
      setWorking(false);
      setDone(false);
    }
  }, [type, slug, router]);

  async function unlock() {
    if (!loggedIn) {
      // Remember what the user wanted so we can finish it after sign-in.
      try {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ type, slug }));
      } catch {
        /* ignore */
      }
      setAuth(true);
      return;
    }
    if (short) {
      router.push("/tokens");
      return;
    }
    void spend();
  }

  // Auto-resume a pending unlock after the user returns signed-in (Google redirect
  // lands them back here; Telegram refreshes in place). Only the button matching
  // the stashed intent fires, and only when there's enough balance.
  useEffect(() => {
    if (!loggedIn || short) return;
    let pending: { type?: string; slug?: string } | null = null;
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      pending = raw ? JSON.parse(raw) : null;
    } catch {
      pending = null;
    }
    if (!pending || pending.type !== type || pending.slug !== slug) return;
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch {
      /* ignore */
    }
    // Defer out of the effect so we don't setState synchronously during it.
    const t = setTimeout(() => void spend(), 0);
    return () => clearTimeout(t);
  }, [loggedIn, short, type, slug, spend]);

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
