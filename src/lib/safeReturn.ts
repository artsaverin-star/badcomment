// The one validator for "where to send the user after sign-in" (return_to / rt / cookie).
// Client-safe and pure: no Node APIs, no env, no imports. Used by the sign-in API routes
// (Google start + callback, e-mail start + verify) and by the new site (src/site/routing.ts
// isSafeReturnPath → login page, sign-in dialog).
//
// A value is accepted only when it is a same-site path the browser cannot turn into
// another origin, and that does not point at a machine endpoint:
//   ok:  "/", "/ru/old/tokens", "/de/segment/x?q=1#a", "/ru/emmo-%E6%97%A5"
//   no:  non-strings (e.g. an array from ?return_to=a&return_to=b), "", > 2048 chars,
//        anything not starting with "/", "//evil.com", "/\evil.com" (browsers read "\" as "/"),
//        "/\t/evil.com" (the URL parser drops tab/CR/LF), other control chars,
//        "/%2F%2Fevil.com" and "/%255Cevil.com" (encoded, even twice, into "//" or "\"),
//        "/.//evil.com" and "/%2e%2e/x" (dot segments), "/@evil.com" style userinfo bait,
//        "/api/…", "/_next/…" and "/<L>/api/…" (the proxy rewrites /<L>/<rest> to /<rest>).
//
// Only the path is decoded and inspected; the query and fragment are left alone (a search
// for "https://example.com" is a legitimate return), but they may not contain raw control
// chars or backslashes either.

export const MAX_RETURN_PATH_LENGTH = 2048;

/** Resolution base for the final URL-parser check; never shown to anyone. */
const PROBE_ORIGIN = "https://return-path.invalid";

/** C0 controls, DEL, C1 controls, U+2028/2029 and the backslash. */
const FORBIDDEN_CHARS = /[\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

/** Path segments that never make a sign-in destination (compared case-insensitively). */
const BLOCKED_SEGMENTS: ReadonlySet<string> = new Set(["api", "_next"]);

/** Decoding more layers than this is not a real path: reject. */
const MAX_DECODE_ROUNDS = 4;

/**
 * Percent-decodes ASCII escapes (%00–%7F) repeatedly until the string is stable, so
 * "%252F" → "%2F" → "/". Non-ASCII escapes (UTF-8 of CJK/Cyrillic slugs) are left as they
 * are: they can never decode into a delimiter. Returns null when the value keeps changing.
 */
function decodeAsciiEscapes(s: string): string | null {
  let cur = s;
  for (let round = 0; round <= MAX_DECODE_ROUNDS; round++) {
    const next = cur.replace(/%([0-7][0-9a-f])/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    if (next === cur) return cur;
    cur = next;
  }
  return null;
}

/** True when `p` is a same-site path that is safe to redirect or navigate to. */
export function isSafeLocalPath(p: unknown): p is string {
  if (typeof p !== "string") return false;
  if (p.length === 0 || p.length > MAX_RETURN_PATH_LENGTH) return false;
  if (p[0] !== "/") return false;
  if (FORBIDDEN_CHARS.test(p)) return false;

  const cut = p.search(/[?#]/);
  const path = decodeAsciiEscapes(cut === -1 ? p : p.slice(0, cut));
  if (path === null) return false;
  // Encoded "\" or control chars, e.g. "/%5Cevil.com", "/%09/evil.com".
  if (FORBIDDEN_CHARS.test(path)) return false;
  // Empty segments: "//evil.com", "/%2F%2Fevil.com", "/a//b".
  if (path.includes("//")) return false;
  // Userinfo bait ("/@evil.com", "/%40evil.com"); no page of the site has "@" in its path.
  if (path.includes("@")) return false;
  for (const segment of path.split("/")) {
    if (segment === "." || segment === "..") return false;
    if (BLOCKED_SEGMENTS.has(segment.toLowerCase())) return false;
  }

  // Belt and braces: what a WHATWG URL parser (browser, Node, NextResponse.redirect) makes of it.
  let url: URL;
  try {
    url = new URL(p, PROBE_ORIGIN);
  } catch {
    return false;
  }
  return url.origin === PROBE_ORIGIN && !url.username && !url.password && !url.pathname.startsWith("//");
}

/** `p` when it is a safe same-site path (see isSafeLocalPath), else `fallback`. */
export function safeLocalPath(p: unknown, fallback = "/"): string {
  return isSafeLocalPath(p) ? p : fallback;
}
