"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

export type LandingApp = { name: string; icon: string; slug?: string | null };

// Marketing landing for logged-out visitors: animated hero with a salute of
// drifting app icons + a scrolling brand marquee. Original code in the app's
// own dark theme.
export default function Landing({
  apps,
  locale = "ru",
}: {
  apps: LandingApp[];
  locale?: Locale;
}) {
  const ru = locale !== "en";
  const [modal, setModal] = useState(false);

  // Re-shuffle on the client each mount so the icon salute differs every load
  // (server stays deterministic; rAF keeps setState out of the effect body).
  const [shuffled, setShuffled] = useState<LandingApp[]>(apps);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const arr = apps.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      setShuffled(arr);
    });
    return () => cancelAnimationFrame(id);
  }, [apps]);

  const withIcon = shuffled.filter((a) => a.icon);
  // A scattered "salute" of icons around the hero (the set is shuffled per load).
  const positions = [
    "left-[3%] top-[6%]", "right-[5%] top-[9%]", "left-[11%] top-[33%]", "right-[8%] top-[30%]",
    "left-[1%] bottom-[18%]", "right-[2%] bottom-[20%]", "left-[20%] top-[2%]", "right-[22%] bottom-[5%]",
    "left-[31%] bottom-[1%]", "right-[31%] top-[3%]", "left-[16%] bottom-[3%]", "right-[13%] bottom-[8%]",
    "left-[41%] top-[0%]", "right-[43%] bottom-[1%]",
  ];
  const sizes = ["size-12 lg:size-14", "size-11 lg:size-12", "size-14 lg:size-16"];
  const floats = withIcon.slice(0, positions.length);
  // Cap the marquee — with hundreds of icons the row is enormous and scrolls
  // visually fast even at a long duration. A short, fixed set drifts slowly.
  const marqueeApps = withIcon.slice(0, 18);
  const marquee = [...marqueeApps, ...marqueeApps];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {floats.map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={a.icon}
              alt=""
              className={`ld-float absolute hidden rounded-[14px] opacity-80 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85)] sm:block ${sizes[i % sizes.length]} ${positions[i]}`}
              style={{ ["--d" as string]: `${4.5 + (i % 5) * 0.7}s`, ["--r" as string]: `${(i % 2 ? 7 : -7)}deg`, animationDelay: `${(i % 6) * 0.25}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="ld-fade text-[40px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[60px]" style={{ animationDelay: "0.05s" }}>
            {ru ? (
              <>Тысячи отзывов<br />в готовые выводы</>
            ) : (
              <>Thousands of reviews<br />into clear conclusions</>
            )}
          </h1>

          <p className="ld-fade mx-auto mt-5 max-w-xl text-lead text-[var(--color-text-secondary)]" style={{ animationDelay: "0.1s" }}>
            {ru
              ? "Читаем отзывы 1–5★ по приложениям и собираем их в готовые выводы: что пользователи хвалят, на что злятся и какие продукты стоит строить."
              : "We read 1–5★ reviews across apps and turn them into clear conclusions: what users love, hate, and which products are worth building."}
          </p>

          <div className="ld-fade mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.15s" }}>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
            >
              {ru ? "Начать бесплатно" : "Start free"}
            </button>
            <Link
              href="/premium"
              className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-3 text-callout font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              {ru ? "Тарифы →" : "Pricing →"}
            </Link>
          </div>
        </div>
      </section>

      {/* Brand marquee */}
      {withIcon.length > 6 && (
        <section className="relative overflow-hidden py-6 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="ld-marquee flex w-max gap-3" style={{ ["--mq" as string]: "120s" }}>
            {marquee.map((a, i) => {
              const inner = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.icon} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-footnote font-semibold text-[var(--color-text-primary)]">{a.name}</span>
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">{ru ? "500 отзывов" : "500 reviews"}</span>
                  </span>
                </>
              );
              const cls =
                "flex shrink-0 items-center gap-3 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-2 pl-2 pr-5 transition-colors hover:border-[var(--color-border-strong)]";
              return a.slug ? (
                <Link key={i} href={`/${a.slug}`} className={cls}>
                  {inner}
                </Link>
              ) : (
                <span key={i} className={cls}>
                  {inner}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {modal && <AuthModal locale={locale} onClose={() => setModal(false)} onSuccess={() => location.reload()} />}
    </div>
  );
}
