import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// Fuzzy-match each app name in categories.json against the DB products,
// merging the result into the already-resolved iTunes meta file. Wins:
//   - no API rate-limit (everything is local SQL)
//   - we reuse the icons + canonical names that were ingested over weeks
//   - the matched productId lets the future insights pipeline link straight
//     into the DB (and the page can render the existing product's icon)
//
// Run on prod: DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/resolve-from-db.ts

const prisma = new PrismaClient();

type Category = { slug: string; apps: string[] };
type Domain = { slug: string; categories: Category[] };
type AppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string; // matched DB product if any
};

const META_PATH = "src/data/categories-meta.json";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function score(query: string, candidate: string): number {
  const q = norm(query);
  const c = norm(candidate);
  if (!q || !c) return 0;
  if (c === q) return 1000;

  const qTokens = q.split(" ").filter(Boolean);
  const cTokens = c.split(" ").filter(Boolean);
  const qSet = new Set(qTokens);
  const cSet = new Set(cTokens);

  // Same set of words, any order ("Notion Calendar" vs "Calendar Notion").
  if (qTokens.length === cTokens.length && qTokens.every((t) => cSet.has(t))) return 950;

  // Brand containment: every word of the SHORTER name appears in the longer one.
  // Require the shorter name to carry >=2 words so generic single tokens
  // ("Google", "AI", "VPN", "Sleep", "Calm") can't swallow every "<word> X"
  // query into one product.
  const [shortT, longSet] = qTokens.length <= cTokens.length ? [qTokens, cSet] : [cTokens, qSet];
  if (shortT.length >= 2 && shortT.every((t) => longSet.has(t))) return 800;

  // Strong Jaccard overlap as a last resort.
  const inter = [...qSet].filter((t) => cSet.has(t)).length;
  const union = new Set([...qSet, ...cSet]).size;
  if (union > 0 && inter / union >= 0.6) return 700;

  return 0;
}

async function main() {
  const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Domain[];
  const categories = domains.flatMap((d) => d.categories);
  const existing: Record<string, AppMeta> = JSON.parse(readFileSync(META_PATH, "utf8") || "{}");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      icon: true,
      developer: true,
      listings: { select: { score: true, ratingCount: true } },
    },
  });
  console.log(`DB products: ${products.length}`);

  // Pre-build a sorted-by-popularity list so ties go to bigger apps
  const popularity = (p: typeof products[number]) =>
    p.listings.reduce((s, l) => s + (l.ratingCount ?? 0), 0);
  products.sort((a, b) => popularity(b) - popularity(a));

  let matched = 0, unmatched = 0;
  for (const cat of categories) {
    for (const app of cat.apps) {
      const key = `${cat.slug}:${app}`;
      // If we already have BOTH meta AND productId from prior runs, skip
      if (existing[key]?.productId) {
        continue;
      }
      let best: { p: typeof products[number]; s: number } | null = null;
      for (const p of products) {
        const s = score(app, p.name);
        if (s === 0) continue;
        if (!best || s > best.s) best = { p, s };
      }
      if (best && best.s >= 600) {
        // Keep iTunes-fetched meta if present, but fill in productId + (icon if missing)
        const prior = existing[key];
        existing[key] = {
          query: app,
          name: prior?.name ?? best.p.name,
          icon: prior?.icon || best.p.icon || "",
          appleId: prior?.appleId ?? 0,
          bundleId: prior?.bundleId ?? null,
          developer: prior?.developer ?? best.p.developer,
          productId: best.p.id,
        };
        matched++;
      } else {
        // No DB match — if iTunes meta exists, leave; otherwise unresolved
        if (!existing[key]) unmatched++;
      }
    }
  }

  writeFileSync(META_PATH, JSON.stringify(existing, null, 2));
  console.log(`matched to DB: ${matched}, still unresolved: ${unmatched}`);
  console.log(`total entries in meta file: ${Object.keys(existing).length}`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
