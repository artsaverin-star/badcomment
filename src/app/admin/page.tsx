import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isFriendIdentity } from "@/lib/friends";
import { tokensWord } from "@/lib/tokenConfig";
import TokenHistory from "@/components/TokenHistory";

export const dynamic = "force-dynamic";

// Admin: registered users + token wallets. Visible only to is_admin users
// (the first registered account is auto-admin).
export default async function AdminPage() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();
  const isActive = (u: { premiumUntil: Date | null }) => !!(u.premiumUntil && new Date(u.premiumUntil) > now);
  const isFriend = (u: { telegramId: string | null; username: string | null; email: string | null }) =>
    isFriendIdentity(u);
  const premiumCount = users.filter((u) => isActive(u) || isFriend(u)).length;
  const tokensTotal = users.reduce((s, u) => s + (u.tokens ?? 0), 0);
  const spent = await prisma.tokenLedger.aggregate({ _sum: { delta: true }, where: { delta: { lt: 0 } } });
  const tokensSpent = Math.abs(spent._sum.delta ?? 0);

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Админка</h1>
      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">
        Пользователей: <b className="tabular-nums">{users.length}</b> · безлимит:{" "}
        <b className="tabular-nums">{premiumCount}</b> · токенов на балансах:{" "}
        <b className="tabular-nums">{tokensTotal}</b> · потрачено всего:{" "}
        <b className="tabular-nums">
          {tokensSpent} {tokensWord(tokensSpent)}
        </b>
      </p>

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-muted)] text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Пользователь</th>
              <th className="px-4 py-2.5 font-semibold">Токены</th>
              <th className="px-4 py-2.5 font-semibold">Вход</th>
              <th className="px-4 py-2.5 font-semibold">Премиум</th>
              <th className="px-4 py-2.5 font-semibold">Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--color-border-subtle)] text-footnote">
                <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                  {u.firstName || u.username || "—"}
                  {u.username ? <span className="text-[var(--color-text-tertiary)]"> @{u.username}</span> : null}
                  {u.isAdmin ? <span className="ml-1 text-[var(--color-text-brand)]">admin</span> : null}
                </td>
                <td className="px-4 py-2.5">
                  <TokenHistory
                    userId={u.id}
                    balance={u.tokens ?? 0}
                    name={u.firstName || u.username || u.email || u.id.slice(0, 8)}
                  />
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">
                  {u.telegramId ? (
                    <span title={`Telegram ID ${u.telegramId}`}>Telegram</span>
                  ) : u.googleId ? (
                    <span title={u.email || "Google"}>Google{u.email ? ` · ${u.email}` : ""}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {isActive(u) ? (
                    <span className="text-[var(--color-text-primary)]">
                      ⭐ до {new Date(u.premiumUntil as Date).toISOString().slice(0, 10)}
                    </span>
                  ) : isFriend(u) ? (
                    <span className="text-[var(--color-text-primary)]">⭐ Друг</span>
                  ) : (
                    <span className="text-[var(--color-text-tertiary)]">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-[var(--color-text-tertiary)]">
                  {new Date(u.createdAt).toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-callout text-[var(--color-text-tertiary)]">
                  Пока нет зарегистрированных пользователей.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
