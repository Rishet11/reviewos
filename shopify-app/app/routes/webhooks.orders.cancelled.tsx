import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { cancelOrderCapture } from "../services/order-capture.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const shopifyOrderId = (payload as any)?.admin_graphql_api_id as string | undefined;
  if (shopifyOrderId) {
    await cancelOrderCapture(shop, shopifyOrderId);
  }

  return new Response();
};
