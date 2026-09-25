"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { openSignIn, signOut } from "@/site/shell/actions";
import { useViewer } from "@/site/shell/ViewerContext";
import { useT, useWebStrings } from "@/site/i18n/client";
import { applyTheme, THEMES, type Theme } from "@/site/theme";
import { RadioOffIcon, RetryIcon, SignInIcon, SignOutIcon } from "@/site/ui/icons";
import { toast } from "@/site/ui/Toast";
import { fetchMe } from "@/site/features/plus/PlusCard";
import { CheckCircleFill } from "./CheckCircleFill";
import { DeleteAccountRow } from "./DeleteAccount";
import { settingsStrings } from "./strings";
import "./settings.css";

// Client parts of Settings: the account + restore rows and the appearance picker. The Plus card
// is the shared features/plus/PlusCard (caption "account").

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
 * refreshes the page when Plus appeared), «Выйти» and «Удалить аккаунт» (./DeleteAccount.tsx).
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
        {/* The app's «Восстановить покупки» row; on the web access lives in the account (spec 09 G11). */}
        <button type="button" className="ia-set-row" onClick={() => openSignIn({ reason: "settings" })}>
          <RowInner icon={<SignInIcon size={19} strokeWidth={2} />} title={s.signInRestore} />
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
        {/* The glyph stays; the spinner sits at the trailing edge (ClaritySettings.swift:259-263). */}
        <button type="button" className="ia-set-row" onClick={restore} disabled={busy} aria-busy={busy || undefined}>
          <RowInner
            icon={<RetryIcon size={19} strokeWidth={2} />}
            title={busy ? t("Восстанавливаем…") : t("Восстановить покупки")}
            trail={busy ? <span className="ia-spinner" aria-hidden="true" /> : undefined}
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
        <RowInner icon={<SignOutIcon size={19} strokeWidth={2} />} title={s.signOut} />
      </button>
      <DeleteAccountRow rowClassName="ia-set-row ia-set-row--danger" />
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
            {theme === value ? <CheckCircleFill /> : <RadioOffIcon size={18} strokeWidth={2} />}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
