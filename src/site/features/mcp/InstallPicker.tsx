"use client";

import { useState } from "react";
import { useWeb } from "@/site/i18n/client";
import { format } from "@/site/i18n/strings";
import { Button, Chip, ChipRow } from "@/site/ui";
import { CopyLine } from "./CopyLine";
import type { McpStrings } from "./strings";

// «Подключение»: pick your client, get its exact steps. Every path ends the same way — the
// client opens the browser, you sign in and allow; no keys anywhere. The server URL and the
// Cursor deeplink are the production ones (the MCP OAuth issuer is https://inapp.pro).
// Layout (spec §5.7): the app's chips, then a numbered list whose counter sits on each step
// title («1. …», 17/600), the step text 15/20 secondary, code lines on surface boxes; the free
// tier line is a footnote.

const ENDPOINT = "https://inapp.pro/api/mcp";
// base64 of {"url":"https://inapp.pro/api/mcp"} for Cursor's install deeplink.
const CURSOR_DEEPLINK =
  "cursor://anysphere.cursor-deeplink/mcp/install?name=inapp&config=eyJ1cmwiOiJodHRwczovL2luYXBwLnByby9hcGkvbWNwIn0=";

type Step = { title: string; text?: string; code?: string; cursorButton?: boolean };
type Client = { id: string; label: string; steps: Step[] };

function clients(s: McpStrings): Client[] {
  const authorize = s.authorize;
  const auth = (text: string) => format(text, { authorize });
  const ask: Step = { title: s.stepAsk, text: s.askExample };
  return [
    {
      id: "claude-code",
      label: "Claude Code",
      steps: [
        { title: s.stepPaste, code: `claude mcp add inapp --scope user --transport http ${ENDPOINT}` },
        { title: s.stepAuth, text: authorize, code: "claude mcp login inapp" },
        ask,
      ],
    },
    {
      id: "cursor",
      label: "Cursor",
      steps: [
        { title: s.stepAddServer, text: s.cursorAdd, code: `{"mcpServers":{"inapp":{"url":"${ENDPOINT}"}}}`, cursorButton: true },
        { title: s.stepAuth, text: auth(s.cursorAuth) },
        ask,
      ],
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      steps: [
        { title: s.stepAddConnector, text: s.desktopAdd, code: ENDPOINT },
        { title: s.stepAuth, text: auth(s.desktopAuth) },
        ask,
      ],
    },
    {
      id: "vscode",
      label: "VS Code",
      steps: [
        { title: s.stepAddServer, text: s.vscodeAdd, code: ENDPOINT },
        { title: s.stepAuth, text: auth(s.vscodeAuth) },
        { title: s.stepAsk, text: s.vscodeAsk },
      ],
    },
    {
      id: "codex",
      label: "Codex",
      steps: [
        { title: s.stepPaste, code: `codex mcp add inapp --url ${ENDPOINT} --oauth-resource ${ENDPOINT}` },
        { title: s.stepAuth, text: authorize, code: "codex mcp login inapp" },
        ask,
      ],
    },
    {
      id: "other",
      label: s.otherClient,
      steps: [
        { title: s.stepAddServer, text: s.otherAdd, code: ENDPOINT },
        { title: s.stepAuth, text: auth(s.otherAuth) },
        ask,
      ],
    },
  ];
}

export function InstallPicker({ showFreeTier }: { showFreeTier: boolean }) {
  const s = useWeb<McpStrings>("mcp");
  const list = clients(s);
  const [active, setActive] = useState(list[0].id);
  const client = list.find((c) => c.id === active) ?? list[0];

  return (
    <>
      <ChipRow label={s.pickTool}>
        {list.map((c) => (
          <Chip key={c.id} selected={c.id === active} onClick={() => setActive(c.id)}>
            {c.label}
          </Chip>
        ))}
      </ChipRow>
      <ol className="ia-stack ia-mcp-steps" aria-label={client.label}>
        {client.steps.map((step, i) => (
          <li key={`${client.id}-${i}`} className="ia-mcp-step">
            <div className="ia-mcp-step__body">
              <h3 className="ia-mcp-step__title">{step.title}</h3>
              {step.text ? <p className="ia-mcp-step__text">{step.text}</p> : null}
              {step.cursorButton ? (
                <Button href={CURSOR_DEEPLINK} external variant="secondary" size="sm" className="self-start">
                  {s.cursorButton}
                </Button>
              ) : null}
              {step.code ? <CopyLine value={step.code} /> : null}
            </div>
          </li>
        ))}
      </ol>
      {showFreeTier ? <p className="ia-footnote">{s.freeTier}</p> : null}
    </>
  );
}
