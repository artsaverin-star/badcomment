// Version stamp for the keyless RU-translation run (Review.translationVersion).
// Mirrors needsVersion: a row is only (re)dumped when its stamp differs from
// this, so runs are idempotent and resumable. Bump to force a full re-translate.
export const TRANSLATION_VERSION = "ru-1";

// A review already written in Russian needs no translation. Cyrillic presence is
// a cheap, reliable EN-vs-RU signal for the app-store corpus.
export function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}
