// Sign-in return-path validation (docs/site-v2/AUDIT-PHASE-A.md A5).
// Run: npm run test:safe-return   (= node --import tsx scripts/v2/test-safe-return.ts)
//
// 1. src/lib/safeReturn.ts — the shared validator: what it rejects and what it keeps.
// 2. The regression: values the old check (`startsWith("/") && !startsWith("//")`) let
//    through really do leave the origin in a WHATWG URL parser, and are rejected now.
// 3. src/site/routing.ts isSafeReturnPath delegates to it (login page, sign-in dialog).
// 4. GET /api/auth/google/start stores only a safe path in the g_oauth_return cookie.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isSafeLocalPath, safeLocalPath, MAX_RETURN_PATH_LENGTH } from "../../src/lib/safeReturn";
import { isSafeReturnPath } from "../../src/site/routing";

const SITE = "https://inapp.pro";

/** [value, why] — every one of these must be rejected. */
const REJECT: Array<[unknown, string]> = [
  // Not a string / empty
  [undefined, "missing"],
  [null, "null"],
  ["", "empty"],
  [["/ru/a", "/ru/b"], "array from ?return_to=a&return_to=b"],
  [42, "number"],
  [{ toString: () => "/ru" }, "object"],
  // Absolute and scheme URLs
  ["https://evil.com", "absolute https"],
  ["http://evil.com/ru", "absolute http"],
  ["HTTPS://evil.com", "absolute, upper-case scheme"],
  ["javascript:alert(1)", "javascript: scheme"],
  ["data:text/html,<script>alert(1)</script>", "data: scheme"],
  ["evil.com", "bare host"],
  ["ru/segment", "relative path"],
  [" /ru", "leading space"],
  ["\t//evil.com", "leading tab"],
  // Protocol-relative and backslash
  ["//evil.com", "protocol-relative"],
  ["///evil.com", "triple slash"],
  ["//evil.com/ru/segment", "protocol-relative with path"],
  ["/\\evil.com", "slash-backslash (browsers read \\ as /)"],
  ["\\\\evil.com", "double backslash"],
  ["/\\/evil.com", "slash-backslash-slash"],
  ["/ru\\..\\..\\evil.com", "backslash later in the path"],
  ["/ru/ideas?q=a\\b", "raw backslash in the query"],
  // Control characters (the URL parser drops tab/CR/LF, turning "/\t/x" into "//x")
  ["/\t/evil.com", "tab"],
  ["/\n/evil.com", "line feed"],
  ["/\r/evil.com", "carriage return"],
  ["/\r\n/evil.com", "CRLF"],
  ["/ru\u0000", "NUL"],
  ["/ru/segment\u007f", "DEL"],
  ["/ru\u0085", "C1 control (NEL)"],
  ["/ru\u2028", "line separator"],
  ["/ru/ideas?q=1\nSet-Cookie: a=b", "newline in the query"],
  // Encoded slashes, backslashes and controls (also double/triple encoded)
  ["/%2F%2Fevil.com", "encoded //"],
  ["/%2f/evil.com", "encoded / + /"],
  ["/%2F/evil.com", "encoded / + / (upper case)"],
  ["/%5Cevil.com", "encoded backslash"],
  ["/%5cevil.com", "encoded backslash (lower case)"],
  ["/%252F%252Fevil.com", "double-encoded //"],
  ["/%25252F%25252Fevil.com", "triple-encoded //"],
  ["/%255Cevil.com", "double-encoded backslash"],
  ["/%%32%66%%32%66evil.com", "split escapes that decode into %2f%2f"],
  ["/%09/evil.com", "encoded tab"],
  ["/%0d%0aSet-Cookie:%20a=b", "encoded CRLF (header injection)"],
  ["/ru/a%2F%2Fb", "encoded empty segment mid-path"],
  ["/ru//segment", "empty segment mid-path"],
  // Dot segments
  ["/.//evil.com", "dot segment that resolves to //evil.com"],
  ["/./ru", "single dot segment"],
  ["/ru/../../evil.com", "dot-dot segments"],
  ["/ru/..", "trailing dot-dot"],
  ["/%2e%2e/%2e%2e/evil.com", "encoded dot-dot segments"],
  ["/%2e/%2fevil.com", "encoded dot + encoded slash"],
  ["/.%2e/ru", "half-encoded dot-dot"],
  // Userinfo tricks
  ["//user:pass@evil.com", "protocol-relative with userinfo"],
  ["https://inapp.pro@evil.com/", "our host as userinfo"],
  ["/\\user@evil.com", "backslash + userinfo"],
  ["/@evil.com", "@ in the path"],
  ["/%40evil.com", "encoded @ in the path"],
  ["/ru/x@evil.com", "@ later in the path"],
  // Machine endpoints (the proxy rewrites /<L>/<rest> and /<L>/old/<rest> to /<rest>)
  ["/api", "api root"],
  ["/api/auth/logout", "api route"],
  ["/API/me", "api route, upper case"],
  ["/%61pi/me", "api route, encoded letter"],
  ["/api/auth/google/start?return_to=//evil.com", "chained sign-in"],
  ["/ru/api/auth/google/start", "api via locale rewrite"],
  ["/ru/old/api/me", "api via archive rewrite"],
  ["/_next/static/chunks/main.js", "_next asset"],
  ["/en/_next/data/x.json", "_next via locale rewrite"],
  // Too long
  ["/" + "a".repeat(MAX_RETURN_PATH_LENGTH), "longer than the limit"],
  ["/ru?q=" + "x".repeat(5000), "long query"],
];

/** Same-site paths the sign-in flows must keep, unchanged. */
const ACCEPT: string[] = [
  "/",
  "/ru",
  "/ru/",
  "/ru/old/tokens",
  "/de/segment/x?q=1#a",
  "/ru/old/segment/qr-scanner",
  "/en/ideas?q=sleep%20tracker&category=health",
  "/ru/segment?q=https%3A%2F%2Fexample.com",
  "/ru/ideas?q=//x",
  "/ja/segment/habit-tracking#toc",
  "/ru/emmo-%E6%97%A5%E8%AE%B0%E4%B8%8E%E7%AC%94%E8%AE%B0",
  "/ru/emmo-日记与笔记",
  "/ru/free-vpn-by-free-vpn-orgTM",
  "/ru/reviews/fitness/1234567890",
  "/rating/fitness",
  "/en/library?checkout=ok",
  "/ru/login?return_to=%2Fru%2Fsaved",
  "/?auth=google_error",
  "/cards",
  "/ru/segment/a%2Fb",
  "/ru/apis",
  "/ru/ideas/api-client-1",
  "/ru/100%",
  "/ru/x.y",
  "/ru/...",
  "/fr/saved?filter=notes&q=%C3%A9t%C3%A9",
  "/" + "a".repeat(MAX_RETURN_PATH_LENGTH - 1),
];

describe("isSafeLocalPath: rejects", () => {
  for (const [value, why] of REJECT) {
    test(`${why}: ${JSON.stringify(value)?.slice(0, 80)}`, () => {
      assert.equal(isSafeLocalPath(value), false);
      assert.equal(safeLocalPath(value), "/");
      assert.equal(safeLocalPath(value, "/cards"), "/cards");
    });
  }
});

describe("isSafeLocalPath: accepts same-site paths unchanged", () => {
  for (const value of ACCEPT) {
    test(JSON.stringify(value).slice(0, 80), () => {
      assert.equal(isSafeLocalPath(value), true);
      assert.equal(safeLocalPath(value, "/cards"), value);
      // And the browser really stays on the site.
      assert.equal(new URL(value, SITE).origin, SITE);
    });
  }
});

describe("regression: the old check let these leave the origin", () => {
  const oldCheck = (p: string) => p.startsWith("/") && !p.startsWith("//");
  const escaped = ["/\\evil.example", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\\/evil.com", "/\t\\evil.com"];
  for (const p of escaped) {
    test(JSON.stringify(p), () => {
      assert.equal(oldCheck(p), true, "the old check accepted it");
      assert.notEqual(new URL(p, SITE).origin, SITE, "a WHATWG URL parser resolves it to another origin");
      assert.equal(isSafeLocalPath(p), false, "the new validator rejects it");
    });
  }
  test("/.//x keeps the origin but has a // pathname (a later relative redirect would leave)", () => {
    assert.equal(new URL("/.//evil.com", SITE).pathname, "//evil.com");
    assert.equal(isSafeLocalPath("/.//evil.com"), false);
  });
});

describe("src/site/routing.ts isSafeReturnPath delegates to the shared validator", () => {
  test("same verdicts as isSafeLocalPath", () => {
    for (const [value] of REJECT) {
      if (value === undefined || value === null || typeof value === "string") {
        assert.equal(isSafeReturnPath(value as string | null | undefined), false, JSON.stringify(value));
      }
    }
    for (const value of ACCEPT) assert.equal(isSafeReturnPath(value), true, value);
  });
  test("a runtime array (untyped caller) is rejected, not a crash", () => {
    assert.equal(isSafeReturnPath(["/a", "/b"] as unknown as string), false);
  });
});

describe("GET /api/auth/google/start stores only a safe return path", () => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  delete process.env.APP_ORIGIN;

  async function start(query: string) {
    const { GET } = await import("../../src/app/api/auth/google/start/route");
    const res = await GET(new Request(`${SITE}/api/auth/google/start${query}`));
    const location = res.headers.get("location") ?? "";
    return { res, location, returnCookie: res.cookies.get("g_oauth_return")?.value };
  }

  const cases: Array<[string, string]> = [
    ["?return_to=%2Fru%2Fsegment%2Fhabit-tracking%3Fq%3D1", "/ru/segment/habit-tracking?q=1"],
    ["?return_to=%2F%5Cevil.example", "/"],
    ["?return_to=%2F%09%2Fevil.com", "/"],
    ["?return_to=%2F%0A%2Fevil.com", "/"],
    ["?return_to=%2F%2Fevil.com", "/"],
    ["?return_to=https%3A%2F%2Fevil.com", "/"],
    ["?return_to=%2F.%2F%2Fevil.com", "/"],
    ["?return_to=%2Fapi%2Fauth%2Flogout", "/"],
    ["?return_to=%2Fru%2Fa&return_to=%2F%2Fevil.com", "/ru/a"],
    ["?return_to=%2F%2Fevil.com&return_to=%2Fru%2Fa", "/"],
    ["", "/"],
  ];
  for (const [query, expected] of cases) {
    test(`${query || "(no return_to)"} → cookie ${expected}`, async () => {
      const { res, location, returnCookie } = await start(query);
      assert.equal(res.status, 307);
      assert.ok(location.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"), location);
      assert.equal(returnCookie, expected);
    });
  }
});
