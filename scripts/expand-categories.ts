import { readFileSync, writeFileSync } from "node:fs";
import appStore from "app-store-scraper";

// Expand every sub-category from ~10 apps to ~25 by asking the App Store for
// apps "similar" to each of its top-5 existing apps, collecting results,
// scoring by frequency-of-appearance across the seeds, and adding the top N
// that aren't already used in any category (global appleId dedup).
//
// Goal: scale the curated taxonomy from ~650 apps to ~1500-2000 without
// hand-authoring each app name.
//
// Usage: npx tsx scripts/expand-categories.ts [targetPerCategory=25]

const TARGET = Number(process.argv[2] ?? 25);
const SEEDS_PER_CAT = 5;
const SLEEP_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Domain = { slug: string; categories: Category[] };
type Category = { slug: string; ru: object; en: object; apps: string[] };
type AppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string;
};
type StoreResult = { id: number; title: string; icon: string; developer: string; appId?: string };

const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Domain[];
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8")) as Record<string, AppMeta>;

const usedAppleIds = new Set<number>();
for (const m of Object.values(meta)) if (m.appleId) usedAppleIds.add(m.appleId);
console.log(`Starting with ${usedAppleIds.size} unique appleIds globally`);

async function main() {
  let totalAdded = 0;
  for (const d of domains) {
    for (const c of d.categories) {
      const target = TARGET - c.apps.length;
      if (target <= 0) {
        console.log(`  skip ${c.slug} — already ${c.apps.length}`);
        continue;
      }

      const seedIds = c.apps
        .map((q) => meta[`${c.slug}:${q}`]?.appleId)
        .filter((id): id is number => !!id && id > 0)
        .slice(0, SEEDS_PER_CAT);

      if (seedIds.length === 0) {
        console.log(`  skip ${c.slug} — no seed appleIds`);
        continue;
      }

      // Collect similar by frequency across seeds
      const candidates = new Map<number, { count: number; result: StoreResult }>();
      for (const id of seedIds) {
        try {
          const similar = (await appStore.similar({ id, country: "us" })) as StoreResult[];
          for (const r of similar) {
            if (!r.id || usedAppleIds.has(r.id)) continue;
            const existing = candidates.get(r.id);
            if (existing) existing.count++;
            else candidates.set(r.id, { count: 1, result: r });
          }
        } catch (e) {
          console.error(`    similar(${id}) failed: ${(e as Error).message}`);
        }
        await sleep(SLEEP_MS);
      }

      const top = [...candidates.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[0] - b[0])
        .slice(0, target);

      let added = 0;
      for (const [appleId, { result }] of top) {
        const newQuery = result.title;
        const metaKey = `${c.slug}:${newQuery}`;
        if (meta[metaKey]) continue;
        meta[metaKey] = {
          query: newQuery,
          name: result.title,
          icon: result.icon,
          appleId,
          bundleId: result.appId ?? null,
          developer: result.developer,
        };
        c.apps.push(newQuery);
        usedAppleIds.add(appleId);
        added++;
      }
      totalAdded += added;
      console.log(`  ${c.slug}: +${added} → ${c.apps.length}`);

      // Persist after each category
      writeFileSync("src/data/categories.json", JSON.stringify(domains, null, 2));
      writeFileSync("src/data/categories-meta.json", JSON.stringify(meta, null, 2));
    }
  }
  console.log(`\nTotal added: ${totalAdded}`);
  const totalApps = domains.reduce((s, d) => s + d.categories.reduce((ss, c) => ss + c.apps.length, 0), 0);
  console.log(`Final total: ${totalApps} apps, ${usedAppleIds.size} unique appleIds`);
}

main().catch((e) => { console.error(e); process.exit(1); });
