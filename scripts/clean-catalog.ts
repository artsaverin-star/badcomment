import { readFileSync, writeFileSync } from "node:fs";

// One-off cleanup for the two resolver bugs:
//   1. resolve-category-apps.ts used to fall back to the top search hit when no
//      result resembled the query, producing cross-category garbage. We delete
//      those meta entries so a re-run (with the fixed resolver) re-fetches them
//      or leaves them honestly unresolved.
//   2. resolve-from-db.ts collapsed every "<word> X" query onto one product when
//      a short/generic DB name was a prefix. We null the productId on any entry
//      whose productId is shared across >1 distinct app brand, so the fixed
//      resolve-from-db (run on prod) re-assigns them instead of skipping.

const META_PATH = "src/data/categories-meta.json";

type AppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string;
};

// Queries whose resolved app is a clearly different product (manually verified
// against the query => resolved-name list). Brand aliases that happen to be
// correct (e.g. "Interactive Brokers" => "IBKR Mobile", "Apple Notes" =>
// "Notes", "Runway" => "RunwayML") are intentionally NOT listed.
const WRONG = new Set<string>([
  "33Mail Disposable Email",
  "4chan Forum Reader",
  "8a.nu - Climbing Network",
  "Aimchess - Improve at Chess",
  "Amazfit",
  "BabelBark",
  "Bkool Cycling Simulator",
  "Cat Cara",
  "ChessKid",
  "Codeium",
  "Concept",
  "Continue.dev",
  "Covve App",
  "Curio - Listen to Articles Bookmark Manager",
  "DecodeChess",
  "Earkick",
  "EliteSingles",
  "Excalidraw",
  "FineScanner AI",
  "FlipKey by TripAdvisor",
  "Friended: Friendly Reminders",
  "Fuelly - Track and Compare MPG",
  "Hired Talent Search",
  "Lensa Jobs",
  "Lex by Every",
  "Lingumi",
  "Loop Habit Tracker",
  "MacWhisper",
  "Mailtree CRM",
  "Matter — Read Smarter",
  "Mind Luster",
  "Monica - Personal CRM",
  "Newton Mail",
  "Novlr",
  "OpenCharge - EV Station Finder",
  "Pawsibly - Pet Care Tracker",
  "Pawtrack: Cat GPS Tracker",
  "Plant Jammer",
  "Pocket: Save. Read. Grow.",
  "ProWritingAid",
  "Quik - GoPro Video Editor",
  "Readsy - Reading Tracker",
  "Rytr - AI Writing Assistant",
  "Sanvello",
  "SimpleLogin: Open-Source Email",
  "Skiff Mail",
  "Slay With AI",
  "Snagajob - Hourly Jobs App",
  "Sonix.ai",
  "Stride: Tax Deduction Tracker",
  "tl;dv - AI Meeting Notetaker",
  "Tonfotos",
  "Trading 212",
  "Tweek Calendar: Tasks & Plans",
  "Vectornator: Design Software",
  "Vento Hacker News Reader",
  "Yummly Recipes & Cooking Tools",
  "Youper",
  "Ziteboard",
  // from the alternate detector pass
  "Affinity Photo 2",
  "Peakto Photo Manager",
  "Photo Sense",
  "Sunsama: Daily Planner",
  "Office Lens",
  "Adobe Lightroom",
  "Atlas VPN: secure & fast VPN",
  "Komo Search",
  "Andi - AI Search Engine",
  "Wisdom: Astrology Birth Chart",
  "Hopster Kids TV Shows",
  "Plant Identifier - GardenAnswer",
  "Quit Genius",
  "AlarmMon: Wake Up Alarm Clock",
]);

function main() {
  const meta: Record<string, AppMeta> = JSON.parse(readFileSync(META_PATH, "utf8"));

  // --- Pass 1: delete wrong apple-meta resolutions ---
  let deleted = 0;
  for (const [key, v] of Object.entries(meta)) {
    if (WRONG.has(v.query)) {
      delete meta[key];
      deleted++;
    }
  }

  // --- Pass 2: null productId on cross-brand collisions ---
  const brandOf = (q: string) => q.toLowerCase().split(/[:\-—|(]/)[0].trim();
  const brandsByPid = new Map<string, Set<string>>();
  for (const v of Object.values(meta)) {
    if (!v.productId) continue;
    if (!brandsByPid.has(v.productId)) brandsByPid.set(v.productId, new Set());
    brandsByPid.get(v.productId)!.add(brandOf(v.query));
  }
  const collidedPids = new Set(
    [...brandsByPid.entries()].filter(([, brands]) => brands.size > 1).map(([pid]) => pid),
  );
  let nulled = 0;
  for (const v of Object.values(meta)) {
    if (v.productId && collidedPids.has(v.productId)) {
      delete v.productId;
      nulled++;
    }
  }

  writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  console.log(`deleted wrong apple-meta entries: ${deleted}`);
  console.log(`collided productIds (cross-brand): ${collidedPids.size}`);
  console.log(`entries whose productId was nulled for re-resolve: ${nulled}`);
  console.log(`remaining meta entries: ${Object.keys(meta).length}`);
}

main();
