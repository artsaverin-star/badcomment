import Link from "next/link";
import type { IdeaCard } from "@/lib/queries";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };
const COMPLEXITY_STYLE: Record<string, string> = {
  Low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function IdeaCardList({ cards }: { cards: IdeaCard[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            {card.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.icon} alt="" className="h-14 w-14 rounded-xl" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-black/10 dark:bg-white/10" />
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{card.name}</p>
              <p className="truncate text-sm text-neutral-500">{card.demandLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${COMPLEXITY_STYLE[card.complexityLabel]}`}>
              {card.complexityLabel} complexity
            </span>
            {card.stores.map((s) => (
              <span key={s} className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
                {STORE_LABEL[s]}
              </span>
            ))}
            <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
              {card.negativeCount} complaints
            </span>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
              Why build it
            </p>
            {card.pros.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-1">
                {card.pros.map((p) => (
                  <span
                    key={p.key}
                    className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300"
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Proven demand — {card.demandLabel}. An engaged user base already exists.
              </p>
            )}
            {card.proQuote && (
              <p className="mt-1 text-sm italic text-neutral-500">“{card.proQuote}”</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              What to improve
            </p>
            <div className="mb-1 flex flex-wrap gap-1">
              {card.cons.map((c) => (
                <span
                  key={c.key}
                  className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  {c.label} · {c.count}
                </span>
              ))}
            </div>
            {card.conQuote && (
              <p className="mt-1 text-sm italic text-neutral-500">“{card.conQuote}”</p>
            )}
          </div>

          <Link
            href={`/product/${card.id}`}
            className="mt-auto text-sm text-neutral-400 hover:text-red-600 hover:underline"
          >
            See all reviews →
          </Link>
        </li>
      ))}
    </ul>
  );
}
