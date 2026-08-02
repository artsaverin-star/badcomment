"use client";

import { useState } from "react";
import AuthModal from "@/components/AuthModal";
import type { Locale } from "@/lib/i18n";

// Client half of the sign-in bridge: the regular auth modal, and on success a
// hard navigation back to the OAuth consent screen.

export default function ConnectClient({ authorizeUrl, locale }: { authorizeUrl: string; locale: Locale }) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(true);

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <p className="text-footnote text-[var(--color-text-tertiary)]">MCP</p>
      <h1 className="mt-2 text-title1 text-[var(--color-text-primary)]">{ru ? "Подключение агента" : "Connecting your agent"}</h1>
      <p className="mt-4 max-w-[48ch] text-body text-[var(--color-text-secondary)]">
        {ru
          ? "Редактор просит доступ к данным inApp. Войди, и на следующем экране появится кнопка «Разрешить»."
          : "Your editor is asking for access to inApp data. Sign in, and the next screen shows the allow button."}
      </p>
      <button
        type="button"
        onClick={() => setAuth(true)}
        className="mt-8 rounded-full bg-[var(--color-text-primary)] px-7 py-3 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90"
      >
        {ru ? "Войти" : "Sign in"}
      </button>
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.assign(authorizeUrl)} />}
    </main>
  );
}
