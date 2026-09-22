"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT, useWebStrings } from "../../i18n/client";
import { isSafeReturnPath, parsePublicPath } from "../../routing";
import { currentPublicPath, registerSignInHandler, type SignInRequest } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { Sheet, SheetAction } from "../../ui/Sheet";
import { toast } from "../../ui/Toast";
import { loadPendingTelegram, SignInPanel } from "./SignInPanel";
import { authStrings, noticeFor } from "./strings";

// The global sign-in dialog, mounted once in the new root layout. It:
//   • answers openSignIn({reason, returnTo}) from anywhere (registerSignInHandler);
//   • shows the errors the auth endpoints redirect with (?auth=google_error|google_unconfigured,
//     ?login=expired — spec 06 §3.2 says nothing renders them today), then strips the params;
//   • reopens itself when a Telegram login is still pending (like the old AuthButton);
//   • on Telegram success closes, toasts and refreshes the server tree (the viewer becomes
//     signed in; the paywall resumes a purchase from there).

type State = { returnTo: string; reason: string | null; notice: string | null };

function isLoginPage(pathname: string | null): boolean {
  return parsePublicPath(pathname).segments[0] === "login";
}

export function SignInHost() {
  const s = useWebStrings(authStrings);
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const viewer = useViewer();
  const [state, setState] = useState<State | null>(null);
  const openedAt = useRef<string | null>(null);

  const open = useCallback((req: SignInRequest & { notice?: string | null }) => {
    const returnTo = isSafeReturnPath(req.returnTo) ? req.returnTo : currentPublicPath();
    openedAt.current = window.location.pathname;
    setState({ returnTo, reason: req.reason ?? null, notice: req.notice ?? null });
  }, []);

  useEffect(
    () =>
      registerSignInHandler((req) => {
        if (isLoginPage(window.location.pathname)) return; // already on the sign-in page
        open(req);
      }),
    [open],
  );

  // Following a link inside the dialog (terms, privacy) or any navigation closes it.
  useEffect(() => {
    if (!state || openedAt.current === null) return;
    if (window.location.pathname !== openedAt.current) {
      const timer = window.setTimeout(() => setState(null), 0);
      return () => window.clearTimeout(timer);
    }
  }, [pathname, state]);

  // Once per page load: redirect errors from the auth endpoints, or a pending Telegram login.
  const boot = useRef<{ notice: string | null; done: boolean } | null>(null);
  useEffect(() => {
    if (!boot.current) {
      const url = new URL(window.location.href);
      const auth = url.searchParams.get("auth");
      const login = url.searchParams.get("login");
      boot.current = { notice: noticeFor(s, auth, login), done: false };
      if (auth !== null || login !== null) {
        url.searchParams.delete("auth");
        url.searchParams.delete("login");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    }
    const b = boot.current;
    if (b.done || isLoginPage(window.location.pathname)) return; // /login renders its own notice
    const timer = window.setTimeout(() => {
      b.done = true;
      if (b.notice) {
        if (viewer.loggedIn) toast(b.notice, { tone: "error", duration: 5000 });
        else open({ notice: b.notice });
        return;
      }
      if (!viewer.loggedIn && loadPendingTelegram()?.waiting) open({});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [s, viewer.loggedIn, open]);

  const close = useCallback(() => setState(null), []);

  const onSuccess = useCallback(() => {
    setState(null);
    toast(s.signedIn);
    // Let the sheet hand its history entry back before the server tree is re-rendered.
    window.setTimeout(() => router.refresh(), 60);
  }, [router, s.signedIn]);

  return (
    <Sheet
      open={state !== null}
      onClose={close}
      variant="dialog"
      label={s.title}
      trailing={<SheetAction onClick={close}>{t("Закрыть")}</SheetAction>}
    >
      {state ? (
        <SignInPanel returnTo={state.returnTo} reason={state.reason} notice={state.notice} onSuccess={onSuccess} />
      ) : null}
    </Sheet>
  );
}
