import { prisma } from "./prisma";
import { THEMES } from "./themes";

export type ThemeStat = { key: string; label: string; count: number };

function countThemes(themeArrays: string[]): ThemeStat[] {
  const counts = new Map<string, number>();
  for (const raw of themeArrays) {
    let keys: string[] = [];
    try {
      keys = JSON.parse(raw);
    } catch {
      keys = [];
    }
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return THEMES.map((t) => ({ key: t.key, label: t.label, count: counts.get(t.key) ?? 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function getApps() {
  return prisma.app.findMany({
    orderBy: { lastScrapedAt: "desc" },
    include: { _count: { select: { reviews: true } } },
  });
}

export async function getGlobalThemeStats(): Promise<ThemeStat[]> {
  const rows = await prisma.review.findMany({ select: { themes: true } });
  return countThemes(rows.map((r) => r.themes));
}

export async function getAppDetail(id: string) {
  const app = await prisma.app.findUnique({
    where: { id },
    include: { reviews: { orderBy: { postedAt: "desc" } } },
  });
  if (!app) return null;
  const themeStats = countThemes(app.reviews.map((r) => r.themes));
  return { app, themeStats };
}
