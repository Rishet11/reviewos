import { prisma as db } from "./db.server";

type PrismaClientLike = typeof db;

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
};

const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export async function computeRatingAggregate(
  shop: string,
  productId: string,
  client: PrismaClientLike = db
): Promise<{ average: number; count: number }> {
  const reviews = await client.review.findMany({
    where: { shop, productId, status: "approved" },
    select: { rating: true },
  });

  const count = reviews.length;
  if (count === 0) return { average: 0, count: 0 };

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / count) * 10) / 10;

  return { average, count };
}

export async function syncRatingMetafields(
  shop: string,
  productId: string,
  admin: AdminClient,
  client: PrismaClientLike = db
): Promise<{ skipped: true } | { userErrors: unknown[] }> {
  const product = await client.product.findFirst({
    where: { id: productId, shop },
  });

  if (!product?.shopifyProductId) {
    return { skipped: true };
  }

  const { average, count } = await computeRatingAggregate(shop, productId, client);

  const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: product.shopifyProductId,
          namespace: "reviews",
          key: "rating",
          type: "rating",
          value: JSON.stringify({
            value: String(average),
            scale_min: "1",
            scale_max: "5",
          }),
        },
        {
          ownerId: product.shopifyProductId,
          namespace: "reviews",
          key: "rating_count",
          type: "number_integer",
          value: String(count),
        },
      ],
    },
  });

  const json = await response.json();
  const userErrors = json?.data?.metafieldsSet?.userErrors ?? [];

  return { userErrors };
}

export async function backfillAllRatingMetafields(
  shop: string,
  admin: AdminClient,
  client: PrismaClientLike = db
): Promise<{ synced: number; skipped: number; failed: number }> {
  const products = await client.product.findMany({
    where: { shop, shopifyProductId: { not: null } },
    select: { id: true },
  });

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const result = await syncRatingMetafields(shop, product.id, admin, client);
    if ("skipped" in result) {
      skipped += 1;
    } else if (result.userErrors.length > 0) {
      // A non-empty userErrors means the metafield write was rejected (bad GID,
      // missing scope). Count it as failed, not synced, so the toast is honest.
      failed += 1;
      console.error(
        `syncRatingMetafields failed for product ${product.id}:`,
        result.userErrors,
      );
    } else {
      synced += 1;
    }
  }

  return { synced, skipped, failed };
}
