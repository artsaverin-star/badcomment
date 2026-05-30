import { categoryComplexity } from "./categories";

// "How hard is this to rebuild?" — a higher score means more effort to clone.
// We start from the category's baseline build-effort and add bumps for
// infrastructure signals mined from the store description + monetization/size,
// returning human-readable reasons so the idea card can be honest about why.

export type Cloneability = {
  score: number; // ~1.0 (trivial) .. ~5.5 (hard)
  label: "Low" | "Medium" | "High"; // effort to clone
  reasons: string[]; // what drives the effort, plainly stated
};

type Signal = { test: RegExp; bump: number; reason: string };

// Order matters only for reason display; all matching signals contribute.
const SIGNALS: Signal[] = [
  {
    test: /\b(sign[\s-]?in|log[\s-]?in|account|sync|cloud|back[\s-]?up|across (your )?devices)\b/i,
    bump: 0.4,
    reason: "Accounts + cloud sync",
  },
  {
    test: /\b(real[\s-]?time|live|instant|push notification)\b/i,
    bump: 0.3,
    reason: "Real-time / live updates",
  },
  {
    test: /\b(chat|messag|friend|communit|social|follow(ers)?|comment|group)\b/i,
    bump: 0.5,
    reason: "Social / messaging layer",
  },
  {
    test: /\b(\bai\b|artificial intelligence|machine learning|recommendation|personali[sz]ed|smart)\b/i,
    bump: 0.5,
    reason: "AI / personalization",
  },
  {
    test: /\b(stream|playback|offline download|podcast|on[\s-]?demand video)\b/i,
    bump: 0.4,
    reason: "Media streaming",
  },
  {
    test: /\b(map|gps|navigation|nearby|geo|location|route)\b/i,
    bump: 0.4,
    reason: "Maps / location",
  },
  {
    test: /\b(payment|bank|debit|credit card|wallet|transfer|invest|crypto|trading)\b/i,
    bump: 0.6,
    reason: "Payments / financial",
  },
  {
    test: /\b(bluetooth|wearable|sensor|scanner|\bar\b|augmented)\b/i,
    bump: 0.4,
    reason: "Hardware / device integration",
  },
];

const MAX_BUMP = 2.5;
const LARGE_APP_BYTES = 200 * 1024 * 1024; // 200 MB

// Single-brand storefront / loyalty / carrier apps: technically simple but
// pointless to "rebuild" because they're a thin client for a real-world
// business (fast-food chains, banks, carriers, retailers). The LLM judges
// this unreliably, so we detect it deterministically from the store
// description.

// HARD signals: each is alone-sufficient — language that only ever describes
// a thin client for a physical chain / regulated account, never a standalone
// product an indie could meaningfully recreate.
const HARD_BRAND: RegExp[] = [
  // Physical-location ordering (fast food / retail)
  /\b(mobile order|order ahead|order (online|now)|re[\s-]?order|drive[\s-]?thru|curb[\s-]?side|carry[\s-]?out|order .{0,40}(delivery|pickup)|pickup option|in[\s-]the[\s-]restaurant)\b/i,
  // Carrier / device account
  /\b(data (plan|usage)|wireless (carrier|plan|account)|prepaid plan|switch to (t[\s-]?mobile|at&t|verizon|sprint)|t[\s-]?mobile tuesday)\b/i,
  // Store / restaurant locator
  /\b(nearest (restaurant|store|location)|find (your )?nearest|store locator|find a (store|restaurant|location))\b/i,
  // Regulated bank / money account
  /\b(member fdic|not a bank|fee[\s-]free banking|deposit checks?|mobile (banking|deposit)|routing number)\b/i,
  // Airline
  /\b(boarding pass|book (a )?flights?|baggage|frequent flyer|admirals club)\b/i,
  // Hotel
  /\b(book (a )?hotels?|earn points when you stay|digital key)\b/i,
  // Ticketing marketplace
  /\b(buy,? (and )?sell[^.]{0,15}tickets|tickets to (live|events|concerts|sports))\b/i,
];

// SOFT signals: weaker brand tells. Two or more (or one HARD) flags the app.
const SOFT_BRAND: RegExp[] = [
  /\b(rewards?|loyalty|earn points|redeem (your )?points|exclusive (deals|offers|coupons)|mobile coupons|member[\s-]only)\b/i,
  /\b(footlong|combo meal|whopper|nuggets|value menu)\b/i,
  /\bmanage (your )?account\b/i,
];

// True if the app is a companion to a physical chain/account rather than a
// standalone product worth rebuilding.
export function isBrandStorefront(description: string | null | undefined): boolean {
  const text = description ?? "";
  if (!text) return false;
  if (HARD_BRAND.some((re) => re.test(text))) return true;
  return SOFT_BRAND.filter((re) => re.test(text)).length >= 2;
}

// "Get-paid-to" / play-and-earn reward farms: low-quality apps whose whole
// pitch is earning gift cards / cash for games & surveys. They flood the deck
// (lots of ads + payout complaints = high "improvability") but are not real
// product ideas worth rebuilding.
const REWARD_FARM: RegExp[] = [
  /\bget paid to\b/i,
  /\bpaypal payouts?\b/i,
  /\bpaid surveys?\b/i,
  /\breal money games?\b/i,
  /\bcash out (instantly|via|to)\b/i,
  /\bearn (gift cards?|real (money|cash|rewards))\b/i,
  /\bplay (games? )?(and |& )?earn\b/i,
  /\bredeem [^.]{0,30}(gift cards?|paypal)\b/i,
];

export function isRewardFarm(description: string | null | undefined): boolean {
  const text = description ?? "";
  return REWARD_FARM.some((re) => re.test(text));
}

export function scoreCloneability(input: {
  category: string | null | undefined;
  description: string | null | undefined;
  offersIAP: boolean | null | undefined;
  sizeBytes: number | null | undefined;
}): Cloneability {
  const base = categoryComplexity(input.category);
  const text = input.description ?? "";

  const reasons: string[] = [];
  let bump = 0;

  for (const sig of SIGNALS) {
    if (sig.test.test(text)) {
      bump += sig.bump;
      reasons.push(sig.reason);
    }
  }

  if (input.offersIAP) {
    bump += 0.2;
    reasons.push("Subscription / in-app billing");
  }

  if (input.sizeBytes && input.sizeBytes > LARGE_APP_BYTES) {
    const mb = Math.round(input.sizeBytes / (1024 * 1024));
    bump += 0.3;
    reasons.push(`Large app (~${mb} MB native code/assets)`);
  }

  bump = Math.min(bump, MAX_BUMP);
  const score = base + bump;

  let label: Cloneability["label"];
  if (score <= 1.6) label = "Low";
  else if (score <= 2.6) label = "Medium";
  else label = "High";

  if (reasons.length === 0) {
    reasons.push("Mostly UI over local data — weekend-buildable");
  }

  return { score, label, reasons: reasons.slice(0, 4) };
}
