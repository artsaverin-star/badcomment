"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

// Deterministic compact starfield for the locked-idea shimmer (module-level so
// SSR markup is stable, no Math.random).
const frac = (x: number) => x - Math.floor(x);
const rng = (i: number, s: number) => frac(Math.sin((i + 1) * s) * 43758.5453);
const DOTS = Array.from({ length: 46 }, (_, i) => {
  const r = rng(i, 3.17);
  return {
    left: rng(i, 12.9898) * 100,
    top: rng(i, 78.233) * 100,
    size: 0.6 + r * r * 2,
    d: 2.2 + rng(i, 5.7) * 3.6,
    delay: rng(i, 9.13) * 5,
    o0: 0.05 + rng(i, 1.31) * 0.12,
    o1: 0.4 + rng(i, 2.61) * 0.5,
  };
});

export type IdeaCard = {
  slug: string;
  category: string;
  categoryName: string;
  domain: string;
  domainName: string;
  title: string;
  oneLiner: string;
  stats: { apps: number; reviews: number; observations: number };
  locked?: boolean;
};

// Small line icon per domain (icon filter pills). Falls back to a grid glyph.
function DomainIcon({ slug }: { slug: string }) {
  const p: Record<string, React.ReactNode> = {
    "sleep-meditation": <path d="M14 9.5A5.5 5.5 0 0 1 7 3a5.5 5.5 0 1 0 6.8 6.6Z" />,
    "mind-self-help": <path d="M3 9a4 4 0 0 1 5-3.9A4 4 0 0 1 13 9c0 2.5-3 4-5 6-2-2-5-3.5-5-6Z" />,
    "women-family": <path d="M8 10.5 3.2 6a3 3 0 0 1 4.3-4.2l.5.5.5-.5A3 3 0 0 1 12.8 6L8 10.5Z" />,
    "fitness-nutrition": <path d="M8 1.5c1 2 3 3 3 5.5A3 3 0 1 1 5 7c0-2.5 2-3.5 3-5.5Z" />,
    learning: <path d="M8 2 1.5 5 8 8l6.5-3L8 2Zm-4 5v3.5c0 1 1.8 2 4 2s4-1 4-2V7" />,
    productivity: <path d="m3 8 3 3 6.5-7" />,
    "reading-podcasts": <path d="M8 3.5C6.5 2.5 4 2.5 2 3v9c2-.5 4.5-.5 6 .5 1.5-1 4-1 6-.5V3c-2-.5-4.5-.5-6 .5v9" />,
    "media-streaming": <path d="M5.5 3.5v9l7-4.5-7-4.5Z" />,
    "photo-video": <path d="M2 5.5h2l1-1.5h6l1 1.5h2v8H2v-8Zm6 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />,
    "ai-tools": <path d="M8 1.5 9.3 6 14 7.3 9.3 8.6 8 13l-1.3-4.4L2 7.3 6.7 6 8 1.5Z" />,
    "travel-places": <path d="M8 1.8a4.2 4.2 0 0 0-4.2 4.2c0 3 4.2 8 4.2 8s4.2-5 4.2-8A4.2 4.2 0 0 0 8 1.8Zm0 5.7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />,
    money: <path d="M2.5 4.5h11v7h-11v-7Zm5.5 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />,
    "hobbies-lifestyle": <path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6 4.2 13.6l.7-4.3-3.1-3 4.3-.6L8 1.8Z" />,
  };
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {p[slug] ?? <path d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z" />}
    </svg>
  );
}

// A locked idea card: TG-style shimmer blur that links to the niche page, where
// the whole category (or the deck) is unlocked in one purchase.
function LockedIdeaCard({ idea, ru }: { idea: IdeaCard; ru: boolean }) {
  return (
    <Link
      href={`/segment/${idea.category}`}
      className="relative flex min-h-[168px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="spoiler-blob absolute -left-1/4 -top-1/4 size-[70%] rounded-full bg-[var(--color-text-tertiary)] opacity-25 blur-[40px]" style={{ ["--d" as string]: "20s" }} />
        <div className="spoiler-blob absolute -right-1/5 bottom-0 size-[60%] rounded-full bg-[var(--color-accent-brand)] opacity-[0.14] blur-[44px]" style={{ ["--d" as string]: "16s", ["--delay" as string]: "-5s" }} />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {DOTS.map((p, i) => (
          <span key={i} className="spoiler-dot absolute rounded-full bg-[var(--color-text-primary)]" style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}px`, height: `${p.size}px`, ["--d" as string]: `${p.d}s`, ["--delay" as string]: `${p.delay}s`, ["--o0" as string]: p.o0, ["--o1" as string]: p.o1 }} />
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 55%, color-mix(in srgb, var(--color-bg-page) 45%, transparent), transparent 72%)" }} />

      <div className="relative z-10 flex flex-1 flex-col gap-2 p-5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
          <DomainIcon slug={idea.domain} />
          {idea.categoryName}
        </span>
        <div className="flex flex-1 flex-col items-start justify-center gap-1.5 py-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] px-4 py-2.5 text-callout font-semibold text-[var(--color-text-primary)] backdrop-blur-md">
            {ru ? "Открыть в разборе ниши" : "Open inside the niche"}
          </span>
          <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Название и суть идеи — внутри разбора" : "Name and gist — inside the breakdown"}</p>
        </div>
        <div className="text-caption text-[var(--color-text-tertiary)]">
          {idea.stats.apps} {ru ? "приложений" : "apps"} · {idea.stats.reviews.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"} ·{" "}
          {idea.stats.observations.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "наблюдений" : "observations"}
        </div>
      </div>
    </Link>
  );
}

// Ideas index browser: icon filter pills by domain (collapsed behind a button).
export default function IdeasBrowser({
  ideas,
  locale = "ru",
}: {
  ideas: IdeaCard[];
  loggedIn?: boolean;
  locale?: Locale;
}) {
  const ru = locale !== "en";
  const [domain, setDomain] = useState("all");
  const [open, setOpen] = useState(false);

  const domains = useMemo(() => {
    const m = new Map<string, string>();
    ideas.forEach((i) => m.set(i.domain, i.domainName));
    return [...m.entries()];
  }, [ideas]);

  const currentLabel = domain === "all" ? (ru ? "Все категории" : "All categories") : domains.find(([s]) => s === domain)?.[1] ?? (ru ? "Все категории" : "All categories");

  const filtered = ideas.filter((i) => domain === "all" || i.domain === domain);

  const pillBase = "flex items-center gap-2 rounded-full border px-3.5 py-2 text-footnote font-semibold transition-colors";
  const pillClass = (active: boolean) =>
    `${pillBase} ${active ? "border-transparent bg-[var(--color-text-primary)] text-[var(--color-bg-page)]" : "border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`;

  return (
    <div>
      <div className="mb-8">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)]">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 4h12M4.5 8h7M6.5 12h3" />
          </svg>
          {ru ? "Фильтры" : "Filters"}
          <span className="text-[var(--color-text-tertiary)]">· {currentLabel}</span>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>

        {open && (
          <div className="rev-in mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setDomain("all"); setOpen(false); }} className={pillClass(domain === "all")}>
              {ru ? "Все" : "All"}
            </button>
            {domains.map(([slug, name]) => (
              <button key={slug} type="button" onClick={() => { setDomain(slug); setOpen(false); }} className={pillClass(domain === slug)}>
                <DomainIcon slug={slug} />
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-callout text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено." : "Nothing found."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((idea) =>
            idea.locked ? (
              <LockedIdeaCard key={idea.slug} idea={idea} ru={ru} />
            ) : (
              <Link key={idea.slug} href={`/ideas/${idea.slug}`} className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-border-strong)]">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  <DomainIcon slug={idea.domain} />
                  {idea.categoryName}
                </span>
                <div className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">{idea.title}</div>
                <p className="text-callout text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
                <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                  {idea.stats.apps} {ru ? "приложений" : "apps"} · {idea.stats.reviews.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"} ·{" "}
                  {idea.stats.observations.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "наблюдений" : "observations"}
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
