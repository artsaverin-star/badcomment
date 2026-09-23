import { prisma } from "./prisma";
import { revokeAppleRefreshToken } from "./appApple";

// Account deletion (App Review 5.1.1(v); docs/site-v2/APP-ACCOUNTS.md): DELETE /api/app/account
// from the iOS app and POST /api/site/account/delete from the website's Settings.
//
// 1. Revoke the Sign in with Apple token when the key is configured (TN3194).
// 2. Delete the User row. Every relation in prisma/schema.prisma either cascades (app sessions and
//    hand-off codes, SiteSaved, SiteNote, Favorite, Unlock, TokenLedger, PageView, PaymentAttempt,
//    McpConnection → McpToken/McpAuthCode, McpCall, McpAuthCode) or is SetNull (McpEvent,
//    AppStoreCode — an assigned App Store code may already be redeemed, so it never returns to the
//    pool). Telegram login handshakes (LoginToken, no relation) of the account go too.
// Nothing personal is logged.

export type DeletedAccount = { deleted: boolean; appleRevoked: boolean };

export async function deleteUserAccount(userId: string): Promise<DeletedAccount> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramId: true, appleRefreshToken: true },
  });
  if (!user) return { deleted: false, appleRevoked: false };

  const appleRevoked = await revokeAppleRefreshToken(user.appleRefreshToken);
  await prisma.$transaction([
    ...(user.telegramId ? [prisma.loginToken.deleteMany({ where: { telegramId: user.telegramId } })] : []),
    prisma.user.deleteMany({ where: { id: user.id } }),
  ]);
  console.info(`[account] deleted an account${appleRevoked ? " (Apple sign-in revoked)" : ""}`);
  return { deleted: true, appleRevoked };
}
