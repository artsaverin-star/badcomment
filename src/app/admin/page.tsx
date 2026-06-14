import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Admin: registered users + premium status. Visible only to is_admin users
// (the first registered account is auto-admin).
export default async function AdminPage() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();
  const isActive = (u: { premiumUntil: Date | null }) => !!(u.premiumUntil && new Date(u.premiumUntil) > now);
  const premiumCount = users.filter(isActive).length;

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Админка</h1>
      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">
        Пользователей: <b className="tabular-nums">{users.length}</b> · с активным премиумом:{" "}
        <b className="tabular-nums">{premiumCount}</b>
      </p>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-muted)] text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Пользователь</th>
              <th className="px-4 py-2.5 font-semibold">Telegram ID</th>
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
                <td className="px-4 py-2.5 tabular-nums text-[var(--color-text-tertiary)]">{u.telegramId}</td>
                <td className="px-4 py-2.5">
                  {isActive(u) ? (
                    <span className="text-[var(--color-text-primary)]">
                      ⭐ до {new Date(u.premiumUntil as Date).toISOString().slice(0, 10)}
                    </span>
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
                <td colSpan={4} className="px-4 py-8 text-center text-callout text-[var(--color-text-tertiary)]">
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
