import Link from "next/link";
import type { Idea } from "@/lib/ideas";
import { ideaCard } from "@/lib/regenCards";
import type { Locale } from "@/lib/i18n";

// Ideas tab on a category page: the review-derived product ideas for this
// category, as cards linking to their full derivation (/ideas/<slug>).
export default function CategoryIdeas({ ideas, locale = "ru" }: { ideas: Idea[]; locale?: Locale }) {
  const ru = locale !== "en";
  if (ideas.length === 0) {
    return (
      <p className="py-10 text-center text-callout text-[var(--color-text-tertiary)]">
        {ru ? "Для этой категории идей пока нет." : "No ideas for this category yet."}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ideas.map((idea) => {
        const ov = ideaCard(idea.slug, locale);
        return (
          <Link
            key={idea.slug}
            href={`/ideas/${idea.slug}`}
            className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-text-tertiary)]"
          >
            <div className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
              {ov?.title ?? idea.title}
            </div>
            <p className="text-callout text-[var(--color-text-secondary)]">{ov?.oneLiner ?? idea.oneLiner}</p>
            <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
              {idea.stats.apps} {ru ? "приложений" : "apps"} ·{" "}
              {idea.stats.reviews.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"} ·{" "}
              {idea.stats.observations.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "наблюдений" : "observations"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
