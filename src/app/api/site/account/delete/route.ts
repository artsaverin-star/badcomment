import { clearSession, getSessionUser } from "@/lib/session";
import { deleteUserAccount } from "@/lib/appAccount";
import { appJson, asObject, rateLimit, readJson } from "@/lib/appHttp";

// POST /api/site/account/delete — deletes the signed-in account from the website's Settings
// (docs/site-v2/APP-ACCOUNTS.md; src/lib/appAccount.ts). Web session only, same origin only.
//   body: JSON {confirm:"DELETE"} or a form field confirm=DELETE
//   → 200 {ok:true} (the session cookie is cleared) | 400 {error:"confirm_required"}
//     | 401 {error:"unauthorized"} | 403 {error:"cross_origin"} | 429

export const dynamic = "force-dynamic";

/**
 * Writes must come from our own pages (the session cookie is SameSite=Lax; belt and braces).
 * Origin is compared with Host only: nginx sets Host ($host) but passes a client-sent
 * X-Forwarded-Host through untouched, so that header proves nothing.
 */
function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return host === req.headers.get("host");
}

async function readConfirm(req: Request): Promise<{ ok: true; confirm: unknown } | { ok: false; response: Response }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data")) {
    if (Number(req.headers.get("content-length") ?? "0") > 16 * 1024) return { ok: false, response: appJson({ error: "body_too_large" }, 413) };
    try {
      return { ok: true, confirm: (await req.formData()).get("confirm") };
    } catch {
      return { ok: false, response: appJson({ error: "bad_request" }, 400) };
    }
  }
  const read = await readJson(req, 4 * 1024);
  return read.ok ? { ok: true, confirm: asObject(read.body)?.confirm } : read;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "deleteAccount");
  if (limited) return limited;
  if (!sameOrigin(req)) return appJson({ error: "cross_origin" }, 403);
  const user = await getSessionUser();
  if (!user) return appJson({ error: "unauthorized" }, 401);
  const body = await readConfirm(req);
  if (!body.ok) return body.response;
  if (body.confirm !== "DELETE") return appJson({ error: "confirm_required" }, 400);
  await deleteUserAccount(user.id);
  await clearSession();
  return appJson({ ok: true });
}
