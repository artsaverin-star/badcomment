import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import ThemeBars from "@/components/ThemeBars";
import { getCategoriesOverview, getGlobalThemeStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, globalThemes] = await Promise.all([
    getCategoriesOverview(),
    getGlobalThemeStats(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          bad<span className="text-red-600">comment</span>
        </h1>
        <p className="mt-1 text-neutral-500">
          What people hate about popular apps — negative reviews from Google Play
          and the App Store, merged and themed. Find the gaps worth building.
        </p>
      </header>

      <section className="mb-8">
        <Link
          href="/ideas"
          className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 transition hover:border-red-400 dark:border-red-900 dark:bg-red-950/40"
        >
          <div>
            <p className="text-lg font-semibold">Browse the idea deck →</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              App ideas worth building: proven apps with obvious gaps, pros & cons
              pulled from real reviews.
            </p>
          </div>
          <span className="hidden text-4xl sm:block">🔥</span>
        </Link>
      </section>

      <section className="mb-10">
        <SearchBox />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Browse by direction</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.key}>
              <Link
                href={`/category/${c.key}`}
                className="flex h-full flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition hover:border-red-400 dark:border-white/10 dark:bg-neutral-900"
              >
                <span className="font-medium">{c.label}</span>
                <span className="mt-2 text-sm text-neutral-500">
                  {c.productCount > 0
                    ? `${c.productCount} apps · ${c.reviewCount} complaints`
                    : "Not crawled yet"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {globalThemes.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top complaint themes (all apps)</h2>
          <ThemeBars stats={globalThemes} />
        </section>
      )}
    </main>
  );
}
