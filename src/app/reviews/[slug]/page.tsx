import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import { getLocale } from "@/lib/i18n.server";
import ReviewBrowser, { type Theme } from "@/components/ReviewBrowser";
import reviewsIndex from "@/data/reviewsIndex.json";

export const dynamic = "force-dynamic";

type App = { id: string; title: string; total: number; themes: Theme[] };
type Idx = Record<string, { name: string; apps: App[] }>;
const IDX = reviewsIndex as Idx;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = IDX[slug];
  const ru = (await getLocale()) !== "en";
  if (!niche) return {};
  const title = ru ? `Отзывы: ${niche.name} — inApp` : `Reviews: ${niche.name} — inApp`;
  return { title, alternates: { canonical: `/reviews/${slug}` } };
}

export default async function NicheReviews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = IDX[slug];
  if (!niche) notFound();
  const ru = (await getLocale()) !== "en";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <BackLink fallback={`${ru ? "/ru" : "/en"}/reviews`}>{ru ? "Отзывы" : "Reviews"}</BackLink>
      <h1 className="mt-3 text-display font-bold text-[var(--color-text-primary)]">{niche.name}</h1>
      <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">
        <span className="tabular-nums">{niche.apps.length}</span> {ru ? "приложений, отзывы по темам" : "apps, reviews by theme"}
      </p>

      <ol className="mt-8 flex flex-col gap-8">
        {niche.apps.map((a, i) => (
          <li key={a.id} className="border-t border-[var(--color-border-subtle)] pt-6 first:border-t-0 first:pt-0">
            <div className="flex items-baseline gap-2">
              <span className="tabular-nums text-footnote text-[var(--color-text-tertiary)]">№{i + 1}</span>
              <h2 className="text-headline text-[var(--color-text-primary)]">{a.title}</h2>
              <span className="ml-auto shrink-0 text-caption text-[var(--color-text-tertiary)]">
                <span className="tabular-nums">{a.total}</span> {ru ? "отзывов" : "reviews"}
              </span>
            </div>
            <ReviewBrowser slug={slug} id={a.id} themes={a.themes} total={a.total} ru={ru} />
          </li>
        ))}
      </ol>
    </main>
  );
}
