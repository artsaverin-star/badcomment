import { notFound } from "next/navigation";
import { Card, Header, Tag, Quote, buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { getProductInsights, CATEGORY_LABEL, type Insight, type InsightCategory } from "@/lib/insights";
import { formatCount } from "@/lib/format";
import { getLocale } from "@/lib/i18n.server";
import { t } from "@/lib/i18n";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

// Exemplary page for the qualitative-extraction prototype. Sits next to the
// classical /product/[id] view so the two outputs can be compared directly.
// Renders Insights grouped by category, each as a story-first card: mechanism
// title → narrative → persona/area/trial tags → verbatim evidence → implies.
//
// Data source today: hand-validated sample (24 of 8,279 reviews). Once the
// full extract pipeline runs, this same shape gets filled from
// /tmp/classify-work/.../insights.json.

function Stars({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-[12px] text-[var(--color-text-tertiary)]">
      {"★".repeat(n)}
      {"☆".repeat(Math.max(0, 5 - n))}
    </span>
  );
}

function MiniHistogram({ hist, total }: { hist: Record<string, number>; total: number }) {
  const rows = [5, 4, 3, 2, 1];
  const max = Math.max(1, ...rows.map((n) => hist[String(n)] ?? 0));
  const color = (star: number) =>
    star <= 2 ? "var(--color-accent-danger)" : star === 3 ? "var(--color-accent-warning)" : "var(--color-text-tertiary)";
  return (
    <div className="flex flex-col gap-1">
      {rows.map((star) => {
        const count = hist[String(star)] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
            <span className="w-5 shrink-0 tabular-nums">{star}★</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (count / max) * 100)}%`, background: color(star) }} />
            </span>
            <span className="w-20 shrink-0 text-right tabular-nums">
              {formatCount(count)} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const noveltyTone = insight.novelty === "high" ? "danger" : insight.novelty === "medium" ? "warning" : "neutral";
  return (
    <Card className="gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={noveltyTone} size="S">
            {insight.novelty === "high" ? "neov. high" : insight.novelty === "medium" ? "neov. med" : "neov. low"}
          </Tag>
          <Tag tone="neutral" size="S">
            {insight.featureArea}
          </Tag>
          {insight.trialPath && (
            <Tag tone="info" size="S">
              {insight.trialPath}
            </Tag>
          )}
        </div>
        <h3 className="text-[18px] font-semibold leading-[24px] text-[var(--color-text-primary)]">{insight.title}</h3>
        <p className="text-[14px] leading-[20px] text-[var(--color-text-secondary)]">{insight.story}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {insight.who.map((p) => (
          <Tag key={p} tone="neutral" size="S">
            {p}
          </Tag>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {insight.evidence.map((e, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Quote size="S">{e.quote}</Quote>
            <div className="flex items-center gap-2 pl-4">
              <Stars n={e.rating} />
              <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Implies</div>
        <p className="mt-1 text-[13px] leading-[19px] text-[var(--color-text-secondary)]">{insight.implies}</p>
      </div>
    </Card>
  );
}

function Section({ category, insights }: { category: InsightCategory; insights: Insight[] }) {
  const meta = CATEGORY_LABEL[category];
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Header
          size="S"
          as="h2"
          title={meta.ru}
          description={`${insights.length} ${insights.length === 1 ? "наблюдение" : "наблюдений"}`}
        />
      </div>
      <div className="flex flex-col gap-4">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </div>
    </section>
  );
}

export default async function ProductInsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const tr = t(locale);
  const [data, insights] = await Promise.all([getProductDetail(id, locale), Promise.resolve(getProductInsights(id))]);
  if (!data) notFound();

  const groups: Record<InsightCategory, Insight[]> = {
    strategic: [],
    workflow: [],
    onboarding: [],
    depth: [],
  };
  for (const x of insights?.insights ?? []) groups[x.category].push(x);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <BackLink fallback={`/product/${id}`} className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}>
        {tr.nav.back}
      </BackLink>

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          {data.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.icon} alt="" className="h-16 w-16 shrink-0 rounded-[var(--radius-lg)]" />
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-card-subtle)]" />
          )}
          <Header
            size="M"
            as="h1"
            className="min-w-0"
            title={`${data.name} — качественный разбор`}
            description={insights?.pipeline ?? "пайплайн дискавери · 1-5★ · sample"}
          />
        </div>

        {insights && (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-1 text-[13px] text-[var(--color-text-secondary)]">
              <span>
                Проанализировано отзывов: <span className="font-medium text-[var(--color-text-primary)] tabular-nums">{formatCount(insights.reviewsScanned)}</span>
              </span>
              <span>
                Размечено вручную как образец: <span className="font-medium text-[var(--color-text-primary)] tabular-nums">{insights.sampleSize}</span>
              </span>
              <span>
                Извлечено инсайтов: <span className="font-medium text-[var(--color-text-primary)] tabular-nums">{insights.insights.length}</span>
              </span>
              <span className="text-[var(--color-text-tertiary)]">Snapshot · {insights.asOf}</span>
            </div>
            <div className="sm:w-[280px]">
              <MiniHistogram hist={insights.ratingBreakdown} total={insights.reviewsScanned} />
            </div>
          </div>
        )}
      </Card>

      {!insights ? (
        <Card>
          <Header size="S" as="h2" title="Для этого приложения качественный разбор ещё не запущен" />
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Пайплайн — отдельный от тег-агрегации. Сначала извлечение наблюдений из всех 1-5★ отзывов, потом кластеризация и синтез
            историй. Здесь будет результат когда extract пройдёт по приложению.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-10">
          <Card>
            <Header
              size="S"
              as="h2"
              title="Почему эта страница другая"
              description="Сравнение с обычной агрегацией"
            />
            <p className="text-[14px] leading-[20px] text-[var(--color-text-secondary)]">
              Обычная агрегация даёт проценты по pain-категориям (billing 87%, reliability 64%, ads 41%). Это commodity-сигнал —
              известно и не дифференцирует. Здесь — другой пайплайн: каждый отзыв 1-5★ читается на предмет КОНКРЕТНОЙ механики
              или момента где продукт ломается. Большинство отзывов ничего не дают (правильный режим). Те что дают — складываются
              в специфичные истории с цитатами, JTBD и тем что это implies про продукт.
            </p>
            <p className="text-[14px] leading-[20px] text-[var(--color-text-secondary)]">
              4-5★ отзывы делают то чего 1-2★ не делают: они вскрывают стратегические дыры от тех кто уже платит и engaged.
              Промокод-leak и marketing-funnel disconnect — оба пришли из 4-5★.
            </p>
          </Card>

          {(["strategic", "workflow", "onboarding", "depth"] as InsightCategory[]).map((c) =>
            groups[c].length > 0 ? <Section key={c} category={c} insights={groups[c]} /> : null,
          )}

          <section className="flex flex-col gap-4">
            <Header size="S" as="h2" title="Паттерны персон" description="Сегменты которые видны в данных" />
            <Card>
              <ul className="flex flex-col gap-3">
                {insights.personaPatterns.map((p, i) => (
                  <li key={i} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[14px] font-medium text-[var(--color-text-primary)]">{p.label}</span>
                      <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{p.share}</span>
                    </div>
                    <span className="text-[13px] text-[var(--color-text-secondary)]">{p.note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          <section className="flex flex-col gap-4">
            <Header
              size="S"
              as="h2"
              title="Commodity baseline"
              description="Универсальные жалобы — есть, но дискавери не дают"
            />
            <Card>
              <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">
                Подтверждаем известное. На pain-классификаторе это были бы топ-bars. Здесь — складка внизу страницы: сигнал есть,
                но он не differentiating и не actionable.
              </p>
              <ul className="flex flex-col gap-2">
                {insights.commodityBaseline.map((c, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-2 first:border-0 first:pt-0">
                    <span className="text-[13px] text-[var(--color-text-primary)]">{c.label}</span>
                    <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{c.approx}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </main>
  );
}
