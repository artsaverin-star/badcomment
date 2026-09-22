"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SignInPanel } from "./SignInPanel";

// /<L>/login: the same panel as the dialog, as a page. Telegram success → the return path
// (Google and the e-mail link come back to it on their own).

export function LoginScreen({
  returnTo,
  reason,
  notice,
}: {
  returnTo: string;
  reason: string | null;
  notice: string | null;
}) {
  const router = useRouter();
  const onSuccess = useCallback(() => {
    router.replace(returnTo);
    router.refresh();
  }, [router, returnTo]);

  return (
    <div className="ia-login-page">
      <div className="ia-login-page__card">
        <SignInPanel returnTo={returnTo} reason={reason} notice={notice} onSuccess={onSuccess} headingLevel="h1" />
      </div>
    </div>
  );
}
