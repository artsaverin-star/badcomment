// The shell's small client API (call from event handlers in client components).
//
//   openSignIn({ reason: "save" })     → the sign-in dialog once the auth feature registers it
//                                        (registerSignInHandler), else /<L>/login?return_to=…
//   openPaywall({ source: "idea_card" }) → the paywall once the plus feature registers it
//                                        (registerPaywallHandler), else /<L>/plus?source=…
//
// Handlers are module-level singletons: the feature that owns the dialog registers once
// (e.g. in an effect of a component mounted in the layout) and gets an unregister function.

import { isLocale, DEFAULT_LOCALE, type Locale } from "../i18n/locales";
import { parsePublicPath, routes } from "../routing";

export type SignInRequest = {
  /** Why sign-in is needed (analytics + dialog copy), e.g. "header", "buy", "sync". */
  reason?: string;
  /** Public path to come back to; default = the current page (path + query). */
  returnTo?: string;
};

export type PaywallRequest = {
  /** Analytics surface, e.g. "idea_card", "research_gate", "settings". */
  source: string;
};

type Handler<T> = (request: T) => void;

let signInHandler: Handler<SignInRequest> | null = null;
let paywallHandler: Handler<PaywallRequest> | null = null;
let navigator: ((href: string) => void) | null = null;

/** The shell registers the Next router here so fallbacks navigate client-side. */
export function registerNavigator(fn: (href: string) => void): () => void {
  navigator = fn;
  return () => {
    if (navigator === fn) navigator = null;
  };
}

function go(href: string): void {
  if (navigator) navigator(href);
  else window.location.assign(href);
}

export function registerSignInHandler(fn: Handler<SignInRequest>): () => void {
  signInHandler = fn;
  return () => {
    if (signInHandler === fn) signInHandler = null;
  };
}

export function registerPaywallHandler(fn: Handler<PaywallRequest>): () => void {
  paywallHandler = fn;
  return () => {
    if (paywallHandler === fn) paywallHandler = null;
  };
}

/** The page locale from the browser URL. */
export function currentLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const { locale } = parsePublicPath(window.location.pathname);
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

/** Current public path + query (the natural `return_to`). */
export function currentPublicPath(): string {
  if (typeof window === "undefined") return "/";
  return parsePublicPath(window.location.pathname).pathname + window.location.search;
}

export function openSignIn(request: SignInRequest = {}): void {
  const req = { ...request, returnTo: request.returnTo ?? currentPublicPath() };
  if (signInHandler) {
    signInHandler(req);
    return;
  }
  go(routes.login(currentLocale(), { returnTo: req.returnTo, reason: req.reason }));
}

export function openPaywall(request: PaywallRequest): void {
  if (paywallHandler) {
    paywallHandler(request);
    return;
  }
  go(routes.plus(currentLocale(), { source: request.source }));
}

/** POST /api/auth/logout, then reload the current page as a guest. */
export async function signOut(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) return false;
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
