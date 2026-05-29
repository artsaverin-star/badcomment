import Link from "next/link";
import { notFound } from "next/navigation";
import ThemeBars from "@/components/ThemeBars";
import { getAppDetail } from "@/lib/queries";
import { themeLabel } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function AppDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAppDetail(id);
  if (!data) notFound();
  const { app, themeStats } = data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back
      </Link>

      <header className="mb-8 mt-4 flex items-center gap-4">
        {app.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.icon} alt="" className="h-16 w-16 rounded-xl" />
        ) : (
          <div className="h-16 w-16 rounded-xl bg-black/10 dark:bg-white/10" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{app.title}</h1>
          <p className="text-sm text-neutral-500">
            {app.store === "google" ? "Google Play" : "App Store"} ·{" "}
            {app.country.toUpperCase()} · {app.reviews.length} negative reviews
          </p>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Complaint themes</h2>
        <ThemeBars stats={themeStats} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Negative reviews</h2>
        <ul className="flex flex-col gap-3">
          {app.reviews.map((r) => {
            const themes: string[] = (() => {
              try {
                return JSON.parse(r.themes);
              } catch {
                return [];
              }
            })();
            return (
              <li
                key={r.id}
                className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-red-600">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {r.author ?? "anon"}
                    {r.postedAt ? ` · ${r.postedAt.toISOString().slice(0, 10)}` : ""}
                  </span>
                </div>
                {r.title && <p className="font-medium">{r.title}</p>}
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{r.text}</p>
                {themes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
                      >
                        {themeLabel(t)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
