// Collect directly from Apple's public Search API. Never export Astro data.
// Usage: npm run market-players:collect -- [slug ...]
// Each successful niche is checkpointed. --refresh replaces existing snapshots.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const queries = JSON.parse(fs.readFileSync(path.join(root, "src/data/marketPlayerQueries.json"), "utf8"));
const folder = path.join(root, "src/data/marketPlayers");
const args = process.argv.slice(2);
const selected = args.filter((arg) => !arg.startsWith("--"));
const slugs = selected.length ? selected : Object.keys(queries);
for (const slug of slugs) if (!Object.hasOwn(queries, slug)) throw new Error(`Unknown niche: ${slug}`);
fs.mkdirSync(folder, { recursive: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastRequest = 0;
const failures = [];

async function search(term, limit) {
  const url = new URL("https://itunes.apple.com/search");
  url.search = new URLSearchParams({ term, country: "us", media: "software", entity: "software", limit: String(limit), lang: "en_us" }).toString();
  for (let attempt = 0; attempt < 4; attempt++) {
    // Apple's documentation asks for approximately 20 calls/minute or fewer.
    await pause(Math.max(0, 3200 - (Date.now() - lastRequest)));
    lastRequest = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.results)) throw new Error("Invalid Apple response");
      return { rows: body.results.slice(0, limit), sourceUrl: url.toString(), fetchedAt: new Date().toISOString() };
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`Retry ${attempt + 1}: ${term}: ${error.message}`);
      await pause(Math.min(30000, 5000 * 2 ** attempt));
    }
  }
}

function storeApp(raw, fetchedAt) {
  const id = String(raw.trackId);
  if (!/^\d+$/.test(id) || !raw.trackName || !raw.artworkUrl100) throw new Error("Incomplete app identity");
  return {
    appStoreId: id,
    name: raw.trackName,
    developer: raw.artistName || "",
    averageRating: Number.isFinite(raw.averageUserRating) ? raw.averageUserRating : null,
    ratingCount: Number.isFinite(raw.userRatingCount) ? raw.userRatingCount : null,
    iconUrl: raw.artworkUrl100,
    screenshots: (raw.screenshotUrls?.length ? raw.screenshotUrls : raw.ipadScreenshotUrls || []).slice(0, 5),
    screenshotsFetchedAt: fetchedAt,
    screenshotSourceUrl: `https://apps.apple.com/us/app/id${id}`,
  };
}

for (const [index, slug] of slugs.entries()) {
  const target = path.join(folder, `${slug}.json`);
  const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : null;
  if (!args.includes("--refresh") && existing?.source === "Apple App Store" && JSON.stringify(existing.keywords?.map((keyword) => keyword.term)) === JSON.stringify(queries[slug])) {
    console.log(`[${index + 1}/${slugs.length}] ${slug}: already collected`);
    continue;
  }
  try {
    const keywords = [];
    const apps = new Map();
    for (const [queryIndex, term] of queries[slug].entries()) {
      const result = await search(term, queryIndex === 0 ? 20 : 10);
      const seen = new Set();
      const results = [];
      for (const [i, raw] of result.rows.entries()) {
        const app = storeApp(raw, result.fetchedAt);
        if (seen.has(app.appStoreId)) continue;
        seen.add(app.appStoreId);
        results.push({ appStoreId: app.appStoreId, ranking: i + 1 });
        if (!apps.has(app.appStoreId)) apps.set(app.appStoreId, app);
      }
      if (!queryIndex && !results.length) throw new Error(`Empty primary query: ${term}`);
      keywords.push({ term, sourceUrl: result.sourceUrl, resultsFetchedAt: result.fetchedAt, results });
    }
    const snapshot = { source: "Apple App Store", store: "us", platform: "ios", collectedAt: keywords[0].resultsFetchedAt, leaderTerm: queries[slug][0], keywords, apps: [...apps.values()] };
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + "\n");
    fs.renameSync(temporary, target);
    console.log(`[${index + 1}/${slugs.length}] ${slug}: ${apps.size} apps; ${snapshot.apps.filter((app) => !app.screenshots.length).length} without screenshots`);
  } catch (error) {
    failures.push({ slug, error: error.message });
    console.error(`[${index + 1}/${slugs.length}] ${slug}: FAILED ${error.message}`);
  }
}
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1; }
