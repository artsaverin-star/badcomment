"use client";

import { useState } from "react";

// A copyable line of setup text. Monospace, one tap to clipboard, quiet
// confirmation in place of the label.

export default function CopyLine({
  value,
  label,
  mask = false,
  ru,
}: {
  value: string;
  label?: string;
  mask?: boolean;
  ru: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!mask);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the text is selectable anyway */
    }
  };

  const display = shown ? value : value.slice(0, 10) + "•".repeat(18);

  return (
    <div>
      {label && <p className="mb-1.5 text-caption text-[var(--color-text-tertiary)]">{label}</p>}
      <div className="flex items-stretch gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-1.5">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-2.5 py-2 font-mono text-footnote text-[var(--color-text-primary)]">
          {display}
        </code>
        {mask && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            className="shrink-0 rounded-xl px-3 text-caption text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            {shown ? (ru ? "скрыть" : "hide") : ru ? "показать" : "show"}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-xl bg-[var(--color-text-primary)] px-3.5 text-caption font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-85"
        >
          {copied ? (ru ? "скопировано" : "copied") : ru ? "копировать" : "copy"}
        </button>
      </div>
    </div>
  );
}
