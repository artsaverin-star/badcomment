import Link from "next/link";
import { Card, Header, Tag, ListRow, buttonVariants, cn } from "@saverin/ui-web";
import { getFullDeck } from "@/lib/deck";
import { getSegments } from "@/lib/segments";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

const PROSE = "w-full [font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]";

function DotIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3" fill="var(--color-text-tertiary)" />
    </svg>
  );
}

// The market map: hand-authored genres (src/data/segments.json), each with its
// pricing, audience and shared problems. Tapping a genre opens the idea feed
// filtered to that genre's apps (/?seg=slug). Member icons/counts are pulled
// live from the deck so they track whatever's actually published.
export default async function Market() {
  const locale = await getLocale();
  const tr = t(locale);

  const segments = getSegments(locale);
  const deck = await getFullDeck(locale);
  const byId = new Map(deck.map((c) => [c.id, c]));

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-8 items-center text-center"
        title={tr.market.title}
        description={<span className="mx-auto block max-w-xl">{tr.market.desc}</span>}
      />

      <div className="mx-auto flex max-w-[608px] flex-col items-stretch gap-4">
        {segments.map((seg) => {
          const members = seg.appIds
            .map((id) => byId.get(id))
            .filter((c): c is NonNullable<typeof c> => c != null);
          const icons = members.filter((c) => c.icon).slice(0, 5);

          return (
            <Card
              key={seg.slug}
              className="w-full gap-6 border-transparent p-4 shadow-none sm:p-8"
            >
              <div className="flex w-full flex-col gap-3">
                <Header size="M" as="h2" title={seg.name} />
                <div className="flex flex-wrap items-center gap-2">
                  {icons.length > 0 && (
                    <div className="flex -space-x-2">
                      {icons.map((c) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={c.id}
                          src={c.icon!}
                          alt=""
                          className="size-7 rounded-[var(--radius-md)] object-cover ring-2 ring-[var(--color-surface-card)]"
                        />
                      ))}
                    </div>
                  )}
                  <Tag tone="neutral" size="S">
                    {tr.market.apps(members.length)}
                  </Tag>
                </div>
              </div>

              <section className="flex w-full flex-col gap-2">
                <Header size="S" as="h3" title={tr.market.pricing} />
                <p className={PROSE}>{seg.pricing}</p>
              </section>

              <section className="flex w-full flex-col gap-2">
                <Header size="S" as="h3" title={tr.market.audience} />
                <p className={PROSE}>{seg.audience}</p>
              </section>

              <section className="flex w-full flex-col gap-3">
                <Header size="S" as="h3" title={tr.market.problems} />
                <div className="flex flex-col gap-3">
                  {seg.problems.map((p) => (
                    <ListRow key={p} size="S" icon={<DotIcon />}>
                      {p}
                    </ListRow>
                  ))}
                </div>
              </section>

              <Link
                href={`/?seg=${seg.slug}`}
                className={cn(
                  buttonVariants({ variant: "primary", size: "M" }),
                  "h-10 w-full text-[17px] leading-[22px] sm:h-[54px]",
                )}
              >
                {tr.market.viewApps}
              </Link>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
