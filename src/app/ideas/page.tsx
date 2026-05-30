import Link from "next/link";
import IdeaCardList from "@/components/IdeaCardList";
import { getIdeaCards } from "@/lib/queries";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const cards = await getIdeaCards(60);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        {tr.nav.home}
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-2xl font-bold">{tr.ideas.title}</h1>
        <p className="text-sm text-neutral-500">{tr.ideas.desc}</p>
      </header>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">{tr.ideas.empty}</p>
      ) : (
        <IdeaCardList cards={cards} locale={locale} />
      )}
    </main>
  );
}
