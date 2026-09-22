import type { ReactNode } from "react";
import { Heading } from "@/site/ui/Heading";
import { BackButton, DetailToolbar } from "@/site/ui/Toolbar";
import "./legal.css";

// Building blocks of the legal pages (server components). No price, payment method or
// purchase link may appear in anything rendered on /offer and /contacts (DECISIONS "Legal pages").

export type LegalSection = { id: string; title: string; body: ReactNode };

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Link to another site: new tab, no referrer. */
export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="ia-legal-link" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function MailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="ia-legal-link">
      {email}
    </a>
  );
}

/** Page frame: «Назад» pill (history back inside the site, else Settings), the settings column. */
export function LegalFrame({
  backLabel,
  backHref,
  lang,
  children,
}: {
  backLabel: string;
  backHref: string;
  /** Language of the document when it differs from the page locale (payment offer: ru). */
  lang?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <DetailToolbar leading={<BackButton label={backLabel} fallbackHref={backHref} />} />
      <article className="ia-page ia-page--library ia-legal" lang={lang}>
        {children}
      </article>
    </div>
  );
}

export function LegalHead({ title, meta, lead, note }: { title: string; meta?: ReactNode; lead?: ReactNode; note?: ReactNode }) {
  return (
    <header className="ia-legal-head">
      {note}
      <Heading title={title} />
      {meta ? <p className="ia-legal-meta">{meta}</p> : null}
      {lead ? <p className="ia-legal-lead">{lead}</p> : null}
    </header>
  );
}

export function LegalToc({ label, sections }: { label: string; sections: LegalSection[] }) {
  return (
    <nav className="ia-legal-toc" aria-labelledby="legal-toc-label">
      <p className="ia-legal-toc__label" id="legal-toc-label">
        {label}
      </p>
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`}>{s.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Numbered sections («1. Кто предоставляет inApp» …). */
export function LegalSections({ sections, numbered = true }: { sections: LegalSection[]; numbered?: boolean }) {
  return (
    <div className="ia-legal-sections">
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="ia-legal-section" aria-labelledby={`${s.id}-title`}>
          <h2 className="ia-legal-section__title ia-legal-section__title--sm" id={`${s.id}-title`}>
            {numbered ? `${i + 1}. ` : ""}
            {s.title}
          </h2>
          <div className="ia-legal-body">{s.body}</div>
        </section>
      ))}
    </div>
  );
}
