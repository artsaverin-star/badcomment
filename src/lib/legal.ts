import legal from "@/data/legal.json";

// Single source of truth for the legal/requisite details ЮKassa requires
// (ФИО, ИНН самозанятого, контакты). Fill the three empty fields in
// src/data/legal.json and the оферта/контакты pages pick them up automatically.
export type Legal = typeof legal;

export function getLegal(): Legal {
  return legal as Legal;
}

// True once the real requisites are filled in (so we can show an owner-only
// reminder while they're still blank).
export function legalReady(): boolean {
  // Phone is optional (email is a sufficient contact); ФИО + ИНН are required.
  const l = legal as { fullName: string; inn: string };
  return Boolean(l.fullName && l.inn);
}

export function legalValue(v: string): string {
  return v && v.trim() ? v : "—";
}
