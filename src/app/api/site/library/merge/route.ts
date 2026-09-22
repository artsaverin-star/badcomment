import { guard, json, readJsonBody } from "@/site/features/library/http";
import type { LibraryPayload } from "@/site/features/library/protocol";
import { mergeLibrary } from "@/site/features/library/server";
import { parseMergeBody } from "@/site/features/library/validate";

// One-time union of a browser's library into the account right after sign-in
// (spec 09 §2.5, like the old favMigrated pattern). Body = the whole local library
// {research, idea, notes}; entries outside the launch edition are dropped.
// Response = the merged account copy (same shape as GET /api/site/library).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req, true);
  if (!g.ok) return g.response;
  const read = await readJsonBody(req);
  if (!read.ok) return read.response;
  const parsed = parseMergeBody(read.body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const merged = await mergeLibrary(g.userId, parsed.state);
  return json({ user: g.userId, ...merged } satisfies LibraryPayload);
}
