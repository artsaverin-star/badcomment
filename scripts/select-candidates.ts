import { readFileSync, writeFileSync } from "node:fs";

// Turn the raw harvest pool into the working set we'll actually ingest. Drops
// obvious non-indie targets cheaply (giants + infra/security/cleaner, dating &
// other network-effect, smart-home hardware, named streamers) and then takes a
// demand-ranked top-N per category, weighting slots toward categories where a
// small team can actually win. Real buildability/profit is decided later at
// triage from descriptions+reviews — this is just a smart, cheap funnel.

type Cand = {
  slug: string;
  name: string;
  category: string;
  google?: string;
  apple?: string;
  developer: string | null;
  bestRank: number;
  collections: string[];
  inGrossing: boolean;
  giantDev: boolean;
  rank: number;
};

const DROP: { label: string; re: RegExp }[] = [
  { label: "infra/security/cleaner", re: /\b(vpn|antivirus|anti[\s-]?virus|malware|spyware|avg|avast|norton|mcafee|kaspersky|bitdefender|surfshark|nordvpn|expressvpn|proton\s?vpn|cleaner|clean[\s-]?up|cleanup|booster|junk files?|cache clean|battery saver|speed up phone)\b/i },
  { label: "dating/network", re: /\b(dating|tinder|hinge|bumble|grindr|okcupid|hookup|meet (new )?people|find love|singles near)\b/i },
  { label: "smart-home hardware", re: /\b(wyze|arlo|blink|tapo|ring|kasa|smartthings|home monitor|security camera|video doorbell|smart home|baby monitor|nanny cam|surveillance|dashcam|dash cam)\b/i },
  { label: "streamer/IPTV", re: /\b(hbo|netflix|disney|hulu|peacock|paramount|crunchyroll|sling tv|fubo|iptv|directv|youtube tv|prime video|apple tv|reelshort|dramabox|netshort|goodshort)\b/i },
];

const HIGH = new Set(["utilities", "health", "education", "productivity", "photo", "business", "food"]);
const HIGH_CAP = Number(process.env.SELECT_HIGH_CAP ?? 130);
const LOW_CAP = Number(process.env.SELECT_LOW_CAP ?? 35);

function dropReason(c: Cand): string | null {
  if (c.giantDev) return "giant";
  for (const d of DROP) if (d.re.test(c.name)) return d.label;
  return null;
}

function main() {
  const pool: Cand[] = JSON.parse(readFileSync("harvest.json", "utf8"));
  const kept: Cand[] = [];
  const dropped: Record<string, number> = {};
  for (const c of pool) {
    const r = dropReason(c);
    if (r) {
      dropped[r] = (dropped[r] ?? 0) + 1;
      continue;
    }
    kept.push(c);
  }

  const byCat: Record<string, Cand[]> = {};
  for (const c of kept) (byCat[c.category] ??= []).push(c);

  const selected: Cand[] = [];
  const perCat: Record<string, number> = {};
  for (const [cat, list] of Object.entries(byCat)) {
    list.sort((a, b) => a.bestRank - b.bestRank || Number(b.inGrossing) - Number(a.inGrossing));
    const cap = HIGH.has(cat) ? HIGH_CAP : LOW_CAP;
    const take = list.slice(0, cap);
    selected.push(...take);
    perCat[cat] = take.length;
  }

  const out = selected.map((c) => ({
    store: c.google ? "google" : "apple",
    google: c.google ?? null,
    apple: c.apple ?? null,
    name: c.name,
    developer: c.developer,
    category: c.category,
    bestRank: c.bestRank,
  }));
  writeFileSync("selected.json", JSON.stringify(out, null, 2));

  console.log(`pool ${pool.length} → kept ${kept.length} → selected ${selected.length}`);
  console.log("dropped:", JSON.stringify(dropped));
  console.log("selected by category:", JSON.stringify(perCat));
  const both = selected.filter((c) => c.google && c.apple).length;
  console.log(`cross-store (will ingest both): ${both}`);
}

main();
