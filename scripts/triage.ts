import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { scoreCloneability, isBrandStorefront, isRewardFarm } from "../src/lib/cloneability";
import { categoryLabel } from "../src/lib/categories";

// Inventory-first triage: walk every ingested product and decide IN/OUT with an
// explicit reason, mirroring getIdeaCards' gating but *recording* the drop cause
// instead of silently skipping. Output is a legible per-app table so we can see
// "why each card is in or out" before authoring deep bilingual summaries.
//
// Status:
//   in            — survives all cheap filters; a real authoring candidate
//   thin          — fewer than MIN_COMPLAINTS negative reviews (no signal yet)
//   storefront    — single-brand/chain/carrier storefront (not a standalone app)
//   rewardfarm    — get-paid-to / reward farm (not a buildable product)
//   no-category   — product has no category mapping
//
// Run on prod:
//   DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/triage.ts

const MIN_COMPLAINTS = 4;

type Status = "in" | "thin" | "storefront" | "rewardfarm" | "no-category";

async function run() {
  const products = await prisma.product.findMany({
    include: {
      listings: {
        select: {
          store: true,
          installs: true,
          ratingCount: true,
          offersIAP: true,
          sizeBytes: true,
          description: true,
          reviews: { select: { themes: true } },
        },
      },
    },
  });

  const rows: {
    name: string;
    category: string;
    stores: string;
    neg: number;
    clone: string;
    summarized: boolean;
    status: Status;
  }[] = [];

  for (const p of products) {
    const neg = p.listings.reduce((s, l) => s + l.reviews.length, 0);
    const stores = [...new Set(p.listings.map((l) => l.store))].join("+");

    const detail =
      p.listings.find((l) => l.store === "google" && l.description) ??
      p.listings.find((l) => l.description) ??
      p.listings[0];

    const clone = scoreCloneability({
      category: p.category,
      description: detail?.description ?? null,
      offersIAP: p.listings.some((l) => l.offersIAP),
      sizeBytes: Math.max(0, ...p.listings.map((l) => Number(l.sizeBytes ?? 0))) || null,
    });

    let status: Status;
    if (!p.category) status = "no-category";
    else if (isBrandStorefront(detail?.description)) status = "storefront";
    else if (isRewardFarm(detail?.description)) status = "rewardfarm";
    else if (neg < MIN_COMPLAINTS) status = "thin";
    else status = "in";

    rows.push({
      name: p.name,
      category: p.category ?? "—",
      stores,
      neg,
      clone: clone.label,
      summarized: p.summary != null,
      status,
    });
  }

  // Per-status tally + per-category IN counts so the funnel is legible.
  const byStatus: Record<string, number> = {};
  const inByCat: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "in") inByCat[r.category] = (inByCat[r.category] ?? 0) + 1;
  }

  // Dump every row as JSONL for downstream authoring/inspection.
  for (const r of rows.sort((a, b) => b.neg - a.neg)) {
    console.log(JSON.stringify(r));
  }

  console.error(`\n=== TRIAGE: ${rows.length} products ===`);
  console.error("by status:", JSON.stringify(byStatus));
  const inRows = rows.filter((r) => r.status === "in");
  console.error(`IN candidates: ${inRows.length} (${inRows.filter((r) => r.summarized).length} already summarized)`);
  console.error(
    "IN by category:",
    JSON.stringify(
      Object.fromEntries(
        Object.entries(inByCat)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [categoryLabel(k), v])
      )
    )
  );
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
