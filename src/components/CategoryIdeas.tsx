import Link from "next/link";
import type { Idea } from "@/lib/ideas";

// Ideas tab on a category page: the review-derived product ideas for this
// category, as cards linking to their full derivation (/ideas/<slug>).
export default function CategoryIdeas({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="py-10 text-center text-callout text-[var(--color-text-tertiary)]">
        Для этой категории идей пока нет.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {ideas.map((idea) => (
        <Link
          key={idea.slug}
          href={`/ideas/${idea.slug}`}
          className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors hover:border-[var(--color-text-tertiary)]"
        >
          <div className="text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
            {idea.title}
          </div>
          <p className="text-callout text-[var(--color-text-secondary)]">{idea.oneLiner}</p>
          <div className="mt-1 text-caption text-[var(--color-text-tertiary)]">
            {idea.stats.apps} приложений · {idea.stats.reviews.toLocaleString("ru-RU")} отзывов ·{" "}
            {idea.stats.observations.toLocaleString("ru-RU")} наблюдений
          </div>
        </Link>
      ))}
    </div>
  );
}
