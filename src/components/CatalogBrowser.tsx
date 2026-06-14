"use client";

import { useState } from "react";
import Link from "next/link";

export type BrowseApp = { name: string; icon: string | null };
export type BrowseAppItem = { name: string; icon: string | null; slug: string };
export type BrowseCategory = {
  slug: string;
  name: string;
  appsCount: number;
  apps: BrowseApp[];
  live: boolean; // synthesis published (≥10 разборов)
  free: boolean; // free for everyone (the flagship set)
  locked: boolean; // live but premium-gated for this viewer
};
export type BrowseDomain = { slug: string; name: string; categories: BrowseCategory[] };

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}

export default function CatalogBrowser({
  domains,
  apps = [],
}: {
  domains: BrowseDomain[];
  premium?: boolean;
  apps?: BrowseAppItem[];
}) {
  const [view, setView] = useState<"cats" | "apps">("cats");
  const hasApps = apps.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasApps && (
        <div className="relative flex w-[260px] self-center rounded-full bg-[var(--color-bg-muted)] p-1 sm:self-start">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--color-surface-card)] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${view === "apps" ? "100%" : "0"})` }}
          />
          {(["cats", "apps"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`relative z-10 flex-1 rounded-full py-2 text-footnote font-semibold transition-colors ${
                view === v ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {v === "cats" ? "Категории" : "Приложения"}
            </button>
          ))}
        </div>
      )}

      {view === "apps" && hasApps ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <Link
              key={a.slug}
              href={`/${a.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-card-subtle)]"
            >
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" className="size-9 shrink-0 rounded-[11px] object-cover" />
              ) : (
                <div className="size-9 shrink-0 rounded-[11px] bg-[var(--color-bg-muted)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-callout font-medium text-[var(--color-text-primary)]">{a.name}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {domains.map((d) => (
            <section key={d.slug} className="flex flex-col gap-3">
              <h2 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{d.name}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.categories.map((c) => (
                  <CategoryCard key={c.slug} cat={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ kind }: { kind: "free" | "premium" | "soon" }) {
  const map = {
    free: { label: "Бесплатно", cls: "bg-[color-mix(in_srgb,#30d158_18%,transparent)] text-[#4ade80]" },
    premium: { label: "Премиум", cls: "bg-[var(--color-accent-brand-subtle)] text-[var(--color-text-brand)]" },
    soon: { label: "Скоро", cls: "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]" },
  }[kind];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map.cls}`}>{map.label}</span>
  );
}

function CategoryCard({ cat }: { cat: BrowseCategory }) {
  const icons = cat.apps.filter((a) => a.icon).slice(0, 4);
  const dim = !cat.live; // «Скоро» categories are greyscale
  const status: "free" | "premium" | "soon" = !cat.live ? "soon" : cat.free ? "free" : "premium";
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate text-callout font-semibold ${dim ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"}`}>
          {cat.name}
        </span>
        <span className="flex items-center gap-2">
          <StatusBadge kind={status} />
          {cat.live && (
            <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
              {cat.appsCount} {appsWord(cat.appsCount)}
            </span>
          )}
        </span>
      </span>
      <div className="flex shrink-0 -space-x-2">
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon ?? ""}
            alt=""
            className={`size-9 rounded-[11px] object-cover ring-2 ring-[var(--color-surface-card)] ${dim ? "opacity-40 grayscale" : ""}`}
          />
        ))}
      </div>
    </>
  );

  const shell = "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors";

  if (!cat.live) {
    return <div className={`${shell} border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]`}>{body}</div>;
  }
  return (
    <Link
      href={`/segment/${cat.slug}`}
      className={`${shell} bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-card-subtle)] ${
        cat.free ? "free-card" : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      {body}
    </Link>
  );
}
