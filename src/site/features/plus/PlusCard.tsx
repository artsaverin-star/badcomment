"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { openPaywall } from "@/site/shell/actions";
import { useViewer } from "@/site/shell/ViewerContext";
import { useLocale, useT } from "@/site/i18n/client";
import { INTL_LOCALE } from "@/site/i18n/locales";
import { buttonClass } from "@/site/ui/Button";
import { ArrowRightIcon } from "@/site/ui/icons";
import { CheckCircleFill } from "@/site/features/settings/CheckCircleFill";
import "@/site/features/settings/settings.css";

// The Plus card (ClaritySettings.swift:203-255; spec 02 §8.3, 03 §3.5), shared by Settings and
// the MCP page: the accent-soft band «inApp PLUS» (+ «Активен» for Plus viewers) with the
// 112 px WelcomeLibrary_v7 art, a serif title, the secondary text, one rect CTA that opens the
// paywall (analytics `source`) and a centred caption. The whole card is the CTA's hit area.
// Styles: .ia-set-plus* in settings.css.
//
// Caption (:245-248):
//   "account" (Settings) = the app's accessDetail: «Проверяем доступ…» until /api/me answers,
//             then lifetime → «Бессрочный доступ», premiumUntil → «Доступ до …», otherwise «Все
//             разборы, идеи и экспорт». Non-members: the web sells one lifetime SKU → «Один
//             платёж. Без продления.» (no price here).
//   "static"  (MCP) = «Все разборы, идеи и экспорт» for Plus viewers, «Один платёж. Без
//             продления.» otherwise; no fetch.
// App keys used here must be in the page's t.pick list: «Активен», «О моём Plus», «Открыть Plus»,
// «Все разборы, идеи и экспорт», «Один платёж. Без продления.» (+ «Проверяем доступ…»,
// «Бессрочный доступ», «Доступ до %1$@» for "account").

type MeResponse = { unlimited?: boolean; lifetime?: boolean; user?: { premiumUntil?: string | null } | null };

/** GET /api/me (no cache): the viewer's current access. */
export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error(`me ${res.status}`);
  return (await res.json()) as MeResponse;
}

/** «Доступ до %1$@»: day, wide month, year in the page locale — ru keeps «г.» like the app (spec 02 §8.3). */
function formatDay(iso: string, locale: keyof typeof INTL_LOCALE): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function PlusCard({
  title,
  body,
  source,
  art,
  caption,
}: {
  title: string;
  /** Text, or text with a name that carries its own `lang` (the MCP sample niche). */
  body: ReactNode;
  /** Paywall analytics source ("settings", "mcp_page"). */
  source: string;
  art: { src: string; srcSet: string } | null;
  caption: "account" | "static";
}) {
  const t = useT();
  const locale = useLocale();
  const viewer = useViewer();
  const titleId = useId();
  const captionId = useId();
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (caption !== "account" || !viewer.plus) return;
    let alive = true;
    fetchMe()
      .then((me) => {
        if (!alive) return;
        const until = me.user?.premiumUntil;
        if (me.lifetime) setDetail(t("Бессрочный доступ"));
        else if (until && new Date(until) > new Date()) setDetail(t("Доступ до %1$@", [formatDay(until, locale)]));
        else setDetail(t("Все разборы, идеи и экспорт"));
      })
      .catch(() => alive && setDetail(t("Все разборы, идеи и экспорт")));
    return () => {
      alive = false;
    };
  }, [caption, viewer.plus, t, locale]);

  const captionText = !viewer.plus
    ? t("Один платёж. Без продления.")
    : caption === "account"
      ? (detail ?? t("Проверяем доступ…"))
      : t("Все разборы, идеи и экспорт");

  return (
    <section className="ia-set-plus" aria-labelledby={titleId}>
      <div className="ia-set-plus__band">
        <div className="ia-set-plus__eyebrow">
          <span>inApp PLUS</span>
          {viewer.plus ? (
            <span className="ia-set-plus__active">
              <CheckCircleFill size={12} knockout="var(--ia-accent-soft)" strokeWidth={2.4} />
              {t("Активен")}
            </span>
          ) : null}
        </div>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element -- pre-encoded WebP widths
          <img className="ia-set-plus__art" src={art.src} srcSet={art.srcSet} sizes="112px" width={112} height={112} alt="" decoding="async" />
        ) : null}
      </div>
      <div className="ia-set-plus__body">
        <h2 className="ia-set-plus__title" id={titleId}>
          {title}
        </h2>
        <p className="ia-set-plus__text">{body}</p>
        <button
          type="button"
          className={buttonClass({ variant: "rect", className: "ia-set-plus__cta" })}
          onClick={() => openPaywall({ source })}
          aria-describedby={captionId}
        >
          {viewer.plus ? t("О моём Plus") : t("Открыть Plus")}
          <ArrowRightIcon size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <p className="ia-set-plus__caption" id={captionId} aria-live="polite">
          {captionText}
        </p>
      </div>
    </section>
  );
}
