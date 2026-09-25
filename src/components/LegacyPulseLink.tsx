import { publicHref } from "@/lib/oldHref";
import { PainMeter, PainValue } from "@/site/features/pulse/PainMeter";
import { categoryNeeds, formatNumber, needText, painAria, PULSE_EMBED_LIMIT } from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { format } from "@/site/i18n/translate";
import "@/site/features/pulse/pain-meter.css";

/**
 * The old archive's bridge into «Пульс» (review hub /reviews, /reviews/<slug>, old topic pages
 * and NicheDossier): up to five needs with their real pain score and the link to all of them.
 * With `slug` — that category's needs, and nothing when it has none; without — the strongest
 * needs across categories. Links leave the old site on purpose (publicHref, reviewed below).
 */
export async function LegacyPulseLink({ locale, slug }: { locale: "ru" | "en"; slug?: string }) {
  const data = await getPulseDemand();
  const all = slug ? categoryNeeds(data, slug) : data.needs;
  if (!all.length) return null;
  const s = pulseStrings[locale];
  const names = new Map(data.categories.map((c) => [c.id, c.name[locale] || c.name.en]));
  const allHref = slug
    ? publicHref(locale, `/pulse?category=${encodeURIComponent(slug)}`) // old-links: allow — deliberate bridge to the new Pulse tab.
    : publicHref(locale, "/pulse"); // old-links: allow — deliberate bridge to the new Pulse tab.
  return (
    <section className="my-8 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-5 pt-5 pb-2" aria-labelledby={slug ? "legacy-pulse-category" : "legacy-pulse"}>
      <p className="text-caption font-semibold text-[var(--color-text-secondary)]">{s.title}</p>
      <h2 id={slug ? "legacy-pulse-category" : "legacy-pulse"} className="mt-1 text-headline font-semibold text-balance text-[var(--color-text-primary)]">
        {slug ? s.embedTitle : s.subtitle}
      </h2>
      <ul className="mt-3">
        {all.slice(0, PULSE_EMBED_LIMIT).map((need) => (
          <li key={need.id} className="border-t border-[var(--color-border-subtle)] first:border-t-0">
            {/* old-links: allow — deliberate bridge to the new Pulse need page. */}
            <a href={publicHref(locale, `/pulse/${need.id}`)} className="flex min-h-12 items-center justify-between gap-4 py-3 text-[var(--color-text-primary)] no-underline hover:underline">
              <span className="min-w-0">
                <span className="line-clamp-2 text-callout font-medium">{needText(need.title, locale)}</span>
                {slug ? null : <span className="mt-0.5 block text-caption text-[var(--color-text-tertiary)]">{names.get(need.categoryId) ?? need.categoryId}</span>}
              </span>
              <span className="flex w-16 flex-none flex-col items-end gap-1.5 text-footnote">
                <PainValue score={need.score} />
                <PainMeter score={need.score} size="mini" />
              </span>
              <span className="sr-only">{painAria(s, need.score)}</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="flex min-h-12 items-center border-t border-[var(--color-border-subtle)] text-footnote font-semibold text-[var(--color-text-primary)] underline-offset-4 hover:underline" href={allHref}>
        {format(slug ? s.embedAll : s.allNeeds, { count: formatNumber(locale, all.length) })} →
      </a>
    </section>
  );
}
