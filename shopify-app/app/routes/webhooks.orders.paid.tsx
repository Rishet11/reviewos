import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { captureOrder, type OrderWebhookPayload } from "../services/order-capture.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await captureOrder(shop, payload as unknown as OrderWebhookPayload);

  return new Response();
};
