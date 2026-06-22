"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { tokensWord, type UnlockType, SIGNUP_GRANT } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

const NOUN_RU: Record<UnlockType, string> = { app: "разбор приложения", idea: "идею", chapter: "главу", category: "категорию целиком", ideas: "все идеи", apps: "все разборы приложений" };
const NOUN_EN: Record<UnlockType, string> = { app: "the app breakdown", idea: "the idea", chapter: "the chapter", category: "the whole category", ideas: "all ideas", apps: "all app teardowns" };
const WHAT_RU: Record<UnlockType, string> = {
  app: "Полный разбор всех отзывов этого приложения.",
  idea: "Готовая идея: отзывы → механики → возможность → продукт.",
  chapter: "Целая глава: выводы, приложения и идеи по этой теме.",
  category: "Весь жанр сразу — синтез, все приложения и все идеи внутри.",
  ideas: "Все идеи ниши сразу — под подтверждённый спрос, с разбором каждой.",
  apps: "Все разборы приложений ниши сразу — сильные и слабые места, цитаты.",
};
const WHAT_EN: Record<UnlockType, string> = {
  app: "The full breakdown of every review for this app.",
  idea: "A ready idea: reviews → mechanics → opportunity → product.",
  chapter: "A whole chapter: conclusions, apps and ideas on this theme.",
  category: "The whole genre at once — synthesis, every app and every idea inside.",
  ideas: "Every idea in the niche at once — backed by demand, each broken down.",
  apps: "Every app teardown in the niche at once — strengths, weak spots, quotes.",
};

// Deterministic «starfield» — computed once at module load so server and client
// markup match (no hydration mismatch, no Math.random). A cheap hash per index
// scatters position, size, twinkle speed/phase and opacity range.
const frac = (x: number) => x - Math.floor(x);
const rng = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453);
const DOTS = Array.from({ length: 240 }, (_, i) => {
  const r = rng(i, 3.17);
  return {
    left: rng(i, 12.9898) * 100,
    top: rng(i, 78.233) * 100,
    size: 0.6 + r * r * 2.4, // bias toward many tiny + a few larger sparks
    d: 2.2 + rng(i, 5.7) * 4,
    delay: rng(i, 9.13) * 5,
    o0: 0.04 + rng(i, 1.31) * 0.1,
    o1: 0.4 + rng(i, 2.61) * 0.55,
    glow: r > 0.86, // the brightest few get a soft halo
  };
});

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
  title,
}: {
  type: UnlockType;
  slug: string;
  cost: number;
  loggedIn: boolean;
  balance: number;
  locale?: Locale;
  title?: string;
}) {
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [phase, setPhase] = useState<"idle" | "working" | "reveal" | "error">("idle");
  const short = loggedIn && balance < cost;
  const ru = locale !== "en";
  const NOUN = ru ? NOUN_RU : NOUN_EN;
  const WHAT = ru ? WHAT_RU : WHAT_EN;

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
      window.setTimeout(() => router.refresh(), 620);
    } catch {
      setPhase("error");
    }
  }

  return (
    <>
      <div
        className={`relative mx-auto mt-10 min-h-[360px] max-w-xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] ${
          phase === "reveal" ? "spoiler-out" : ""
        }`}
      >
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
                boxShadow: p.glow ? "0 0 6px 1px color-mix(in srgb, var(--color-text-primary) 60%, transparent)" : undefined,
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
          {title && (
            <h2 className="mb-1 max-w-md text-[22px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-text-primary)] [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={unlock}
            disabled={phase === "working"}
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] px-7 py-3.5 text-[17px] font-semibold text-[var(--color-text-primary)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all hover:scale-[1.03] hover:border-[var(--color-text-brand)] disabled:opacity-60"
          >
            {phase === "working" ? (
              ru ? "Открываем…" : "Unlocking…"
            ) : !loggedIn ? (
              ru ? "Войти и открыть" : "Sign in to unlock"
            ) : short ? (
              ru ? "Пополнить энергию" : "Top up energy"
            ) : (
              <>
                {ru ? "Раскрыть за" : "Unlock for"}
                <Bolt className="text-[var(--color-text-brand)]" />
                <span className="tabular-nums">{cost}</span>
              </>
            )}
          </button>

          <p className="max-w-xs text-footnote text-[var(--color-text-secondary)]">
            {type === "idea" ? WHAT[type] : ru ? `Открыть ${NOUN[type]}. ${WHAT[type]}` : `Unlock ${NOUN[type]}. ${WHAT[type]}`}
          </p>

          {loggedIn ? (
            <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {short
                ? ru
                  ? `Не хватает ${cost - balance} ${tokensWord(cost - balance)} · у тебя ${balance}`
                  : `Need ${cost - balance} more · you have ${balance}`
                : ru
                  ? `Спишется ${cost} из ${balance} · навсегда`
                  : `Spends ${cost} of ${balance} · forever`}
            </p>
          ) : (
            <p className="text-caption text-[var(--color-text-tertiary)]">
              {ru ? `За регистрацию дарим ${SIGNUP_GRANT} ${tokensWord(SIGNUP_GRANT)}` : `Get ${SIGNUP_GRANT} energy free on signup`}
            </p>
          )}

          {phase === "error" && <p className="text-caption text-[#ff6b6b]">{ru ? "Не получилось. Попробуй ещё раз." : "Something went wrong. Try again."}</p>}
        </div>
      </div>

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => router.refresh()} />}
    </>
  );
}
