/* eslint-disable @typescript-eslint/no-explicit-any */
// Thin client-side e-commerce tracking for GA4 (gtag) + Yandex Metrica. Both tags
// are loaded in the root layout; these helpers fire the funnel events so the
// built-in purchase funnels (GA4 + Metrica e-commerce) populate. No-ops on the
// server or before the tags load.

const YM_ID = 110047715;

export type TrackItem = { id: string; name: string; price: number };

function gtag(): any {
  return typeof window !== "undefined" ? (window as any).gtag : undefined;
}
function ym(): any {
  return typeof window !== "undefined" ? (window as any).ym : undefined;
}
function dataLayer(): any[] {
  if (typeof window === "undefined") return [];
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}
function ecProduct(i: TrackItem) {
  return { id: i.id, name: i.name, price: i.price, quantity: 1 };
}

export function trackBeginCheckout(item: TrackItem) {
  gtag()?.("event", "begin_checkout", { currency: "RUB", value: item.price, items: [{ item_id: item.id, item_name: item.name, price: item.price }] });
  dataLayer().push({ ecommerce: { currency: "RUB", detail: { products: [ecProduct(item)] } } });
  ym()?.(YM_ID, "reachGoal", "begin_checkout");
}

export function trackAddPaymentInfo(item: TrackItem, method: string) {
  gtag()?.("event", "add_payment_info", { currency: "RUB", value: item.price, payment_type: method, items: [{ item_id: item.id, item_name: item.name, price: item.price }] });
  ym()?.(YM_ID, "reachGoal", "add_payment_info");
}

export function trackPurchase(txnId: string, item: TrackItem) {
  gtag()?.("event", "purchase", { transaction_id: txnId, currency: "RUB", value: item.price, items: [{ item_id: item.id, item_name: item.name, price: item.price }] });
  dataLayer().push({ ecommerce: { currency: "RUB", purchase: { actionField: { id: txnId }, products: [ecProduct(item)] } } });
  ym()?.(YM_ID, "reachGoal", "purchase");
}
