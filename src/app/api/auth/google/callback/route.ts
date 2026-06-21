import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginWithGoogle, verifyGoogleIdToken, appOrigin } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

// Google redirect-flow callback: verify state, exchange the code for tokens,
// verify the ID token, open a session, and bounce home.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = appOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (await cookies()).get("g_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?auth=${reason}`, origin));
    res.cookies.set("g_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  };

  if (!code || !state || !cookieState || state !== cookieState) return fail("google_error");

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_unconfigured");

  const tokens = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  if (!tokens?.id_token) return fail("google_error");

  const profile = await verifyGoogleIdToken(tokens.id_token, clientId);
  if (!profile) return fail("google_error");

  await loginWithGoogle(profile.sub, profile.email, profile.name);

  // Bounce back to where the user started the sign-in (e.g. the gated page they
  // were unlocking), not the homepage. Validated to be a local path in `start`.
  const rawReturn = (await cookies()).get("g_oauth_return")?.value || "/";
  const returnTo = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/";
  const res = NextResponse.redirect(new URL(returnTo, origin));
  res.cookies.set("g_oauth_state", "", { path: "/", maxAge: 0 });
  res.cookies.set("g_oauth_return", "", { path: "/", maxAge: 0 });
  return res;
}
