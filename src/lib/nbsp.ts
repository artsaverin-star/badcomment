// Lightweight, client-safe non-breaking-space binder for hardcoded RU UI strings
// (typograf via deepTg handles server-passed prose; this is for inline JSX copy).
// Binds short prepositions/conjunctions to the next word so they never hang at a
// line end. Token-based so it handles consecutive short words too.
const NBSP = String.fromCharCode(0xa0);
const SHORT = new Set(
  "в во на за до по из к ко с со о об у и а но или что как же бы ли не для под над при от это".split(" "),
);

export function nb(s: string): string {
  const words = s.split(" ");
  let out = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1].replace(/^[«"(]+/, "").toLowerCase();
    out += (SHORT.has(prev) ? NBSP : " ") + words[i];
  }
  return out;
}
