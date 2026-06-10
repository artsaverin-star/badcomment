"use client";

import { Children, useState, type ReactNode } from "react";

// Thin client wrapper for the model-comparison experiment page. Each panel is
// server-rendered (so the i18n dict with its functions never crosses the
// boundary) and passed in as children; this component only switches which one
// is visible and renders the per-variant metrics strip.

export type VariantMeta = {
  label: string;
  model: string;
  reviews: number;
  mechanisms: number;
  themes: number;
  extractedObs: number | null;
  relCost: string;
};

function Metrics({ m }: { m: VariantMeta }) {
  const cell = (label: string, value: string) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      <span className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
  return (
    <div className="mb-10 grid grid-cols-2 gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-4 sm:grid-cols-6">
      {cell("Extract", m.model)}
      {cell("Отзывов", String(m.reviews))}
      {cell("Наблюдений", m.extractedObs != null ? String(m.extractedObs) : "—")}
      {cell("Механизмов", String(m.mechanisms))}
      {cell("Тем", String(m.themes))}
      {cell("Цена extract", m.relCost)}
    </div>
  );
}

export default function ExperimentTabs({ variants, children }: { variants: VariantMeta[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const panels = Children.toArray(children);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {variants.map((v, i) => (
          <button
            key={v.label}
            type="button"
            onClick={() => setActive(i)}
            className={
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
              (i === active
                ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-bg-base)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]")
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      <Metrics m={variants[active]} />
      {panels[active]}
    </div>
  );
}
