import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { grantSignupOnce } from "@/lib/tokens";
import { SIGNUP_GRANT } from "@/lib/tokenConfig";

export const dynamic = "force-dynamic";

// VK OAuth callback. The modal sends the user to oauth.vk.com/authorize; VK
// redirects back here with ?code=…. We exchange it for an access token (+ the
// user_id and verified email), then upsert + open a session and bounce home.
// Requires env: NEXT_PUBLIC_VK_CLIENT_ID (the app id) and VK_CLIENT_SECRET.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const back = "/";
  if (!code) return NextResponse.redirect(new URL(back, url.origin));

  const clientId = process.env.NEXT_PUBLIC_VK_CLIENT_ID;
  const secret = process.env.VK_CLIENT_SECRET;
  if (!clientId || !secret) {
    return NextResponse.redirect(new URL(`${back}?auth=vk_unconfigured`, url.origin));
  }

  const redirectUri = `${url.origin}/api/auth/vk`;
  const tokenUrl =
    `https://oauth.vk.com/access_token?client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(secret)}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code=${encodeURIComponent(code)}`;

  const tok = await fetch(tokenUrl)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!tok || !tok.user_id) {
    return NextResponse.redirect(new URL(`${back}?auth=vk_failed`, url.origin));
  }

  const vkId = String(tok.user_id);
  const email: string | null = tok.email ?? null;

  // Fetch the display name (best-effort).
  let name: string | null = null;
  try {
    const info = await fetch(
      `https://api.vk.com/method/users.get?user_ids=${vkId}&fields=first_name&access_token=${tok.access_token}&v=5.199`,
    ).then((r) => r.json());
    name = info?.response?.[0]?.first_name ?? null;
  } catch {
    /* ignore */
  }

  const firstUser = (await prisma.user.count()) === 0;
  let user = await prisma.user.findUnique({ where: { vkId } });
  if (!user && email) user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { vkId, email: email ?? user.email, firstName: user.firstName ?? name },
    });
  } else {
    user = await prisma.user.create({ data: { vkId, email, firstName: name, isAdmin: firstUser } });
    await grantSignupOnce(user.id, SIGNUP_GRANT);
  }
  await setSession(user.id);
  return NextResponse.redirect(new URL(back, url.origin));
}
