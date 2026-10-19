import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appOrigin } from "@/lib/googleAuth";
import { safeLocalPath } from "@/lib/safeReturn";
import { authFailurePath } from "@/lib/appFlow";
import { setSession } from "@/lib/session";
import { AppleTokenError, findOrCreateAppleUser, verifyAppleIdentityToken } from "@/lib/appApple";
import { APPLE_OAUTH_COOKIE_PATH, appleWebClientId, appleWebFullName } from "@/lib/appleWeb";

export const dynamic = "force-dynamic";

// Apple's form POST after the web sign-in (see ./start): check state, verify the identity token
// (signature, aud = our Services ID, nonce from the cookie), find or create the account by the
// Apple `sub` — the same account as in the iOS app — open a session and go back where the
// sign-in started. A failure, "Cancel" on Apple's page included (error=user_cancelled_authorize),
// lands on the start page with ?auth=apple_error. 303: the browser must follow with a GET.
export async function POST(req: Request) {
  const origin = appOrigin(req);
  const jar = await cookies();
  const cookieState = jar.get("a_oauth_state")?.value;
  const rawNonce = jar.get("a_oauth_nonce")?.value;
  const returnTo = safeLocalPath(jar.get("a_oauth_return")?.value);

  const finish = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin), 303);
    for (const name of ["a_oauth_state", "a_oauth_nonce", "a_oauth_return"]) {
      res.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "none", path: APPLE_OAUTH_COOKIE_PATH, maxAge: 0 });
    }
    return res;
  };
  const fail = (reason: string) => finish(authFailurePath(returnTo, { auth: reason }));

  const clientId = appleWebClientId();
  if (!clientId) return fail("apple_unconfigured");

  const form = await req.formData().catch(() => null);
  const state = form?.get("state");
  const idToken = form?.get("id_token");
  if (typeof state !== "string" || !cookieState || state !== cookieState || !rawNonce) return fail("apple_error");
  if (typeof idToken !== "string" || !idToken) return fail("apple_error");

  let claims;
  try {
    claims = await verifyAppleIdentityToken(idToken, rawNonce, Date.now(), clientId);
  } catch (e) {
    if (!(e instanceof AppleTokenError)) console.error("[apple-web] identity token check failed:", e);
    return fail("apple_error");
  }

  const user = await findOrCreateAppleUser(claims, appleWebFullName(form?.get("user") ?? null));
  await setSession(user.id);
  return finish(returnTo);
}

// Apple only POSTs here; a direct visit just goes home.
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/", appOrigin(req)));
}
