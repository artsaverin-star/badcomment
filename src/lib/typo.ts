import Typograf from "typograf";

// Typography via typograf — fixes "висячие предлоги" (non-breaking space after
// short prepositions/conjunctions) for RU and EN. We scope it to ONLY the nbsp
// rules so it never rewrites our quotes/dashes (the content already uses « » / —
// deliberately, and review quotes are mixed-language).
const tp = new Typograf({ locale: ["ru", "en-US"] });
tp.disableRule("*");
tp.enableRule("common/nbsp/*");
tp.enableRule("ru/nbsp/*");

export function tg(s: string): string {
  if (!s) return s;
  return tp.execute(s);
}

// Deep-typograf every string in a (serializable) value — used server-side to
// pre-process data passed to client components, so typograf stays out of the
// client bundle. Safe on slugs/ids (nbsp rules only touch prose with spaces).
export function deepTg<T>(value: T): T {
  if (typeof value === "string") return tg(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepTg(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) out[k] = deepTg((value as Record<string, unknown>)[k]);
    return out as T;
  }
  return value;
}
