"use client";

import { useState } from "react";
import { AppModal, type AppLite } from "./AppLinkedText";
import type { Locale } from "@/lib/i18n";

// The market tile's leader rows, tappable: each opens the same app card
// (verdict, screenshots, strong/weak) the rating list and prose links use.
export default function LeaderRows({ rows, locale = "ru" }: { rows: { app: AppLite; meta: string }[]; locale?: Locale }) {
  const ru = locale !== "en";
  const [open, setOpen] = useState<AppLite | null>(null);
  return (
    <span className="flex flex-col gap-1">
      {rows.map(({ app, meta }) => (
        <button
          key={app.id}
          type="button"
          onClick={() => setOpen(app)}
          className="group/l -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-bg-muted)]"
        >
          {app.icon
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-9 shrink-0 rounded-[10px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
            : <span className="size-9 shrink-0 rounded-[10px] bg-[var(--color-bg-muted)]" />}
          <span className="min-w-0 flex-1 truncate text-callout font-medium text-[var(--color-text-primary)]">{app.title}</span>
          <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{meta}</span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] opacity-0 transition-opacity group-hover/l:opacity-100"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ))}
      {open && <AppModal app={open} ru={ru} onClose={() => setOpen(null)} />}
    </span>
  );
}
