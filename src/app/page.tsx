import { Header } from "@saverin/ui-web";
import Link from "next/link";
import { listResearchCategories, groupByTier, type CategoryView, type Tier } from "@/lib/researchCategories";
import { t, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

const TIER_HEADINGS: Record<Tier, { ru: { title: string; sub: string }; en: { title: string; sub: string } }> = {
  buildable: {
    ru: { title: "🛠 Можно повторить", sub: "Solo-разработчик или мини-команда выкатит конкурента — нет network effects, контентных прав, регулировки или железа" },
    en: { title: "🛠 Buildable", sub: "Solo dev or small team can ship a real competitor — no network effects, content rights, regulation, or hardware moat" },
  },
  wedge: {
    ru: { title: "🪓 С вертикалью можно", sub: "Полный рынок взять не выйдет, но конкретный вертикаль/нишу — да" },
    en: { title: "🪓 Buildable in a wedge", sub: "Won't take the whole market, but a vertical/niche slice is doable" },
  },
  reference: {
    ru: { title: "📚 Мастодонты — для опыта", sub: "Повторить не получится, но боль пользователей в них полезно знать как контекст" },
    en: { title: "📚 Mastodons — reference", sub: "Cloning isn't the play, but their pain is useful context" },
  },
};

export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const groups = groupByTier(listResearchCategories(locale));

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
      />

      <TierSection tier="buildable" cats={groups.buildable} locale={locale} />
      <TierSection tier="wedge" cats={groups.wedge} locale={locale} />
      <TierSection tier="reference" cats={groups.reference} locale={locale} />
    </main>
  );
}

function TierSection({ tier, cats, locale }: { tier: Tier; cats: CategoryView[]; locale: Locale }) {
  if (cats.length === 0) return null;
  const h = TIER_HEADINGS[tier][locale === "en" ? "en" : "ru"];
  const isReference = tier === "reference";
  return (
    <section className="mt-10">
      <details open={!isReference} className="group">
        <summary className="mb-3 flex cursor-pointer list-none items-baseline justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-2 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{h.title}</h2>
            <p className="text-[12px] text-[var(--color-text-tertiary)]">{h.sub}</p>
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
            {cats.length}
          </span>
        </summary>
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 ${isReference ? "opacity-60" : ""}`}>
          {cats.map((c) => (
            <CategoryCard key={c.slug} cat={c} />
          ))}
        </div>
      </details>
    </section>
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
        {icons.map((a, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={a.icon}
            alt=""
            className="size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)]"
          />
        ))}
      </div>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{cat.name}</span>
        <span className="truncate text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {cat.apps.length} {appsWord(cat.apps.length)}
        </span>
      </span>
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
