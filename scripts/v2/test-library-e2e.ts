// End-to-end check of the library sync API (saved items + notes) against the LOCAL dev DB.
// Creates a throwaway user, exercises GET / POST / merge, then deletes the user (SiteSaved /
// SiteNote rows cascade).
//
//   node --env-file=.env --import tsx scripts/v2/test-library-e2e.ts
//
// Transport: HTTP against the running dev server (BASE_URL, default http://localhost:3210) with
// a signed ia_session cookie. If that server still holds a Prisma client generated before the
// SiteSaved/SiteNote models (it answers 503 "library storage unavailable" until restarted), the
// same scenario runs in-process through the handlers' building blocks (validate.ts + server.ts),
// which is exactly what the route handlers call after their session/origin guard.

import crypto from "node:crypto";
import Module from "node:module";
import path from "node:path";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
if (!(process.env.DATABASE_URL ?? "").startsWith("file:")) {
  console.error("Refusing to run: DATABASE_URL is not a local SQLite file.");
  process.exit(1);
}
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

type Res = { status: number; body: unknown };
type Lib = { user: string; research: string[]; idea: string[]; notes: Record<string, string> };
type Transport = {
  name: string;
  get(): Promise<Res>;
  ops(body: unknown): Promise<Res>;
  merge(body: unknown): Promise<Res>;
};

function sessionCookie(uid: string): string {
  const b = Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url");
  const h = crypto.createHmac("sha256", secret).update(b).digest("base64url");
  return `ia_session=${b}.${h}`;
}

async function http(pathname: string, cookie: string | null, init: RequestInit = {}): Promise<Res> {
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

function httpTransport(cookie: string): Transport {
  const post = (p: string, body: unknown) => http(p, cookie, { method: "POST", body: JSON.stringify(body) });
  return {
    name: "HTTP",
    get: () => http("/api/site/library", cookie),
    ops: (body) => post("/api/site/library", body),
    merge: (body) => post("/api/site/library/merge", body),
  };
}

/** The handlers' building blocks, in-process (Next aliases "server-only" to an empty module). */
function directTransport(userId: string): Transport {
  const m = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
  const resolve = m._resolveFilename;
  const empty = path.resolve("node_modules/next/dist/compiled/server-only/empty.js");
  m._resolveFilename = function (request: string, ...rest: unknown[]) {
    return request === "server-only" ? empty : resolve.call(this, request, ...rest);
  };
  /* eslint-disable @typescript-eslint/no-require-imports */
  const server = require("../../src/site/features/library/server") as typeof import("../../src/site/features/library/server");
  const validate = require("../../src/site/features/library/validate") as typeof import("../../src/site/features/library/validate");
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    name: "in-process",
    get: async () => ({ status: 200, body: { user: userId, ...(await server.readLibrary(userId)) } }),
    ops: async (body) => {
      const parsed = validate.parseOps(body);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      await server.applyLibraryOps(userId, parsed.ops);
      return { status: 200, body: { applied: parsed.ops.length, rejected: parsed.rejected } };
    },
    merge: async (body) => {
      const parsed = validate.parseMergeBody(body);
      if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
      return { status: 200, body: { user: userId, ...(await server.mergeLibrary(userId, parsed.state)) } };
    },
  };
}

let passed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.create({ data: { email: `library-e2e-${Date.now()}@local.test` } });
  const cookie = sessionCookie(user.id);

  try {
    await check("HTTP: guest GET → 401", async () => assert.equal((await http("/api/site/library", null)).status, 401));
    await check("HTTP: cross-origin POST → 403", async () => {
      const r = await http("/api/site/library", cookie, {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ ops: [] }),
      });
      assert.equal(r.status, 403);
    });

    let api = httpTransport(cookie);
    const probe = await api.get();
    if (probe.status === 503) {
      console.log("  !!  dev server answers 503 (stale Prisma client — restart it); running the rest in-process");
      api = directTransport(user.id);
    }
    console.log(`transport: ${api.name}`);

    let r = await api.get();
    await check("signed-in GET → empty library", () => {
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(r.body, { user: user.id, research: [], idea: [], notes: {} });
    });

    r = await api.ops({
      ops: [
        { type: "saved", kind: "research", slug: "habit-tracking", saved: true },
        { type: "saved", kind: "idea", slug: "habit-tracking-1", saved: true },
        { type: "saved", kind: "idea", slug: "interior-design-1", saved: true },
        { type: "note", kind: "idea", slug: "habit-tracking-1", text: "мысль" },
        { type: "saved", kind: "idea", slug: "no-such-idea", saved: true },
        { type: "note", kind: "research", slug: "habit-tracking", text: "x".repeat(20_001) },
      ],
    });
    await check("POST ops: valid applied, unknown slug / long note rejected by index", () => {
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const b = r.body as { applied: number; rejected: { index: number }[] };
      assert.equal(b.applied, 4);
      assert.deepEqual(
        b.rejected.map((x) => x.index),
        [4, 5],
      );
    });

    r = await api.get();
    await check("GET: bookmarks newest first, note stored", () => {
      const b = r.body as Lib;
      assert.deepEqual(b.research, ["habit-tracking"]);
      assert.deepEqual(b.idea, ["interior-design-1", "habit-tracking-1"]);
      assert.deepEqual(b.notes, { "idea:habit-tracking-1": "мысль" });
    });

    r = await api.ops({ ops: Array(201).fill({ type: "saved", kind: "idea", slug: "habit-tracking-2", saved: true }) });
    await check("POST > 200 ops → 400", () => assert.equal(r.status, 400));
    r = await api.ops({ nope: 1 });
    await check("POST malformed body → 400", () => assert.equal(r.status, 400));

    r = await api.merge({
      research: ["interior-design", "habit-tracking", "qr-scanner"],
      idea: ["interior-design-2"],
      notes: { "idea:habit-tracking-1": "вторая заметка", "research:interior-design": "про интерьер", "idea:bogus": "x" },
    });
    await check("merge: union, account order kept, new items newest, notes combined, unknown dropped", () => {
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const b = r.body as Lib;
      assert.equal(b.user, user.id);
      assert.deepEqual(b.research, ["interior-design", "habit-tracking"]);
      assert.deepEqual(b.idea, ["interior-design-2", "interior-design-1", "habit-tracking-1"]);
      assert.deepEqual(b.notes, {
        "idea:habit-tracking-1": "мысль\n\nвторая заметка",
        "research:interior-design": "про интерьер",
      });
    });

    await api.ops({
      ops: [
        { type: "note", kind: "research", slug: "interior-design", text: "   " },
        { type: "saved", kind: "idea", slug: "habit-tracking-1", saved: false },
      ],
    });
    r = await api.get();
    await check("blank note deletes; unbookmarking keeps the note", () => {
      const b = r.body as Lib;
      assert.deepEqual(b.idea, ["interior-design-2", "interior-design-1"]);
      assert.deepEqual(b.notes, { "idea:habit-tracking-1": "мысль\n\nвторая заметка" });
    });
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    const left = (await prisma.siteSaved.count({ where: { userId: user.id } })) + (await prisma.siteNote.count({ where: { userId: user.id } }));
    await prisma.$disconnect();
    console.log(`cleanup: test user deleted (${left} library rows left)`);
  }
  console.log(`${passed} checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
