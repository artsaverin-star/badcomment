import { prisma } from "@/lib/prisma";
import { appUserPayload, consumeAppLoginCode, createAppSession } from "@/lib/appAuth";
import { appJson, asObject, rateLimit, readJson } from "@/lib/appHttp";

// POST /api/app/auth/exchange {code, verifier?} — the iOS app trades the one-time code of
// inapp://auth?code=… (minted by the website's /<L>/app-auth page) for a bearer token.
// `verifier` (alias `code_verifier`): the PKCE secret whose SHA-256 the app sent as `challenge`
// to /api/app/auth/handoff/start (src/lib/appFlow.ts). Required for codes bound to a challenge,
// refused for codes without one; APP_HANDOFF_PKCE=required makes it mandatory.
//   → 200 {token, user} | 400 {error:"invalid_code"} (unknown, used, expired, PKCE mismatch) | 429

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(req, "exchange");
  if (limited) return limited;
  const read = await readJson(req, 4 * 1024);
  if (!read.ok) return read.response;
  const body = asObject(read.body);
  const userId = await consumeAppLoginCode(body?.code, body?.verifier ?? body?.code_verifier);
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!user) return appJson({ error: "invalid_code" }, 400);
  const token = await createAppSession(user.id);
  return appJson({ token, user: appUserPayload(user) });
}
