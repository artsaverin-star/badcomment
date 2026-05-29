import Link from "next/link";
import AddAppForm from "@/components/AddAppForm";
import ThemeBars from "@/components/ThemeBars";
import { getApps, getGlobalThemeStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [apps, globalThemes] = await Promise.all([getApps(), getGlobalThemeStats()]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          bad<span className="text-red-600">comment</span>
        </h1>
        <p className="mt-1 text-neutral-500">
          Pull negative reviews from popular apps and see what people complain about.
        </p>
      </header>

      <section className="mb-10">
        <AddAppForm />
      </section>

      {globalThemes.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Top complaint themes (all apps)</h2>
          <ThemeBars stats={globalThemes} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tracked apps</h2>
        {apps.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No apps yet. Add one above to start collecting negative reviews.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {apps.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/app/${app.id}`}
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4 transition hover:border-red-400 dark:border-white/10 dark:bg-neutral-900"
                >
                  {app.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt="" className="h-12 w-12 rounded-lg" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-black/10 dark:bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{app.title}</p>
                    <p className="text-sm text-neutral-500">
                      {app.store === "google" ? "Google Play" : "App Store"} ·{" "}
                      {app._count.reviews} negative reviews
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
