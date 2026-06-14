import { listDomains } from "@/lib/researchCategories";
import { hasInsight, isPublishable } from "@/lib/readyApps";
import seg from "@/data/segment-insights.json";

const summaries = new Set(Object.keys(seg as Record<string, unknown>));
const rows: Array<{slug:string;name:string;total:number;insight:number;pub:number;hasSummary:boolean}> = [];
for (const d of listDomains("ru")) {
  for (const c of d.categories) {
    rows.push({
      slug: c.slug, name: c.name,
      total: c.apps.length,
      insight: c.apps.filter((a) => hasInsight(a.productId)).length,
      pub: c.apps.filter((a) => isPublishable(a.productId)).length,
      hasSummary: summaries.has(c.slug),
    });
  }
}
rows.sort((a,b)=> Number(b.hasSummary)-Number(a.hasSummary) || a.pub-b.pub);
console.log("SUM  pub/ins/total  slug — name");
for (const r of rows) {
  console.log(`${r.hasSummary?"[S]":"[ ]"}  ${String(r.pub).padStart(2)}/${String(r.insight).padStart(2)}/${String(r.total).padStart(2)}   ${r.slug} — ${r.name}`);
}
console.log(`\nИТОГО: ${rows.length} категорий; с саммари ${rows.filter(r=>r.hasSummary).length}`);
console.log(`Саммари при pub<10: ${rows.filter(r=>r.hasSummary&&r.pub<10).map(r=>r.slug).join(", ")||"нет"}`);
console.log(`pub<total (иконки без разбора): ${rows.filter(r=>r.pub<r.total).map(r=>r.slug+`(${r.pub}/${r.total})`).join(", ")||"нет"}`);
console.log(`pub>=10 но БЕЗ саммари: ${rows.filter(r=>!r.hasSummary&&r.pub>=10).map(r=>r.slug).join(", ")||"нет"}`);
