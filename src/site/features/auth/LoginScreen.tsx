"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SignInPanel } from "./SignInPanel";

// /<L>/login: the same panel as the dialog, as a page. Telegram success → the return path
// (Google and the e-mail link come back to it on their own).
// App mode (?app=1, the iOS app's sign-in sheet): the return path is /<L>/app-auth, which
// answers with a server-side redirect to inapp://auth?code=… — so it is a full document
// navigation, never a client-side one (the sheet must see the redirect itself).

export function LoginScreen({
  returnTo,
  reason,
  notice,
  app = false,
  appChallenge = null,
}: {
  returnTo: string;
  reason: string | null;
  notice: string | null;
  app?: boolean;
  /** App mode: the PKCE challenge for the e-mail link's return path (src/lib/appFlow.ts). */
  appChallenge?: string | null;
}) {
  const router = useRouter();
  const onSuccess = useCallback(() => {
    if (app) {
      window.location.assign(returnTo);
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }, [router, returnTo, app]);

  return (
    <div className="ia-login-page">
      <div className="ia-login-page__card">
        <SignInPanel
          returnTo={returnTo}
          reason={reason}
          notice={notice}
          onSuccess={onSuccess}
          headingLevel="h1"
          app={app}
          appChallenge={appChallenge}
        />
      </div>
    </div>
  );
}
