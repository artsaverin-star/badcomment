import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/site/config";
import { LegalFrame, LegalHead } from "@/site/features/legal/components";
import { paymentDoc } from "@/site/features/legal/payment";
import { legalStrings } from "@/site/features/legal/strings";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";

// The website's public payment offer (YooKassa, DECISIONS "Legal pages"): the Russian legal
// text is identical in every locale; en/de/fr/ja get a one-line note that it is in Russian.
// SEO: the ru page is indexed with a self-canonical, like the old /ru/offer today. The other
// locales serve the same Russian document, so they are noindex and canonical to /ru (no
// hreflang cluster: there is only one language version of this document).

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = legalStrings[lang];
  const ruUrl = `${SITE_URL}/ru/offer/payment`;
  return {
    title: s.paymentTitle,
    description: s.paymentDescription,
    alternates: { canonical: ruUrl },
    openGraph: { title: `${s.paymentTitle} — inApp`, description: s.paymentDescription, url: ruUrl, siteName: "inApp", type: "website" },
    robots: lang === "ru" ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PaymentOfferPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);
  const doc = paymentDoc(lang);
  const note = legalStrings[lang].paymentNote;

  return (
    <LegalFrame backLabel={t("Назад")} backHref={routes.settings(lang)} lang="ru">
      <LegalHead
        title={doc.title}
        meta={doc.edition}
        note={
          lang !== "ru" && note ? (
            <p className="ia-legal-note" lang={lang}>
              {note}
            </p>
          ) : undefined
        }
      />
      <div className="ia-legal-sections">
        {doc.sections.map(([h, body]) => (
          <section key={h} className="ia-legal-section">
            <h2 className="ia-legal-section__title ia-legal-section__title--sm">{h}</h2>
            <div className="ia-legal-body">
              <p>{body}</p>
            </div>
          </section>
        ))}
      </div>
    </LegalFrame>
  );
}
