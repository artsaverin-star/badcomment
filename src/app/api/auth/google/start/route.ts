import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { appOrigin } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

// Redirect (Authorization Code) Google sign-in — a plain top-level navigation to
// Google's login page, so it works even when a content blocker (Wipr, etc.) kills
// the Google Identity Services script/iframes. Sets a state cookie, redirects to
// Google; the callback exchanges the code.
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const origin = appOrigin(req);
  if (!clientId) return NextResponse.redirect(new URL("/?auth=google_unconfigured", origin));

  // Remember where the user was so the callback bounces them back (not home).
  const rawReturn = new URL(req.url).searchParams.get("return_to") || "";
  const returnTo = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/";

  const state = randomBytes(16).toString("hex");
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", `${origin}/api/auth/google/callback`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(auth.toString());
  // SameSite=Lax so the cookies survive the top-level redirect back from Google.
  res.cookies.set("g_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  res.cookies.set("g_oauth_return", returnTo, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
