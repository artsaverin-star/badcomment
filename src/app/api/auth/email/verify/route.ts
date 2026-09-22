import { NextResponse } from "next/server";
import { verifyEmailToken, loginWithEmail } from "@/lib/emailAuth";
import { appOrigin } from "@/lib/googleAuth";
import { safeLocalPath } from "@/lib/safeReturn";

export const dynamic = "force-dynamic";

// Step 2: the user clicked the link. Verify the token, log them in, redirect.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  // Only a same-site path (src/lib/safeReturn.ts): "//x", "/\x", "/\t/x", encoded "//",
  // dot segments and /api… fall back to the historical landing spot.
  const rt = safeLocalPath(url.searchParams.get("rt"), "/cards");
  const origin = appOrigin(req);

  const email = verifyEmailToken(token);
  if (!email) return NextResponse.redirect(`${origin}/?login=expired`);

  await loginWithEmail(email);
  return NextResponse.redirect(`${origin}${rt}`);
}
