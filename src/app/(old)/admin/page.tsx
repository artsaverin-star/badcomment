import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isFriendIdentity } from "@/lib/friends";
import friendsList from "@/data/friends.json";
import { TOKEN_PACKS, LIFETIME, DECK_PRICE_RUB, CATEGORY_PRICE_RUB, DECK_STARS, CATEGORY_STARS } from "@/lib/tokenConfig";
import TokenHistory from "@/components/TokenHistory";
import ideasData from "@/data/ideas.json";
import FavoritesCell from "@/components/FavoritesCell";

export const dynamic = "force-dynamic";

// Admin: registered users + token wallets. Visible only to is_admin users
// (the first registered account is auto-admin).
export default async function AdminPage() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  // Favorites per user (server-side bookmarks). Map slug -> idea title for display.
  const favRows = await prisma.favorite.findMany({ orderBy: { createdAt: "desc" }, select: { userId: true, slug: true } });
  const ideaTitle = new Map<string, string>((ideasData as { slug: string; title: string }[]).map((i) => [i.slug, i.title]));
  const favBy = new Map<string, string[]>();
  for (const f of favRows) {
    const arr = favBy.get(f.userId) ?? [];
    arr.push(ideaTitle.get(f.slug) ?? f.slug);
    favBy.set(f.userId, arr);
  }
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

  // Verified checkout funnel. Browser analytics explains acquisition; these
  // server-side rows are the source of truth from payment-method selection to
  // a YooKassa-confirmed purchase.
  const paymentAttempts = await prisma.paymentAttempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { userId: true, method: true, source: true, status: true, amountRub: true, createdAt: true },
  });
  const realPaymentAttempts = paymentAttempts.filter((attempt) => realIds.has(attempt.userId));
  const checkoutUsers = new Set(realPaymentAttempts.map((attempt) => attempt.userId)).size;
  const successfulAttempts = realPaymentAttempts.filter((attempt) => attempt.status === "succeeded");
  const failedAttempts = realPaymentAttempts.filter((attempt) => attempt.status === "failed" || attempt.status === "canceled");
  const checkoutConversion = realPaymentAttempts.length ? Math.round((successfulAttempts.length / realPaymentAttempts.length) * 100) : 0;
  const methodCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const attempt of realPaymentAttempts) {
    methodCounts.set(attempt.method, (methodCounts.get(attempt.method) ?? 0) + 1);
    const source = attempt.source || "unknown";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  // ── MCP: кто реально дёргает сервер из редактора ──
  // Одна строка на вызов инструмента; "denied" = стучался без оплаты (тёплый лид).
  const [mcpRows, mcpConnections, mcpEvents] = await Promise.all([
    prisma.mcpCall.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { userId: true, tool: true, status: true, durationMs: true, responseBytes: true, clientName: true, createdAt: true },
    }),
    prisma.mcpConnection.findMany({
      orderBy: { createdAt: "desc" },
      select: { userId: true, clientName: true, revokedAt: true, lastUsedAt: true, createdAt: true },
    }),
    prisma.mcpEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { event: true, status: true, detail: true, createdAt: true },
    }),
  ]);
  type McpAgg = { calls: number; denied: number; errors: number; durationTotal: number; durationCount: number; lastAt: Date; tools: Map<string, number>; clients: Set<string> };
  const mcpBy = new Map<string, McpAgg>();
  for (const r of mcpRows) {
    const a = mcpBy.get(r.userId) ?? { calls: 0, denied: 0, errors: 0, durationTotal: 0, durationCount: 0, lastAt: r.createdAt, tools: new Map<string, number>(), clients: new Set<string>() };
    a.calls++;
    if (r.status === "denied") a.denied++;
    if (r.status === "error") a.errors++;
    if (r.durationMs != null) {
      a.durationTotal += r.durationMs;
      a.durationCount++;
    }
    if (r.clientName) a.clients.add(r.clientName);
    if (r.createdAt > a.lastAt) a.lastAt = r.createdAt;
    a.tools.set(r.tool, (a.tools.get(r.tool) ?? 0) + 1);
    mcpBy.set(r.userId, a);
  }
  const mcpUsers = [...mcpBy.entries()].sort((a, b) => b[1].lastAt.getTime() - a[1].lastAt.getTime());
  const activeMcpConnections = mcpConnections.filter((connection) => !connection.revokedAt);
  const mcpDurations = mcpRows.map((row) => row.durationMs).filter((duration): duration is number => duration != null).sort((a, b) => a - b);
  const mcpAverageMs = mcpDurations.length ? Math.round(mcpDurations.reduce((sum, duration) => sum + duration, 0) / mcpDurations.length) : 0;
  const mcpP95Ms = mcpDurations.length ? mcpDurations[Math.min(mcpDurations.length - 1, Math.floor(mcpDurations.length * 0.95))] : 0;
  const mcpResponseMb = mcpRows.reduce((sum, row) => sum + (row.responseBytes ?? 0), 0) / 1024 / 1024;
  const mcpErrorCount = mcpRows.filter((row) => row.status === "error").length;
  const mcpDeniedUsers = new Set(mcpRows.filter((row) => row.status === "denied").map((row) => row.userId)).size;
  const eventCount = (event: string, status = "ok") => mcpEvents.filter((row) => row.event === event && row.status === status).length;
  const oauthErrors = mcpEvents.filter((row) => row.status === "error").length;
  const userById = new Map(users.map((u) => [u.id, u]));
  const displayName = (id: string) => {
    const u = userById.get(id);
    return u ? u.firstName || u.username || u.email || id.slice(0, 8) : id.slice(0, 8);
  };

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
              <th className="px-4 py-2.5 font-semibold">Избранное</th>
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
                <td className="px-4 py-2.5">
                  <FavoritesCell titles={favBy.get(u.id) ?? []} name={u.firstName || u.username || u.email || u.id.slice(0, 8)} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--color-text-tertiary)]">
                  {fmtDateTime(u.createdAt)}
                </td>
              </tr>
            ))}
            {/* Allowlist friends who have not signed in yet: normal rows in the
                same table, so a freshly granted friend is visible immediately. */}
            {(friendsList as string[])
              .filter((f) => {
                const key = f.trim().toLowerCase();
                return !users.some((u) => [u.telegramId, u.username, u.email].some((v) => v && String(v).trim().toLowerCase() === key));
              })
              .map((f) => (
                <tr key={`friend-${f}`} className="border-t border-[var(--color-border-subtle)] text-footnote">
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                    {/^\d+$/.test(f) ? `Telegram ID ${f}` : f.includes("@") ? f : `@${f}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[18px] font-semibold leading-none text-[var(--color-text-brand)]" title="Друг — полный доступ">∞</span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">ещё не входил</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">—</td>
                  <td className="px-4 py-2.5"><span className="text-[var(--color-text-primary)]">⭐ Друг</span></td>
                  <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">—</td>
                  <td className="px-4 py-2.5 text-[var(--color-text-tertiary)]">—</td>
                </tr>
              ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-callout text-[var(--color-text-tertiary)]">
                  Пока нет зарегистрированных пользователей.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Оплата</h2>
      <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">
        Серверная воронка после выбора способа оплаты. Покупка считается только после подтверждённого вебхука ЮKassa.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-4">
        {[
          [checkoutUsers, "пользователей начали оплату"],
          [realPaymentAttempts.length, "попыток оплаты"],
          [successfulAttempts.length, "подтверждённых покупок"],
          [failedAttempts.length, "отмен и ошибок"],
        ].map(([value, label]) => (
          <div key={label} className="bg-[var(--color-bg-page)] p-4">
            <div className="text-[22px] font-semibold tabular-nums text-[var(--color-text-primary)]">{Number(value).toLocaleString("ru-RU")}</div>
            <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">
        Конверсия попытка → оплата: <b className="text-[var(--color-text-primary)]">{checkoutConversion}%</b>
        {methodCounts.size ? ` · способы: ${[...methodCounts.entries()].map(([method, count]) => `${method === "bank_card" ? "карта" : method.toUpperCase()} ${count}`).join(" · ")}` : ""}
      </p>
      {sourceCounts.size ? (
        <p className="mt-1 text-footnote text-[var(--color-text-tertiary)]">
          Источники оплаты: {[...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => `${source} ×${count}`).join(" · ")}
        </p>
      ) : null}

      <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">MCP</h2>
      <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">
        Воронка: регистраций клиента <b className="tabular-nums">{eventCount("oauth_registration")}</b> → согласий{" "}
        <b className="tabular-nums">{eventCount("oauth_consent")}</b> → подключений <b className="tabular-nums">{eventCount("oauth_connected")}</b> → пользователей инструментов{" "}
        <b className="tabular-nums">{mcpUsers.length}</b>.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-4">
        {[
          [activeMcpConnections.length, "активных клиентов"],
          [mcpRows.length, "вызовов инструментов"],
          [mcpDeniedUsers, "лидов у платной стены"],
          [mcpErrorCount + oauthErrors, "ошибок"],
        ].map(([value, label]) => (
          <div key={label} className="bg-[var(--color-bg-page)] p-4">
            <div className="text-[22px] font-semibold tabular-nums text-[var(--color-text-primary)]">{Number(value).toLocaleString("ru-RU")}</div>
            <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">
        Скорость: средняя {mcpAverageMs} мс · p95 {mcpP95Ms} мс · отдано {mcpResponseMb.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} МБ
        {mcpRows.length >= 5000 || mcpEvents.length >= 5000 ? " · расчёт по последним 5000 событиям" : ""}
      </p>
      {mcpUsers.length === 0 ? (
        <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">Сервером ещё никто не пользовался.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)]">
          <table className="w-full text-left">
            <thead className="bg-[var(--color-bg-muted)] text-caption tracking-wide text-[var(--color-text-tertiary)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Пользователь</th>
                <th className="px-4 py-2.5 font-semibold">Вызовов</th>
                <th className="px-4 py-2.5 font-semibold">Без оплаты</th>
                <th className="px-4 py-2.5 font-semibold">Клиент / скорость</th>
                <th className="px-4 py-2.5 font-semibold">Частые инструменты</th>
                <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Последний вызов (МСК)</th>
              </tr>
            </thead>
            <tbody>
              {mcpUsers.map(([id, a]) => (
                <tr key={id} className="border-t border-[var(--color-border-subtle)] text-footnote">
                  <td className="px-4 py-2.5 text-[var(--color-text-primary)]">{displayName(id)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{a.calls.toLocaleString("ru-RU")}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {a.denied ? (
                      <span className="font-medium text-[var(--color-text-brand)]" title="Стучался в инструменты без оплаченного доступа">
                        {a.denied}
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {a.clients.size ? [...a.clients].join(", ") : "—"}
                    {a.durationCount ? ` · ${Math.round(a.durationTotal / a.durationCount)} мс` : ""}
                    {a.errors ? <span className="text-[var(--color-text-brand)]"> · ошибок {a.errors}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                    {[...a.tools.entries()]
                      .sort((x, y) => y[1] - x[1])
                      .slice(0, 3)
                      .map(([tool, n]) => `${tool} ×${n}`)
                      .join(" · ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--color-text-tertiary)]">
                    {fmtDateTime(a.lastAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
