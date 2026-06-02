import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

// Server-only: reads the locale cookie. Kept separate from i18n.ts so the pure
// dictionary/helpers stay importable from client components.
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ru" ? "ru" : "en";
}
