"use client";

import { useState } from "react";
import { trackAsoCopy } from "@/lib/track";

export default function CopyText({ value, field, appId, label }: { value: string; field: string; appId: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy_failed");
      }
      setCopied(true);
      trackAsoCopy(field, appId);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard permissions vary between embedded browsers. A synchronous
      // fallback keeps the button useful without exposing the value elsewhere.
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      setCopied(copied);
      if (copied) {
        trackAsoCopy(field, appId);
        window.setTimeout(() => setCopied(false), 1400);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-full border border-[var(--color-border-subtle)] px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
    >
      {copied ? "✓" : label}
    </button>
  );
}
