import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCESS_PRICE_RUB } from "../src/lib/tokenConfig";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.equal(ACCESS_PRICE_RUB, 990, "The public price and the charged price must share one source of truth");

const checkoutRoute = read("src/app/api/pay/yookassa/route.ts");
assert.match(checkoutRoute, /paymentAttempt\.create/, "Checkout must create a server-side attempt before redirecting");
assert.match(checkoutRoute, /checkoutId/, "YooKassa metadata must correlate the webhook with the checkout");
assert.match(checkoutRoute, /ACCESS_PRICE_RUB/, "Checkout must charge the public price constant");

const webhook = read("src/app/api/pay/yookassa/webhook/route.ts");
assert.match(webhook, /payment\?\.status !== "succeeded" \|\| payment\?\.paid !== true/, "Webhook must verify captured payment state");
assert.match(webhook, /status: "succeeded", confirmedAt: new Date\(\)/, "Verified payments must complete the server funnel");
assert.match(webhook, /payment\?\.status === "succeeded" \? "confirming"/, "Captured money must remain unconfirmed until access is durable");
assert.match(webhook, /status: 500/, "Transient fulfilment failures must ask YooKassa to retry");

const purchaseTracker = read("src/components/PurchaseTracker.tsx");
const verified = purchaseTracker.indexOf('data.status === "succeeded"');
const purchase = purchaseTracker.indexOf("trackPurchase(");
assert.ok(verified >= 0 && purchase > verified, "Browser revenue must be emitted only after server confirmation");
assert.doesNotMatch(purchaseTracker, /params\.get\("bought"\)/, "A return URL alone must not count as a purchase");

// New site (site-v2): the payment-return tracker keeps the same guarantees.
const v2Tracker = read("src/site/features/plus/CheckoutReturn.tsx");
const v2Verified = v2Tracker.indexOf('data.status === "succeeded"');
const v2Purchase = v2Tracker.indexOf("trackPurchase(");
assert.ok(v2Verified >= 0 && v2Purchase > v2Verified, "New-site revenue must be emitted only after server confirmation");
assert.doesNotMatch(v2Tracker, /params\.get\("bought"\)/, "New site: a return URL alone must not count as a purchase");
assert.match(v2Tracker, /inapp_purchase:\$\{data\.transactionId\}/, "New site: one purchase event per transaction (shared de-dupe key)");
assert.match(v2Tracker, /\/api\/pay\/status\?checkout=/, "New site: the return page must confirm against the server attempt");

const v2Offer = read("src/site/features/plus/offer.ts");
assert.match(v2Offer, /PLUS_KIND = "lifetime"/, "New site sells only the existing lifetime SKU (prices frozen)");
assert.match(v2Offer, /ACCESS_PRICE_RUB/, "New-site paywall must show the charged price constant");
const v2Paywall = read("src/site/features/plus/PlusOffer.tsx");
assert.match(v2Paywall, /\/api\/pay\/yookassa/, "New-site paywall must use the existing checkout route");
assert.match(v2Paywall, /kind: PLUS_KIND/, "New-site checkout must request the lifetime SKU");
assert.doesNotMatch(v2Paywall, /trackPurchase\(/, "The paywall must never count a purchase itself");

const tracking = read("src/lib/track.ts");
assert.doesNotMatch(tracking, /dataLayer\(\)\.push/, "Do not duplicate GA4 ecommerce with a second legacy Yandex payload");

const layout = read("src/app/(old)/layout.tsx");
assert.match(layout, /send_page_view\s*:\s*false/, "SPA page views must be owned by PageTracker");
assert.match(layout, /defer:true/, "Yandex initial hit must not duplicate PageTracker");
const googleLoader = layout.indexOf('<Script src="https://www.googletagmanager.com');
assert.ok(layout.indexOf('id="ym-metrika"') < googleLoader, "Google loading must not block Yandex initialization");
assert.ok(layout.indexOf('id="ga-gtag"') < googleLoader, "gtag must queue events before the remote library loads");

console.log("Monetization contract tests passed");
