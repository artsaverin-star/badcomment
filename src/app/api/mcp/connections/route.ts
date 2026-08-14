import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { recordMcpEvent } from "@/lib/mcp/telemetry";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const connections = await prisma.mcpConnection.findMany({
    where: { userId: user.id },
    orderBy: [{ revokedAt: "asc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, clientName: true, redirectUri: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
  return NextResponse.json({ connections }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const connection = await prisma.mcpConnection.findFirst({ where: { id, userId: user.id } });
  if (!connection) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const now = new Date();
  await prisma.$transaction([
    prisma.mcpToken.updateMany({ where: { connectionId: id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.mcpConnection.update({ where: { id }, data: { revokedAt: now } }),
  ]);
  await recordMcpEvent({ event: "connection_revoked", userId: user.id, connectionId: id, clientName: connection.clientName });
  return NextResponse.json({ ok: true });
}
