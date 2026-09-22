import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_DEVELOPER } from "@/site/config";
import { Ext, LegalFrame, LegalHead } from "@/site/features/legal/components";
import { pageMetadata } from "@/site/features/legal/meta";
import { legalStrings } from "@/site/features/legal/strings";
import { supportDoc } from "@/site/features/legal/support";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { MailIcon } from "@/site/ui/icons";
import { IOS_PRIVACY_URL } from "@/lib/legalPages";

// Support (DECISIONS "Legal pages"): /en/contacts is the App Store Support URL, the shipped
// iOS app opens /{ru,en}/contacts. App Review reads it: no website prices, no payment methods,
// no links to /plus, /offer/payment or /tokens. Developer details = App Store Connect. Indexed.

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMetadata({
    locale: lang,
    path: (l) => routes.contacts(l),
    title: legalStrings[lang].supportTitle,
    description: legalStrings[lang].supportDescription,
    index: true,
  });
}

export default async function SupportPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang);
  const doc = supportDoc(lang);
  const email = APP_DEVELOPER.email;

  return (
    <LegalFrame backLabel={t("Назад")} backHref={routes.settings(lang)}>
      <LegalHead title={doc.title} lead={doc.lead} />

      <section className="ia-legal-section" id="contact" aria-labelledby="contact-title">
        <h2 className="ia-legal-section__title" id="contact-title">
          {doc.contactTitle}
        </h2>
        <div className="ia-legal-mailcard">
          <p className="ia-legal-mailcard__line">
            <MailIcon size={20} strokeWidth={2} aria-hidden="true" className="ia-legal-mailcard__icon" />
            <span>E-mail: </span>
            <a href={`mailto:${email}`} className="ia-legal-mailcard__mail">
              {email}
            </a>
          </p>
          <div className="ia-legal-body">
            <p>{doc.includeIntro}</p>
            <ul>
              {doc.include.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="ia-legal-section" id="faq" aria-labelledby="faq-title">
        <h2 className="ia-legal-section__title" id="faq-title">
          {doc.faqTitle}
        </h2>
        <div className="ia-legal-cards">
          {doc.faq.map((item) => (
            <div key={item.id} id={item.id} className="ia-legal-card">
              <h3 className="ia-legal-section__title ia-legal-section__title--sm">{item.q}</h3>
              <div className="ia-legal-body">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ia-legal-section" id="legal" aria-labelledby="legal-title">
        <h2 className="ia-legal-section__title" id="legal-title">
          {doc.legalTitle}
        </h2>
        <div className="ia-legal-body">
          <ul>
            <li>
              <Link href={routes.offer(lang)} className="ia-legal-link">
                {doc.termsLabel}
              </Link>
            </li>
            <li>
              <Link href={routes.privacy(lang)} className="ia-legal-link">
                {doc.webPrivacyLabel}
              </Link>
            </li>
            <li>
              <Ext href={IOS_PRIVACY_URL}>{doc.iosPrivacyLabel}</Ext>
            </li>
          </ul>
        </div>
      </section>

      <section className="ia-legal-section" id="developer" aria-labelledby="developer-title">
        <h2 className="ia-legal-section__title" id="developer-title">
          {doc.developerTitle}
        </h2>
        <dl className="ia-legal-dl">
          {doc.rows.map((row) => (
            <div key={row.key}>
              <dt>{row.key}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </LegalFrame>
  );
}
