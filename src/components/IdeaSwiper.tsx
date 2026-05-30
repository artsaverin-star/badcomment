"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { IdeaCard } from "@/lib/queries";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };
const COMPLEXITY_STYLE: Record<string, string> = {
  Low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

type Saved = { id: string; name: string; icon: string | null; demandLabel: string };
const STORAGE_KEY = "badcomment:saved-ideas";

function loadSaved(): Saved[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function IdeaSwiper({ cards }: { cards: IdeaCard[] }) {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => setSaved(loadSaved()), []);

  const persist = (next: Saved[]) => {
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const current = cards[index];

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
    setDrag(0);
    setLeaving(null);
    startX.current = null;
  }, []);

  const decide = useCallback(
    (dir: "left" | "right") => {
      if (!current || leaving) return;
      if (dir === "right") {
        const next = [
          { id: current.id, name: current.name, icon: current.icon, demandLabel: current.demandLabel },
          ...loadSaved().filter((s) => s.id !== current.id),
        ];
        persist(next);
      }
      setLeaving(dir);
      setTimeout(advance, 240);
    },
    [current, leaving, advance]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showSaved) return;
      if (e.key === "ArrowRight") decide("right");
      if (e.key === "ArrowLeft") decide("left");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, showSaved]);

  function onPointerDown(e: React.PointerEvent) {
    if (leaving) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current == null) return;
    if (drag > 120) decide("right");
    else if (drag < -120) decide("left");
    else setDrag(0);
    startX.current = null;
  }

  function removeSaved(id: string) {
    persist(loadSaved().filter((s) => s.id !== id));
  }

  const deckDone = index >= cards.length;
  const offset = leaving === "right" ? 600 : leaving === "left" ? -600 : drag;
  const rotation = offset / 25;
  const intent = offset > 60 ? "right" : offset < -60 ? "left" : null;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex w-full max-w-md items-center justify-between text-sm text-neutral-500">
        <span>
          {deckDone ? `${cards.length} reviewed` : `${index + 1} / ${cards.length}`}
        </span>
        <button
          onClick={() => setShowSaved((v) => !v)}
          className="rounded-full bg-black/5 px-3 py-1 font-medium hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
        >
          {showSaved ? "Back to deck" : `Saved ${saved.length}`}
        </button>
      </div>

      {showSaved ? (
        <div className="w-full max-w-md">
          {saved.length === 0 ? (
            <p className="text-center text-sm text-neutral-500">
              No saved ideas yet. Swipe right on the ones worth building.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {saved.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-900"
                >
                  {s.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.icon} alt="" className="h-10 w-10 rounded-lg" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-black/10 dark:bg-white/10" />
                  )}
                  <Link href={`/product/${s.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-sm text-neutral-500">{s.demandLabel}</p>
                  </Link>
                  <button
                    onClick={() => removeSaved(s.id)}
                    className="shrink-0 text-sm text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : deckDone ? (
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center dark:border-white/10 dark:bg-neutral-900">
          <p className="text-lg font-semibold">That&apos;s the whole deck.</p>
          <p className="mt-2 text-sm text-neutral-500">
            You saved {saved.length} idea{saved.length === 1 ? "" : "s"}. Open “Saved” to revisit them.
          </p>
        </div>
      ) : (
        <div className="relative h-[30rem] w-full max-w-md select-none">
          {cards[index + 1] && (
            <Card card={cards[index + 1]} className="absolute inset-0 scale-95 opacity-60" />
          )}
          {current && (
            <Card
              card={current}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              intent={intent}
              className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
              style={{
                transform: `translateX(${offset}px) rotate(${rotation}deg)`,
                transition: startX.current == null ? "transform 0.24s ease-out" : "none",
              }}
            />
          )}
        </div>
      )}

      {!showSaved && !deckDone && (
        <div className="mt-6 flex items-center gap-6">
          <button
            onClick={() => decide("left")}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-black/15 text-2xl text-neutral-500 transition hover:border-neutral-400 dark:border-white/15"
            aria-label="Skip"
          >
            ✕
          </button>
          <button
            onClick={() => decide("right")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-2xl text-white transition hover:bg-red-700"
            aria-label="Save idea"
          >
            ♥
          </button>
        </div>
      )}
      {!showSaved && !deckDone && (
        <p className="mt-3 text-xs text-neutral-400">
          Drag, tap the buttons, or use ← / → arrows
        </p>
      )}
    </div>
  );
}

function Card({
  card,
  className = "",
  style,
  intent,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  card: IdeaCard;
  className?: string;
  style?: React.CSSProperties;
  intent?: "left" | "right" | null;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={style}
      className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 ${className}`}
    >
      {intent && (
        <span
          className={`absolute right-4 top-4 rounded-md border-2 px-3 py-1 text-lg font-bold uppercase ${
            intent === "right"
              ? "border-green-500 text-green-500"
              : "border-neutral-400 text-neutral-400"
          }`}
        >
          {intent === "right" ? "Build" : "Skip"}
        </span>
      )}

      <div className="flex items-center gap-3">
        {card.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.icon} alt="" className="h-14 w-14 rounded-xl" draggable={false} />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-black/10 dark:bg-white/10" />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{card.name}</p>
          <p className="truncate text-sm text-neutral-500">{card.demandLabel}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${COMPLEXITY_STYLE[card.complexityLabel]}`}>
          {card.complexityLabel} complexity
        </span>
        {card.stores.map((s) => (
          <span key={s} className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
            {STORE_LABEL[s]}
          </span>
        ))}
        <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
          {card.negativeCount} complaints
        </span>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
          Why build it
        </p>
        {card.pros.length > 0 ? (
          <div className="mb-1 flex flex-wrap gap-1">
            {card.pros.map((p) => (
              <span
                key={p.key}
                className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300"
              >
                {p.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Proven demand — {card.demandLabel}. An engaged user base already exists.
          </p>
        )}
        {card.proQuote && (
          <p className="mt-1 text-sm italic text-neutral-500">“{card.proQuote}”</p>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
          What to improve
        </p>
        <div className="mb-1 flex flex-wrap gap-1">
          {card.cons.map((c) => (
            <span
              key={c.key}
              className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {c.label} · {c.count}
            </span>
          ))}
        </div>
        {card.conQuote && (
          <p className="mt-1 text-sm italic text-neutral-500">“{card.conQuote}”</p>
        )}
      </div>

      <Link
        href={`/product/${card.id}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-auto text-sm text-neutral-400 hover:text-red-600 hover:underline"
      >
        See all reviews →
      </Link>
    </div>
  );
}
