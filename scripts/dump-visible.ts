import { getIdeaCards } from "../src/lib/queries";

async function main() {
  const cards = await getIdeaCards(500, null, true);
  for (const c of cards) {
    const s = c.summary;
    console.log(
      JSON.stringify({
        id: c.id,
        name: c.name,
        cat: c.categoryLabel,
        type: s?.opportunityType ?? null,
        cloneable: s?.cloneable ?? null,
        build: s?.buildability ?? null,
        profit: s?.profit ?? null,
        verdict: s?.verdict ?? null,
        monet: s?.monetization ?? null,
      }),
    );
  }
  console.log(`# total: ${cards.length}`);
}

main().then(() => process.exit(0));
