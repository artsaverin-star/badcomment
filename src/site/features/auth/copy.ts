import type { AuthStrings } from "./strings";

// Picks between sign-in strings. Kept apart from strings.ts so client code can use it without
// bundling the five-locale table (it only needs the page locale's row, see useWeb("auth")).

/** Why the dialog was opened → its lead line. */
export function leadFor(s: AuthStrings, reason: string | null | undefined): string {
  switch (reason) {
    case "plus":
    case "buy":
      return s.leadPlus;
    case "saved":
    case "sync":
    case "save":
    case "note":
      return s.leadSaved;
    case "checkout":
      return s.leadCheckout;
    case "restore":
      return s.leadRestore;
    default:
      return s.leadDefault;
  }
}

/** ?auth=… / ?login=… values that the auth endpoints redirect with (spec 06 §3.2). */
export function noticeFor(s: AuthStrings, auth: string | null | undefined, login: string | null | undefined): string | null {
  if (auth === "google_error") return s.noticeGoogleError;
  if (auth === "google_unconfigured") return s.noticeGoogleUnconfigured;
  if (auth === "vk_failed" || auth === "vk_unconfigured") return s.errGeneric;
  if (login === "expired") return s.noticeLoginExpired;
  return null;
}
