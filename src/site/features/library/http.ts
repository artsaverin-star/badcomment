import "server-only";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { libraryStoreReady } from "./server";

// Shared guard of the /api/site/library route handlers: private JSON, same-origin writes,
// bounded bodies, the signed-in user (401 for guests — they stay local-first).

/** Largest accepted request body: 200 ops × 20 000-char notes ≈ 4 MB, with headroom. */
export const MAX_BODY_BYTES = 5_000_000;

const PRIVATE = { "Cache-Control": "private, no-store" };

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE });
}

export type Guarded = { ok: true; userId: string } | { ok: false; response: NextResponse };

/** Session user (401), a Prisma client that knows the models (503), same origin for writes (403). */
export async function guard(req: Request, write: boolean): Promise<Guarded> {
  if (write && !sameOrigin(req)) return { ok: false, response: json({ error: "cross-origin request" }, 403) };
  const user = await getSessionUser();
  if (!user) return { ok: false, response: json({ error: "sign in to sync" }, 401) };
  if (!libraryStoreReady()) {
    // A dev server started before `prisma generate` still holds the old client: retry later.
    return { ok: false, response: json({ error: "library storage unavailable" }, 503) };
  }
  return { ok: true, userId: user.id };
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it; the session cookie is SameSite=Lax
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return host === req.headers.get("host") || (!!forwarded && host === forwarded);
}

/** Parsed JSON body, or an error response (413 too large, 400 not JSON). */
export async function readJsonBody(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return { ok: false, response: json({ error: "body too large" }, 413) };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: json({ error: "unreadable body" }, 400) };
  }
  if (text.length > MAX_BODY_BYTES) return { ok: false, response: json({ error: "body too large" }, 413) };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: json({ error: "invalid JSON" }, 400) };
  }
}
