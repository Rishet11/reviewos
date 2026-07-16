// Phase 6 Slice B: webhook-captured order data, used to back the
// "Verified Buyer" badge. Populated push-style from orders/paid,
// orders/fulfilled, orders/cancelled webhooks - never queried live via
// Admin GraphQL (no read_all_orders scope needed, this is push-only).

import { prisma } from "./db.server";

type PrismaClientLike = typeof prisma;

// Loosely-typed subset of Shopify's REST-shaped order webhook payload -
// only the fields this service actually reads.
export type OrderWebhookPayload = {
  admin_graphql_api_id: string;
  name?: string | null;
  email?: string | null;
  customer?: { email?: string | null; admin_graphql_api_id?: string | null } | null;
  financial_status?: string | null;
  line_items?: Array<{
    product_id?: string | number | null;
    variant_id?: string | number | null;
    title?: string | null;
    quantity?: number | null;
  }> | null;
};

export async function captureOrder(
  shop: string,
  payload: OrderWebhookPayload,
  client: PrismaClientLike = prisma,
) {
  const shopifyOrderId = payload.admin_graphql_api_id;

  const order = await client.orderCapture.upsert({
    where: { shop_shopifyOrderId: { shop, shopifyOrderId } },
    update: {
      orderName: payload.name ?? null,
      customerEmail: payload.email ?? payload.customer?.email ?? null,
      customerId: payload.customer?.admin_graphql_api_id ?? null,
      financialStatus: payload.financial_status ?? "unknown",
      paidAt: new Date(),
    },
    create: {
      shop,
      shopifyOrderId,
      orderName: payload.name ?? null,
      customerEmail: payload.email ?? payload.customer?.email ?? null,
      customerId: payload.customer?.admin_graphql_api_id ?? null,
      financialStatus: payload.financial_status ?? "unknown",
      paidAt: new Date(),
    },
  });

  // Idempotently replace line items (webhooks can redeliver / retry) rather
  // than trying to diff. No Product-sync dependency here on purpose: a line
  // item referencing a product not yet synced locally is still captured
  // as-is - it only affects the *fallback* (non-token) matching path later.
  await client.orderLineItem.deleteMany({ where: { orderCaptureId: order.id } });

  const lineItems = payload.line_items ?? [];
  if (lineItems.length > 0) {
    await client.orderLineItem.createMany({
      data: lineItems.map((li) => ({
        orderCaptureId: order.id,
        // NOT li.admin_graphql_api_id: on real Shopify order webhooks that
        // field is the LINE ITEM's own GID (gid://shopify/LineItem/...), not
        // the product's - using it here would silently store the wrong GID
        // in almost every real payload (a diff-review pass caught this),
        // since admin_graphql_api_id is virtually always present and would
        // shadow the correct product_id-derived branch. product_id is the
        // only field that reliably identifies the product, so it's the sole
        // source for this join key.
        shopifyProductId: li.product_id ? `gid://shopify/Product/${li.product_id}` : null,
        shopifyVariantId: li.variant_id != null ? String(li.variant_id) : null,
        title: li.title ?? "",
        quantity: li.quantity ?? 1,
      })),
    });
  }

  return order;
}

export async function markOrderFulfilled(
  shop: string,
  shopifyOrderId: string,
  fulfilledAt: Date,
  client: PrismaClientLike = prisma,
) {
  await client.orderCapture.updateMany({
    where: { shop, shopifyOrderId },
    data: { fulfilledAt },
  });

  // Return the updated row with lineItems included - needed by the caller
  // (webhooks.orders.fulfilled.tsx) for the Slice C review-request handoff.
  return client.orderCapture.findFirst({
    where: { shop, shopifyOrderId },
    include: { lineItems: true },
  });
}

// Revocation: a cancelled order un-verifies any review that was verified
// through it. Only full cancellation revokes - partial refunds are
// deliberately NOT handled here (scope boundary, not a bug: distinguishing a
// partial refund from a full one would need refund-percentage logic this
// slice doesn't build).
export async function cancelOrderCapture(
  shop: string,
  shopifyOrderId: string,
  client: PrismaClientLike = prisma,
) {
  const order = await client.orderCapture.findFirst({ where: { shop, shopifyOrderId } });
  if (!order) return null;

  await client.orderCapture.update({
    where: { id: order.id },
    data: { cancelledAt: new Date() },
  });

  await client.review.updateMany({
    where: { shop, verifiedOrderId: order.id },
    data: { verifiedBuyer: false },
  });

  return order;
}
