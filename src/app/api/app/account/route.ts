import { deleteUserAccount } from "@/lib/appAccount";
import { appJson, asObject, rateLimit, readJson, requireAppUser } from "@/lib/appHttp";

// DELETE /api/app/account (Bearer) {confirm:"DELETE"} — deletes the account from the iOS app
// (App Review 5.1.1(v); src/lib/appAccount.ts).
//   → 200 {ok:true, appleRevoked} | 400 {error:"confirm_required"} | 401 | 429
// appleRevoked:false → the app explains how to stop using Apple ID with inApp
// (Settings → Apple ID → Sign in with Apple) when the account used Sign in with Apple.

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const limited = rateLimit(req, "deleteAccount");
  if (limited) return limited;
  const me = await requireAppUser(req);
  if (!me.ok) return me.response;
  const read = await readJson(req, 4 * 1024);
  if (!read.ok) return read.response;
  if (asObject(read.body)?.confirm !== "DELETE") return appJson({ error: "confirm_required" }, 400);
  const result = await deleteUserAccount(me.auth.user.id);
  return appJson({ ok: true, appleRevoked: result.appleRevoked });
}
