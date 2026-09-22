"use client";

import { useState } from "react";

export type McpConnectionView = {
  id: string;
  clientName: string;
  redirectUri: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export default function McpConnections({ initial, ru }: { initial: McpConnectionView[]; ru: boolean }) {
  const [connections, setConnections] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const active = connections.filter((connection) => !connection.revokedAt);

  const disconnect = async (id: string) => {
    setBusy(id);
    const response = await fetch("/api/mcp/connections", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
    if (response?.ok) {
      setConnections((current) =>
        current.map((connection) =>
          connection.id === id ? { ...connection, revokedAt: new Date().toISOString() } : connection,
        ),
      );
    }
    setBusy(null);
  };

  if (!active.length) {
    return (
      <p className="max-w-[62ch] text-callout text-[var(--color-text-secondary)]">
        {ru
          ? "Пока нет активных подключений. Добавь сервер по инструкции ниже — после входа клиент появится здесь."
          : "There are no active connections yet. Add the server below; the client will appear here after sign-in."}
      </p>
    );
  }

  return (
    <ul className="border-t border-[var(--color-border-subtle)]">
      {active.map((connection) => {
        const host = (() => {
          try {
            return new URL(connection.redirectUri).host;
          } catch {
            return connection.redirectUri;
          }
        })();
        const last = new Date(connection.lastUsedAt ?? connection.createdAt).toLocaleString(ru ? "ru-RU" : "en-US", {
          timeZone: "Europe/Moscow",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <li key={connection.id} className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-[var(--color-text-primary)]">{connection.clientName}</p>
              <p className="mt-0.5 truncate text-caption text-[var(--color-text-tertiary)]">
                {host} · {ru ? "активность" : "active"} {last} {ru ? "МСК" : "MSK"}
              </p>
            </div>
            <button
              type="button"
              disabled={busy === connection.id}
              onClick={() => disconnect(connection.id)}
              className="self-start rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-50 sm:self-auto"
            >
              {busy === connection.id ? (ru ? "Отключаю…" : "Disconnecting…") : ru ? "Отключить" : "Disconnect"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
