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
    client.product.deleteMany({ where: { shop } }),
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
    return [];
  }

  return client.review.findMany({
    where: { shop, customerEmail: args.email },
  });
}
