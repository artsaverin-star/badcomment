import { NextResponse } from "next/server";
import { verifyEmailToken, loginWithEmail } from "@/lib/emailAuth";
import { appOrigin } from "@/lib/googleAuth";
import { safeLocalPath } from "@/lib/safeReturn";
import { APP_PKCE_COOKIE, APP_PKCE_COOKIE_MAX_AGE_S, authFailurePath, takeAppAuthChallenge } from "@/lib/appFlow";

export const dynamic = "force-dynamic";

// Step 2: the user clicked the link. Verify the token, log them in, redirect.
// iOS app sign-in (rt = /<L>/app-auth?from=email[&c=<challenge>], src/lib/appFlow.ts): the
// challenge becomes the ia_app_pkce cookie (the link may open in a browser that never saw the
// app's sign-in sheet) and leaves the URL; an expired link goes back to /<L>/login?app=1, not
// to the site's landing page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  // Only a same-site path (src/lib/safeReturn.ts): "//x", "/\x", "/\t/x", encoded "//",
  // dot segments and /api… fall back to the historical landing spot.
  const { path: rt, challenge } = takeAppAuthChallenge(safeLocalPath(url.searchParams.get("rt"), "/cards"));
  const origin = appOrigin(req);

  const email = verifyEmailToken(token);
  if (!email) return NextResponse.redirect(`${origin}${authFailurePath(rt, { login: "expired" })}`);

  await loginWithEmail(email);
  const res = NextResponse.redirect(`${origin}${rt}`);
  if (challenge) {
    res.cookies.set(APP_PKCE_COOKIE, challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: APP_PKCE_COOKIE_MAX_AGE_S,
    });
  }
  return res;
}
