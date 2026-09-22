"use client";

import { useState } from "react";
import CopyLine from "@/components/CopyLine";

// The Mobbin-style install block: pick your tool, get the exact steps for it.
// Every path ends the same way — the client opens the browser, you sign in and
// tap allow. No keys anywhere.

const ENDPOINT = "https://inapp.pro/api/mcp";
// base64 of {"url":"https://inapp.pro/api/mcp"} for Cursor's install deeplink.
const CURSOR_DEEPLINK =
  "cursor://anysphere.cursor-deeplink/mcp/install?name=inapp&config=eyJ1cmwiOiJodHRwczovL2luYXBwLnByby9hcGkvbWNwIn0=";

type StepDef = { t: string; body?: string; copy?: { v: string; l?: string }; cursorBtn?: boolean };
type ClientDef = { id: string; label: string; steps: StepDef[] };

export default function InstallPicker({
  ru,
  paid,
}: {
  ru: boolean;
  paid: boolean;
}) {
  const askExample = ru
    ? "Готово. Спроси обычным языком, например: «На что жалуются пользователи трекеров привычек?»"
    : "Done. Ask in plain language, e.g. “What do habit tracker users complain about?”";
  const authorize = ru ? "Откроется браузер: войди и нажми «Разрешить»." : "The browser opens: sign in and tap allow.";

  const CLIENTS: ClientDef[] = [
    {
      id: "claude-code",
      label: "Claude Code",
      steps: [
        {
          t: ru ? "Вставь команду в терминал" : "Paste the command into your terminal",
          copy: { v: `claude mcp add inapp --scope user --transport http ${ENDPOINT}` },
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: authorize,
          copy: { v: "claude mcp login inapp" },
        },
        { t: ru ? "Спрашивай" : "Ask away", body: askExample },
      ],
    },
    {
      id: "cursor",
      label: "Cursor",
      steps: [
        {
          t: ru ? "Добавь сервер" : "Add the server",
          body: ru ? "Одной кнопкой, или вручную в файл ~/.cursor/mcp.json:" : "One button, or by hand in ~/.cursor/mcp.json:",
          copy: { v: `{"mcpServers":{"inapp":{"url":"${ENDPOINT}"}}}` },
          cursorBtn: true,
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: ru
            ? `В Settings → MCP у сервера inapp появится Needs login: нажми. ${authorize}`
            : `In Settings → MCP the inapp server shows Needs login: click it. ${authorize}`,
        },
        { t: ru ? "Спрашивай" : "Ask away", body: askExample },
      ],
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      steps: [
        {
          t: ru ? "Добавь коннектор" : "Add the connector",
          body: ru
            ? "Настройки → Коннекторы → Добавить пользовательский коннектор, вставь адрес:"
            : "Settings → Connectors → Add custom connector, paste the URL:",
          copy: { v: ENDPOINT },
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: ru ? `Нажми Connect. ${authorize}` : `Hit Connect. ${authorize}`,
        },
        { t: ru ? "Спрашивай" : "Ask away", body: askExample },
      ],
    },
    {
      id: "vscode",
      label: "VS Code",
      steps: [
        {
          t: ru ? "Добавь сервер" : "Add the server",
          body: ru
            ? "Палитра команд → «MCP: Add Server» → HTTP, вставь адрес:"
            : "Command palette → “MCP: Add Server” → HTTP, paste the URL:",
          copy: { v: ENDPOINT },
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: ru ? `VS Code предложит войти. ${authorize}` : `VS Code offers to sign in. ${authorize}`,
        },
        { t: ru ? "Спрашивай" : "Ask away", body: ru ? "Готово. Спрашивай в Copilot Chat в режиме Agent." : "Done. Ask in Copilot Chat, Agent mode." },
      ],
    },
    {
      id: "codex",
      label: "Codex",
      steps: [
        {
          t: ru ? "Вставь команду в терминал" : "Paste the command into your terminal",
          copy: { v: `codex mcp add inapp --url ${ENDPOINT} --oauth-resource ${ENDPOINT}` },
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: authorize,
          copy: { v: "codex mcp login inapp" },
        },
        { t: ru ? "Спрашивай" : "Ask away", body: askExample },
      ],
    },
    {
      id: "other",
      label: ru ? "Другой" : "Other",
      steps: [
        {
          t: ru ? "Добавь сервер" : "Add the server",
          body: ru
            ? "Любой клиент с удалёнными MCP по HTTP (streamable). Адрес сервера:"
            : "Any client that speaks remote MCP over streamable HTTP. Server URL:",
          copy: { v: ENDPOINT },
        },
        {
          t: ru ? "Авторизуйся" : "Authenticate",
          body: ru
            ? `Клиент сам обнаружит OAuth. ${authorize} Никакие ключи не нужны.`
            : `The client discovers OAuth on its own. ${authorize} No keys needed.`,
        },
        { t: ru ? "Спрашивай" : "Ask away", body: askExample },
      ],
    },
  ];

  const [active, setActive] = useState(CLIENTS[0].id);
  const client = CLIENTS.find((c) => c.id === active) ?? CLIENTS[0];
  const offset = 0;

  return (
    <div>
      <div className="flex gap-4">
        <span className="w-5 shrink-0 pt-0.5 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{offset + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-subhead text-[var(--color-text-primary)]">{ru ? "Выбери свой инструмент" : "Pick your AI tool"}</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CLIENTS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                aria-pressed={c.id === active}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-footnote transition-colors ${
                  c.id === active
                    ? "border-transparent bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ol className="mt-8 flex flex-col gap-8">
        {client.steps.map((s, i) => (
          <li key={`${client.id}-${i}`} className="flex gap-4">
            <span className="w-5 shrink-0 pt-0.5 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{offset + 2 + i}</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-subhead text-[var(--color-text-primary)]">{s.t}</h3>
              {s.body && <p className="mt-1.5 max-w-[62ch] text-footnote text-[var(--color-text-secondary)]">{s.body}</p>}
              {s.cursorBtn && (
                <a
                  href={CURSOR_DEEPLINK}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-text-primary)] px-4 py-2 text-footnote font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-85"
                >
                  {ru ? "Добавить в Cursor" : "Add to Cursor"}
                </a>
              )}
              {s.copy && <div className="mt-3"><CopyLine value={s.copy.v} label={s.copy.l} ru={ru} /></div>}
            </div>
          </li>
        ))}
      </ol>
      {!paid && (
        <p className="mt-7 max-w-[62ch] border-l-2 border-[var(--color-border-strong)] pl-4 text-footnote text-[var(--color-text-secondary)]">
          {ru
            ? "Проверка подключения, список ниш и полный разбор одной демо-ниши доступны бесплатно. Остальные исследования откроются после покупки."
            : "Connection checks, the niche list, and one complete sample niche are free. The remaining research unlocks after purchase."}
        </p>
      )}
    </div>
  );
}
