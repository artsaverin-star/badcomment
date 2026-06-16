"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { tokensWord, type UnlockType, SIGNUP_GRANT } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const NOUN: Record<UnlockType, string> = { app: "разбор приложения", idea: "идею", category: "категорию целиком" };
const WHAT: Record<UnlockType, string> = {
  app: "Полный разбор всех отзывов этого приложения.",
  idea: "Готовая идея: отзывы → механики → возможность → продукт.",
  category: "Весь жанр сразу — синтез, все приложения и все идеи внутри.",
};

// Deterministic «starfield» — computed once at module load so server and client
// markup match (no hydration mismatch, no Math.random). A cheap hash per index
// scatters position, size, twinkle speed/phase and opacity range.
const frac = (x: number) => x - Math.floor(x);
const rng = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453);
const DOTS = Array.from({ length: 80 }, (_, i) => ({
  left: rng(i, 12.9898) * 100,
  top: rng(i, 78.233) * 100,
  size: 1 + rng(i, 3.17) * 2.6,
  d: 2.4 + rng(i, 5.7) * 3.6,
  delay: rng(i, 9.13) * 4,
  o0: 0.06 + rng(i, 1.31) * 0.12,
  o1: 0.45 + rng(i, 2.61) * 0.5,
}));

// Bolt = «Энергия» glyph.
function Bolt({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13 2 4.5 13.2c-.42.55-.03 1.3.66 1.3H11l-1.4 7.6c-.13.7.78 1.1 1.2.5L19.5 11.4c.42-.55.03-1.3-.66-1.3H13l1.4-7.7c.13-.7-.78-1.08-1.2-.5z" />
    </svg>
  );
}

// Token-spend gate shown in place of locked content. Telegram-style: an animated
// shimmering blur (purely decorative — the real content is never sent until paid)
// with a frosted «Раскрыть за ⚡ N» pill. Click → spend → router.refresh() reveals.
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
      <div className="relative mx-auto mt-10 min-h-[360px] max-w-xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]">
        {/* Drifting blurred blobs — neutral + a touch of brand, readable on both themes */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="spoiler-blob absolute -left-1/4 -top-1/4 size-[70%] rounded-full bg-[var(--color-text-tertiary)] opacity-30 blur-[55px]"
            style={{ ["--d" as string]: "21s" }}
          />
          <div
            className="spoiler-blob absolute -right-1/5 top-1/4 size-[60%] rounded-full bg-[var(--color-accent-brand)] opacity-[0.18] blur-[60px]"
            style={{ ["--d" as string]: "17s", ["--delay" as string]: "-4s" }}
          />
          <div
            className="spoiler-blob absolute bottom-[-20%] left-1/3 size-[55%] rounded-full bg-[var(--color-text-secondary)] opacity-20 blur-[50px]"
            style={{ ["--d" as string]: "25s", ["--delay" as string]: "-9s" }}
          />
        </div>

        {/* Twinkling starfield */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {DOTS.map((p, i) => (
            <span
              key={i}
              className="spoiler-dot absolute rounded-full bg-[var(--color-text-primary)]"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                ["--d" as string]: `${p.d}s`,
                ["--delay" as string]: `${p.delay}s`,
                ["--o0" as string]: p.o0,
                ["--o1" as string]: p.o1,
              }}
            />
          ))}
        </div>

        {/* Soft centre scrim so the pill + caption stay legible over the shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 42% at 50% 50%, color-mix(in srgb, var(--color-bg-page) 55%, transparent), transparent 70%)" }}
        />

        {/* Centre content */}
        <div className="relative z-10 flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <button
            type="button"
            onClick={unlock}
            disabled={phase === "working"}
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] px-7 py-3.5 text-[17px] font-semibold text-[var(--color-text-primary)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all hover:scale-[1.03] hover:border-[var(--color-text-brand)] disabled:opacity-60"
          >
            {phase === "working" ? (
              "Открываем…"
            ) : !loggedIn ? (
              "Войти и открыть"
            ) : short ? (
              "Пополнить энергию"
            ) : (
              <>
                Раскрыть за
                <Bolt className="text-[var(--color-text-brand)]" />
                <span className="tabular-nums">{cost}</span>
              </>
            )}
          </button>

          <p className="max-w-xs text-footnote text-[var(--color-text-secondary)]">
            {NOUN[type] === "идею" ? WHAT[type] : `Открыть ${NOUN[type]}. ${WHAT[type]}`}
          </p>

          {loggedIn ? (
            <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {short ? (
                <>
                  Не хватает {cost - balance} {tokensWord(cost - balance)} · у тебя {balance}
                </>
              ) : (
                <>
                  Спишется {cost} из {balance} · навсегда
                </>
              )}
            </p>
          ) : (
            <p className="text-caption text-[var(--color-text-tertiary)]">
              За регистрацию дарим {SIGNUP_GRANT} {tokensWord(SIGNUP_GRANT)}
            </p>
          )}

          {phase === "error" && <p className="text-caption text-[#ff6b6b]">Не получилось. Попробуй ещё раз.</p>}
        </div>
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
