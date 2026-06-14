"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type Hit = { type: "category" | "app"; name: string; slug: string; sub?: string };

// Header catalog search: debounced query against /api/catalog-search, dropdown
// of category/app hits, click or Enter to navigate. Local data only — instant.
export default function HeaderSearch({ locale = "ru", compact = false }: { locale?: Locale; compact?: boolean }) {
  const ru = locale !== "en";
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/catalog-search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.results || []);
          setActive(0);
        })
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(h: Hit) {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(h.slug);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (!hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = hits[active];
      if (h) go(h);
    }
  }

  const showList = open && q.trim().length >= 2;

  return (
    <div ref={box} className={`relative ${compact ? "w-full" : "w-[260px] lg:w-[320px]"}`}>
      <div className="flex items-center gap-2.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 py-2.5 focus-within:border-[var(--color-border-strong)]">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={ru ? "Поиск приложений и категорий" : "Search apps and categories"}
          className="w-full bg-transparent text-callout text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
        />
      </div>

      {showList && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Ничего не найдено" : "Nothing found"}</p>
          ) : (
            hits.map((h, i) => (
              <button
                key={h.slug}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left ${
                  i === active ? "bg-[var(--color-surface-card-subtle)]" : ""
                }`}
              >
                <span className="rounded-md border border-[var(--color-border-subtle)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  {h.type === "app" ? (ru ? "Прил." : "App") : (ru ? "Кат." : "Cat.")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-footnote font-medium text-[var(--color-text-primary)]">{h.name}</span>
                  {h.sub && <span className="block truncate text-caption text-[var(--color-text-tertiary)]">{h.sub}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
