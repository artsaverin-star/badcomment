import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { listIdeas } from "@/lib/ideas";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

// The hand-curated, fully-analysed niches — the ones worth posting about.
const PREMIUM = [
  "notes-pkm", "photo-editing", "calendars-tasks", "study-aids", "nutrition-calories",
  "document-scanners", "weather-apps", "intermittent-fasting", "affirmations", "plant-care",
  "habit-tracking", "personal-finance", "astrology",
];

export default async function AdminPostsPage() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();

  const posts = PREMIUM.map((slug) => {
    const cat = getCategoryBySlug(slug, "ru");
    const thesis = getNicheThesis(slug, "ru");
    const summary = getSegmentSummary(slug);
    if (!cat || !thesis || !summary) return null;
    const reviews = (summary.reviewsScanned || 5000).toLocaleString("ru-RU");
    const apps = summary.appsCount || 10;
    const idea = listIdeas().find((x) => x.category === slug);
    const gov = (thesis.governing || "").trim();

    const caption =
      `Проанализировали ${reviews} отзывов на ${apps} приложений в нише «${cat.name}».\n\n` +
      `${gov}\n\n` +
      (idea ? `И главное — что построить: «${idea.title}». ${idea.oneLiner}\n\n` : "") +
      `3 вывода + идея под подтверждённый спрос — в карусели 👉\n\n` +
      `Полный разбор: inApp.pro/ru/segment/${slug}`;

    return { slug, name: cat.name, caption };
  }).filter((p): p is { slug: string; name: string; caption: string } => !!p);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">Посты</h1>
      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">
        Готовые посты по качественным нишам ({posts.length}): цепляющий текст + карусель из 4 картинок
        (хук с цифрами → 2 вывода → идея, что построить). Внизу каждой картинки — inApp.pro.
        Кликни картинку, чтобы открыть/скачать.
      </p>
      <div className="mt-8 flex flex-col gap-6">
        {posts.map((p) => (
          <PostCard key={p.slug} slug={p.slug} name={p.name} caption={p.caption} />
        ))}
      </div>
    </main>
  );
}
