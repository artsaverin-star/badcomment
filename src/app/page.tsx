import { Header } from "@saverin/ui-web";
import Link from "next/link";
import { listResearchCategories, sortByPriority, type CategoryView } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// Homepage: directory of the curated research-target categories. Every entry
// drills into /segment/<slug>. The 11 sleep-meditation apps already have the
// insights pipeline ran; everything else is a stub showing app icons + names
// as a research-planning surface.
export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const cats = sortByPriority(listResearchCategories(locale));

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
      />
      <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <CategoryCard key={c.slug} cat={c} />
        ))}
      </div>
    </main>
  );
}

function CategoryCard({ cat }: { cat: CategoryView }) {
  const icons = cat.apps.filter((a) => a.icon).slice(0, 4);
  return (
    <Link
      href={`/segment/${cat.slug}`}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--color-text-tertiary)]"
    >
      <div className="flex -space-x-1.5 shrink-0">
        {icons.length > 0
          ? icons.map((a, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={a.icon}
                alt=""
                className="size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)]"
              />
            ))
          : null}
      </div>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{cat.name}</span>
        <span className="truncate text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {cat.apps.length} {appsWord(cat.apps.length)}
        </span>
      </span>
      {cat.tier === "high" && (
        <span className="shrink-0 rounded-full bg-[var(--color-accent-success)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent-success)]">
          ●
        </span>
      )}
    </Link>
  );
}

function appsWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "приложение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "приложения";
  return "приложений";
}
