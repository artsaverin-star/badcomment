import { getProductDetail } from "@/lib/queries";
import { getProductInsights, type Insight } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import InsightLanding, { type LandingProduct } from "@/components/InsightLanding";
import ExperimentTabs, { type VariantMeta } from "@/components/ExperimentTabs";

export const dynamic = "force-dynamic";

// Model-comparison experiment for the 3000-app scale decision. Same 500 reviews
// (except the 892 golden), same Opus clustering/regrouping — only the EXTRACT
// model differs across tabs. Lets us eyeball whether cheap extraction recovers
// the same loud themes the Opus golden found.

const REAL_ID = "cmpstwzc422tyug8p31xzftzd";

const VARIANTS = [
  { productId: REAL_ID, label: "Opus · 892 (эталон)", model: "Opus", reviews: 892, extractedObs: null as number | null, relCost: "базовая" },
  { productId: "calmopus500", label: "Opus · 500", model: "Opus", reviews: 500, extractedObs: 276, relCost: "≈1×" },
  { productId: "calmsonnet500", label: "Sonnet · 500", model: "Sonnet", reviews: 500, extractedObs: 190, relCost: "≈0.2×" },
  { productId: "calmhaiku500", label: "Haiku · 500", model: "Haiku", reviews: 500, extractedObs: 158, relCost: "≈0.07×" },
];

function themeCount(insights: Insight[]) {
  const ids = new Set(insights.map((i) => i.group?.id).filter(Boolean));
  return ids.size;
}

const STUB_PRODUCT: LandingProduct = {
  name: "Calm",
  developer: "Calm.com, Inc.",
  stores: ["apple", "google"],
  icon: null,
  screenshots: [],
  avgRating: null,
  installs: null,
  ratingCount: null,
};

export default async function CalmExperimentPage() {
  const locale = await getLocale();
  const tr = t(locale);
  // The comparison is driven entirely by insights.json; product detail only
  // dresses the hero. Fall back to a stub when the DB isn't reachable so the
  // experiment renders anywhere.
  const detail = await getProductDetail(REAL_ID, locale).catch(() => null);
  const data = detail ?? STUB_PRODUCT;

  const loaded = VARIANTS.map((v) => ({ ...v, insights: getProductInsights(v.productId) })).filter(
    (v): v is typeof v & { insights: NonNullable<ReturnType<typeof getProductInsights>> } => v.insights != null,
  );

  const meta: VariantMeta[] = loaded.map((v) => ({
    label: v.label,
    model: v.model,
    reviews: v.reviews,
    mechanisms: v.insights.insights.length,
    themes: themeCount(v.insights.insights),
    extractedObs: v.extractedObs,
    relCost: v.relCost,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">Эксперимент · выбор модели для конвейера</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Calm — разбор одним и тем же конвейером, разной моделью извлечения
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-[21px] text-[var(--color-text-secondary)]">
          Одни и те же 500 отзывов (кроме эталона на 892), одинаковая кластеризация и темы на Opus — меняется только
          модель на этапе извлечения наблюдений. Цель — увидеть, сохраняют ли дешёвые модели те же громкие темы.
        </p>
      </div>

      <ExperimentTabs variants={meta}>
        {loaded.map((v) => (
          <InsightLanding key={v.productId} data={data} insights={v.insights} tr={tr} />
        ))}
      </ExperimentTabs>
    </main>
  );
}
