import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bookmark, Check, FileText, Lightbulb, Plus, Quote } from "lucide-react";
import { SITE_URL } from "@/site/config";
import { AppStoreBadge } from "@/site/ui/AppStore";
import type { LandingData } from "./data";
import { MediaImg } from "./parts";
import { LandingAnalytics, StickyCta } from "./islands";
import { LandingMotion, MotionToggle } from "./LandingMotion";
import { ProductShowcase } from "./ProductShowcase";
import { landingJsonLd } from "./seo";
import { INTL_LOCALE, LOCALES, LOCALE_NAMES, type Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { launchCopy } from "./launchCopy";
import { fillCopy } from "./formatLaunchCopy";
import "./launch.css";

export function LaunchLanding({ locale, data }: { locale: Locale; data: LandingData }) {
  const { numbers: n, freeTopic: free, freeIdeas, articles, topics } = data;
  const s = launchCopy[locale];
  const number = (value: number) => new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
  const vars = Object.fromEntries(Object.entries(n).map(([key, value]) => [key, number(value)]));
  const text = (template: string) => fillCopy(template, { ...vars, topic: free.name });
  const freeHref = routes.topic(locale, free.slug);
  const review = articles[0];
  const firstIdea = freeIdeas[0];
  const faq = [
    { q: s.faq1Q, a: text(s.faq1A) },
    { q: s.faq2Q, a: text(s.faq2A) },
    { q: s.faq3Q, a: text(s.faq3A) },
    { q: s.faq4Q, a: text(s.faq4A) },
    { q: s.faq5Q, a: text(s.faq5A) },
    { q: s.faq6Q, a: text(s.faq6A) },
  ];
  const showcaseCopy = {
    collection: s.collection, collectionExample: s.collectionExample,
    collectionLabel: s.collectionLabel, topicsTab: s.topicsTab, ideasTab: s.ideasTab,
    collectionHint: s.collectionHint, freeBreakdown: s.freeBreakdown,
    nicheBreakdown: s.nicheBreakdown, topicCardBody: s.topicCardBody,
    openIdea: s.openIdea, topicsFooter: s.topicsFooter, ideasFooter: s.ideasFooter,
    openCatalog: s.openCatalog,
  };

  return (
    <div className="lx" data-locale={locale}>
      <LandingMotion />
      <LandingAnalytics />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: landingJsonLd(locale, faq, `${SITE_URL}/brand/app-icon-256.png`) }} />

      <section className="sx-hero" aria-labelledby="sx-title">
        <div className="sx-hero-light" aria-hidden="true" />
        <div className="sx-wrap sx-hero-content">
          <nav className="sx-language-nav" aria-label={s.languageLabel}>
            {LOCALES.map(language => (
              <a key={language} href={routes.home(language)} lang={language} hrefLang={language}
                aria-label={LOCALE_NAMES[language]} aria-current={language === locale ? "page" : undefined}>
                {language === "ja" ? "日本語" : language.toUpperCase()}
              </a>
            ))}
          </nav>
          <a className="sx-announcement" href="#collection">
            <span className="sx-status-dot" /> {text(s.announcement)}
            <ArrowRight size={14} aria-hidden="true" />
          </a>
          <h1 id="sx-title">{s.heroTop}<br /><span>{s.heroBottom}</span></h1>
          <p className="sx-hero-lead">{s.heroLead}</p>
          <div className="sx-hero-actions" id="lx-hero-cta">
            <Link className="sx-button" href={freeHref} data-ld-event="landing_free_research">
              {s.primaryCta} <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <span className="sx-store" data-ld-event="landing_cta_appstore"><AppStoreBadge size="md" eager /></span>
          </div>
          <p className="sx-hero-micro">{text(s.heroMicro)}</p>
          <div className="sx-showcase-stage" id="collection">
            <ProductShowcase locale={locale} copy={showcaseCopy} topics={topics} ideas={freeIdeas} topicCount={n.topics} ideaCount={n.ideas} />
          </div>
          <div className="sx-hero-caption">
            <span>{s.heroCaption}</span>
            <MotionToggle className="sx-motion-toggle" labels={{ pause: s.pauseMotion, resume: s.resumeMotion, reduced: s.reducedMotion }} />
          </div>
        </div>
      </section>

      <section className="sx-proof sx-wrap" aria-label={s.numbersLabel}>
        <div className="sx-proof-intro">{s.proofTop}<br /><span>{s.proofBottom}</span></div>
        <div><strong>{number(n.reviews)}</strong><span>{s.reviewsStat}</span></div>
        <div><strong>{number(n.apps)}</strong><span>{s.appsStat}</span></div>
        <div><strong>{number(n.topics)}</strong><span>{s.topicsStat}</span></div>
      </section>

      <section className="sx-section sx-intro sx-wrap" id="how">
        <div className="sx-intro-heading" data-reveal>
          <p className="sx-kicker"><span /> {s.introKicker}</p>
          <h2>{s.introTop}<br /><span>{s.introBottom}</span></h2>
          <p>{s.introBody}</p>
        </div>
        <div className="sx-principles" data-reveal>
          <article>
            <Quote size={22} strokeWidth={1.4} aria-hidden="true" />
            <h3>{s.principle1Title}</h3>
            <p>{s.principle1Body}</p>
          </article>
          <article>
            <FileText size={22} strokeWidth={1.4} aria-hidden="true" />
            <h3>{s.principle2Title}</h3>
            <p>{s.principle2Body}</p>
          </article>
          <article>
            <Lightbulb size={22} strokeWidth={1.4} aria-hidden="true" />
            <h3>{s.principle3Title}</h3>
            <p>{s.principle3Body}</p>
          </article>
        </div>
      </section>

      <section className="sx-section sx-research" id="research">
        <div className="sx-wrap sx-research-grid">
          <div className="sx-research-copy" data-reveal>
            <p className="sx-kicker"><span /> {s.researchKicker}</p>
            <h2>{s.researchTop}<br /><span>{s.researchBottom}</span></h2>
            <p className="sx-description">{s.researchBody}</p>
            <div className="sx-research-list">
              {free.parts.map((part, i) => (
                <div key={part.title}><span>0{i + 1}</span><p>{part.title}</p></div>
              ))}
            </div>
            <Link href={freeHref} className="sx-text-link" data-ld-event="landing_free_research">
              {s.readFree} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="sx-research-display" data-reveal>
            <div className="sx-reader">
              <div className="sx-reader-top"><span><FileText size={12} aria-hidden="true" /> {s.editorialBreakdown}</span><span>inApp</span></div>
              <MediaImg art={free.cover} alt={free.cover.alt} width={800} sizes="(min-width: 900px) 500px, 85vw" className="sx-reader-image" />
              <div className="sx-reader-body">
                <span className="sx-reader-label">{fillCopy(s.researchMeta, { parts: number(free.parts.length), observations: number(free.observations), ideaCount: number(free.ideaCount) })}</span>
                <h3>{free.name}</h3>
                <p>{free.summary}</p>
                {review?.quote && <blockquote>«{review.quote.excerpt}»<cite>{fillCopy(s.quoteSource, { rating: number(review.quote.rating) })}</cite></blockquote>}
              </div>
            </div>
            {firstIdea && (
              <Link href={routes.idea(locale, firstIdea.slug)} className="sx-insight" data-ld-event="landing_idea_open" data-ld-slug={firstIdea.slug}>
                <span className="sx-insight-icon"><Lightbulb size={19} aria-hidden="true" /></span>
                <span><small>{s.observationToIdea}</small><strong>{firstIdea.title}</strong></span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="sx-section sx-wrap" id="topics">
        <div className="sx-section-heading" data-reveal>
          <div><p className="sx-kicker"><span /> {s.topicsKicker}</p><h2>{s.topicsTop}<br /><span>{s.topicsBottom}</span></h2></div>
          <Link href={routes.research(locale)} className="sx-text-link" data-ld-event="landing_cta_web">{text(s.allTopics)} <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="sx-topic-grid">
          {topics.slice(0, 6).map((topic, i) => (
            <Link key={topic.slug} href={routes.topic(locale, topic.slug)} className="sx-topic-card" data-reveal data-ld-event="landing_topic_open" data-ld-slug={topic.slug}>
              <div className="sx-topic-art"><MediaImg art={topic.cover} width={800} sizes="(min-width: 900px) 360px, (min-width: 600px) 45vw, 90vw" /><span>{String(i + 1).padStart(2, "0")}</span></div>
              <div className="sx-topic-title"><h3>{topic.name}</h3><ArrowUpRight size={17} aria-hidden="true" /></div>
              <p>{topic.free ? s.fullFree : s.fullPlus}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="sx-section sx-workspace">
        <div className="sx-wrap">
          <div className="sx-section-heading" data-reveal>
            <div><p className="sx-kicker"><span /> {s.workspaceKicker}</p><h2>{s.workspaceTop}<br /><span>{s.workspaceBottom}</span></h2></div>
            <p>{s.workspaceBody}</p>
          </div>
          <div className="sx-tools-grid" data-reveal>
            <article className="sx-tool-card">
              <div className="sx-tool-demo sx-saved-demo" aria-hidden="true">
                {freeIdeas.slice(0, 3).map((idea, i) => <div key={idea.slug}><MediaImg art={idea.cover} width={480} sizes="44px" /><span><small>{fillCopy(s.ideaLabel, { index: String(i + 1).padStart(2, "0") })}</small>{idea.title}</span><Bookmark size={14} fill="currentColor" /></div>)}
              </div>
              <div className="sx-tool-copy"><h3>{s.savedTitle}</h3><p>{s.savedBody}</p></div>
            </article>
            <article className="sx-tool-card">
              <div className="sx-tool-demo sx-note-demo" aria-hidden="true"><span>{s.myNote} <span>{s.example}</span></span><p>{s.noteSample}</p><div>{s.noteTask}<span className="sx-caret" /></div><small>{s.noteCaption}</small></div>
              <div className="sx-tool-copy"><h3>{s.notesTitle}</h3><p>{s.notesBody}</p></div>
            </article>
            <article className="sx-tool-card">
              <div className="sx-tool-demo sx-export-demo" aria-hidden="true"><div className="sx-file"><FileText size={26} strokeWidth={1.2} /><span>{s.ideaContext}</span><small>.txt</small></div><div className="sx-export-chips"><span>{s.breakdownChip}</span><Plus size={12} /><span>{s.ideaChip}</span><Plus size={12} /><span>{s.noteChip}</span></div></div>
              <div className="sx-tool-copy"><h3>{s.exportTitle}</h3><p>{s.exportBody}</p></div>
            </article>
          </div>
          <p className="sx-workspace-end">{s.workspaceEnd}</p>
        </div>
      </section>

      <section className="sx-section sx-wrap sx-plus" id="plus">
        <div className="sx-section-heading" data-reveal>
          <div><p className="sx-kicker"><span /> {s.plansKicker}</p><h2>{s.plansTop}<br /><span>{s.plansBottom}</span></h2></div>
          <p>{s.plansBody}</p>
        </div>
        <div className="sx-plans" data-reveal>
          <article className="sx-plan">
            <span className="sx-plan-label">{s.freeEyebrow}</span>
            <h3>{s.freeTitle}</h3>
            <p>{s.freeBody}</p>
            <ul>{[s.freeFeature1, text(s.freeFeature2), s.freeFeature3, s.freeFeature4].map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
            <Link href={freeHref} className="sx-button sx-button-secondary" data-ld-event="landing_free_research">{s.freePlanCta} <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </article>
          <article className="sx-plan sx-plan-plus">
            <span className="sx-plan-label">{s.plusEyebrow} <span>{s.fullAccess}</span></span>
            <h3>inApp Plus<span>+</span></h3>
            <p>{s.plusBody}</p>
            <ul>{[text(s.plusFeature1), text(s.plusFeature2), s.plusFeature3, s.plusFeature4].map(item => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul>
            <div className="sx-plan-store"><span data-ld-event="landing_cta_appstore"><AppStoreBadge size="md" /></span><span>{s.plusDuration}<br /><small>{s.priceInApp}</small></span></div>
          </article>
        </div>
        <p className="sx-terms">{s.terms}</p>
      </section>

      <section className="sx-section sx-wrap sx-faq" id="faq">
        <div data-reveal><p className="sx-kicker"><span /> {s.faqKicker}</p><h2>{s.faqTop}<br /> <span>{s.faqBottom}</span></h2><p className="sx-faq-note">{s.faqNote}</p></div>
        <div className="sx-faq-list" data-reveal>{faq.map(item => <details key={item.q}><summary>{item.q}<Plus size={18} aria-hidden="true" /></summary><p>{item.a}</p></details>)}</div>
      </section>

      <section className="sx-final" id="lx-final" aria-labelledby="sx-final-title">
        <div className="sx-final-glow" aria-hidden="true" />
        <div className="sx-wrap">
          <span className="sx-final-mark" aria-hidden="true"><Lightbulb size={27} strokeWidth={1.3} /></span>
          <h2 id="sx-final-title">{s.finalTop}<br /><span>{s.finalBottom}</span></h2>
          <p>{s.finalBody}</p>
          <Link href={freeHref} className="sx-button" data-ld-event="landing_free_research">{s.primaryCta} <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <span className="sx-final-micro">{s.finalMicro}</span>
        </div>
      </section>
      <StickyCta href={freeHref} label={s.stickyCta} after="lx-hero-cta" until="lx-final" />
    </div>
  );
}
