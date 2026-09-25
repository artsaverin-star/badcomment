// App UI keys (content/v2/<L>/ui.json) that the CLIENT parts of /<L>/mcp render; the page hands
// them down with t.pick(MCP_UI_KEYS). Server-safe (a "use client" module cannot export data to
// server components).
//   - the shared Plus card (features/plus/PlusCard.tsx, caption="static"): «Активен», «О моём
//     Plus» / «Открыть Plus», «Все разборы, идеи и экспорт» / «Один платёж. Без продления.»;
//   - Connections.tsx: «Отмена» in the disconnect confirmation.

export const MCP_UI_KEYS = [
  "Активен",
  "О моём Plus",
  "Открыть Plus",
  "Все разборы, идеи и экспорт",
  "Один платёж. Без продления.",
  "Отмена",
] as const;
