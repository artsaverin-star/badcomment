import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { appOrigin } from "@/lib/googleAuth";
import { safeLocalPath } from "@/lib/safeReturn";
import { authFailurePath } from "@/lib/appFlow";
import { sha256Hex } from "@/lib/appAuth";
import { APPLE_OAUTH_COOKIE_PATH, appleWebClientId } from "@/lib/appleWeb";

export const dynamic = "force-dynamic";

// Sign in with Apple on the website (Services ID, see src/lib/appleWeb.ts): a top-level
// navigation to Apple's authorize page. Apple answers with a cross-site form POST to
// /api/auth/apple/callback (response_mode=form_post is required when asking for name/email),
// so the state, nonce and return cookies are SameSite=None — Lax ones would not come back.
export async function GET(req: Request) {
  const clientId = appleWebClientId();
  const origin = appOrigin(req);
  const returnTo = safeLocalPath(new URL(req.url).searchParams.get("return_to"));
  if (!clientId) return NextResponse.redirect(new URL(authFailurePath(returnTo, { auth: "apple_unconfigured" }), origin));

  const state = randomBytes(16).toString("hex");
  const rawNonce = randomBytes(16).toString("hex");
  const auth = new URL("https://appleid.apple.com/auth/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", `${origin}/api/auth/apple/callback`);
  auth.searchParams.set("response_type", "code id_token");
  auth.searchParams.set("response_mode", "form_post");
  auth.searchParams.set("scope", "name email");
  auth.searchParams.set("state", state);
  // The identity token carries this value; the callback checks it against SHA-256(rawNonce).
  auth.searchParams.set("nonce", sha256Hex(rawNonce));

  const res = NextResponse.redirect(auth.toString());
  const opts = { httpOnly: true, secure: true, sameSite: "none" as const, path: APPLE_OAUTH_COOKIE_PATH, maxAge: 600 };
  res.cookies.set("a_oauth_state", state, opts);
  res.cookies.set("a_oauth_nonce", rawNonce, opts);
  res.cookies.set("a_oauth_return", returnTo, opts);
  return res;
}
