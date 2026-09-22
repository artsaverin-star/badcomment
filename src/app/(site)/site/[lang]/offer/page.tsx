import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalFrame, LegalHead, LegalSections, LegalToc } from "@/site/features/legal/components";
import { pageMetadata } from "@/site/features/legal/meta";
import { legalStrings } from "@/site/features/legal/strings";
import { termsDoc } from "@/site/features/legal/terms";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";

// Terms of Use (DECISIONS "Legal pages"). The shipped iOS app opens /{ru,en}/offer from
// Settings → «Условия использования» and App Review reads it: no website prices, no payment
// methods, no links to /plus, /offer/payment or /tokens anywhere on this page. Indexed.

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const doc = termsDoc(lang, routes.contacts(lang));
  return pageMetadata({
    locale: lang,
    path: (l) => routes.offer(l),
    title: doc.title,
    description: legalStrings[lang].termsDescription,
    index: true,
  });
}

export default async function TermsPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);
  const doc = termsDoc(lang, routes.contacts(lang));

  return (
    <LegalFrame backLabel={t("Назад")} backHref={routes.settings(lang)}>
      <LegalHead title={doc.title} meta={doc.effective} lead={doc.intro} />
      <LegalToc label={doc.contents} sections={doc.sections} />
      <LegalSections sections={doc.sections} />
    </LegalFrame>
  );
}
