// Tiny wrapper around the billing.check pattern used in app/routes/app.billing.tsx,
// so feature slices can gate on plan without re-deriving this each time.
// Wired into app/routes/app.reviews.tsx (blast preview/run + loader).

import { BILLING_PLANS, BILLING_TEST } from "../shopify.server";

// `options` is deliberately untyped: the concrete CheckBillingOptions generic
// from @shopify/shopify-app-react-router varies with the app's billing config,
// and pinning it here forced `as unknown as` casts at every call site. We only
// rely on `hasActivePayment` in the result.
type BillingLike = {
  check: (options?: any) => Promise<{ hasActivePayment: boolean }>;
};

export async function getPlan(billing: BillingLike): Promise<"free" | "pro"> {
  try {
    const { hasActivePayment } = await billing.check({
      plans: [...BILLING_PLANS],
      isTest: BILLING_TEST,
    });
    return hasActivePayment ? "pro" : "free";
  } catch (err) {
    // Fail-safe: if billing.check throws (Shopify API hiccup, etc.), degrade
    // to the free plan rather than 500ing the page. Fewer features beats a
    // crash.
    console.error("getPlan: billing.check failed, defaulting to free", err);
    return "free";
  }
}
