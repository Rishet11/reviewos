import db from "../db.server";

type PrismaLike = typeof db;

// GDPR / compliance webhook handlers.
// Known gap: reviews with no customerEmail (name-only) can't be matched to a
// customer data request/redact request. Documented, not silently swallowed.

export async function redactShop(shop: string, client: PrismaLike = db) {
  return client.$transaction([
    client.reviewMedia.deleteMany({ where: { review: { shop } } }),
    client.review.deleteMany({ where: { shop } }),
    client.aiSummary.deleteMany({ where: { shop } }),
    client.marketplaceStat.deleteMany({ where: { shop } }),
    client.marketplaceSource.deleteMany({ where: { shop } }),
    client.attributeDefinition.deleteMany({ where: { shop } }),
    // reviewRequest must delete before product: ReviewRequest.productId has
    // an ON DELETE RESTRICT FK to Product, so deleting Product first would
    // violate the constraint and roll back this whole transaction.
    client.reviewRequest.deleteMany({ where: { shop } }),
    client.product.deleteMany({ where: { shop } }),
    client.orderLineItem.deleteMany({ where: { orderCapture: { shop } } }),
    client.orderCapture.deleteMany({ where: { shop } }),
    client.emailSuppression.deleteMany({ where: { shop } }),
    client.settings.deleteMany({ where: { shop } }),
    client.session.deleteMany({ where: { shop } }),
  ]);
}

export async function redactCustomer(
  shop: string,
  args: { email?: string | null },
  client: PrismaLike = db,
) {
  if (!args.email) {
    return { matched: 0 };
  }

  await client.reviewMedia.deleteMany({
    where: { review: { shop, customerEmail: args.email } },
  });

  const { count } = await client.review.updateMany({
    where: { shop, customerEmail: args.email },
    data: { customerName: "Anonymous", customerEmail: null },
  });

  // Null the PII but keep the OrderCapture row / line items - revocation
  // logic (cancelOrderCapture) keys off verifiedOrderId, not customerEmail,
  // so it keeps working post-redaction.
  await client.orderCapture.updateMany({
    where: { shop, customerEmail: args.email },
    data: { customerEmail: null, customerId: null },
  });

  // Suppress FIRST, then delete: a later order webhook for this same
  // (now-redacted) email must not silently recreate ReviewRequest rows and
  // re-email the customer. ReviewRequest rows themselves are deleted outright
  // (not anonymized) - they're an operational "we're about to email this
  // person" record, not a review, so there's no useful anonymized remnant.
  await client.emailSuppression.upsert({
    where: { shop_email: { shop, email: args.email } },
    update: { reason: "customer_redact" },
    create: { shop, email: args.email, reason: "customer_redact" },
  });
  await client.reviewRequest.deleteMany({
    where: { shop, customerEmail: args.email },
  });

  return { matched: count };
}

export async function collectCustomerData(
  shop: string,
  args: { email?: string | null },
  client: PrismaLike = db,
) {
  // Guard: without an email we cannot scope to a single customer. Returning a
  // bare { shop } query would leak every customer's reviews, so return nothing.
  if (!args.email) {
    return { reviews: [], orders: [], reviewRequests: [] };
  }

  const [reviews, orders, reviewRequests] = await Promise.all([
    client.review.findMany({
      where: { shop, customerEmail: args.email },
    }),
    client.orderCapture.findMany({
      where: { shop, customerEmail: args.email },
      include: { lineItems: true },
    }),
    client.reviewRequest.findMany({
      where: { shop, customerEmail: args.email },
    }),
  ]);

  return { reviews, orders, reviewRequests };
}
