import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { markOrderFulfilled } from "../services/order-capture.server";
import { createReviewRequestsForOrder } from "../services/review-requests.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const shopifyOrderId = (payload as any)?.admin_graphql_api_id as string | undefined;
  if (!shopifyOrderId) {
    return new Response();
  }

  // orders/fulfilled delivers the Order resource with its `fulfillments`
  // array - use the most recent fulfillment's timestamp if present, else now.
  const fulfillments = (payload as any)?.fulfillments as
    | Array<{ created_at?: string }>
    | undefined;
  const fulfilledAt =
    fulfillments && fulfillments.length > 0
      ? new Date(fulfillments[fulfillments.length - 1].created_at ?? Date.now())
      : new Date();

  const order = await markOrderFulfilled(shop, shopifyOrderId, fulfilledAt);

  // Slice C: create one ReviewRequest per line item so the dispatch job can
  // send a "how was your order?" email later. Wrapped in try/catch so a
  // Slice C bug never breaks this webhook. OrderCapture has no customerName
  // field (Slice B never stored one), so customerName is passed as null -
  // the email template falls back to a generic greeting.
  if (order?.customerEmail) {
    try {
      await createReviewRequestsForOrder(shop, {
        orderCaptureId: order.id,
        shopifyOrderId: order.shopifyOrderId,
        shopifyCustomerId: order.customerId,
        customerEmail: order.customerEmail,
        customerName: null,
        deliveredAt: fulfilledAt,
        lineItems: order.lineItems,
      });
    } catch (err) {
      console.error("createReviewRequestsForOrder failed", err);
    }
  }

  return new Response();
};
