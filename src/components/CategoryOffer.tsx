import CategoryGate from "./CategoryGate";
import type { Locale } from "@/lib/i18n";

// One unified offer card for a locked category: the three things you get
// (findings · ideas · competitors) separated by dividers, then ONE purchase
// (no more "590 ₽" repeated three times → the "3× price" impression is gone).
export default function CategoryOffer({
  slug,
  categoryName,
  sellable,
  price,
  loggedIn,
  pregenDate,
  locale,
  ideasCount,
  appsCount,
  starsHref,
  starsLabel,
  lifetimeStarsHref,
}: {
  slug: string;
  categoryName?: string;
  sellable: boolean;
  price: number;
  loggedIn: boolean;
  pregenDate: string;
  locale: Locale;
  ideasCount: number;
  appsCount: number;
  starsHref?: string;
  starsLabel?: string;
  lifetimeStarsHref?: string;
}) {
  const ru = locale !== "en";
  const sections = ru
    ? [
        { eyebrow: "Выводы", title: "Ещё 2 вывода", sub: "Разбор по наблюдениям и прямые цитаты из отзывов." },
        { eyebrow: "Что построить", title: `${ideasCount} идей под спрос`, sub: "Каждую люди просят сами. Внутри по каждой — что строить, для кого и как на этом заработать, с цитатами из отзывов." },
        { eyebrow: "Конкуренты", title: `Разбор ${appsCount} приложений`, sub: "По каждому лидеру ниши — за что его любят, где он бесит и чего людям не хватает. Готовый разбор конкурентов." },
      ]
    : [
        { eyebrow: "Findings", title: "2 more findings", sub: "The breakdown by observation and direct review quotes." },
        { eyebrow: "What to build", title: `${ideasCount} demand-backed ideas`, sub: "Each one users ask for themselves — what to build, for whom and how to monetize, with quotes." },
        { eyebrow: "Competitors", title: `${appsCount} app teardowns`, sub: "For each niche leader — what it's loved for, what enrages users and what's missing. A ready competitor teardown." },
      ];

  return (
    <div className="rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 sm:p-9">
      <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
        {sections.map((s, i) => (
          <div key={i} className={i === 0 ? "pb-6" : "py-6 last:pb-0"}>
            <div className="text-[12px] font-semibold tracking-[0.02em] text-[var(--color-text-brand)]">{s.eyebrow}</div>
            <div className="mt-2 text-[21px] font-black tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[24px]">{s.title}</div>
            <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-7">
        <CategoryGate
          slug={slug}
          categoryName={categoryName}
          sellable={sellable}
          price={price}
          loggedIn={loggedIn}
          pregenDate={pregenDate}
          locale={locale}
          starsHref={starsHref}
          starsLabel={starsLabel}
          lifetimeStarsHref={lifetimeStarsHref}
          inline
        />
      </div>
    </div>
  );
}
