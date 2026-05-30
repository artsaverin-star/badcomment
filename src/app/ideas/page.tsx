import Link from "next/link";
import IdeaCardList from "@/components/IdeaCardList";
import { getIdeaCards } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const cards = await getIdeaCards(60);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Home
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold">Idea deck</h1>
        <p className="text-sm text-neutral-500">
          Proven apps that still have obvious gaps, sorted by demand vs. how much
          there is to fix. Each card shows what users love and what to improve.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No ideas yet — run the ingest to collect reviews first.
        </p>
      ) : (
        <IdeaCardList cards={cards} />
      )}
    </main>
  );
}
