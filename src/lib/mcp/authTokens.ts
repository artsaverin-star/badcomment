import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const ACCESS_PREFIX = "inapp_at_";
const REFRESH_PREFIX = "inapp_rt_";

export const MCP_SCOPE = "mcp:read";

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("base64url");
const opaque = (prefix: string, bytes: number) => `${prefix}${crypto.randomBytes(bytes).toString("base64url")}`;

const sessionUser = (u: {
  id: string;
  telegramId: string | null;
  googleId: string | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  premiumUntil: Date | null;
  tokens: number;
  lifetime: boolean;
  isAdmin: boolean;
}): SessionUser => ({
  id: u.id,
  telegramId: u.telegramId,
  googleId: u.googleId,
  email: u.email,
  username: u.username,
  firstName: u.firstName,
  premiumUntil: u.premiumUntil,
  tokens: u.tokens,
  lifetime: u.lifetime,
  isAdmin: u.isAdmin,
});

export type McpIdentity = {
  user: SessionUser;
  connection: {
    id: string;
    clientName: string;
    resource: string;
    locale: string;
  };
};

export type IssuedTokens = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

function freshTokens() {
  const access = opaque(ACCESS_PREFIX, 32);
  const refresh = opaque(REFRESH_PREFIX, 48);
  return {
    access,
    refresh,
    accessHash: sha256(access),
    refreshHash: sha256(refresh),
  };
}

async function storeFreshTokens(connectionId: string, revokeExisting: boolean): Promise<IssuedTokens> {
  const raw = freshTokens();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + ACCESS_TTL_SECONDS * 1000);
  const refreshExpires = new Date(now.getTime() + REFRESH_TTL_SECONDS * 1000);

  await prisma.$transaction(async (tx) => {
    if (revokeExisting) {
      await tx.mcpToken.updateMany({
        where: { connectionId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    await tx.mcpConnection.update({ where: { id: connectionId }, data: { revokedAt: null, lastUsedAt: now } });
    await tx.mcpToken.createMany({
      data: [
        { connectionId, tokenHash: raw.accessHash, kind: "access", expiresAt: accessExpires },
        { connectionId, tokenHash: raw.refreshHash, kind: "refresh", expiresAt: refreshExpires },
      ],
    });
  });

  return {
    access_token: raw.access,
    token_type: "bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: raw.refresh,
    scope: MCP_SCOPE,
  };
}

/** Resolve a short-lived, resource-bound access token to its user and client. */
export async function authenticateMcpRequest(header: string | null, resource: string): Promise<McpIdentity | null> {
  const raw = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith(ACCESS_PREFIX)) return null;

  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { connection: { include: { user: true } } },
  });
  const now = new Date();
  if (
    !token ||
    token.kind !== "access" ||
    token.revokedAt ||
    token.expiresAt <= now ||
    token.connection.revokedAt ||
    token.connection.resource !== resource
  ) {
    return null;
  }

  await Promise.all([
    prisma.mcpToken.update({ where: { id: token.id }, data: { lastUsedAt: now } }),
    prisma.mcpConnection.update({ where: { id: token.connection.id }, data: { lastUsedAt: now } }),
  ]).catch(() => {});

  return {
    user: sessionUser(token.connection.user),
    connection: {
      id: token.connection.id,
      clientName: token.connection.clientName,
      resource: token.connection.resource,
      locale: token.connection.locale,
    },
  };
}

export async function createAuthorizationCode(input: {
  userId: string;
  clientId: string;
  clientName: string;
  redirectUri: string;
  challenge: string;
  resource: string;
  locale: string;
}): Promise<string> {
  const raw = opaque("inapp_ac_", 32);
  const clientIdHash = sha256(input.clientId);
  const connection = await prisma.mcpConnection.upsert({
    where: {
      userId_clientIdHash_redirectUri: {
        userId: input.userId,
        clientIdHash,
        redirectUri: input.redirectUri,
      },
    },
    update: {
      clientName: input.clientName,
      resource: input.resource,
      locale: input.locale,
      revokedAt: null,
    },
    create: {
      userId: input.userId,
      clientIdHash,
      clientName: input.clientName,
      redirectUri: input.redirectUri,
      resource: input.resource,
      locale: input.locale,
    },
  });

  await prisma.mcpAuthCode.create({
    data: {
      userId: input.userId,
      connectionId: connection.id,
      codeHash: sha256(raw),
      clientIdHash,
      redirectUri: input.redirectUri,
      challenge: input.challenge,
      resource: input.resource,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return raw;
}

export async function redeemAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  verifier: string;
  resource: string;
}): Promise<{ tokens: IssuedTokens; connectionId: string; userId: string; clientName: string } | null> {
  const code = await prisma.mcpAuthCode.findUnique({
    where: { codeHash: sha256(input.code) },
    include: { connection: true },
  });
  if (!code || code.usedAt || code.expiresAt <= new Date()) return null;
  if (code.clientIdHash !== sha256(input.clientId) || code.redirectUri !== input.redirectUri || code.resource !== input.resource) return null;
  const challenge = crypto.createHash("sha256").update(input.verifier).digest("base64url");
  if (challenge !== code.challenge) return null;

  const claimed = await prisma.mcpAuthCode.updateMany({
    where: { id: code.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  const tokens = await storeFreshTokens(code.connectionId, true);
  return { tokens, connectionId: code.connectionId, userId: code.userId, clientName: code.connection.clientName };
}

export async function rotateRefreshToken(input: {
  refreshToken: string;
  clientId?: string;
  resource: string;
}): Promise<{ tokens: IssuedTokens; connectionId: string; userId: string; clientName: string } | null> {
  if (!input.refreshToken.startsWith(REFRESH_PREFIX)) return null;
  const token = await prisma.mcpToken.findUnique({
    where: { tokenHash: sha256(input.refreshToken) },
    include: { connection: true },
  });
  const now = new Date();
  if (
    !token ||
    token.kind !== "refresh" ||
    token.revokedAt ||
    token.expiresAt <= now ||
    token.connection.revokedAt ||
    token.connection.resource !== input.resource ||
    (input.clientId && token.connection.clientIdHash !== sha256(input.clientId))
  ) {
    return null;
  }

  const claimed = await prisma.mcpToken.updateMany({ where: { id: token.id, revokedAt: null }, data: { revokedAt: now } });
  if (claimed.count !== 1) return null;
  // Rotation is connection-wide: an intercepted access token must not remain
  // valid after its refresh token has been exchanged.
  const tokens = await storeFreshTokens(token.connectionId, true);
  return {
    tokens,
    connectionId: token.connectionId,
    userId: token.connection.userId,
    clientName: token.connection.clientName,
  };
}

/** RFC 7009-style revocation: possessing either token can disconnect that client. */
export async function revokeMcpToken(raw: string): Promise<{ connectionId: string; userId: string; clientName: string } | null> {
  const token = await prisma.mcpToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { connection: true } });
  if (!token) return null;
  const now = new Date();
  await prisma.$transaction([
    prisma.mcpToken.updateMany({ where: { connectionId: token.connectionId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.mcpConnection.update({ where: { id: token.connectionId }, data: { revokedAt: now } }),
  ]);
  return { connectionId: token.connectionId, userId: token.connection.userId, clientName: token.connection.clientName };
}
