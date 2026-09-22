"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@/site/ui/icons";

// Tiny client islands of the landing. Everything else is server-rendered HTML.

/**
 * S7 on phones: the 35-topic grid starts collapsed to 9 cards (spec 08 S7); CSS hides the rest
 * below 760 px until «Показать все 35» is pressed. Wider screens always show all 35.
 */
export function ExpandableGrid({ more, children }: { more: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="ld-expand" data-expanded={open || undefined}>
      {children}
      {open ? null : (
        <button
          type="button"
          className="ld-expand__more"
          onClick={() => {
            setOpen(true);
            // Move focus to the first card that just appeared.
            requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>("li:nth-child(10) a")?.focus());
          }}
        >
          {more}
        </button>
      )}
    </div>
  );
}

/**
 * Mobile sticky bar «Открыть веб-версию» once the hero CTAs have scrolled away, hidden again
 * from the final CTA band down (spec 08 §7). Hidden ≥ 1024 px by CSS.
 */
export function StickyCta({ href, label, after, until }: { href: string; label: string; after: string; until: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const start = document.getElementById(after);
    const end = document.getElementById(until);
    if (!start || typeof IntersectionObserver === "undefined") return;
    let past = false;
    let atEnd = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === start) past = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === end) atEnd = e.isIntersecting || e.boundingClientRect.top < 0;
      }
      setShown(past && !atEnd);
    });
    io.observe(start);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, [after, until]);

  // While the bar covers the bottom of the viewport, keyboard focus must not scroll under it
  // (WCAG 2.4.11; a11y review M3). The bar exists below 1024 px only.
  useEffect(() => {
    if (!shown || !window.matchMedia("(max-width: 1023.98px)").matches) return;
    const root = document.documentElement;
    const before = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = "calc(80px + env(safe-area-inset-bottom))";
    return () => {
      root.style.scrollPaddingBottom = before;
    };
  }, [shown]);

  return (
    <div className="ld-sticky" data-shown={shown || undefined} inert={!shown}>
      <Link href={href} className="ia-btn ia-btn--welcome ld-sticky__btn" data-ld-event="landing_cta_web_sticky">
        {label}
        <ArrowRightIcon size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}

type Analytics = {
  gtag?: (...args: unknown[]) => void;
  ym?: (...args: unknown[]) => void;
};

/**
 * Landing funnel events (spec 08 §7) without turning links into client components: one
 * delegated listener sends `data-ld-event` (+ `data-ld-slug`) to GA4 and Yandex Metrica.
 * Every event carries site: "v2" (spec 09 §2.4).
 */
export function LandingAnalytics() {
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest?.("[data-ld-event]");
      const name = el?.getAttribute("data-ld-event");
      if (!el || !name) return;
      const slug = el.getAttribute("data-ld-slug");
      const params: Record<string, string> = { site: "v2", surface: "landing" };
      if (slug) params.slug = slug;
      const w = window as unknown as Analytics;
      try {
        w.gtag?.("event", name, params);
        w.ym?.(110047715, "reachGoal", name, params);
      } catch {
        // analytics must never break navigation
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
