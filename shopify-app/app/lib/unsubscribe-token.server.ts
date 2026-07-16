// Phase 6 Slice C: a small dedicated HMAC signer for unsubscribe links.
// Deliberately NOT the same token shape as order-verification.server.ts's
// signVerificationToken (that one carries order/product verification
// payload for the review deep link) - this is just a one-line HMAC over
// `shop:email` so a clicked unsubscribe link can't be forged/guessed.
// Reuses the same secret-resolution fallback for consistency.

import crypto from "node:crypto";

function secret() {
  return process.env.REVIEW_VERIFICATION_SECRET || process.env.SHOPIFY_API_SECRET || "";
}

export function signUnsubscribe(shop: string, email: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`reviewos-unsubscribe:${shop}:${email.toLowerCase()}`)
    .digest("base64url");
}

export function verifyUnsubscribe(shop: string, email: string, sig: string): boolean {
  const expected = signUnsubscribe(shop, email);
  const eb = Buffer.from(expected);
  const ab = Buffer.from(sig);
  return eb.length === ab.length && crypto.timingSafeEqual(eb, ab);
}
