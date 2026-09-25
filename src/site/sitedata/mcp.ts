// «MCP» on the new site (docs/site-v2/DECISIONS.md «Web-only sections»): what the page shows
// about the MCP server (src/app/api/mcp, src/lib/mcp/*) — the live tool list, the corpus
// size, one real example answer and the signed-in visitor's connected clients.

import "server-only";

import { TOOLS } from "@/lib/mcp/tools";
import { prisma } from "@/lib/prisma";
import { getNiche, listNiches } from "@/lib/reviews";
import type { Locale } from "../i18n/locales";
import { reviewDataLocale } from "./reviews";

/** The tools the server really exposes, in its own order (name + its English title). */
export function mcpTools(): { name: string; title: string }[] {
  return TOOLS.map((tool) => ({ name: tool.name, title: tool.title ?? tool.name }));
}

export type McpExample = {
  niche: { slug: string; name: string };
  reviews: number;
  /** The three most frequent complaint topics across the niche's apps. */
  pains: { label: string; count: number }[];
};

/**
 * A live example instead of an invented one: the biggest deeply labelled niche and its loudest
 * complaint topics — the same data the server answers with.
 */
export function mcpExample(l: Locale): McpExample | null {
  const dl = reviewDataLocale(l);
  const top = listNiches(dl)[0];
  const niche = top ? getNiche(top.slug) : null;
  if (!top || !niche) return null;
  const pains = niche.apps
    .flatMap((app) => app.themes)
    .filter((th) => th.polarity === "pain" && !th.fallback)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((th) => ({ label: dl === "ru" ? th.name : th.nameEn || th.name, count: th.count }));
  return pains.length ? { niche: { slug: top.slug, name: top.name }, reviews: top.reviews, pains } : null;
}

export type McpConnectionView = {
  id: string;
  clientName: string;
  /** Host of the client's redirect URI (what the consent screen showed). */
  host: string;
  /** ISO time of the last use (or of the connection). */
  lastActive: string;
};

/** Active (not revoked) connections of a user, most recently used first. */
export async function mcpConnections(userId: string): Promise<McpConnectionView[]> {
  const rows = await prisma.mcpConnection.findMany({
    where: { userId, revokedAt: null },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, clientName: true, redirectUri: true, createdAt: true, lastUsedAt: true },
  });
  return rows.map((row) => {
    let host = row.redirectUri;
    try {
      host = new URL(row.redirectUri).host || row.redirectUri;
    } catch {
      // keep the raw value (custom schemes the URL parser rejects)
    }
    return { id: row.id, clientName: row.clientName, host, lastActive: (row.lastUsedAt ?? row.createdAt).toISOString() };
  });
}
