"use client";

import { useState, useSyncExternalStore } from "react";
import { useLocale, useT, useWeb } from "@/site/i18n/client";
import { INTL_LOCALE } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import { Button, DisconnectIcon, McpIcon, Sheet, toast } from "@/site/ui";
import type { McpStrings } from "./strings";

// The signed-in visitor's MCP clients (/<L>/mcp «Подключённые клиенты»), built like the app's
// account box (ClarityAccountSection.swift:26-33, 118-131, 174-184): one settings box per
// client with an info row (glyph, client name, «host · активность …» as a caption) and an
// «Отключить» row that asks first — a small dialog with the destructive action and «Отмена»,
// like «Выйти из аккаунта?». DELETE /api/mcp/connections revokes the connection and all its
// tokens. Times are local to the browser (formatted after mount, so SSR and hydration agree).
// Client keys: «Отмена» (MCP_UI_KEYS).

const subscribeNothing = () => () => {};

// Row glyphs: SF 19 pt in a 24-wide column (ClarityAccountSection.swift:118, 176).
const ICON = { size: 19, strokeWidth: 2 } as const;

export type McpConnectionItem = { id: string; clientName: string; host: string; lastActive: string };

export function Connections({ initial }: { initial: McpConnectionItem[] }) {
  const s = useWeb<McpStrings>("mcp");
  const t = useT();
  const locale = useLocale();
  const [list, setList] = useState(initial);
  // The connection the dialog asks about; kept after closing so the title does not blank out
  // while the dialog fades.
  const [target, setTarget] = useState<McpConnectionItem | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // false while server-rendering and hydrating, true after: local times only in the browser.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const when = (iso: string) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], mounted ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(iso),
    );

  const ask = (c: McpConnectionItem) => {
    setTarget(c);
    setOpen(true);
  };

  const close = () => {
    if (!busy) setOpen(false);
  };

  const disconnect = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mcp/connections", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setList((cur) => cur.filter((c) => c.id !== target.id));
      setBusy(false);
      setOpen(false);
    } catch {
      setBusy(false);
      setOpen(false);
      // After the dialog closes: a toast under a modal <dialog> would sit behind its backdrop.
      toast(s.disconnectFailed, { tone: "error" });
    }
  };

  return (
    <>
      {list.length ? (
        <div className="ia-stack ia-mcp-conns">
          {list.map((c) => (
            <div key={c.id} className="ia-set-box">
              <div className="ia-set-row ia-set-row--info">
                <span className="ia-set-row__icon" aria-hidden="true">
                  <McpIcon {...ICON} />
                </span>
                <span className="ia-set-row__text">
                  <span className="ia-set-row__title">{c.clientName}</span>
                  <span className="ia-set-row__sub">{format(s.lastActive, { host: c.host, date: when(c.lastActive) })}</span>
                </span>
              </div>
              <button
                type="button"
                className="ia-set-row"
                aria-haspopup="dialog"
                aria-label={format(s.disconnectLabel, { client: c.clientName })}
                onClick={() => ask(c)}
              >
                <span className="ia-set-row__icon" aria-hidden="true">
                  <DisconnectIcon {...ICON} />
                </span>
                <span className="ia-set-row__title">{s.disconnect}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="ia-search-status">{s.connectionsEmpty}</p>
      )}
      <Sheet
        open={open}
        onClose={close}
        variant="dialog"
        history={false}
        dismissible={!busy}
        title={target ? format(s.disconnectConfirm, { client: target.clientName }) : undefined}
        bodyClassName="ia-mcp-confirm"
      >
        <p className="ia-search-status">{s.disconnectConfirmBody}</p>
        <div className="ia-lib-confirm">
          <Button variant="secondary" block className="ia-lib-confirm__discard" busy={busy} onClick={() => void disconnect()}>
            {s.disconnect}
          </Button>
          <Button variant="secondary" block onClick={close} disabled={busy}>
            {t("Отмена")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
