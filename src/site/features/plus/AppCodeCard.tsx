"use client";

import { useState } from "react";
import type { Locale } from "@/site/i18n/locales";
import { INTL_LOCALE } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import { AppMark, CheckIcon, CopyIcon, buttonClass, toast } from "@/site/ui";
import { appCodeStrings } from "./appCodeStrings";
import "./plus.css";

export type AppCodeView = { code: string; redeemUrl: string; expiresAt: string } | null;

/** Apple expires codes at 00:00 PT on expiresAt: the last day to redeem is the day before. */
function lastDay(locale: Locale, expiresAt: string): string {
  const d = new Date(expiresAt);
  d.setUTCDate(d.getUTCDate() - 1);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

/**
 * The personal App Store offer code of a website lifetime buyer (free lifetime Plus in the
 * iOS app). Rendered only for that signed-in user; `code === null` = pool empty for now.
 */
export function AppCodeCard({ locale, view }: { locale: Locale; view: AppCodeView }) {
  const s = appCodeStrings[locale];
  const [copied, setCopied] = useState(false);

  if (!view) {
    return (
      <section className="ia-appcode" aria-label={s.pendingTitle}>
        <AppMark size={40} />
        <div className="ia-appcode__main">
          <h2 className="ia-appcode__title">{s.pendingTitle}</h2>
          <p className="ia-appcode__text">{s.pendingBody}</p>
        </div>
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(view.code);
      setCopied(true);
      toast(s.copied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the code stays selectable */
    }
  };

  return (
    <section className="ia-appcode" aria-labelledby="ia-appcode-title">
      <AppMark size={40} />
      <div className="ia-appcode__main">
        <h2 className="ia-appcode__title" id="ia-appcode-title">
          {s.title}
        </h2>
        <p className="ia-appcode__text">{s.body}</p>
        <div className="ia-appcode__row">
          <code className="ia-appcode__code" translate="no">
            {view.code}
          </code>
          <button type="button" className="ia-icon-btn" aria-label={s.copy} title={s.copy} onClick={copy}>
            {copied ? <CheckIcon size={17} strokeWidth={2.2} /> : <CopyIcon size={17} strokeWidth={2} />}
          </button>
        </div>
        <a className={buttonClass({ variant: "primary", block: true })} href={view.redeemUrl} target="_blank" rel="noopener noreferrer">
          {s.redeem}
        </a>
        <p className="ia-appcode__note">
          {format(s.validUntil, { date: lastDay(locale, view.expiresAt) })} {s.oneAccount}
        </p>
      </div>
    </section>
  );
}
