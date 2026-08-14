"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { trackAsoAuditStart } from "@/lib/track";

export default function AsoForm({ locale, initialValue }: { locale: Locale; initialValue: string }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const [value, setValue] = useState(initialValue);

  return (
    <form
      action={`${lp}/aso`}
      method="get"
      onSubmit={() => trackAsoAuditStart(value.includes("6798765545") ? "roomdo_sample" : "app_store_url")}
      className="mx-auto mt-7 flex w-full max-w-[720px] flex-col gap-2 sm:flex-row"
    >
      <label className="sr-only" htmlFor="aso-app-url">{ru ? "Ссылка на приложение в App Store" : "App Store app URL"}</label>
      <input
        id="aso-app-url"
        name="app"
        type="text"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://apps.apple.com/app/id…"
        className="min-w-0 flex-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-5 py-3.5 text-body text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-border-strong)]"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3.5 text-body font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
      >
        {ru ? "Разобрать" : "Audit"}
      </button>
    </form>
  );
}
