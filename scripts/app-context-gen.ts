import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Auto-generate app-context/<slug>.json for the top-N apps of a category, so the
// insights pipeline can run at breadth without hand-authoring a context per app.
// Pulls real App Store metadata (description/genre/price) via iTunes lookup,
// uses sibling apps in the category as competitor hints, and a shared
// domain-agnostic GOOD/BAD example bank for extract calibration.
//
// Output:
//   app-context/<slug>.json   (one per processed app)
//   category-pipeline/<catSlug>.json  (manifest: [{slug, productId, appleId, name}])
//   updates src/data/app-slugs.json with new slug -> productId entries
//
// Usage: npx tsx scripts/app-context-gen.ts <categorySlug> [topN=12]

const CAT_SLUG = process.argv[2];
const TOP_N = Number(process.argv[3] ?? 12);
if (!CAT_SLUG) {
  console.error("usage: app-context-gen.ts <categorySlug> [topN=12]");
  process.exit(1);
}

type RawCategory = { slug: string; ru: { name: string }; apps: string[] };
type RawDomain = { categories: RawCategory[] };
type RawMeta = { name: string; appleId: number; developer: string | null; productId?: string };

const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as RawDomain[];
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8")) as Record<string, RawMeta>;
const ratingCache = existsSync("triage/itunes-cache.json")
  ? (JSON.parse(readFileSync("triage/itunes-cache.json", "utf8")) as Record<string, { userRatingCount?: number } | null>)
  : {};
const slugs = JSON.parse(readFileSync("src/data/app-slugs.json", "utf8")) as Record<string, string>;

let cat: RawCategory | undefined;
for (const d of domains) {
  const found = d.categories.find((c) => c.slug === CAT_SLUG);
  if (found) cat = found;
}
if (!cat) {
  console.error(`category ${CAT_SLUG} not found`);
  process.exit(1);
}

// Domain-agnostic calibration examples. Illustrative (not published) — they
// teach the extractor what mechanism-level means. Real published observations
// are extracted from actual reviews with verbatim triggers downstream.
const GOOD_EXAMPLES = [
  {
    rating: 1,
    trigger: "after the update it stopped syncing between my phone and ipad",
    observation: "После обновления ломается синхронизация между устройствами одного пользователя — данные расходятся, и нет ручного способа их свести.",
    specificity: "high",
  },
  {
    rating: 2,
    trigger: "the free trial charged me the full year on day one",
    observation: "Кнопка пробного периода списывает полную годовую подписку сразу, а не в конце триала.",
    specificity: "high",
  },
  {
    rating: 3,
    trigger: "I have to re-enter everything every time the app reopens",
    observation: "Приложение теряет введённые данные при перезапуске — нет автосохранения черновика.",
    specificity: "high",
  },
  {
    rating: 4,
    trigger: "notifications come hours late so the reminder is useless",
    observation: "Пуш-напоминания приходят с задержкой в несколько часов, из-за чего ломается основной сценарий «напомнить вовремя».",
    specificity: "medium",
  },
  {
    rating: 5,
    trigger: "switched from a spreadsheet because I wanted it on my phone",
    observation: "Значимая доля пользователей мигрирует из таблиц/заметок ради мобильного доступа, а не ради уникальных фич.",
    specificity: "medium",
  },
];

const BAD_EXAMPLES = [
  "User says it's too expensive (commodity)",
  "User says it crashed (no specifics)",
  "User loves it / great app (non-information)",
  "User hates ads (commodity)",
  "User wants more features (generic ask)",
  "Subscription auto-renewed (commodity unless a specific deceptive mechanism is described)",
  "Hard to cancel (commodity unless a specific friction flow is described)",
  "Login broken / feature X doesn't work (commodity unless reproducible specifics given)",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40) || "app";
}

const usedSlugs = new Set(Object.keys(slugs));
function uniqueSlug(name: string, appleId: number): string {
  const base = slugify(name);
  if (!usedSlugs.has(base)) {
    usedSlugs.add(base);
    return base;
  }
  const alt = `${base}-${appleId}`.slice(0, 48);
  usedSlugs.add(alt);
  return alt;
}

type LookupRow = {
  trackId: number;
  description?: string;
  primaryGenreName?: string;
  formattedPrice?: string;
  sellerName?: string;
};

async function lookupDetails(ids: number[]): Promise<Map<number, LookupRow>> {
  const byId = new Map<number, LookupRow>();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const url = `https://itunes.apple.com/lookup?country=us&id=${batch.join(",")}`;
    try {
      const res = await fetch(url);
      const json = (await res.json()) as { results: LookupRow[] };
      for (const r of json.results ?? []) byId.set(r.trackId, r);
    } catch (e) {
      console.error(`lookup failed for chunk ${i}: ${(e as Error).message}`);
    }
    await sleep(400);
  }
  return byId;
}

function oneLinerFrom(row: LookupRow | undefined, name: string, domainName: string): string {
  const genre = row?.primaryGenreName ? `${row.primaryGenreName}` : "";
  return `${name} — приложение категории «${domainName}»${genre ? ` (${genre})` : ""}, iOS`;
}

function featuresFrom(row: LookupRow | undefined): string[] {
  const desc = row?.description ?? "";
  if (!desc) return ["основные функции приложения данной категории"];
  // Pull short, feature-ish lines from the store description.
  const lines = desc
    .split(/\n|•|·|•|\. /)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 90 && !/^https?:/i.test(l));
  return lines.slice(0, 6).length ? lines.slice(0, 6) : ["основные функции приложения данной категории"];
}

function pricingFrom(row: LookupRow | undefined): string {
  const p = row?.formattedPrice;
  if (!p || /free|бесплат/i.test(p)) return "бесплатно с встроенными покупками/подпиской (по отзывам)";
  return `${p}; встроенные покупки/подписка возможны`;
}

async function main() {
  if (!cat) return;
  const domainName = cat.ru.name;

  // Resolve apps to {name, appleId, productId}; rank by Apple rating count.
  const candidates = cat.apps
    .map((q) => {
      const m = meta[`${CAT_SLUG}:${q}`];
      if (!m?.appleId) return null;
      const rc = ratingCache[String(m.appleId)]?.userRatingCount ?? 0;
      return {
        query: q,
        name: m.name,
        appleId: m.appleId,
        productId: m.productId ?? `ext-${m.appleId}`,
        developer: m.developer ?? null,
        ratingCount: rc,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, TOP_N);

  const siblings = candidates.map((c) => c.name);
  const details = await lookupDetails(candidates.map((c) => c.appleId));

  mkdirSync("app-context", { recursive: true });
  mkdirSync("category-pipeline", { recursive: true });

  const manifest: { slug: string; productId: string; appleId: number; name: string }[] = [];

  for (const c of candidates) {
    // Reuse an existing slug if this productId already has one.
    let slug = Object.entries(slugs).find(([, pid]) => pid === c.productId)?.[0];
    if (!slug) {
      slug = uniqueSlug(c.name, c.appleId);
      slugs[slug] = c.productId;
    }
    const row = details.get(c.appleId);
    const context = {
      productId: c.productId,
      slug,
      name: c.name,
      domain: domainName,
      oneLiner: oneLinerFrom(row, c.name, domainName),
      pricing: pricingFrom(row),
      keyFeatures: featuresFrom(row),
      competitors: siblings.filter((s) => s !== c.name).slice(0, 10),
      goodObservationExamples: GOOD_EXAMPLES,
      badObservationExamples: BAD_EXAMPLES,
    };
    writeFileSync(`app-context/${slug}.json`, JSON.stringify(context, null, 2) + "\n");
    manifest.push({ slug, productId: c.productId, appleId: c.appleId, name: c.name });
  }

  writeFileSync(`category-pipeline/${CAT_SLUG}.json`, JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync("src/data/app-slugs.json", JSON.stringify(slugs, null, 2) + "\n");

  console.log(`category: ${CAT_SLUG} (${domainName})`);
  console.log(`generated ${manifest.length} app-context files (top ${TOP_N} by rating count)`);
  console.log(`manifest: category-pipeline/${CAT_SLUG}.json`);
  for (const m of manifest) console.log(`  ${m.slug.padEnd(36)} ${m.productId.padEnd(28)} ${m.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
