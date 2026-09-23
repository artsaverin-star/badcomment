import { prisma } from "./prisma";

// Personal App Store offer codes for website lifetime buyers (owner request 2026-09-23):
// everyone who paid for lifetime access on inapp.pro (User.lifetime — set by the YooKassa
// webhook or the Telegram Stars bot) gets one one-time code that unlocks the iOS app's
// «inApp Plus Lifetime» for free. Codes come from App Store Connect (offer "Web lifetime
// buyers") as Apple's CSV: "CODE,REDEEM_URL" per line; an admin imports them. A code is
// assigned to at most one user and never shown to anyone else.

export const IOS_APP_ID = "6814396315";
const CODE_RE = /^[A-Z0-9]{8,32}$/;

export type CodeRow = { code: string; redeemUrl: string };
export type ParsedCsv = { rows: CodeRow[]; invalid: number };

/** Strict parser for Apple's one-time-use code CSV. Anything unexpected is counted as invalid. */
export function parseCodesCsv(text: string): ParsedCsv {
  const rows: CodeRow[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [codeRaw, urlRaw, ...rest] = line.split(",").map((x) => x.trim());
    const code = (codeRaw ?? "").toUpperCase();
    if (rest.length || !CODE_RE.test(code) || !urlRaw) {
      invalid++;
      continue;
    }
    let url: URL;
    try {
      url = new URL(urlRaw);
    } catch {
      invalid++;
      continue;
    }
    const ok =
      url.protocol === "https:" &&
      url.hostname === "apps.apple.com" &&
      url.pathname === "/redeem" &&
      url.searchParams.get("id") === IOS_APP_ID &&
      (url.searchParams.get("code") ?? "").toUpperCase() === code;
    if (!ok) {
      invalid++;
      continue;
    }
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, redeemUrl: url.toString() });
  }
  return { rows, invalid };
}

/** Insert new codes; existing ones (same code) are left untouched. */
export async function importCodes(rows: CodeRow[], opts: { batch: string; expiresAt: Date }) {
  const existing = new Set(
    (await prisma.appStoreCode.findMany({ where: { code: { in: rows.map((r) => r.code) } }, select: { code: true } })).map(
      (r) => r.code,
    ),
  );
  const fresh = rows.filter((r) => !existing.has(r.code));
  let created = 0;
  // SQLite: no createMany skipDuplicates — small chunks in transactions.
  for (let i = 0; i < fresh.length; i += 100) {
    const chunk = fresh.slice(i, i + 100);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.appStoreCode.create({
          data: { code: r.code, redeemUrl: r.redeemUrl, batch: opts.batch, expiresAt: opts.expiresAt },
        }),
      ),
    );
    created += chunk.length;
  }
  return { created, skippedExisting: rows.length - fresh.length };
}

/** Start of "today" in UTC: a code whose last valid day is before today is expired. */
function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export type AppCode = { code: string; redeemUrl: string; expiresAt: Date };

/**
 * The user's code: the one already assigned, or a free, non-expired code claimed atomically
 * (the conditional update only succeeds while the row is still unassigned, so two users can
 * never receive the same code). Null when the pool is empty.
 */
export async function assignCodeTo(userId: string): Promise<AppCode | null> {
  const mine = await prisma.appStoreCode.findUnique({ where: { userId }, select: { code: true, redeemUrl: true, expiresAt: true } });
  if (mine) return mine;
  // Each attempt re-reads the first free code: a lost race just means someone else took
  // that row a moment ago, so the next read sees the next free one.
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = await prisma.appStoreCode.findFirst({
      where: { userId: null, expiresAt: { gt: todayUtc() } },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!candidate) return null;
    try {
      const { count } = await prisma.appStoreCode.updateMany({
        where: { id: candidate.id, userId: null },
        data: { userId, assignedAt: new Date() },
      });
      if (count === 1) {
        return prisma.appStoreCode.findUnique({ where: { userId }, select: { code: true, redeemUrl: true, expiresAt: true } });
      }
    } catch {
      // userId is unique: a concurrent request for the same user already claimed a code.
      const again = await prisma.appStoreCode.findUnique({ where: { userId }, select: { code: true, redeemUrl: true, expiresAt: true } });
      if (again) return again;
    }
  }
  return null;
}

/** Give a code to every paid lifetime user who has none yet. */
export async function assignAllEligible() {
  const users = await prisma.user.findMany({
    where: { lifetime: true, appStoreCode: { is: null } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let assigned = 0;
  let noCode = 0;
  for (const u of users) {
    if (await assignCodeTo(u.id)) assigned++;
    else noCode++;
  }
  return { eligibleWithoutCode: users.length, assigned, poolEmptyFor: noCode };
}

export async function codeStats() {
  const today = todayUtc();
  const [total, assigned, freeValid, eligibleUsers, eligibleWithoutCode] = await Promise.all([
    prisma.appStoreCode.count(),
    prisma.appStoreCode.count({ where: { userId: { not: null } } }),
    prisma.appStoreCode.count({ where: { userId: null, expiresAt: { gt: today } } }),
    prisma.user.count({ where: { lifetime: true } }),
    prisma.user.count({ where: { lifetime: true, appStoreCode: { is: null } } }),
  ]);
  return { total, assigned, freeValid, expiredFree: total - assigned - freeValid, eligibleUsers, eligibleWithoutCode };
}

/**
 * For account pages: the signed-in user's code if they paid for lifetime access on the web
 * (assigned lazily), else null. `lifetime` must come from the session user record.
 */
export async function codeForUser(user: { id: string; lifetime: boolean } | null): Promise<AppCode | null> {
  if (!user || !user.lifetime) return null;
  return assignCodeTo(user.id);
}
