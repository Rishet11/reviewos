// Phase 6 Slice B: the ONE signed-token scheme for verified-buyer / order
// linkage. A later slice (Slice C, review-request emails) calls
// `signVerificationToken` from THIS file to build its email deep link - do
// not build a second token scheme elsewhere for review verification.
//
// Known gap: the token is not single-use. Nothing stops replay to verify
// multiple review submissions against the same order/product. Documented,
// not silently swallowed (matches the "Known gap" style in gdpr.server.ts).

import crypto from "node:crypto";
import { prisma as db } from "./db.server";

type PrismaClientLike = typeof db;

type TokenPayload = { s: string; oid: string; pid: string; e: string; exp: number };

function secret() {
  return process.env.REVIEW_VERIFICATION_SECRET || process.env.SHOPIFY_API_SECRET || "";
}

export function signVerificationToken(input: {
  shop: string;
  shopifyOrderId: string;
  shopifyProductId: string;
  customerEmail: string;
  ttlDays?: number;
}): string {
  const payload: TokenPayload = {
    s: input.shop,
    oid: input.shopifyOrderId,
    pid: input.shopifyProductId,
    e: input.customerEmail.toLowerCase(),
    exp: Date.now() + (input.ttlDays ?? 90) * 86_400_000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret())
    .update(`reviewos-verify:${body}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyVerificationToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`reviewos-verify:${body}`)
    .digest("base64url");
  const eb = Buffer.from(expected);
  const ab = Buffer.from(sig);
  if (eb.length !== ab.length || !crypto.timingSafeEqual(eb, ab)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    return payload.exp >= Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function matchOrderForReview(
  shop: string,
  args: {
    shopifyProductId?: string | null;
    customerEmail?: string | null;
    verificationToken?: string | null;
  },
  client: PrismaClientLike = db,
): Promise<{ verified: boolean; orderCaptureId?: string }> {
  // Token path: carries shopifyProductId independently, so it works even for
  // a product not yet synced locally (no dependency on Product.shopifyProductId).
  if (args.verificationToken) {
    const payload = verifyVerificationToken(args.verificationToken);
    if (payload && payload.s === shop) {
      const order = await client.orderCapture.findFirst({
        where: { shop, shopifyOrderId: payload.oid, cancelledAt: null },
        include: { lineItems: true },
      });
      if (order?.lineItems.some((li) => li.shopifyProductId === payload.pid)) {
        return { verified: true, orderCaptureId: order.id };
      }
    }
  }

  // Fallback path: email + local product GID. Any one non-cancelled matching
  // order is sufficient (findFirst) - the badge is binary, no "latest wins"
  // logic needed for a customer with multiple qualifying orders.
  if (!args.customerEmail || !args.shopifyProductId) return { verified: false };

  const match = await client.orderLineItem.findFirst({
    where: {
      shopifyProductId: args.shopifyProductId,
      orderCapture: { shop, cancelledAt: null, customerEmail: args.customerEmail.toLowerCase() },
    },
    select: { orderCaptureId: true },
  });

  return match ? { verified: true, orderCaptureId: match.orderCaptureId } : { verified: false };
}
