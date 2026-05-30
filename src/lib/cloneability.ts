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
// description. A genuine indie-buildable app won't hit two of these.
const STOREFRONT_SIGNALS: RegExp[] = [
  /\b(mobile order|order ahead|order (online|now)|drive[\s-]?thru|skip the line|curbside|order .{0,24}(delivery|pickup)|pickup option)\b/i,
  /\b(rewards?|loyalty|earn points|redeem|exclusive (deals|offers|coupons)|mobile coupons|member (deals|offers))\b/i,
  /\b(pay (your )?bill|manage (your )?(account|devices?)|data (plan|usage)|wireless|prepaid|(new|your) plan)\b/i,
  /\b(nearest (restaurant|store|location)|find (your )?nearest|store locator|locations? near|find a (store|restaurant|location))\b/i,
];

// True if the store description shows two or more brand-storefront signals,
// i.e. the app is a companion to a physical chain/account, not a standalone
// product an indie could meaningfully recreate.
export function isBrandStorefront(description: string | null | undefined): boolean {
  const text = description ?? "";
  if (!text) return false;
  let hits = 0;
  for (const re of STOREFRONT_SIGNALS) {
    if (re.test(text)) hits++;
    if (hits >= 2) return true;
  }
  return false;
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
