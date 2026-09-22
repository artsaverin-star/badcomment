import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { CONTENT_ROOT } from "../content/root";
import type { Locale } from "./locales";
import { makeT, type T, type UIPack } from "./translate";

// Server-side UI strings: content/v2/<L>/ui.json, produced by scripts/v2/import-app-content.ts
// (spec 04 §7.3 UIFile). Read with fs — never imported statically, so no locale is bundled.
//
//   const t = await getT(L);
//   t("Разборы")                      → "Breakdowns"
//   t("Найдено: %1$@", [12])          → "Found: 12"
//   t.count("отзыв", 18442)           → "18,442 reviews"
//   <I18nProvider locale={L} strings={t.pick(KEYS)}>  → the same strings for client components
//
// A missing file (dev before the content import) degrades to the built-in shell strings and
// then the Russian key, with one warning per locale — it never throws.

const RETRY_MISSING_MS = 10_000;

type Entry = { at: number; pack: Promise<UIPack | null> };
const packs = new Map<Locale, Entry>();
const warned = new Set<Locale>();

async function readPack(locale: Locale): Promise<UIPack | null> {
  try {
    const raw = await readFile(path.join(CONTENT_ROOT, locale, "ui.json"), "utf8");
    const pack = JSON.parse(raw) as UIPack;
    if (!pack || typeof pack.strings !== "object") throw new Error("malformed ui.json");
    return pack;
  } catch (err) {
    if (!warned.has(locale)) {
      warned.add(locale);
      const reason = (err as NodeJS.ErrnoException)?.code === "ENOENT" ? "missing" : String(err);
      console.warn(`[site/i18n] content/v2/${locale}/ui.json ${reason}; using fallback strings`);
    }
    return null;
  }
}

/** The parsed ui.json for a locale (cached; a missing file is retried every 10 s). */
export function loadUIPack(locale: Locale): Promise<UIPack | null> {
  const hit = packs.get(locale);
  const now = Date.now();
  if (hit) {
    // Keep good packs forever (content changes ship with a deploy); retry misses.
    return hit.pack.then((p) => {
      if (p || now - hit.at < RETRY_MISSING_MS) return p;
      packs.delete(locale);
      return loadUIPack(locale);
    });
  }
  const pack = readPack(locale).then((p) => {
    if (p) warned.delete(locale);
    return p;
  });
  packs.set(locale, { at: now, pack });
  return pack;
}

/** Request-scoped translator for a locale: t(ruKey, vars?) with fallback own → base → en. */
export const getT = cache(async (locale: Locale): Promise<T> => {
  const [own, english] = await Promise.all([
    loadUIPack(locale),
    locale === "en" || locale === "ru" ? Promise.resolve(null) : loadUIPack("en"),
  ]);
  return makeT(locale, own, locale === "en" ? own : english);
});
