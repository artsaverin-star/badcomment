import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isFriendIdentity } from "@/lib/friends";
import { TOKEN_PACKS, LIFETIME, DECK_PRICE_RUB, CATEGORY_PRICE_RUB, DECK_STARS, CATEGORY_STARS } from "@/lib/tokenConfig";
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

  // Real money paid per user. New SKUs are tagged by reason (buy_deck /
  // buy_category / lifetime); legacy token packs map by token delta.
  // ref "yk:" = card (₽), "tg:" = Telegram Stars (⭐).
  const payEntries = await prisma.tokenLedger.findMany({
    where: { reason: { in: ["purchase", "lifetime", "buy_deck", "buy_category"] } },
    select: { userId: true, delta: true, reason: true, ref: true, amountRub: true },
  });
  const moneyBy = new Map<string, { rub: number; stars: number }>();
  for (const e of payEntries) {
    const m = moneyBy.get(e.userId) ?? { rub: 0, stars: 0 };
    const isStars = (e.ref ?? "").startsWith("tg:");
    if (e.amountRub != null) {
      // Real charged amount (stored since the rubles rebuild) — exact.
      if (isStars) m.stars += e.amountRub;
      else m.rub += e.amountRub;
    } else if (e.reason === "lifetime") {
      if (isStars) m.stars += LIFETIME.stars;
      else m.rub += LIFETIME.rub;
    } else if (e.reason === "buy_deck") {
      if (isStars) m.stars += DECK_STARS;
      else m.rub += DECK_PRICE_RUB;
    } else if (e.reason === "buy_category") {
      if (isStars) m.stars += CATEGORY_STARS;
      else m.rub += CATEGORY_PRICE_RUB;
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

  const paidUsers = [...moneyBy.keys()].filter((id) => realIds.has(id)).length;
  const paidEntries = [...moneyBy.entries()].filter(([id]) => realIds.has(id));
  const revenueRub = paidEntries.reduce((s, [, m]) => s + m.rub, 0);
  const revenueStars = paidEntries.reduce((s, [, m]) => s + m.stars, 0);

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
    <main className="mx-auto w-full max-w-[1200px] px-2 sm:px-4 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Админка</h1>
      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">
        Пользователей: <b className="tabular-nums">{users.length}</b> · безлимит:{" "}
        <b className="tabular-nums">{premiumCount}</b> · платящих:{" "}
        <b className="tabular-nums">{paidUsers}</b> из <b className="tabular-nums">{realCount}</b> · выручка:{" "}
        <b className="tabular-nums">
          {revenueRub.toLocaleString("ru-RU")} ₽{revenueStars ? ` · ${revenueStars} ⭐` : ""}
        </b>
      </p>

      <div className="mt-6 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)]">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-muted)] text-caption tracking-wide text-[var(--color-text-tertiary)]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Пользователь</th>
              <th className="px-4 py-2.5 font-semibold">Активность</th>
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
                  <TokenHistory
                    userId={u.id}
                    balance={u.tokens ?? 0}
                    name={u.firstName || u.username || u.email || u.id.slice(0, 8)}
                    display={
                      isUnlimited(u) ? (
                        <span className="text-[18px] font-semibold leading-none text-[var(--color-text-brand)]" title={u.lifetime ? "Lifetime — полный доступ" : "Безлимит"}>∞</span>
                      ) : undefined
                    }
                  />
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
