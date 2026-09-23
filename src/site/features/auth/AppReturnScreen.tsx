"use client";

import { useEffect } from "react";
import { AppMark } from "../../ui/icons";
import type { AuthStrings } from "./strings";
import "./auth.css";

// /<L>/app-auth?from=email: the sign-in finished outside the app's sign-in sheet (the e-mail
// link opened in Safari or a mail app's browser). Opens inapp://auth?code=… right away and
// keeps «Открыть приложение» for when the "Open in inApp?" prompt was declined or missed.
// The code is personal and single-use: a <button>, not a link (Metrica/GA link tracking would
// log the URL), inside `ym-hide-content` (Webvisor must not record it).

export function AppReturnScreen({
  href,
  strings: s,
}: {
  /** inapp://auth?code=… */
  href: string;
  strings: Pick<AuthStrings, "returnTitle" | "returnBody" | "returnOpen" | "returnFine">;
}) {
  useEffect(() => {
    // Deferred: React StrictMode mounts twice in development; only one prompt should appear.
    const timer = window.setTimeout(() => window.location.assign(href), 120);
    return () => window.clearTimeout(timer);
  }, [href]);

  return (
    <div className="ia-app-return">
      <div className="ia-app-return__card ym-hide-content">
        <div className="ia-auth">
          <span className="ia-auth__mark" aria-hidden="true">
            <AppMark size={56} />
          </span>
          <h1 className="ia-auth__title">{s.returnTitle}</h1>
          <p className="ia-auth__lead">{s.returnBody}</p>
          <div className="ia-auth__methods">
            <button
              type="button"
              className="ia-auth__method ia-auth__method--primary"
              onClick={() => window.location.assign(href)}
            >
              {s.returnOpen}
            </button>
          </div>
          <p className="ia-auth__fine">{s.returnFine}</p>
        </div>
      </div>
    </div>
  );
}
