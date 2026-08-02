"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PolarityBar, { POLARITY_COLOR } from "./PolarityBar";

// The niche index: one row per app, sorted by how many reviews we read. The row
// is a preview of the breakdown — icon, count, the love/pain split and the three
// loudest themes — so people pick an app knowing what's inside it.

type Theme = { name: string; nameEn: string; polarity: "love" | "pain" | "mixed"; count: number };
type App = {
  id: string;
  title: string;
  total: number;
  icon?: string;
  themes: Theme[];
  split: { lovePct: number; painPct: number; mixedPct: number };
};

export default function NicheAppList({ slug, apps, ru }: { slug: string; apps: App[]; ru: boolean }) {
  const [q, setQ] = useState("");
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return apps;
    return apps.filter(
      (a) => a.title.toLowerCase().includes(s) || a.themes.some((t) => (ru ? t.name : t.nameEn).toLowerCase().includes(s)),
    );
  }, [q, apps, ru]);

  return (
    <>
      <div className="sticky top-[4.5rem] z-10 -mx-4 mb-4 bg-[color-mix(in_srgb,var(--color-bg-page)_86%,transparent)] px-4 py-2 backdrop-blur-xl">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ru ? "приложение или тема" : "app or theme"}
          className="w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-2.5 text-footnote text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
        />
      </div>

      {shown.length === 0 && (
        <p className="py-8 text-body text-[var(--color-text-tertiary)]">{ru ? "Ничего не нашлось." : "Nothing found."}</p>
      )}

      <ol className="flex flex-col gap-2.5">
        {shown.map((a) => (
          <li key={a.id}>
            <Link href={`${lp}/reviews/${slug}/${a.id}`} className="card-min flex gap-3.5 rounded-3xl px-4 py-3.5 sm:px-5">
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" width={52} height={52} loading="lazy" className="size-13 shrink-0 rounded-[13px] border border-[var(--color-border-subtle)]" />
              ) : (
                <div className="size-13 shrink-0 rounded-[13px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-subhead text-[var(--color-text-primary)]">{a.title}</span>
                  <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                    {a.total.toLocaleString(lc)} {ru ? "отзывов" : "reviews"}
                  </span>
                </div>

                <PolarityBar split={a.split} className="mt-2" height={3} />

                <p className="mt-2 truncate text-caption text-[var(--color-text-tertiary)]">
                  {a.themes.slice(0, 3).map((t, i) => (
                    <span key={t.name}>
                      {i > 0 && <span className="opacity-40"> · </span>}
                      <span className="mr-1 inline-block size-1.5 rounded-full align-middle" style={{ backgroundColor: POLARITY_COLOR[t.polarity] }} />
                      {ru ? t.name : t.nameEn}
                      <span className="tabular-nums opacity-70"> {t.count}</span>
                    </span>
                  ))}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
