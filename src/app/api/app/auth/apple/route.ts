import { prisma } from "@/lib/prisma";
import { createAppSession, appUserPayload } from "@/lib/appAuth";
import {
  AppleUnavailableError,
  findOrCreateAppleUser,
  storeAppleRefreshToken,
  verifyAppleIdentityToken,
  type AppleClaims,
  type AppleFullName,
} from "@/lib/appApple";
import { appJson, asObject, rateLimit, readJson } from "@/lib/appHttp";

// POST /api/app/auth/apple — Sign in with Apple in the iOS app (docs/site-v2/APP-ACCOUNTS.md).
//   {identityToken, authorizationCode?, rawNonce, fullName?: {givenName?, familyName?}}
//   → 200 {token, user} | 400 {error:"bad_request"} | 401 {error:"invalid_token"}
//     | 429 {error:"rate_limited"} | 503 {error:"unavailable"} (Apple's keys unreachable)

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

export async function POST(req: Request) {
  const limited = rateLimit(req, "apple");
  if (limited) return limited;
  const read = await readJson(req, 32 * 1024);
  if (!read.ok) return read.response;
  const body = asObject(read.body);
  const identityToken = str(body?.identityToken, 8192);
  const rawNonce = str(body?.rawNonce, 512);
  if (!identityToken || !rawNonce) return appJson({ error: "bad_request" }, 400);
  // Optional parts: absent, null, empty or malformed → ignored (Apple sends them only sometimes).
  const authorizationCode = str(body?.authorizationCode, 2048);
  const fullNameRaw = asObject(body?.fullName);

  let claims: AppleClaims;
  try {
    claims = await verifyAppleIdentityToken(identityToken, rawNonce);
  } catch (error) {
    if (error instanceof AppleUnavailableError) return appJson({ error: "unavailable" }, 503, { "Retry-After": "30" });
    return appJson({ error: "invalid_token" }, 401);
  }

  const fullName: AppleFullName = fullNameRaw
    ? { givenName: str(fullNameRaw.givenName, 200), familyName: str(fullNameRaw.familyName, 200) }
    : null;
  const user = await findOrCreateAppleUser(claims, fullName);
  if (authorizationCode) await storeAppleRefreshToken(user.id, authorizationCode, claims.sub);
  const token = await createAppSession(user.id);
  const fresh = (await prisma.user.findUnique({ where: { id: user.id } })) ?? user;
  return appJson({ token, user: appUserPayload(fresh) });
}
