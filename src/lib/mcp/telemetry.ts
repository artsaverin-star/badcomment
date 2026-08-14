import { prisma } from "@/lib/prisma";

export async function recordMcpEvent(input: {
  event: string;
  status?: string;
  userId?: string | null;
  connectionId?: string | null;
  clientName?: string | null;
  detail?: string | null;
  durationMs?: number | null;
}) {
  await prisma.mcpEvent
    .create({
      data: {
        event: input.event,
        status: input.status ?? "ok",
        userId: input.userId ?? null,
        connectionId: input.connectionId ?? null,
        clientName: input.clientName?.slice(0, 120) ?? null,
        detail: input.detail?.slice(0, 500) ?? null,
        durationMs: input.durationMs ?? null,
      },
    })
    .catch(() => {});
}
export async function recordMcpCall(input: {
  userId: string;
  connectionId: string;
  clientName: string;
  tool: string;
  status: "ok" | "denied" | "error";
  errorCode?: string | null;
  durationMs: number;
  responseBytes?: number | null;
}) {
  await prisma.mcpCall
    .create({
      data: {
        userId: input.userId,
        connectionId: input.connectionId,
        clientName: input.clientName.slice(0, 120),
        tool: input.tool.slice(0, 100),
        status: input.status,
        errorCode: input.errorCode?.slice(0, 100) ?? null,
        durationMs: Math.max(0, Math.round(input.durationMs)),
        responseBytes: input.responseBytes == null ? null : Math.max(0, Math.round(input.responseBytes)),
      },
    })
    .catch(() => {});
}
