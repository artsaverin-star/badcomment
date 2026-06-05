import { Header } from "@saverin/ui-web";
import { getSegmentCards } from "@/lib/segmentCards";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import SegmentCards from "@/components/SegmentCards";

export const dynamic = "force-dynamic";

// Directory of classified segments. Each card links to /segment/<slug>.
// The legacy /?seg=<slug> querystring is gone — segment pages are now
// proper /segment/<slug> routes.
export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const cards = await getSegmentCards(locale);

  return (
    <main className="mx-auto w-full max-w-4xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
      />
      <div className="mt-8">
        <SegmentCards cards={cards} locale={locale} />
      </div>
    </main>
  );
}
