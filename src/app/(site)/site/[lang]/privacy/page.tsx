import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getManifest } from "@/site/content";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { LegalFrame } from "@/site/features/legal/components";
import { pageMetadata } from "@/site/features/legal/meta";
import { privacyDoc } from "@/site/features/legal/privacy";
import { legalStrings } from "@/site/features/legal/strings";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { Heading } from "@/site/ui/Heading";
import { ExternalIcon, MailIcon } from "@/site/ui/icons";
import { IOS_PRIVACY_URL } from "@/lib/legalPages";

// Website privacy notice (spec 09 C3/G4): the app's privacy-sheet layout — hero card with the
// ClarityResearch illustration, then one surface card per topic — with web-specific text that
// describes only what this site does. Indexed. OWNER REVIEW of the wording is pending.

type Params = { lang: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = legalStrings[lang];
  return pageMetadata({
    locale: lang,
    path: (l) => routes.privacy(l),
    title: s.privacyTitle,
    description: s.privacyDescription,
    index: true,
  });
}

export default async function PrivacyPage({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, manifest] = await Promise.all([getT(lang), getManifest()]);
  const doc = privacyDoc(lang);
  const art = manifest.art.ClarityResearch;

  return (
    <LegalFrame backLabel={t("Назад")} backHref={routes.settings(lang)}>
      <div className="ia-privacy">
        <Heading title={legalStrings[lang].privacyTitle} />
        <section className="ia-privacy-hero">
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element -- pre-encoded WebP widths
            <img
              className="ia-privacy-hero__art"
              src={mediaSrc(art, 210)}
              srcSet={mediaSrcSet(art)}
              sizes="105px"
              width={105}
              height={105}
              alt=""
              decoding="async"
            />
          ) : null}
          <p className="ia-privacy-hero__title" id="privacy-hero-title">
            {doc.heroTitle}
          </p>
          <p className="ia-privacy-hero__sub">{doc.heroSub}</p>
        </section>

        {doc.cards.map((card) => (
          <section key={card.id} id={card.id} className="ia-privacy-card">
            <h2 className="ia-legal-section__title ia-legal-section__title--sm" id={`${card.id}-title`}>
              {card.title}
            </h2>
            <div className="ia-legal-body">{card.body}</div>
          </section>
        ))}

        <div className="ia-privacy-links">
          <Link href={routes.contacts(lang)}>
            <MailIcon size={18} strokeWidth={2} aria-hidden="true" />
            {doc.contactLabel}
          </Link>
          <a href={IOS_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {doc.iosLabel}
            <ExternalIcon size={16} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>
        <p className="ia-privacy-updated">{doc.updated}</p>
      </div>
    </LegalFrame>
  );
}
