import { NextResponse } from "next/server";
import { verifyEmailToken, loginWithEmail } from "@/lib/emailAuth";
import { appOrigin } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

// Step 2: the user clicked the link. Verify the token, log them in, redirect.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const rtParam = url.searchParams.get("rt") || "/cards";
  const rt = rtParam.startsWith("/") && !rtParam.startsWith("//") ? rtParam : "/cards";
  const origin = appOrigin(req);

  const email = verifyEmailToken(token);
  if (!email) return NextResponse.redirect(`${origin}/?login=expired`);

  await loginWithEmail(email);
  return NextResponse.redirect(`${origin}${rt}`);
}
