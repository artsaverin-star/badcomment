import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { listNiches, totals, progress } from "@/lib/reviews";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const t = totals();
  const title = ru ? "Отзывы по темам — inApp" : "Reviews by theme — inApp";
  const description = ru
    ? `${t.reviews.toLocaleString("ru-RU")} реальных отзывов о ${t.apps} приложениях, разобранных по собственным темам каждого приложения.`
    : `${t.reviews.toLocaleString("en-US")} real reviews across ${t.apps} apps, broken down into each app's own themes.`;
  return {
    title,
    description,
    alternates: {
      canonical: "/reviews",
      languages: { ru: "https://inapp.pro/ru/reviews", en: "https://inapp.pro/en/reviews", "x-default": "https://inapp.pro/en/reviews" },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

function Stat({ n, label, locale }: { n: number; label: string; locale: string }) {
  return (
    <div>
      <div className="text-stat tabular-nums text-[var(--color-text-primary)]">{n.toLocaleString(locale)}</div>
      <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  );
}

export default async function ReviewsHome() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const niches = listNiches(locale);
  const t = totals();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <header className="max-w-[62ch]">
        <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Первоисточник" : "Primary source"}</p>
        <h1 className="mt-2 text-display font-bold text-[var(--color-text-primary)]">{ru ? "Отзывы" : "Reviews"}</h1>
        <p className="mt-4 text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Все выводы на сайте вырастают отсюда. Каждое приложение разобрано по его собственным темам, а не по общим ярлыкам: сколько людей пишут про одно и то же и хвалят они или ругают. Открой тему и прочитай те самые отзывы."
            : "Everything else on this site grows out of this page. Every app is broken into its own themes rather than generic labels: how many people write about the same thing, and whether they praise or complain. Open a theme and read those exact reviews."}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-6 border-t border-[var(--color-border-subtle)] pt-5 sm:grid-cols-4">
        <Stat n={t.niches} label={ru ? plural(t.niches, "ниша", "ниши", "ниш") : "niches"} locale={lc} />
        <Stat n={t.apps} label={ru ? plural(t.apps, "приложение", "приложения", "приложений") : "apps"} locale={lc} />
        <Stat n={t.themes} label={ru ? plural(t.themes, "тема", "темы", "тем") : "themes"} locale={lc} />
        <Stat n={t.reviews} label={ru ? plural(t.reviews, "отзыв", "отзыва", "отзывов") : "reviews"} locale={lc} />
      </div>

      {/* Honest coverage. The section ships as the pass goes, so say where it is. */}
      <p className="mt-4 border-b border-[var(--color-border-subtle)] pb-5 text-caption text-[var(--color-text-tertiary)]">
        {ru
          ? `Раздел собирается прямо сейчас: разобрано ${progress.appsDone.toLocaleString(lc)} приложений из ${progress.appsPlanned.toLocaleString(lc)}, ${progress.nichesDone} ниш из ${progress.nichesPlanned}. Обновлено ${progress.updatedAt}.`
          : `This section is still being built: ${progress.appsDone.toLocaleString(lc)} of ${progress.appsPlanned.toLocaleString(lc)} apps done, ${progress.nichesDone} of ${progress.nichesPlanned} niches. Updated ${progress.updatedAt}.`}
      </p>

      {niches.length === 0 ? (
        <p className="mt-10 text-body text-[var(--color-text-tertiary)]">{ru ? "Скоро." : "Coming soon."}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {niches.map((n) => (
            <li key={n.slug} className="border-b border-[var(--color-border-subtle)]">
              <Link href={`${lp}/reviews/${n.slug}`} className="group block py-3.5">
                <span className="flex items-baseline gap-4">
                  <span className="min-w-0 flex-1 truncate text-headline text-[var(--color-text-primary)] transition-opacity group-hover:opacity-60">
                    {n.name}
                  </span>
                  <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">
                    {n.reviews.toLocaleString(lc)}
                  </span>
                </span>
                <span className="mt-0.5 block text-caption text-[var(--color-text-tertiary)]">
                  <span className="tabular-nums">{n.apps}</span> {ru ? plural(n.apps, "приложение", "приложения", "приложений") : "apps"} ·{" "}
                  <span className="tabular-nums">{n.themes}</span> {ru ? plural(n.themes, "тема", "темы", "тем") : "themes"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-footnote text-[var(--color-text-tertiary)]">
        {ru ? "Эти же данные доступны твоему ИИ-агенту: " : "The same data is available to your AI agent: "}
        <Link href={`${lp}/mcp`} className="text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--color-text-primary)]">
          {ru ? "MCP-сервер inApp" : "the inApp MCP server"}
        </Link>
      </p>
    </main>
  );
}
