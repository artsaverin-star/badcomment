import { prisma } from "./prisma";
import { setSession } from "./session";
import { grantTokens } from "./tokens";
import { SIGNUP_GRANT } from "./tokenConfig";

// Public origin for OAuth redirect URIs. Behind nginx, req.url is the internal
// localhost:3000, so hardcode the prod origin (overridable via APP_ORIGIN);
// fall back to the request origin in dev.
export function appOrigin(req: Request): string {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production") return "https://inapp.pro";
  return new URL(req.url).origin;
}

// Upsert a Google-authenticated user (by googleId, then email), grant the signup
// bonus to brand-new accounts, and open a session. Shared by the GIS credential
// flow (POST /api/auth/google) and the redirect code flow (callback) so both
// behave identically.
export async function loginWithGoogle(sub: string, email: string | null, name: string | null) {
  const firstUser = (await prisma.user.count()) === 0;
  let user = await prisma.user.findUnique({ where: { googleId: sub } });
  if (!user && email) user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: sub, email: email ?? user.email, firstName: user.firstName ?? name },
    });
  } else {
    user = await prisma.user.create({ data: { googleId: sub, email, firstName: name, isAdmin: firstUser } });
    await grantTokens(user.id, SIGNUP_GRANT, "signup");
  }
  await setSession(user.id);
  return user;
}

// Verify a Google ID token via the tokeninfo endpoint and pull out the profile.
export async function verifyGoogleIdToken(idToken: string, clientId?: string) {
  const ti = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!ti || !ti.sub || (clientId && ti.aud !== clientId)) return null;
  return {
    sub: ti.sub as string,
    email: ti.email && ti.email_verified !== "false" ? (ti.email as string) : null,
    name: (ti.given_name as string) || (ti.name as string) || null,
  };
}
