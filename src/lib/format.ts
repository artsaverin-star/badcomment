// Client-safe formatting helpers. Kept out of queries.ts (which imports Prisma /
// scrapers and must never reach the client bundle) so feed/detail components can
// format numbers without dragging server-only code along.
// Russian count agreement: plural(72, "ниша", "ниши", "ниш") → "ниши".
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  if (a >= 11 && a <= 14) return many;
  const b = a % 10;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}
