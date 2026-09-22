import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { combineNotes, noteKeyOf, type LibraryState, type MaterialKind, type SyncOp } from "./protocol";

// Account copy of «Сохранённое» and notes (Prisma SiteSaved / SiteNote). Inputs are already
// validated by ./validate.ts. Bookmark order = createdAt DESC (the app inserts at index 0).

/** True when the running Prisma client knows the site-v2 models (a stale dev server may not). */
export function libraryStoreReady(): boolean {
  const p = prisma as unknown as { siteSaved?: { findMany?: unknown }; siteNote?: { findMany?: unknown } };
  return typeof p.siteSaved?.findMany === "function" && typeof p.siteNote?.findMany === "function";
}

export async function readLibrary(userId: string): Promise<LibraryState> {
  const [saved, notes] = await Promise.all([
    prisma.siteSaved.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { kind: true, slug: true },
    }),
    prisma.siteNote.findMany({
      where: { userId },
      orderBy: [{ kind: "asc" }, { slug: "asc" }],
      select: { kind: true, slug: true, text: true },
    }),
  ]);
  const state: LibraryState = { research: [], idea: [], notes: {} };
  for (const row of saved) {
    if (row.kind === "research" || row.kind === "idea") state[row.kind].push(row.slug);
  }
  for (const row of notes) {
    if ((row.kind === "research" || row.kind === "idea") && row.text.trim()) state.notes[noteKeyOf(row.kind, row.slug)] = row.text;
  }
  return state;
}

/**
 * Apply validated operations in order, in one transaction. A new bookmark gets createdAt =
 * now (+1 ms per op, so a batch keeps its order); the client only sends `saved: true` when
 * the material was not saved before, so the account order matches the browser's.
 */
export async function applyLibraryOps(userId: string, ops: readonly SyncOp[]): Promise<void> {
  if (ops.length === 0) return;
  const base = Date.now();
  const writes = ops.map((op, i) => {
    const where = { userId_kind_slug: { userId, kind: op.kind, slug: op.slug } };
    if (op.type === "saved") {
      if (!op.saved) return prisma.siteSaved.deleteMany({ where: { userId, kind: op.kind, slug: op.slug } });
      const createdAt = new Date(base + i);
      return prisma.siteSaved.upsert({
        where,
        create: { userId, kind: op.kind, slug: op.slug, createdAt },
        update: { createdAt },
      });
    }
    if (!op.text.trim()) return prisma.siteNote.deleteMany({ where: { userId, kind: op.kind, slug: op.slug } });
    return prisma.siteNote.upsert({
      where,
      create: { userId, kind: op.kind, slug: op.slug, text: op.text },
      update: { text: op.text },
    });
  });
  await prisma.$transaction(writes);
}

/**
 * One-time union of the browser's library into the account (on sign-in). Bookmarks the
 * account lacks are added as the newest ones, keeping the browser's order; bookmarks the
 * account already has keep their place. Notes: see combineNotes (nothing is lost).
 * Returns the merged account copy.
 */
export async function mergeLibrary(userId: string, local: LibraryState): Promise<LibraryState> {
  const current = await readLibrary(userId);
  const now = Date.now();
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  for (const kind of ["research", "idea"] as const satisfies readonly MaterialKind[]) {
    const have = new Set(current[kind]);
    // local[kind][0] is the newest: now, then now − 1 ms, …
    local[kind].forEach((slug, i) => {
      if (have.has(slug)) return;
      writes.push(
        prisma.siteSaved.upsert({
          where: { userId_kind_slug: { userId, kind, slug } },
          create: { userId, kind, slug, createdAt: new Date(now - i) },
          update: {},
        }),
      );
    });
  }
  for (const [key, text] of Object.entries(local.notes)) {
    const [kind, ...rest] = key.split(":");
    const slug = rest.join(":");
    if (kind !== "research" && kind !== "idea") continue;
    const combined = combineNotes(current.notes[key], text);
    if (combined === null || combined === current.notes[key]) continue;
    writes.push(
      prisma.siteNote.upsert({
        where: { userId_kind_slug: { userId, kind, slug } },
        create: { userId, kind, slug, text: combined },
        update: { text: combined },
      }),
    );
  }
  if (writes.length) await prisma.$transaction(writes);
  return writes.length ? readLibrary(userId) : current;
}
