import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

// Temporary diagnostic — booleans only, no secret values. Tells whether the
// Google OAuth env is configured on the box. Remove after verifying.
export async function GET(req: Request) {
  return NextResponse.json({
    clientIdSet: !!(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${appOrigin(req)}/api/auth/google/callback`,
  });
}
