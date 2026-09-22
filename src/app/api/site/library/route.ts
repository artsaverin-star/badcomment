import { guard, json, readJsonBody } from "@/site/features/library/http";
import type { LibraryPayload, OpsResponse } from "@/site/features/library/protocol";
import { applyLibraryOps, readLibrary } from "@/site/features/library/server";
import { parseOps } from "@/site/features/library/validate";

// Account copy of the new site's «Сохранённое» + notes (DECISIONS §11, ARCHITECTURE §4).
//   GET  → {user, research: string[], idea: string[], notes: {"<kind>:<slug>": text}}  (401 guest)
//   POST {ops: [{type:"saved",kind,slug,saved} | {type:"note",kind,slug,text}]} (≤ 200)
//        → {applied, rejected: [{index, reason}]}; a malformed body → 400.
// Guests never call this: their library stays in localStorage (ia2:*).

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req, false);
  if (!g.ok) return g.response;
  const state = await readLibrary(g.userId);
  return json({ user: g.userId, ...state } satisfies LibraryPayload);
}

export async function POST(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const read = await readJsonBody(req);
  if (!read.ok) return read.response;
  const parsed = parseOps(read.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await applyLibraryOps(g.userId, parsed.ops);
  return json({ applied: parsed.ops.length, rejected: parsed.rejected } satisfies OpsResponse);
}
