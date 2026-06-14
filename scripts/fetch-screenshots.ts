import { readFileSync, writeFileSync } from "node:fs";

// Scraped ext-* apps were onboarded without screenshots, so their insight pages
// show an empty strip. This backfills screenshots from the iTunes Lookup API
// (the appleId is embedded as ext-<appleId>) into categories-meta.json.
// Re-runnable: only fills entries that still have no screenshots.

const FILE = "src/data/categories-meta.json";
type Meta = { productId?: string; screenshots?: string[]; name?: string };
const meta = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Meta>;

// Unique ext-* productIds that still lack screenshots.
const targets = new Map<string, string>(); // pid -> appleId
for (const m of Object.values(meta)) {
  const pid = m.productId;
  if (!pid || !pid.startsWith("ext-")) continue;
  if (m.screenshots && m.screenshots.length) continue;
  const appleId = pid.slice(4);
  if (/^\d+$/.test(appleId)) targets.set(pid, appleId);
}
console.log(`ext-* без скриншотов: ${targets.size}`);

async function lookup(appleId: string, country: string): Promise<string[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${appleId}&country=${country}`);
    if (!res.ok) return [];
    const j = (await res.json()) as { results?: Array<{ screenshotUrls?: string[]; ipadScreenshotUrls?: string[] }> };
    const r = j.results?.[0];
    if (!r) return [];
    const shots = (r.screenshotUrls?.length ? r.screenshotUrls : r.ipadScreenshotUrls) ?? [];
    return shots.slice(0, 8);
  } catch {
    return [];
  }
}

async function main() {
  let filled = 0;
  const stillEmpty: string[] = [];
  for (const [pid, appleId] of targets) {
    let shots: string[] = [];
    for (const country of ["us", "ru", "gb", "de"]) {
      shots = await lookup(appleId, country);
      if (shots.length) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    if (shots.length) {
      for (const m of Object.values(meta)) if (m.productId === pid) m.screenshots = shots;
      filled++;
    } else {
      stillEmpty.push(`${pid}`);
    }
    await new Promise((r) => setTimeout(r, 350));
  }

  writeFileSync(FILE, JSON.stringify(meta, null, 2) + "\n");
  console.log(`✅ заполнено: ${filled}/${targets.size}`);
  if (stillEmpty.length) console.log(`без скринов в App Store (${stillEmpty.length}): ${stillEmpty.join(", ")}`);
}

main();
