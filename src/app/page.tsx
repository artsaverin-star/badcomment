import { Header } from "@saverin/ui-web";
import Link from "next/link";
import { listDomains, type DomainView, type CategoryView } from "@/lib/researchCategories";
import { isCategoryReady } from "@/lib/readyApps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// Homepage: every life-domain (Sleep & meditation, Productivity, …) with its
// sub-categories of 10+ leader apps. Each sub-category links to its
// /segment/<slug> page where the actual app grid + cross-app insights live.
export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const domains = listDomains(locale);

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
      />

      <div className="mt-10 flex flex-col gap-10">
        {domains.map((d) => (
          <DomainSection key={d.slug} domain={d} />
        ))}
      </div>
    </main>
  );
}

function DomainSection({ domain }: { domain: DomainView }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-[var(--color-border-subtle)] pb-2 text-[20px] font-semibold text-[var(--color-text-primary)]">
        {domain.name}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {domain.categories.map((c) => (
          <CategoryCard key={c.slug} cat={c} />
        ))}
      </div>
    </section>
  );
}

function CategoryCard({ cat }: { cat: CategoryView }) {
  const icons = cat.apps.filter((a) => a.icon).slice(0, 4);
  // Greyscale until the category has at least one shipped разбор; deprioritized
  // categories are always dimmed.
  const dim = cat.deprioritized || !isCategoryReady(cat.apps);
  const body = (
    <>
      <div className="flex -space-x-1.5 shrink-0">
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon}
            alt=""
            className={`size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)] ${
              dim ? "opacity-40 grayscale" : ""
            }`}
          />
        ))}
      </div>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate text-callout font-semibold ${
            dim ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
          }`}
        >
          {cat.name}
        </span>
        <span className="truncate text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {cat.apps.length} {appsWord(cat.apps.length)}
        </span>
      </span>
    </>
  );

  if (cat.deprioritized) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-3 py-2.5">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/segment/${cat.slug}`}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--color-text-tertiary)]"
    >
      {body}
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
