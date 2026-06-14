import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

// Server-only locale resolution. The proxy (URL /ru|/en prefix) forwards an
// x-locale request header; fall back to the cookie, then English. Kept separate
// from i18n.ts so the pure dictionary/helpers stay importable from client code.
export async function getLocale(): Promise<Locale> {
  const x = (await headers()).get("x-locale");
  if (x === "ru" || x === "en") return x;
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ru" ? "ru" : "en";
}
