"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { openPaywall, openSignIn, signOut } from "@/site/shell/actions";
import { useViewer } from "@/site/shell/ViewerContext";
import { useLocale, useT, useWebStrings } from "@/site/i18n/client";
import { INTL_LOCALE } from "@/site/i18n/locales";
import { applyTheme, THEMES, type Theme } from "@/site/theme";
import { buttonClass } from "@/site/ui/Button";
import { ArrowRightIcon, RadioOffIcon, RadioOnIcon, RetryIcon, SignInIcon, SignOutIcon } from "@/site/ui/icons";
import { toast } from "@/site/ui/Toast";
import { settingsStrings } from "./strings";
import "./settings.css";

// Client parts of Settings: the Plus card, the account + restore rows and the appearance picker.


type MeResponse = { unlimited?: boolean; lifetime?: boolean; user?: { premiumUntil?: string | null } | null };

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error(`me ${res.status}`);
  return (await res.json()) as MeResponse;
}

function formatDay(iso: string, locale: keyof typeof INTL_LOCALE): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" }).format(d);
  return locale === "ru" ? s.replace(/\s?г\.$/, "") : s;
}

/**
 * Plus card (spec 02 §8.3, 03 §3.5): one control that opens the paywall (source "settings").
 * Caption for members = the app's accessDetail: «Проверяем доступ…» until /api/me answers, then
 * lifetime → «Бессрочный доступ», premiumUntil → «Доступ до …», otherwise «Все разборы, идеи и
 * экспорт». Non-members: the web sells one lifetime SKU → «Один платёж. Без продления.» (no price here).
 */
export function PlusCard({ art }: { art: { src: string; srcSet: string } | null }) {
  const t = useT();
  const locale = useLocale();
  const viewer = useViewer();
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!viewer.plus) return;
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
  }, [viewer.plus, t, locale]);

  const caption = viewer.plus ? (detail ?? t("Проверяем доступ…")) : t("Один платёж. Без продления.");

  return (
    <section className="ia-set-plus" aria-labelledby="settings-plus-title">
      <div className="ia-set-plus__band">
        <div className="ia-set-plus__eyebrow">
          <span>inApp PLUS</span>
          {viewer.plus ? (
            <span className="ia-set-plus__active">
              <RadioOnIcon size={15} strokeWidth={2.4} aria-hidden="true" />
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
        <h2 className="ia-set-plus__title" id="settings-plus-title">
          {t("Все разборы\nи идеи").replace(/\n/g, " ")}
        </h2>
        <p className="ia-set-plus__text">{t("Подробные исследования, идеи приложений и экспорт материалов.")}</p>
        <button
          type="button"
          className={buttonClass({ variant: "rect", className: "ia-set-plus__cta" })}
          onClick={() => openPaywall({ source: "settings" })}
          aria-describedby="settings-plus-caption"
        >
          {viewer.plus ? t("О моём Plus") : t("Открыть Plus")}
          <ArrowRightIcon size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <p className="ia-set-plus__caption" id="settings-plus-caption" aria-live="polite">
          {caption}
        </p>
      </div>
    </section>
  );
}

function RowInner({ icon, title, sub, trail }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; trail?: ReactNode }) {
  return (
    <>
      <span className="ia-set-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ia-set-row__text">
        <span className="ia-set-row__title">{title}</span>
        {sub ? <span className="ia-set-row__sub">{sub}</span> : null}
      </span>
      {trail ? <span className="ia-set-row__trail">{trail}</span> : null}
    </>
  );
}

/**
 * Account + restore (spec 02 §8.4 with the web wording of spec 09 G11): guests get «Войти»;
 * members see their name, «Восстановить покупки» (re-reads the access from /api/me and
 * refreshes the page when Plus appeared) and «Выйти».
 */
export function AccountRows() {
  const t = useT();
  const s = useWebStrings(settingsStrings);
  const viewer = useViewer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (!viewer.loggedIn || !viewer.user) {
    return (
      <div className="ia-set-box ia-set-box--sm">
        <button type="button" className="ia-set-row" onClick={() => openSignIn({ reason: "settings" })}>
          <RowInner icon={<SignInIcon size={20} strokeWidth={2} />} title={s.signIn} sub={s.signInHint} />
        </button>
      </div>
    );
  }

  const restore = async () => {
    setBusy(true);
    setResult(null);
    try {
      const me = await fetchMe();
      if (me.unlimited) {
        setResult(s.restoreActive);
        if (!viewer.plus) router.refresh();
      } else {
        setResult(s.restoreNone);
      }
    } catch {
      setResult(s.restoreFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ia-set-box ia-set-box--sm">
      <div className="ia-set-row">
        <RowInner
          icon={<span className="ia-set-avatar">{viewer.user.initial}</span>}
          title={viewer.user.name ?? s.account}
          sub={viewer.plus ? s.restoreActive : undefined}
        />
      </div>
      <div>
        <button type="button" className="ia-set-row" onClick={restore} disabled={busy} aria-busy={busy || undefined}>
          <RowInner
            icon={busy ? <span className="ia-spinner" /> : <RetryIcon size={20} strokeWidth={2} />}
            title={busy ? t("Восстанавливаем…") : t("Восстановить покупки")}
          />
        </button>
        {result ? (
          <p className="ia-set-result" role="status">
            {result}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="ia-set-row ia-set-row--danger"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          void signOut().then((ok) => {
            if (!ok) {
              setLeaving(false);
              toast(s.signOutFailed, { tone: "error" });
            }
          });
        }}
      >
        <RowInner icon={<SignOutIcon size={20} strokeWidth={2} />} title={s.signOut} />
      </button>
    </div>
  );
}

const THEME_KEYS: Record<Theme, string> = { light: "Светлая", dark: "Тёмная", system: "Системная" };

/** «Оформление» (spec 02 §8.6): three live-preview tiles; applies immediately (cookie ia_theme). */
export function ThemePicker({ initial }: { initial: Theme }) {
  const t = useT();
  const [theme, setTheme] = useState<Theme>(initial);
  return (
    <fieldset className="ia-set-themes">
      <legend className="sr-only">{t("Оформление")}</legend>
      {THEMES.map((value) => (
        <label key={value} className="ia-set-theme">
          <input
            type="radio"
            name="ia-theme"
            value={value}
            checked={theme === value}
            onChange={() => {
              setTheme(value);
              applyTheme(value);
            }}
          />
          <span className="ia-set-theme__ring" aria-hidden="true">
            <span className={`ia-set-preview${value === "system" ? " ia-set-preview--system" : ""}`}>
              {(value === "dark" ? ["dark"] : value === "light" ? ["light"] : ["light", "dark"]).map((half) => (
                <span key={half} className={`ia-set-preview__half ia-set-preview__half--${half}`}>
                  <span className="ia-set-preview__bar" />
                  <span className="ia-set-preview__card">
                    <span />
                  </span>
                  <span className="ia-set-preview__line" />
                </span>
              ))}
            </span>
          </span>
          <span className="ia-set-theme__label">{t(THEME_KEYS[value])}</span>
          <span className="ia-set-theme__radio" aria-hidden="true">
            {theme === value ? <RadioOnIcon size={18} strokeWidth={2.2} /> : <RadioOffIcon size={18} strokeWidth={2} />}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
