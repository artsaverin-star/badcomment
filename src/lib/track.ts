/* eslint-disable @typescript-eslint/no-explicit-any */
// One client-side analytics vocabulary for GA4 and Yandex Metrica. Yandex can
// consume the GA4 ecommerce calls already written to dataLayer by gtag, so we
// deliberately do not push a second legacy ecommerce object (it double-counted
// orders). reachGoal remains useful for a readable conversion funnel.

const YM_ID = 110047715;

export type TrackItem = { id: string; name: string; price: number };
type Params = Record<string, unknown>;

function windowObject(): any {
  return typeof window !== "undefined" ? window : undefined;
}

function sendGtag(event: string, params: Params, attempt = 0) {
  const w = windowObject();
  if (!w) return;
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params);
    return;
  }
  if (attempt < 3) window.setTimeout(() => sendGtag(event, params, attempt + 1), 500 * (attempt + 1));
}

function sendYmGoal(event: string, params: Params, attempt = 0) {
  const w = windowObject();
  if (!w) return;
  if (typeof w.ym === "function") {
    w.ym(YM_ID, "reachGoal", event, params);
    return;
  }
  if (attempt < 3) window.setTimeout(() => sendYmGoal(event, params, attempt + 1), 500 * (attempt + 1));
}

function sendYmHit(path: string, title: string, attempt = 0) {
  const w = windowObject();
  if (!w) return;
  if (typeof w.ym === "function") {
    w.ym(YM_ID, "hit", path, { title, referer: w.document.referrer });
    return;
  }
  if (attempt < 3) window.setTimeout(() => sendYmHit(path, title, attempt + 1), 500 * (attempt + 1));
}

function event(name: string, params: Params = {}) {
  sendGtag(name, params);
  sendYmGoal(name, params);
}

function commerce(item: TrackItem, source?: string) {
  return {
    currency: "RUB",
    value: item.price,
    source: source || "unknown",
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }],
  };
}

export function trackPageView(path: string, title?: string | null) {
  const w = windowObject();
  if (!w) return;
  const params = { page_path: path, page_location: w.location.href, page_title: title || w.document.title };
  sendGtag("page_view", params);
  sendYmHit(path, params.page_title);
}

export function trackPaywallView(source: string, price: number) {
  const key = `inapp_paywall_view:${location.pathname}:${source}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Private browsing can deny storage; analytics must never block the offer.
  }
  event("paywall_view", { source, currency: "RUB", value: price });
}

export function trackOfferOpen(source: string, loggedIn: boolean, price: number) {
  event("offer_open", { source, logged_in: loggedIn, currency: "RUB", value: price });
}

export function trackLoginRequired(source: string) {
  event("login_required", { source });
}

export function trackBeginCheckout(item: TrackItem, source?: string) {
  const params = commerce(item, source);
  sendGtag("begin_checkout", params);
  sendYmGoal("begin_checkout", params);
}

export function trackAddPaymentInfo(item: TrackItem, method: string, source?: string) {
  const params = { ...commerce(item, source), payment_type: method };
  sendGtag("add_payment_info", params);
  sendYmGoal("add_payment_info", params);
}

export function trackPaymentRedirect(source: string, method: string, price: number) {
  event("payment_redirect", { source, payment_type: method, currency: "RUB", value: price });
}

export function trackPaymentError(source: string, method: string, reason: string) {
  event("payment_error", { source, payment_type: method, reason: reason.slice(0, 100) });
}

export function trackPurchase(txnId: string, item: TrackItem, source?: string) {
  const params = { transaction_id: txnId, ...commerce(item, source) };
  sendGtag("purchase", params);
  sendYmGoal("purchase", params);
}

export function trackReviewCategoryOpen(slug: string, locked: boolean) {
  event(locked ? "locked_category_open" : "review_category_open", { category: slug });
}
