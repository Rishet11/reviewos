// Phase 6 Slice C: creates one ReviewRequest per (order, product) line item
// once an order is fulfilled, so the dispatch job (review-requests-dispatch.
// server.ts) has something to send. Framework-free aside from the `prisma`
// import - called from webhooks.orders.fulfilled.tsx.

import { prisma } from "./db.server";
import { getSetting } from "./settings.server";

// Slice 5: pick the send channel at ReviewRequest-creation time. WhatsApp
// only wins when the merchant has opted in (channelPreference setting), a
// phone number was actually captured on the order, and the shop has an
// enabled WhatsApp connection - otherwise email, unchanged from before this
// slice. Plan gating (Pro-only) is enforced where the connection is enabled/
// preference is set (app.channels.tsx), not here.
export async function resolveChannel(
  shop: string,
  hasPhone: boolean,
  client: PrismaClientLike = prisma,
): Promise<"email" | "whatsapp"> {
  if (!hasPhone) return "email";
  const pref = await getSetting(shop, "channelPreference");
  if (pref !== "whatsapp") return "email";
  const connection = await client.whatsAppConnection.findUnique({ where: { shop } });
  return connection?.enabled ? "whatsapp" : "email";
}

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
  customerPhone?: string | null;
  deliveredAt: Date;
  lineItems: { shopifyProductId: string | null; title: string; quantity: number }[];
};

function parseDelayDays(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Shared upsert core, reused by review-request-backfill.server.ts so both the
// webhook path and the merchant-triggered blast write ReviewRequest rows the
// same way (idempotent on [shop, shopifyOrderId, productId]).
export type ReviewRequestRowInput = {
  productId: string;
  shopifyOrderId: string;
  orderCaptureId?: string | null;
  shopifyCustomerId?: string | null;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  cohort: string;
  channel?: string;
  deliveredAt: Date;
  scheduledSendAt: Date;
};

export async function upsertReviewRequestRow(
  shop: string,
  params: ReviewRequestRowInput,
  client: PrismaClientLike = prisma,
) {
  return client.reviewRequest.upsert({
    where: {
      shop_shopifyOrderId_productId: {
        shop,
        shopifyOrderId: params.shopifyOrderId,
        productId: params.productId,
      },
    },
    update: {},
    create: { shop, ...params, status: "pending" },
  });
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
  const channel = await resolveChannel(shop, !!input.customerPhone, client);

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

    await upsertReviewRequestRow(
      shop,
      {
        productId: product.id,
        shopifyOrderId: input.shopifyOrderId,
        orderCaptureId: input.orderCaptureId ?? null,
        shopifyCustomerId: input.shopifyCustomerId ?? null,
        customerEmail: input.customerEmail,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        cohort,
        channel,
        deliveredAt: input.deliveredAt,
        scheduledSendAt,
      },
      client,
    );
    if (!existingProductIds.has(product.id)) created += 1;
  }

  return { created };
}
