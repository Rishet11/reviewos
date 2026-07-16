// Phase 6 Slice C: creates one ReviewRequest per (order, product) line item
// once an order is fulfilled, so the dispatch job (review-requests-dispatch.
// server.ts) has something to send. Framework-free aside from the `prisma`
// import - called from webhooks.orders.fulfilled.tsx.

import { prisma } from "./db.server";
import { getSetting } from "./settings.server";

type PrismaClientLike = typeof prisma;

const DEFAULT_DELAY_DAYS_FIRST_TIME = 5;
const DEFAULT_DELAY_DAYS_REPEAT = 3;

export type OrderCaptureInput = {
  shop: string;
  orderCaptureId?: string;
  shopifyOrderId: string;
  shopifyCustomerId?: string | null;
  customerEmail: string;
  customerName?: string | null;
  deliveredAt: Date;
  lineItems: { shopifyProductId: string | null; title: string; quantity: number }[];
};

function parseDelayDays(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function createReviewRequestsForOrder(
  shop: string,
  input: Omit<OrderCaptureInput, "shop">,
  client: PrismaClientLike = prisma,
) {
  if (!input.customerEmail) return { created: 0 };

  const suppressed = await client.emailSuppression.findUnique({
    where: { shop_email: { shop, email: input.customerEmail } },
  });
  if (suppressed) return { created: 0 };

  const productIds = input.lineItems
    .map((li) => li.shopifyProductId)
    .filter((id): id is string => !!id);
  if (productIds.length === 0) return { created: 0 };

  const localProducts = await client.product.findMany({
    where: { shop, shopifyProductId: { in: productIds } },
  });
  if (localProducts.length === 0) return { created: 0 };
  const productByShopifyId = new Map(localProducts.map((p) => [p.shopifyProductId as string, p]));

  // Cohort: "repeat" if this customer already has ANY review request on
  // record for this shop (any status), else "first_time".
  const priorRequest = await client.reviewRequest.findFirst({
    where: { shop, customerEmail: input.customerEmail },
  });
  const cohort = priorRequest ? "repeat" : "first_time";

  const [delayFirstTimeRaw, delayRepeatRaw] = await Promise.all([
    getSetting(shop, "reviewRequestDelayDaysFirstTime"),
    getSetting(shop, "reviewRequestDelayDaysRepeat"),
  ]);
  const delayDays =
    cohort === "repeat"
      ? parseDelayDays(delayRepeatRaw, DEFAULT_DELAY_DAYS_REPEAT)
      : parseDelayDays(delayFirstTimeRaw, DEFAULT_DELAY_DAYS_FIRST_TIME);

  const scheduledSendAt = new Date(input.deliveredAt.getTime() + delayDays * 86_400_000);

  // Pre-fetch which of this order's products already have a ReviewRequest
  // (webhook redelivery hits the upsert's no-op update branch) so `created`
  // reports actual new rows, not upsert calls.
  const existingForOrder = await client.reviewRequest.findMany({
    where: { shop, shopifyOrderId: input.shopifyOrderId },
    select: { productId: true },
  });
  const existingProductIds = new Set(existingForOrder.map((r) => r.productId));

  let created = 0;
  for (const lineItem of input.lineItems) {
    if (!lineItem.shopifyProductId) continue;
    const product = productByShopifyId.get(lineItem.shopifyProductId);
    if (!product) continue; // product hasn't synced locally yet - skip, no dangling productId

    await client.reviewRequest.upsert({
      where: {
        shop_shopifyOrderId_productId: {
          shop,
          shopifyOrderId: input.shopifyOrderId,
          productId: product.id,
        },
      },
      update: {},
      create: {
        shop,
        productId: product.id,
        shopifyOrderId: input.shopifyOrderId,
        orderCaptureId: input.orderCaptureId ?? null,
        shopifyCustomerId: input.shopifyCustomerId ?? null,
        customerEmail: input.customerEmail,
        customerName: input.customerName ?? null,
        cohort,
        deliveredAt: input.deliveredAt,
        scheduledSendAt,
        status: "pending",
      },
    });
    if (!existingProductIds.has(product.id)) created += 1;
  }

  return { created };
}
