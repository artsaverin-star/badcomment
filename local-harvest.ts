// Local two-store harvester — bypasses prod-box rate limits by running from the dev IP.
// Usage: npx tsx local-harvest.ts <productId> <appleId|-> <googleId|-> [countries]
// Writes data/<productId>-reviews.json in calm-filter-compatible shape.
import { writeFileSync } from "node:fs";
import { fetchReviews, type RawReview } from "./src/lib/scrapers";

const [pid, appleId, googleId, countriesArg] = process.argv.slice(2);
const COUNTRIES = (countriesArg ? countriesArg.split(",") : ["us", "gb", "ca", "au", "de", "fr", "it", "es", "nl", "br", "mx", "se", "pl", "in"]);

async function main() {
  const seen = new Map<string, RawReview & { appId: string; store: string; country: string }>();
  for (const store of ["apple", "google"] as const) {
    const sid = store === "apple" ? appleId : googleId;
    if (!sid || sid === "-") continue;
    for (const c of COUNTRIES) {
      try {
        const got = await fetchReviews(store, sid, c, store === "google" ? 2500 : 600);
        for (const r of got) {
          const k = store + ":" + (r.externalId ?? JSON.stringify([r.author, r.postedAt, (r.text || "").slice(0, 40)]));
          if (!seen.has(k)) seen.set(k, { ...r, appId: `local-${sid}`, store, country: c });
        }
        console.error(`  ${store}/${c}: total ${seen.size}`);
      } catch (e) {
        console.error(`  ${store}/${c}: ${(e as Error).message.slice(0, 60)}`);
      }
      if (store === "google" && c === COUNTRIES[2]) break; // google mostly repeats across countries; 3 passes enough
      await new Promise((r) => setTimeout(r, 500));
    }
    if (seen.size >= 4000) break;
  }
  writeFileSync(`data/${pid}-reviews.json`, JSON.stringify([...seen.values()]));
  console.log(`${pid}: ${seen.size} reviews`);
}
main();
