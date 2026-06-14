"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {p[slug] ?? <path d="M2.5 2.5h4v4h-4zM9.5 2.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z" />}
    </svg>
  );
}

// Ideas index browser: icon filter pills by domain (no search box).
export default function IdeasBrowser({ ideas }: { ideas: IdeaCard[] }) {
  const [domain, setDomain] = useState("all");

  const domains = useMemo(() => {
    const m = new Map<string, string>();
    ideas.forEach((i) => m.set(i.domain, i.domainName));
    return [...m.entries()];
  }, [ideas]);

  const filtered = domain === "all" ? ideas : ideas.filter((i) => i.domain === domain);

  const pillBase =
    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-footnote font-semibold transition-colors";
  const pillClass = (active: boolean) =>
    `${pillBase} ${
      active
        ? "border-transparent bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
        : "border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
    }`;

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        <button type="button" onClick={() => setDomain("all")} className={pillClass(domain === "all")}>
          Все
        </button>
        {domains.map(([slug, name]) => (
          <button key={slug} type="button" onClick={() => setDomain(slug)} className={pillClass(domain === slug)}>
            <DomainIcon slug={slug} />
            {name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-callout text-[var(--color-text-tertiary)]">Ничего не найдено.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((idea) => (
            <Link
              key={idea.slug}
              href={idea.locked ? "/premium" : `/ideas/${idea.slug}`}
              className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-border-strong)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">
                  <DomainIcon slug={idea.domain} />
                  {idea.categoryName}
                </span>
                {idea.locked && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-accent-brand-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-brand)]">
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                    Премиум
                  </span>
                )}
              </div>
              <div className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
                {idea.title}
              </div>
              <p className="text-callout text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
              <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                {idea.stats.apps} приложений · {idea.stats.reviews.toLocaleString("ru-RU")} отзывов ·{" "}
                {idea.stats.observations.toLocaleString("ru-RU")} наблюдений
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
