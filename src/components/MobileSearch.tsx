"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type Hit = { type: "category" | "app"; name: string; slug: string; sub?: string; icon?: string | null };

// Full-page catalog search (mobile «Поиск» tab). Same data source as the header
// search, but a full results list instead of a dropdown.
export default function MobileSearch({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/catalog-search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setHits(d.results || []))
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div>
      <div className="flex h-12 items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 focus-within:border-[var(--color-border-strong)]">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ru ? "Поиск приложений и категорий" : "Search apps and categories"}
          className="w-full bg-transparent text-callout text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
        />
      </div>

      <div className="mt-4 flex flex-col">
        {q.trim().length < 2 ? null : hits.length === 0 ? (
          <p className="py-10 text-center text-callout text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено" : "Nothing found"}</p>
        ) : (
          hits.map((h) => (
            <button
              key={h.slug}
              type="button"
              onClick={() => router.push(h.slug)}
              className="flex items-center gap-3 border-t border-[var(--color-border-subtle)] py-3 text-left first:border-t-0"
            >
              {h.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.icon} alt="" className="size-10 shrink-0 rounded-[11px] object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[var(--color-bg-muted)] text-caption text-[var(--color-text-tertiary)]">
                  {h.type === "app" ? "▦" : "#"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-callout font-medium text-[var(--color-text-primary)]">{h.name}</span>
                {h.sub && <span className="block truncate text-caption text-[var(--color-text-tertiary)]">{h.sub}</span>}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
