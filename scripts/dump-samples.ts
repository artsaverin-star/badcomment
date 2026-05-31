import "dotenv/config";
import { getIdeaCards } from "../src/lib/queries";

// Dump compact con/pro review samples for a set of product IDs so Claude can
// author summaries in-session. Usage: tsx scripts/dump-samples.ts <id> <id> ...
// If no IDs given, lists all candidate cards (id, name, category, neg, hasSummary).
async function run() {
  const ids = process.argv.slice(2);
  const cards = await getIdeaCards(2000);

  if (ids.length === 0) {
    const rows = cards.map((c) => ({
      id: c.id,
      name: c.name,
      cat: c.categoryLabel,
      neg: c.negativeCount,
      clone: c.cloneLabel,
      hasSummary: c.summary !== null,
    }));
    console.log(JSON.stringify(rows, null, 0));
    return;
  }

  const byId = new Map(cards.map((c) => [c.id, c]));
  const out = ids.map((id) => {
    const c = byId.get(id);
    if (!c) return { id, missing: true };
    return {
      id: c.id,
      name: c.name,
      cat: c.categoryLabel,
      neg: c.negativeCount,
      clone: c.cloneLabel,
      cloneReasons: c.cloneReasons,
      cons: c.conSamples.map((t) => (t.length > 200 ? t.slice(0, 200) : t)),
      pros: c.proSamples.map((t) => (t.length > 140 ? t.slice(0, 140) : t)),
    };
  });
  console.log(JSON.stringify(out, null, 0));
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
