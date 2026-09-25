"use client";

import { useEffect, useRef, useState } from "react";
import { useWeb } from "@/site/i18n/client";
import { CheckIcon, CopyIcon, toast } from "@/site/ui";
import type { McpStrings } from "./strings";

// One line of code (a command, a URL, a JSON snippet) on a surface box with an icon-only copy
// button (44 × 44, secondary glyph). The line scrolls sideways when it is longer than the
// column (focusable, so the keyboard can scroll it too).

export function CopyLine({ value }: { value: string }) {
  const s = useWeb<McpStrings>("mcp");
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDone(false), 1800);
    } catch {
      toast(s.copyFailed, { tone: "error" });
    }
  };

  return (
    <div className="ia-mcp-code">
      <code tabIndex={0}>{value}</code>
      <button
        type="button"
        className="ia-mcp-code__copy"
        data-done={done || undefined}
        aria-label={s.copy}
        title={s.copy}
        onClick={() => void copy()}
      >
        {done ? <CheckIcon size={18} strokeWidth={2.4} aria-hidden="true" /> : <CopyIcon size={18} strokeWidth={2} aria-hidden="true" />}
      </button>
      <span className="sr-only" role="status">
        {done ? s.copied : ""}
      </span>
    </div>
  );
}
