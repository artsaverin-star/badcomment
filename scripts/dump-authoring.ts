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
//   AUTHOR_OFFSET=60    skip the first N (paginate the queue across batches)
//   AUTHOR_SCREEN=1     compact rows (12 short cons / 4 pros) — enough to both
//                       classify a card AND author it without a second fetch

const trunc = (s: string, n: number) => {
  const c = s.replace(/\s+/g, " ").trim();
  return c.length > n ? c.slice(0, n - 1) + "…" : c;
};

async function run() {
  const onlyNew = process.env.AUTHOR_ONLY_NEW === "1";
  const screen = process.env.AUTHOR_SCREEN === "1";
  const limit = Number(process.env.AUTHOR_LIMIT ?? 0) || 0;
  const offset = Number(process.env.AUTHOR_OFFSET ?? 0) || 0;

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
    cons: screen ? c.conSamples.slice(0, 12).map((t) => trunc(t, 150)) : c.conSamples,
    pros: screen ? c.proSamples.slice(0, 4).map((t) => trunc(t, 120)) : c.proSamples,
  }));

  if (onlyNew) feed = feed.filter((c) => !c.authored);
  if (offset > 0) feed = feed.slice(offset);
  if (limit > 0) feed = feed.slice(0, limit);

  for (const c of feed) {
    if (screen) {
      console.log(
        JSON.stringify({
          id: c.id,
          name: c.name,
          category: c.category,
          demand: c.demand,
          clone: c.clone,
          neg: c.neg,
          score: c.score,
          cons: c.cons,
          pros: c.pros,
        })
      );
    } else {
      console.log(JSON.stringify(c));
    }
  }
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
