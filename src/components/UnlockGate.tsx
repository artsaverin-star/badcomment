"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { tokensWord, type UnlockType, SIGNUP_GRANT } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const NOUN: Record<UnlockType, string> = { app: "разбор приложения", idea: "идею", category: "категорию целиком" };
const WHAT: Record<UnlockType, string> = {
  app: "Полный разбор всех отзывов этого приложения.",
  idea: "Готовую идею: отзывы → механики → возможность → продукт.",
  category: "Весь жанр сразу — синтез категории, все приложения и все идеи внутри.",
};

// Token-spend gate shown in place of locked content. Click → spend animation →
// router.refresh() reveals the now-unlocked page. Logged-out users are sent to
// register (free starter grant); short-on-tokens users to the buy page.
export default function UnlockGate({
  type,
  slug,
  cost,
  loggedIn,
  balance,
  locale = "ru",
}: {
  type: UnlockType;
  slug: string;
  cost: number;
  loggedIn: boolean;
  balance: number;
  locale?: Locale;
}) {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [phase, setPhase] = useState<"idle" | "working" | "reveal" | "error">("idle");
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
    setPhase("working");
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
        setPhase("error");
        return;
      }
      setPhase("reveal");
      window.setTimeout(() => router.refresh(), 1700);
    } catch {
      setPhase("error");
    }
  }

  return (
    <>
      <div className="mx-auto mt-10 max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--color-accent-brand-subtle)] text-[var(--color-text-brand)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
          Открыть {NOUN[type]}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-callout text-[var(--color-text-secondary)]">{WHAT[type]}</p>

        <button
          type="button"
          onClick={unlock}
          disabled={phase === "working"}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {phase === "working" ? (
            "Открываем…"
          ) : !loggedIn ? (
            `Войти и получить ${SIGNUP_GRANT} ${tokensWord(SIGNUP_GRANT)}`
          ) : short ? (
            "Пополнить токены"
          ) : (
            <>
              Открыть за {cost} {tokensWord(cost)}
            </>
          )}
        </button>

        {loggedIn && (
          <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">
            {short ? (
              <>
                Не хватает {cost - balance} {tokensWord(cost - balance)} · у тебя {balance}
              </>
            ) : (
              <>
                Спишется {cost} из {balance} · разблокировка навсегда
              </>
            )}
          </p>
        )}
        {phase === "error" && (
          <p className="mt-3 text-caption text-[#ff6b6b]">Не получилось. Попробуй ещё раз.</p>
        )}
      </div>

      {phase === "reveal" && <RevealOverlay cost={cost} newBalance={Math.max(0, balance - cost)} />}
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => router.refresh()} />}
    </>
  );
}

// Full-screen celebratory reveal: a popping card, an expanding ring, sparks and
// the new balance lifting in. Auto-dismissed by the parent's router.refresh().
function RevealOverlay({ cost, newBalance }: { cost: number; newBalance: number }) {
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2;
    return { sx: `${Math.cos(ang) * 120}px`, sy: `${Math.sin(ang) * 120}px`, d: i * 0.03 };
  });
  return (
    <div className="unlock-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)] backdrop-blur-sm">
      <div className="relative flex flex-col items-center">
        <div className="absolute size-28 rounded-full border-2 border-[var(--color-text-brand)] unlock-ring" />
        <div className="absolute size-28">
          {sparks.map((s, i) => (
            <span
              key={i}
              className="unlock-spark absolute left-1/2 top-1/2 size-2 rounded-full bg-[var(--color-text-brand)]"
              style={{ ["--sx" as string]: s.sx, ["--sy" as string]: s.sy, animationDelay: `${s.d}s` }}
            />
          ))}
        </div>
        <div className="unlock-pop flex size-24 items-center justify-center rounded-[26px] bg-[var(--color-accent-brand)] text-white shadow-[0_24px_60px_-16px_rgba(0,0,0,0.7)]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12.5 10 17.5 19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="unlock-lift mt-6 text-center">
          <div className="text-[20px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">Открыто!</div>
          <div className="mt-1 text-callout tabular-nums text-[var(--color-text-secondary)]">
            −{cost} · осталось {newBalance} {tokensWord(newBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}
