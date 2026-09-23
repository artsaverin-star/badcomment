import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "./session";

// Personal App Store offer codes for website lifetime buyers (owner request 2026-09-23):
// everyone who paid for lifetime access on inapp.pro (User.lifetime — set by the YooKassa
// webhook or the Telegram Stars bot) gets one one-time code that unlocks the iOS app's
// «inApp Plus Lifetime» for free. Codes come from App Store Connect (offer "Web lifetime
// buyers") as Apple's CSV: "CODE,REDEEM_URL" per line; an admin imports them. A code is
// assigned to at most one user and never shown to anyone else.

export const IOS_APP_ID = "6814396315";
const CODE_RE = /^[A-Z0-9]{8,32}$/;

export type CodeRow = { code: string; redeemUrl: string };

export const redeemUrlFor = (code: string) => `https://apps.apple.com/redeem?ctx=offercodes&id=${IOS_APP_ID}&code=${code}`;
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
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname === "/redeem" &&
      url.searchParams.get("id") === IOS_APP_ID &&
      (url.searchParams.get("code") ?? "").toUpperCase() === code;
    if (!ok) {
      invalid++;
      continue;
    }
    if (seen.has(code)) continue;
    seen.add(code);
    // Store Apple's canonical redeem link, rebuilt — nothing from the input besides the code.
    rows.push({ code, redeemUrl: redeemUrlFor(code) });
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

/** Start of "today" in UTC. Apple stops a code at 00:00 PT on its expiration date. */
function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** New assignments need at least a week left, so nobody gets a code that dies tomorrow. */
function assignCutoff(): Date {
  return new Date(todayUtc().getTime() + 7 * 86_400_000);
}

export type AppCode = { code: string; redeemUrl: string; expiresAt: Date; expired: boolean };

const SELECT = { code: true, redeemUrl: true, expiresAt: true } as const;
const withState = (c: { code: string; redeemUrl: string; expiresAt: Date }): AppCode => ({
  ...c,
  expired: c.expiresAt.getTime() <= todayUtc().getTime(),
});
/** A code that was never handed to anyone: unassigned now AND never assigned before. */
const FREE = { userId: null, assignedAt: null } as const;

/**
 * The user's code: the one already assigned, or a free, non-expired code claimed atomically
 * (the conditional update only succeeds while the row is still unassigned, so two users can
 * never receive the same code). Null when the pool is empty.
 */
export async function assignCodeTo(userId: string): Promise<AppCode | null> {
  const mine = await prisma.appStoreCode.findUnique({ where: { userId }, select: SELECT });
  if (mine) return withState(mine);
  // Each attempt re-reads the first free code. A lost race means another buyer took that row a
  // moment ago, which uses up one code — so the loop always ends (a code, or an empty pool).
  for (;;) {
    const candidate = await prisma.appStoreCode.findFirst({
      where: { ...FREE, expiresAt: { gt: assignCutoff() } },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!candidate) return null;
    try {
      const { count } = await prisma.appStoreCode.updateMany({
        where: { id: candidate.id, ...FREE },
        data: { userId, assignedAt: new Date() },
      });
      if (count === 1) {
        const got = await prisma.appStoreCode.findUnique({ where: { userId }, select: SELECT });
        return got ? withState(got) : null;
      }
    } catch (e) {
      // userId is unique: a concurrent request for the same user already claimed a code.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await prisma.appStoreCode.findUnique({ where: { userId }, select: SELECT });
        if (again) return withState(again);
        continue;
      }
      throw e;
    }
  }
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
  const [total, assigned, freeValid, eligibleUsers, eligibleWithoutCode] = await Promise.all([
    prisma.appStoreCode.count(),
    prisma.appStoreCode.count({ where: { userId: { not: null } } }),
    prisma.appStoreCode.count({ where: { ...FREE, expiresAt: { gt: assignCutoff() } } }),
    prisma.user.count({ where: { lifetime: true } }),
    prisma.user.count({ where: { lifetime: true, appStoreCode: { is: null } } }),
  ]);
  return { total, assigned, freeValid, expiredFree: total - assigned - freeValid, eligibleUsers, eligibleWithoutCode };
}

/**
 * One shared custom code for every website lifetime buyer (owner, 2026-09-23: about 27 buyers,
 * a one-off promo — no per-user pool needed). App Store Connect custom code «INAPPWEB» on the
 * offer "Web lifetime buyers" (500 redemptions, one per Apple Account, expires 2027-03-22).
 * The per-user pool above stays available for future batches but is not used by the pages.
 */
export const LIFETIME_CUSTOM_CODE = { code: "INAPPWEB", expiresAt: new Date("2027-03-22T00:00:00Z") } as const;

/** For account pages: the code of a signed-in user who paid for lifetime access on the web, else null. */
export async function codeForUser(user: Pick<SessionUser, "id" | "lifetime"> | null): Promise<AppCode | null> {
  if (!user || !user.lifetime) return null;
  const c = LIFETIME_CUSTOM_CODE;
  return { code: c.code, redeemUrl: redeemUrlFor(c.code), expiresAt: c.expiresAt, expired: c.expiresAt.getTime() <= todayUtc().getTime() };
}
