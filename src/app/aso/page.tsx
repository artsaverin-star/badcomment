import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AsoAuditTracker from "@/components/AsoAuditTracker";
import AsoForm from "@/components/AsoForm";
import CopyText from "@/components/CopyText";
import { canUseAso } from "@/lib/asoAccess";
import { buildAsoAudit, fetchAppStoreApp, ROOMDO_APP_ID, type AsoAudit } from "@/lib/asoAudit";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ROOMDO_URL = `https://apps.apple.com/app/id${ROOMDO_APP_ID}`;

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const title = ru ? "ASO-аудит приложения по реальным отзывам" : "Evidence-backed ASO audit for your app";
  const description = ru
    ? "Вставьте ссылку App Store и получите конкретные изменения для названия, ключей и скриншотов — с доказательствами из отзывов конкурентов."
    : "Paste an App Store URL and get concrete changes for the name, keywords and screenshots, backed by competitor-review evidence.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: "/aso",
      languages: { ru: "https://inapp.pro/ru/aso", en: "https://inapp.pro/en/aso", "x-default": "https://inapp.pro/en/aso" },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

function countLabel(value: string, limit: number, ru: boolean) {
  return `${value.length}/${limit}${ru ? " символов" : " chars"}`;
}

function formatDate(value: string, ru: boolean) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(ru ? "ru-RU" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
  } catch {
    return value;
  }
}

function ruPlural(n: number, one: string, few: string, many: string) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

function languageCount(n: number, ru: boolean) {
  if (!ru) return `${n} ${n === 1 ? "language" : "languages"}`;
  return `${n} ${ruPlural(n, "язык", "языка", "языков")}`;
}

function observationCount(n: number, ru: boolean) {
  if (!ru) return `${n.toLocaleString("en-US")} observations`;
  return `${n.toLocaleString("ru-RU")} ${ruPlural(n, "наблюдение", "наблюдения", "наблюдений")}`;
}

function MetadataField({ label, value, limit, field, audit, ru }: { label: string; value: string; limit?: number; field: string; audit: AsoAudit; ru: boolean }) {
  return (
    <div className="border-b border-[var(--color-border-subtle)] py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">{label}</p>
        <CopyText value={value} field={field} appId={audit.app.id} label={ru ? "Копировать" : "Copy"} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-body font-medium text-[var(--color-text-primary)]">{value || "—"}</p>
      {limit && <p className={`mt-1 text-caption tabular-nums ${value.length > limit ? "text-[#ff6b6b]" : "text-[var(--color-text-tertiary)]"}`}>{countLabel(value, limit, ru)}</p>}
    </div>
  );
}

function EvidenceNote({ evidence, ru }: { evidence: NonNullable<AsoAudit["actions"][number]["evidence"]>; ru: boolean }) {
  return (
    <div className="mt-4 border-l-2 border-[var(--color-border-strong)] pl-4">
      <p className="text-footnote font-semibold text-[var(--color-text-secondary)]">
        {observationCount(evidence.count, ru)} · {evidence.title}
      </p>
      {evidence.quote && (
        <p className="mt-2 text-footnote text-[var(--color-text-tertiary)]">
          “{evidence.quote}”{evidence.app ? ` — ${evidence.app}` : ""}
        </p>
      )}
    </div>
  );
}

export default async function AsoPage({ searchParams }: { searchParams: Promise<{ app?: string | string[] }> }) {
  const [locale, user, params] = await Promise.all([getLocale(), getSessionUser(), searchParams]);
  if (!canUseAso(user)) notFound();

  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const requested = Array.isArray(params.app) ? params.app[0] : params.app;
  const input = (requested || ROOMDO_URL).trim();

  let audit: AsoAudit | null = null;
  let error: string | null = null;
  try {
    const app = await fetchAppStoreApp(input);
    audit = buildAsoAudit(app, locale);
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "unknown";
    error = code === "invalid_app_store_url"
      ? (ru ? "Нужна ссылка вида apps.apple.com/…/id123456789 или сам цифровой ID." : "Use an apps.apple.com/…/id123456789 URL or the numeric ID itself.")
      : code === "app_not_found"
        ? (ru ? "Приложение не найдено в выбранной витрине App Store." : "The app was not found in that App Store storefront.")
        : (ru ? "App Store временно не ответил. Попробуйте ещё раз." : "The App Store did not respond. Please try again.");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: ru ? "inApp — ASO-аудит" : "inApp ASO audit",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `https://inapp.pro/${ru ? "ru" : "en"}/aso`,
    description: ru ? "Доказательный ASO-аудит по отзывам и конкурентам." : "Evidence-backed ASO audit using reviews and competitors.",
  };

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-28 pt-12 sm:px-6 sm:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="text-center">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">ASO</p>
        <h1 className="mx-auto mt-2 max-w-[15ch] text-display text-balance text-[var(--color-text-primary)]">
          {ru ? "Что изменить в App Store сегодня" : "What to change in the App Store today"}
        </h1>
        <p className="mx-auto mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Вставьте ссылку на приложение. inApp сопоставит страницу с конкурентами и отзывами ниши и выдаст несколько конкретных действий вместо ещё одного дашборда."
            : "Paste an app URL. inApp matches the storefront against its category competitors and reviews, then gives you a few concrete actions instead of another dashboard."}
        </p>
        <AsoForm locale={locale} initialValue={input} />
        <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">
          {ru ? "Публичная страница — без App Store Connect и без вашего ключа нейросети." : "Uses the public storefront — no App Store Connect or personal AI key required."}
        </p>
      </header>

      {error && (
        <section className="mx-auto mt-10 max-w-[720px] rounded-[22px] border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-center">
          <p className="text-body text-[#ff8a8a]">{error}</p>
          <Link href={`${lp}/aso`} className="mt-3 inline-flex text-footnote font-semibold text-[var(--color-text-primary)] underline underline-offset-4">
            {ru ? "Открыть полный пример Roomdo" : "Open the complete Roomdo example"}
          </Link>
        </section>
      )}

      {audit && (
        <div className="mt-12">
          <AsoAuditTracker appId={audit.app.id} niche={audit.niche.slug} full sample={audit.sample} />

          <section className="card-min rounded-[28px] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={audit.app.icon} alt="" className="size-24 shrink-0 rounded-[24px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {audit.sample && <span className="rounded-full bg-[var(--color-accent-brand)] px-2.5 py-1 text-caption font-semibold text-white">{ru ? "полный пример" : "complete example"}</span>}
                  {audit.app.ratings === 0 && <span className="rounded-full border border-[var(--color-border-subtle)] px-2.5 py-1 text-caption text-[var(--color-text-tertiary)]">{ru ? "новый релиз" : "new release"}</span>}
                </div>
                <h2 className="mt-3 text-title1 text-balance text-[var(--color-text-primary)]">{audit.app.title}</h2>
                <p className="mt-1 text-footnote text-[var(--color-text-tertiary)]">{audit.app.developer}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption text-[var(--color-text-secondary)]">
                  <span>{audit.app.genres.join(" · ")}</span>
                  <span>{audit.app.version ? `v${audit.app.version}` : ""}</span>
                  <span>{formatDate(audit.app.releaseDate, ru)}</span>
                  <span>{audit.app.ratings ? `${audit.app.rating.toFixed(1)}★ · ${audit.app.ratings.toLocaleString(ru ? "ru-RU" : "en-US")}` : (ru ? "оценок пока нет" : "no ratings yet")}</span>
                  <span>{languageCount(audit.app.languages.length, ru)}</span>
                </div>
              </div>
              <a href={audit.app.url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-[var(--color-border-subtle)] px-4 py-2.5 text-footnote font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                App Store ↗
              </a>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] bg-[var(--color-text-primary)] p-7 text-[var(--color-bg-page)] sm:p-10">
            <p className="text-caption font-semibold uppercase tracking-[0.08em] opacity-55">{ru ? "Вердикт" : "Verdict"}</p>
            <h2 className="mt-3 max-w-[22ch] text-title1 text-balance">{audit.verdict}</h2>
            <p className="mt-4 max-w-[66ch] text-body opacity-75">{audit.verdictDetail}</p>
          </section>

          <section className="mt-16">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "По приоритету" : "In priority order"}</p>
                <h2 className="mt-1 text-title1 text-[var(--color-text-primary)]">{ru ? "Сделать сначала" : "Do these first"}</h2>
              </div>
              {audit.niche.apps > 0 && (
                <p className="text-footnote tabular-nums text-[var(--color-text-tertiary)]">
                  {audit.niche.apps.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "приложений" : "apps"} · {audit.niche.reviews.toLocaleString(ru ? "ru-RU" : "en-US")} {ru ? "отзывов" : "reviews"}
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {audit.actions.map((action, index) => (
                <article key={action.title} className="rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-6 sm:p-7">
                  <div className="flex gap-4 sm:gap-6">
                    <span className="text-stat tabular-nums text-[var(--color-text-tertiary)]">{index + 1}</span>
                    <div className="min-w-0">
                      <h3 className="text-title3 text-[var(--color-text-primary)]">{action.title}</h3>
                      <p className="mt-2 text-callout text-[var(--color-text-secondary)]">{action.why}</p>
                      <p className="mt-3 text-footnote font-semibold text-[var(--color-text-primary)]">→ {action.outcome}</p>
                      {action.evidence && <EvidenceNote evidence={action.evidence} ru={ru} />}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Что уже не нужно переделывать" : "What already works"}</p>
            <h2 className="mt-1 text-title1 text-[var(--color-text-primary)]">{ru ? "Сильные стороны" : "Strengths"}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {audit.strengths.map((strength) => (
                <div key={strength.title} className="card-min rounded-[22px] p-6">
                  <h3 className="text-headline text-[var(--color-text-primary)]">{strength.title}</h3>
                  <p className="mt-2 text-footnote text-[var(--color-text-secondary)]">{strength.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 border-t border-[var(--color-border-subtle)] pt-10">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-caption text-[var(--color-text-tertiary)]">{audit.niche.name}</p>
                <h2 className="mt-1 text-title1 text-[var(--color-text-primary)]">{ru ? "Что говорят отзывы конкурентов" : "What competitor reviews say"}</h2>
              </div>
              {audit.niche.slug && (
                <Link href={`${lp}/reviews/${audit.niche.slug}`} className="text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
                  {ru ? "Все размеченные отзывы →" : "All labelled reviews →"}
                </Link>
              )}
            </div>
            {audit.niche.governing && <p className="mt-5 max-w-[72ch] text-body text-[var(--color-text-secondary)]">{audit.niche.governing.split(/\n\s*\n/)[0]}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {audit.niche.evidence.slice(0, 4).map((item) => (
                <article key={item.title} className="rounded-[22px] border border-[var(--color-border-subtle)] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${item.polarity === "pain" ? "bg-[#ff6b6b]/10 text-[#ff8a8a]" : "bg-[#4ade80]/10 text-[#4ade80]"}`}>
                      {item.count.toLocaleString(ru ? "ru-RU" : "en-US")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-headline text-[var(--color-text-primary)]">{item.title}</h3>
                  {item.quote && <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">“{item.quote}”{item.app ? ` — ${item.app}` : ""}</p>}
                </article>
              ))}
            </div>
          </section>

          <>
              <section className="mt-16 border-t border-[var(--color-border-subtle)] pt-10">
                <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Готово для App Store Connect" : "Ready for App Store Connect"}</p>
                <h2 className="mt-1 text-title1 text-[var(--color-text-primary)]">{ru ? "Пакет метаданных" : "Metadata pack"}</h2>
                {!audit.sample && <p className="mt-3 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Черновик: перед публикацией проверьте релевантность запросов в вашей витрине." : "Draft: verify query relevance in your storefront before publishing."}</p>}
                <div className="card-min mt-6 rounded-[24px] px-6 sm:px-8">
                  <MetadataField label={ru ? "Название" : "Name"} value={audit.metadata.name} limit={30} field="name" audit={audit} ru={ru} />
                  <MetadataField label={ru ? "Подзаголовок" : "Subtitle"} value={audit.metadata.subtitle} limit={30} field="subtitle" audit={audit} ru={ru} />
                  <MetadataField label={ru ? "Ключи" : "Keywords"} value={audit.metadata.keywords} limit={100} field="keywords" audit={audit} ru={ru} />
                  <MetadataField label={ru ? "Промотекст" : "Promotional text"} value={audit.metadata.promotionalText} limit={170} field="promotional_text" audit={audit} ru={ru} />
                </div>
              </section>

              <section className="mt-16">
                <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Новый порядок" : "New order"}</p>
                <h2 className="mt-1 text-title1 text-[var(--color-text-primary)]">{ru ? "Сценарий скриншотов" : "Screenshot story"}</h2>
                {audit.app.screenshots.length > 0 ? (
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {audit.screenshotPlan.map((shot, index) => {
                      const src = audit.app.screenshots[shot.source - 1];
                      if (!src) return null;
                      return (
                        <article key={`${shot.source}-${shot.headline}`} className="overflow-hidden rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" loading="lazy" className="aspect-[442/760] w-full object-cover object-top" />
                          <div className="p-4">
                            <p className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{index + 1} · {ru ? "исходник" : "source"} {shot.source}</p>
                            <h3 className="mt-1 text-callout font-semibold text-[var(--color-text-primary)]">{shot.headline}</h3>
                            <p className="mt-1.5 text-caption text-[var(--color-text-secondary)]">{shot.role}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 text-body text-[var(--color-text-secondary)]">{ru ? "В публичной карточке нет iPhone-скриншотов." : "No iPhone screenshots were found on the public storefront."}</p>
                )}
              </section>

              <section className="mt-16 rounded-[26px] border border-[var(--color-border-subtle)] p-7 sm:p-9">
                <p className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Первый эксперимент" : "First experiment"}</p>
                <h2 className="mt-2 text-title2 text-[var(--color-text-primary)]">{audit.experiment.hypothesis}</h2>
                <dl className="mt-6 grid gap-5 sm:grid-cols-3">
                  <div><dt className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Контроль" : "Control"}</dt><dd className="mt-1 text-footnote text-[var(--color-text-secondary)]">{audit.experiment.control}</dd></div>
                  <div><dt className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Вариант" : "Variant"}</dt><dd className="mt-1 text-footnote text-[var(--color-text-secondary)]">{audit.experiment.variant}</dd></div>
                  <div><dt className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Метрика" : "Metric"}</dt><dd className="mt-1 text-footnote text-[var(--color-text-secondary)]">{audit.experiment.metric}</dd></div>
                </dl>
                <a href="https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization" target="_blank" rel="noreferrer" className="mt-6 inline-flex text-footnote font-semibold text-[var(--color-text-brand)] hover:underline">
                  {ru ? "Как запустить тест в App Store Connect ↗" : "How to run the test in App Store Connect ↗"}
                </a>
              </section>
          </>
        </div>
      )}
    </main>
  );
}
