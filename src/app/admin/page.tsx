import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isFriendIdentity } from "@/lib/friends";
import { tokensWord, TOKEN_PACKS, LIFETIME, SIGNUP_GRANT } from "@/lib/tokenConfig";
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
  // "Безлимит" mirrors access.ts getAccess(): admin / lifetime / friend / valid legacy premium.
  const isUnlimited = (u: { isAdmin: boolean; lifetime: boolean; premiumUntil: Date | null; telegramId: string | null; username: string | null; email: string | null }) =>
    u.isAdmin || u.lifetime || isFriend(u) || isActive(u);
  const premiumCount = users.filter(isUnlimited).length;
  const tokensTotal = users.reduce((s, u) => s + (u.tokens ?? 0), 0);
  const spent = await prisma.tokenLedger.aggregate({ _sum: { delta: true }, where: { delta: { lt: 0 } } });
  const tokensSpent = Math.abs(spent._sum.delta ?? 0);

  // Real money paid per user — derived from purchase/lifetime ledger entries by
  // mapping each back to its pack price (we don't store the ₽/⭐ amount itself).
  // ref "yk:" = card (₽), "tg:" = Telegram Stars (⭐).
  const payEntries = await prisma.tokenLedger.findMany({
    where: { reason: { in: ["purchase", "lifetime"] } },
    select: { userId: true, delta: true, reason: true, ref: true },
  });
  const moneyBy = new Map<string, { rub: number; stars: number }>();
  for (const e of payEntries) {
    const m = moneyBy.get(e.userId) ?? { rub: 0, stars: 0 };
    const isStars = (e.ref ?? "").startsWith("tg:");
    if (e.reason === "lifetime") {
      if (isStars) m.stars += LIFETIME.stars;
      else m.rub += LIFETIME.rub;
    } else {
      const pack = TOKEN_PACKS.find((p) => p.tokens === e.delta);
      if (pack) {
        if (isStars) m.stars += pack.stars;
        else m.rub += pack.rub;
      }
    }
    moneyBy.set(e.userId, m);
  }
  // Moscow time (DB stores UTC) — so timestamps match what the owner sees locally.
  // ── Энергетика: на что тратят грант и доходят ли до стены ──
  // Исключаем тесты владельца и друзей, чтобы цифры были по реальным людям.
  const OWNER_EMAILS = new Set(["artsaverin@gmail.com", "artsaverin@taxi.yandex.ru"]);
  const isTestAcct = (u: { isAdmin: boolean; email: string | null; username: string | null; telegramId: string | null }) =>
    u.isAdmin ||
    isFriendIdentity(u) ||
    (u.email ? OWNER_EMAILS.has(u.email.toLowerCase()) : false) ||
    (u.username ? u.username.toLowerCase() === "artsaverinadmin" : false);
  const realUsers = users.filter((u) => !isTestAcct(u));
  const realIds = new Set(realUsers.map((u) => u.id));
  const realCount = realUsers.length;

  const spendByUser = await prisma.tokenLedger.groupBy({ by: ["userId"], where: { delta: { lt: 0 } }, _sum: { delta: true } });
  const spendMap = new Map(spendByUser.map((s) => [s.userId, Math.abs(s._sum.delta ?? 0)]));
  const drawByUser = await prisma.tokenLedger.groupBy({ by: ["userId"], where: { reason: "draw" }, _count: { _all: true } });
  const allSpends = realUsers.map((u) => spendMap.get(u.id) ?? 0);
  const engagedSpends = allSpends.filter((n) => n > 0).sort((a, b) => a - b);
  const engaged = engagedSpends.length;
  const medianSpend = engaged ? engagedSpends[Math.floor((engaged - 1) / 2)] : 0;
  const avgSpend = engaged ? Math.round(engagedSpends.reduce((a, b) => a + b, 0) / engaged) : 0;
  const ranOut = realUsers.filter((u) => (u.tokens ?? 0) === 0 && (spendMap.get(u.id) ?? 0) > 0).length;
  const paidUsers = [...moneyBy.keys()].filter((id) => realIds.has(id)).length;
  const drawTotal = drawByUser.filter((d) => realIds.has(d.userId)).reduce((s, d) => s + (d._count?._all ?? 0), 0);
  const BUCKETS = ["0", "1–15", "16–30", "31–50", "51+"] as const;
  const bkt = (n: number) => (n === 0 ? "0" : n <= 15 ? "1–15" : n <= 30 ? "16–30" : n <= 50 ? "31–50" : "51+");
  const dist: Record<string, number> = { "0": 0, "1–15": 0, "16–30": 0, "31–50": 0, "51+": 0 };
  for (const s of allSpends) dist[bkt(s)]++;

  const fmtDateTime = (d: Date) =>
    new Date(d)
      .toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", "");

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Админка</h1>
        <Link href="/admin/posts" className="rounded-full border border-[var(--color-border-subtle)] px-4 py-1.5 text-callout font-medium text-[var(--color-text-brand)] transition-colors hover:border-[var(--color-border-strong)]">
          Посты →
        </Link>
      </div>
      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">
        Пользователей: <b className="tabular-nums">{users.length}</b> · безлимит:{" "}
        <b className="tabular-nums">{premiumCount}</b> · энергии на балансах:{" "}
        <b className="tabular-nums">{tokensTotal}</b> · потрачено всего:{" "}
        <b className="tabular-nums">
          {tokensSpent} {tokensWord(tokensSpent)}
        </b>
      </p>

      {/* ── Энергетика: сколько тратят и доходят ли до стены 990 ── */}
      <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5">
        <div className="text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">Энергетика — настройка гранта</div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { l: "Тратили энергию", v: `${engaged} из ${realCount}` },
            { l: "Медиана трат", v: `${medianSpend}` },
            { l: "Средние траты", v: `${avgSpend}` },
            { l: "Дошли до нуля", v: `${ranOut}` },
            { l: "Розыгрышей карт", v: `${drawTotal}` },
            { l: "Купили (₽/⭐)", v: `${paidUsers}` },
          ].map((s) => (
            <div key={s.l} className="flex flex-col">
              <span className="text-[22px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-text-primary)]">{s.v}</span>
              <span className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
          <div className="text-caption text-[var(--color-text-tertiary)]">Распределение трат (энергии на человека)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {BUCKETS.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] px-3 py-1 text-footnote">
                <span className="text-[var(--color-text-tertiary)]">{b}:</span>
                <b className="tabular-nums text-[var(--color-text-primary)]">{dist[b]}</b>
              </span>
            ))}
          </div>
          <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">
            Грант сейчас: <b className="text-[var(--color-text-secondary)]">{SIGNUP_GRANT}</b> энергии. Если «дошли до нуля» мало, а медиана трат ниже гранта — грант великоват, до оффера 990 не доходят. Хочется, чтобы медиана ≈ гранту.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-muted)] text-caption uppercase tracking-wide text-[var(--color-text-tertiary)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Пользователь</th>
              <th className="px-4 py-2.5 font-semibold">Энергия</th>
              <th className="px-4 py-2.5 font-semibold">Вход</th>
              <th className="px-4 py-2.5 font-semibold">Оплата</th>
              <th className="px-4 py-2.5 font-semibold">Премиум</th>
              <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Регистрация (МСК)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--color-border-subtle)] text-footnote">
                <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                  {u.firstName || u.username || u.email || "—"}
                  {u.username ? <span className="text-[var(--color-text-tertiary)]"> @{u.username}</span> : null}
                  {u.isAdmin ? <span className="ml-1 text-[var(--color-text-brand)]">admin</span> : null}
                </td>
                <td className="px-4 py-2.5">
                  {isUnlimited(u) ? (
                    <span className="text-[18px] font-semibold text-[var(--color-text-brand)]" title={u.lifetime ? "Lifetime — полный доступ" : "Безлимит"}>∞</span>
                  ) : (
                    <TokenHistory
                      userId={u.id}
                      balance={u.tokens ?? 0}
                      name={u.firstName || u.username || u.email || u.id.slice(0, 8)}
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">
                  {u.telegramId ? (
                    <span title={`Telegram ID ${u.telegramId}`}>Telegram</span>
                  ) : u.googleId ? (
                    <span title={u.email || "Google"}>Google{u.email ? ` · ${u.email}` : ""}</span>
                  ) : u.email ? (
                    <span title={u.email}>Email</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                  {(() => {
                    const m = moneyBy.get(u.id);
                    if (!m || (!m.rub && !m.stars)) return <span className="text-[var(--color-text-tertiary)]">—</span>;
                    return (
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {m.rub ? `${m.rub.toLocaleString("ru-RU")} ₽` : ""}
                        {m.rub && m.stars ? " · " : ""}
                        {m.stars ? `${m.stars} ⭐` : ""}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5">
                  {u.lifetime ? (
                    <span className="font-medium text-[var(--color-text-brand)]">⭐ Lifetime</span>
                  ) : isActive(u) ? (
                    <span className="text-[var(--color-text-primary)]">
                      ⭐ до {new Date(u.premiumUntil as Date).toISOString().slice(0, 10)}
                    </span>
                  ) : isFriend(u) ? (
                    <span className="text-[var(--color-text-primary)]">⭐ Друг</span>
                  ) : (
                    <span className="text-[var(--color-text-tertiary)]">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--color-text-tertiary)]">
                  {fmtDateTime(u.createdAt)}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-callout text-[var(--color-text-tertiary)]">
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
