import "dotenv/config";
import { getIdeaCards } from "../src/lib/queries";

// Authoring feed: for every card that survives the cheap filters (storefront /
// reward-farm / thin / not-cloneable), emit exactly what I need to hand-author a
// bilingual IdeaSummary — the raw review samples plus demand/cloneability
// signals — sorted best-opportunity-first by the computed score. `authored` flags
// cards that already carry hand scores so batches can skip what's done.
//
//   DATABASE_URL=file:/opt/badcomment/data/prod.db npx tsx scripts/dump-authoring.ts
//
// Env:
//   AUTHOR_ONLY_NEW=1   only cards without hand scores yet (the work queue)
//   AUTHOR_LIMIT=40     cap the dump (default: all)

async function run() {
  const onlyNew = process.env.AUTHOR_ONLY_NEW === "1";
  const limit = Number(process.env.AUTHOR_LIMIT ?? 0) || 0;

  const cards = await getIdeaCards(5000, null, false, "ru");
  let feed = cards.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    demand: c.demandLabel,
    avgRating: c.avgRating != null ? Number(c.avgRating.toFixed(2)) : null,
    ratingCount: c.ratingCount,
    clone: c.cloneLabel,
    cloneReasons: c.cloneReasons,
    neg: c.negativeCount,
    score: Number(c.score.toFixed(2)),
    authored: c.buildability != null && c.profit != null,
    cons: c.conSamples,
    pros: c.proSamples,
  }));

  if (onlyNew) feed = feed.filter((c) => !c.authored);
  if (limit > 0) feed = feed.slice(0, limit);

  for (const c of feed) console.log(JSON.stringify(c));
  console.error(
    `\n=== AUTHORING FEED: ${feed.length} cards${onlyNew ? " (new only)" : ""} ===`
  );
  const authored = cards.filter((c) => c.buildability != null).length;
  console.error(`total passing filters: ${cards.length}, already authored: ${authored}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
