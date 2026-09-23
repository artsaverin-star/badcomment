// App Store offer codes for website lifetime buyers (src/lib/appStoreCodes.ts).
// Runs against a throw-away SQLite DB built from prisma/schema.prisma:
//   npm run test:app-codes
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const dir = mkdtempSync(path.join(tmpdir(), "app-codes-"));
const dbUrl = `file:${path.join(dir, "test.db")}`;
process.env.DATABASE_URL = dbUrl;
execSync("npx prisma db push --skip-generate", { env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "ignore" });

// The package compiles to CJS (no top-level await): load the modules in before().
let lib: typeof import("../../src/lib/appStoreCodes");
let prisma: (typeof import("../../src/lib/prisma"))["prisma"];

const url = (code: string) => `https://apps.apple.com/redeem?ctx=offercodes&id=6814396315&code=${code}`;
let buyerA = "";
let buyerB = "";
let visitor = "";

before(async () => {
  lib = await import("../../src/lib/appStoreCodes");
  prisma = (await import("../../src/lib/prisma")).prisma;
  buyerA = (await prisma.user.create({ data: { email: "a@test.local", lifetime: true } })).id;
  buyerB = (await prisma.user.create({ data: { email: "b@test.local", lifetime: true } })).id;
  visitor = (await prisma.user.create({ data: { email: "c@test.local", lifetime: false } })).id;
});

after(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

test("parser accepts only Apple redeem links for our app and the same code", () => {
  const csv = [
    `AAAA1111BBBB2222CC,${url("AAAA1111BBBB2222CC")}`,
    `AAAA1111BBBB2222CC,${url("AAAA1111BBBB2222CC")}`, // duplicate → deduped
    `DDDD3333EEEE4444FF,https://evil.example/redeem?id=6814396315&code=DDDD3333EEEE4444FF`,
    `GGGG5555HHHH6666II,https://apps.apple.com/redeem?ctx=offercodes&id=123&code=GGGG5555HHHH6666II`,
    `JJJJ7777KKKK8888LL,${url("ZZZZ7777KKKK8888LL")}`, // code mismatch
    `short,${url("short")}`,
    `MMMM9999NNNN0000OO,${url("MMMM9999NNNN0000OO")},extra`,
    "",
  ].join("\n");
  const { rows, invalid } = lib.parseCodesCsv(csv);
  assert.deepEqual(rows.map((r) => r.code), ["AAAA1111BBBB2222CC"]);
  assert.equal(invalid, 5);
});

test("import skips existing codes", async () => {
  const future = new Date("2099-01-01T00:00:00Z");
  const past = new Date("2000-01-01T00:00:00Z");
  const first = await lib.importCodes(
    ["CODE0000000000000A", "CODE0000000000000B"].map((code) => ({ code, redeemUrl: url(code) })),
    { batch: "t", expiresAt: future },
  );
  assert.deepEqual(first, { created: 2, skippedExisting: 0 });
  const again = await lib.importCodes([{ code: "CODE0000000000000A", redeemUrl: url("CODE0000000000000A") }], {
    batch: "t",
    expiresAt: future,
  });
  assert.deepEqual(again, { created: 0, skippedExisting: 1 });
  await lib.importCodes([{ code: "EXPIRED00000000000", redeemUrl: url("EXPIRED00000000000") }], { batch: "old", expiresAt: past });
});

test("concurrent buyers never share a code; a buyer keeps the same code", async () => {
  const [a, b] = await Promise.all([lib.assignCodeTo(buyerA), lib.assignCodeTo(buyerB)]);
  assert.ok(a && b);
  assert.notEqual(a.code, b.code);
  assert.notEqual(a.code, "EXPIRED00000000000");
  assert.notEqual(b.code, "EXPIRED00000000000");
  const aAgain = await Promise.all([lib.assignCodeTo(buyerA), lib.assignCodeTo(buyerA)]);
  assert.equal(aAgain[0]?.code, a.code);
  assert.equal(aAgain[1]?.code, a.code);
});

test("non-buyers get nothing; an empty pool gives null; stats add up", async () => {
  assert.equal(await lib.codeForUser({ id: visitor, lifetime: false }), null);
  assert.equal(await lib.codeForUser(null), null);
  const late = (await prisma.user.create({ data: { email: "d@test.local", lifetime: true } })).id;
  assert.equal(await lib.assignCodeTo(late), null, "only the expired code is left");
  const s = await lib.codeStats();
  assert.deepEqual(s, { total: 3, assigned: 2, freeValid: 0, expiredFree: 1, eligibleUsers: 3, eligibleWithoutCode: 1 });
  await lib.importCodes([{ code: "CODE0000000000000C", redeemUrl: url("CODE0000000000000C") }], {
    batch: "t2",
    expiresAt: new Date("2099-01-01T00:00:00Z"),
  });
  const bulk = await lib.assignAllEligible();
  assert.deepEqual(bulk, { eligibleWithoutCode: 1, assigned: 1, poolEmptyFor: 0 });
  assert.equal((await lib.codeForUser({ id: late, lifetime: true }))?.code, "CODE0000000000000C");
});

test("15 buyers at once: everyone gets a code, all distinct", async () => {
  const ids = await Promise.all(
    Array.from({ length: 15 }, (_, i) => prisma.user.create({ data: { email: `s${i}@test.local`, lifetime: true } }).then((u) => u.id)),
  );
  const codes = Array.from({ length: 15 }, (_, i) => `STRESS${String(i).padStart(12, "0")}`);
  await lib.importCodes(codes.map((code) => ({ code, redeemUrl: url(code) })), { batch: "s", expiresAt: new Date("2099-01-01T00:00:00Z") });
  const got = await Promise.all(ids.map((id) => lib.assignCodeTo(id)));
  assert.ok(got.every(Boolean), "nobody is left without a code while the pool has enough");
  assert.equal(new Set(got.map((g) => g!.code)).size, 15);
});
